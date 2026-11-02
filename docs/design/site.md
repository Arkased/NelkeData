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
| Filter | A plain toggle button with the game category icon or the shop name |
| Value, calculation | Plain text in a clear layout, for example a sum with its operators |

The spacing follows 1 scale of 4 px steps. Each panel has the same gutter on all sides.

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

### Home

The 5 categories, each with its game icon: Items, Research, Areas, Monsters and Characters.

### Category pages (Items, Monsters, Characters)

- **Blocks, in order:** Header. Search box and filters. Icon grid.
- **Empty state:** The panel says "Nothing matches the search." It has a button that clears the search.

### Areas page

- **Blocks, in order:** Header. Search box. 1 game panel for each top-level zone, in the order of the game.
- **Zone panel:** The name of the zone on a header bar, and the names of its areas on name plates. A click on an area opens its detail in the modal.
- **Empty state:** The same as on a category page.

### Details

Each detail is 1 game panel. The prototype composes each panel from the game parts, with the data that the requirements list for its category. A material is an icon slot with its quantity. An element is its icon with its value.

### Research tree page

- **Purpose:** Browse the research as the game shows it: a grid of nodes with lines from left to right.
- **Blocks, in order:** Header. 1 tab for each of the 4 trees. Tree box.
- **Tree box:** The game stores each tree as a grid of 20 columns. Each node has its icon and its name, in the column and the row of the game. The lines between the nodes follow the link types of the game: horizontal, vertical, up and down. The box scrolls horizontally inside the page. The page itself does not scroll horizontally.
- **Interactions:** A click on a node opens the research in the modal.
- **States:** A node that the game has with no name shows its ID.
