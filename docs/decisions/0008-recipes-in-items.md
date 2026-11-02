# 0008 The recipes are part of the item page

Date: 2026-11-02
Decided by: owner
Status: accepted

## Context

[Decision 0001](0001-site-categories.md) gave the recipes their own page, as the game does. Each recipe makes exactly 1 item, so the recipe page repeated the item page. With filters on the item page ([decision 0007](0007-clear-data-and-filters.md)), the owner said: "I'm not sure it makes sense to split recipes and items anymore, might make more sense to unify and have a filter, and for craftable items include an optional section with crafting info".

## Decision

- The site has no recipe page. The item page has the filter "Craftable".
- The detail of an item that a recipe makes has a section "Synthesis": the synthesis cost, the minimum alchemy level, the materials, the recipe value and the unlock.
- A link to a recipe is a link to the item that it makes.

This supersedes the separate recipe page of decision 0001. The other categories of decision 0001 stay.

Rejected: keep the separate recipe page. It repeats the item, and a filter finds the same items.

## Consequences

The rules are in `docs/requirements/site.md`, sections "Items" and "Synthesis". The site has 5 categories: Items, Research, Areas, Monsters and Characters.
