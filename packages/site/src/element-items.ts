import { Element } from '@nelke/model';

/** The item of each element, by ID. Its icon is the icon of the element. */
export const ELEMENT_ITEM_IDS: Record<Element, string> = {
  [Element.Fire]: 'ITEM_MAT_ELEMENT_FIRE',
  [Element.Water]: 'ITEM_MAT_ELEMENT_WATER',
  [Element.Wind]: 'ITEM_MAT_ELEMENT_AIR',
  [Element.Earth]: 'ITEM_MAT_ELEMENT_SOIL',
};
