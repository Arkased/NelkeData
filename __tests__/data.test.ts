import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ICON_DIR, ICON_SIZES, readData, type ModelData } from '@nelke/model';

const dataDir = path.join(import.meta.dirname, '..', 'data');
const iconDirs = ICON_SIZES.map((size) => path.join(dataDir, ICON_DIR, String(size)));
const data = readData(dataDir);

/** Writes a link as one text, so that the 2 sides of a link compare as lists of texts. */
function key(...parts: unknown[]): string {
  return JSON.stringify(parts);
}

/** Lists the links of 1 side of the table "Links" of the design, as sorted texts. */
function links<T>(rows: readonly T[], of: (row: T) => string[]): string[] {
  return rows.flatMap(of).toSorted();
}

describe('data/', () => {
  it('passes the schemas of the model', () => {
    expect(() => readData(dataDir)).not.toThrow();
  });

  it('has a unique ID for each entity of a kind', () => {
    for (const [kind, rows] of Object.entries(data)) {
      const ids = rows.map((e) => e.id);
      expect(new Set(ids).size, kind).toBe(ids.length);
    }
  });

  it('has a unique slug for each entity of a kind', () => {
    const kinds: (keyof ModelData)[] = ['items', 'research', 'zones', 'areas', 'monsters', 'characters'];
    for (const kind of kinds) {
      const slugs = data[kind].map((e) => ('slug' in e ? e.slug : ''));
      expect(new Set(slugs).size, kind).toBe(slugs.length);
    }
  });

  it.each(iconDirs)('names a file of %s in each icon', (dir) => {
    const files = new Set(fs.readdirSync(dir));
    const icons = [...data.items, ...data.monsters, ...data.characters].flatMap((e) => (e.icon === null ? [] : [e.icon]));
    expect(icons.filter((icon) => !files.has(icon))).toEqual([]);
  });

  it.each(iconDirs)('has no file in %s that no icon names', (dir) => {
    const named = new Set([...data.items, ...data.monsters, ...data.characters].flatMap((e) => (e.icon === null ? [] : [e.icon])));
    expect(fs.readdirSync(dir).filter((file) => !named.has(file))).toEqual([]);
  });

  describe('has both sides of each link, with the same values', () => {
    it('Recipe.resultItemId and Item.recipeId', () => {
      expect(links(data.recipes, (r) => [key(r.id, r.resultItemId)])).toEqual(
        links(data.items, (i) => (i.recipeId === null ? [] : [key(i.recipeId, i.id)])),
      );
    });

    it('Recipe.materials and Item.usedInRecipeIds', () => {
      const direct = links(data.recipes, (r) => [...new Set(r.materials.map((m) => m.itemId))].map((id) => key(r.id, id)));
      expect(links(data.items, (i) => i.usedInRecipeIds.map((id) => key(id, i.id)))).toEqual(direct);
    });

    it('RecipeSet.recipeIds and Recipe.recipeSetIds', () => {
      expect(links(data.recipeSets, (s) => s.recipeIds.map((id) => key(s.id, id)))).toEqual(
        links(data.recipes, (r) => r.recipeSetIds.map((id) => key(id, r.id))),
      );
    });

    it('RecipeSet.teacherId and Character.recipeSetIds', () => {
      expect(links(data.recipeSets, (s) => (s.teacherId === null ? [] : [key(s.id, s.teacherId)]))).toEqual(
        links(data.characters, (c) => c.recipeSetIds.map((id) => key(id, c.id))),
      );
    });

    it('Research.recipeSetId and RecipeSet.researchId', () => {
      expect(links(data.research, (r) => (r.recipeSetId === null ? [] : [key(r.id, r.recipeSetId)]))).toEqual(
        links(data.recipeSets, (s) => (s.researchId === null ? [] : [key(s.researchId, s.id)])),
      );
    });

    it('Research.researcherId and Character.researchIds', () => {
      expect(links(data.research, (r) => (r.researcherId === null ? [] : [key(r.id, r.researcherId)]))).toEqual(
        links(data.characters, (c) => c.researchIds.map((id) => key(id, c.id))),
      );
    });

    it('Research.prerequisiteIds and Research.unlocksIds', () => {
      expect(links(data.research, (r) => r.prerequisiteIds.map((id) => key(r.id, id)))).toEqual(
        links(data.research, (r) => r.unlocksIds.map((id) => key(id, r.id))),
      );
    });

    it('Monster.zoneEncounters and Zone.encounters', () => {
      expect(links(data.monsters, (m) => m.zoneEncounters.map((e) => key(m.id, e.zoneId, e.levels, e.boss)))).toEqual(
        links(data.zones, (z) => z.encounters.map((e) => key(e.monsterId, z.id, e.levels, e.boss))),
      );
    });

    it('Zone.areaIds and Area.zoneId', () => {
      expect(links(data.zones, (z) => z.areaIds.map((id) => key(z.id, id)))).toEqual(links(data.areas, (a) => [key(a.zoneId, a.id)]));
    });

    it('Area.gather and Item.gather', () => {
      expect(links(data.areas, (a) => a.gather.map((g) => key(a.id, g.itemId, g.rate)))).toEqual(
        links(data.items, (i) => i.gather.map((g) => key(g.areaId, i.id, g.rate))),
      );
    });

    it('Zone.specialItemIds and Item.specialZoneIds', () => {
      expect(links(data.zones, (z) => z.specialItemIds.map((id) => key(z.id, id)))).toEqual(
        links(data.items, (i) => i.specialZoneIds.map((id) => key(id, i.id))),
      );
    });

    it('Area.monsters and Monster.areas', () => {
      expect(links(data.areas, (a) => a.monsters.map((m) => key(a.id, m.monsterId, m.levels, m.areaLevel, m.boss)))).toEqual(
        links(data.monsters, (m) => m.areas.map((a) => key(a.areaId, m.id, a.levels, a.areaLevel, a.boss))),
      );
    });

    it('Monster.drops and Item.drops', () => {
      expect(links(data.monsters, (m) => m.drops.map((d) => key(m.id, d.itemId, d.quantity, d.rate)))).toEqual(
        links(data.items, (i) => i.drops.map((d) => key(d.monsterId, i.id, d.quantity, d.rate))),
      );
    });
  });
});
