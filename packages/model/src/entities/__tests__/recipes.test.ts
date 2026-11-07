import { describe, expect, it } from 'vitest';
import { cumulativeSynthesisCosts, RANKS_PER_SYNTHESIS_LEVEL, synthesisLevelOf } from '../recipes.js';

describe('synthesisLevelOf', () => {
  it('rounds down to a whole level', () => {
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL * 3)).toBe(3);
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL * 4 - 1)).toBe(3);
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL * 4)).toBe(4);
  });

  it('has the minimum level 1 under the second level', () => {
    expect(synthesisLevelOf(0)).toBe(1);
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL - 1)).toBe(1);
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL)).toBe(1);
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL * 2 - 1)).toBe(1);
    expect(synthesisLevelOf(RANKS_PER_SYNTHESIS_LEVEL * 2)).toBe(2);
  });
});

describe('cumulativeSynthesisCosts', () => {
  const recipe = (resultItemId: string, synthesisCost: number, materials: [string, number][] = []) => ({
    resultItemId,
    synthesisCost,
    materials: materials.map(([itemId, quantity]) => ({ itemId, quantity })),
  });

  it('adds 0 for a material that no recipe makes', () => {
    expect(cumulativeSynthesisCosts([recipe('a', 5, [['herb', 3]])]).get('a')).toBe(5);
  });

  it('adds quantity times the cumulative cost of a material that a recipe makes, over several levels', () => {
    const costs = cumulativeSynthesisCosts([
      recipe('c', 1, [['b', 2]]),
      recipe('b', 3, [
        ['a', 4],
        ['herb', 9],
      ]),
      recipe('a', 5),
    ]);
    expect(costs.get('a')).toBe(5);
    expect(costs.get('b')).toBe(3 + 4 * 5);
    expect(costs.get('c')).toBe(1 + 2 * 23);
  });

  it('throws an error that names the items of a loop', () => {
    const loop = [recipe('a', 1, [['b', 1]]), recipe('b', 1, [['c', 1]]), recipe('c', 1, [['a', 1]])];
    expect(() => cumulativeSynthesisCosts(loop)).toThrow(/a.*b.*c/);
  });

  it('throws an error that names the item when 2 recipes make it', () => {
    expect(() => cumulativeSynthesisCosts([recipe('dup', 1), recipe('dup', 2)])).toThrow(/dup/);
  });
});
