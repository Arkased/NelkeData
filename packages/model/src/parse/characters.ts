import { z } from 'zod';
import { CharacterCategory, CharacterType, Element, PlayType, Stat, BattleRole } from '../enums.js';
import { isPlaceholder } from '../util.js';
import { enumOrUnknown, stringShape, type ReadTable } from './xml.js';

const NO_SKILL = 'SKILL_INVALID';
const NO_APTITUDE = 'PREPARATION_APTITUDE_INVALID';
const NO_DROP = 'ITEM_NONE';

/** The elements of btl_chara element_1..4, in order. element_0 is "no element" and is always 0. */
const BATTLE_ELEMENTS: readonly Element[] = [Element.Fire, Element.Water, Element.Wind, Element.Earth];

const CHARACTER_TYPES: Record<CharacterCategory, CharacterType> = {
  [CharacterCategory.MainA]: CharacterType.Main,
  [CharacterCategory.MainB]: CharacterType.Main,
  [CharacterCategory.Alchemist]: CharacterType.Alchemist,
  [CharacterCategory.Townsfolk]: CharacterType.Townsfolk,
  [CharacterCategory.Story]: CharacterType.Story,
  [CharacterCategory.Fairy]: CharacterType.Fairy,
  [CharacterCategory.Monster]: CharacterType.Monster,
  [CharacterCategory.Boss]: CharacterType.Boss,
};

const BATTLE_ROLES: Record<PlayType, BattleRole> = {
  [PlayType.Attacker]: BattleRole.Attacker,
  [PlayType.Supporter]: BattleRole.Supporter,
};

const characterSchema = z
  .object({
    CHARACTER_ID: z.string(),
    CHARACTER_NAME_LABEL_ID: z.string(),
    CHARACTER_CATEGORY_ID: enumOrUnknown(CharacterCategory),
    BTL_CHARACTER_ID: z.string(),
    PARA_ARCHETYPE_ID: z.string(),
    PARA_GROWTYPE_ID: z.string(),
    CHARACTER_ANILLUSTRATION_NUM: z.string(),
    CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID: z.string(),
    CHARACTER_RANK_ID: z.string(),
    CHARACTER_SUBMONEY: z.string(),
    PRODUCT_ID: z.string(),
    CHARA_COMPANION_INITIAL: z.string(),
    CHARA_COMPANION_MAX: z.string(),
    CHARACTER_APP_CON_ID: z.string(),
    CHARACTER_PREPARATION_APTITUDE_ID1: z.string(),
    CHARACTER_PREPARATION_APTITUDE_ID2: z.string(),
    CHARACTER_PREPARATION_APTITUDE_ID3: z.string(),
    CHARACTER_SKILL1_ID: z.string(),
    CHARACTER_SKILL1_LEARNING_LV: z.string(),
    CHARACTER_SKILL2_ID: z.string(),
    CHARACTER_SKILL2_LEARNING_LV: z.string(),
    CHARACTER_SKILL3_ID: z.string(),
    CHARACTER_SKILL3_LEARNING_LV: z.string(),
    CHARACTER_SKILL4_ID: z.string(),
    CHARACTER_SKILL4_LEARNING_LV: z.string(),
    CHARACTER_SKILL5_ID: z.string(),
    CHARACTER_SKILL5_LEARNING_EVENT: z.string(),
  })
  .transform((c) => ({
    ...c,
    aptitudeIds: [c.CHARACTER_PREPARATION_APTITUDE_ID1, c.CHARACTER_PREPARATION_APTITUDE_ID2, c.CHARACTER_PREPARATION_APTITUDE_ID3],
    skills: [
      { id: c.CHARACTER_SKILL1_ID, level: c.CHARACTER_SKILL1_LEARNING_LV },
      { id: c.CHARACTER_SKILL2_ID, level: c.CHARACTER_SKILL2_LEARNING_LV },
      { id: c.CHARACTER_SKILL3_ID, level: c.CHARACTER_SKILL3_LEARNING_LV },
      { id: c.CHARACTER_SKILL4_ID, level: c.CHARACTER_SKILL4_LEARNING_LV },
    ],
  }));

