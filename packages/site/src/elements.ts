import { Element, type Item } from '@nelke/model';
import { itemById } from './data.js';

/** The item of each element, by ID. Its icon is the icon of the element. */
const ELEMENT_ITEM_IDS: Record<Element, string> = {
  [Element.Fire]: 'ITEM_MAT_ELEMENT_FIRE',
  [Element.Water]: 'ITEM_MAT_ELEMENT_WATER',
  [Element.Wind]: 'ITEM_MAT_ELEMENT_AIR',
  [Element.Earth]: 'ITEM_MAT_ELEMENT_SOIL',
};

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
