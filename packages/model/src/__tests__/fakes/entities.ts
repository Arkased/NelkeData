import { CharacterType, Difficulty, Element, ItemCategoryName, Stat } from '../../enums.js';
import type { DirectData } from '../../inverse.js';

type Overrides<T> = Partial<T> & { id: string };

const STATS = Object.values(Stat);
const zeroStats = Object.fromEntries(STATS.map((stat) => [stat, 0])) as Record<Stat, number>;

/**
 * Makes an item with the game side of its links empty.
 *
 * @param o - the fields to set; the ID is required
 * @returns the item
 * @sideEffects none
 */
export function fakeItem(o: Overrides<DirectData['items'][number]>): DirectData['items'][number] {
  return {
    slug: `item-${o.id}`,
    name: `Item ${o.id}`,
    nameJp: null,
    icon: null,
    category: ItemCategoryName.Material,
    subCategory: null,
    rank: 1,
    price: 10,
    baseSales: 1,
    shops: [],
    reduce: { [Element.Fire]: 0, [Element.Water]: 0, [Element.Wind]: 0, [Element.Earth]: 0 },
    growingArea: null,
    baseYield: null,
    description: null,
    ...o,
  };
}

/**
 * Makes a recipe with no material.
 *
 * @param o - the fields to set; the ID is required
 * @returns the recipe
 * @sideEffects none
 */
export function fakeRecipe(o: Overrides<DirectData['recipes'][number]>): DirectData['recipes'][number] {
  return {
    resultItemId: 'i1',
    materials: [],
    synthesisCost: 1,
    synthesisLevel: 1,
    inputCost: 0,
    addedValue: null,
    addedValuePerCost: null,
    unpricedItemIds: [],
    ...o,
  };
}

/**
 * Makes a recipe set with no recipe and no teacher.
 *
 * @param o - the fields to set; the ID is required
 * @returns the recipe set
 * @sideEffects none
 */
export function fakeRecipeSet(o: Overrides<DirectData['recipeSets'][number]>): DirectData['recipeSets'][number] {
  return { name: `Set ${o.id}`, recipeIds: [], teacherId: null, friendship: null, unlockEvent: null, ...o };
}

/**
 * Makes a research with no link.
 *
 * @param o - the fields to set; the ID is required
 * @returns the research
 * @sideEffects none
 */
export function fakeResearch(o: Overrides<DirectData['research'][number]>): DirectData['research'][number] {
  return {
    slug: `research-${o.id}`,
    name: `Research ${o.id}`,
    researcherId: null,
    prerequisiteIds: [],
    district: null,
    recipeSetId: null,
    ...o,
  };
}

/**
 * Makes a zone with no area.
 *
 * @param o - the fields to set; the ID is required
 * @returns the zone
 * @sideEffects none
 */
export function fakeZone(o: Overrides<DirectData['zones'][number]>): DirectData['zones'][number] {
  return {
    slug: `zone-${o.id}`,
    name: `Zone ${o.id}`,
    task: null,
    difficulties: [Difficulty.S, Difficulty.A, Difficulty.B, Difficulty.C, Difficulty.D],
    areaIds: [],
    elements: [],
    specialItems: [],
    ...o,
  };
}

/**
 * Makes an area with no gather item and no monster.
 *
 * @param o - the fields to set; the ID is required
 * @returns the area
 * @sideEffects none
 */
export function fakeArea(o: Overrides<DirectData['areas'][number]>): DirectData['areas'][number] {
  return { slug: `area-${o.id}`, name: `Area ${o.id}`, route: 1, gather: [], monsters: [], ...o };
}

/**
 * Makes a monster with no drop.
 *
 * @param o - the fields to set; the ID is required
 * @returns the monster
 * @sideEffects none
 */
export function fakeMonster(o: Overrides<DirectData['monsters'][number]>): DirectData['monsters'][number] {
  return {
    slug: `monster-${o.id}`,
    name: `Monster ${o.id}`,
    nameJp: null,
    icon: null,
    type: CharacterType.Monster,
    rank: null,
    wage: 0,
    stats: zeroStats,
    growth: null,
    elementDef: null,
    exp: null,
    description: null,
    drops: [],
    zoneEncounters: [],
    ...o,
  };
}

/**
 * Makes a character with no skill and no join condition.
 *
 * @param o - the fields to set; the ID is required
 * @returns the character
 * @sideEffects none
 */
export function fakeCharacter(o: Overrides<DirectData['characters'][number]>): DirectData['characters'][number] {
  return {
    slug: `character-${o.id}`,
    name: `Character ${o.id}`,
    nameJp: null,
    icon: null,
    type: CharacterType.Townsfolk,
    sourceGame: null,
    rank: null,
    aptitudes: [],
    stats: zeroStats,
    growth: null,
    skills: [],
    eventSkill: null,
    battleRole: null,
    friendshipStart: 0,
    friendshipMax: 0,
    join: null,
    description: null,
    ...o,
  };
}

/**
 * Makes an empty set of entities.
 *
 * @param o - the kinds to set
 * @returns the entities
 * @sideEffects none
 */
export function fakeDirectData(o: Partial<DirectData>): DirectData {
  return { items: [], recipes: [], recipeSets: [], research: [], zones: [], areas: [], monsters: [], characters: [], ...o };
}
