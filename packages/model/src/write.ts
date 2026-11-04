import fs from 'node:fs';
import path from 'node:path';
import { DATA_FILES, ICON_DIR, type ModelData } from './schema/index.js';

/**
 * Writes the entities and the icons to the data folder. Each file holds the entities of 1 kind, sorted by ID, as JSON with 2 spaces of indent and a final newline. The same input always gives the same bytes.
 * @param dataDir - the data folder
 * @param data - the entities
 * @param icons - maps each icon file name to its PNG data
 * @sideEffects creates the folders; writes the JSON files and the icon files; deletes the icon files that no entity names
 */
export function writeData(dataDir: string, data: ModelData, icons: ReadonlyMap<string, Buffer>): void {
  fs.mkdirSync(path.join(dataDir, ICON_DIR), { recursive: true });
  for (const kind of Object.keys(DATA_FILES) as (keyof ModelData)[]) {
    const sorted = data[kind].toSorted((a, b) => a.id - b.id);
    fs.writeFileSync(path.join(dataDir, DATA_FILES[kind]), `${JSON.stringify(sorted, null, 2)}\n`);
  }
  const iconDir = path.join(dataDir, ICON_DIR);
  for (const file of fs.readdirSync(iconDir)) {
    if (!icons.has(file)) fs.rmSync(path.join(iconDir, file));
  }
  for (const [name, png] of icons) fs.writeFileSync(path.join(iconDir, name), png);
}
