import { describe, expect, it } from 'vitest';
import { CATEGORY_NAMES, ItemCategory } from '../enums.js';

describe('CATEGORY_NAMES', () => {
  it('has a name for each game category', () => {
    expect(Object.keys(CATEGORY_NAMES).sort()).toEqual(Object.values(ItemCategory).sort());
  });
});
