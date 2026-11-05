import { hasCharacterPage } from './characters.js';
import { data } from './data.js';
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
  [EntityKind.Area]: 'areas/',
  [EntityKind.Zone]: 'zones/',
  [EntityKind.Monster]: 'monsters/',
  [EntityKind.Character]: 'characters/',
};

/** The slugs of the characters that have a page: the same rule as the page list of `pages/characters/[slug].astro`. */
const CHARACTER_PAGE_SLUGS: ReadonlySet<string> = new Set(data.characters.filter(hasCharacterPage).map((c) => c.slug));

/**
 * Tells whether an entity of a kind with pages has its own page. A kind with a rule of its own adds it here.
 * @param kind - the kind of the entity
 * @param slug - the slug of the entity
 * @returns false for a character with no join event, true for each other entity
 * @sideEffects none
 */
function hasPage(kind: EntityKind, slug: string): boolean {
  return kind === EntityKind.Character ? CHARACTER_PAGE_SLUGS.has(slug) : true;
}

/**
 * Returns the URL of the page of an entity.
 * @param kind - the kind of the entity
 * @param slug - the slug of the entity
 * @returns the URL under the base path, or null when the kind has no page or the entity has none
 * @sideEffects none
 */
export function entityUrl(kind: EntityKind, slug: string): string | null {
  const folder = PAGE_FOLDERS[kind];
  return folder === undefined || !hasPage(kind, slug) ? null : pageUrl(`${folder}${slug}/`);
}
