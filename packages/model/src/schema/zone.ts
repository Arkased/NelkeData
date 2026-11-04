import { z } from 'zod';
import { Difficulty } from '../enums.js';
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
  /** The items of the special spots. */
  specialItemIds: z.array(idSchema),
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
