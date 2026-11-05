import { GatherKind } from '@nelke/model';
import { describe, expect, it } from 'vitest';
import { groupRareFinds } from '../rare-finds.js';

describe('groupRareFinds', () => {
  const find = (kind: GatherKind, spot: number, itemId: string, rate = 50) => ({ kind, spot, itemId, rate });

  it('orders the columns Treasure, Bug Net, Digging, Fishing, whatever the input order', () => {
    const columns = groupRareFinds([
      find(GatherKind.Fishing, 1, 'f'),
      find(GatherKind.Digging, 1, 'd'),
      find(GatherKind.Treasure, 1, 't'),
      find(GatherKind.BugNet, 1, 'b'),
    ]);
    expect(columns.map((c) => c.kind)).toEqual([GatherKind.Treasure, GatherKind.BugNet, GatherKind.Digging, GatherKind.Fishing]);
  });

  it('leaves out a kind with no item', () => {
    expect(groupRareFinds([find(GatherKind.Digging, 1, 'd')]).map((c) => c.kind)).toEqual([GatherKind.Digging]);
    expect(groupRareFinds([])).toEqual([]);
  });

  it('groups the items of a spot, orders the spots by number and captions a chest or a spot', () => {
    const [treasure, bug] = groupRareFinds([
      find(GatherKind.Treasure, 2, 'b'),
      find(GatherKind.Treasure, 1, 'a1'),
      find(GatherKind.Treasure, 1, 'a2'),
      find(GatherKind.BugNet, 1, 'x'),
    ]);
    expect(treasure?.spots.map((s) => s.caption)).toEqual(['Chest 1', 'Chest 2']);
    expect(treasure?.spots[0]?.items.map((i) => i.itemId)).toEqual(['a1', 'a2']);
    expect(bug?.spots[0]?.caption).toBe('Spot 1');
  });
});
