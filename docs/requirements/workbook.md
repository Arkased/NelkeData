# Workbook

An xlsx workbook of the game data, for players who want to sort and filter in a spreadsheet. The owner publishes it on Google Sheets. The columns and their sources are in `README.md`.

| Name | Contract | Proof |
| --- | --- | --- |
| Sheets | The workbook has 5 sheets: Items, Recipes, Zones, Monsters and Characters, with the columns that `README.md` gives. Each sheet has a frozen header row and a filter on all columns. | The compare script against the baseline workbook. |
| No change of output | A change of the code that does not change a requirement keeps each cell value of each sheet the same. | `scripts/compare-workbooks.ts` compares the new workbook with a baseline workbook, cell by cell, and exits with 1 on a difference. |
| Icons | The build writes 1 PNG of 64 × 64 px to `output/icons/` for each icon that a row names. | The compare script also compares the icon file names. |
| Warnings | The build prints a warning for each column with 1 value only, and for each column that is the same as another column. | A unit test. |
