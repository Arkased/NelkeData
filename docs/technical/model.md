# Data model

The files, the fields and the commands of the data model. The design is in [docs/design/model.md](../design/model.md).

## Package

| Item | Value |
| --- | --- |
| Name | `@nelke/model` |
| Folder | `packages/model/` |
| Exports | The schemas, the types, `readData(dataDir)`, the enums of the game, and the layout of `data/`: the file names, `ICON_DIR` and `ICON_SIZES`. |
| Command | `npm run model -- [extractedDir] [dataDir]`. The defaults are `extracted/` and `data/`. |

## Files of `data/`

Each file is a JSON array of the entities of 1 kind, in the order of the game table, written with an indent of 2 spaces and a final newline. 2 runs on the same game files write the same bytes. Prettier does not format `data/`.

| File | Kind |
| --- | --- |
| `items.json` | Item |
| `recipes.json` | Recipe |
| `recipe-sets.json` | Recipe set |
| `research.json` | Research |
| `zones.json` | Zone |
| `research-trees.json` | Research tree |
| `areas.json` | Area |
| `monsters.json` | Monster |
| `characters.json` | Character |
| `icons/128/*.png` | The icons for the site, 128 × 128 PNG |
| `icons/64/*.png` | The icons for the workbook, 64 × 64 PNG, with the same file names |

## Common fields

| Field | Type | On |
| --- | --- | --- |
| `id` | string, the value that the game tables use to refer to the row (design section "IDs and links") | Each kind |
| `slug` | string, the rule of the design section "Slugs" | Item, Research, Zone, Area, Monster, Character |
| `name` | string, English | Each kind with a name |
| `nameJp` | string, Japanese | Item, Monster, Character |
| `icon` | string or `null`, a file name in `data/icons/128/` and `data/icons/64/` | Item, Monster, Character |

## Links

Each row is 1 link. The "From the game" side comes from the tables. The inverse function writes the "Inverse" side.

| From the game | Inverse |
| --- | --- |
| `Recipe.resultItemId` | `Item.recipeId` (`null` when no recipe makes the item) |
| `Recipe.materials[].itemId` (with `quantity`) | `Item.usedInRecipeIds` |
| `RecipeSet.recipeIds` | `Recipe.recipeSetIds` (6 recipes are in more than 1 set) |
| `RecipeSet.teacherId` (a character) | `Character.recipeSetIds` |
| `Research.recipeSetId` | `RecipeSet.researchId` (`null` when no research gives the set) |
| `Research.researcherIds` (characters) | `Character.researchIds` |
| `Monster.zoneEncounters[].zoneId` (with the levels and the boss flag; an encounter group of the zone that no area lists, for example a boss of Ferien Plains at Lv 98) | `Zone.encounters[].monsterId` (with the same values) |
| `Research.prerequisiteIds` | `Research.unlocksIds` |
| `Zone.areaIds` | `Area.zoneId` |
| `Area.gather[].itemId` (with `rate`) | `Item.gather[].areaId` (with `rate`) |
| `Zone.specialItems[].itemId` (with `kind`, `spot` and `rate`) | `Item.specialZoneIds` |
| `Area.monsters[].monsterId` (with the levels, the area level from which it appears, and the boss flag) | `Monster.areas[].areaId` (with the same values) |
| `Monster.drops[].itemId` (with `quantity` and `rate`) | `Item.drops[].monsterId` (with the same values) |

## Other fields

The fields of each kind are the facts that the workbook shows now, as typed values. The schemas in `packages/model/src/schema/` are the exact list. These rules apply:

