import { z } from 'zod';
import { BattleRole, CharacterType } from '../enums.js';
import { idSchema, slugSchema, statGrowthSchema, statValuesSchema, storyEventSchema } from './common.js';

/** The schema of a character: every character of the game that is not a monster. */
export const characterSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: z.string(),
  nameJp: z.string().nullable(),
  /** A file name in data/icons/. */
  icon: z.string().nullable(),
  type: z.enum([CharacterType.Main, CharacterType.Alchemist, CharacterType.Townsfolk, CharacterType.Story, CharacterType.Fairy]),
  /** The English name of the game that the character comes from. */
  sourceGame: z.string().nullable(),
  rank: z.number().nullable(),
  /** The English names of the preparation aptitudes. */
  aptitudes: z.array(z.string()),
  stats: statValuesSchema,
  /** The gain of each stat for each level; null when the game has no growth type for the character. */
  growth: statGrowthSchema.nullable(),
  /** The skills that the character learns at a level, in slot order. */
  skills: z.array(z.strictObject({ name: z.string(), level: z.number() })),
  /** The skill that the character learns at a story event. */
  eventSkill: z.strictObject({ name: z.string(), event: storyEventSchema.nullable() }).nullable(),
  battleRole: z.enum(BattleRole).nullable(),
  friendshipStart: z.number(),
  friendshipMax: z.number(),
  /** How the character joins the town; null when the game has no join condition for the character. */
  join: z.strictObject({ event: storyEventSchema.nullable(), population: z.number(), turn: z.number() }).nullable(),
  description: z.string().nullable(),
  /** The recipe sets that the character teaches (the inverse of RecipeSet.teacherId). */
  recipeSetIds: z.array(idSchema),
});

/** A character. */
export type Character = z.infer<typeof characterSchema>;
