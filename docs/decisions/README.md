# Decisions

1 record for each decision. A record is for reference: the rule that it makes goes into the layer doc, `docs/code-standard.md`, a skill or `CLAUDE.md`.

## Format

The file is `docs/decisions/<NNNN>-<slug>.md`. `<NNNN>` is a 4-digit number: the highest number plus 1.

```
# <NNNN> <Title>

Date: <yyyy-mm-dd>
Decided by: owner | orchestrator
Status: accepted | superseded by <NNNN>

## Context

The facts that made the decision necessary.

## Decision

What was decided, and the options that were rejected, with the reason for each.

## Consequences

Where the rule now lives, and what changed.
```

A decision that replaces an earlier one sets the status of the earlier record to `superseded by <NNNN>`.

## Index

| Number | Title | Status |
| ------ | ----- | ------ |
| [0001](0001-site-categories.md) | Categories of the website | accepted |
| [0002](0002-stack.md) | Stack and package layout | accepted |
| [0003](0003-data-in-git.md) | The generated data is in git | accepted |
| [0004](0004-game-ui-style.md) | The site uses the UI of the game | superseded by 0009 |
| [0005](0005-icon-grids.md) | Icon grids, no spreadsheet look | accepted |
| [0006](0006-areas-by-zone.md) | The areas page groups the areas by zone | accepted |
| [0007](0007-clear-data-and-filters.md) | Clear data first, and filters instead of tabs | accepted |
| [0008](0008-recipes-in-items.md) | The recipes are part of the item page | accepted |
| [0009](0009-own-look.md) | The site has its own look, with the game icons | accepted |
| [0010](0010-no-search-box.md) | The site has no search box | accepted |
