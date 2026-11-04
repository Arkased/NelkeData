import { describe, expect, it } from 'vitest';
import type { Game } from '../../parse/game.js';
import { buildAreas, buildZones } from '../zones.js';

const PLACEHOLDER_ITEM = 'i_hidden';

describe('links to a placeholder item', () => {
  const items = { placeholderIds: new Set([PLACEHOLDER_ITEM]) };

  it('drops a special-item link', () => {
    const zone = { expl_area: 'z1', name: 'Zone', task: 0, taskName: '', difficulties: [] as string[] };
    const game = {
      items,
      zones: { zones: [zone], areas: [], uniqueByZone: new Map([['z1', ['i1', PLACEHOLDER_ITEM]]]) },
    } as unknown as Game;
    expect(buildZones(game)[0]?.specialItemIds).toEqual(['i1']);
  });

  it('drops a gather link', () => {
    const area = { expl_research: 'a1', name: 'Area', expl_rootnumber: '1' };
    const collect = [
      { ITEM_TAG: 'i1', RATE: '5' },
      { ITEM_TAG: PLACEHOLDER_ITEM, RATE: '5' },
    ];
    const game = {
      items,
      characters: { characterOfBattleId: () => undefined },
      zones: { areas: [area], collectByArea: new Map([['a1', collect]]), encountersByArea: new Map(), isBossGroup: () => false },
    } as unknown as Game;
    const [built] = buildAreas(game, { monsterIds: new Set() });
    expect(built?.gather).toEqual([{ itemId: 'i1', rate: 5 }]);
  });
});
