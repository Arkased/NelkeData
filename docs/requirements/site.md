# Website

A static website for lookups of the game data of _Nelke & the Legendary Alchemists_. It is for players who want to find, for example, where to gather an item, what a recipe needs, or what a monster drops. The categories come from [decision 0001](../decisions/0001-site-categories.md).

Status: draft. It needs the approval of the owner.

## General

| Name | Contract | Proof |
| --- | --- | --- |
| Host | The site is on GitHub Pages at `https://arkased.github.io/NelkeData/`. Each push to `main` that changes `data/` or `packages/site/` deploys it. | The run of the deploy workflow passes, and the home page loads. |
| Static | The site is static files only. It needs no server and no database. | The build output is only HTML, CSS, JS and images. |
| Same data | Each value on the site is the same as the value in the workbook. | The site and the workbook read the same files of `data/`. A test compares a sample of rows. |
| Links | Each mention of an entity that has a page is a link to that page. A mention of an entity with no page is plain text. | A build check finds each internal link, and fails when a link has no target. |
| Stable URLs | The URL of a page comes from the English name of its entity. It does not change between builds while the name does not change. When 2 entities have the same name, each URL is still unique. | A test builds the URLs 2 times and compares them. A test makes sure that all URLs are unique. |
| Search | Each list page has a text box. The list shows only the rows whose English or Japanese name contains the text. The filter does not reload the page. | A UI test types a name and finds the row. |
| Sort | Each column of a list page sorts the list when you select its header. A second selection reverses the order. | A UI test. |
| Narrow screens | At a width of 360 px, the page has no horizontal scroll. A wide table scrolls inside its own box. | A UI test at 360 px. |
| Icons | Each item, recipe, monster and character shows its game icon when the game has one. | A UI test finds the icon of 1 item. |

## Items (priority 1)

| Name | Contract | Proof |
| --- | --- | --- |
| Item list | 1 page lists all items (305 at present) with the icon, name, category, sub-category, rank and price. Filters for category and sub-category. | A UI test. |
| Item page | 1 page for each item. It shows all the columns of the Items sheet of the workbook. | A UI test of 1 item with each field. |
| Gather data | The item page lists each spot where you can gather the item. Each row gives the area (link), the spot, the rate and the task after which the area opens. Special spots show the area. | A UI test of 1 gather item. |
| Drops | The item page lists each monster (link) that drops the item, with the quantity and the rate. | A UI test. |
| Recipe links | The item page links to the recipe that makes the item, and to each recipe that uses the item as a material. | A UI test of 1 material. |

## Recipes (priority 1)

| Name | Contract | Proof |
| --- | --- | --- |
| Recipe list | 1 page lists all recipes (169 at present) with the icon, item, category, rank, price, synthesis cost, added value and added value per synthesis cost. Filters for category and sub-category. | A UI test. |
| Recipe page | 1 page for each recipe. It shows all the columns of the Recipes sheet of the workbook. Each material is a link to its item, with its quantity. The item that the recipe makes is a link. | A UI test of 1 recipe. |
| Unlock | The recipe page shows how the recipe unlocks: the recipe set, the teacher (link) and the friendship level, the research and its prerequisites, and the story event. | A UI test. |

## Areas, Monsters and Characters (priority 2)

| Name | Contract | Proof |
| --- | --- | --- |
| Area pages | 1 list page of all areas, and 1 page for each area. The area page shows the data of the Zones sheet for each spot of the area: difficulty, gather items with rates (links), special spot items (links), monsters and bosses with levels (links). | A UI test. |
| Monster pages | 1 list page with filters for type, and 1 page for each monster. The page shows all the columns of the Monsters sheet. Drops are links to items. The areas are links. | A UI test. |
| Character pages | 1 list page with filters for type and source game, and 1 page for each character. The page shows all the columns of the Characters sheet. The recipe sets that the character teaches link to their recipes. | A UI test. |
