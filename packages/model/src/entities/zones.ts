import { Difficulty } from '../enums.js';
import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import { withSlugs } from '../slug.js';
import { getOrCreate } from '../util.js';
import type { IdSet } from './ids.js';

const DIFFICULTY_PREFIX = 'EXPL_AREA_DIFFICULTY_';
const DIFFICULTIES = new Map<string, Difficulty>(Object.values(Difficulty).map((d) => [d, d]));

/** The IDs of the entities that the areas link to. */
export interface ZoneLinks {
  monsterIds: IdSet;
}

function difficultyOf(tag: string): Difficulty {
  const rank = tag.replace(DIFFICULTY_PREFIX, '');
  const known = DIFFICULTIES.get(rank);
  if (known === undefined) throw new Error(`unknown difficulty ${tag}`);
  return known;
}

/**
 * Makes the zones from the game tables.
 * @param game - the game data
 * @returns the zones, in the order of the game table
 * @throws {Error} when a zone names a difficulty that is not known
 * @sideEffects none
 */
export function buildZones(game: Game): DirectData['zones'] {
  const { zones, areas, uniqueByZone } = game.zones;
  return withSlugs(
    zones.map((z) => ({
      id: z.expl_area,
      name: z.name,
      task: z.task ? { number: z.task, name: z.taskName } : null,
      difficulties: z.difficulties.map(difficultyOf),
      areaIds: areas.filter((a) => a.zone.expl_area === z.expl_area).map((a) => a.expl_research),
      specialItemIds: [...new Set(uniqueByZone.get(z.expl_area) ?? [])],
    })),
  );
}

/**
 * Makes the areas from the game tables.
 * @param game - the game data
 * @param links - the IDs of the monsters
 * @returns the areas, in the order of the game table
 * @throws {Error} when an area names a monster that the model does not hold
 * @sideEffects none
 */
export function buildAreas(game: Game, links: ZoneLinks): DirectData['areas'] {
  const { areas, collectByArea, encountersByArea, isBossGroup } = game.zones;
  const { characterOfBattleId } = game.characters;
  const monsterIdOf = (battleId: string): string => {
    const character = characterOfBattleId(battleId);
    if (character === undefined) throw new Error(`unknown battle character ${battleId}`);
    if (!links.monsterIds.has(character.CHARACTER_ID)) throw new Error(`${character.CHARACTER_ID} is not a monster`);
    return character.CHARACTER_ID;
  };
  return withSlugs(
    areas.map((a) => {
      const appearances = new Map<string, { monsterId: string; levels: number[]; areaLevel: number; boss: boolean }>();
      for (const { group, reqLv } of encountersByArea.get(a.expl_research) ?? []) {
        const boss = isBossGroup(group);
        for (const member of group.members) {
          const monsterId = monsterIdOf(member.id);
          const entry = getOrCreate(appearances, `${monsterId}:${boss}`, () => ({ monsterId, levels: [], areaLevel: reqLv, boss }));
          entry.levels.push(member.lv);
          entry.areaLevel = Math.min(entry.areaLevel, reqLv);
        }
      }
      return {
        id: a.expl_research,
        name: a.name,
        route: Number(a.expl_rootnumber),
        gather: (collectByArea.get(a.expl_research) ?? []).map((c) => ({
          itemId: c.ITEM_TAG,
          rate: Number(c.RATE),
        })),
        monsters: [...appearances.values()].map((m) => ({ ...m, levels: [...new Set(m.levels)].toSorted((x, y) => x - y) })),
      };
    }),
  );
}
