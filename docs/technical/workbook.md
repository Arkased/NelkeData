# Workbook

The columns of the workbook and their game sources. The workbook reads only `data/`. The commands are in [docs/technical/tooling.md](tooling.md), and the design is in [docs/design/tooling.md](../design/tooling.md). The game files and the rules of the model are in [docs/technical/model.md](model.md).

## Build warnings

The workbook build prints a warning for each column that has 1 value only, and for each column that is the same as another column. Remove such a column from the column lists in `packages/workbook/src/`.

## Icons

Column A (`Icon`) of the Items, Recipes, Monsters and Characters sheets holds the file name of the icon of the row, for example `item_l_012.png`. A row with no icon has an empty cell. The build writes 1 PNG of 64 × 64 px to `output/icons/` for each icon that a row names (491 files).

## Icons in Google Sheets

An xlsx file that Google Sheets imports cannot hold pictures in cells. Do these steps after the import:

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

Each sheet has a frozen header row and a filter on all columns.

## Items

- The `Reduce:` columns are the `ITEM_DI_ACQ_*ELEMENT` values: the elements that the Reduce command gives for the item. The tutorial text `REDUCTION_TUTORIAL_TEXT_003` states that the kind and amount of elements change with the material.
- An exploration area opens when its main task is complete (`task_id` in `expl_area/expl_area.xml`). The columns `Gathered At` and `First Gather Task` show this. Task 0 means that the area is open from the start.

## Recipes

- `Cumulative Synth Cost` and `Value / Cumulative Synth Cost` are the recipe value of the model (model doc, section "Recipe value"). The sheet rounds `Value / Cumulative Synth Cost` to 1 decimal. When the result has price 0, the cell is empty.
- A recipe unlocks through its recipe set (`recipe/recipe_collection.xml`). These columns show the conditions of the set:

| Column | Source field | Meaning |
| --- | --- | --- |
| `Taught By` | `CHARACTER_ID` | The alchemist that teaches the set |
| `Friendship Lv` | `RECIPE_COLLECTION_COMPANION_NUM` | The friendship level with that alchemist |
| `Unlock Event` | `RECIPE_RCONDITION_EVENT` | The story event that must occur first, with the label of the model (model doc, section "Event label") |
| `Research` | `study/stdy_prize.xml` | The research that gives the set |

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
