import { ItemCategory } from '../enums.js';
import type { DirectData } from '../inverse.js';
import type { Game } from '../parse/game.js';
import { isEmptySlot } from '../parse/recipes.js';
import { withSlugs } from '../slug.js';
import { isPlaceholder, required, round } from '../util.js';
import { idMap, type IdMap } from './ids.js';
import { storyEventOf } from './story.js';

/** The IDs of the entities that the recipes, the recipe sets and the research link to. */
export interface RecipeLinks {
  itemIds: IdMap;
  characterIds: IdMap;
}

/**
 * Makes the recipes from the game tables. The recipe value fields follow README.md, section "Recipe value".
 * @param game - the game data
 * @param links - the IDs of the items
 * @returns the recipes, in the order of the game table
 * @throws {Error} when a recipe names an item that the model does not hold
 * @sideEffects none
 */
export function buildRecipes(game: Game, links: RecipeLinks): DirectData['recipes'] {
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
      id: r.rowId,
      resultItemId: required(links.itemIds, r.ITEM_COMPLETION_ID),
      materials: materials.map((m) => ({ itemId: required(links.itemIds, m.id), quantity: m.num })),
      synthesisCost,
      inputCost,
      addedValue,
      addedValuePerCost: addedValue !== null && synthesisCost > 0 ? round(addedValue / synthesisCost) : null,
      unpricedItemIds: materials
        .filter((m) => priceOf(m.id) === 0 && itemById.get(m.id)?.ITEM_CATEGORY_ID !== ItemCategory.Element)
        .map((m) => required(links.itemIds, m.id)),
    };
  });
}

/**
 * Makes the recipe sets from the game tables.
 * @param game - the game data
 * @param links - the IDs of the items and the characters
 * @returns the recipe sets, in the order of the game table
 * @sideEffects none
 */
export function buildRecipeSets(game: Game, links: RecipeLinks): DirectData['recipeSets'] {
  const recipeIds = idMap(game.recipes.recipes, (r) => r.RECIPE_ID);
  const { t } = game.messages;
  return game.recipes.recipeSets.map((c) => {
    const teacherId = links.characterIds.get(c.CHARACTER_ID) ?? null;
    const label = t(c.RECIPE_COLLECTION_NAME_LABEL_ID);
    return {
      id: c.rowId,
      name: isPlaceholder(label) ? null : label,
      recipeIds: c.recipeIds.flatMap((id) => recipeIds.get(id) ?? []),
      teacherId,
      friendship: teacherId === null ? null : Number(c.RECIPE_COLLECTION_COMPANION_NUM),
      unlockEvent: storyEventOf(game.story, c.RECIPE_RCONDITION_EVENT),
    };
  });
}

/**
 * Makes the research from the game tables. The research that has a placeholder name is left out.
 * @param game - the game data
 * @param links - the IDs of the characters
 * @returns the research, in the order of the game table
 * @sideEffects none
 */
export function buildResearch(game: Game, links: Pick<RecipeLinks, 'characterIds'>): DirectData['research'] {
  const { t } = game.messages;
  const named = game.recipes.research.filter((r) => !isPlaceholder(t(r.STDY_RES_NAME_LABEL_ID)));
  const researchIds = idMap(named, (r) => r.STDY_RES_ID);
  const setIds = idMap(game.recipes.recipeSets, (c) => c.RECIPE_COLLECTION_ID);
  return withSlugs(
    named.map((r) => ({
      id: r.rowId,
      name: t(r.STDY_RES_NAME_LABEL_ID),
      researcherId: links.characterIds.get(r.STDY_RES_CHARACTER_TAG_00) ?? null,
      prerequisiteIds: r.prerequisiteIds.flatMap((id) => researchIds.get(id) ?? []),
      district: r.district,
      recipeSetId: setIds.get(r.recipeSetId) ?? null,
    })),
  );
}