// Some rows of btl_chara.xml (35 of 97) have only the id and the skill fields: the rest reads as empty or 0.
const text = z.string().default('');
const count = z.string().default('0');
const battleSchema = z
  .object({
    BTL_CHARACTER_ID: z.string(),
    CHARACTER_ID: text,
    // An unknown role reads as no role.
    BTL_PLAY_TYPE_ID: z.enum(PlayType).optional().catch(undefined),
    battle_exp: count,
    element_1: count,
    element_2: count,
    element_3: count,
    element_4: count,
    drop_item0: text,
    drop_item1: text,
    drop_item2: text,
    item_num0: count,
    item_num1: count,
    item_num2: count,
    drop_rate0: count,
    drop_rate1: count,
    drop_rate2: count,
  })
  .transform((b) => ({
    ...b,
    elementDefs: [b.element_1, b.element_2, b.element_3, b.element_4],
    drops: [
      { id: b.drop_item0, num: Number(b.item_num0), rate: Number(b.drop_rate0) },
      { id: b.drop_item1, num: Number(b.item_num1), rate: Number(b.drop_rate1) },
      { id: b.drop_item2, num: Number(b.item_num2), rate: Number(b.drop_rate2) },
    ],
  }));

const archetypeKey = (stat: Stat): `PARA_ARCHETYPE_${Stat}` => `PARA_ARCHETYPE_${stat}`;
const growMinKey = (stat: Stat): `PARA_GROWTYPE_${Stat}MIN` => `PARA_GROWTYPE_${stat}MIN`;
const growMaxKey = (stat: Stat): `PARA_GROWTYPE_${Stat}MAX` => `PARA_GROWTYPE_${stat}MAX`;
const allStats = Object.values(Stat);

const archetypeSchema = z.object({ PARA_ARCHETYPE_ID: z.string(), ...stringShape(allStats.map(archetypeKey)) });
const growtypeSchema = z.object({
  PARA_GROWTYPE_ID: z.string(),
  ...stringShape(allStats.map(growMinKey)),
  ...stringShape(allStats.map(growMaxKey)),
});
const aptitudeSchema = z.object({ PREPARATION_APTITUDE_ID: z.string(), PREPARATION_APTITUDE_NAME_LABEL_ID: z.string() });
const productSchema = z.object({ PRODUCT_ID: z.string(), PRODUCT_NAME_LABEL_ID: z.string() });
const skillSchema = z.object({ CHARACTER_SKILL_ID: z.string(), SKILL_NAME_LABEL_ID: z.string() });
const joinConditionSchema = z.object({
  CHARA_APP_CON_ID: z.string(),
  CHARACTER_APP_EVENT: z.string(),
  CHARACTER_APP_POPULATION: z.string(),
  CHARACTER_APP_CTURN: z.string(),
});

/** A named row of character.xml. */
export type Character = z.output<typeof characterSchema>;
/** A row of btl_chara.xml. */
export type Battle = z.output<typeof battleSchema>;
/** An item that a monster drops. */
export type Drop = Battle['drops'][number];
/** The join condition of a character. */
export type JoinCondition = z.output<typeof joinConditionSchema>;

/** The skills of a character. */
export interface CharacterSkills {
  /** The skills that the character learns at a level, in slot order. */
  learned: { name: string; level: number }[];
  /** The skill that the character learns at a story event, with the ID of the event. */
  eventSkill: { name: string; eventId: string } | null;
}

/** The growth of a stat for each level. */
export interface StatGrowth {
  min: number;
  max: number;
}

/** The characters and monsters of the game with their battle data. */
export interface Characters {
  /** The characters and monsters that have a name. */
  characters: Character[];
  /** Maps a character id to its English name. */
  characterName: Map<string, string>;
  isMonster: (c: Character) => boolean;
  battleOf: (c: Character) => Battle | undefined;
  /** Returns the character of a battle character id, or undefined when the id is unknown or the character has no name. */
  characterOfBattleId: (id: string) => Character | undefined;
  /** Returns the type of a character; throws when the category of the game is not known. */
  typeOf: (c: Character) => CharacterType;
  playRoleOf: (c: Character) => BattleRole | null;
  baseStat: (c: Character, stat: Stat) => number;
  /** Returns the growth of each stat for each level, or null when the character has no growth type. */
  growthOf: (c: Character) => Record<Stat, StatGrowth> | null;
  skillsOf: (c: Character) => CharacterSkills;
  /** Returns the names of the aptitudes of a character; an unknown aptitude shows as its id. */
  aptitudesOf: (c: Character) => string[];
  sourceGame: (c: Character) => string;
  joinConditionOf: (c: Character) => JoinCondition | undefined;
  /** Returns the defense of a monster against an element, or null when it has no battle data. */
  elementDef: (c: Character, element: Element) => number | null;
  dropsOf: (b: Battle) => Drop[];
}

