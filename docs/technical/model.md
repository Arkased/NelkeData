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
| `Research.researcherId` (a character) | `Character.researchIds` |
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
- The recipe value fields of a recipe: `cumulativeSynthesisCost` (an integer) and `valuePerCumulativeSynthesisCost` (the price of the result divided by `cumulativeSynthesisCost`, not rounded; `null` when the price of the result is 0). The formulas are in the section "Recipe value". The export throws an error that names the items when the recipes have a loop, and when 2 recipes make the same item.
- `Recipe.synthesisLevel` is the minimum alchemy level: `Math.max(1, Math.floor(rank / 4))`, with the `rank` of the result item. The rule is in the section "Synthesis level". The workbook does not show it.
- `Zone.elements` is the list of the elements of the zone (`ele_00` to `ele_03` of `expl_area/expl_area.xml`), as `Element` values.
- `Zone.specialItems` is the list of the rare finds: `{ itemId, kind, spot, rate }`. `kind` is the enum `GatherKind` (`Treasure`, `Bug Net`, `Digging`, `Fishing`), from the `type` of `expl_gimmick/expl_gimmick.xml`. `spot` is the number of the chest or the spot in the zone, from 1. `rate` is the percent rate of the item in its gimmick table (`table_01`). The inverse link `Item.specialZoneIds` comes from it. The workbook shows the same values as before.
- A story event is `{ id, label }`. The label follows the rule of the section "Event label".
- The task that opens a zone is `{ number, name }`, or `null` when the zone is open from the start.

## Game files

The model reads these files of `extracted/saves/`:

| File | Data |
| --- | --- |
| `item/item.xml` | Items: category, rank, price, shops, farms |
| `recipe/recipe.xml` | Recipes: materials, synthesis cost |
| `recipe/recipe_collection.xml` | Recipe sets and the alchemist that teaches each set |
| `study/stdy_research.xml`, `stdy_prize.xml` | Research that gives a recipe set |
| `expl_area/*.xml`, `expl_research/*.xml` | Areas, spots, difficulty |
| `expl_collect/*.xml` | Gather items and rates of each spot |
| `expl_encount/*.xml` | Monster groups and levels of each spot |
| `character/*.xml` | Characters and monsters: stats, skills, join data |
| `battle/btl_chara.xml` | Battle data: element DEF, EXP, drops |
| `ui/etc/uis_20th_*.xml` | Icon texture of each image number |
| `message_en/*.xml`, `message/message.xml` | English and Japanese names and descriptions |

The model drops the rows that the game marks as not used (name `*Unneccesary`).

The icons are G1T textures (DXT5) in `PACK00_01.PAK`. `tools/g1t.js` decodes them to PNG. The image number of each row selects the texture:

| Kind | Image number | Texture list |
| --- | --- | --- |
| Item | `ITEM_IMAGE_NUM` | `uis_20th_item_l.xml` |
| Character | `CHARACTER_ANILLUSTRATION_NUM` | `uis_20th_npc_faceicon.xml` |
| Monster | `CHARACTER_ANILLUSTRATION_NUM` − 200 | `uis_20th_monster_faceicon.xml` |

## Recipe value

The recipe value uses the synthesis cost of each recipe and the selling price (`ITEM_SELLING_PRICE`) of each item. Each recipe gives 1 item, and each item has at most 1 recipe.

| Field | Formula |
| --- | --- |
| `cumulativeSynthesisCost` | Synthesis cost + the sum of (quantity × `cumulativeSynthesisCost`) of each material that a recipe makes |
| `valuePerCumulativeSynthesisCost` | Price ÷ `cumulativeSynthesisCost` |

A material that no recipe makes (a gathered item, an element) adds 0. When the result has price 0 (construction and battle items), `valuePerCumulativeSynthesisCost` is `null`. The workbook and the site round the value to 1 decimal.

## Synthesis level

The minimum alchemy level of an item ("Synth. Lv." in the game) is `ITEM_RANK` of `item/item.xml` ÷ 4, rounded down, and minimum 1. No game file stores the level. The divisor fits `OC_ITEM_RANK_ADJUSTMENT_COEFFICIENT` = 400 in `out_constant/out_constant.xml`. 7 items in the game confirm the rule ([the research note](../research/2026-11-04-alchemy-level.md)).

## Event label

The data has no names for events. The model names `EVENT_MM01_0<N+1>0` as "After Task N". This rule comes from the English dialog of the events `event_message_mm01_*.ebm`: each one is the review where Lotos approves a main task. Other events get their ID as the label.

## Read

`readData(dataDir)` reads each file of `data/`, parses it with its schema, and returns an object with 1 array for each kind. It throws when a file is missing or does not match its schema.

## Tests

| Test | Folder | Proves |
| --- | --- | --- |
| Slug rule | `packages/model/src/__tests__/` | The rule of the design, the collision rule, and that 2 runs give the same slugs. |
| Inverse links | `packages/model/src/__tests__/` | Each link of the table above gets its reverse, on a small set of entities. |
| `data/` | `__tests__/data.test.ts` | `readData('data')` passes, each link of the table "Links" has its reverse, checked from both sides, each slug is unique in its kind, each `icon` names a file in `data/icons/128/` and in `data/icons/64/`. |
