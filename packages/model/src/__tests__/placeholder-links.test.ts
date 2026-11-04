import { describe, expect, it } from 'vitest';
import { buildMonsters } from '../entities/characters.js';
import { buildAreas, buildZones } from '../entities/zones.js';
import { CharacterType } from '../enums.js';
import type { Game } from '../parse/game.js';
import type { Story } from '../parse/story.js';
import type { ReadTable } from '../parse/xml.js';
import { loadZones } from '../parse/zones.js';

const PLACEHOLDER_ITEM = 'i_hidden';
const PLACEHOLDER_ZONE_NAME = 'zone_hidden';

// Reads fake tables by file name and parses each row with the schema of the loader.
function fakeRead(tables: Record<string, Record<string, string>[]>): ReadTable {
  return (rel, schema) => (tables[rel] ?? []).map((row) => schema.parse(row));
}

describe('loadZones', () => {
  const messages = {
    t: (label: string) => label,
    jp: () => '',
    isPlaceholder: (label: string) => label === PLACEHOLDER_ZONE_NAME,
  };
  const zoneRow = (id: string, name: string, prefix: string): Record<string, string> => ({
    expl_area: id,
    area_name: name,
    area_collect: `${prefix}_X`,
    diff_00: 'a',
    diff_01: 'a',
    diff_02: 'a',
    diff_03: 'a',
    diff_04: 'a',
  });

  it('drops a special-item row of a placeholder zone without throwing', () => {
    const read = fakeRead({
      'expl_area/expl_area.xml': [zoneRow('z1', 'Real', 'EA01'), zoneRow('z2', PLACEHOLDER_ZONE_NAME, 'EA02')],
      'expl_collect/unique_collect.xml': [
        { AREA_TAG: 'EA01_A', ITEM_TAG: 'i1' },
        { AREA_TAG: 'EA02_A', ITEM_TAG: 'i2' },
      ],
    });
    const zones = loadZones(read, messages, {} as Story);
    expect(zones.zones.map((z) => z.expl_area)).toEqual(['z1']);
    expect([...zones.uniqueByZone]).toEqual([['z1', ['i1']]]);
  });

  it('still throws for a special-item row of a zone that the game does not list', () => {
    const read = fakeRead({
      'expl_area/expl_area.xml': [zoneRow('z1', 'Real', 'EA01')],
      'expl_collect/unique_collect.xml': [{ AREA_TAG: 'EA09_A', ITEM_TAG: 'i2' }],
    });
    expect(() => loadZones(read, messages, {} as Story)).toThrow();
  });
});

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

  it('drops a monster drop link', () => {
    const row = {
      CHARACTER_ID: 'm1',
      BTL_CHARACTER_ID: 'b1',
      CHARACTER_ANILLUSTRATION_NUM: '200',
      CHARACTER_NAME_LABEL_ID: 'm1',
      CHARACTER_RANK_ID: '-1',
      CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID: 'd',
      CHARACTER_SUBMONEY: '0',
    };
    const drops = [
      { id: 'i1', num: 1, rate: 10 },
      { id: PLACEHOLDER_ITEM, num: 1, rate: 10 },
    ];
    const game = {
      items,
      messages: { jp: () => '', t: () => '' },
      icons: { ref: () => '' },
      zones: { zoneEncounters: [], isBossGroup: () => false },
      characters: {
        characters: [row],
        isMonster: () => true,
        battleOf: () => ({ battle_exp: '0' }),
        typeOf: () => CharacterType.Monster,
        characterName: new Map([['m1', 'Monster']]),
        baseStat: () => 0,
        growthOf: () => null,
        elementDef: () => 0,
        dropsOf: () => drops,
      },
    } as unknown as Game;
    expect(buildMonsters(game)[0]?.drops).toEqual([{ itemId: 'i1', quantity: 1, rate: 10 }]);
  });
});
