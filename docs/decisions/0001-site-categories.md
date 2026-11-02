# 0001 Categories of the website

Date: 2026-11-02
Decided by: owner
Status: accepted

## Context

The workbook has 5 sheets: Items, Recipes, Zones, Monsters and Characters. The owner wants a website for lookups, like Barrel Wisdom (https://barrelwisdom.com) for other Atelier games. Each recipe of the game makes exactly 1 item.

## Decision

The site has 1 category for each sheet: Items, Recipes, Areas (the Zones sheet), Monsters and Characters. Each category has a list page and 1 page for each entity.

Items and Recipes come first. Areas, Monsters and Characters come after them. Pages for the other data (recipe sets, research, main tasks) have the lowest priority.

Rejected options:

- 4 categories, with the recipe as a section of the item page. The game shows recipes and items on separate screens, so the site does the same.
- A pull request that adds Nelke to Barrel Wisdom. Only the maintainer sends pull requests to that repo. The site was in a rewrite in 2026, and the maintainer decides which games it covers.

## Consequences

The rule is in `docs/requirements/site.md`.
