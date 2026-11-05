# 0013 The approved prototype is the live site

Date: 2026-11-04
Decided by: owner
Status: accepted

## Context

The owner approved the layouts of the HTML prototype in `prototype/` on 2026-11-02. The live site was then rebuilt in Astro ([decision 0002](0002-stack.md)), page by page, from the written design. By 2026-11-04, 4 pages were live (Items, Areas, Monsters, Characters). The live pages did not match the approved prototype exactly, and no test compared them with it.

The Astro rebuild had 3 reasons:

1. Each entity has its own page at a stable URL.
2. The site builds from `data/` on each push, so a change of the game data goes onto the site.
3. A link check and a UI test run on each build.

The owner rejected all 3: the URL of each entity is not a real need, the game data does not change, and the build checks give the owner nothing.

## Decision

The live site is the approved prototype. The deploy workflow publishes the files of `prototype/` to GitHub Pages, as they are. The prototype keeps its `#/` routes and its data copy `prototype/data.js`.

Rejected options:

- Copy the HTML and CSS of the prototype into the Astro site, with a screenshot test against the prototype. It keeps a URL for each entity, which the owner does not need, at the cost of more agent work.
- Keep the Astro site and fix the differences that the owner names. The owner sees the differences first, then the fixes.

## Consequences

- This decision supersedes the site part of [decision 0002](0002-stack.md). The workbook and the model stay as they are.
- The requirement rows "Stable URLs" and "Links" are removed, and the other rows of `docs/requirements/site.md` take the prototype as their proof.
- The Astro package `packages/site/`, its UI test and its link check are removed.
- A change of the site is a change of `prototype/`.
