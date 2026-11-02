import { z } from 'zod';
import { Element, ItemCategory, ShopFlag } from './enums.js';
import { isPlaceholder } from './util.js';
import type { ReadTable } from './xml.js';

const CATEGORY_NAMES = new Map<string, string>([
  [ItemCategory.Material, 'Material'],
  [ItemCategory.Construction, 'Construction'],
  [ItemCategory.Merchandise, 'Merchandise'],
  [ItemCategory.Element, 'Element'],
  [ItemCategory.BattleItem, 'Battle Item'],
]);

/** The shops that sell items, in column order, with their names. */
export const SHOPS: readonly [ShopFlag, string][] = [
  [ShopFlag.General, 'General Store'],
  [ShopFlag.Weapon, 'Weapon/Armor Shop'],
  [ShopFlag.Grocery, 'Grocery Store'],
  [ShopFlag.Clothing, 'Clothing Store'],
  [ShopFlag.Medicine, 'Medicine Shop'],
];

const FARM_CATEGORY = '2';

const itemSchema = z
  .object({
    ITEM_ID: z.string(),
    ITEM_NAME_LABEL_ID: z.string(),
    ITEM_DESCRIPTION_LABEL_ID: z.string(),
    ITEM_CATEGORY_ID: z.string(),
    ITEM_SUB_CATEGORY_ID: z.string(),
    ITEM_RANK: z.string(),
    ITEM_SELLING_PRICE: z.string(),
    ITEM_BASIC_SALES_NUM: z.string(),
    ITEM_IMAGE_NUM: z.string(),
    FARM_ID: z.string(),
    ITEM_BASIC_CULTIVATION_NUM: z.string(),
    GSTORE_SALE_FLAG: z.string(),
    ASHOP_SALE_FLAG: z.string(),
    GRSTORE_SALE_FLAG: z.string(),
    CSTORE_SALE_FLAG: z.string(),
    DRSTORE_SALE_FLAG: z.string(),
    ITEM_DI_ACQ_FIREELEMENT: z.string(),
    ITEM_DI_ACQ_WATERELEMENT: z.string(),
    ITEM_DI_ACQ_WINDELEMENT: z.string(),
    ITEM_DI_ACQ_EARTHELEMENT: z.string(),
  })
  .transform((i) => ({
    ...i,
    /** The shops that sell the item, in SHOPS order. */
    shops: SHOPS.map(([flag]) => flag).filter((flag) => i[flag] === '1'),
    /** The elements that the Reduce command gives for 1 of the item. */
    reduce: {
      [Element.Fire]: i.ITEM_DI_ACQ_FIREELEMENT,
      [Element.Water]: i.ITEM_DI_ACQ_WATERELEMENT,
      [Element.Wind]: i.ITEM_DI_ACQ_WINDELEMENT,
      [Element.Earth]: i.ITEM_DI_ACQ_EARTHELEMENT,
    },
  }));

const subCategorySchema = z.object({ ITEM__SUB_CATEGORY_ID: z.string(), ITEM_SUB_CATEGORY_NAME_LABEL_ID: z.string() });

const facilitySchema = z.object({
  FACILITY_CATEGORY_ID: z.string(),
  FACILITY_SUB_CATEGORY_ID: z.string(),
  FACILITY_PARENTNAME_LABEL_ID: z.string(),
});

/** A row of item.xml. */
export type Item = z.output<typeof itemSchema>;

/** The items of the game and the names of their categories. */
export interface Items {
  /** The items that have a name. */
  items: Item[];
  itemById: Map<string, Item>;
  /** Returns the English name of an item, or the id itself when the item is unknown. */
  itemName: (id: string) => string;
  categoryOf: (item: Item) => string;
  subCategoryOf: (item: Item) => string;
  /** Maps a growing area type (FARM_ID) to the name of the level 0 farm facility of that sub-category. */
  farm: Map<string, string>;
}

/**
 * Loads the items, their sub-categories and the farm facilities.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @returns the items and the lookups
 * @sideEffects reads the item and facility tables through the table reader
 */
export function loadItems(read: ReadTable, t: (label: string) => string): Items {
  const items = read('item/item.xml', itemSchema).filter((i) => !isPlaceholder(t(i.ITEM_NAME_LABEL_ID)));
  const itemById = new Map(items.map((i) => [i.ITEM_ID, i]));
  const subCategory = new Map(
    read('item/item_sub_category.xml', subCategorySchema).map((s) => [s.ITEM__SUB_CATEGORY_ID, t(s.ITEM_SUB_CATEGORY_NAME_LABEL_ID)]),
  );
  const farm = new Map<string, string>();
  for (const f of read('facility/facility.xml', facilitySchema)) {
    if (f.FACILITY_CATEGORY_ID === FARM_CATEGORY && !farm.has(f.FACILITY_SUB_CATEGORY_ID)) {
      farm.set(f.FACILITY_SUB_CATEGORY_ID, t(f.FACILITY_PARENTNAME_LABEL_ID));
    }
  }
  return {
    items,
    itemById,
    itemName: (id) => {
      const item = itemById.get(id);
      return item ? t(item.ITEM_NAME_LABEL_ID) : id;
    },
    categoryOf: (i) => CATEGORY_NAMES.get(i.ITEM_CATEGORY_ID) ?? `Category ${i.ITEM_CATEGORY_ID}`,
    subCategoryOf: (i) => subCategory.get(i.ITEM_SUB_CATEGORY_ID) ?? '',
    farm,
  };
}
