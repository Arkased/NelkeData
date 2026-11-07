import { z } from 'zod';
import { Stat } from '../enums.js';

/** The ID of an entity: the value that the other game tables use to refer to its row. It is unique in its kind. */
export const idSchema = z.string().min(1);

/** The URL slug of an entity. */
export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** A story event of the game. The event has no name in the game files, so the label is made by the rule of docs/technical/model.md, section "Event label". */
export const storyEventSchema = z.strictObject({ id: z.string(), label: z.string() });

/** A story event. */
export type StoryEvent = z.infer<typeof storyEventSchema>;

/** A number for each stat. */
export const statValuesSchema = z.record(z.enum(Stat), z.number());

/** The minimum and the maximum gain of each stat for each level. */
export const statGrowthSchema = z.record(z.enum(Stat), z.strictObject({ min: z.number(), max: z.number() }));

/** The levels at which a monster appears in an area. It is the same shape on both sides of the link. */
export const appearanceShape = {
  levels: z.array(z.int()),
  /** The lowest area level from which the monster appears. */
  areaLevel: z.int(),
  boss: z.boolean(),
};
