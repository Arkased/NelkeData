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
      { id: 'ITEM_G', name: 'Gold Ore' },
      { id: 'ITEM_C', name: 'Gold  Ore' },
      { id: 'ITEM_K', name: 'Gold-Ore' },
    ]).map((e) => e.slug);
    expect(slugs).toEqual(['gold-ore-item-g', 'gold-ore', 'gold-ore-item-k']);
  });

  it('keeps the order of the input', () => {
    const ids = withSlugs([
      { id: 'B', name: 'B' },
      { id: 'A', name: 'A' },
    ]).map((e) => e.id);
    expect(ids).toEqual(['B', 'A']);
  });

  it('gives the same slugs on 2 runs, whatever the order of the input', () => {
    const entities = [
      { id: 'ITEM_G', name: 'Gold Ore' },
      { id: 'ITEM_C', name: 'Gold Ore' },
      { id: 'ITEM_K', name: 'Iron' },
    ];
    const slugsOf = (list: typeof entities): Map<string, string> => new Map(withSlugs(list).map((e) => [e.id, e.slug]));
    expect(slugsOf(entities)).toEqual(slugsOf(entities));
    expect(slugsOf(entities.toReversed())).toEqual(slugsOf(entities));
  });
});
