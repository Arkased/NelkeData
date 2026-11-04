import type { RowId } from '../parse/xml.js';

/** Maps the tag of a game row to the ID of its entity. */
export type IdMap = ReadonlyMap<string, number>;

/**
 * Makes the map from the tag of each row to its ID.
 * @param rows - the rows of 1 game table
 * @param tag - returns the tag of a row
 * @returns the map
 * @sideEffects none
 */
export function idMap<T extends RowId>(rows: readonly T[], tag: (row: T) => string): IdMap {
  return new Map(rows.map((row) => [tag(row), row.rowId]));
}
