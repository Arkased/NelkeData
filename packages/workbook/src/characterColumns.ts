import { IconKind } from '@nelke/extract';
import { ELEMENTS, STATS, type Character } from './characters.js';
import type { Game } from './game.js';
import { iconColumn, type Column } from './sheet.js';
import { range } from './util.js';

const NO_RANK = '-1';
// Monsters use the monster face list, where number 200 is the first entry.
const MONSTER_FACE_BASE = 200;

/**
 * Creates the function that finds the icon file name of a character or monster.
 * @param game - the game data
 * @returns the function; characters use the NPC face list at their illustration number
 * @sideEffects none
 */
export function characterIconOf(game: Game): (c: Character) => string {
  const { icons, characters } = game;
  return (c) =>
    characters.isMonster(c)
      ? icons.ref(IconKind.Monster, Number(c.CHARACTER_ANILLUSTRATION_NUM) - MONSTER_FACE_BASE)
      : icons.ref(IconKind.Npc, Number(c.CHARACTER_ANILLUSTRATION_NUM));
}

/**
 * Builds the columns of the Monsters sheet.
 * @param game - the game data
 * @returns the columns
 * @sideEffects none
 */
export function monsterColumns(game: Game): Column<Character>[] {
  const { messages, items, characters, zones } = game;
  const { t, jp } = messages;
  return [
    iconColumn(characterIconOf(game)),
    { header: 'Name', width: 22, get: (c) => characters.characterName.get(c.CHARACTER_ID) },
    { header: 'Name (JP)', width: 16, get: (c) => jp(c.CHARACTER_NAME_LABEL_ID) },
    { header: 'Type', width: 9, get: characters.typeOf },
    { header: 'Rank', width: 6, get: (c) => Number(c.CHARACTER_RANK_ID) },
    { header: 'Wage', width: 7, get: (c) => Number(c.CHARACTER_SUBMONEY) },
    ...STATS.map(([stat, label]): Column<Character> => ({ header: label, width: 6, get: (c) => characters.baseStat(c, stat) })),
    { header: 'Growth / Lv', width: 40, get: characters.growthText },
    ...ELEMENTS.map((e): Column<Character> => ({ header: `${e} DEF`, width: 7, get: (c) => characters.elementDef(c, e) })),
    {
      header: 'EXP',
      width: 6,
      get: (c) => {
        const b = characters.battleOf(c);
        return b ? Number(b.battle_exp) : '';
      },
    },
    {
      header: 'Drops',
      width: 36,
      get: (c) => {
        const b = characters.battleOf(c);
        return b
          ? characters
              .dropsOf(b)
              .map((d) => `${items.itemName(d.id)} x${d.num} (${d.rate}%)`)
              .join(', ')
          : '';
      },
    },
    {
      header: 'Found In',
      width: 40,
      get: (c) => [...(zones.habitat.get(c.BTL_CHARACTER_ID) ?? [])].map(([area, lvs]) => `${area} (Lv ${range(lvs)})`).join(', '),
    },
    { header: 'Description', width: 80, get: (c) => t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID) },
  ];
}

/**
 * Builds the columns of the Characters sheet.
 * @param game - the game data
 * @returns the columns
 * @sideEffects none
 */
export function characterColumns(game: Game): Column<Character>[] {
  const { messages, story, characters, recipes } = game;
  const { t, jp } = messages;
  const joinOf = characters.joinConditionOf;
  return [
    iconColumn(characterIconOf(game)),
    { header: 'Name', width: 22, get: (c) => characters.characterName.get(c.CHARACTER_ID) },
    { header: 'Name (JP)', width: 16, get: (c) => jp(c.CHARACTER_NAME_LABEL_ID) },
    { header: 'Type', width: 11, get: characters.typeOf },
    { header: 'Source Game', width: 36, get: characters.sourceGame },
    { header: 'Rank', width: 6, get: (c) => (c.CHARACTER_RANK_ID === NO_RANK ? '' : Number(c.CHARACTER_RANK_ID)) },
    { header: 'Aptitudes', width: 26, get: characters.aptitudesText },
    // CHM is 1 for every character, and the element DEF values are the same for every character.
    ...STATS.filter(([, label]) => label !== 'CHM').map(([stat, label]): Column<Character> => ({
      header: label,
      width: 6,
      get: (c) => characters.baseStat(c, stat),
    })),
    { header: 'Growth / Lv', width: 40, get: characters.growthText },
    { header: 'Skills', width: 50, get: characters.skillsText },
    { header: 'Battle Role', width: 10, get: characters.playRoleOf },
    { header: 'Friendship Start', width: 9, get: (c) => Number(c.CHARA_COMPANION_INITIAL) },
    { header: 'Friendship Max', width: 9, get: (c) => Number(c.CHARA_COMPANION_MAX) },
    { header: 'Join Event', width: 30, get: (c) => story.eventLabel(joinOf(c)?.CHARACTER_APP_EVENT ?? '') },
    { header: 'Join Population', width: 10, get: (c) => Number(joinOf(c)?.CHARACTER_APP_POPULATION ?? 0) },
    { header: 'Join Turn', width: 7, get: (c) => Number(joinOf(c)?.CHARACTER_APP_CTURN ?? 0) },
    { header: 'Recipe Sets Taught', width: 50, get: (c) => (recipes.setsTaughtBy.get(c.CHARACTER_ID) ?? []).join(', ') },
    { header: 'Description', width: 80, get: (c) => t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID) },
  ];
}
