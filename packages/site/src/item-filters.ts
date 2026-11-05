import { Shop, type Item } from '@nelke/model';
import { UiIcon } from './ui-icon.js';

/** The name of the item category that holds the element items. */
const ELEMENT_CATEGORY = 'Element';

/** The item categories of the filter, in the order of the game, with the icon of the game category. */
export const ITEM_CATEGORIES: readonly { name: string; icon: UiIcon }[] = [
  { name: 'Material', icon: UiIcon.CategoryMaterial },
  { name: 'Merchandise', icon: UiIcon.CategoryMerchandise },
  { name: 'Battle Item', icon: UiIcon.CategoryBattleItem },
  { name: 'Construction', icon: UiIcon.CategoryConstruction },
];

/** The name and the icon of each shop. */
export const SHOPS: Record<Shop, { label: string; icon: UiIcon }> = {
  [Shop.General]: { label: 'General Store', icon: UiIcon.ShopGeneral },
  [Shop.Weapon]: { label: 'Weapon/Armor Shop', icon: UiIcon.ShopWeapon },
  [Shop.Grocery]: { label: 'Grocery Store', icon: UiIcon.ShopGrocery },
  [Shop.Clothing]: { label: 'Clothing Store', icon: UiIcon.ShopClothing },
  [Shop.Medicine]: { label: 'Medicine Shop', icon: UiIcon.ShopMedicine },
};

/**
 * Returns the item category of the filter for an item: the element items are in Material.
 * @param item - the item
 * @returns the name of the category
 * @sideEffects none
 */
export function filterCategoryOf(item: Item): string {
  return item.category === ELEMENT_CATEGORY ? 'Material' : item.category;
}

/**
 * Returns the icon of the game category of an item.
 * @param item - the item
 * @returns the icon
 * @throws {Error} when the category is not in the filter
 * @sideEffects none
 */
export function categoryIconOf(item: Item): UiIcon {
  const category = ITEM_CATEGORIES.find((c) => c.name === filterCategoryOf(item));
  if (category === undefined) throw new Error(`Unknown item category ${item.category}`);
  return category.icon;
}
