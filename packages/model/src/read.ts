import fs from 'node:fs';
import path from 'node:path';
import { DATA_FILES, modelSchema, type ModelData } from './schema/index.js';

/**
 * Reads the entities from the data folder and checks them against the schemas.
 * @param dataDir - the data folder
 * @returns the entities
 * @throws {Error} when a file is missing, is not JSON, or does not match its schema
 * @sideEffects reads the JSON files of the data folder
 */
export function readData(dataDir: string): ModelData {
  const raw = Object.fromEntries(
    Object.entries(DATA_FILES).map(([kind, file]) => {
      const text = fs.readFileSync(path.join(dataDir, file), 'utf8');
      return [kind, JSON.parse(text) as unknown];
    }),
  );
  return modelSchema.parse(raw);
}
