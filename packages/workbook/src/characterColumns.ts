import { Element, Stat, type Character, type Monster } from '@nelke/model';
import { range } from './format.js';
import { required, type Lookup } from './lookup.js';
import { iconColumn, type Column } from './sheet.js';

const ELEMENTS: readonly Element[] = [Element.Fire, Element.Water, Element.Wind, Element.Earth];

/** The stats, in column order, with the English status names of the game. */
const STATS: readonly [Stat, string][] = [
  [Stat.Hp, 'HP'],
  [Stat.Str, 'STR'],
  [Stat.Vit, 'CON'],
  [Stat.Int, 'INT'],
  [Stat.Dex, 'DEX'],
  [Stat.Luck, 'LUC'],
  [Stat.Agi, 'AGI'],
  [Stat.Chr, 'CHM'],
];

function growthText(c: Character | Monster): string {
  if (c.growth === null) return '';
  const { growth } = c;
  return STATS.map(([stat, label]) => ({ label, ...growth[stat] }))
    .filter(({ max }) => max > 0)
    .map(({ label, min, max }) => `${label} ${min === max ? min : `${min}-${max}`}`)
    .join(', ');
}

function foundIn(m: Monster, lookup: Lookup): string {
  const levelsByZone = new Map<string, number[]>();
  const add = (zoneId: string, newLevels: readonly number[]): void => {
    const name = required(lookup.zones, zoneId).name;
    const levels = levelsByZone.get(name) ?? [];
    levels.push(...newLevels);
    levelsByZone.set(name, levels);
  };
  for (const a of m.areas) add(required(lookup.areas, a.areaId).zoneId, a.levels);
  for (const e of m.zoneEncounters) add(e.zoneId, e.levels);
  return [...levelsByZone].map(([zone, levels]) => `${zone} (Lv ${range(levels)})`).join(', ');
}

/**
 * Builds the columns of the Monsters sheet.
 * @param lookup - the entities by ID
 * @returns the columns
 * @sideEffects none
 */
export function monsterColumns(lookup: Lookup): Column<Monster>[] {
  return [
    iconColumn((m) => m.icon ?? ''),
    { header: 'Name', width: 22, get: (m) => m.name },
    { header: 'Name (JP)', width: 16, get: (m) => m.nameJp ?? '' },
    { header: 'Type', width: 9, get: (m) => m.type },
    { header: 'Rank', width: 6, get: (m) => m.rank ?? -1 },
    { header: 'Wage', width: 7, get: (m) => m.wage },
    ...STATS.map(([stat, label]): Column<Monster> => ({ header: label, width: 6, get: (m) => m.stats[stat] })),
    { header: 'Growth / Lv', width: 40, get: growthText },
    ...ELEMENTS.map((e): Column<Monster> => ({ header: `${e} DEF`, width: 7, get: (m) => m.elementDef?.[e] ?? '' })),
    { header: 'EXP', width: 6, get: (m) => m.exp ?? '' },
    {
      header: 'Drops',
      width: 36,
      get: (m) => m.drops.map((d) => `${required(lookup.items, d.itemId).name} x${d.quantity} (${d.rate}%)`).join(', '),
    },
    { header: 'Found In', width: 40, get: (m) => foundIn(m, lookup) },
    { header: 'Description', width: 80, get: (m) => m.description ?? '' },
  ];
}

/**
 * Builds the columns of the Characters sheet.
 * @param lookup - the entities by ID
 * @returns the columns
 * @sideEffects none
 */
export function characterColumns(lookup: Lookup): Column<Character>[] {
  return [
    iconColumn((c) => c.icon ?? ''),
    { header: 'Name', width: 22, get: (c) => c.name },
    { header: 'Name (JP)', width: 16, get: (c) => c.nameJp ?? '' },
    { header: 'Type', width: 11, get: (c) => c.type },
    { header: 'Source Game', width: 36, get: (c) => c.sourceGame ?? '' },
    { header: 'Rank', width: 6, get: (c) => c.rank ?? '' },
    { header: 'Aptitudes', width: 26, get: (c) => c.aptitudes.join(', ') },
    // CHM is 1 for every character, and the element DEF values are the same for every character.
    ...STATS.filter(([stat]) => stat !== Stat.Chr).map(([stat, label]): Column<Character> => ({
      header: label,
      width: 6,
      get: (c) => c.stats[stat],
    })),
    { header: 'Growth / Lv', width: 40, get: growthText },
    {
      header: 'Skills',
      width: 50,
      get: (c) => {
        const learned = c.skills.toSorted((a, b) => a.level - b.level).map((s) => `${s.name} (Lv ${s.level})`);
        if (c.eventSkill) learned.push(`${c.eventSkill.name} (${c.eventSkill.event?.label ?? ''})`);
        return learned.join(', ');
      },
    },
    { header: 'Battle Role', width: 10, get: (c) => c.battleRole ?? '' },
    { header: 'Friendship Start', width: 9, get: (c) => c.friendshipStart },
    { header: 'Friendship Max', width: 9, get: (c) => c.friendshipMax },
    { header: 'Join Event', width: 30, get: (c) => c.join?.event?.label ?? '' },
    { header: 'Join Population', width: 10, get: (c) => c.join?.population ?? 0 },
    { header: 'Join Turn', width: 7, get: (c) => c.join?.turn ?? 0 },
    {
      header: 'Recipe Sets Taught',
      width: 50,
      get: (c) =>
        c.recipeSetIds
          .map((id) => required(lookup.recipeSets, id))
          .filter((set) => set.name !== null)
          .map((set) => `${set.name ?? ''} (FRD ${set.friendship ?? ''})`)
          .join(', '),
    },
    { header: 'Description', width: 80, get: (c) => c.description ?? '' },
  ];
}
