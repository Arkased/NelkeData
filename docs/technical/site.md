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
| `astro.config.mjs` | `site`, `base`, `trailingSlash` and the static output. |
| `src/url.ts` | `pageUrl(path)`: the URL of a page under the base path. The only place that adds the base path. |
| `src/categories.ts` | The list of the category pages that exist: label, path and icon, in the order of the header. |
| `src/styles/global.css` | The CSS custom properties (colors, spacing, text sizes, radii), `scrollbar-gutter: stable` on the root element, and the base rules. |
| `src/layouts/Base.astro` | The `<html>` element, the fonts, the global CSS, the header, the `<main>` slot and the footer. Props: `title` (the page name, or none for the root page). |
| `src/components/Header.astro` | The site name, the tagline and the category links of `src/categories.ts`. |
| `src/components/Footer.astro` | The legal notice. |
| `src/pages/index.astro` | The root page. |
| `scripts/check-links.ts` | The link check of `dist/`. |
| `../../__tests__/site.spec.ts` | The UI test (Playwright). |
| `../../.github/workflows/site.yml` | The deploy workflow. |

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
| Pages source | GitHub Actions (`build_type: workflow`) |
| Live URL | `https://arkased.github.io/NelkeData/` |
