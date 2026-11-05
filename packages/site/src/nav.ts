import { UiIcon } from './ui-icon.js';

/** A link of the header to a category page. */
export interface CategoryLink {
  key: string;
  label: string;
  /** The path of the page below the base path. */
  path: string;
  icon: UiIcon;
}

/** The category pages that exist, in the order Items, Areas, Monsters, Characters, Research. Each page item adds its row. */
export const CATEGORY_LINKS: readonly CategoryLink[] = [{ key: 'items', label: 'Items', path: '', icon: UiIcon.CategoryItems }];
