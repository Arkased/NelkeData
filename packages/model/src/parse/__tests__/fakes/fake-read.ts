import type { ReadTable } from '../../xml.js';

// Reads fake tables by file name and parses each row with the schema of the loader.
export function fakeRead(tables: Record<string, Record<string, string>[]>): ReadTable {
  return (rel, schema) => (tables[rel] ?? []).map((row) => schema.parse(row));
}
