import type { UiIcon } from './ui-icon.js';

const ENTITY_ICONS = import.meta.glob<string>('../../../data/icons/128/*.png', { eager: true, query: '?url', import: 'default' });
const UI_ICONS = import.meta.glob<string>('./assets/ui/*.png', { eager: true, query: '?url', import: 'default' });

/** The prefix of the file name of a monster face, whose art does not fill its 128 px canvas. */
const MONSTER_FACE_PREFIX = 'monster_';
/** The prefix of the file name of a character face, whose art does not fill its 128 px canvas. */
const CHARACTER_FACE_PREFIX = 'npc_';

/**
 * Returns the URL of a game icon of an entity.
 * @param file - the file name in `data/icons/128/`
 * @returns the URL under the base path
 * @throws {Error} when no such icon exists
 * @sideEffects none
 */
export function entityIconUrl(file: string): string {
  const url = ENTITY_ICONS[`../../../data/icons/128/${file}`];
  if (url === undefined) throw new Error(`No icon file ${file} in data/icons/128/`);
  return url;
}

/**
 * Returns the URL of a UI icon of the game.
 * @param name - the icon
 * @returns the URL under the base path
 * @throws {Error} when the file is missing
 * @sideEffects none
 */
export function uiIconUrl(name: UiIcon | `favc-${number}`): string {
  const url = UI_ICONS[`./assets/ui/${name}.png`];
  if (url === undefined) throw new Error(`No UI icon ${name}`);
  return url;
}

/**
 * Returns the CSS class that crops the empty margin of a face icon, or an empty string for any other icon.
 * @param file - the file name of the icon
 * @returns the class name
 * @sideEffects none
 */
export function iconCropClass(file: string): string {
  if (file.startsWith(MONSTER_FACE_PREFIX)) return 'crop-monster';
  if (file.startsWith(CHARACTER_FACE_PREFIX)) return 'crop-character';
  return '';
}
