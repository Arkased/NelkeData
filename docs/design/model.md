# Data model

How the game data becomes entities with IDs and links, for the workbook and the site. The design requirement "Same data" of [the site design](site.md) asks for 1 source of the values. [Decision 0002](../decisions/0002-stack.md) puts the entities in the package `@nelke/model`. [Decision 0003](../decisions/0003-data-in-git.md) puts its output in `data/`, in git.

## Flow

The model step reads `extracted/` and writes `data/`: 1 JSON file for each kind of entity, and the icons. The workbook and the site read only `data/`, through the schemas of `@nelke/model`. The model step runs on the machine of the owner, because only that machine has the game files. Its output goes into git with the change that causes it.

## Parts

| Part | Holds |
| --- | --- |
| Parse | The XML reader, the messages and the readers of each game table. They move from `@nelke/workbook` to `@nelke/model` with no change of behavior. |
| Entities | The joins that make 1 entity of each kind from the tables, with its links as IDs. |
| Inverse links | 1 function that adds the reverse side of each link, after all entities exist. |
| Slugs | The URL slug of each entity that has a page. |
| Schemas | 1 Zod schema for each file of `data/`. The TypeScript types come from the schemas (`z.infer`), so the files and the types cannot differ. |
| Write | The JSON files and the icons of `data/`. |
| Read | `readData(dataDir)`: reads each file of `data/`, parses it with its schema, and returns the entities. The workbook and the site use only this function. |

## What the model holds

The model holds the facts of the game as typed fields, and the values that more than 1 consumer shows. The consumers format the text.

- **A link is an ID.** For example an item holds the IDs of the areas where it is gathered, with the rate, and not the text "Area - Spot (12%)". The workbook builds that text from the area and its zone.
- **A computed value is in the model when a consumer shows it.** The recipe value (input cost, added value, added value per synthesis cost, unpriced materials) is in the model. So the site and the workbook show the same numbers. The formulas are in `README.md`, section "Recipe value".
- **A name of a thing with no page is resolved text.** The category of an item, the name of a district or the label of a story event is English text in the entity. Such a thing is not an entity, so it has no ID to link to.
- **A text that only 1 consumer shows is in that consumer.** The joined text cells, the sort of the rows and the aggregates of a column (for example "First Gather Task", the lowest task of all gather places) are in the workbook.
- **The model keeps every entity that the game uses.** It drops only the placeholders (section "Placeholders"). Each consumer selects the entities that it shows: for example the workbook drops the generic NPCs, and the site shows only the characters that can join the town.

## Placeholders

The row "Bad data" of [the site requirements](../requirements/site.md) asks that no placeholder shows, and the design requirement "Placeholder data" of [the tooling design](tooling.md) asks the same of the workbook. 1 function of the model applies 1 rule to each kind with a name. A row is a placeholder when 1 of these is true:

1. The English name is empty or only white space.
2. The English name starts with `*`. The game marks the rows that it does not use this way, for example `*Unneccesary`.
3. The English name is `Item` and a number, for example "Item 015".
4. The Japanese name is `アイテムの名前` and a number.

The model drops a placeholder row before the joins. So no link can point to it, and no consumer needs its own filter. A recipe whose result or whose material is a placeholder is a placeholder too: without the material, its input cost would be wrong. A description that starts with `*` is placeholder text: the model writes `null` for it, and the entity stays.

## Kinds of entity

| Kind | Game source | Has a page |
| --- | --- | --- |
| Item | `item/item.xml` | Yes |
| Recipe | `recipe/recipe.xml` | No: it shows inside the item that it makes ([decision 0008](../decisions/0008-recipes-in-items.md)) |
| Recipe set | `recipe/recipe_collection.xml` | No |
| Research | `study/stdy_research.xml` | Yes |
| Zone | `expl_area/expl_area.xml` (a top-level exploration area) | Yes |
| Area | `expl_research/expl_research.xml` (a spot inside a zone) | Yes |
| Monster | `character/character.xml`, the categories of monsters and bosses | Yes |
| Character | `character/character.xml`, all other categories | Yes |

The terms follow the site: a zone holds areas ([decision 0006](../decisions/0006-areas-by-zone.md)). The workbook keeps its column headers ("Area" for a zone, "Spot" for an area), because they are output and the workbook must not change.

## IDs and links

- The ID of an entity is the value that the other game tables use to refer to its row: the ID field of the row, or the row index when the game refers to the row by its index. It is a string, unique in its kind: every table of the game refers to a row by the tag in its ID field, for example `ITEM_MAT_ELEMENT_FIRE`. So the ID stays the same as long as the game reference stays the same. A row number that the model counts itself is not an ID. A link field names the kind, for example `monsterId`.
- The model stores each link in both directions. Only 1 side comes from the game tables. The inverse function makes the other side, so the 2 sides cannot differ. When the reverse side holds 1 ID and 2 links give it different values, the inverse function throws, so no link loses its reverse in silence. A test reads `data/` and makes sure that each link has its reverse, from both sides.

## Slugs

The slug of an entity comes from its English name: the name in lower case, with the accents removed, and each run of other characters than `a`–`z` and `0`–`9` changed to 1 `-`, with no `-` at the start or the end. When 2 or more entities of 1 kind have the same slug, the entity with the lowest ID (the order of the characters of the ID) keeps it, and each other entity gets `-<id>` at the end, with the ID written as a slug. So a slug does not change while the name does not change, and a new entity with the same name does not change the slug of the old one. An entity with no page has no slug.

## Icons

The model decodes the icon textures to PNG files in 2 sizes, with the names that the workbook uses now (for example `item_l_012.png`):

- `data/icons/128/`: 128 × 128 px, for the site. The site needs 128 px for screens with 2 device pixels for each CSS pixel.
- `data/icons/64/`: 64 × 64 px, for the workbook. The design requirement "Icons" of [the tooling design](tooling.md) sets this size. The workbook copies these files to `output/icons/`.

The workbook cannot read the game files and has no image library, so the model makes both sizes from the same decoded texture.

## The package interface

The index of `@nelke/model` exports only what a consumer needs: the schemas, the types, `readData`, the enums and the layout of `data/` (the file names, the icon folder and the icon sizes). The layout has 1 definition, so the workbook and the site cannot name a folder that the model does not write. The parse, the joins and the writer are internal to the package, and only its command uses them. So a consumer cannot import a module that reads the game files.

## Rejected options

- 1 JSON file for all kinds. A change of 1 kind then shows as a diff of 1 large file, and the site loads data that a page does not need.
- Links stored on 1 side only, with the reverse built by each consumer. Then 2 consumers build the same reverse in 2 places.
- The joined text cells of the workbook in the model. The site needs links, not text, so the text would be a second form of the same fact.
- An ID made from the name. A rename then breaks each link. The slug is the only part that comes from the name.
