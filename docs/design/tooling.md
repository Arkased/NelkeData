# Tooling and layout

How the code is split and checked. [Decision 0002](../decisions/0002-stack.md) asks for this design.

## Packages

The code is TypeScript in ESM, in npm workspaces. Each package holds 1 concern:

| Package | Folder | Concern | Reads | Writes |
| --- | --- | --- | --- | --- |
| `@nelke/extract` | `packages/extract/` | The PAK archives and the G1T textures of the game. | The game install | `extracted/` |
| `@nelke/model` | `packages/model/` | The entities, their IDs and their links in both directions. | `extracted/` | `data/` |
| `@nelke/workbook` | `packages/workbook/` | The xlsx workbook. | `data/` | `output/` |
| `@nelke/site` | `packages/site/` | The website. | `data/` | `packages/site/dist/` |

The flow is 1 direction only: game install → `extracted/` → `data/` → workbook and site. The workbook and the site do not depend on each other. They do not read the game files. So a change of the site cannot change the workbook, and the workbook builds with only `data/`.

The packages come in 3 steps:

1. The tooling item moves the code of `tools/` to TypeScript. `pak.js`, `g1t.js` and `icons.js` go to `@nelke/extract`. `build.js` goes to `@nelke/workbook` and is split by concern. In this step the workbook still reads `extracted/`.
2. The model item moves the parse and the joins out of `@nelke/workbook` into `@nelke/model`. After this step the workbook reads only `data/`.
3. The site item adds `@nelke/site`.

## Run and check

- `tsx` runs the scripts. Node's own type stripping does not support `enum`.
- `tsc -b` checks the types of all packages. Each package has its own `tsconfig.json` that extends `tsconfig.base.json`.
- ESLint uses the type-checked rules of typescript-eslint and the rules of eslint-plugin-jsdoc for exports.
- Prettier formats all files.
- Vitest runs the unit tests of all packages from the root.
- `npm run check` runs these 4 steps in order, and stops at the first step that fails.

## Proof of no change

`scripts/compare-workbooks.ts` compares 2 workbooks sheet by sheet, and the icon file names next to them. It first pairs the rows of the 2 sheets by a key, and then compares the cells of each pair. So a removed row shows as 1 removed row, not as a change of each later row. It reports the removed rows, the added rows, a change of the row order, and each changed cell of a pair. The key of a sheet is the shortest list of its columns, in this order, whose values are unique in the sheet:

| Sheet | Key |
| --- | --- |
| Items | `Name` |
| Recipes | `Item` |
| Zones | `Area`, `Spot` |
| Monsters | `Name`, `Name (JP)` (2 monsters have the English name "Beast") |
| Characters | `Name`, `Name (JP)`, `Icon` (the variants of 1 character, for example the 7 rows of Pamela, differ only in the icon) |

A key with `Icon` changes when a game update changes the icon numbers. Such an update changes the workbook anyway, so a comparison across it is not a proof of no change.

The key table is defined 1 time, in `@nelke/workbook`, next to the sheets and their headers, and the script imports it. When a key value occurs 2 times in 1 sheet, the script stops with an error that names the sheet and the value, because a pair would be a guess. When a key column is not in 1 of the 2 sheets, the script reports it as a difference of the header and does not pair the rows of that sheet. The script builds the key value from the cells with a separator that no cell can hold, so 2 different rows cannot get the same key. It prints each difference, writes the same text to a timestamped result file, and exits with 1 when it finds a difference. The issue of the change records the result in its Outcome. Each change of the workbook code that keeps the requirements runs it against a baseline workbook. The baseline comes from the build before the change.
