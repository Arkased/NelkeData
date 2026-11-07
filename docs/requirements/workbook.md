# Workbook

A spreadsheet of the game data, for players who sort and filter. The source of each row is the owner's words in the chat (dates in UTC). The rules that the orchestrator made, and the proof of each row, are in [the tooling design](../design/tooling.md), section "Design requirements". The columns and their sources are in `README.md`.

| Name | Requirement | Source |
| --- | --- | --- |
| Google Sheets | The workbook is a Google spreadsheet with sort and filter. | 2026-11-01: "produce google spreadsheets with sort/filter capabilities". |
| Sheets | The workbook has sheets for items, recipes, zones, monsters and characters. The item sheet has no synthesis data. | 2026-11-01: "Just recipies and items for now"; "Can you also add sheets for zones, monsters, and characters?"; "item sheet should not have any synth info". |
| No redundant columns | No column has identical values or repeats the data of another column. | 2026-11-01: "there are some redundant columns (identical values or duplicated info)". |
| Recipe value | The recipe sheet shows the cumulative synthesis cost of the item and the value per cumulative synthesis cost, the same as the site. It does not show the material cost, the added value or the value per cost. | 2026-11-07, after the same change on the site: "can you update the google sheet too". |
| Icons | The sheets show the icons of the items in the cells. | 2026-11-01: "if you could in-line item icons as well that would be nice"; "there's no way to get the images into the sheet? I can hand it off to a GDrive agent to format". |
