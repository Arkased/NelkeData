import { IconKind } from '@nelke/extract';
import type { Game } from './game.js';
import type { Item } from './items.js';
import type { Recipe, Unlock } from './recipes.js';
import { iconColumn, type Column } from './sheet.js';
import { required, round } from './util.js';

const NO_MATERIAL = 'ITEM_INVALID';

/**
 * Builds the columns of the Recipes sheet.
 * @param game - the game data
 * @returns the columns
 * @sideEffects none
 */
export function recipeColumns(game: Game): Column<Recipe>[] {
  const { icons, items, recipes } = game;
  const { unlock } = recipes;
  const resultOf = (r: Recipe): Item => required(items.itemById, r.ITEM_COMPLETION_ID);
  const unlockOf = (r: Recipe): Unlock | undefined => unlock.get(r.RECIPE_ID);
  const materialColumns = ([1, 2, 3, 4] as const).flatMap((n): Column<Recipe>[] => {
    const slot = (r: Recipe): Recipe['slots'][number] | undefined => r.slots[n - 1];
    return [
      {
        header: `Material ${n}`,
        width: 22,
        get: (r) => {
          const id = slot(r)?.id;
          return id === undefined || id === NO_MATERIAL ? '' : items.itemName(id);
        },
      },
      {
        header: `Qty ${n}`,
        width: 6,
        get: (r) => {
          const s = slot(r);
          return s === undefined || s.id === NO_MATERIAL ? '' : s.num;
        },
      },
    ];
  });
  return [
    iconColumn((r) => icons.ref(IconKind.Item, Number(resultOf(r).ITEM_IMAGE_NUM))),
    { header: 'Item', width: 28, get: (r) => items.itemName(r.ITEM_COMPLETION_ID) },
    { header: 'Category', width: 14, get: (r) => items.categoryOf(resultOf(r)) },
    { header: 'Sub-category', width: 18, get: (r) => items.subCategoryOf(resultOf(r)) },
    { header: 'Rank', width: 7, get: (r) => Number(resultOf(r).ITEM_RANK) },
    { header: 'Price', width: 9, get: (r) => recipes.priceOf(r.ITEM_COMPLETION_ID) },
    { header: 'Synthesis Cost', width: 10, get: (r) => Number(r.ITEM_COMP_MH) },
    { header: 'Input Cost', width: 10, get: recipes.inputCost },
    { header: 'Added Value', width: 10, get: recipes.addedValue },
    {
      header: 'Added Value / Synth Cost',
      width: 12,
      get: (r) => {
        const value = recipes.addedValue(r);
        return value !== '' && Number(r.ITEM_COMP_MH) > 0 ? round(value / Number(r.ITEM_COMP_MH)) : '';
      },
    },
    {
      header: 'Unpriced Inputs',
      width: 24,
      get: (r) =>
        recipes
          .unpricedInputs(r)
          .map((m) => items.itemName(m.id))
          .join(', '),
    },
    ...materialColumns,
    { header: 'Recipe Set', width: 24, get: (r) => unlockOf(r)?.set ?? '' },
    { header: 'Taught By', width: 12, get: (r) => unlockOf(r)?.teacher ?? '' },
    { header: 'Friendship Lv', width: 9, get: (r) => unlockOf(r)?.friendship ?? '' },
    { header: 'Research', width: 26, get: (r) => unlockOf(r)?.research ?? '' },
    { header: 'Researcher', width: 12, get: (r) => unlockOf(r)?.researcher ?? '' },
    { header: 'Research Prereqs', width: 30, get: (r) => unlockOf(r)?.prereqs ?? '' },
    { header: 'Unlock Event', width: 36, get: (r) => unlockOf(r)?.event ?? '' },
  ];
}