- A number is a number, never text. A rate is a percent number with the value of the game, for example `12.5`.
- A fixed set of names (a shop, an element, a stat) is a string enum of `packages/model/src/enums.ts`.
- `Item.category` is a value of the string enum `ItemCategoryName` of `enums.ts`, with the English names as values. `CATEGORY_NAMES: Record<ItemCategory, ItemCategoryName>` in `enums.ts` maps the game ID to the name, and the index of the package exports both. The item schema accepts only the values of `ItemCategoryName`, so the inferred type of `Item.category` is `ItemCategoryName`. The export throws when the game has a category that is not a key of `CATEGORY_NAMES`, so it never writes a category that the schema rejects. The site uses `ItemCategoryName` directly, with no lookup from a name back to an ID.
- A missing value is `null`, never `0` or `""`, when the game has no value. A value of `0` in the game stays `0`.
- The recipe value fields of a recipe: `inputCost`, `addedValue` (`null` when the price of the result is 0), `addedValuePerCost` (`null` when `addedValue` is `null`) and `unpricedItemIds`. They have the values that the workbook shows now.
- `Recipe.synthesisLevel` is the minimum alchemy level: `Math.max(1, Math.floor(rank / 4))`, with the `rank` of the result item. The rule is in `README.md`, section "Synthesis level". The workbook does not show it.
- `Zone.elements` is the list of the elements of the zone (`ele_00` to `ele_03` of `expl_area/expl_area.xml`), as `Element` values.
- `Zone.specialItems` is the list of the rare finds: `{ itemId, kind, spot, rate }`. `kind` is the enum `GatherKind` (`Treasure`, `Bug Net`, `Digging`, `Fishing`), from the `type` of `expl_gimmick/expl_gimmick.xml`. `spot` is the number of the chest or the spot in the zone, from 1. `rate` is the percent rate of the item in its gimmick table (`table_01`). The inverse link `Item.specialZoneIds` comes from it. The workbook shows the same values as before.
- `Research.researcherIds` is the list of the researchers (`STDY_RES_CHARACTER_TAG_00` and `_01`). The inverse link `Character.researchIds` comes from it.
- The research facts of `study/stdy_research.xml` and `study/stdy_prize.xml`: `friendship` (`STDY_FRIEND_POINT`, the total friendship that the research needs), `duration` (`STDY_RES_DURATION`, turns), `money` (`STDY_RES_MONEY_NUM`), `materials` (`[{ itemId, quantity }]` from `STDY_RES_ITEM_NAME_00` to `_03`), `prizeItems` (`[{ itemId, quantity }]` from `STDY_PRIZE_ITEM_NAME_*`), and `bonus` (`{ itemId, quantity, friendship, type }` or `null`, from `STDY_PRIZE_BONUS_ITEM`, `STDY_PRIZE_BONUS_ITEM_NUM`, `STDY_BONUS_FRIEND_POINT` and the name of the type of `STDY_BONUS_TAG` when the game has 1). A missing value is `null`.
- `data/research-trees.json` holds the 4 trees: `{ id, name, nodes }`. `id` is the enum `ResearchTree` (`main`, `attack`, `support`, `emergency`), from the file names `study/stdy_tree_<id>.xml`. `name` is the tree name of the design. `nodes` is `[{ researchId, row, column }]`, with the row and the column of the grid of the game, from 0.
- A story event is `{ id, label }`. The label follows the rule of `README.md`, section "Recipe unlock".
- The task that opens a zone is `{ number, name }`, or `null` when the zone is open from the start.

## Read

`readData(dataDir)` reads each file of `data/`, parses it with its schema, and returns an object with 1 array for each kind. It throws when a file is missing or does not match its schema.

## Tests

| Test | Folder | Proves |
| --- | --- | --- |
| Slug rule | `packages/model/src/__tests__/` | The rule of the design, the collision rule, and that 2 runs give the same slugs. |
| Inverse links | `packages/model/src/__tests__/` | Each link of the table above gets its reverse, on a small set of entities. |
| `data/` | `__tests__/data.test.ts` | `readData('data')` passes, each link of the table "Links" has its reverse, checked from both sides, each slug is unique in its kind, each `icon` names a file in `data/icons/128/` and in `data/icons/64/`. |
