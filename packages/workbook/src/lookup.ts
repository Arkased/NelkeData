import type { Area, Character, Item, ModelData, Monster, Recipe, RecipeSet, Research, Zone } from '@nelke/model';

/** The entities of the model by ID, for the cells that follow a link. */
export interface Lookup {
  items: ReadonlyMap<string, Item>;
  recipes: ReadonlyMap<string, Recipe>;
  recipeSets: ReadonlyMap<string, RecipeSet>;
  research: ReadonlyMap<string, Research>;
  zones: ReadonlyMap<string, Zone>;
  areas: ReadonlyMap<string, Area>;
  monsters: ReadonlyMap<string, Monster>;
  characters: ReadonlyMap<string, Character>;
}

function index<T extends { id: string }>(rows: readonly T[]): ReadonlyMap<string, T> {
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
export function required<T>(map: ReadonlyMap<string, T>, id: string): T {
  const entity = map.get(id);
  if (entity === undefined) throw new Error(`no entity with ID ${id}`);
  return entity;
}
