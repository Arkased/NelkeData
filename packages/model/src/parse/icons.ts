import { createIconSet, type IconKind } from '@nelke/extract';

/** The icons of a game in several sizes: a lookup that decodes each icon on first use, and the decoded PNG files. */
export interface Icons {
  /** Returns the PNG file name of the icon, the same in each size, or '' when the texture is not extracted. */
  ref: (kind: IconKind, number: number) => string;
  /** Maps each size to its PNG files by file name. */
  images: ReadonlyMap<number, ReadonlyMap<string, Buffer>>;
}

/**
 * Creates the icons of a game in each size.
 * @param savesDir - the extracted saves folder
 * @param dataDir - the extracted folder that holds x64/ui/*.g1t
 * @param sizes - the icon widths in pixels
 * @returns the icons
 * @sideEffects reads the UI style files from savesDir; reads a texture file from dataDir on the first use of its icon
 */
export function createIcons(savesDir: string, dataDir: string, sizes: readonly number[]): Icons {
  const sets = sizes.map((size) => ({ size, set: createIconSet(savesDir, dataDir, size) }));
  return {
    // Each size decodes its own copy; the file name is the same in each.
    ref: (kind, number) => sets.map(({ set }) => set.ref(kind, number))[0] ?? '',
    images: new Map(sets.map(({ size, set }) => [size, set.images])),
  };
}
