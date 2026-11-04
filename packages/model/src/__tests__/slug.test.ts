import { describe, expect, it } from 'vitest';
import { slugify, withSlugs } from '../slug.js';

describe('slugify', () => {
  it('makes lower case and joins the words with hyphens', () => {
    expect(slugify('Fire Bomb')).toBe('fire-bomb');
  });

  it('removes accents', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('changes each run of other characters to 1 hyphen', () => {
    expect(slugify("Nelke's  Stew & Co.")).toBe('nelke-s-stew-co');
  });

  it('trims the hyphens at the start and the end', () => {
    expect(slugify('  *Hidden* ')).toBe('hidden');
  });
});

describe('withSlugs', () => {
  it('keeps the slug of the lowest ID and adds the ID to the others', () => {
    const slugs = withSlugs([
      { id: 7, name: 'Gold Ore' },
      { id: 3, name: 'Gold  Ore' },
      { id: 9, name: 'Gold-Ore' },
    ]).map((e) => e.slug);
    expect(slugs).toEqual(['gold-ore-7', 'gold-ore', 'gold-ore-9']);
  });

  it('keeps the order of the input', () => {
    const ids = withSlugs([
      { id: 2, name: 'B' },
      { id: 1, name: 'A' },
    ]).map((e) => e.id);
    expect(ids).toEqual([2, 1]);
  });
});
