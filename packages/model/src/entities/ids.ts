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

/**
 * Drops the links that name a placeholder entity, so no link to a dropped row reaches the inverse function.
 * @param links - the links of 1 source
 * @param id - returns the ID of the entity that a link names
 * @param placeholderIds - the IDs of the dropped placeholder entities
 * @returns the links that name an entity that is not a placeholder, in the same order
 * @sideEffects none
 */
export function withoutPlaceholders<T>(links: readonly T[], id: (link: T) => string, placeholderIds: ReadonlySet<string>): T[] {
  return links.filter((link) => !placeholderIds.has(id(link)));
}
