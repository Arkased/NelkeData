import { describe, expect, it } from 'vitest';
import { GatherKind } from '../enums.js';
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
        items: [fakeItem({ id: 'a' }), fakeItem({ id: 'b' })],
        recipes: [fakeRecipe({ id: 'r', resultItemId: 'b', materials: [{ itemId: 'a', quantity: 2 }] })],
      }),
    );
    expect(model.items[0]).toMatchObject({ recipeId: null, usedInRecipeIds: ['r'] });
    expect(model.items[1]).toMatchObject({ recipeId: 'r', usedInRecipeIds: [] });
  });

  it('links a recipe to the sets that hold it and a teacher to the sets that she teaches', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 'a' })],
        recipes: [fakeRecipe({ id: 'r', resultItemId: 'a' })],
        recipeSets: [fakeRecipeSet({ id: 's1', recipeIds: ['r'], teacherId: 'c' }), fakeRecipeSet({ id: 's2', recipeIds: ['r'] })],
        characters: [fakeCharacter({ id: 'c' })],
      }),
    );
    expect(model.recipes[0]?.recipeSetIds).toEqual(['s1', 's2']);
    expect(model.characters[0]?.recipeSetIds).toEqual(['s1']);
  });

  it('links a recipe set to its research and a research to the researches that need it', () => {
    const model = addInverseLinks(
      fakeDirectData({
        recipeSets: [fakeRecipeSet({ id: 's' })],
        research: [fakeResearch({ id: 'x1', recipeSetId: 's' }), fakeResearch({ id: 'x2', prerequisiteIds: ['x1'] })],
      }),
    );
    expect(model.recipeSets[0]?.researchId).toBe('x1');
    expect(model.research[0]?.unlocksIds).toEqual(['x2']);
    expect(model.research[1]?.unlocksIds).toEqual([]);
  });

  it('links a researcher to the research that she does', () => {
    const model = addInverseLinks(
      fakeDirectData({
        research: [
          fakeResearch({ id: 'x1', researcherId: 'c' }),
          fakeResearch({ id: 'x2', researcherId: 'c' }),
          fakeResearch({ id: 'x3' }),
        ],
        characters: [fakeCharacter({ id: 'c' })],
      }),
    );
    expect(model.characters[0]?.researchIds).toEqual(['x1', 'x2']);
  });

  it('links an area to its zone and an item to the zones that have it at a special spot', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 'a' })],
        zones: [
          fakeZone({
            id: 'z',
            areaIds: ['p'],
            specialItems: [
              { itemId: 'a', kind: GatherKind.Treasure, spot: 1, rate: 50 },
              { itemId: 'a', kind: GatherKind.Digging, spot: 1, rate: 100 },
            ],
          }),
        ],
        areas: [fakeArea({ id: 'p' })],
      }),
    );
    expect(model.areas[0]?.zoneId).toBe('z');
    expect(model.items[0]?.specialZoneIds).toEqual(['z']);
  });

  it('links an item to the areas where it is gathered, with the rate', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 'a' })],
        zones: [fakeZone({ id: 'z', areaIds: ['p'] })],
        areas: [fakeArea({ id: 'p', gather: [{ itemId: 'a', rate: 30 }] })],
      }),
    );
    expect(model.items[0]?.gather).toEqual([{ areaId: 'p', rate: 30 }]);
  });

  it('links a monster to the areas where it appears, with the same values', () => {
    const appearance = { levels: [3, 5], areaLevel: 2, boss: false };
    const model = addInverseLinks(
      fakeDirectData({
        zones: [fakeZone({ id: 'z', areaIds: ['p'] })],
        areas: [fakeArea({ id: 'p', monsters: [{ monsterId: 'm', ...appearance }] })],
        monsters: [fakeMonster({ id: 'm' })],
      }),
    );
    expect(model.monsters[0]?.areas).toEqual([{ areaId: 'p', ...appearance }]);
  });

  it('links a zone to the monsters that appear in it through an encounter of no area, with the same values', () => {
    const encounter = { levels: [98], boss: true };
    const model = addInverseLinks(
      fakeDirectData({
        zones: [fakeZone({ id: 'z' })],
        monsters: [fakeMonster({ id: 'm', zoneEncounters: [{ zoneId: 'z', ...encounter }] })],
      }),
    );
    expect(model.zones[0]?.encounters).toEqual([{ monsterId: 'm', ...encounter }]);
  });

  it('links an item to the monsters that drop it, with the same values', () => {
    const model = addInverseLinks(
      fakeDirectData({
        items: [fakeItem({ id: 'a' })],
        monsters: [fakeMonster({ id: 'm', drops: [{ itemId: 'a', quantity: 2, rate: 50 }] })],
      }),
    );
    expect(model.items[0]?.drops).toEqual([{ monsterId: 'm', quantity: 2, rate: 50 }]);
  });

  it('throws when a link names an entity that does not exist', () => {
    const direct = fakeDirectData({ recipes: [fakeRecipe({ id: 'r', resultItemId: 'missing' })] });
    expect(() => addInverseLinks(direct)).toThrow();
  });

  it('throws when 2 recipes make the same item', () => {
    const direct = fakeDirectData({
      items: [fakeItem({ id: 'a' })],
      recipes: [fakeRecipe({ id: 'r1', resultItemId: 'a' }), fakeRecipe({ id: 'r2', resultItemId: 'a' })],
    });
    expect(() => addInverseLinks(direct)).toThrow();
  });

  it('throws when 2 researches give the same recipe set', () => {
    const direct = fakeDirectData({
      recipeSets: [fakeRecipeSet({ id: 's' })],
      research: [fakeResearch({ id: 'x1', recipeSetId: 's' }), fakeResearch({ id: 'x2', recipeSetId: 's' })],
    });
    expect(() => addInverseLinks(direct)).toThrow();
  });

  it('throws when 2 zones list the same area', () => {
    const direct = fakeDirectData({
      zones: [fakeZone({ id: 'z1', areaIds: ['p'] }), fakeZone({ id: 'z2', areaIds: ['p'] })],
      areas: [fakeArea({ id: 'p' })],
    });
    expect(() => addInverseLinks(direct)).toThrow();
  });
});
