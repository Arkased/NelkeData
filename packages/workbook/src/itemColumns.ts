import { IconKind } from '@nelke/extract';
import { Element } from './enums.js';
import type { Game } from './game.js';
import { ELEMENTS } from './characters.js';
import { SHOPS, type Item } from './items.js';
import { iconColumn, type Column } from './sheet.js';

const NO_FARM = '-1';

/**
 * Builds the columns of the Items sheet.
 * @param game - the game data
 * @returns the columns
 * @sideEffects none
 */
export function itemColumns(game: Game): Column<Item>[] {
  const { messages, icons, items, zones, characters } = game;
  const { t, jp } = messages;
  const reduceColumn = (e: Element): Column<Item> => ({ header: `Reduce: ${e}`, width: 8, get: (i) => Number(i.reduce[e]) });
  return [
    iconColumn((i) => icons.ref(IconKind.Item, Number(i.ITEM_IMAGE_NUM))),
    { header: 'Name', width: 28, get: (i) => t(i.ITEM_NAME_LABEL_ID) },
    { header: 'Name (JP)', width: 18, get: (i) => jp(i.ITEM_NAME_LABEL_ID) },
    { header: 'Category', width: 14, get: items.categoryOf },
    { header: 'Sub-category', width: 18, get: items.subCategoryOf },
    { header: 'Rank', width: 7, get: (i) => Number(i.ITEM_RANK) },
    { header: 'Price', width: 9, get: (i) => Number(i.ITEM_SELLING_PRICE) },
    { header: 'Base Sales', width: 9, get: (i) => Number(i.ITEM_BASIC_SALES_NUM) },
    {
      header: 'Sold In',
      width: 26,
      get: (i) =>
        SHOPS.filter(([flag]) => i.shops.includes(flag))
          .map(([, name]) => name)
          .join(', '),
    },
    ...ELEMENTS.map(reduceColumn),
    {
      header: 'Growing Area',
      width: 16,
      get: (i) => (i.FARM_ID === NO_FARM ? '' : (items.farm.get(i.FARM_ID) ?? `Farm ${i.FARM_ID}`)),
    },
    { header: 'Base Yield', width: 8, get: (i) => (i.FARM_ID === NO_FARM ? '' : Number(i.ITEM_BASIC_CULTIVATION_NUM)) },
    { header: 'Gathered At', width: 60, get: (i) => (zones.gather.get(i.ITEM_ID)?.texts ?? []).join('; ') },
    { header: 'First Gather Task', width: 9, get: (i) => zones.gather.get(i.ITEM_ID)?.task ?? '' },
    { header: 'Dropped By', width: 30, get: (i) => (characters.droppedBy.get(i.ITEM_ID) ?? []).join(', ') },
    { header: 'Description', width: 80, get: (i) => t(i.ITEM_DESCRIPTION_LABEL_ID) },
  ];
}
