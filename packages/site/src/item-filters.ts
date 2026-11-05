import { CATEGORY_NAMES, ItemCategory, Shop, type Item } from '@nelke/model';
import { UiIcon } from './ui-icon.js';

/** The reverse of CATEGORY_NAMES: the item category of the game by the name that the data holds. */
const CATEGORY_BY_NAME = new Map<string, ItemCategory>(Object.values(ItemCategory).map((c) => [CATEGORY_NAMES[c], c]));

/** The item categories of the filter, in the order of the game, with the icon of the game category. */
export const ITEM_CATEGORIES: readonly { category: ItemCategory; icon: UiIcon }[] = [
  { category: ItemCategory.Material, icon: UiIcon.CategoryMaterial },
  { category: ItemCategory.Merchandise, icon: UiIcon.CategoryMerchandise },
  { category: ItemCategory.BattleItem, icon: UiIcon.CategoryBattleItem },
  { category: ItemCategory.Construction, icon: UiIcon.CategoryConstruction },
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
 * @returns the category
 * @throws {Error} when the category of the item is not one of the game
 * @sideEffects none
 */
export function filterCategoryOf(item: Item): ItemCategory {
  const category = CATEGORY_BY_NAME.get(item.category);
  if (category === undefined) throw new Error(`Unknown item category ${item.category}`);
  return category === ItemCategory.Element ? ItemCategory.Material : category;
}

/**
 * Returns the icon of the game category of an item.
 * @param item - the item
 * @returns the icon
 * @throws {Error} when the category is not in the filter
 * @sideEffects none
 */
export function categoryIconOf(item: Item): UiIcon {
  const category = ITEM_CATEGORIES.find((c) => c.category === filterCategoryOf(item));
  if (category === undefined) throw new Error(`Unknown item category ${item.category}`);
  return category.icon;
}
