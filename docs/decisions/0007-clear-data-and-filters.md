# 0007 Clear data first, and filters instead of tabs

Date: 2026-11-02
Decided by: owner
Status: accepted

## Context

The first HTML prototype (#11) drew each UI element with a game texture, and filtered the items with 1 tab for each game category. The owner reviewed it and said: "I don't think literally EVERY UI element should be ripped from game assets, you should prioritize organized and clear representation of data. e.g. the recipe value is unclear". The owner also said that the categories should consider the shop that sells the item, and that a tab approach is perhaps not ideal: "Might want filters instead".

## Decision

- A clear and organized view of the data comes first. The site uses the game parts where they make the data clear: the panels, the name plates, the header bars, the icons and the friendship hearts. Where a game part makes the data harder to read, the site uses a plain element in the colors of the game.
- A category page has filters, not tabs. The filters of the items are the item category and the shop. 2 or more filters combine.
- The element items are not a separate category.
- Entities with placeholder data (for example the items with the name "Item 015") do not show on the site or in the workbook. The owner said: "the workbook does not need to be different".

This supersedes the rule of [decision 0004](0004-game-ui-style.md) that the site draws each part with a game texture, and the tabs of [decision 0005](0005-icon-grids.md). The icon grids, the game panels for the details and the rule of no tables stay.

Rejected: keep a game texture on each element. The owner found the result unclear.

## Consequences

The rules are in `docs/requirements/site.md`, rows "Game UI", "Filters", "Placeholder data", "Item detail" and "Recipe detail". The design is in `docs/design/site.md`. The prototype (#11) gets a second round.
