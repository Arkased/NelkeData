import { z } from 'zod';
import { idSchema, storyEventSchema } from './common.js';

/** The schema of a recipe. */
export const recipeSchema = z.strictObject({
  id: idSchema,
  resultItemId: idSchema,
  materials: z.array(z.strictObject({ itemId: idSchema, quantity: z.number() })),
  synthesisCost: z.number(),
  /** The price of the materials. */
  inputCost: z.number(),
  /** The price of the result minus the input cost; null when the result has no price. */
  addedValue: z.number().nullable(),
  /** The added value for each point of synthesis cost; null when there is no added value or the synthesis cost is 0. */
  addedValuePerCost: z.number().nullable(),
  /** The materials that have no price and are not elements. */
  unpricedItemIds: z.array(idSchema),
  /** The recipe sets that hold the recipe (the inverse of RecipeSet.recipeIds), the first one first. */
  recipeSetIds: z.array(idSchema),
});

/** A recipe. */
export type Recipe = z.infer<typeof recipeSchema>;

/** The schema of a recipe set. */
export const recipeSetSchema = z.strictObject({
  id: idSchema,
  /** The English name; null when the game has a placeholder name. */
  name: z.string().nullable(),
  recipeIds: z.array(idSchema),
  teacherId: idSchema.nullable(),
  /** The friendship level with the teacher; null when the set has no teacher. */
  friendship: z.number().nullable(),
  unlockEvent: storyEventSchema.nullable(),
  /** The research that gives the set (the inverse of Research.recipeSetId). */
  researchId: idSchema.nullable(),
});

/** A recipe set. */
export type RecipeSet = z.infer<typeof recipeSetSchema>;
