# Website

A static website for lookups of the game data of _Nelke & the Legendary Alchemists_. It is for players who want to find, for example, where to gather an item, what a recipe needs, or what a monster drops. The categories come from [decision 0001](../decisions/0001-site-categories.md). The look and the structure of the pages come from [decision 0005](../decisions/0005-icon-grids.md) and [decision 0007](../decisions/0007-clear-data-and-filters.md).

The owner accepted these requirements as a draft on 2026-11-02. The final approval waits on the second round of the HTML prototype (#11).

## General

| Name | Contract | Proof |
| --- | --- | --- |
| Host | The site is on GitHub Pages at `https://arkased.github.io/NelkeData/`. Each push to `main` that changes `data/` or `packages/site/` deploys it. | The run of the deploy workflow passes, and the home page loads. |
| Static | The site is static files only. It needs no server and no database. | The build output is only HTML, CSS, JS and images. |
| Same data | Each value on the site is the same as the value in the workbook. The site shows only the data that helps a player. The workbook keeps all columns. | The site and the workbook read the same files of `data/`. A test compares a sample of entities. |
| Game UI | A clear and organized view of the data comes first. The site uses the UI textures of the game where they make the data clear: the panels, the name plates, the header bars, the icons and the friendship hearts. Where a game part makes the data harder to read, the site uses a plain element in the colors of the game. | The owner approves the prototype, and compares the site with the game by eye. |
| No spreadsheet look | No page shows rows of labels and values, or tables. A category is a grid of icons. A detail is a composed game panel: for example a name plate, element icons and material slots. | The owner approves the prototype. |
| Icon grid and modal | A category page shows the game icons of its entities in a grid, in the order of the game. A click on an icon opens the detail in a modal, and the URL changes to the URL of the entity. Back closes the modal. Each entity also has its own page for a direct visit. | A UI test opens an icon, checks the URL, and goes back. |
| Search | Each category page has a search box. The grid shows only the icons whose English or Japanese name contains the text. The search does not reload the page. | A UI test types a name and finds the icon. |
| Filters | Each category page has filters. The grid shows only the icons that match all the selected filters. The filters are in the URL. | A UI test selects 2 filters. |
| Placeholder data | An entity with placeholder data does not show on the site: for example an item with the name "Item 015", or with no name. The workbook keeps it. | A test makes sure that no name on the site matches the placeholder patterns. |
| Numbers | A rate, a price or a ratio shows with at most 1 decimal, with no floating-point error. | A test of the number format. |
| Names | The name of an entity shows when the pointer is on its icon, or when the icon has the focus. | A UI test. |
| Links | Each mention of an entity that has a page is a link to that page. A mention of an entity with no page is plain text. | A build check finds each internal link, and fails when a link has no target. |
| Stable URLs | The URL of a page comes from the English name of its entity. It does not change between builds while the name does not change. When 2 entities have the same name, each URL is still unique. | A test builds the URLs 2 times and compares them. A test makes sure that all URLs are unique. |
| Any width | The layout adapts to the width of the window, at each width from 360 px (a small phone) up. The page has no horizontal scroll. Only a research tree scrolls horizontally, inside its own box. | UI tests at 360, 768, 1280 and 1920 px. |

## Items (priority 1)

| Name | Contract | Proof |
| --- | --- | --- |
| Item grid | 1 page shows the icons of all items (305 at present, with the placeholder items). The filters are the item category of the game and the shop that sells the item. The element items are not a separate category. | A UI test. |
| Item detail | The detail shows the name, the description, the category, the price, the shops that sell the item, the farm that grows it, and the elements that the Reduce command gives for it. | A UI test of 1 item with each kind of data. |
| How to get | The detail shows each source of the item: the areas and spots where you gather it, with the rate and the task that opens the area; the monsters that drop it, with quantity and rate; the recipe that makes it. Each area, monster and recipe is a link. | A UI test of 1 gather item and 1 drop. |
| Used in | The detail shows each recipe that uses the item as a material, with the quantity, as links. | A UI test of 1 material. |

## Recipes (priority 1)

| Name | Contract | Proof |
| --- | --- | --- |
| Recipe grid | 1 page shows the icons of all recipes (169 at present). The filters are the filters of the item grid, applied to the result item. | A UI test. |
| Recipe detail | The detail shows the item that the recipe makes (link), the synthesis cost and the minimum alchemy level next to it, and the materials as icon slots with quantities (links). | A UI test of 1 recipe. |
| Recipe value | The detail shows the price of the result, the input cost, the added value, the added value per synthesis cost, and the materials that have no price. It shows them as 1 clear calculation: the result price minus the input cost is the added value, and the added value divided by the synthesis cost is the value per synthesis cost. The formulas are the formulas of the workbook (`README.md`, section "Recipe value"). | A test compares the values with the workbook. |
| Unlock | The detail shows how the recipe unlocks: the recipe set, the teacher (link) and the friendship level, the research (link), and the story event. | A UI test. |

## Research (priority 2)

| Name | Contract | Proof |
| --- | --- | --- |
| Research trees | 1 page shows the 4 research trees of the game, 1 tab each. Each tree has the layout of the game: the nodes in the columns and rows of the game data, with the lines between them. | A UI test finds 1 node in its column. The owner approved the layout. |
| Research detail | A click on a node opens the research in the modal. It shows the researchers, the duration, the money, the materials (links), the prerequisite research (links), and what it gives (the recipe set with recipe links, and the bonus). | A UI test. |

## Areas, Monsters and Characters (priority 2)

| Name | Contract | Proof |
| --- | --- | --- |
| Areas | 1 page shows all areas, grouped under their top-level zones in the order of the game. The page is not an icon grid: each zone is 1 game panel that holds the names of its areas. The area detail shows each spot of the area: the difficulty, the gather items with rates (links), the special spot items (links), and the monsters and bosses with levels (links). | A UI test. |
| Monsters | 1 page shows the icons of all monsters, with tabs for monsters and bosses. The detail shows the name, the description, the rank, the element DEF, the drops (links) and the areas with levels (links). | A UI test. |
| Characters | 1 page shows the face icons of all characters, with tabs for the character types. The detail shows the name, the description, the source game, the aptitudes, the skills, the join conditions (the event, the town population and the turn), and the recipe sets that the character teaches, with links to their recipes. The meaning of the join turn is not confirmed, so the detail marks it as not confirmed. | A UI test. |
