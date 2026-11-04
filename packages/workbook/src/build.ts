import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { CharacterType, ICON_DIR, ICON_SIZE_WORKBOOK, readData } from '@nelke/model';
import { characterColumns, monsterColumns } from './characterColumns.js';
import { itemColumns } from './itemColumns.js';
import { createLookup } from './lookup.js';
import { recipeColumns } from './recipeColumns.js';
import { addSheet, formatColumnWarning, type ColumnWarning, type SheetSpec } from './sheet.js';
import { SheetName } from './sheetKeys.js';
import { zoneColumns } from './zoneColumns.js';

const OUT_ICON_DIR = 'icons';

/** Where to read the data and where to write the workbook. */
export interface BuildOptions {
  /** The data folder; it holds the JSON files and icons/. */
  dataDir: string;
  /** The xlsx file to write. The icons go to the icons/ folder next to it. */
  outFile: string;
}

function byName<R>(get: (row: R) => string): (a: R, b: R) => number {
  return (a, b) => get(a).localeCompare(get(b));
}

/**
 * Builds the workbook of the game data and copies its icon files.
 * @param options - the data folder and the output file
 * @returns a promise that resolves when the files are written
 * @throws {Error} when the data does not match the schemas of the model
 * @sideEffects reads the data folder; writes the xlsx file and the icons folder; prints the column warnings and a summary
 */
export async function buildWorkbook(options: BuildOptions): Promise<void> {
  const { dataDir, outFile } = options;
  const outIconDir = path.join(path.dirname(outFile), OUT_ICON_DIR);
  const data = readData(dataDir);
  const lookup = createLookup(data);

  const wb = new ExcelJS.Workbook();
  const warnings: ColumnWarning[] = [];
  const counts: string[] = [];
  const add = <R>(spec: Omit<SheetSpec<R>, 'iconSize'>): void => {
    warnings.push(...addSheet(wb, { ...spec, iconSize: ICON_SIZE_WORKBOOK }));
    counts.push(`${spec.name}: ${spec.rows.length}`);
  };
  add({ name: SheetName.Items, columns: itemColumns(lookup), rows: data.items.toSorted(byName((i) => i.name)) });
  add({
    name: SheetName.Recipes,
    columns: recipeColumns(lookup),
    rows: data.recipes.toSorted(byName((r) => lookup.items.get(r.resultItemId)?.name ?? '')),
  });
  add({ name: SheetName.Zones, columns: zoneColumns(lookup), rows: data.areas });
  add({ name: SheetName.Monsters, columns: monsterColumns(lookup), rows: data.monsters });
  add({
    name: SheetName.Characters,
    columns: characterColumns(lookup),
    // Story NPCs with no face ("Old Man", "Young Woman") are generic roles, not named characters.
    rows: data.characters.filter((c) => !(c.type === CharacterType.Story && c.icon === null)).toSorted(byName((c) => c.name)),
  });
  for (const w of warnings) console.warn(formatColumnWarning(w));

  fs.mkdirSync(outIconDir, { recursive: true });
  fs.cpSync(path.join(dataDir, ICON_DIR, String(ICON_SIZE_WORKBOOK)), outIconDir, { recursive: true });
  await wb.xlsx.writeFile(outFile);
  console.log(`${counts.join(', ')}, icons: ${fs.readdirSync(outIconDir).length}`);
  console.log(`wrote ${outFile} and ${outIconDir}`);
}
