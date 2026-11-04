import { describe, expect, it } from 'vitest';
import { compareRows, type SheetRows } from '../compare-rows.js';

const header = ['Name', 'Price'];
const sheet = (...rows: string[][]): SheetRows => ({ header, rows });
const base = sheet(['a', '1'], ['b', '2'], ['c', '3']);

describe('compareRows', () => {
  it('reports 1 removed row and nothing else', () => {
    const diff = compareRows('Items', base, sheet(['a', '1'], ['c', '3']));
    expect(diff).toEqual({
      removedKeys: ['["b"]'],
      addedKeys: [],
      orderChanged: false,
      missingKeyColumns: [],
      columnsRemoved: [],
      columnsAdded: [],
      changes: [],
    });
  });

  it('reports 1 changed cell', () => {
    const diff = compareRows('Items', base, sheet(['a', '1'], ['b', '9'], ['c', '3']));
    expect(diff.changes).toEqual([{ key: '["b"]', column: 'Price', old: '2', new: '9' }]);
    expect(diff.removedKeys).toEqual([]);
    expect(diff.addedKeys).toEqual([]);
    expect(diff.orderChanged).toBe(false);
  });

  it('reports a reordered row without a changed cell', () => {
    const diff = compareRows('Items', base, sheet(['b', '2'], ['a', '1'], ['c', '3']));
    expect(diff.orderChanged).toBe(true);
    expect(diff.changes).toEqual([]);
  });

  it('throws when a key value occurs 2 times', () => {
    expect(() => compareRows('Items', sheet(['a', '1'], ['a', '2']), base)).toThrow(/Items.*a/);
  });

  it('reports a missing key column as a header difference and does not pair the rows', () => {
    const noName: SheetRows = { header: ['Price'], rows: [['1']] };
    const diff = compareRows('Items', base, noName);
    expect(diff.missingKeyColumns).toEqual(['Name']);
    expect(diff.columnsRemoved).toEqual(['Name']);
    expect(diff.removedKeys).toEqual([]);
    expect(diff.addedKeys).toEqual([]);
    expect(diff.changes).toEqual([]);
  });

  it('gives 2 different rows 2 different keys when the cells hold a slash', () => {
    const zoneHeader = ['Area', 'Spot'];
    const left: SheetRows = { header: zoneHeader, rows: [['A / B', 'C']] };
    const right: SheetRows = { header: zoneHeader, rows: [['A', 'B / C']] };
    const diff = compareRows('Zones', left, right);
    expect(diff.removedKeys).toHaveLength(1);
    expect(diff.addedKeys).toHaveLength(1);
  });
});
