# NelkeData

This project exports the game data of _Nelke & the Legendary Alchemists_ to a workbook and to a static website.

- The rules for the code are in `docs/code-standard.md`.
- The docs are in 3 layers: `docs/requirements/`, `docs/design/` and `docs/technical/`, 1 file per feature. The decision records are in `docs/decisions/`.
- The commands to install, build and check are in the section "Develop" of `README.md`. The check command is `npm run check`.
- The game files (`extracted/`) and the build output (`output/`) are not in git. `.worktreeinclude` copies them into each new worktree.
- `prototype/data.js` is in git. A code agent rebuilds it only when its change touches `prototype/scripts/build-data.ts`.
- The application code is in `packages/`. A ship is a push of `main`.
