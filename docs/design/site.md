# Website

The page and UI layouts of the website. [The site requirements](../requirements/site.md) ask for this design. A category page is a grid of game icons, and an icon opens its detail in a modal ([decision 0005](../decisions/0005-icon-grids.md)). A clear view of the data comes first, and the game parts serve it ([decision 0007](../decisions/0007-clear-data-and-filters.md)).

The owner approved the research tree layout. The other layouts wait on the approval of the prototype (#11).

## Visual style

The site uses the UI parts of the game where they make the data clear. The textures are in `20th_window.g1t` and `20th_common.g1t`. The rectangle and the 9-slice borders of each part are in `extracted/saves/ui/gen_styles/uis_gen_20th_*.xml`. CSS draws each part with `border-image`, so a part fits any size. Any other element is a plain element in the colors of the game.

| Site part | Look |
| --- | --- |
| Page background | A background of `20th_bg*.g1t` |
| Panel, modal | The cream panels with corner ornaments |
| Name of an entity | The gold name plates |
| Section title | The brown header bars |
| Grid cell | The item icon with no extra frame, because the icons already have a margin. A plain highlight on hover and on focus. |
| Friendship level | The heart icons of the game |
| Filter | A plain toggle button with the game category icon or the shop icon, and the name |
| Value, calculation | Plain text in a clear layout, for example a sum with its operators |

The spacing follows 1 scale of 4 px steps. Each panel has the same gutter on all sides. A text in a bar or a name plate has the same space above and below it, and it does not touch the ornaments of the bar.

## UI standard

Each page follows these rules. The UI test checks each rule that a script can check. The orchestrator checks the screenshots against the other rules before the owner sees a page.

### Values and units

Each kind of value has 1 format on all pages.

| Value | Format | Example |
| --- | --- | --- |
| Money (a price, a cost, a research fee) | The coin icon of the game, then the number. | 🪙 1,200 |
| Synthesis cost | The synthesis cost icon of the game, then the number. | ⚗ 4 |
| Rate | The number, then `%`. At most 1 decimal. | 12.5% |
| Quantity of an item | `×` and the number, in a badge on the bottom right corner of the item icon, as in the material slots of the game. Only for 2 or more. The section title gives the role (Materials, Drops, Gives). | ×3 |
| Rate or level on a tile | A badge on the bottom left corner of the icon, in the same style as the quantity badge. A tile has no value line. | 25%, Lv 34 |
| Research duration | The number, then `turns` (`turn` for 1). | 2 turns |
| Level | `Lv`, then the number. | Lv 12 |
| Multiplier | `×`, then the number. | ×1.25 |
| Friendship level | The heart icons of the game, then the number. | ♥ 5 |
| Large number | A comma for each 3 digits. | 12,000 |

A value never shows with no unit or no role word. A missing value does not show: the row or the line goes away. The page never shows a placeholder such as "0", "-" or "none" for a missing value.

### Icons

- Each entity mention has its game icon: an item, a monster, a character, a shop. A research has no icon in the game, so it shows the icon of its output, in this order: the first prize item, the first item of the prize recipe set, the bonus item. A research with no output in the game files shows the research icon of the game. The researchers show only on the research detail.
- A shop has the icon of its building. A category filter has the icon of the game category.
- A unit with a game icon (money, synthesis cost, friendship) shows the icon each time.

### Components

- 1 tile component shows each entity on each page: the icon, the name under it, and at most 1 value line under the name. The tile has the same size in each grid of a page.
- 1 section component: a header bar with the title, then the content. A section with no content does not show.
- 1 stat component: a small label above a value with its unit.
- The text of the page has 3 sizes only: the title, the body and the small label.

### Content

- Each section holds only facts of its title. "How to get" holds only the ways to get the item: gather, drop, farm. A shop is not a way to get an item in this sense: it shows as "Sold at", next to the price.
- The page shows no text that tells the user how to use the page, for example "click a node" or "scroll sideways". A section has no caption that repeats its title or the meaning of a unit.
- A label has 1 style on all pages.
- A fact that is the same for each entity of a category (a global table of the game) does not show on each entity.
- A condition that each player meets does not show: a join turn of 1 or less, and a town population at or below the start population of the game (`OC_INITIAL_POPULATION` in `out_constant/out_constant.xml`, 30).
- A value that is the same for each entity does not show. Each monster drop has the rate 100%, so a drop shows no rate.
- A group shows only when the player can use it to find an entity. The group of a character shows as a line and as a filter only for "Alchemist" and "Townsfolk". The story characters and the fairy show no group and match no group filter value, and "Story" and "Fairy" show nowhere. The game of origin of a character shows as a line and as a filter.
- A tooltip shows only text that is not already visible.
- The level of an area uses the term of the game: "Investigation Lv". It rises from 1 to 5 as the player sends teams to the area. Some monster groups appear only from Investigation Lv 2 or 3 (`REQ_LV` in `expl_encount/area_encount.xml`).
- The treasure chests and the tool gathers (Bug Net, Digging, Fishing) are 1 row of columns, in the same order on each area and zone detail.
- The friendship level uses the heart icon of the game, never an emoji or a font glyph.
- "Joins the town" on a character shows the conditions of `character/character_app_con.xml`: the town population and the turn. A character whose join event is not the game start (`EVENT_MS01_010`) joins in a story event. The event has no name in the game files, so the section says "Joins in a story event" and shows the tiles of the other characters with the same event, under "Joins with". 100 characters join this way, for example Gino with Melvia, Mimi, Marc, Gerard, the 2 Chims and Piana.
- A short list of values is 1 line in the top block of the detail, not a section. For example the element DEF of a monster is 1 line of element icons, each with its value.
- The related parts of a detail are in 1 panel: on an area, the difficulty, the gather items and the monsters of the area; on a zone, its areas and its treasure.
- The parts of 1 row align on 1 baseline. A header row of a detail (for example the researchers and the stats of a research) stays on 1 row at 768 px and wider.
- The page shows no count of the visible entities.
- A fact shows 1 time on a page.
- A fact of an area does not show on the page of an item, for example the condition that opens the area.

### Self-review

Before the owner sees a round, the orchestrator does these steps:

1. Run the UI test. It must pass with no audit failure.
2. Open each screenshot at 360, 768, 1280 and 1920 px. Write 1 line for each screenshot: its name and the defects found, or "no defect".
3. Check each screenshot against each rule of this section, and against the spacing and the alignment rules of "Visual style".
4. Fix each failure, and do steps 1 to 3 again.

## Shared parts

Each part is 1 component. A page composes parts and has no markup of its own.

| Part | Holds | Behavior |
| --- | --- | --- |
| Header | The site name, and the links to the 5 categories with their game icons. | Below 600 px, the links go into a menu button. |
| Filters | 1 group of toggle buttons for each filter: the item category, and the shop. | Each group combines its selected values with OR. The groups combine with AND. No selection in a group shows all. The selection is in the URL. |
| Search box | A text box. | Each key filters the icons at once, on the English and the Japanese name. The text is in the URL. |
| Icon grid | The game icons in the order of the game. The number of columns follows the width. | The name shows on hover and on focus. A click opens the modal. Each icon is a real link, so Ctrl+click opens the page of the entity in a new tab. |
| Modal | A game panel with the detail of the entity, and a close button. | 1. The URL changes to the URL of the entity. Back closes the modal. 2. A link inside the modal replaces its content. Back shows the content before it. 3. Esc, the close button and a click outside close it. The focus goes back to the icon. 4. On a narrow window, the modal fills the screen. |
| Entity page | The same detail panel as the modal, on a full page. | The page for a direct visit, a search engine and a new tab. |
| Entity link | The icon of the entity, and its name. | It opens the entity in the modal. An entity with no page is plain text. |

## Pages

The site has no landing page. The root URL shows the Items page.

### Category pages (Items, Monsters, Characters)

- **Blocks, in order:** Header. Search box and filters. Icon grid.
- **Empty state:** The panel says "Nothing matches the search." It has a button that clears the search.

### Areas page

- **Blocks, in order:** Header. Search box. 1 game panel for each top-level zone, in the order of the game.
- **Zone panel:** The name of the zone on a header bar, and the names of its areas on name plates. A click on an area opens its detail in the modal.
- **Empty state:** The same as on a category page.

### Details

Each detail is 1 game panel. The prototype composes each panel from the game parts, with the data that the requirements list for its category. A material is a tile with its quantity in the format of the UI standard. An element is its icon with its value.

### Research tree page

- **Purpose:** Browse the research as the game shows it: a grid of nodes with lines from left to right.
- **Blocks, in order:** Header. 1 tab for each of the 4 trees, with the name of the tree in the game. Tree box.
- **Tree box:** The game stores each tree as a grid of 20 columns. Each node has its icon and its name, in the column and the row of the game. The game uses the even rows for the nodes and the odd rows for the lines only. Each line is 1 prerequisite of `study/stdy_conditions.xml`: it leaves the right side of the prerequisite and enters the left side of the research that needs it. The lines that enter 1 node join before the node, so 3 prerequisites show as 3 lines that meet. No line shows that is not a prerequisite. The link types of the tree files only confirm the drawing. The box scrolls horizontally inside the page. The page itself does not scroll horizontally.
- **Interactions:** A click on a node opens the research in the modal.
- **States:** A node that the game has with no name shows its ID.
