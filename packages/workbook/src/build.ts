import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { characterColumns, characterIconOf, monsterColumns } from './characterColumns.js';
import { CharacterCategory } from './enums.js';
import { loadGame } from './game.js';
import { itemColumns } from './itemColumns.js';
import { recipeColumns } from './recipeColumns.js';
import { addSheet, formatColumnWarning, type ColumnWarning, type SheetSpec } from './sheet.js';
import { zoneColumns } from './zoneColumns.js';

const ICON_SIZE = 64;
const STORY_CATEGORY: string = CharacterCategory.Story;

/** Where to read the game files and where to write the workbook. */
export interface BuildOptions {
  /** The extracted folder; it holds saves/ and data/. */
  extractedDir: string;
  /** The xlsx file to write. The icons go to the icons/ folder next to it. */
  outFile: string;
}

function byName<R>(get: (row: R) => string): (a: R, b: R) => number {
  return (a, b) => get(a).localeCompare(get(b));
}

/**
 * Builds the workbook of the game data and its icon files.
 * @param options - the game files and the output file
 * @returns a promise that resolves when the files are written
 * @sideEffects reads the extracted game files; writes the xlsx file and the icons folder; prints the column warnings and a summary
 */
export async function buildWorkbook(options: BuildOptions): Promise<void> {
  const { extractedDir, outFile } = options;
  const iconDir = path.join(path.dirname(outFile), 'icons');
  const game = loadGame(extractedDir, ICON_SIZE);
  const { messages, items, recipes, zones, characters, icons } = game;
  const characterIcon = characterIconOf(game);
  // Story NPCs with no face ("Old Man", "Young Woman") are generic roles, not named characters.
  const isGenericNpc = (c: (typeof characters.characters)[number]): boolean =>
    c.CHARACTER_CATEGORY_ID === STORY_CATEGORY && !characterIcon(c);
  const nameOf = (c: (typeof characters.characters)[number]): string => characters.characterName.get(c.CHARACTER_ID) ?? '';

  const wb = new ExcelJS.Workbook();
  const warnings: ColumnWarning[] = [];
  const counts: string[] = [];
  const add = <R>(spec: Omit<SheetSpec<R>, 'iconSize'>): void => {
    warnings.push(...addSheet(wb, { ...spec, iconSize: ICON_SIZE }));
    counts.push(`${spec.name}: ${spec.rows.length}`);
  };
  add({
    name: 'Items',
    columns: itemColumns(game),
    rows: items.items.toSorted(byName((i) => messages.t(i.ITEM_NAME_LABEL_ID))),
  });
  add({
    name: 'Recipes',
    columns: recipeColumns(game),
    rows: recipes.recipes.toSorted(byName((r) => items.itemName(r.ITEM_COMPLETION_ID))),
  });
  add({ name: 'Zones', columns: zoneColumns(game), rows: zones.spots });
  add({ name: 'Monsters', columns: monsterColumns(game), rows: characters.characters.filter(characters.isMonster) });
  add({
    name: 'Characters',
    columns: characterColumns(game),
    rows: characters.characters.filter((c) => !characters.isMonster(c) && !isGenericNpc(c)).toSorted(byName(nameOf)),
  });
  for (const w of warnings) console.warn(formatColumnWarning(w));

  fs.mkdirSync(iconDir, { recursive: true });
  for (const [name, png] of icons.images) fs.writeFileSync(path.join(iconDir, name), png);
  await wb.xlsx.writeFile(outFile);
  console.log(`${counts.join(', ')}, icons: ${icons.images.size}`);
  console.log(`wrote ${outFile} and ${iconDir}`);
}
