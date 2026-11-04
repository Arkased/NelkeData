import { z } from 'zod';
import { CharacterType, Element } from '../enums.js';
import { appearanceShape, idSchema, slugSchema, statGrowthSchema, statValuesSchema } from './common.js';

/** The schema of a monster. The type is Monster or Boss. */
export const monsterSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: z.string(),
  nameJp: z.string().nullable(),
  /** A file name in data/icons/. */
  icon: z.string().nullable(),
  type: z.enum([CharacterType.Monster, CharacterType.Boss]),
  rank: z.number().nullable(),
  /** The hire cost. */
  wage: z.number(),
  stats: statValuesSchema,
  /** The gain of each stat for each level; null when the game has no growth type for the monster. */
  growth: statGrowthSchema.nullable(),
  /** The defense against each element; null when the monster has no battle data. */
  elementDef: z.record(z.enum(Element), z.number()).nullable(),
  /** The experience points of a battle; null when the monster has no battle data. */
  exp: z.number().nullable(),
  description: z.string().nullable(),
  drops: z.array(z.strictObject({ itemId: idSchema, quantity: z.number(), rate: z.number() })),
  /** The areas where the monster appears (the inverse of Area.monsters). */
  areas: z.array(z.strictObject({ areaId: idSchema, ...appearanceShape })),
  /** The levels at which the monster appears in a zone through an encounter that no area lists. */
  zoneEncounters: z.array(z.strictObject({ zoneId: idSchema, levels: z.array(z.int()), boss: z.boolean() })),
});

/** A monster. */
export type Monster = z.infer<typeof monsterSchema>;
