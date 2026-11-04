import type ExcelJS from 'exceljs';
import { KeyHeader } from './sheetKeys.js';

/** The header of a column that holds the PNG file name of an icon. */
export const ICON: string = KeyHeader.Icon;

/** The value of a cell. */
export type CellValue = string | number | undefined;

/** A column of a sheet. */
export interface Column<R> {
  header: string;
  /** The width in characters. */
  width: number;
  get: (row: R) => CellValue;
}

/** The kinds of redundant columns. */
export enum ColumnWarningKind {
  /** The column has 1 value in all rows. */
  SingleValue = 'single-value',
  /** The column has the same values as an earlier column. */
  Duplicate = 'duplicate',
}

interface ColumnWarningBase {
  sheet: string;
  column: string;
}

/** A column that has 1 value in all rows. */
export interface SingleValueWarning extends ColumnWarningBase {
  kind: ColumnWarningKind.SingleValue;
  /** The value, as JSON. */
  value: string;
}

/** A column that has the same values as an earlier column. */
export interface DuplicateWarning extends ColumnWarningBase {
  kind: ColumnWarningKind.Duplicate;
  /** The header of the earlier column. */
  twin: string;
}

/** A column that adds nothing to its sheet. */
export type ColumnWarning = SingleValueWarning | DuplicateWarning;

/**
 * Creates the column of the icon of a row. The getter returns the PNG file name of the icon in output/icons/.
 * @param get - returns the icon file name of a row, '' for no icon
 * @returns the column
 * @sideEffects none
 */
export function iconColumn<R>(get: (row: R) => string): Column<R> {
  return { header: ICON, width: 9, get };
}

/**
 * Finds the columns that hold 1 value only, and the columns that duplicate an earlier column. Icon columns are skipped.
 * @param sheet - the sheet name, for the warnings
 * @param columns - the columns of the sheet
 * @param rows - the rows of the sheet
 * @returns the warnings, in column order
 * @sideEffects none
 */
export function findRedundantColumns<R>(sheet: string, columns: readonly Column<R>[], rows: readonly R[]): ColumnWarning[] {
  const values = columns.map((col) => rows.map((r) => JSON.stringify(col.get(r) ?? '')));
  const warnings: ColumnWarning[] = [];
  columns.forEach((col, i) => {
    if (col.header === ICON) return;
    const mine = values[i] ?? [];
    if (rows.length > 1 && new Set(mine).size === 1) {
      warnings.push({ sheet, column: col.header, kind: ColumnWarningKind.SingleValue, value: mine[0] ?? '' });
    }
    const twin = values.findIndex((v, j) => j < i && columns[j]?.header !== ICON && v.join('\n') === mine.join('\n'));
    const twinColumn = columns[twin];
    if (twinColumn) warnings.push({ sheet, column: col.header, kind: ColumnWarningKind.Duplicate, twin: twinColumn.header });
  });
  return warnings;
}

/**
 * Formats a column warning as a line of text.
 * @param w - the warning
 * @returns the line
 * @sideEffects none
 */
export function formatColumnWarning(w: ColumnWarning): string {
  switch (w.kind) {
    case ColumnWarningKind.SingleValue:
      return `${w.sheet}: column "${w.column}" has 1 value only (${w.value})`;
    case ColumnWarningKind.Duplicate:
      return `${w.sheet}: column "${w.column}" is the same as "${w.twin}"`;
  }
}

/** What to put in a sheet. */
export interface SheetSpec<R> {
  name: string;
  columns: readonly Column<R>[];
  rows: readonly R[];
  /** The icon height in pixels, which sets the row height of the sheet when it has an icon column. */
  iconSize: number;
}

/**
 * Adds a sheet with a frozen header and name column, and a filter on all columns.
 * @param wb - the workbook
 * @param spec - the sheet name, columns and rows
 * @returns the redundant columns of the sheet
 * @sideEffects adds a worksheet to the workbook
 */
export function addSheet<R>(wb: ExcelJS.Workbook, spec: SheetSpec<R>): ColumnWarning[] {
  const { name, columns, rows, iconSize } = spec;
  const hasIcon = columns[0]?.header === ICON;
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: hasIcon ? 2 : 1, ySplit: 1 }] });
  ws.columns = columns.map(({ header, width }) => ({ header, width }));
  for (const row of rows) {
    const added = ws.addRow(columns.map((col) => col.get(row) ?? null));
    if (hasIcon) added.height = iconSize * 0.6;
  }
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  return findRedundantColumns(name, columns, rows);
}
