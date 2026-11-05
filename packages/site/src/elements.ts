import type { Element, Item } from '@nelke/model';
import { itemById } from './data.js';
import { ELEMENT_ITEM_IDS } from './element-items.js';

/**
 * Returns the element item of an element, which gives the icon and the page of the element.
 * @param element - the element
 * @returns the item
 * @throws {Error} when the data has no such item
 * @sideEffects none
 */
export function elementItem(element: Element): Item {
  const item = itemById.get(ELEMENT_ITEM_IDS[element]);
  if (item === undefined) throw new Error(`No element item for ${element}`);
  return item;
}
