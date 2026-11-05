import { z } from 'zod';
import { idSchema, slugSchema } from './common.js';

/** The schema of a research. */
export const researchSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: z.string(),
  /** The character that does the research. */
  researcherId: idSchema.nullable(),
  /** The researches that must be done first. */
  prerequisiteIds: z.array(idSchema),
  /** The name of the commercial district that must be open. */
  district: z.string().nullable(),
  /** The recipe set that the research gives. */
  recipeSetId: idSchema.nullable(),
  /** The researches that need this research (the inverse of prerequisiteIds). */
  unlocksIds: z.array(idSchema),
});

/** A research. */
export type Research = z.infer<typeof researchSchema>;
