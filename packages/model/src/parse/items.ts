import { z } from 'zod';
import { Element, ItemCategory, Shop, ShopFlag } from '../enums.js';
import type { Messages } from './messages.js';
import { enumOrUnknown, type ReadTable } from './xml.js';

const CATEGORY_NAMES: Record<ItemCategory, string> = {
  [ItemCategory.Material]: 'Material',
  [ItemCategory.Construction]: 'Construction',
  [ItemCategory.Merchandise]: 'Merchandise',
  [ItemCategory.Element]: 'Element',
  [ItemCategory.BattleItem]: 'Battle Item',
};

const SHOPS: readonly [ShopFlag, Shop][] = [
  [ShopFlag.General, Shop.General],
  [ShopFlag.Weapon, Shop.Weapon],
  [ShopFlag.Grocery, Shop.Grocery],
  [ShopFlag.Clothing, Shop.Clothing],
  [ShopFlag.Medicine, Shop.Medicine],
];

const FARM_CATEGORY = '2';

const itemSchema = z
  .object({
    ITEM_ID: z.string(),
    ITEM_NAME_LABEL_ID: z.string(),
    ITEM_DESCRIPTION_LABEL_ID: z.string(),
    ITEM_CATEGORY_ID: enumOrUnknown(ItemCategory),
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
    shops: SHOPS.filter(([flag]) => i[flag] === '1').map(([, shop]) => shop),
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
  /** The items that are not placeholders. */
  items: Item[];
  itemById: Map<string, Item>;
  /** The IDs of the placeholder items, which the recipes must not use. */
  placeholderIds: ReadonlySet<string>;
  categoryOf: (item: Item) => string;
  subCategoryOf: (item: Item) => string;
  /** Maps a growing area type (FARM_ID) to the name of the level 0 farm facility of that sub-category. */
  farm: Map<string, string>;
}

/**
 * Loads the items, their sub-categories and the farm facilities.
 * @param read - the table reader of the saves folder
 * @param messages - the game texts
 * @returns the items and the lookups
 * @sideEffects reads the item and facility tables through the table reader
 */
export function loadItems(read: ReadTable, messages: Messages): Items {
  const { t } = messages;
  const rows = read('item/item.xml', itemSchema);
  const items = rows.filter((i) => !messages.isPlaceholder(i.ITEM_NAME_LABEL_ID));
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
    placeholderIds: new Set(rows.filter((i) => messages.isPlaceholder(i.ITEM_NAME_LABEL_ID)).map((i) => i.ITEM_ID)),
    categoryOf: (i) =>
      typeof i.ITEM_CATEGORY_ID === 'string' ? CATEGORY_NAMES[i.ITEM_CATEGORY_ID] : `Category ${i.ITEM_CATEGORY_ID.unknown}`,
    subCategoryOf: (i) => subCategory.get(i.ITEM_SUB_CATEGORY_ID) ?? '',
    farm,
  };
}
