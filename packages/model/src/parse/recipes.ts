import { z } from 'zod';
import { isPlaceholder } from '../util.js';
import type { Items } from './items.js';
import { withRowIds, type ReadTable, type RowId } from './xml.js';

const NO_MATERIAL = 'ITEM_INVALID';
const NO_RECIPE = 'RECIPE_INVALID';
const NO_COLLECTION = 'RECIPE_COLLECTION_INVALID';
const NO_RESEARCH = 'STDY_RES_INVALID';
const NO_DISTRICT = 'COMMERCIAL_DISTRICT_INVALID';

const recipeSchema = z
  .object({
    RECIPE_ID: z.string(),
    RECIPE_NAME_LABEL_ID: z.string(),
    ITEM_COMPLETION_ID: z.string(),
    ITEM_COMP_MH: z.string(),
    ITEM_MATERIAL1_ID: z.string(),
    ITEM_MATERIAL1_NUM: z.string(),
    ITEM_MATERIAL2_ID: z.string(),
    ITEM_MATERIAL2_NUM: z.string(),
    ITEM_MATERIAL3_ID: z.string(),
    ITEM_MATERIAL3_NUM: z.string(),
    ITEM_MATERIAL4_ID: z.string(),
    ITEM_MATERIAL4_NUM: z.string(),
  })
  .transform((r) => ({
    ...r,
    /** The 4 material slots in order, empty slots included. */
    slots: [
      { id: r.ITEM_MATERIAL1_ID, num: Number(r.ITEM_MATERIAL1_NUM) },
      { id: r.ITEM_MATERIAL2_ID, num: Number(r.ITEM_MATERIAL2_NUM) },
      { id: r.ITEM_MATERIAL3_ID, num: Number(r.ITEM_MATERIAL3_NUM) },
      { id: r.ITEM_MATERIAL4_ID, num: Number(r.ITEM_MATERIAL4_NUM) },
    ],
  }));

const collectionSchema = z
  .object({
    RECIPE_COLLECTION_ID: z.string(),
    RECIPE_COLLECTION_NAME_LABEL_ID: z.string(),
    CHARACTER_ID: z.string(),
    RECIPE_COLLECTION_COMPANION_NUM: z.string(),
    RECIPE_RCONDITION_EVENT: z.string(),
    RECIPE_COLLECTION_RECIPE1_ID: z.string(),
    RECIPE_COLLECTION_RECIPE2_ID: z.string(),
    RECIPE_COLLECTION_RECIPE3_ID: z.string(),
    RECIPE_COLLECTION_RECIPE4_ID: z.string(),
  })
  .transform((c) => ({
    ...c,
    recipeIds: [
      c.RECIPE_COLLECTION_RECIPE1_ID,
      c.RECIPE_COLLECTION_RECIPE2_ID,
      c.RECIPE_COLLECTION_RECIPE3_ID,
      c.RECIPE_COLLECTION_RECIPE4_ID,
    ].filter((id) => id !== NO_RECIPE),
  }));

const prizeSchema = z.object({ STDY_PRIZE_ID: z.string(), STDY_PRIZE_RECIPE_COLLECTION: z.string() });

const researchSchema = z.object({
  STDY_RES_ID: z.string(),
  STDY_PRIZE_TAG: z.string(),
  STDY_RES_NAME_LABEL_ID: z.string(),
  STDY_RES_CHARACTER_TAG_00: z.string(),
  STDY_RES_COND_TAG: z.string(),
});

const conditionSchema = z
  .object({
    STDY_COND_ID: z.string(),
    STDY_COND_RES_TAG_00: z.string(),
    STDY_COND_RES_TAG_01: z.string(),
    STDY_COND_RES_TAG_02: z.string(),
    STDY_COND_RES_TAG_03: z.string(),
    STDY_COMMERCIAL_DISTRICT_ID: z.string(),
  })
  .transform((c) => ({
    ...c,
    researchIds: [c.STDY_COND_RES_TAG_00, c.STDY_COND_RES_TAG_01, c.STDY_COND_RES_TAG_02, c.STDY_COND_RES_TAG_03].filter(
      (id) => id !== NO_RESEARCH,
    ),
  }));

