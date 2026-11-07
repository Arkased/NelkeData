import { z } from 'zod';
import { idSchema, storyEventSchema } from './common.js';

/** The schema of a recipe. */
export const recipeSchema = z.strictObject({
  id: idSchema,
  resultItemId: idSchema,
  materials: z.array(z.strictObject({ itemId: idSchema, quantity: z.number() })),
  synthesisCost: z.number(),
  /** The minimum alchemy level: the rank of the result item divided by 4, rounded down, at least 1. */
  synthesisLevel: z.int().min(1),
  /** The synthesis cost plus, for each material that a recipe makes, its quantity times its cumulative synthesis cost. */
  cumulativeSynthesisCost: z.int(),
  /** The price of the result divided by the cumulative synthesis cost, not rounded; null when the price is 0. */
  valuePerCumulativeSynthesisCost: z.number().nullable(),
  /** The recipe sets that hold the recipe (the inverse of RecipeSet.recipeIds), the first one first. */
  recipeSetIds: z.array(idSchema),
});

/** A recipe. */
export type Recipe = z.infer<typeof recipeSchema>;

/** The schema of a recipe set. */
export const recipeSetSchema = z.strictObject({
  id: idSchema,
  name: z.string(),
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
