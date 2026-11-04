import { z } from 'zod';
import { characterSchema } from './character.js';
import { itemSchema } from './item.js';
import { monsterSchema } from './monster.js';
import { recipeSchema, recipeSetSchema } from './recipe.js';
import { researchSchema } from './research.js';
import { areaSchema, zoneSchema } from './zone.js';

export { characterSchema, type Character } from './character.js';
export { idSchema, slugSchema, storyEventSchema, type StoryEvent } from './common.js';
export { itemSchema, type Item } from './item.js';
export { monsterSchema, type Monster } from './monster.js';
export { recipeSchema, recipeSetSchema, type Recipe, type RecipeSet } from './recipe.js';
export { researchSchema, type Research } from './research.js';
export { areaSchema, zoneSchema, type Area, type Zone } from './zone.js';

/** The schema of all the entities of the model: 1 array for each kind. */
export const modelSchema = z.strictObject({
  items: z.array(itemSchema),
  recipes: z.array(recipeSchema),
  recipeSets: z.array(recipeSetSchema),
  research: z.array(researchSchema),
  zones: z.array(zoneSchema),
  areas: z.array(areaSchema),
  monsters: z.array(monsterSchema),
  characters: z.array(characterSchema),
});

/** All the entities of the model. */
export type ModelData = z.infer<typeof modelSchema>;

/** The file of each kind of entity in the data folder. */
export const DATA_FILES: Record<keyof ModelData, string> = {
  items: 'items.json',
  recipes: 'recipes.json',
  recipeSets: 'recipe-sets.json',
  research: 'research.json',
  zones: 'zones.json',
  areas: 'areas.json',
  monsters: 'monsters.json',
  characters: 'characters.json',
};

/** The folder of the icons in the data folder. */
export const ICON_DIR = 'icons';