const districtSchema = z.object({ COMMERCIAL_DISTRICT_ID: z.string(), COMMERCIAL_DISTRICT_LABEL_ID: z.string() });

/** A row of recipe.xml. */
export type Recipe = z.output<typeof recipeSchema> & RowId;

/** A row of recipe_collection.xml: a recipe set. The recipe ids leave out the empty slots. */
export type RecipeSetRow = z.output<typeof collectionSchema> & RowId;

/** A row of stdy_research.xml with the conditions that open it. */
export interface ResearchRow extends RowId {
  STDY_RES_ID: string;
  STDY_RES_NAME_LABEL_ID: string;
  STDY_RES_CHARACTER_TAG_00: string;
  /** The id of the recipe set that the research gives, or '' when it gives none. */
  recipeSetId: string;
  /** The ids of the researches that must be done first. */
  prerequisiteIds: string[];
  /** The name of the commercial district that must be open, or null when there is none. */
  district: string | null;
}

/**
 * Tells whether a material slot of a recipe is empty.
 * @param slot - the material slot
 * @returns true for an empty slot
 * @sideEffects none
 */
export function isEmptySlot(slot: Recipe['slots'][number]): boolean {
  return slot.id === NO_MATERIAL;
}

/** The recipes, the recipe sets and the research that unlocks them. */
export interface Recipes {
  /** The recipes that have a name and a known result item. */
  recipes: Recipe[];
  /** All the recipe sets. */
  recipeSets: RecipeSetRow[];
  /** All the research rows. */
  research: ResearchRow[];
}

/**
 * Loads the recipes, the recipe sets and the research.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @param items - the items that the recipes make
 * @returns the recipes, the sets and the research
 * @sideEffects reads the recipe, study and district tables through the table reader
 */
export function loadRecipes(read: ReadTable, t: (label: string) => string, items: Items): Recipes {
  const recipes = withRowIds(read('recipe/recipe.xml', recipeSchema)).filter(
    (r) => !isPlaceholder(t(r.RECIPE_NAME_LABEL_ID)) && items.itemById.has(r.ITEM_COMPLETION_ID),
  );
  const prizeToCollection = new Map(
    read('study/stdy_prize.xml', prizeSchema).map((p) => [p.STDY_PRIZE_ID, p.STDY_PRIZE_RECIPE_COLLECTION]),
  );
  const condition = new Map(read('study/stdy_conditions.xml', conditionSchema).map((c) => [c.STDY_COND_ID, c]));
  const district = new Map(
    read('commercial_district/commercial_district.xml', districtSchema).map((d) => [
      d.COMMERCIAL_DISTRICT_ID,
      t(d.COMMERCIAL_DISTRICT_LABEL_ID),
    ]),
  );
  const research = withRowIds(read('study/stdy_research.xml', researchSchema)).map((r): ResearchRow => {
    const collection = prizeToCollection.get(r.STDY_PRIZE_TAG);
    const cond = condition.get(r.STDY_RES_COND_TAG);
    return {
      rowId: r.rowId,
      STDY_RES_ID: r.STDY_RES_ID,
      STDY_RES_NAME_LABEL_ID: r.STDY_RES_NAME_LABEL_ID,
      STDY_RES_CHARACTER_TAG_00: r.STDY_RES_CHARACTER_TAG_00,
      recipeSetId: collection && collection !== NO_COLLECTION ? collection : '',
      prerequisiteIds: cond?.researchIds ?? [],
      district: cond && cond.STDY_COMMERCIAL_DISTRICT_ID !== NO_DISTRICT ? (district.get(cond.STDY_COMMERCIAL_DISTRICT_ID) ?? '') : null,
    };
  });
  return { recipes, recipeSets: withRowIds(read('recipe/recipe_collection.xml', collectionSchema)), research };
}
