import { z } from 'zod';
import { Element, ItemCategoryName, Shop } from '../enums.js';
import { idSchema, slugSchema } from './common.js';

/** The schema of an item. */
export const itemSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: z.string(),
  nameJp: z.string().nullable(),
  /** A file name in data/icons/128/ and in data/icons/64/. */
  icon: z.string().nullable(),
  /** The English name of the category. */
  category: z.enum(ItemCategoryName),
  /** The English name of the sub-category. */
  subCategory: z.string().nullable(),
  rank: z.number(),
  price: z.number(),
  baseSales: z.number(),
  shops: z.array(z.enum(Shop)),
  /** The elements that the Reduce command gives for 1 of the item. */
  reduce: z.record(z.enum(Element), z.number()),
  /** The English name of the growing area (farm) type. */
  growingArea: z.string().nullable(),
  baseYield: z.number().nullable(),
  description: z.string().nullable(),
  /** The recipe that makes the item (the inverse of Recipe.resultItemId). */
  recipeId: idSchema.nullable(),
  /** The recipes that use the item as a material (the inverse of Recipe.materials). */
  usedInRecipeIds: z.array(idSchema),
  /** The areas where the item is gathered (the inverse of Area.gather). */
  gather: z.array(z.strictObject({ areaId: idSchema, rate: z.number() })),
  /** The zones that have the item at a special spot (the inverse of Zone.specialItemIds). */
  specialZoneIds: z.array(idSchema),
  /** The monsters that drop the item (the inverse of Monster.drops). */
  drops: z.array(z.strictObject({ monsterId: idSchema, quantity: z.number(), rate: z.number() })),
});

/** An item. */
export type Item = z.infer<typeof itemSchema>;
