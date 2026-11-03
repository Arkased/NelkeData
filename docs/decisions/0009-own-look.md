# 0009 The site has its own look, with the game icons

Date: 2026-11-02
Decided by: owner
Status: accepted

## Context

The prototype draws its panels, name plates, header bars, buttons, tabs and page background with the UI textures of the game ([decision 0004](0004-game-ui-style.md)). Koei Tecmo gives no permission for a fan data site, and it enforces its rights, most of all when a fan work can harm the image of a product or pass for an official one. A site in the game's own UI looks more official than a fan site with its own look. [Barrel Wisdom](https://barrelwisdom.com/blog/legal), a fan site for Gust games since 2021, uses the game icons with its own design and a notice of no affiliation.

## Decision

- The layouts of the prototype stay.
- The site draws its frame parts (page background, panels, name plates, header bars, buttons, tabs, title bar) as plain elements in its own style, in the colors of the game. It uses no UI texture of the game for them.
- The site keeps the game icons that carry data: the icons of the items, the monsters, the characters and the shops, the category icons, the element icons, the money and synthesis cost icons, and the friendship heart with its digits.
- Each page has a notice of no affiliation (requirement "Legal notice").

Rejected: the game UI textures, because they make the site look official. No game images at all, because the icons make the data easy to find and the model of Barrel Wisdom shows that they are tolerated.

## Consequences

This supersedes [decision 0004](0004-game-ui-style.md) and the rule of [decision 0007](0007-clear-data-and-filters.md) that the details are game panels. The rules are in `docs/requirements/site.md`, row "Game UI", and `docs/design/site.md`, section "Visual style". The prototype (#11) gets a round with the new style.
