import { describe, expect, it } from 'vitest';
import { RANKS_PER_SYNTHESIS_LEVEL, synthesisLevelOf } from '../recipes.js';

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
