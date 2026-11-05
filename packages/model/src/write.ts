import fs from 'node:fs';
import path from 'node:path';
import { DATA_FILES, ICON_DIR } from './files.js';
import type { ModelData } from './schema/index.js';

/**
 * Writes the entities and the icons to the data folder. Each file holds the entities of 1 kind in the order of the game table, as JSON with 2 spaces of indent and a final newline. The same input always gives the same bytes.
 * @param dataDir - the data folder
 * @param data - the entities
 * @param icons - maps each icon size to its PNG data by file name; the files go to icons/<size>/
 * @sideEffects creates the folders; writes the JSON files and the icon files; deletes the icon files that no entity names
 */
export function writeData(dataDir: string, data: ModelData, icons: ReadonlyMap<number, ReadonlyMap<string, Buffer>>): void {
  fs.mkdirSync(path.join(dataDir, ICON_DIR), { recursive: true });
  for (const kind of Object.keys(DATA_FILES) as (keyof ModelData)[]) {
    fs.writeFileSync(path.join(dataDir, DATA_FILES[kind]), `${JSON.stringify(data[kind], null, 2)}\n`);
  }
  for (const [size, images] of icons) {
    const iconDir = path.join(dataDir, ICON_DIR, String(size));
    fs.mkdirSync(iconDir, { recursive: true });
    for (const file of fs.readdirSync(iconDir)) {
      if (!images.has(file)) fs.rmSync(path.join(iconDir, file));
    }
    for (const [name, png] of images) fs.writeFileSync(path.join(iconDir, name), png);
  }
}
