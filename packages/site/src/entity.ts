import { pageUrl } from './url.js';

/** The kinds of entity that the site mentions. */
export enum EntityKind {
  Item = 'item',
  Zone = 'zone',
  Area = 'area',
  Monster = 'monster',
  Character = 'character',
  Research = 'research',
}

/** The kinds that have a page, with the folder of their pages under the base path. A page item adds its kind here. */
const PAGE_FOLDERS: Partial<Record<EntityKind, string>> = {
  [EntityKind.Item]: 'items/',
};

/**
 * Returns the URL of the page of an entity.
 * @param kind - the kind of the entity
 * @param slug - the slug of the entity
 * @returns the URL under the base path, or null when the kind has no page
 * @sideEffects none
 */
export function entityUrl(kind: EntityKind, slug: string): string | null {
  const folder = PAGE_FOLDERS[kind];
  return folder === undefined ? null : pageUrl(`${folder}${slug}/`);
}
