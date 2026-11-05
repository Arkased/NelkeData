import path from 'node:path';
import { readData, type ModelData } from '@nelke/model';

/** The `data/` folder of the repo, from the package folder where the build runs. */
const DATA_DIR = path.resolve(process.cwd(), '..', '..', 'data');

/** The entities of `data/`, read 1 time for each build. */
export const data: ModelData = readData(DATA_DIR);

/**
 * Makes a lookup of the entities of 1 kind by their ID.
 * @param rows - the entities
 * @returns a map from the ID to the entity
 * @sideEffects none
 */
function byId<T extends { id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

/** The items by ID. */
export const itemById = byId(data.items);
/** The recipes by ID. */
export const recipeById = byId(data.recipes);
/** The recipe sets by ID. */
export const recipeSetById = byId(data.recipeSets);
/** The research by ID. */
export const researchById = byId(data.research);
/** The zones by ID. */
export const zoneById = byId(data.zones);
/** The areas by ID. */
export const areaById = byId(data.areas);
/** The monsters by ID. */
export const monsterById = byId(data.monsters);
/** The characters by ID. */
export const characterById = byId(data.characters);
