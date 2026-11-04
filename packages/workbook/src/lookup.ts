import {
  required,
  type Area,
  type Character,
  type Item,
  type ModelData,
  type Monster,
  type Recipe,
  type RecipeSet,
  type Research,
  type Zone,
} from '@nelke/model';

/** The entities of the model by ID, for the cells that follow a link. */
export interface Lookup {
  items: ReadonlyMap<number, Item>;
  recipes: ReadonlyMap<number, Recipe>;
  recipeSets: ReadonlyMap<number, RecipeSet>;
  research: ReadonlyMap<number, Research>;
  zones: ReadonlyMap<number, Zone>;
  areas: ReadonlyMap<number, Area>;
  monsters: ReadonlyMap<number, Monster>;
  characters: ReadonlyMap<number, Character>;
}

function index<T extends { id: number }>(rows: readonly T[]): ReadonlyMap<number, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * Indexes the entities of the model by ID.
 * @param data - the entities
 * @returns the lookup
 * @sideEffects none
 */
export function createLookup(data: ModelData): Lookup {
  return {
    items: index(data.items),
    recipes: index(data.recipes),
    recipeSets: index(data.recipeSets),
    research: index(data.research),
    zones: index(data.zones),
    areas: index(data.areas),
    monsters: index(data.monsters),
    characters: index(data.characters),
  };
}

/**
 * Gets the entity of an ID that a link names.
 * @param map - the entities of 1 kind by ID
 * @param id - the ID
 * @returns the entity
 * @throws {Error} when no entity has the ID
 * @sideEffects none
 */
export function pick<T>(map: ReadonlyMap<number, T>, id: number): T {
  return required(map, id);
}

/**
 * Formats a list of numbers as the lowest and the highest number.
 * @param nums - the numbers
 * @returns "5" for 1 value, "3-7" for a range
 * @sideEffects none
 */
export function range(nums: readonly number[]): string {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${nums[0] ?? ''}` : `${min}-${max}`;
}

/**
 * Formats the condition that opens a zone.
 * @param zone - the zone
 * @returns "After Task N: name", or "Start" for a zone that is open from the start
 * @sideEffects none
 */
export function opensText(zone: Zone): string {
  return zone.task ? `After Task ${zone.task.number}: ${zone.task.name}` : 'Start';
}
