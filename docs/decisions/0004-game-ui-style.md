# 0004 The site uses the UI of the game

Date: 2026-11-02
Decided by: owner
Status: superseded by 0009

## Context

The first draft of the page layouts used plain web parts, with ASCII wireframes. The owner rejected the look and asked that the site copy the UI parts of the game as much as possible. The owner approved the research tree layout, which already copies the grid of the game.

The game files hold the UI parts as textures. `20th_window.g1t` has 6 atlases with the panels, frames, header bars, name plates, buttons, tabs, the category icons, the rank letters and a notebook page. `extracted/saves/ui/gen_styles/uis_gen_20th_window.xml` gives the rectangle of each part (`uvwh`) and the borders for a 9-slice scale (`edge_margin`).

## Decision

- The site draws its panels, frames, header bars, tiles, tabs and buttons with the textures of the game. It uses CSS `border-image` with the rectangles and the borders of the `uis_gen_20th_*.xml` files.
- Where the game has a screen for the same data, the page copies the layout of that screen.
- The layouts are drafted as a prototype in HTML on real data, with the game textures. The owner approves the prototype before the site build. ASCII wireframes are not used.

Rejected: plain web parts with colors that look like the game. The owner wants the parts of the game itself.

## Consequences

The visual style is in `docs/design/site.md`, section "Visual style". The site base (#4) waits on the approval of the prototype.
