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
| `tsconfig.json` | The project references to each package, for `tsc -b`. |
| `eslint.config.js` | The presets, the few rules of the code standard, and the overrides for tests. |
| `.prettierrc.json` | `singleQuote`, `printWidth` 140. |
| `vitest.config.ts` | The test files: `packages/*/src/**/__tests__/*.test.ts` and `__tests__/*.test.ts`. |

## Scripts

| Script | Does |
| --- | --- |
| `npm run check` | `tsc -b`, then `eslint .`, then `prettier --check .`, then `vitest run`. |
| `npm run extract -- list <archive>` | Lists the files in a PAK archive. |
| `npm run extract -- extract <archive> <out> <pattern>` | Extracts the files that match the pattern from a PAK archive. |
| `npm run model -- [extractedDir] [dataDir]` | Builds the data model from `extracted/` and writes `data/`. The defaults are `extracted/` and `data/`. |
| `npm run workbook -- [dataDir] [outFile]` | Builds `output/nelke_data.xlsx` and `output/icons/` from `data/`. |
| `npx tsx scripts/compare-workbooks.ts <baseline.xlsx> <new.xlsx> [result.txt]` | Pairs the rows of each sheet by its key (the logic is in `scripts/compare-rows.ts`), compares the cells of each pair, and compares the icon file names. Reports removed rows, added rows, a row order change and each changed cell as sheet, key, column, old and new. Stops with an error when a key value occurs 2 times in 1 sheet. Writes the result to `result.txt`, by default `compare-<yyyymmdd-hhmmss>.txt` next to the new workbook. Exits with 1 on a difference. |

The scripts of the website (`site:dev`, `site:build`, `site:test`) are in [docs/technical/site.md](site.md).
