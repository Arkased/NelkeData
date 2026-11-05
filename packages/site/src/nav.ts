import { UiIcon } from './ui-icon.js';

/** The category pages of the site, as the header marks the current one. */
export enum CategoryKey {
  Items = 'items',
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
export const CATEGORY_LINKS: readonly CategoryLink[] = [{ key: CategoryKey.Items, label: 'Items', path: '', icon: UiIcon.CategoryItems }];
