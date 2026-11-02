import { z } from 'zod';
import { CharacterCategory, Element, PlayType, Stat } from './enums.js';
import type { Story } from './story.js';
import { isPlaceholder, listFor } from './util.js';
import { stringShape, type ReadTable } from './xml.js';

const NO_SKILL = 'SKILL_INVALID';
const NO_APTITUDE = 'PREPARATION_APTITUDE_INVALID';
const NO_DROP = 'ITEM_NONE';

/** The stats, in column order, with the English status names of the game. */
export const STATS: readonly [Stat, string][] = [
  [Stat.Hp, 'HP'],
  [Stat.Str, 'STR'],
  [Stat.Vit, 'CON'],
  [Stat.Int, 'INT'],
  [Stat.Dex, 'DEX'],
  [Stat.Luck, 'LUC'],
  [Stat.Agi, 'AGI'],
  [Stat.Chr, 'CHM'],
];

/** The elements of btl_chara element_1..4, in order. element_0 is "no element" and is always 0. */
export const ELEMENTS: readonly Element[] = [Element.Fire, Element.Water, Element.Wind, Element.Earth];

const CHARACTER_TYPES = new Map<string, string>([
  [CharacterCategory.MainA, 'Main'],
  [CharacterCategory.MainB, 'Main'],
  [CharacterCategory.Alchemist, 'Alchemist'],
  [CharacterCategory.Townsfolk, 'Townsfolk'],
  [CharacterCategory.Story, 'Story'],
  [CharacterCategory.Fairy, 'Fairy'],
  [CharacterCategory.Monster, 'Monster'],
  [CharacterCategory.Boss, 'Boss'],
]);

const PLAY_TYPE_NAMES = new Map<string, string>([
  [PlayType.Attacker, 'Attacker'],
  [PlayType.Supporter, 'Supporter'],
]);

const MONSTER_CATEGORIES: readonly string[] = [CharacterCategory.Monster, CharacterCategory.Boss];

const characterSchema = z
  .object({
    CHARACTER_ID: z.string(),
    CHARACTER_NAME_LABEL_ID: z.string(),
    CHARACTER_CATEGORY_ID: z.string(),
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
    BTL_PLAY_TYPE_ID: text,
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

/** The characters and monsters of the game with their battle data. */
export interface Characters {
  /** The characters and monsters that have a name. */
  characters: Character[];
  /** Maps a character id to its English name. */
  characterName: Map<string, string>;
  isMonster: (c: Character) => boolean;
  battleOf: (c: Character) => Battle | undefined;
  /** Returns the name of the character of a battle character id, or the id itself when unknown. */
  nameOfBattleId: (id: string) => string;
  typeOf: (c: Character) => string;
  playRoleOf: (c: Character) => string;
  baseStat: (c: Character, stat: Stat) => number;
  growthText: (c: Character) => string;
  skillsText: (c: Character) => string;
  aptitudesText: (c: Character) => string;
  sourceGame: (c: Character) => string;
  joinConditionOf: (c: Character) => JoinCondition | undefined;
  /** Returns the defense of a monster against an element, or '' when it has no battle data. */
  elementDef: (c: Character, element: Element) => number | '';
  dropsOf: (b: Battle) => Drop[];
  /** Maps an item id to the monsters that drop it, as text. */
  droppedBy: Map<string, string[]>;
}

/**
 * Loads the characters, the monsters and their battle data.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @param eventLabel - the label of a story event
 * @returns the characters and the lookups
 * @sideEffects reads the character and battle tables through the table reader
 */
export function loadCharacters(read: ReadTable, t: (label: string) => string, eventLabel: Story['eventLabel']): Characters {
  const characters = read('character/character.xml', characterSchema).filter((c) => !isPlaceholder(t(c.CHARACTER_NAME_LABEL_ID)));
  const characterName = new Map(characters.map((c) => [c.CHARACTER_ID, t(c.CHARACTER_NAME_LABEL_ID)]));
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

  const isMonster = (c: Character): boolean => MONSTER_CATEGORIES.includes(c.CHARACTER_CATEGORY_ID);
  const battleOf = (c: Character): Battle | undefined => battleById.get(c.BTL_CHARACTER_ID);
  const dropsOf = (b: Battle): Drop[] => b.drops.filter((d) => d.id && d.id !== NO_DROP);
  const skillName = (id: string): string => skill.get(id) ?? '';

  const droppedBy = new Map<string, string[]>();
  for (const c of characters.filter(isMonster)) {
    const battle = battleOf(c);
    if (!battle) continue;
    for (const d of dropsOf(battle)) listFor(droppedBy, d.id).push(`${characterName.get(c.CHARACTER_ID) ?? ''} x${d.num} (${d.rate}%)`);
  }

  return {
    characters,
    characterName,
    isMonster,
    battleOf,
    nameOfBattleId: (id) => characterName.get(battleById.get(id)?.CHARACTER_ID ?? '') ?? id,
    typeOf: (c) => CHARACTER_TYPES.get(c.CHARACTER_CATEGORY_ID) ?? `Category ${c.CHARACTER_CATEGORY_ID}`,
    playRoleOf: (c) => PLAY_TYPE_NAMES.get(battleOf(c)?.BTL_PLAY_TYPE_ID ?? '') ?? '',
    baseStat: (c, stat) => Number(archetype.get(c.PARA_ARCHETYPE_ID)?.[archetypeKey(stat)] ?? 0),
    growthText: (c) => {
      const g = growtype.get(c.PARA_GROWTYPE_ID);
      if (!g) return '';
      return STATS.map(([stat, label]) => ({ label, min: Number(g[growMinKey(stat)]), max: Number(g[growMaxKey(stat)]) }))
        .filter(({ max }) => max > 0)
        .map(({ label, min, max }) => `${label} ${min === max ? min : `${min}-${max}`}`)
        .join(', ');
    },
    skillsText: (c) => {
      const list = c.skills
        .filter((s) => s.id !== NO_SKILL)
        .sort((a, b) => Number(a.level) - Number(b.level))
        .map((s) => `${skillName(s.id)} (Lv ${s.level})`);
      if (c.CHARACTER_SKILL5_ID !== NO_SKILL)
        list.push(`${skillName(c.CHARACTER_SKILL5_ID)} (${eventLabel(c.CHARACTER_SKILL5_LEARNING_EVENT)})`);
      return list.join(', ');
    },
    aptitudesText: (c) =>
      c.aptitudeIds
        .filter((a) => a !== NO_APTITUDE)
        .map((a) => aptitude.get(a) ?? a)
        .join(', '),
    sourceGame: (c) => product.get(c.PRODUCT_ID) ?? '',
    joinConditionOf: (c) => joinCondition.get(c.CHARACTER_APP_CON_ID),
    elementDef: (c, element) => {
      const b = battleOf(c);
      return b ? Number(b.elementDefs[ELEMENTS.indexOf(element)]) : '';
    },
    dropsOf,
    droppedBy,
  };
}
