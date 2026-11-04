import { describe, expect, it } from 'vitest';
import { addInverseLinks } from '../inverse.js';
import {
  fakeArea,
  fakeCharacter,
  fakeDirectData,
  fakeItem,
  fakeMonster,
  fakeRecipe,
  fakeRecipeSet,
  fakeResearch,
  fakeZone,
} from './fakes/entities.js';

describe('addInverseLinks', () => {
  it('links an item to the recipe that makes it and the recipes that use it', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 1 }), fakeItem({ id: 2 })],
        recipes: [fakeRecipe({ id: 5, resultItemId: 2, materials: [{ itemId: 1, quantity: 2 }] })],
      }),
    );
    expect(model.items[0]).toMatchObject({ recipeId: null, usedInRecipeIds: [5] });
    expect(model.items[1]).toMatchObject({ recipeId: 5, usedInRecipeIds: [] });
  });

  it('links a recipe to the sets that hold it and a teacher to the sets that she teaches', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 1 })],
        recipes: [fakeRecipe({ id: 1 })],
        recipeSets: [fakeRecipeSet({ id: 1, recipeIds: [1], teacherId: 4 }), fakeRecipeSet({ id: 2, recipeIds: [1] })],
        characters: [fakeCharacter({ id: 4 })],
      }),
    );
    expect(model.recipes[0]?.recipeSetIds).toEqual([1, 2]);
    expect(model.characters[0]?.recipeSetIds).toEqual([1]);
  });

  it('links a recipe set to its research and a research to the researches that need it', () => {
    const model = addInverseLinks(
      fakeDirectData({
        recipeSets: [fakeRecipeSet({ id: 1 })],
        research: [fakeResearch({ id: 1, recipeSetId: 1 }), fakeResearch({ id: 2, prerequisiteIds: [1] })],
      }),
    );
    expect(model.recipeSets[0]?.researchId).toBe(1);
    expect(model.research[0]?.unlocksIds).toEqual([2]);
    expect(model.research[1]?.unlocksIds).toEqual([]);
  });

  it('links an area to its zone and an item to the zones that have it at a special spot', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 1 })],
        zones: [fakeZone({ id: 3, areaIds: [8], specialItemIds: [1] })],
        areas: [fakeArea({ id: 8 })],
      }),
    );
    expect(model.areas[0]?.zoneId).toBe(3);
    expect(model.items[0]?.specialZoneIds).toEqual([3]);
  });

  it('links an item to the areas where it is gathered, with the rate', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 1 })],
        zones: [fakeZone({ id: 1, areaIds: [2] })],
        areas: [fakeArea({ id: 2, gather: [{ itemId: 1, rate: 30 }] })],
      }),
    );
    expect(model.items[0]?.gather).toEqual([{ areaId: 2, rate: 30 }]);
  });

  it('links a monster to the areas where it appears, with the same values', () => {
    const appearance = { levels: [3, 5], areaLevel: 2, boss: false };
    const model = addInverseLinks(
      fakeDirectData({
        zones: [fakeZone({ id: 1, areaIds: [2] })],
        areas: [fakeArea({ id: 2, monsters: [{ monsterId: 6, ...appearance }] })],
        monsters: [fakeMonster({ id: 6 })],
      }),
    );
    expect(model.monsters[0]?.areas).toEqual([{ areaId: 2, ...appearance }]);
  });

  it('links an item to the monsters that drop it, with the same values', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 1 })],
        monsters: [fakeMonster({ id: 6, drops: [{ itemId: 1, quantity: 2, rate: 50 }] })],
      }),
    );
    expect(model.items[0]?.drops).toEqual([{ monsterId: 6, quantity: 2, rate: 50 }]);
  });

  it('throws when a link names an entity that does not exist', () => {
    const direct = fakeDirectData({ recipes: [fakeRecipe({ id: 1, resultItemId: 99 })] });
    expect(() => addInverseLinks(direct)).toThrow('no items with ID 99');
  });
});
