import { BASE_PATH } from './base.js';

/**
 * Returns the URL of a page under the base path of the site.
 * @param path - the path of the page below the base, for example `items/`, or an empty string for the root page
 * @returns the absolute path with the base path, ending with `/` for a page
 * @sideEffects none
 */
export function pageUrl(path: string): string {
  return BASE_PATH + path.replace(/^\/+/, '');
}
