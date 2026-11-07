# NelkeData

A quick vibecoded project to export game data from *Nelke & the Legendary Alchemists*. The data comes from the files of the Steam install of the game. The workbook has 5 sheets: Items, Recipes, Zones, Monsters and Characters.

**[View the spreadsheet](https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2wFs-yRAs38QgU2oqgapDcXku5AX1chF_R2Y31K7TneFiW0tOvSku27KYreOKFAXzDeDx4ZU1PG1F/pubhtml)**

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
   The command takes 2 optional arguments, `[extractedDir] [dataDir]`. They default to `extracted/` and `data/`. It writes one JSON file for each kind of entity and the icons (PNG, 128 × 128 in `data/icons/128/` and 64 × 64 in `data/icons/64/`) to `data/`. The files in `data/` are in git. Run the command again after a change to the model, and commit the changed files.
4. Build the workbook from the data files:
   ```
   npm run workbook
   ```
   The command takes 2 optional arguments, `[dataDir] [outFile]`. They default to `data/` and `output/nelke_data.xlsx`. It does not read the game files.

The output is `output/nelke_data.xlsx` and the icon folder `output/icons/`.

The workbook build prints a warning for each column that has 1 value only, and for each column that is the same as another column. Remove such a column from the column lists in `packages/workbook/src/`.

Check the code with:

```
npm run check
```

It runs the typecheck (`tsc -b`), the lint (ESLint), the format check (Prettier) and the tests (Vitest), in this order.

To prove that a change leaves the workbook as it was, build a baseline workbook before the change and a new one after it. Then compare them:

```
npm run compare -- baseline/nelke_data.xlsx new/nelke_data.xlsx
```

The script compares the cell values sheet by sheet and the icon file names. It exits with 1 on a difference.

## Import to Google Sheets

1. Open Google Drive.
2. Upload `output/nelke_data.xlsx`.
3. Open the file with Google Sheets. Then select **File > Save as Google Sheets**.

Each sheet has a frozen header row and a filter on all columns.

## Icons in Google Sheets

The build writes 491 icons (64 × 64 PNG) to `output/icons/`. Column A (`Icon`) of the Items, Recipes, Monsters and Characters sheets holds the file name of the icon of the row, for example `item_l_012.png`. Some cells are empty: these rows have no icon. An xlsx file that Google Sheets imports cannot hold pictures in cells, so do these steps after the import:

1. Upload the folder `output/icons/` to Google Drive.
2. Open the Google Sheets file. Select **Extensions > Apps Script**.
3. Paste this script. Set `FOLDER_ID` to the ID of the uploaded folder (the last part of the folder URL).
   ```js
   const FOLDER_ID = '<folder id>';
   const SHEETS = ['Items', 'Recipes', 'Monsters', 'Characters'];

   function insertIcons() {
     const urls = {};
     const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
     while (files.hasNext()) {
       const f = files.next();
       urls[f.getName()] = 'data:image/png;base64,' + Utilities.base64Encode(f.getBlob().getBytes());
     }
     const book = SpreadsheetApp.getActiveSpreadsheet();
     for (const name of SHEETS) {
       const sheet = book.getSheetByName(name);
       const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
       const values = range.getValues().map(([file]) =>
         [urls[file] ? SpreadsheetApp.newCellImage().setSourceUrl(urls[file]).build() : ''],
       );
       range.setValues(values);
     }
   }
   ```
4. Run `insertIcons` and give it access to Drive when it asks.

The script puts each picture in its cell. A picture in a cell moves with its row when you sort or filter. The files on Drive stay private.

If a cell shows no picture, use the `IMAGE()` formula:

1. Share the folder as **Anyone with the link: Viewer**. This makes the icons public.
2. Set each cell of column A to `=IMAGE("https://lh3.googleusercontent.com/d/<file id>")`.

## Sources

| File in `extracted/saves/`                  | Data                                              |
| ------------------------------------------- | ------------------------------------------------- |
| `item/item.xml`                             | Items: category, rank, price, shops, farms        |
| `recipe/recipe.xml`                         | Recipes: materials, synthesis cost                |
| `recipe/recipe_collection.xml`              | Recipe sets and the alchemist that teaches it     |
| `study/stdy_research.xml`, `stdy_prize.xml` | Research that gives a recipe set                  |
| `expl_area/*.xml`, `expl_research/*.xml`    | Areas, spots, difficulty                          |
| `expl_collect/*.xml`                        | Gather items and rates of each spot               |
| `expl_encount/*.xml`                        | Monster groups and levels of each spot            |
| `character/*.xml`                           | Characters and monsters: stats, skills, join data |
| `battle/btl_chara.xml`                      | Battle data: element DEF, EXP, drops              |
| `ui/etc/uis_20th_*.xml`                     | Icon texture of each image number                 |
| `message_en/*.xml`, `message/message.xml`   | English and Japanese names and descriptions       |

