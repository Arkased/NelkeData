import { describe, expect, it } from 'vitest';
import { descriptionOrNull, isPlaceholder } from '../placeholder.js';

describe('isPlaceholder', () => {
  it.each(['', '   '])('is true for an English name with no text: %j', (name) => {
    expect(isPlaceholder(name, '')).toBe(true);
  });

  it('is true for an English name that starts with *', () => {
    expect(isPlaceholder('*Unneccesary', '')).toBe(true);
  });

  it.each(['Item 015', 'item 7', 'ITEM 1234'])('is true for the English name "Item" and a number: %s', (name) => {
    expect(isPlaceholder(name, '')).toBe(true);
  });

  it('is true for the Japanese name "アイテムの名前" and a number', () => {
    expect(isPlaceholder('Real Name', 'アイテムの名前015')).toBe(true);
  });

  it.each(['Item Box', 'Itemized 1', 'Item 1 Box', 'Item', 'Not *Starred'])('is false for the near miss %s', (name) => {
    expect(isPlaceholder(name, '')).toBe(false);
  });

  it.each(['アイテムの名前', 'アイテムの名前の箱1', 'ポーション'])('is false for the Japanese near miss %s', (nameJp) => {
    expect(isPlaceholder('Potion', nameJp)).toBe(false);
  });
});

describe('descriptionOrNull', () => {
  it('is null for an empty description and for placeholder text', () => {
    expect([descriptionOrNull(''), descriptionOrNull('*Unused')]).toEqual([null, null]);
  });

  it('keeps a description that has a * after the start', () => {
    expect(descriptionOrNull('Heals 10* HP')).toBe('Heals 10* HP');
  });
});
