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
| `npm run workbook -- [extractedDir] [outFile]` | Builds `output/nelke_data.xlsx` and `output/icons/`. |
| `npx tsx scripts/compare-workbooks.ts <baseline.xlsx> <new.xlsx>` | Compares 2 workbooks cell by cell. Exits with 1 on a difference. |
