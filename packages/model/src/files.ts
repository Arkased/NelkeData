import type { ModelData } from './schema/index.js';

/** The file of each kind of entity in the data folder. */
export const DATA_FILES: Record<keyof ModelData, string> = {
  items: 'items.json',
  recipes: 'recipes.json',
  recipeSets: 'recipe-sets.json',
  research: 'research.json',
  zones: 'zones.json',
  areas: 'areas.json',
  monsters: 'monsters.json',
  characters: 'characters.json',
};

/** The folder of the icons in the data folder. */
export const ICON_DIR = 'icons';

/** The width in pixels of the icons that the workbook uses. */
export const ICON_SIZE_WORKBOOK = 64;

/** The widths in pixels of the icons that the model writes: 128 for the site, the workbook size for the workbook. Each size has its own folder, named by the width. */
export const ICON_SIZES = [128, ICON_SIZE_WORKBOOK] as const;
