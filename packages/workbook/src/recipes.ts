import { z } from 'zod';
import { ItemCategory } from './enums.js';
import type { Characters } from './characters.js';
import type { Items } from './items.js';
import type { Story } from './story.js';
import { isPlaceholder, listFor, round } from './util.js';
import type { ReadTable } from './xml.js';

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
    ],
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
    researchIds: [c.STDY_COND_RES_TAG_00, c.STDY_COND_RES_TAG_01, c.STDY_COND_RES_TAG_02, c.STDY_COND_RES_TAG_03],
  }));

const districtSchema = z.object({ COMMERCIAL_DISTRICT_ID: z.string(), COMMERCIAL_DISTRICT_LABEL_ID: z.string() });

/** A row of recipe.xml. */
export type Recipe = z.output<typeof recipeSchema>;

/**
 * Tells whether a material slot of a recipe is empty.
 * @param slot - the material slot
 * @returns true for an empty slot
 * @sideEffects none
 */
export function isEmptySlot(slot: Recipe['slots'][number]): boolean {
  return slot.id === NO_MATERIAL;
}

/** How a recipe is unlocked. */
export interface Unlock {
  set: string;
  teacher: string;
  friendship: number | '';
  research: string;
  researcher: string;
  prereqs: string;
  event: string;
}

/** The recipes, how they unlock and what they cost. */
export interface Recipes {
  /** The recipes that have a name and a known result item. */
  recipes: Recipe[];
  /** Maps a recipe id to how the first recipe set that holds it unlocks it. */
  unlock: Map<string, Unlock>;
  /** Maps a character id to the recipe sets that the character teaches, as text. */
  setsTaughtBy: Map<string, string[]>;
  /** Returns the price of an item, 0 when it has none or is unknown. */
  priceOf: (id: string) => number;
  /** Returns the price of the materials of a recipe. */
  inputCost: (r: Recipe) => number;
  /** Returns the price of the result minus the input cost, or '' when the result has no price. */
  addedValue: (r: Recipe) => number | '';
  /** Returns the materials of a recipe that have no price and are not elements. */
  unpricedInputs: (r: Recipe) => Recipe['slots'];
}

/** The data that the recipes refer to. */
export interface RecipeSources {
  items: Items;
  story: Story;
  characters: Characters;
}

/**
 * Loads the recipes, the recipe sets and the research that unlocks them.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @param sources - the items, the story and the characters that the recipes refer to
 * @returns the recipes and the lookups
 * @sideEffects reads the recipe, study and district tables through the table reader
 */
export function loadRecipes(read: ReadTable, t: (label: string) => string, sources: RecipeSources): Recipes {
  const { items, story, characters } = sources;
  const { itemById } = items;
  const recipes = read('recipe/recipe.xml', recipeSchema).filter(
    (r) => !isPlaceholder(t(r.RECIPE_NAME_LABEL_ID)) && itemById.has(r.ITEM_COMPLETION_ID),
  );
  const prizeToCollection = new Map(
    read('study/stdy_prize.xml', prizeSchema).map((p) => [p.STDY_PRIZE_ID, p.STDY_PRIZE_RECIPE_COLLECTION]),
  );
  const researches = read('study/stdy_research.xml', researchSchema);
  const researchByCollection = new Map<string, (typeof researches)[number]>();
  for (const r of researches) {
    const coll = prizeToCollection.get(r.STDY_PRIZE_TAG);
    if (coll && coll !== NO_COLLECTION) researchByCollection.set(coll, r);
  }
  const researchName = new Map(researches.map((r) => [r.STDY_RES_ID, t(r.STDY_RES_NAME_LABEL_ID)]));
  const researchCond = new Map(read('study/stdy_conditions.xml', conditionSchema).map((c) => [c.STDY_COND_ID, c]));
  const district = new Map(
    read('commercial_district/commercial_district.xml', districtSchema).map((d) => [
      d.COMMERCIAL_DISTRICT_ID,
      t(d.COMMERCIAL_DISTRICT_LABEL_ID),
    ]),
  );
  const researchPrereqs = (res: (typeof researches)[number]): string => {
    const c = researchCond.get(res.STDY_RES_COND_TAG);
    if (!c) return '';
    const parts = c.researchIds.filter((r) => r !== NO_RESEARCH).map((r) => researchName.get(r) ?? r);
    if (c.STDY_COMMERCIAL_DISTRICT_ID !== NO_DISTRICT) parts.push(`District: ${district.get(c.STDY_COMMERCIAL_DISTRICT_ID) ?? ''}`);
    return parts.join(', ');
  };

  const unlock = new Map<string, Unlock>();
  const setsTaughtBy = new Map<string, string[]>();
  for (const c of read('recipe/recipe_collection.xml', collectionSchema)) {
    const res = researchByCollection.get(c.RECIPE_COLLECTION_ID);
    const teacher = characters.characterName.get(c.CHARACTER_ID) ?? '';
    const setLabel = t(c.RECIPE_COLLECTION_NAME_LABEL_ID);
    const info: Unlock = {
      set: isPlaceholder(setLabel) ? '' : setLabel,
      teacher,
      friendship: teacher ? Number(c.RECIPE_COLLECTION_COMPANION_NUM) : '',
      research: res ? t(res.STDY_RES_NAME_LABEL_ID) : '',
      researcher: res ? (characters.characterName.get(res.STDY_RES_CHARACTER_TAG_00) ?? '') : '',
      prereqs: res ? researchPrereqs(res) : '',
      event: story.eventLabel(c.RECIPE_RCONDITION_EVENT),
    };
    if (teacher && info.set) listFor(setsTaughtBy, c.CHARACTER_ID).push(`${info.set} (FRD ${info.friendship})`);
    for (const id of c.recipeIds) {
      if (id !== NO_RECIPE && !unlock.has(id)) unlock.set(id, info);
    }
  }

  // Recipe economics use the selling price of each item. Elements have no price, so they cost 0.
  // Every recipe gives 1 item, so the output value is the price of the result.
  const priceOf = (id: string): number => Number(itemById.get(id)?.ITEM_SELLING_PRICE ?? 0);
  const materialsOf = (r: Recipe): Recipe['slots'] => r.slots.filter((m) => !isEmptySlot(m));
  const inputCost = (r: Recipe): number => round(materialsOf(r).reduce((sum, m) => sum + priceOf(m.id) * m.num, 0));
  return {
    recipes,
    unlock,
    setsTaughtBy,
    priceOf,
    inputCost,
    // Blank when the result has no price (construction and battle items): the item is not sold.
    addedValue: (r) => (priceOf(r.ITEM_COMPLETION_ID) > 0 ? round(priceOf(r.ITEM_COMPLETION_ID) - inputCost(r)) : ''),
    unpricedInputs: (r) =>
      materialsOf(r).filter((m) => priceOf(m.id) === 0 && itemById.get(m.id)?.ITEM_CATEGORY_ID !== ItemCategory.Element),
  };
}
