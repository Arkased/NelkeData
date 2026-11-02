# 0002 Stack and package layout

Date: 2026-11-02
Decided by: owner (TypeScript, GitHub Pages, a separate workbook generator), orchestrator (the rest)
Status: accepted

## Context

The code was 4 CommonJS files in `tools/`. `tools/build.js` read the game files and wrote the workbook in 1 module. The new website needs the same data with IDs and links. The owner asked for these 3 things:

- TypeScript.
- A workbook generator that is separate from the rest.
- A site that the project builds itself and hosts on GitHub Pages.

## Decision

- TypeScript in ESM, in npm workspaces under `packages/`. `tsx` runs the scripts.
- 1 package for each concern: `extract` (the game archives and textures), `model` (the entities and their links, written to `data/`), `workbook` (the xlsx file) and `site` (the website).
- The workbook and the site read only `data/`. They do not read the game files.
- The site is a static Astro site on GitHub Pages.
- Vitest for the tests. ESLint with typescript-eslint and eslint-plugin-jsdoc for the lint. Prettier for the format.

Rejected options:

- Node's own type stripping in place of `tsx`. It does not support `enum`, and the code standard requires string enums.
- A static site generator that is only a script with template strings. Templates by hand for about 740 pages with links are hard to keep correct. Astro gives components, a dev server and routes.
- A site with a server. The data changes only when the game changes, so static pages are enough.

## Consequences

The rules are in `docs/code-standard.md`, sections 5 to 7. The layout is in `docs/design/tooling.md`.
