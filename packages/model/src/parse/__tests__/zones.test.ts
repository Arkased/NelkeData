import { describe, expect, it } from 'vitest';
import { Element, GatherKind, GimmickType } from '../../enums.js';
import type { Story } from '../story.js';
import { loadZones } from '../zones.js';
import { fakeRead } from './fakes/fake-read.js';

const PLACEHOLDER_ZONE_NAME = 'zone_hidden';

describe('loadZones', () => {
  const messages = {
    t: (label: string) => label,
    jp: () => '',
    isPlaceholder: (label: string) => label === PLACEHOLDER_ZONE_NAME,
  };
  const zoneRow = (id: string, name: string, prefix: string, extra: Record<string, string> = {}): Record<string, string> => ({
    expl_area: id,
    area_name: name,
    area_collect: `${prefix}_X`,
    diff_00: 'a',
    diff_01: 'a',
    diff_02: 'a',
    diff_03: 'a',
    diff_04: 'a',
    ...extra,
  });
  const gimmick = (type: GimmickType, table: string): Record<string, string> => ({ type, table_01: table });
  const unique = (table: string, item: string, rate: string, areaTag = 'EA01_A'): Record<string, string> => ({
    COLLECT_ITEM_TAG: table,
    AREA_TAG: areaTag,
    ITEM_TAG: item,
    RATE_03: rate,
  });

  it('reads the elements of a zone in the order of the flags', () => {
    const read = fakeRead({
      'expl_area/expl_area.xml': [zoneRow('z1', 'Real', 'EA01', { ele_00: '0', ele_01: '1', ele_02: '0', ele_03: '1' })],
    });
    expect(loadZones(read, messages, {} as Story).zones[0]?.elements).toEqual([Element.Water, Element.Earth]);
  });

  it('numbers the spots of each kind from 1 and counts a table that 2 gimmicks share once', () => {
    const read = fakeRead({
      'expl_area/expl_area.xml': [zoneRow('z1', 'Real', 'EA01')],
      'expl_gimmick/expl_gimmick.xml': [
        gimmick(GimmickType.Box, 'EA01_T0'),
        gimmick(GimmickType.Box, 'EA01_T1'),
        gimmick(GimmickType.Bug, 'EA01_T2'),
        gimmick(GimmickType.Box, 'EA01_T0'),
      ],
      'expl_collect/unique_collect.xml': [
        unique('EA01_T0', 'i0', '100'),
        unique('EA01_T1', 'i1', '50'),
        unique('EA01_T1', 'i2', '50'),
        unique('EA01_T2', 'i3', '25'),
      ],
    });
    const finds = loadZones(read, messages, {} as Story).specialByZone.get('z1');
    expect(finds).toEqual([
      { ITEM_TAG: 'i0', kind: GatherKind.Treasure, spot: 1, rate: 100 },
      { ITEM_TAG: 'i1', kind: GatherKind.Treasure, spot: 2, rate: 50 },
      { ITEM_TAG: 'i2', kind: GatherKind.Treasure, spot: 2, rate: 50 },
      { ITEM_TAG: 'i3', kind: GatherKind.BugNet, spot: 1, rate: 25 },
    ]);
  });

  it('drops a gimmick of a placeholder zone without throwing', () => {
    const read = fakeRead({
      'expl_area/expl_area.xml': [zoneRow('z1', 'Real', 'EA01'), zoneRow('z2', PLACEHOLDER_ZONE_NAME, 'EA02')],
      'expl_gimmick/expl_gimmick.xml': [gimmick(GimmickType.Dig, 'EA01_T0'), gimmick(GimmickType.Dig, 'EA02_T0')],
      'expl_collect/unique_collect.xml': [unique('EA01_T0', 'i1', '100'), unique('EA02_T0', 'i2', '100', 'EA02_A')],
    });
    const zones = loadZones(read, messages, {} as Story);
    expect(zones.zones.map((z) => z.expl_area)).toEqual(['z1']);
    expect([...zones.specialByZone.keys()]).toEqual(['z1']);
  });

  it('still throws for a gimmick of a zone that the game does not list', () => {
    const read = fakeRead({
      'expl_area/expl_area.xml': [zoneRow('z1', 'Real', 'EA01')],
      'expl_gimmick/expl_gimmick.xml': [gimmick(GimmickType.Dig, 'EA09_T0')],
    });
    expect(() => loadZones(read, messages, {} as Story)).toThrow();
  });
});
