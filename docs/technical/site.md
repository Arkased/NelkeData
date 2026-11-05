# Website

The files, the commands and the limits of the website. The design is in [docs/design/site.md](../design/site.md), section "Build and deploy".

## Package

| Item | Value |
| --- | --- |
| Name | `@nelke/site` |
| Folder | `packages/site/` |
| Framework | Astro, static output (`output: 'static'`), 1 exact version |
| `site` | `https://arkased.github.io` |
| `base` | `/NelkeData/` |
| `trailingSlash` | `'always'` |
| Output | `packages/site/dist/` (ignored by git) |
| Fonts | `@fontsource/lora` (weight 700) and `@fontsource/source-sans-3` (weights 400 and 700), latin subset, WOFF2 only |

## Files

| File | Holds |
| --- | --- |
| `src/base.ts` | The site origin and the base path. The only place that holds them. |
| `astro.config.ts` | `site` and `base` (both from `src/base.ts`), `trailingSlash` and the static output. |
| `src/url.ts` | `pageUrl(path)`: the URL of a page under the base path (`BASE_PATH`, so the UI test can import it). The only place that adds the base path. |
| `src/styles/global.css` | The CSS custom properties (colors, spacing, text sizes, radii), `scrollbar-gutter: stable` on the root element, and the base rules. |
| `src/styles/detail.css` | The CSS of the entity detail panel (top block, stats, groups), which the entity page and the modal share. |
| `src/layouts/Base.astro` | The `<html>` element, the fonts, the global CSS and `detail.css`, the header, the `<main>` slot, the footer and the modal. |
| `src/components/Header.astro` | The site name, the tagline, the links to the category pages (current one marked) and the menu button below 600 px. |
| `src/components/Footer.astro` | The legal notice and the link "About" to `pageUrl('about/')`. A prop of the layout leaves both out on the About page. |
| `src/components/Section.astro` | 1 section: the prop `title` as a section title (`h2.section-title`), then the default slot for the content. |
| `src/pages/index.astro` | The root page. |
| `src/pages/about.astro` | The About page at `/NelkeData/about/`, with the title `About · Westwald Archive`. 1 panel with the sections Contact, Source and Legal. The legal notice text is 1 constant, which the footer and this page share. |
| `src/data.ts` | `readData()` of `@nelke/model` on the `data/` folder of the repo, 1 time for each build, and the lookups by ID. |
| `src/pages/items/[slug].astro` | The page of each item (`getStaticPaths` from the items of `data/`), with the title `<item name> · Westwald Archive`. |
| `src/pages/monsters/index.astro` | The Monsters page at `/NelkeData/monsters/`, with the title `Monsters · Westwald Archive`, and the filter "Type" (`type` in the query; the toggles have no icon). |
| `src/pages/monsters/[slug].astro` | The page of each monster (`getStaticPaths` from the monsters of `data/`), with the title `<monster name> · Westwald Archive`. |
| `src/components/MonsterDetail.astro` | The monster detail: the type, the element DEF line, the description, the drops and "Found in". |
| `src/components/AreaEntry.astro` | 1 area entry (design "Area entry"): the name as an entity link, under it the zone name in the small label size, and 1 badge. Without the prop `zone` it is a zone entry with no zone line. The Gather and Special spots groups of the item detail and "Found in" of the monster detail use it. |
| `src/appearances.ts` | `mergeLevels(rows, idOf)`: merges the rows of the same area or zone (1 row for each boss flag) into 1 entry with all levels. |
| `src/element-items.ts` | `ELEMENT_ITEM_IDS`: the item of each element, whose icon is the element icon (the item detail and the monster detail share it). |
| `src/components/` | 1 component for each shared part (`Filters`, `IconGrid`, `Modal`, `EntityLink`, `EntityPage`, `Tile`, `Section`, `Group`, `Icon`, `Money`, `SynthesisCost`, `Friendship`, `Stat`) and `ItemDetail`. |
| `src/entity.ts` | `EntityKind` and `entityUrl(kind, slug)`: the URL of an entity page, or null for a kind with no page and for an entity with no page (a character with no join event, by the rule of `hasCharacterPage`). The tile and the link need no extra argument. |
| `src/nav.ts` | `CategoryKey` and `CATEGORY_LINKS`: the category pages of the header, with label, path and icon. `NAV_BREAKPOINT`: the width from which the header shows the links (`Header.astro` has the same value in its media query; the UI test uses the constant). |
| `src/icons.ts` | The URL of a game icon of an entity (`data/icons/128/`) or of a UI icon (`assets/ui/`), and the crop class of a face icon. |
| `src/ui-icon.ts` | `UiIcon`: the names of the UI icons of the game that carry data. |
| `src/format.ts` | `formatNumber` and `formatRate`: the number and percent text of the site. |
| `src/item-filters.ts` | The item categories and shops of the filter with their icons, and the category of an item for the filter and for its icon. It uses `ItemCategoryName` of `@nelke/model` directly, with no lookup from a name back to an ID. |
| `src/characters.ts` | `CharacterGroup` (Alchemist, Townsfolk), `groupOf`, `hasCharacterPage` (a join event is not null), and the constants of the join rules: `GAME_START_EVENT_ID`, `START_POPULATION` (`OC_INITIAL_POPULATION`, 30) and `START_TURN`. |
| `src/pages/characters/index.astro` | The Characters page at `/NelkeData/characters/`: the Group filter and the grid of the characters with a page. |
| `src/pages/characters/[slug].astro` | The page of each character with a join event, with the title `<character name> · Westwald Archive`. |
| `src/components/CharacterDetail.astro` | The detail of a character: top block, description, Skills, Joins the town and Teaches. |
| `src/stat-tone.ts` | `StatTone`: the tones (good, bad) of the value of a stat. |
| `src/assets/ui/` | The UI icons of the game (category, shop, coin, cost, friendship) and the header icons (`nav-characters.png`) as PNG files. |
| `src/scripts/` | The client scripts: the filters (the state in the query of the URL) and the modal (fetch of the entity page, `history.pushState`, Back, Esc, focus). |
| `scripts/check-links.ts` | The link check of `dist/`. |
| `../../__tests__/site.spec.ts` | The UI test (Playwright). |
| `../../.github/workflows/site.yml` | The deploy workflow. |

