import { SHEET_KEYS } from '@nelke/workbook';

/** The cells of 1 sheet as text: the header row, and the data rows in sheet order. */
export interface SheetRows {
  header: string[];
  rows: string[][];
}

/** A cell that differs between the 2 rows of a pair. */
export interface CellChange {
  key: string;
  column: string;
  old: string;
  new: string;
}

/** The differences of 1 sheet. */
export interface SheetDiff {
  removedKeys: string[];
  addedKeys: string[];
  orderChanged: boolean;
  missingKeyColumns: string[];
  columnsRemoved: string[];
  columnsAdded: string[];
  changes: CellChange[];
}

function keyOf(header: string[], row: string[], keyColumns: readonly string[]): string {
  return JSON.stringify(keyColumns.map((column) => row[header.indexOf(column)] ?? ''));
}

function indexByKey(sheet: string, data: SheetRows, keyColumns: readonly string[]): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const row of data.rows) {
    const key = keyOf(data.header, row, keyColumns);
    if (byKey.has(key)) throw new Error(`${sheet}: the key value ${key} occurs 2 times`);
    byKey.set(key, row);
  }
  return byKey;
}

/**
 * Pairs the rows of a sheet of the baseline and of the new workbook by the key of the sheet, and compares the cells of each pair.
 * @param sheet - The name of the sheet, which selects the key columns.
 * @param base - The cells of the baseline sheet.
 * @param next - The cells of the new sheet.
 * @returns The removed rows, the added rows, the order change, the key columns that are not in both sheets, the column changes and the changed cells. When a key column is missing, the rows are not paired.
 * @throws {Error} When the sheet has no key, or a key value occurs 2 times in 1 sheet.
 * @sideEffects none
 */
export function compareRows(sheet: string, base: SheetRows, next: SheetRows): SheetDiff {
  const keyColumns = Object.entries(SHEET_KEYS).find(([name]) => name === sheet)?.[1];
  if (!keyColumns) throw new Error(`${sheet}: the sheet has no key`);
  const columnsRemoved = base.header.filter((column) => !next.header.includes(column));
  const columnsAdded = next.header.filter((column) => !base.header.includes(column));
  const missingKeyColumns = keyColumns.filter((column) => !base.header.includes(column) || !next.header.includes(column));
  if (missingKeyColumns.length > 0) {
    return { removedKeys: [], addedKeys: [], orderChanged: false, missingKeyColumns, columnsRemoved, columnsAdded, changes: [] };
  }
  const baseByKey = indexByKey(sheet, base, keyColumns);
  const nextByKey = indexByKey(sheet, next, keyColumns);
  const common = [...baseByKey.keys()].filter((key) => nextByKey.has(key));
  const sharedColumns = base.header.filter((column) => next.header.includes(column));
  const changes: CellChange[] = [];
  for (const key of common) {
    const a = baseByKey.get(key) ?? [];
    const b = nextByKey.get(key) ?? [];
    for (const column of sharedColumns) {
      const x = a[base.header.indexOf(column)] ?? '';
      const y = b[next.header.indexOf(column)] ?? '';
      if (x !== y) changes.push({ key, column, old: x, new: y });
    }
  }
  const nextCommon = [...nextByKey.keys()].filter((key) => baseByKey.has(key));
  return {
    removedKeys: [...baseByKey.keys()].filter((key) => !nextByKey.has(key)),
    addedKeys: [...nextByKey.keys()].filter((key) => !baseByKey.has(key)),
    orderChanged: common.join('\n') !== nextCommon.join('\n'),
    missingKeyColumns,
    columnsRemoved,
    columnsAdded,
    changes,
  };
}

/**
 * Turns the differences of a sheet into 1 line each.
 * @param sheet - The name of the sheet.
 * @param diff - The differences of the sheet.
 * @returns The lines, empty when there is no difference.
 * @sideEffects none
 */
export function formatSheetDiff(sheet: string, diff: SheetDiff): string[] {
  return [
    ...diff.missingKeyColumns.map((c) => `${sheet}: key column missing in 1 sheet, rows not compared: ${c}`),
    ...diff.columnsRemoved.map((c) => `${sheet}: column removed: ${c}`),
    ...diff.columnsAdded.map((c) => `${sheet}: column added: ${c}`),
    ...diff.removedKeys.map((k) => `${sheet}: row removed: ${k}`),
    ...diff.addedKeys.map((k) => `${sheet}: row added: ${k}`),
    ...(diff.orderChanged ? [`${sheet}: row order changed`] : []),
    ...diff.changes.map((c) => `${sheet} [${c.key}] ${c.column}: ${c.old} vs ${c.new}`),
  ];
}
