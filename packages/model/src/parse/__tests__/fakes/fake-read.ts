import type { ReadTable } from '../../xml.js';

/**
 * Reads fake tables by file name and parses each row with the schema of the loader.
 *
 * @param tables - the rows of each fake table, by file name
 * @returns a table reader that serves the fake tables
 * @sideEffects none
 */
export function fakeRead(tables: Record<string, Record<string, string>[]>): ReadTable {
  return (rel, schema) => (tables[rel] ?? []).map((row) => schema.parse(row));
}
