import { IconKind } from '@nelke/extract';
import { Element, Stat, CharacterType } from '../enums.js';
import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import type { Character as CharacterRow, Characters } from '../parse/characters.js';
import { withSlugs } from '../slug.js';
import { getOrCreate, orNull, required } from '../util.js';
import type { IdMap } from './ids.js';
import { storyEventOf } from './story.js';

const NO_RANK = '-1';
// Monsters use the monster face list, where number 200 is the first entry.
const MONSTER_FACE_BASE = 200;
const STATS = Object.values(Stat);
const ELEMENTS = Object.values(Element);

/** The IDs of the entities that the characters and the monsters link to. */
export interface CharacterLinks {
  itemIds: IdMap;
}

function recordOf<K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> {
  const record: Partial<Record<K, V>> = {};
  for (const key of keys) record[key] = value(key);
  return record as Record<K, V>;
}

/**
 * Finds the icon file name of a character or a monster. Characters use the NPC face list at their illustration number.
 * @param game - the game data
 * @param c - the character row
 * @returns the file name, or null when the game has no texture for the icon
 * @sideEffects requests the icon from the icon set, which decodes it
 */
function iconOf(game: Game, c: CharacterRow): string | null {
  const number = Number(c.CHARACTER_ANILLUSTRATION_NUM);
  const name = game.characters.isMonster(c)
    ? game.icons.ref(IconKind.Monster, number - MONSTER_FACE_BASE)
    : game.icons.ref(IconKind.Npc, number);
  return orNull(name);
}

// The fields that monsters and characters share.
function commonFields(
  game: Game,
  c: CharacterRow,
): {
  id: number;
  name: string;
  nameJp: string | null;
  icon: string | null;
  rank: number | null;
  stats: Record<Stat, number>;
  growth: ReturnType<Characters['growthOf']>;
  description: string | null;
} {
  const { characters, messages } = game;
  return {
    id: c.rowId,
    name: required(characters.characterName, c.CHARACTER_ID),
    nameJp: orNull(messages.jp(c.CHARACTER_NAME_LABEL_ID)),
    icon: iconOf(game, c),
    rank: c.CHARACTER_RANK_ID === NO_RANK ? null : Number(c.CHARACTER_RANK_ID),
    stats: recordOf(STATS, (stat) => characters.baseStat(c, stat)),
    growth: characters.growthOf(c),
    description: orNull(messages.t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID)),
  };
}

// Lists the zones where a monster appears through an encounter group that no area lists, with the levels.
function zoneEncountersOf(game: Game, c: CharacterRow): DirectData['monsters'][number]['zoneEncounters'] {
  const found = new Map<string, { zoneId: number; levels: number[]; boss: boolean }>();
  for (const { group, zone } of game.zones.zoneEncounters) {
    const boss = game.zones.isBossGroup(group);
    for (const member of group.members.filter((m) => m.id === c.BTL_CHARACTER_ID)) {
      getOrCreate(found, `${zone.rowId}:${boss}`, () => ({ zoneId: zone.rowId, levels: [], boss })).levels.push(member.lv);
    }
  }
  return [...found.values()].map((e) => ({ ...e, levels: [...new Set(e.levels)].toSorted((x, y) => x - y) }));
}

/**
 * Makes the monsters from the game tables: the characters of the categories Monster and Boss.
 * @param game - the game data
 * @param links - the IDs of the items
 * @returns the monsters, in the order of the game table
 * @throws {Error} when a monster drops an item that the model does not hold
 * @sideEffects requests the icon of each monster from the icon set, which decodes it
 */
export function buildMonsters(game: Game, links: CharacterLinks): DirectData['monsters'] {
  const { characters } = game;
  return withSlugs(
    characters.characters.filter(characters.isMonster).map((c) => {
      const battle = characters.battleOf(c);
      const type = characters.typeOf(c);
      if (type !== CharacterType.Monster && type !== CharacterType.Boss) throw new Error(`${c.CHARACTER_ID} is not a monster`);
      return {
        ...commonFields(game, c),
        type,
        wage: Number(c.CHARACTER_SUBMONEY),
        elementDef: battle ? recordOf(ELEMENTS, (element) => characters.elementDef(c, element) ?? 0) : null,
        exp: battle ? Number(battle.battle_exp) : null,
        drops: battle
          ? characters.dropsOf(battle).map((d) => ({ itemId: required(links.itemIds, d.id), quantity: d.num, rate: d.rate }))
          : [],
        zoneEncounters: zoneEncountersOf(game, c),
      };
    }),
  );
}

/**
 * Makes the characters from the game tables: all the characters that are not monsters.
 * @param game - the game data
 * @returns the characters, in the order of the game table
 * @throws {Error} when a character has a category that is not known
 * @sideEffects requests the icon of each character from the icon set, which decodes it
 */
export function buildCharacters(game: Game): DirectData['characters'] {
  const { characters, story } = game;
  return withSlugs(
    characters.characters
      .filter((c) => !characters.isMonster(c))
      .map((c) => {
        const type = characters.typeOf(c);
        if (type === CharacterType.Monster || type === CharacterType.Boss) throw new Error(`${c.CHARACTER_ID} is a monster`);
        const skills = characters.skillsOf(c);
        const join = characters.joinConditionOf(c);
        return {
          ...commonFields(game, c),
          type,
          sourceGame: orNull(characters.sourceGame(c)),
          aptitudes: characters.aptitudesOf(c),
          skills: skills.learned,
          eventSkill: skills.eventSkill && { name: skills.eventSkill.name, event: storyEventOf(story, skills.eventSkill.eventId) },
          battleRole: characters.playRoleOf(c),
          friendshipStart: Number(c.CHARA_COMPANION_INITIAL),
          friendshipMax: Number(c.CHARA_COMPANION_MAX),
          join: join
            ? {
                event: storyEventOf(story, join.CHARACTER_APP_EVENT),
                population: Number(join.CHARACTER_APP_POPULATION),
                turn: Number(join.CHARACTER_APP_CTURN),
              }
            : null,
        };
      }),
  );
}
