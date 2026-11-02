# 0005 Icon grids, no spreadsheet look

Date: 2026-11-02
Decided by: owner
Status: accepted

## Context

The first layouts had tiles with text, a filter bar with a sort menu, and details with rows of labels and values and tables. The owner does not want the pages structured as lists or tables.

## Decision

- A category page is a grid of game icons in the order of the game. Tabs with the game categories and a search box filter it. There is no sort menu.
- The name of an icon shows on hover and on focus.
- A detail is a composed game panel: for example a name plate, a rank letter, element icons and material slots. No rows of labels and values, and no tables.

Rejected options:

- Keep the tile grid with search, filters and sort, and change only the details. The owner rejected the spreadsheet look everywhere.
- No category pages, with navigation through links and search only. A grid of icons is how the game shows its items.

## Consequences

The rules are in `docs/requirements/site.md`, rows "No spreadsheet look", "Icon grid and modal", "Search" and "Tabs". The design is in `docs/design/site.md`.
