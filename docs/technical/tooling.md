# Tooling

The files and commands of the tooling. The design is in [docs/design/tooling.md](../design/tooling.md).

## Versions

- Node 24 or later. `package.json` states it in `engines`.
- `.npmrc` holds `save-exact=true`, so each dependency is pinned to 1 version.

## Root files

| File | Holds |
| --- | --- |
| `package.json` | The workspaces (`packages/*`), the dev dependencies and the scripts. |
| `tsconfig.base.json` | The shared compiler options: `strict`, `noUncheckedIndexedAccess`, `module` and `moduleResolution` `NodeNext`, `target` `ES2023`. |
| `tsconfig.json` | The project references to each package, to `scripts` and to `__tests__`, for `tsc -b`. |
| `eslint.config.js` | The presets, the few rules of the code standard, and the overrides for tests. |
| `.prettierrc.json` | `singleQuote` and `printWidth` 140. |
| `vitest.config.ts` | The test files: `packages/*/src/**/__tests__/*.test.ts`, `__tests__/*.test.ts` and `scripts/__tests__/*.test.ts`. |

## Scripts

| Script | Does |
| --- | --- |
| `npm run check` | `tsc -b`, then `eslint .`, then `prettier --check .`, then `vitest run`. |
| `npm run extract -- list <archive>` | Lists the files in a PAK archive. |
| `npm run extract -- extract <archive> <out> <pattern>` | Extracts the files that match the pattern from a PAK archive. |
| `npm run model -- [extractedDir] [dataDir]` | Builds the data model from `extracted/` and writes `data/`. The defaults are `extracted/` and `data/`. |
| `npm run workbook -- [dataDir] [outFile]` | Builds `output/nelke_data.xlsx` and `output/icons/` from `data/`. |
| `npm run compare -- <baseline.xlsx> <new.xlsx> [result.txt]` | Runs `scripts/compare-workbooks.ts` with `tsx`. Pairs the rows of each sheet by its key from the key table `SHEET_KEYS`, which it imports from `@nelke/workbook` (the logic is in `scripts/compare-rows.ts`). The key value is the JSON array of the key cells. Compares the cells of each pair, and compares the icon file names. Reports removed rows, added rows, a row order change and each changed cell as sheet, key, column, old and new. A key column that is missing in 1 of the 2 sheets is reported as a header difference, and the rows of that sheet are not compared. Stops with an error when a key value occurs 2 times in 1 sheet. Writes the result to `result.txt`, by default `compare-<yyyymmdd-hhmmss>.txt` next to the new workbook. Exits with 1 on a difference. |

The files and the scripts of the website are in [docs/technical/site.md](site.md).
