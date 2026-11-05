import { UiIcon } from './ui-icon.js';

/**
 * The window width in px from which the header shows the links of the pages; below it, they are behind the Menu button.
 * CSS cannot read a constant in a media query: `Header.astro` has the same value as `max-width: NAV_BREAKPOINT - 1`.
 */
export const NAV_BREAKPOINT = 600;

/** The category pages of the site, as the header marks the current one. */
export enum CategoryKey {
  Items = 'items',
  Areas = 'areas',
}

/** A link of the header to a category page. */
export interface CategoryLink {
  key: CategoryKey;
  label: string;
  /** The path of the page below the base path. */
  path: string;
  icon: UiIcon;
}

/** The category pages that exist, in the order Items, Areas, Monsters, Characters, Research. Each page item adds its row. */
export const CATEGORY_LINKS: readonly CategoryLink[] = [
  { key: CategoryKey.Items, label: 'Items', path: '', icon: UiIcon.CategoryItems },
  { key: CategoryKey.Areas, label: 'Areas', path: 'areas/', icon: UiIcon.CategoryAreas },
];
