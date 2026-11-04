import { listFor, required } from './util.js';
import type { Area, Character, Item, ModelData, Monster, Recipe, RecipeSet, Research, Zone } from './schema/index.js';

/** The fields that the inverse function makes, for each kind. The other fields come from the game tables. */
interface InverseFields {
  item: 'recipeId' | 'usedInRecipeIds' | 'gather' | 'specialZoneIds' | 'drops';
  recipe: 'recipeSetIds';
  recipeSet: 'researchId';
  research: 'unlocksIds';
  area: 'zoneId';
  monster: 'areas';
  zone: 'encounters';
  character: 'recipeSetIds' | 'researchIds';
}

/** The entities with only the side of each link that comes from the game tables. */
export interface DirectData {
  items: Omit<Item, InverseFields['item']>[];
  recipes: Omit<Recipe, InverseFields['recipe']>[];
  recipeSets: Omit<RecipeSet, InverseFields['recipeSet']>[];
  research: Omit<Research, InverseFields['research']>[];
  zones: Omit<Zone, InverseFields['zone']>[];
  areas: Omit<Area, InverseFields['area']>[];
  monsters: Omit<Monster, InverseFields['monster']>[];
  characters: Omit<Character, InverseFields['character']>[];
}

function idSet(entities: readonly { id: string }[]): ReadonlySet<string> {
  return new Set(entities.map((entity) => entity.id));
}

// Sets the single value of a reverse link. The reverse side holds 1 ID, so 2 different values would lose a link.
function setOnce(map: Map<string, string>, key: string, value: string, what: string): void {
  const current = map.get(key);
  if (current !== undefined && current !== value) throw new Error(`${what} ${key} has 2 reverse links: ${current} and ${value}`);
  map.set(key, value);
}

/**
 * Adds the reverse side of each link between the entities. Each list of reverse links follows the input order of the entities that hold the game side, which is the order of the game table.
 * @param direct - the entities with the game side of the links
 * @returns the entities with both sides of each link
 * @throws {Error} when a link names an entity that does not exist, or when 2 different entities give a reverse link that holds 1 ID (Item.recipeId, RecipeSet.researchId, Area.zoneId) the same key
 * @sideEffects none
 */
