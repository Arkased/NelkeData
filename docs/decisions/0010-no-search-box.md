# 0010 The site has no search box

Date: 2026-11-02
Decided by: owner
Status: accepted

## Context

The prototype had a search box on the Items, Monsters, Characters and Areas pages. It matched the English and the Japanese names, hid the tiles that did not match, and kept the text in the URL. Each tile shows its English name, so the find command of the browser (Ctrl+F) finds a name on the page. It also works together with the filters: for example, select "Craftable", then find "bomb".

## Decision

Remove the search box from all pages. The player uses the filters and the find command of the browser.

Rejected option: keep the search box. Its only gains over the find command are the Japanese names, which few players of the English site need, and a shorter grid. It costs code, a test and space in the filter panel.

## Consequences

The row "Search" is removed from `docs/requirements/site.md`. The search box is removed from the shared parts, the category pages and the Areas page of `docs/design/site.md`. The empty state of a category page now clears the filters.
