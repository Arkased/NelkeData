/** The IDs of the entities of 1 kind, to keep only the links that name an entity that the model holds. */
export type IdSet = ReadonlySet<string>;

/**
 * Collects the IDs of the rows of 1 game table.
 * @param rows - the rows
 * @param id - returns the ID field of a row
 * @returns the set of IDs
 * @sideEffects none
 */
export function idSet<T>(rows: readonly T[], id: (row: T) => string): IdSet {
  return new Set(rows.map(id));
}
