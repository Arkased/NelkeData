import { z } from 'zod';
import { Difficulty, Element, GatherKind } from '../enums.js';
import { appearanceShape, idSchema, slugSchema } from './common.js';

/** The schema of a zone: a top-level exploration area. */
export const zoneSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: z.string(),
  /** The main task that opens the zone; null when the zone is open from the start. */
  task: z.strictObject({ number: z.int(), name: z.string() }).nullable(),
  /** The difficulty rank at the area level 1 to 5. */
  difficulties: z.array(z.enum(Difficulty)),
  areaIds: z.array(idSchema),
  /** The elements of the zone. */
  elements: z.array(z.enum(Element)),
  /** The rare finds: an item of the table of a chest or a gather point, with the number of the chest or the spot in the zone (from 1) and the percent rate. */
  specialItems: z.array(z.strictObject({ itemId: idSchema, kind: z.enum(GatherKind), spot: z.int(), rate: z.number() })),
  /** The monsters that appear in the zone through an encounter that no area lists (the inverse of Monster.zoneEncounters). */
  encounters: z.array(z.strictObject({ monsterId: idSchema, levels: z.array(z.int()), boss: z.boolean() })),
});

/** A zone. */
export type Zone = z.infer<typeof zoneSchema>;

/** The schema of an area: a spot inside a zone. */
export const areaSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: z.string(),
  /** The route number of the spot in its zone. */
  route: z.int(),
  /** The zone of the area (the inverse of Zone.areaIds). */
  zoneId: idSchema,
  gather: z.array(z.strictObject({ itemId: idSchema, rate: z.number() })),
  monsters: z.array(z.strictObject({ monsterId: idSchema, ...appearanceShape })),
});

/** An area. */
export type Area = z.infer<typeof areaSchema>;
