# Website

The files, the scripts and the deploy workflow of the website. The website is the folder `prototype/`. It is a static site. It has no build step.

## Files of `prototype/`

| File or folder | Holds |
| --- | --- |
| `index.html` | The page shell. It loads `style.css`, `data.js` and `app.js` with relative URLs. |
| `app.js` | All the code of the site, in 1 function that runs at once. It has the 5 views (Items, Areas, Monsters, Characters, Research) and the About page. It has the hash router, the filters, and the modal. |
| `data.js` | The game data. It sets `window.DATA` with the keys `items`, `zones`, `monsters`, `chars`, `research` and `trees`. |
| `style.css` | All the styles. It has 4 `@font-face` rules and the media queries at 600, 640, 768 and 1200 px. |
| `fonts/` | The WOFF2 files of Lora (400 and 700) and Source Sans 3 (400 and 700), and the 2 LICENSE files. |
| `img/ui/` | The images of the interface (50 files): navigation, shop, category, friendship, coin and cost icons. |
| `img/icons/` | The icons of the game entities (491 files). |
| `package.json`, `package-lock.json` | The dependencies of the scripts. They are not part of the site. |
| `scripts/` | The scripts for the UI test and the screenshots. |
| `shots/` | The output of `shots.mjs`. Git ignores it. |

The site uses only relative URLs. The route of a page is in the hash: `#/items`, `#/items/<game ID>`, `#/areas/<ID>`, `#/monsters`, `#/characters/<ID>`, `#/research/<tree>` and `#/research/<tree>/<ID>`. A filter is in the query of the hash, for example `#/items?cat=...`.

## Contents of `data.js`

| Key | Value |
| --- | --- |
| `items` | An array of 296 items. |
| `zones` | An array of 8 zones. Each zone holds its areas. |
| `monsters` | An object of 43 monsters. |
| `chars` | An array of 130 characters. |
| `research` | An object of 82 researches. |
| `trees` | 4 trees: `main`, `attack`, `support` and `emergency`. Each tree has the grids `res` and `con` of 20 columns. |

No script makes `data.js` now. The script `prototype/scripts/build-data.ts` made it. Commit `fda0f57` deleted that script. The file `data.js` is edited as is. It can be different from `data/*.json`.

## Scripts of `prototype/scripts/`

| Script | Command | Does |
| --- | --- | --- |
| `lib.mjs` | none | Code that the other scripts share: it starts Chromium, opens a page, waits until the page is stable, and runs the DOM audit. |
| `test.mjs` | `node test.mjs [widths]` | The UI test. It opens `prototype/index.html` as a `file://` URL. `widths` is a list that is separated by commas. The default is `360,768,1280,1920`. It runs each width in its own browser context at the same time. It fails on a failed check, on an audit finding or on a console message. |
| `shots.mjs` | `node shots.mjs [widths] [states]` | It writes screenshots to `prototype/shots/`. |

To set up, run `npm install` in `prototype/`. The root `@playwright/test` also gives `playwright` to the scripts. `lib.mjs` has the path of the Chromium file of 1 machine (`chromium-1232`). Change that path on other machines. The tests are not part of `npm run check` and not part of the CI.

## Deploy workflow

The file is `.github/workflows/site.yml`.

| Item | Value |
| --- | --- |
| Triggers | A push to `main` that changes `prototype/**` or `.github/workflows/site.yml`. A manual run (`workflow_dispatch`). |
| Permissions | `contents: read`, `pages: write`, `id-token: write` |
| Concurrency | Group `pages`. `cancel-in-progress` is `false`. |
| Runner | `ubuntu-latest` |
| Environment | `github-pages` |
| Step 1 | `actions/checkout@v7.0.1` |
| Step 2 | Copy `index.html`, `app.js`, `data.js`, `style.css`, `fonts/` and `img/` to `_site/`. |
| Step 3 | `actions/upload-pages-artifact@v5.0.0` with the path `_site` |
| Step 4 | `actions/deploy-pages@v5.0.1` |
| Pages source | GitHub Actions |
| Live URL | `https://arkased.github.io/NelkeData/` |

The workflow does not install Node, does not build and does not test. A new file that `index.html` or `style.css` loads must be added to the copy step.
