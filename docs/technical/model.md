# Data model

The files, the fields and the commands of the data model. The design is in [docs/design/model.md](../design/model.md).

## Package

| Item | Value |
| --- | --- |
| Name | `@nelke/model` |
| Folder | `packages/model/` |
| Exports | The schemas, the types, `readData(dataDir)` and the enums of the game. |
| Command | `npm run model -- [extractedDir] [dataDir]`. The defaults are `extracted/` and `data/`. |

## Files of `data/`

Each file is a JSON array of the entities of 1 kind, sorted by ID, written with an indent of 2 spaces and a final newline. 2 runs on the same game files write the same bytes. Prettier does not format `data/`.

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
| `icons/*.png` | The icons, 128 × 128 PNG |

## Common fields

| Field | Type | On |
| --- | --- | --- |
| `id` | integer, the ID of the game table | Each kind |
| `slug` | string, the rule of the design section "Slugs" | Item, Research, Zone, Area, Monster, Character |
| `name` | string, English | Each kind with a name |
| `nameJp` | string, Japanese | Item, Monster, Character |
| `icon` | string or `null`, a file name in `data/icons/` | Item, Monster, Character |

## Links

Each row is 1 link. The "From the game" side comes from the tables. The inverse function writes the "Inverse" side.

| From the game | Inverse |
| --- | --- |
| `Recipe.resultItemId` | `Item.recipeId` (`null` when no recipe makes the item) |
| `Recipe.materials[].itemId` (with `quantity`) | `Item.usedInRecipeIds` |
| `RecipeSet.recipeIds` | `Recipe.recipeSetId` |
| `RecipeSet.teacherId` (a character) | `Character.recipeSetIds` |
| `Research.recipeSetId` | `RecipeSet.researchId` |
| `Research.prerequisiteIds` | `Research.unlocksIds` |
| `Zone.areaIds` | `Area.zoneId` |
| `Area.gather[].itemId` (with `rate`) | `Item.gather[].areaId` (with `rate`) |
| `Zone.specialItemIds` | `Item.specialZoneIds` |
| `Area.monsters[].monsterId` (with the levels, the area level from which it appears, and the boss flag) | `Monster.areas[].areaId` (with the same values) |
| `Monster.drops[].itemId` (with `quantity` and `rate`) | `Item.drops[].monsterId` (with the same values) |

## Other fields

The fields of each kind are the facts that the workbook shows now, as typed values. The schemas in `packages/model/src/schema/` are the exact list. These rules apply:

- A number is a number, never text. A rate is a percent number with the value of the game, for example `12.5`.
- A fixed set of names (a shop, an element, a stat) is a string enum of `packages/model/src/enums.ts`.
- A missing value is `null`, never `0` or `""`, when the game has no value. A value of `0` in the game stays `0`.
- The recipe value fields of a recipe: `inputCost`, `addedValue` (`null` when the price of the result is 0), `addedValuePerCost` (`null` when `addedValue` is `null`) and `unpricedItemIds`. They have the values that the workbook shows now.
- A story event is `{ id, label }`. The label follows the rule of `README.md`, section "Recipe unlock".
- The task that opens a zone is `{ number, name }`, or `null` when the zone is open from the start.

## Read

`readData(dataDir)` reads each file of `data/`, parses it with its schema, and returns an object with 1 array for each kind. It throws when a file is missing or does not match its schema.

## Tests

| Test | Folder | Proves |
| --- | --- | --- |
| Slug rule | `packages/model/src/__tests__/` | The rule of the design, the collision rule, and that 2 runs give the same slugs. |
| Inverse links | `packages/model/src/__tests__/` | Each link of the table above gets its reverse, on a small set of entities. |
| `data/` | `__tests__/data.test.ts` | `readData('data')` passes, each link has its reverse, each slug is unique in its kind, each `icon` names a file in `data/icons/`. |
