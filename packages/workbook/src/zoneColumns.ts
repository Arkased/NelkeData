import type { Game } from './game.js';
import type { Column } from './sheet.js';
import { unique } from './util.js';
import type { Spot } from './zones.js';

/**
 * Builds the columns of the Zones sheet.
 * @param game - the game data
 * @returns the columns
 * @sideEffects none
 */
export function zoneColumns(game: Game): Column<Spot>[] {
  const { items, story, zones } = game;
  const encountersOf = (s: Spot, boss: boolean): string =>
    zones.monstersText((zones.encountersBySpot.get(s.expl_research) ?? []).filter((e) => zones.isBossGroup(e.group) === boss));
  return [
    { header: 'Area', width: 20, get: (s) => s.area.name },
    { header: 'Spot', width: 24, get: (s) => s.name },
    { header: 'Route', width: 7, get: (s) => Number(s.expl_rootnumber) },
    { header: 'Opens', width: 34, get: (s) => (s.area.task_id ? `After ${story.taskLabel(s.area.task_id)}` : 'Start') },
    // diff_00..04: difficulty rank (S to F) at area level 1 to 5.
    {
      header: 'Difficulty by Area Lv',
      width: 14,
      get: (s) => s.area.difficulties.map((d) => d.replace('EXPL_AREA_DIFFICULTY_', '')).join(' '),
    },
    {
      header: 'Gather Items',
      width: 70,
      get: (s) =>
        (zones.collectBySpot.get(s.expl_research) ?? [])
          .toSorted((a, b) => Number(b.RATE) - Number(a.RATE))
          .map((c) => `${items.itemName(c.ITEM_TAG)} (${c.RATE}%)`)
          .join(', '),
    },
    {
      header: 'Special Spot Items',
      width: 40,
      get: (s) => unique((zones.uniqueByArea.get(s.area.expl_area) ?? []).map(items.itemName)).join(', '),
    },
    { header: 'Monsters', width: 70, get: (s) => encountersOf(s, false) },
    { header: 'Bosses', width: 30, get: (s) => encountersOf(s, true) },
  ];
}
