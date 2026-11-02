# Website

The page and UI layouts of the website. [The site requirements](../requirements/site.md) ask for this design. The list pattern comes from Barrel Wisdom: a grid of tiles, and a modal with the detail of the selected tile.

The owner approved the research tree layout. The other layouts and the visual style wait on the approval of the prototype (#11).

## Visual style

The site uses the UI parts of the game ([decision 0004](../decisions/0004-game-ui-style.md)). The textures are in `20th_window.g1t` and `20th_common.g1t`. The rectangle and the 9-slice borders of each part are in `extracted/saves/ui/gen_styles/uis_gen_20th_*.xml`.

| Site part | Game part |
| --- | --- |
| Page background | A background of `20th_bg*.g1t` |
| Panel, modal | The cream panels with corner ornaments |
| Section title, modal head | The brown header bars and the gold name plates |
| Tile | The cream plates with a border, and the yellow plate for the selected state |
| Tab, filter button | The tabs and the category icons (material, leaf, jar, hat and others) |
| Rank | The rank letters A+ to D |
| Item detail | The notebook page |

The prototype finds the game screen for each page and copies its layout.

## Shared parts

Each part is 1 component. A page composes parts and has no markup of its own.

| Part | Holds | Behavior |
| --- | --- | --- |
| Header | The site name, and the links to the 6 categories: Items, Recipes, Research, Areas, Monsters, Characters. | Below 600 px, the links go into a menu button. |
| Footer | The source of the data, the link to the workbook on Google Sheets, and the link to the repo. | None. |
| Filter bar | A search box, 1 button group for each filter, a sort menu with an order button, and the count of shown tiles ("42 of 305"). | Each change filters the tiles at once, with no reload. The filter state is in the query of the URL, so a filtered list can be shared and Back restores it. |
| Tile | The icon (64 px), the name, and 1 line of key facts of the category. | A click opens the modal. Ctrl+click or a middle click opens the page of the entity in a new tab, because the tile is a real link. |
| Tile grid | The tiles in rows. The column count follows the width: at 360 px, 2 columns. | None. |
| Modal | A head with the icon, the English name, the Japanese name and a close button. The body has the detail blocks of the entity. The foot has the link "Open as page". | 1. The URL changes to the URL of the entity. Back closes the modal. 2. A link to an entity inside the modal replaces the content of the modal. Back shows the content before it. 3. Esc, the close button and a click outside the modal close it. The focus goes back to the tile. 4. Below 600 px, the modal fills the screen. |
| Entity page | A breadcrumb (for example "Items › Lumber"), the head of the modal, and the same detail blocks. | The page for a direct visit, a search engine and a new tab. The modal shows the content of this page. |
| Fact list | Pairs of a label and a value, in 2 columns, or 1 column below 600 px. | None. |
| Entity link | A small icon and the name of the entity. | It opens the entity in the modal. An entity with no page is plain text. |
| Data table | A table with a header row. | A wide table scrolls inside its own box. |

## Pages

### Home

- **Purpose:** Go to a category.
- **Blocks, in order:** Header. 1 large tile for each category, with its icon and its count ("Items · 305"). Footer.
- **States:** None.

### List pages (Items, Recipes, Areas, Monsters, Characters)

- **Purpose:** Find 1 entity of the category.
- **Primary block:** The tile grid.
- **Blocks, in order:** Header. Title with the count. Filter bar. Tile grid. Footer.
- **Empty state:** "No <category> match the filters." and a button "Clear the filters".

The filters, the sort keys and the key facts of a tile for each category:

| Category | Filters | Sort keys | Key facts on the tile |
| --- | --- | --- | --- |
| Items | Category, sub-category, "how to get" (gather, drop, recipe, shop, farm) | Name, rank, price | Category · Rank N |
| Recipes | Category, sub-category, teacher | Name, rank, price, synthesis cost, added value, added value per synthesis cost | Synth N · +N value |
| Areas | None | Game order, name | Opens after task N |
| Monsters | Type (monster, boss) | Name, rank, EXP | Type · Rank N |
| Characters | Type, source game | Name, rank | Source game |

### Item detail

- **Purpose:** Show what the item is, how to get it, and what uses it.
- **Blocks, in order:**
  1. Description of the game.
  2. Fact list: category, sub-category, rank, price, base sales, the shops that sell it, growing area and base yield, the Reduce elements.
  3. How to get. 1 sub-block for each source that applies: "Gather" (a data table of area link, spot, rate and the task that opens the area), "Special spots" (the area links), "Drops" (monster links with quantity and rate), "Synthesis" (the link to the recipe).
  4. Used in: the links to the recipes that use the item as a material, with the quantity.
- **States:** A block with no data is not shown.

### Recipe detail

- **Purpose:** Show what the recipe needs, what the result is worth, and how to unlock it.
- **Blocks, in order:**
  1. The result: the link to the item.
  2. Materials: 1 row for each material, with the item link, the quantity and the price.
  3. Fact list: synthesis cost, input cost, price, added value, added value per synthesis cost. The unpriced inputs, when there are some.
  4. Unlock: the recipe set, the teacher link and the friendship level, the research link, and the story event.

### Research detail

- **Purpose:** Show what a research costs, what it needs first, and what it gives.
- **Blocks, in order:**
  1. Fact list: the researchers (character links), the duration, the money.
  2. Materials: the item links with quantities.
  3. Needs first: the links to the prerequisite research, and the district.
  4. Gives: the recipe set and the links to its recipes, and the bonus.
  5. The link "Show in the tree". It opens the tree page at this node.

### Research tree page

- **Purpose:** Browse the research as the game shows it: a grid of nodes with lines from left to right.
- **Primary block:** The tree box.
- **Blocks, in order:** Header. 1 tab for each of the 4 trees. Tree box. Footer.
- **Tree box:** The game stores each tree as a grid of 20 columns. Each node has its icon and its name, in the column and the row of the game. The lines between the nodes follow the link types of the game: horizontal, vertical, up and down. The box scrolls horizontally inside the page. The page itself does not scroll horizontally.
- **Interactions:** A click on a node opens the research in the modal. The tab is in the URL.
- **States:** A node that the game has with no name shows its ID.

### Area detail

- **Purpose:** Show what you find in an area and when it opens.
- **Blocks, in order:**
  1. Fact list: the task that opens the area, and the difficulty rank at area level 1 to 5.
  2. Special spot items: the item links.
  3. 1 section for each spot, in the order of the game: the route, the gather items (item links with rates, highest rate first), the monsters and the bosses (monster links with levels and the area level that they need).

### Monster detail

- **Purpose:** Show where a monster is, what it drops and how strong it is.
- **Blocks, in order:**
  1. Description of the game.
  2. Fact list: type, rank, wage, EXP.
  3. Stats: a data table of the base stats, the growth for each level, and the element DEF.
  4. Drops: item links with quantity and rate.
  5. Found in: area links with levels.

### Character detail

- **Purpose:** Show a character's role, stats and what they teach.
- **Blocks, in order:**
  1. Description of the game.
  2. Fact list: type, source game, rank, aptitudes, battle role, friendship start and maximum.
  3. Stats: the base stats and the growth for each level.
  4. Skills: the name and the level or event that gives it.
  5. Joins: the event, the population and the turn.
  6. Teaches: each recipe set with its friendship level and its recipe links.