The tools drop the rows that the game marks as not used (name `*Unneccesary`).

The icons are G1T textures (DXT5) in `PACK00_01.PAK`. `tools/g1t.js` decodes them to PNG. The image number of each row selects the texture:

| Sheet               | Image number                         | Texture list                    |
| ------------------- | ------------------------------------ | ------------------------------- |
| Items, Recipes      | `ITEM_IMAGE_NUM`                     | `uis_20th_item_l.xml`           |
| Characters          | `CHARACTER_ANILLUSTRATION_NUM`       | `uis_20th_npc_faceicon.xml`     |
| Monsters            | `CHARACTER_ANILLUSTRATION_NUM` − 200 | `uis_20th_monster_faceicon.xml` |

## Recipe value

The value columns of the Recipes sheet and the synthesis section of the site use the synthesis cost of each recipe and the selling price (`ITEM_SELLING_PRICE`) of each item. Each recipe gives 1 item, and each item has at most 1 recipe.

| Column                           | Formula                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Cumulative Synth Cost`          | Synthesis cost + the sum of (quantity × `Cumulative Synth Cost`) of each material that a recipe makes |
| `Value / Cumulative Synth Cost`  | Price ÷ `Cumulative Synth Cost`                                                                     |

A material that no recipe makes (a gathered item, an element) adds 0. The sheet rounds `Value / Cumulative Synth Cost` to 1 decimal, the same as the site. When the result has price 0 (construction and battle items), the cell is empty.

The `Reduce:` columns of the Items sheet are the `ITEM_DI_ACQ_*ELEMENT` values: the elements that the Reduce command gives for the item. The tutorial text `REDUCTION_TUTORIAL_TEXT_003` states that the kind and amount of elements change with the material.

## Synthesis level

The minimum alchemy level of an item ("Synth. Lv." in the game) is `ITEM_RANK` of `item/item.xml` ÷ 4, rounded down, and minimum 1. No game file stores the level. The divisor fits `OC_ITEM_RANK_ADJUSTMENT_COEFFICIENT` = 400 in `out_constant/out_constant.xml`. 7 items in the game confirm the rule ([the research note](docs/research/2026-11-04-alchemy-level.md)).

## Recipe unlock

A recipe unlocks through its recipe set (`recipe/recipe_collection.xml`). A set has these conditions:

| Column          | Source field                      | Meaning                                  |
| --------------- | --------------------------------- | ---------------------------------------- |
| `Taught By`     | `CHARACTER_ID`                    | The alchemist that teaches the set       |
| `Friendship Lv` | `RECIPE_COLLECTION_COMPANION_NUM` | The friendship level with that alchemist |
| `Unlock Event`  | `RECIPE_RCONDITION_EVENT`         | The story event that must occur first    |
| `Research`      | `study/stdy_prize.xml`            | The research that gives the set          |

The data has no names for events. The tools name `EVENT_MM01_0<N+1>0` as "After Task N". This rule comes from the English dialog of the events `event_message_mm01_*.ebm`: each one is the review where Lotos approves a main task. Other events show their ID.

An exploration area opens when its main task is complete (`task_id` in `expl_area/expl_area.xml`). The `Gathered At` and `First Gather Task` columns of the Items sheet show this. Task 0 means the area is open from the start.

## Zones

The Zones sheet has 1 row for each spot of an area.

- `Difficulty by Area Lv` shows the difficulty rank (S to F) at area level 1 to 5 (`diff_00` to `diff_04`).
- `Monsters` and `Bosses` show each monster with its levels. "(area Lv N+)" shows that the monster appears only from area level N (`REQ_LV`).
- `Special Spot Items` are the items of `unique_collect.xml` that the gimmicks of `expl_gimmick.xml` use (`Zone.specialItems` of the model). They belong to the area, so each spot of the area shows the same list.

## Monsters and characters

- The stat columns (HP to CHM) are the base stats of `para_archetype.xml`. `Growth / Lv` is the minimum and maximum gain for each level from `para_growtype.xml`.
- The `DEF` columns are `element_1` to `element_4` of `btl_chara.xml`.
- `Wage` (`CHARACTER_SUBMONEY`) is the hire cost of a monster.
- `Join Event`, `Join Population` and `Join Turn` come from `character_app_con.xml`. The meaning of `Join Turn` (`CHARACTER_APP_CTURN`) is not confirmed.
- A character can have more than 1 row with the same name. Each row is the version from 1 source game.
