# Website

A static website for lookups of the game data of _Nelke & the Legendary Alchemists_. It is for players who want to find, for example, where to gather an item, what a recipe needs, or what a monster drops. The categories come from [decision 0001](../decisions/0001-site-categories.md) and [decision 0008](../decisions/0008-recipes-in-items.md). The look and the structure of the pages come from [decision 0005](../decisions/0005-icon-grids.md) and [decision 0007](../decisions/0007-clear-data-and-filters.md).

The owner accepted these requirements as a draft on 2026-11-02. The final approval waits on the second round of the HTML prototype (#11).

## General

| Name | Contract | Proof |
| --- | --- | --- |
| Host | The site is on GitHub Pages at `https://arkased.github.io/NelkeData/`. Each push to `main` that changes `data/` or `packages/site/` deploys it. | The run of the deploy workflow passes, and the root URL loads the Items page. |
| Legal notice | Each page has a short notice in the footer, on the model of [the legal page of Barrel Wisdom](https://barrelwisdom.com/blog/legal), a fan site for Gust games since 2021: "Unofficial fan site. We claim no affiliation with Koei Tecmo. The game data, images and texts are owned by Koei Tecmo, the copyright holder of _Nelke & the Legendary Alchemists_." | A UI test finds the notice on each page. |
| Static | The site is static files only. It needs no server and no database. | The build output is only HTML, CSS, JS and images. |
| Same data | Each value on the site is the same as the value in the workbook. The site shows only the data that helps a player. The workbook keeps all columns. | The site and the workbook read the same files of `data/`. A test compares a sample of entities. |
| Own look | A clear and organized view of the data comes first. The site has its own look in the colors of the game, so it does not look official ([decision 0009](../decisions/0009-own-look.md)). It uses no UI texture of the game for its frame parts: the background, the panels, the name plates, the header bars, the buttons and the tabs. It uses the game icons that carry data: the items, the monsters, the characters, the shops, the categories, the elements, the money, the synthesis cost and the friendship hearts. | The owner approves the prototype. A test finds no UI texture of the game in the CSS. |
| No spreadsheet look | No page shows rows of labels and values, or tables. A category is a grid of icons. A detail is a composed panel: for example the name, element icons and material slots. | The owner approves the prototype. |
| Icon grid and modal | A category page shows the game icons of its entities in a grid, in the order of the game. A click on an icon opens the detail in a modal, and the URL changes to the URL of the entity. Back closes the modal. Each entity also has its own page for a direct visit. | A UI test opens an icon, checks the URL, and goes back. |
| Search | Each category page has a search box. The grid shows only the icons whose English or Japanese name contains the text. The search does not reload the page. | A UI test types a name and finds the icon. |
| Filters | Each category page has filters. The grid shows only the icons that match all the selected filters. The filters are in the URL. | A UI test selects 2 filters. |
| Placeholder data | An entity with placeholder data does not show on the site: for example an item with the name "Item 015", or with no name. The workbook drops it too. | A test makes sure that no name on the site matches the placeholder patterns. |
| Numbers | A rate, a price or a ratio shows with at most 1 decimal, with no floating-point error. | A test of the number format. |
| Names | The name of an entity shows under its icon in each grid. | A UI test. |
| Units | Each value shows in 1 format with its unit, on all pages. The formats are in `docs/design/site.md`, section "UI standard". | The audit of the UI test. |
| Links | Each mention of an entity that has a page is a link to that page. A mention of an entity with no page is plain text. | A build check finds each internal link, and fails when a link has no target. |
| Stable URLs | The URL of a page comes from the English name of its entity. It does not change between builds while the name does not change. When 2 entities have the same name, each URL is still unique. | A test builds the URLs 2 times and compares them. A test makes sure that all URLs are unique. |
| Any width | The layout adapts to the width of the window, at each width from 360 px (a small phone) up. The page has no horizontal scroll. Only a research tree scrolls horizontally, inside its own box. | UI tests at 360, 768, 1280 and 1920 px. |

## Items (priority 1)

| Name | Contract | Proof |
| --- | --- | --- |
| Item grid | 1 page shows the icons of all items (305 in the game data, with the placeholder items). There is no separate recipe page. The filters are the item category of the game, the shop that sells the item, and "Craftable" (the items that a recipe makes, 169 at present). The element items are not a separate category. | A UI test selects "Craftable" and finds 1 recipe item. |
| Item detail | The top of the detail shows the name, the category, the price, the shops that sell the item ("Sold at", with the shop icons) and the description. The elements that the Reduce command gives show as a small note, not as a section. | A UI test of 1 item with each kind of data. |
| How to get | The detail shows each way to get the item: the areas where you gather it, with the rate; the special gather points of an area; the monsters that drop it, with the quantity; the farm that grows it. Each area and monster is a link. A fact of the area itself, for example the task that opens it, does not show here. | A UI test of 1 gather item and 1 drop. |
| Used in | The detail shows each item whose recipe uses the item as a material, as links. | A UI test of 1 material. |

## Synthesis (priority 1)

The detail of an item that a recipe makes has a section "Synthesis". The detail of any other item does not have it.

| Name | Contract | Proof |
| --- | --- | --- |
| Synthesis | The section shows the synthesis cost and the minimum alchemy level, and the materials as icons with names (links), each with the quantity that the recipe needs. | A UI test of 1 craftable item and 1 item that is not craftable. |
| Recipe value | The section shows the price of the result, the input cost, the added value, the added value per synthesis cost, and the materials that have no price. It shows them as 1 clear calculation: the result price minus the input cost is the added value, and the added value divided by the synthesis cost is the value per synthesis cost. The formulas are the formulas of the workbook (`README.md`, section "Recipe value"). | A test compares the values with the workbook. |
| Unlock | The section shows how the recipe unlocks: the recipe set, the teacher (link) and the friendship level, the research (link), and the story event. | A UI test. |

## Research (priority 2)

| Name | Contract | Proof |
| --- | --- | --- |
| Research trees | 1 page shows the 4 research trees of the game, 1 tab each, with the names of the game. Each tree has the layout of the game: the nodes in the columns and rows of the game data, with the lines between them. | A UI test finds 1 node in its column. The owner approved the layout. |
| Research detail | A click on a node opens the research in the modal. It shows the researchers, the friendship level that the research needs with the researcher, the duration in turns, the money, the materials (links), the prerequisite research (links), and what it gives (the recipe set with links to the items that its recipes make, and the bonus). | A UI test. |

## Areas, Monsters and Characters (priority 2)

| Name | Contract | Proof |
| --- | --- | --- |
| Areas | 1 page shows all areas, grouped under their top-level zones in the order of the game. The page is not an icon grid: each zone is 1 game panel that holds the names of its areas. An interior is a separate area from the area outside it. The area detail shows the dispatch data of the area, and each spot of the area: the difficulty, the gather items with rates (links), the special spot items (links), and the monsters and bosses with levels (links). A Bountiful spot shows no monsters, and a Bestial spot shows no gather items. | A UI test. |
| Monsters | 1 page shows the icons of all monsters, with a filter for monsters and bosses. The detail shows the name, the description, the element DEF, the drops (links) and the areas with levels (links). | A UI test. |
| Characters | 1 page shows the face icons of all characters, with a filter for the group: Alchemist or Townsfolk. The detail shows the name, the description, the source game, the skills, the join conditions (the event, the town population and the turn), and the recipe sets that the character teaches, with links to the items that the recipes make. The meaning of the join turn is not confirmed, so the detail marks it as not confirmed. | A UI test. |
