import { describe, expect, it } from 'vitest';
import { mergeLevels } from '../appearances.js';
import { formatLevelRange } from '../format.js';

describe('mergeLevels', () => {
  it('merges the rows of 1 entity into 1 entry with the levels of all rows', () => {
    const rows = [
      { areaId: 'a', levels: [22], boss: false },
      { areaId: 'b', levels: [5, 6], boss: false },
      { areaId: 'a', levels: [25], boss: true },
    ];
    const merged = mergeLevels(rows, (row) => row.areaId);
    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(formatLevelRange(merged[0]?.levels ?? [])).toBe('Lv 22–25');
    expect(formatLevelRange(merged[1]?.levels ?? [])).toBe('Lv 5–6');
  });

  it('returns no entry for no row and keeps an entry with no level', () => {
    expect(mergeLevels([], () => 'x')).toEqual([]);
    expect(mergeLevels([{ levels: [] }], () => 'x')).toEqual([{ id: 'x', levels: [] }]);
  });
});
