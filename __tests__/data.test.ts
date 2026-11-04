import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ICON_DIR, readData, type ModelData } from '@nelke/model';

const dataDir = path.join(import.meta.dirname, '..', 'data');
const data = readData(dataDir);

function ids(rows: readonly { id: number }[]): Set<number> {
  return new Set(rows.map((r) => r.id));
}

/** Lists the links that do not name an entity, for the message of a failed test. */
function missing(links: readonly number[], kind: readonly { id: number }[]): number[] {
  const known = ids(kind);
  return links.filter((id) => !known.has(id));
}

describe('data/', () => {
  it('passes the schemas of the model', () => {
    expect(() => readData(dataDir)).not.toThrow();
  });

  it('has a unique slug for each entity of a kind', () => {
    const kinds: (keyof ModelData)[] = ['items', 'research', 'zones', 'areas', 'monsters', 'characters'];
    for (const kind of kinds) {
      const slugs = data[kind].map((e) => ('slug' in e ? e.slug : ''));
      expect(new Set(slugs).size, kind).toBe(slugs.length);
    }
  });

  it('names a file of data/icons/ in each icon', () => {
    const files = new Set(fs.readdirSync(path.join(dataDir, ICON_DIR)));
    const icons = [...data.items, ...data.monsters, ...data.characters].flatMap((e) => (e.icon === null ? [] : [e.icon]));
    expect(icons.filter((icon) => !files.has(icon))).toEqual([]);
  });

  it('has the reverse of each link', () => {
    const recipeOf = new Map(data.recipes.map((r) => [r.id, r]));
    const itemOf = new Map(data.items.map((i) => [i.id, i]));
    const setOf = new Map(data.recipeSets.map((s) => [s.id, s]));
    const zoneOf = new Map(data.zones.map((z) => [z.id, z]));
    const areaOf = new Map(data.areas.map((a) => [a.id, a]));
    const monsterOf = new Map(data.monsters.map((m) => [m.id, m]));
    const researchOf = new Map(data.research.map((r) => [r.id, r]));
    const characterOf = new Map(data.characters.map((c) => [c.id, c]));

    for (const item of data.items) {
      if (item.recipeId !== null) expect(recipeOf.get(item.recipeId)?.resultItemId).toBe(item.id);
      for (const id of item.usedInRecipeIds) expect(recipeOf.get(id)?.materials.map((m) => m.itemId)).toContain(item.id);
      for (const g of item.gather) expect(areaOf.get(g.areaId)?.gather).toContainEqual({ itemId: item.id, rate: g.rate });
      for (const id of item.specialZoneIds) expect(zoneOf.get(id)?.specialItemIds).toContain(item.id);
      for (const { monsterId, ...drop } of item.drops) {
        expect(monsterOf.get(monsterId)?.drops).toContainEqual({ itemId: item.id, ...drop });
      }
    }
    for (const recipe of data.recipes) {
      expect(itemOf.has(recipe.resultItemId)).toBe(true);
      for (const id of recipe.recipeSetIds) expect(setOf.get(id)?.recipeIds).toContain(recipe.id);
    }
    for (const set of data.recipeSets) {
      expect(missing(set.recipeIds, data.recipes)).toEqual([]);
      for (const id of set.recipeIds) expect(recipeOf.get(id)?.recipeSetIds).toContain(set.id);
      if (set.teacherId !== null) expect(characterOf.get(set.teacherId)?.recipeSetIds).toContain(set.id);
      if (set.researchId !== null) expect(researchOf.get(set.researchId)?.recipeSetId).toBe(set.id);
    }
    for (const research of data.research) {
      for (const id of research.prerequisiteIds) expect(researchOf.get(id)?.unlocksIds).toContain(research.id);
      for (const id of research.unlocksIds) expect(researchOf.get(id)?.prerequisiteIds).toContain(research.id);
    }
    for (const zone of data.zones) {
      for (const id of zone.areaIds) expect(areaOf.get(id)?.zoneId).toBe(zone.id);
    }
    for (const area of data.areas) {
      expect(zoneOf.get(area.zoneId)?.areaIds).toContain(area.id);
      for (const { monsterId, ...appearance } of area.monsters) {
        expect(monsterOf.get(monsterId)?.areas).toContainEqual({ areaId: area.id, ...appearance });
      }
    }
    for (const monster of data.monsters) {
      for (const { areaId, ...appearance } of monster.areas) {
        expect(areaOf.get(areaId)?.monsters).toContainEqual({ monsterId: monster.id, ...appearance });
      }
    }
    for (const character of data.characters) {
      for (const id of character.recipeSetIds) expect(setOf.get(id)?.teacherId).toBe(character.id);
    }
  });
});
