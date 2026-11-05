/** An entity with the levels of all its rows. */
export interface LeveledEntry {
  /** The ID of the entity. */
  id: string;
  /** The levels of all the rows of the entity. */
  levels: number[];
}

/**
 * Merges the rows of the same entity into 1 entry with all their levels.
 * @param rows - rows with levels, where an entity may have more than 1 row (for example 1 for each boss flag)
 * @param idOf - the ID of the entity of a row
 * @returns 1 entry for each entity, in the order of its first row, with the levels of all its rows (the lowest to the highest give the range)
 * @sideEffects none
 */
export function mergeLevels<T extends { levels: readonly number[] }>(rows: readonly T[], idOf: (row: T) => string): LeveledEntry[] {
  const merged = new Map<string, number[]>();
  for (const row of rows) {
    const id = idOf(row);
    merged.set(id, [...(merged.get(id) ?? []), ...row.levels]);
  }
  return [...merged].map(([id, levels]) => ({ id, levels }));
}
