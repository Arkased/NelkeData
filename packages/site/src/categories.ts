/** A category page of the site, as the header links to it. */
export interface Category {
  label: string;
  /** The path below the base, for `pageUrl`. */
  path: string;
  /** The path of the game icon below the base. */
  icon: string;
}

/** The category pages that exist, in the order of the header. */
export const categories: Category[] = [];