/**
 * Loads the characters, the monsters and their battle data.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @returns the characters and the lookups
 * @sideEffects reads the character and battle tables through the table reader
 */
export function loadCharacters(read: ReadTable, t: (label: string) => string): Characters {
  const characters = read('character/character.xml', characterSchema).filter((c) => !isPlaceholder(t(c.CHARACTER_NAME_LABEL_ID)));
  const characterName = new Map(characters.map((c) => [c.CHARACTER_ID, t(c.CHARACTER_NAME_LABEL_ID)]));
  const characterById = new Map(characters.map((c) => [c.CHARACTER_ID, c]));
  const battleById = new Map(read('battle/btl_chara.xml', battleSchema).map((b) => [b.BTL_CHARACTER_ID, b]));
  const archetype = new Map(read('character/para_archetype.xml', archetypeSchema).map((a) => [a.PARA_ARCHETYPE_ID, a]));
  const growtype = new Map(read('character/para_growtype.xml', growtypeSchema).map((g) => [g.PARA_GROWTYPE_ID, g]));
  const product = new Map(read('character/product.xml', productSchema).map((p) => [p.PRODUCT_ID, t(p.PRODUCT_NAME_LABEL_ID)]));
  const skill = new Map(read('character/character_skill.xml', skillSchema).map((s) => [s.CHARACTER_SKILL_ID, t(s.SKILL_NAME_LABEL_ID)]));
  const joinCondition = new Map(read('character/character_app_con.xml', joinConditionSchema).map((a) => [a.CHARA_APP_CON_ID, a]));
  const aptitude = new Map(
    read('preparation_aptitude/preparation_aptitude.xml', aptitudeSchema).map((a) => [
      a.PREPARATION_APTITUDE_ID,
      t(a.PREPARATION_APTITUDE_NAME_LABEL_ID),
    ]),
  );

  const battleOf = (c: Character): Battle | undefined => battleById.get(c.BTL_CHARACTER_ID);
  const skillName = (id: string): string => skill.get(id) ?? '';

  return {
    characters,
    characterName,
    isMonster: (c) => c.CHARACTER_CATEGORY_ID === CharacterCategory.Monster || c.CHARACTER_CATEGORY_ID === CharacterCategory.Boss,
    battleOf,
    characterOfBattleId: (id) => characterById.get(battleById.get(id)?.CHARACTER_ID ?? ''),
    typeOf: (c) => {
      if (typeof c.CHARACTER_CATEGORY_ID !== 'string') throw new Error(`unknown character category ${c.CHARACTER_CATEGORY_ID.unknown}`);
      return CHARACTER_TYPES[c.CHARACTER_CATEGORY_ID];
    },
    playRoleOf: (c) => {
      const role = battleOf(c)?.BTL_PLAY_TYPE_ID;
      return role === undefined ? null : BATTLE_ROLES[role];
    },
    baseStat: (c, stat) => Number(archetype.get(c.PARA_ARCHETYPE_ID)?.[archetypeKey(stat)] ?? 0),
    growthOf: (c) => {
      const g = growtype.get(c.PARA_GROWTYPE_ID);
      if (!g) return null;
      return Object.fromEntries(
        allStats.map((stat) => [stat, { min: Number(g[growMinKey(stat)]), max: Number(g[growMaxKey(stat)]) }]),
      ) as Record<Stat, StatGrowth>;
    },
    skillsOf: (c) => ({
      learned: c.skills.filter((s) => s.id !== NO_SKILL).map((s) => ({ name: skillName(s.id), level: Number(s.level) })),
      eventSkill:
        c.CHARACTER_SKILL5_ID === NO_SKILL ? null : { name: skillName(c.CHARACTER_SKILL5_ID), eventId: c.CHARACTER_SKILL5_LEARNING_EVENT },
    }),
    aptitudesOf: (c) => c.aptitudeIds.filter((a) => a !== NO_APTITUDE).map((a) => aptitude.get(a) ?? a),
    sourceGame: (c) => product.get(c.PRODUCT_ID) ?? '',
    joinConditionOf: (c) => joinCondition.get(c.CHARACTER_APP_CON_ID),
    elementDef: (c, element) => {
      const b = battleOf(c);
      return b ? Number(b.elementDefs[BATTLE_ELEMENTS.indexOf(element)]) : null;
    },
    dropsOf: (b) => b.drops.filter((d) => d.id && d.id !== NO_DROP),
  };
}
