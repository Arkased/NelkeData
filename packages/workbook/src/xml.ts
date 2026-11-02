import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/** Reads the rows of 1 game XML table (a path relative to the saves folder) and parses each row with a schema. */
export type ReadTable = <T>(rel: string, schema: z.ZodType<T>) => T[];

/**
 * Decodes the XML escapes of a game string, drops its markup tags and turns line breaks into spaces.
 * @param s - the attribute value as written in the XML file
 * @returns the plain text
 * @sideEffects none
 */
export function decodeXml(s: string): string {
  return s
    .replace(/&lt;CR&gt;/g, ' ')
    .replace(/&lt;[A-Z]+&gt;/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Reads every `<elem .../>` of a game XML text as a plain object of decoded attributes.
 * @param text - the XML file content
 * @returns one object per element, in file order
 * @sideEffects none
 */
export function parseElements(text: string): Record<string, string>[] {
  return [...text.matchAll(/<elem ([^>]*?)\/>/g)].map((m) =>
    Object.fromEntries([...(m[1] ?? '').matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1] ?? '', decodeXml(a[2] ?? '')])),
  );
}

/**
 * Builds the shape of a Zod object that requires each named field to be a string.
 * @param keys - the field names
 * @returns the shape, to spread into `z.object`
 * @sideEffects none
 */
export function stringShape<K extends string>(keys: readonly K[]): Record<K, z.ZodString> {
  const shape: Partial<Record<K, z.ZodString>> = {};
  for (const key of keys) shape[key] = z.string();
  return shape as Record<K, z.ZodString>;
}

/** A value that is not a member of the enum that its field expects. */
export interface UnknownValue {
  unknown: string;
}

/**
 * Builds a Zod schema for a field that holds a member of a string enum, and keeps any other value as an UnknownValue.
 * @param members - the string enum
 * @returns the schema
 * @sideEffects none
 */
export function enumOrUnknown<E extends Record<string, string>>(members: E): z.ZodType<E[keyof E] | UnknownValue> {
  return z.union([z.enum(members), z.string().transform((unknown): UnknownValue => ({ unknown }))]);
}

/**
 * Creates a table reader for the extracted saves folder.
 * @param savesDir - the extracted saves folder
 * @returns a function that reads and parses 1 table
 * @sideEffects the returned function reads a file from savesDir; it throws when a row does not match the schema
 */
export function createTableReader(savesDir: string): ReadTable {
  return (rel, schema) => {
    const text = fs.readFileSync(path.join(savesDir, rel), 'utf8');
    return parseElements(text).map((row) => schema.parse(row));
  };
}
