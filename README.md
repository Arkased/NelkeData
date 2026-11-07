# NelkeData

A quick vibecoded project to export game data from *Nelke & the Legendary Alchemists*. The data comes from the files of the Steam install of the game. The project has 2 outputs:

- A workbook with 5 sheets: Items, Recipes, Zones, Monsters and Characters.
- A static website with pages for items, areas, monsters, characters and research.

**[View the spreadsheet](https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2wFs-yRAs38QgU2oqgapDcXku5AX1chF_R2Y31K7TneFiW0tOvSku27KYreOKFAXzDeDx4ZU1PG1F/pubhtml)** · **[View the website](https://arkased.github.io/NelkeData/)**

## Develop

Do these steps to make the workbook again:

1. Install the packages:
   ```
   npm install
   ```
2. Extract the game data XML and the icon textures from the game archives:
   ```
   GAME="C:/Program Files (x86)/Steam/steamapps/common/Nelke and the Legendary Alchemists Ateliers of the New World/Data"
   npm run extract -- extract "$GAME/PACK01.PAK" extracted "^.saves.[^.]*\.xml$"
   npm run extract -- extract "$GAME/PACK00_01.PAK" extracted "item_l_[0-9]+\.g1t|npc_faceicon[0-9]+\.g1t|monster_faceicon[0-9]+\.g1t"
   ```
3. Build the data files from the extracted game files:
   ```
   npm run model
   ```
   The command takes 2 optional arguments, `[extractedDir] [dataDir]`. They default to `extracted/` and `data/`. It writes one JSON file for each kind of entity and the icons to `data/`. The files in `data/` are in git. Run the command again after a change to the model, and commit the changed files.
4. Build the workbook from the data files:
   ```
   npm run workbook
   ```
   The command takes 2 optional arguments, `[dataDir] [outFile]`. They default to `data/` and `output/nelke_data.xlsx`. It does not read the game files. It also writes the icon folder `output/icons/`.

Check the code with:

```
npm run check
```

It runs the typecheck (`tsc -b`), the lint (ESLint), the format check (Prettier) and the tests (Vitest), in this order.

To prove that a change leaves the workbook as it was, build a baseline workbook before the change and a new one after it. Then compare them:

```
npm run compare -- baseline/nelke_data.xlsx new/nelke_data.xlsx
```

The script exits with 1 on a difference.

## Website

The website is the folder `prototype/`. It has no build step: `prototype/index.html` opens in a browser as a file. Its data is `prototype/data.js`.

1. Install the packages of the scripts:
   ```
   cd prototype
   npm install
   ```
2. After a change to `data/`, fill the values of `data.js` that come from `data/*.json`:
   ```
   node prototype/scripts/fill-data.mjs
   ```
3. Test the UI at the widths 360, 768, 1280 and 1920 px:
   ```
   node prototype/scripts/test.mjs
   ```
   The test is not part of `npm run check`.
4. Write screenshots to `prototype/shots/`:
   ```
   node prototype/scripts/shots.mjs [widths] [states]
   ```

A push to `main` that changes `prototype/` deploys the site to GitHub Pages.

## Import to Google Sheets

1. Open Google Drive.
2. Upload `output/nelke_data.xlsx`.
3. Open the file with Google Sheets. Then select **File > Save as Google Sheets**.
4. Put the icons into the cells with the steps of [the workbook doc](docs/technical/workbook.md), section "Icons in Google Sheets".

## Docs

| Topic | Doc |
| --- | --- |
| The game files, the fields of `data/` and the rules of the game data (recipe value, synthesis level, event label) | [docs/technical/model.md](docs/technical/model.md) |
| The columns of the workbook and their sources | [docs/technical/workbook.md](docs/technical/workbook.md) |
| The files, the scripts and the deploy of the website | [docs/technical/site.md](docs/technical/site.md) |
| The commands and the root files | [docs/technical/tooling.md](docs/technical/tooling.md) |
| What the owner requires, and how the design meets it | `docs/requirements/` and `docs/design/` |