The merge of the level rows of a monster is `mergeLevels<T extends LeveledRow>(rows: readonly T[], idOf: (row: T) => string): LeveledEntry[]` in `src/appearances.ts`. `LeveledRow` (`levels`) and `LeveledEntry` (`id`, `levels`) are named interfaces with JSDoc. No type in the file is an inline object type.

The `.ts` files of the package are in `tsc -b`. `astro check` checks the `.astro` files as part of `npm run site:build`. ESLint checks the `.astro` files with `eslint-plugin-astro`. Prettier formats them with `prettier-plugin-astro`.

## Scripts

| Script | Does |
| --- | --- |
| `npm run site:dev` | Starts the Astro dev server. |
| `npm run site:build` | `astro check`, then `astro build`, then the link check. Exits with 1 when a step fails. |
| `npm run site:test` | Runs the UI test against `astro preview` of the built `dist/`. Needs `site:build` first. |

## Link check

- Input: each `.html` file under `dist/`.
- It reads each `href` of `<a>` and `<link>`, and each `src` of `<img>` and `<script>`, that starts with `/NelkeData/`.
- The target of a URL that ends with `/` is `<path>index.html`. The target of any other URL is the file at its path. The check removes the base path, the query and the fragment first.
- Output: 1 line `<page file>: <url>` for each URL with no target, and exit code 1. Exit code 0 when each URL has a target.

## Deploy workflow

| Item | Value |
| --- | --- |
| File | `.github/workflows/site.yml` |
| Triggers | `push` to `main` with the paths `data/**`, `packages/site/**` and `.github/workflows/site.yml`; `workflow_dispatch` |
| Permissions | `contents: read`, `pages: write`, `id-token: write` |
| Concurrency | group `pages`, `cancel-in-progress: false` |
| Steps | `actions/checkout`, `actions/setup-node` (Node 24, npm cache), `npm ci`, `npx playwright install --with-deps chromium`, `npm run site:build`, `npm run site:test`, `actions/upload-pages-artifact` (path `packages/site/dist`), `actions/deploy-pages` |
| Action versions | Each action is pinned to 1 exact release tag, for example `v7.0.1`, not a major tag. |
| Pages source | GitHub Actions (`build_type: workflow`) |
| Live URL | `https://arkased.github.io/NelkeData/` |
