import { describe, expect, expectTypeOf, it } from 'vitest';
import { CATEGORY_NAMES, ItemCategory, ItemCategoryName } from '../enums.js';
import { itemSchema, type Item } from '../schema/item.js';

describe('Item.category', () => {
  it('has the type ItemCategoryName, not string', () => {
    expectTypeOf<Item['category']>().toEqualTypeOf<ItemCategoryName>();
  });

  it('has a name for each game category', () => {
    expect(Object.keys(CATEGORY_NAMES).sort()).toEqual(Object.values(ItemCategory).sort());
  });

  it('is rejected by the schema when it is not a name of the enum', () => {
    expect(itemSchema.shape.category.safeParse('Category 9').success).toBe(false);
    expect(itemSchema.shape.category.safeParse('Battle Item').success).toBe(true);
  });
});
