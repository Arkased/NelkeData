import { Difficulty } from '../enums.js';
import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import { withSlugs } from '../slug.js';
import { getOrCreate, required } from '../util.js';
import type { IdMap } from './ids.js';

const DIFFICULTY_PREFIX = 'EXPL_AREA_DIFFICULTY_';
const DIFFICULTIES = new Map<string, Difficulty>(Object.values(Difficulty).map((d) => [d, d]));

/** The IDs of the entities that the zones and the areas link to. */
export interface ZoneLinks {
  itemIds: IdMap;
  /** Maps the tag of a monster of character.xml to the ID of its entity. */
  monsterIds: IdMap;
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
 * @param links - the IDs of the items
 * @returns the zones, in the order of the game table
 * @throws {Error} when a zone names an item that the model does not hold, or a difficulty that is not known
 * @sideEffects none
 */
export function buildZones(game: Game, links: Pick<ZoneLinks, 'itemIds'>): DirectData['zones'] {
  const { zones, areas, uniqueByZone } = game.zones;
  return withSlugs(
    zones.map((z) => ({
      id: z.rowId,
      name: z.name,
      task: z.task ? { number: z.task, name: z.taskName } : null,
      difficulties: z.difficulties.map(difficultyOf),
      areaIds: areas.filter((a) => a.zone.expl_area === z.expl_area).map((a) => a.rowId),
      specialItemIds: [...new Set(uniqueByZone.get(z.expl_area) ?? [])].map((tag) => required(links.itemIds, tag)),
    })),
  );
}

/**
 * Makes the areas from the game tables.
 * @param game - the game data
 * @param links - the IDs of the items and the monsters
 * @returns the areas, in the order of the game table
 * @throws {Error} when an area names an item or a monster that the model does not hold
 * @sideEffects none
 */
export function buildAreas(game: Game, links: ZoneLinks): DirectData['areas'] {
  const { areas, collectByArea, encountersByArea, isBossGroup } = game.zones;
  const { characterOfBattleId } = game.characters;
  const monsterIdOf = (battleId: string): number => {
    const character = characterOfBattleId(battleId);
    if (character === undefined) throw new Error(`unknown battle character ${battleId}`);
    return required(links.monsterIds, character.CHARACTER_ID);
  };
  return withSlugs(
    areas.map((a) => {
      const appearances = new Map<string, { monsterId: number; levels: number[]; areaLevel: number; boss: boolean }>();
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
        id: a.rowId,
        name: a.name,
        route: Number(a.expl_rootnumber),
        gather: (collectByArea.get(a.expl_research) ?? []).map((c) => ({
          itemId: required(links.itemIds, c.ITEM_TAG),
          rate: Number(c.RATE),
        })),
        monsters: [...appearances.values()].map((m) => ({ ...m, levels: [...new Set(m.levels)].toSorted((x, y) => x - y) })),
      };
    }),
  );
}