export function addInverseLinks(direct: DirectData): ModelData {
  const recipeByItem = new Map<string, string>();
  const usedInRecipes = new Map<string, string[]>();
  for (const recipe of direct.recipes) {
    setOnce(recipeByItem, recipe.resultItemId, recipe.id, 'item');
    for (const { itemId } of recipe.materials) {
      const list = listFor(usedInRecipes, itemId);
      if (!list.includes(recipe.id)) list.push(recipe.id);
    }
  }

  const setsOfRecipe = new Map<string, string[]>();
  const setsOfTeacher = new Map<string, string[]>();
  for (const set of direct.recipeSets) {
    for (const recipeId of set.recipeIds) listFor(setsOfRecipe, recipeId).push(set.id);
    if (set.teacherId !== null) listFor(setsOfTeacher, set.teacherId).push(set.id);
  }

  const researchOfSet = new Map<string, string>();
  const unlocks = new Map<string, string[]>();
  for (const research of direct.research) {
    if (research.recipeSetId !== null) setOnce(researchOfSet, research.recipeSetId, research.id, 'recipe set');
    for (const prerequisiteId of research.prerequisiteIds) listFor(unlocks, prerequisiteId).push(research.id);
  }

  const researchOfCharacter = new Map<string, string[]>();
  for (const research of direct.research) {
    if (research.researcherId !== null) listFor(researchOfCharacter, research.researcherId).push(research.id);
  }

  const zoneOfArea = new Map<string, string>();
  const specialZones = new Map<string, string[]>();
  for (const zone of direct.zones) {
    for (const areaId of zone.areaIds) setOnce(zoneOfArea, areaId, zone.id, 'area');
    for (const itemId of zone.specialItemIds) {
      const list = listFor(specialZones, itemId);
      if (!list.includes(zone.id)) list.push(zone.id);
    }
  }

  const gatherOfItem = new Map<string, Item['gather']>();
  const areasOfMonster = new Map<string, Monster['areas']>();
  for (const area of direct.areas) {
    for (const { itemId, rate } of area.gather) listFor(gatherOfItem, itemId).push({ areaId: area.id, rate });
    for (const { monsterId, ...appearance } of area.monsters) listFor(areasOfMonster, monsterId).push({ areaId: area.id, ...appearance });
  }

  const encountersOfZone = new Map<string, Zone['encounters']>();
  for (const monster of direct.monsters) {
    for (const { zoneId, ...encounter } of monster.zoneEncounters)
      listFor(encountersOfZone, zoneId).push({ monsterId: monster.id, ...encounter });
  }

  const dropsOfItem = new Map<string, Item['drops']>();
  for (const monster of direct.monsters) {
    for (const { itemId, ...drop } of monster.drops) listFor(dropsOfItem, itemId).push({ monsterId: monster.id, ...drop });
  }

  const model: ModelData = {
    items: direct.items.map((item) => ({
      ...item,
      recipeId: recipeByItem.get(item.id) ?? null,
      usedInRecipeIds: usedInRecipes.get(item.id) ?? [],
      gather: gatherOfItem.get(item.id) ?? [],
      specialZoneIds: specialZones.get(item.id) ?? [],
      drops: dropsOfItem.get(item.id) ?? [],
    })),
    recipes: direct.recipes.map((recipe) => ({ ...recipe, recipeSetIds: setsOfRecipe.get(recipe.id) ?? [] })),
    recipeSets: direct.recipeSets.map((set) => ({ ...set, researchId: researchOfSet.get(set.id) ?? null })),
    research: direct.research.map((research) => ({ ...research, unlocksIds: unlocks.get(research.id) ?? [] })),
    zones: direct.zones.map((zone) => ({ ...zone, encounters: encountersOfZone.get(zone.id) ?? [] })),
    areas: direct.areas.map((area) => ({ ...area, zoneId: required(zoneOfArea, area.id) })),
    monsters: direct.monsters.map((monster) => ({ ...monster, areas: areasOfMonster.get(monster.id) ?? [] })),
    characters: direct.characters.map((character) => ({
      ...character,
      recipeSetIds: setsOfTeacher.get(character.id) ?? [],
      researchIds: researchOfCharacter.get(character.id) ?? [],
    })),
  };
  assertLinksExist(model);
  return model;
}

/**
 * Checks that each ID in a link names an entity of the right kind.
 * @param model - the entities with both sides of each link
 * @throws {Error} when a link names an entity that does not exist
 * @sideEffects none
 */
function assertLinksExist(model: ModelData): void {
  const ids = {
    items: idSet(model.items),
    recipes: idSet(model.recipes),
    recipeSets: idSet(model.recipeSets),
    research: idSet(model.research),
    areas: idSet(model.areas),
    monsters: idSet(model.monsters),
    characters: idSet(model.characters),
    zones: idSet(model.zones),
  };
  const check = (kind: keyof typeof ids, links: readonly (string | null)[]): void => {
    for (const id of links) {
      if (id !== null && !ids[kind].has(id)) throw new Error(`no ${kind} with ID ${id}`);
    }
  };
  for (const recipe of model.recipes) {
    check('items', [recipe.resultItemId, ...recipe.materials.map((m) => m.itemId), ...recipe.unpricedItemIds]);
  }
  for (const set of model.recipeSets) {
    check('recipes', set.recipeIds);
    check('characters', [set.teacherId]);
  }
  for (const research of model.research) {
    check('characters', [research.researcherId]);
    check('recipeSets', [research.recipeSetId]);
    check('research', research.prerequisiteIds);
  }
  for (const zone of model.zones) {
    check('areas', zone.areaIds);
    check('items', zone.specialItemIds);
    check(
      'monsters',
      zone.encounters.map((e) => e.monsterId),
    );
  }
  for (const area of model.areas) {
    check(
      'items',
      area.gather.map((g) => g.itemId),
    );
    check(
      'monsters',
      area.monsters.map((m) => m.monsterId),
    );
  }
  for (const monster of model.monsters) {
    check(
      'items',
      monster.drops.map((d) => d.itemId),
    );
    check(
      'zones',
      monster.zoneEncounters.map((e) => e.zoneId),
    );
  }
}
