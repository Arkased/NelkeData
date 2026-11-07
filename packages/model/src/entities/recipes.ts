import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import { isEmptySlot } from '../parse/recipes.js';
import { withSlugs } from '../slug.js';
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

/** The part of a recipe that the cumulative synthesis cost needs. */
interface CostRecipe {
  resultItemId: string;
  synthesisCost: number;
  materials: readonly { itemId: string; quantity: number }[];
}

/**
 * Attaches the cumulative synthesis cost to each recipe: the synthesis cost of the recipe plus,
 * for each material that a recipe makes, its quantity times its cumulative synthesis cost. A material that no recipe makes adds 0.
 * @param recipes - the recipes; each item is the result of at most 1 recipe
 * @returns the recipes in the same order, each with its cumulative synthesis cost
 * @throws {Error} when 2 recipes make the same item, or when the recipes make a loop; the message names the items
 * @sideEffects none
 */
export function withCumulativeSynthesisCosts<R extends CostRecipe>(recipes: readonly R[]): (R & { cumulativeSynthesisCost: number })[] {
  const byResult = new Map<string, CostRecipe>();
  for (const r of recipes) {
    if (byResult.has(r.resultItemId)) throw new Error(`2 recipes make the item ${r.resultItemId}`);
    byResult.set(r.resultItemId, r);
  }
  const costs = new Map<string, number>();
  const costOf = (itemId: string, chain: readonly string[]): number => {
    const recipe = byResult.get(itemId);
    if (recipe === undefined) return 0;
    const known = costs.get(itemId);
    if (known !== undefined) return known;
    if (chain.includes(itemId)) throw new Error(`recipe loop: ${[...chain.slice(chain.indexOf(itemId)), itemId].join(' to ')}`);
    const next = [...chain, itemId];
    const cost = recipe.materials.reduce((sum, m) => sum + m.quantity * costOf(m.itemId, next), recipe.synthesisCost);
    costs.set(itemId, cost);
    return cost;
  };
  return recipes.map((r) => ({ ...r, cumulativeSynthesisCost: costOf(r.resultItemId, []) }));
}

/**
 * Makes the recipes from the game tables. The recipe value fields follow README.md, section "Recipe value".
 * @param game - the game data
 * @returns the recipes, in the order of the game table
 * @throws {Error} when 2 recipes make the same item, or when the recipes make a loop
 * @sideEffects none
 */
export function buildRecipes(game: Game): DirectData['recipes'] {
  const { itemById } = game.items;
  const recipes = game.recipes.recipes.map((r) => ({
    id: r.RECIPE_ID,
    resultItemId: r.ITEM_COMPLETION_ID,
    materials: r.slots.filter((m) => !isEmptySlot(m)).map((m) => ({ itemId: m.id, quantity: m.num })),
    synthesisCost: Number(r.ITEM_COMP_MH),
  }));
  return withCumulativeSynthesisCosts(recipes).map((r) => {
    const { cumulativeSynthesisCost } = r;
    // Every recipe gives 1 item, so the output value is the price of the result. A price of 0 (construction and battle items) means no value.
    const price = Number(itemById.get(r.resultItemId)?.ITEM_SELLING_PRICE ?? 0);
    return {
      id: r.id,
      resultItemId: r.resultItemId,
      materials: r.materials,
      synthesisCost: r.synthesisCost,
      synthesisLevel: synthesisLevelOf(Number(itemById.get(r.resultItemId)?.ITEM_RANK ?? 0)),
      cumulativeSynthesisCost,
      valuePerCumulativeSynthesisCost: price > 0 && cumulativeSynthesisCost > 0 ? price / cumulativeSynthesisCost : null,
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
