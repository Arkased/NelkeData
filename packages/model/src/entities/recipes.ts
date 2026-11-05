import { ItemCategory } from '../enums.js';
import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import { isEmptySlot } from '../parse/recipes.js';
import { withSlugs } from '../slug.js';
import { round } from '../util.js';
import { idSet, type IdSet } from './ids.js';
import { storyEventOf } from './story.js';

/** The IDs of the characters that the recipe sets and the research link to. */
export interface RecipeLinks {
  characterIds: IdSet;
}

/** The number of item ranks for each level of synthesis (README.md, section "Synthesis level"). */
export const RANKS_PER_SYNTHESIS_LEVEL = 4;

/**
 * Returns the minimum alchemy level of a recipe from the rank of its result item.
 * @param rank - the rank of the result item
 * @returns the rank divided by the ranks for each level, rounded down, and at least 1
 * @sideEffects none
 */
export function synthesisLevelOf(rank: number): number {
  return Math.max(1, Math.floor(rank / RANKS_PER_SYNTHESIS_LEVEL));
}

/**
 * Makes the recipes from the game tables. The recipe value fields follow README.md, section "Recipe value".
 * @param game - the game data
 * @returns the recipes, in the order of the game table
 * @sideEffects none
 */
export function buildRecipes(game: Game): DirectData['recipes'] {
  const { itemById } = game.items;
  // Elements have no price, so they cost 0. Every recipe gives 1 item, so the output value is the price of the result.
  const priceOf = (tag: string): number => Number(itemById.get(tag)?.ITEM_SELLING_PRICE ?? 0);
  return game.recipes.recipes.map((r) => {
    const materials = r.slots.filter((m) => !isEmptySlot(m));
    const synthesisCost = Number(r.ITEM_COMP_MH);
    const inputCost = round(materials.reduce((sum, m) => sum + priceOf(m.id) * m.num, 0));
    // The added value is null when the result has no price (construction and battle items): the item is not sold.
    const addedValue = priceOf(r.ITEM_COMPLETION_ID) > 0 ? round(priceOf(r.ITEM_COMPLETION_ID) - inputCost) : null;
    return {
      id: r.RECIPE_ID,
      resultItemId: r.ITEM_COMPLETION_ID,
      materials: materials.map((m) => ({ itemId: m.id, quantity: m.num })),
      synthesisCost,
      synthesisLevel: synthesisLevelOf(Number(itemById.get(r.ITEM_COMPLETION_ID)?.ITEM_RANK ?? 0)),
      inputCost,
      addedValue,
      addedValuePerCost: addedValue !== null && synthesisCost > 0 ? round(addedValue / synthesisCost) : null,
      unpricedItemIds: materials
        .filter((m) => priceOf(m.id) === 0 && itemById.get(m.id)?.ITEM_CATEGORY_ID !== ItemCategory.Element)
        .map((m) => m.id),
    };
  });
}

/**
 * Makes the recipe sets from the game tables.
 * @param game - the game data
 * @param links - the IDs of the characters
 * @returns the recipe sets, in the order of the game table
 * @sideEffects none
 */
export function buildRecipeSets(game: Game, links: RecipeLinks): DirectData['recipeSets'] {
  const recipeIds = idSet(game.recipes.recipes, (r) => r.RECIPE_ID);
  const { t } = game.messages;
  return game.recipes.recipeSets.map((c) => {
    const teacherId = links.characterIds.has(c.CHARACTER_ID) ? c.CHARACTER_ID : null;
    return {
      id: c.RECIPE_COLLECTION_ID,
      name: t(c.RECIPE_COLLECTION_NAME_LABEL_ID),
      recipeIds: c.recipeIds.filter((id) => recipeIds.has(id)),
      teacherId,
      friendship: teacherId === null ? null : Number(c.RECIPE_COLLECTION_COMPANION_NUM),
      unlockEvent: storyEventOf(game.story, c.RECIPE_RCONDITION_EVENT),
    };
  });
}

/**
 * Makes the research from the game tables.
 * @param game - the game data
 * @param links - the IDs of the characters
 * @returns the research, in the order of the game table
 * @sideEffects none
 */
export function buildResearch(game: Game, links: Pick<RecipeLinks, 'characterIds'>): DirectData['research'] {
  const { t } = game.messages;
  const researchIds = idSet(game.recipes.research, (r) => r.STDY_RES_ID);
  const setIds = idSet(game.recipes.recipeSets, (c) => c.RECIPE_COLLECTION_ID);
  return withSlugs(
    game.recipes.research.map((r) => ({
      id: r.STDY_RES_ID,
      name: t(r.STDY_RES_NAME_LABEL_ID),
      researcherId: links.characterIds.has(r.STDY_RES_CHARACTER_TAG_00) ? r.STDY_RES_CHARACTER_TAG_00 : null,
      prerequisiteIds: r.prerequisiteIds.filter((id) => researchIds.has(id)),
      district: r.district,
      recipeSetId: setIds.has(r.recipeSetId) ? r.recipeSetId : null,
    })),
  );
}
