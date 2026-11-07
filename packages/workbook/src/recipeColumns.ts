import type { Item, Recipe, RecipeSet, Research } from '@nelke/model';
import { required, type Lookup } from './lookup.js';
import { iconColumn, type Column } from './sheet.js';
import { KeyHeader } from './sheetKeys.js';

/** How a recipe is unlocked, through the first recipe set that holds it. */
interface Unlock {
  set: RecipeSet;
  research: Research | undefined;
}

/**
 * Builds the columns of the Recipes sheet.
 * @param lookup - the entities by ID
 * @returns the columns
 * @sideEffects none
 */
export function recipeColumns(lookup: Lookup): Column<Recipe>[] {
  const resultOf = (r: Recipe): Item => required(lookup.items, r.resultItemId);
  const unlockOf = (r: Recipe): Unlock | undefined => {
    const setId = r.recipeSetIds[0];
    if (setId === undefined) return undefined;
    const set = required(lookup.recipeSets, setId);
    return { set, research: set.researchId === null ? undefined : required(lookup.research, set.researchId) };
  };
  const prereqs = (research: Research): string => {
    const parts = research.prerequisiteIds.map((id) => required(lookup.research, id).name);
    if (research.district !== null) parts.push(`District: ${research.district}`);
    return parts.join(', ');
  };
  const materialColumns = ([1, 2, 3, 4] as const).flatMap((n): Column<Recipe>[] => [
    {
      header: `Material ${n}`,
      width: 22,
      get: (r) => {
        const m = r.materials[n - 1];
        return m === undefined ? '' : required(lookup.items, m.itemId).name;
      },
    },
    { header: `Qty ${n}`, width: 6, get: (r) => r.materials[n - 1]?.quantity ?? '' },
  ]);
  return [
    iconColumn((r) => resultOf(r).icon ?? ''),
    { header: KeyHeader.Item, width: 28, get: (r) => resultOf(r).name },
    { header: 'Category', width: 14, get: (r) => resultOf(r).category },
    { header: 'Sub-category', width: 18, get: (r) => resultOf(r).subCategory ?? '' },
    { header: 'Rank', width: 7, get: (r) => resultOf(r).rank },
    { header: 'Price', width: 9, get: (r) => resultOf(r).price },
    { header: 'Synthesis Cost', width: 10, get: (r) => r.synthesisCost },
    { header: 'Cumulative Synth Cost', width: 12, get: (r) => r.cumulativeSynthesisCost },
    { header: 'Value / Cumulative Synth Cost', width: 14, get: (r) => r.valuePerCumulativeSynthesisCost ?? '' },
    ...materialColumns,
    { header: 'Recipe Set', width: 24, get: (r) => unlockOf(r)?.set.name ?? '' },
    {
      header: 'Taught By',
      width: 12,
      get: (r) => {
        const teacherId = unlockOf(r)?.set.teacherId;
        return teacherId === undefined || teacherId === null ? '' : required(lookup.characters, teacherId).name;
      },
    },
    { header: 'Friendship Lv', width: 9, get: (r) => unlockOf(r)?.set.friendship ?? '' },
    { header: 'Research', width: 26, get: (r) => unlockOf(r)?.research?.name ?? '' },
    {
      header: 'Researcher',
      width: 12,
      get: (r) => {
        const researcherId = unlockOf(r)?.research?.researcherId;
        return researcherId === undefined || researcherId === null ? '' : required(lookup.characters, researcherId).name;
      },
    },
    {
      header: 'Research Prereqs',
      width: 30,
      get: (r) => {
        const research = unlockOf(r)?.research;
        return research ? prereqs(research) : '';
      },
    },
    { header: 'Unlock Event', width: 36, get: (r) => unlockOf(r)?.set.unlockEvent?.label ?? '' },
  ];
}
