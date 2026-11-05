import { describe, expect, expectTypeOf, it } from 'vitest';
import { ItemCategoryName } from '../../enums.js';
import { itemSchema, type Item } from '../item.js';

describe('Item.category', () => {
  it('has the type ItemCategoryName, not string', () => {
    expectTypeOf<Item['category']>().toEqualTypeOf<ItemCategoryName>();
  });

  it('is rejected by the schema when it is not a name of the enum', () => {
    expect(itemSchema.shape.category.safeParse('Category 9').success).toBe(false);
    expect(itemSchema.shape.category.safeParse(ItemCategoryName.BattleItem).success).toBe(true);
  });
});
