import { IconKind } from '@nelke/extract';
import { Element } from '../enums.js';
import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import { withSlugs } from '../slug.js';
import { orNull } from '../util.js';

const NO_FARM = '-1';

/**
 * Makes the items from the game tables.
 * @param game - the game data
 * @returns the items, in the order of the game table, with the game side of their links
 * @sideEffects requests the icon of each item from the icon set, which decodes it
 */
export function buildItems(game: Game): DirectData['items'] {
  const { messages, icons, items } = game;
  const { t, jp } = messages;
  return withSlugs(
    items.items.map((i) => ({
      id: i.ITEM_ID,
      name: t(i.ITEM_NAME_LABEL_ID),
      nameJp: orNull(jp(i.ITEM_NAME_LABEL_ID)),
      icon: orNull(icons.ref(IconKind.Item, Number(i.ITEM_IMAGE_NUM))),
      category: items.categoryOf(i),
      subCategory: orNull(items.subCategoryOf(i)),
      rank: Number(i.ITEM_RANK),
      price: Number(i.ITEM_SELLING_PRICE),
      baseSales: Number(i.ITEM_BASIC_SALES_NUM),
      shops: i.shops,
      reduce: {
        [Element.Fire]: Number(i.reduce[Element.Fire]),
        [Element.Water]: Number(i.reduce[Element.Water]),
        [Element.Wind]: Number(i.reduce[Element.Wind]),
        [Element.Earth]: Number(i.reduce[Element.Earth]),
      },
      growingArea: i.FARM_ID === NO_FARM ? null : (items.farm.get(i.FARM_ID) ?? `Farm ${i.FARM_ID}`),
      baseYield: i.FARM_ID === NO_FARM ? null : Number(i.ITEM_BASIC_CULTIVATION_NUM),
      description: orNull(t(i.ITEM_DESCRIPTION_LABEL_ID)),
    })),
  );
}
