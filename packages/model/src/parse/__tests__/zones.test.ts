import { describe, expect, it } from 'vitest';
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
