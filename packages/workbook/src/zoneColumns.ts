import type { Area, Zone } from '@nelke/model';
import { opensText, pick, range, type Lookup } from './lookup.js';
import type { Column } from './sheet.js';

/** The appearances of 1 monster in 1 area, merged by monster name. */
interface Appearance {
  levels: number[];
  areaLevel: number;
}

function monstersText(area: Area, boss: boolean, lookup: Lookup): string {
  const byName = new Map<string, Appearance>();
  for (const m of area.monsters.filter((entry) => entry.boss === boss)) {
    const name = pick(lookup.monsters, m.monsterId).name;
    const entry = byName.get(name);
    if (entry) {
      entry.levels.push(...m.levels);
      entry.areaLevel = Math.min(entry.areaLevel, m.areaLevel);
    } else {
      byName.set(name, { levels: [...m.levels], areaLevel: m.areaLevel });
    }
  }
  return [...byName]
    .map(([name, { levels, areaLevel }]) => `${name} Lv ${range(levels)}${areaLevel ? ` (area Lv ${areaLevel}+)` : ''}`)
    .join(', ');
}

/**
 * Builds the columns of the Zones sheet. A row is an area.
 * @param lookup - the entities by ID
 * @returns the columns
 * @sideEffects none
 */
export function zoneColumns(lookup: Lookup): Column<Area>[] {
  const zoneOf = (a: Area): Zone => pick(lookup.zones, a.zoneId);
  return [
    { header: 'Area', width: 20, get: (a) => zoneOf(a).name },
    { header: 'Spot', width: 24, get: (a) => a.name },
    { header: 'Route', width: 7, get: (a) => a.route },
    { header: 'Opens', width: 34, get: (a) => opensText(zoneOf(a)) },
    // difficulties: the difficulty rank (S to F) at area level 1 to 5.
    { header: 'Difficulty by Area Lv', width: 14, get: (a) => zoneOf(a).difficulties.join(' ') },
    {
      header: 'Gather Items',
      width: 70,
      get: (a) =>
        a.gather
          .toSorted((x, y) => y.rate - x.rate)
          .map((g) => `${pick(lookup.items, g.itemId).name} (${g.rate}%)`)
          .join(', '),
    },
    {
      header: 'Special Spot Items',
      width: 40,
      get: (a) =>
        zoneOf(a)
          .specialItemIds.map((id) => pick(lookup.items, id).name)
          .join(', '),
    },
    { header: 'Monsters', width: 70, get: (a) => monstersText(a, false, lookup) },
    { header: 'Bosses', width: 30, get: (a) => monstersText(a, true, lookup) },
  ];
}
