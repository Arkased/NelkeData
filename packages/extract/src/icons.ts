import fs from 'node:fs';
import path from 'node:path';
import { g1tToPng } from './g1t.js';

/** The lists of icon textures that the game UI files define. */
export enum IconKind {
  Item = 'item',
  Npc = 'npc',
  Monster = 'monster',
}

const LIST_FILES: Record<IconKind, string> = {
  [IconKind.Item]: 'uis_20th_item_l.xml',
  [IconKind.Npc]: 'uis_20th_npc_faceicon.xml',
  [IconKind.Monster]: 'uis_20th_monster_faceicon.xml',
};

/** The icons of a game: a lookup that decodes each icon on first use, and the decoded PNG files. */
export interface IconSet {
  /** Returns the PNG file name of the icon, or '' when the texture is not extracted. */
  ref: (kind: IconKind, number: number) => string;
  /** Maps each PNG file name to its data. */
  images: Map<string, Buffer>;
}

/**
 * Creates an icon set. The UI style files (ui/etc/uis_20th_*.xml) list the textures in image number order.
 * @param savesDir - the extracted saves folder
 * @param dataDir - the extracted folder that holds x64/ui/*.g1t
 * @param size - the icon width in pixels
 * @returns the icon set
 * @sideEffects reads the UI style files from savesDir; reads a texture file from dataDir on the first use of its icon
 */
export function createIconSet(savesDir: string, dataDir: string, size: number): IconSet {
  const lists = new Map<IconKind, string[]>();
  for (const kind of Object.values(IconKind)) {
    const xml = fs.readFileSync(path.join(savesDir, 'ui', 'etc', LIST_FILES[kind]), 'utf8');
    lists.set(
      kind,
      [...xml.matchAll(/texture="ui\/([^"]+)"/g)].flatMap((m) => m[1] ?? []),
    );
  }
  const images = new Map<string, Buffer>();
  const missing = new Set<string>();
  const ref = (kind: IconKind, number: number): string => {
    const texture = lists.get(kind)?.[number];
    if (!texture || missing.has(texture)) return '';
    const name = texture.replace(/^20th_/, '').replace(/\.g1t$/, '.png');
    if (!images.has(name)) {
      const file = path.join(dataDir, 'x64', 'ui', texture);
      if (!fs.existsSync(file)) {
        missing.add(texture);
        return '';
      }
      images.set(name, g1tToPng(fs.readFileSync(file), size));
    }
    return name;
  };
  return { ref, images };
}
