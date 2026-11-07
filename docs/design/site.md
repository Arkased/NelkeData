# Website

The page and UI layouts of the website. [The site requirements](../requirements/site.md) ask for this design. A category page is a grid of game icons, and an icon opens its detail in a modal ([decision 0005](../decisions/0005-icon-grids.md)). A clear view of the data comes first ([decision 0007](../decisions/0007-clear-data-and-filters.md)).

The owner approved the layouts of the prototype (#11) on 2026-11-02: the Items, Areas, Monsters, Characters and Research pages, and their details. The owner approved the About page and the header with the site name (#15) on 2026-11-03. A new page (for example the buildings) needs its own prototype and a separate approval before it is built.

## Design requirements

The orchestrator made these rules. They are not owner requirements, and the orchestrator changes them when a better design exists.

| Name | Rule |
| --- | --- |
| Static | The site is static files only, with no server and no database. |
| Same data | The site reads its own data copy `prototype/data.js`. Each value is the same as the value in `data/`, except where an owner requirement changes what shows (for example no gather items on a Bestial spot, no join conditions that each player meets). The site shows only the data that helps a player. |
| Order | A grid shows its entities in the order of the game. |
| Names | The name of an entity shows under its icon in each grid. |
| Header and footer | The header of each page shows the site name and the tagline. The footer of each page shows the legal notice and a link to the About page. |
| Numbers | A rate, a price or a ratio shows with at most 1 decimal. |
| Units | Each value shows in 1 format with its unit, by the section "UI standard". |
| Width | The layout works at each width from 360 px up, with no horizontal scroll of the page. Only a research tree scrolls horizontally, inside its own box. |
| Item contents | The item detail shows the name, the category, the price and the description. "How to get" shows the gather areas with rates and the special gather points. "Used in" shows the items whose recipes use the item. The recipe value shows the materials that have no price, as 1 calculation. The unlock shows the recipe set, the teacher, the research and the story event. |
| Research contents | The research tree page has 1 tab for each of the 4 trees. The research detail shows the researchers, the money, the materials and the prerequisite research. |
| Area contents | The area detail shows each spot: the difficulty, the gather items with rates, the special spot items, and the monsters and bosses with levels. |
| Monster contents | The Monsters page has a filter for monsters and bosses. The detail shows the description, the element DEF, the drops and the areas with levels. |
| Character contents | The Characters page shows only the characters that can join the town. The detail shows the description, the source game, the skills, the join conditions and the recipe sets that the character teaches. The join turn is marked as not confirmed. |

The proof of the owner requirements of the site: the owner approved the prototype, and the prototype is the live site.

## Visual style

The site has its own plain look in the colors of the game: cream, warm brown and gold ([decision 0009](../decisions/0009-own-look.md)). It uses no UI texture of the game for a frame part, so it does not look official. CSS draws each part with colors, borders and radii only. The game icons that carry data stay: the items, the monsters, the characters, the shops, the categories, the elements, the money, the synthesis cost and the friendship heart with its digits.

| Site part | Look |
| --- | --- |
| Typeface | 2 open fonts (SIL Open Font License), not fonts of the game: Lora (a warm serif) for the titles and the entity names, and Source Sans 3 for all other text. The site serves the WOFF2 files itself from `prototype/fonts/`, with no font CDN. The CSS has no other `@font-face`. |
| Page background | 1 flat warm color. No image. |
| Header | A flat brown bar with the site name in cream text. No ornaments. |
| Panel, modal | A cream box with a thin brown border and a small radius. No ornaments. |
| Name of an entity | A heading in the title size, in dark brown. No plate. |
| Section title | Lora 700 in the body size, brown, with a thin rule under it. No bar. The zone name on the Areas page is a section title too. |
| Sub-title | A title inside a section, for example "Bonus", "Joins with" or "Gather": Source Sans 3 700 in the body size, dark brown, with no rule. It is never larger than the section title. |
| Grid cell | The game icon with no extra frame. A plain highlight on hover and on focus. |
| Friendship level | The heart icon of the game with its digit sprites |
| Button, filter, tab | A plain button with a thin border. A selected button has a gold fill. The game category icon or the shop icon, then the name. |
| Value, calculation | Plain text in a clear layout, for example a sum with its operators |

The page always keeps the space of the vertical scroll bar (`scrollbar-gutter: stable` on the root element). So no element moves when the scroll bar shows or goes away: when a filter makes the page shorter, or when a modal opens and locks the scroll of the page. The spacing follows 1 scale of 4 px steps. Each panel has the same gutter on all sides. A text in a bar or a button has the same space above and below it.

## UI standard

Each page follows these rules. The prototype test `prototype/scripts/test.mjs` checks each rule that a script can check. The orchestrator checks the screenshots against the other rules before the owner sees a page.

### Values and units

Each kind of value has 1 format on all pages.

| Value | Format | Example |
| --- | --- | --- |
| Money (a price, a cost, a research fee) | The coin icon of the game, then the number. | 🪙 1,200 |
| Synthesis cost | The synthesis cost icon of the game, then the number. | ⚗ 4 |
| Value per synthesis cost | The money format with at most 1 decimal, then `/` and the synthesis cost icon. | 🪙 21.5 / ⚗ |
| Rate | The number, then `%`. At most 1 decimal. | 12.5% |
| Quantity of an item | `×` and the number, in a badge on the bottom right corner of the item icon, as in the material slots of the game. Only for 2 or more, and only on an item icon. A monster tile in "How to get" of an item has no quantity badge, because the badge would read as a count of monsters. The section title gives the role (Materials, Drops, Gives). | ×3 |
| Rate or level on a tile | A badge on the bottom right corner of the icon, the same as the quantity badge. No tile has a quantity and a rate or a level together. A tile has no value line. A level range is 1 badge. | 25%, Lv 34, Lv 3–8 |
| Research duration | The number, then `turns` (`turn` for 1). | 2 turns |
| Level | `Lv`, then the number. | Lv 12 |
| Multiplier | `×`, then the number. | ×1.25 |
| Friendship level | The heart icon of the game (`fav-icon.png`) with the level on it in the digit sprites of the game (`favc-0` to `favc-10`), as in the game. A level above 10 uses 1 sprite for each digit. No number in the font of the page. | ♥ with a 5 on it |
| Large number | A comma for each 3 digits. | 12,000 |

A value never shows with no unit or no role word. A missing value does not show: the row or the line goes away. The page never shows a placeholder such as "0", "-" or "none" for a missing value.

### Icons

- Each entity mention has its game icon: an item, a monster, a character, a shop. A research has no icon in the game, so it shows the icon of its output, in this order: the first prize item, the first item of the prize recipe set, the bonus item. A research with no output in the game files shows the Research icon of the header (`img/ui/cat-10.png`). The researchers show only on the research detail.
- A shop has the icon of its building. A category filter has the icon of the game category.
- A unit with a game icon (money, synthesis cost, friendship) shows the icon each time.

### Components

- 1 tile function of `app.js` shows each entity on each page: the icon, the name under it, and at most 1 badge. The tile has the same size in each grid of a page.
- 1 section function: the section title, then the content. A section with no content does not show.
- 1 stat function: a small label above a value with its unit.
- The text of the page has only the sizes 12, 14, 16, 20, 22 and 28 px.

### Content

- Each section holds only facts of its title. "How to get" holds only the ways to get the item: gather, drop, farm. A shop is not a way to get an item in this sense: it shows as "Sold at", next to the price.
- The page shows no text that tells the user how to use the page, for example "click a node" or "scroll sideways". A section has no caption that repeats its title or the meaning of a unit.
- A label has 1 style on all pages.
- The title of a game is in italics everywhere, as standard style guides ask for the title of a work: the game of origin of a character, the game title in the tagline of the header, and the game title in the legal notice.
- A fact that is the same for each entity of a category (a global table of the game) does not show on each entity.
- A condition that each player meets does not show: a join turn of 1 or less, and a town population at or below the start population of the game (`OC_INITIAL_POPULATION` in `out_constant/out_constant.xml`, 30).
- A value that is the same for each entity does not show.
- The monster rank does not show anywhere, also not in a name.
- A rate of 100% does not show anywhere: on a monster drop (each drop has the rate 100%), on a treasure chest or a tool gather with 1 item, on a gather. The item is certain, so the rate tells nothing.
- A group shows only when the player can use it to find an entity. Each character shows its group, Alchemist or Townsfolk, as a line and as a filter. Alchemist is `CHARACTER_CATEGORY_ID` 2 in `character/character.xml`. Townsfolk is each other category: 3, and the 4 story characters Nelke, Misty, Knoss and Lotos (categories 0, 1 and 4). The game of origin of a character shows as a line.
- A tooltip shows only text that is not already visible.
- An entity shows 1 time in a list. A monster with more than 1 level in an area is 1 tile with a level range.
- The Characters page lists only the characters that can join the town: the join event in `character/character_app_con.xml` is not `EVENT_NONE`. A visitor, an NPC or a variant for an event (for example "Weapon Shopkeeper" or "Boss") has no page.
- The level of an area uses the term of the game: "Investigation Lv". It rises from 1 to 5 as the player sends teams to the area. Some monster groups appear only from Investigation Lv 2 or 3 (`REQ_LV` in `expl_encount/area_encount.xml`).
- The treasure chests and the tool gathers (Bug Net, Digging, Fishing) are 1 row of columns, in the same order on each area and zone detail.
- The friendship level uses the heart icon of the game, never an emoji or a font glyph.
- "Joins the town" on a character shows the conditions of `character/character_app_con.xml`: the town population and the turn. A character whose join event is not the game start (`EVENT_MS01_010`) joins in a story event. The event has no name in the game files, so the section says "Joins in a story event" and shows the tiles of the other characters with the same event, under "Joins with". 100 characters join this way, for example Gino.
- A short list of values is 1 line in the top block of the detail, not a section. For example the element DEF of a monster is 1 line of element icons, each with its value.
- The related parts of a detail are in 1 panel: on an area, the gather items and the monsters of the area; on a zone, its areas and its treasure.
- The parts of 1 row align on 1 baseline. A header row of a detail (for example the researchers and the stats of a research) stays on 1 row at 768 px and wider.
- The page shows no count of the visible entities.
- A fact shows 1 time on a page. The terms of a calculation are the exception: the "Selling price" stat of the recipe value repeats the price of the top block, because the requirement "Recipe value" asks for the full calculation in 1 place.
- A fact of an area does not show on the page of an item, for example the condition that opens the area.

### Self-review

Before the owner sees a round, the orchestrator does these steps:

1. Make sure that each page, filter, section and fact traces to an owner requirement of `docs/requirements/site.md` or to a design requirement of this doc.
2. Run the prototype test. It must pass with no audit failure.
3. Open each screenshot at 360, 768, 1280 and 1920 px. Write 1 line for each screenshot: its name and the defects found, or "no defect".
4. Check each screenshot against each rule of this section, and against the spacing and the alignment rules of "Visual style".
5. Fix each failure, and do steps 1 to 4 again.

## Shared parts

Each part is 1 function of `prototype/app.js`. A page composes parts.

| Part | Holds | Behavior |
| --- | --- | --- |
| Header | The site name "Westwald Archive" in Lora 700, the tagline "Unofficial fansite for _Nelke & the Legendary Alchemists_" in the small label size after it, and the links to the 5 categories with their game icons. Monsters and Characters use the quest category icons of the game (`20th_main_quest.g1t`, `gen_20th_m_q01_icon02` LIST01, a demon head, and LIST02, a person bust), from the same set as the Research chart icon. | Below 600 px, the tagline goes to a second line under the name, and the links go into a menu button. |
| Footer | The legal notice of the requirements and a link "About" to the About page, in the small label size, centered. | It shows on each page, below the content. On the About page, the footer has no legal notice and no About link, because the section "Legal" shows the notice and a fact shows 1 time on a page. |
| Filters | 1 group of toggle buttons for each filter of the page, for example on the Items page the item category, the shop and "Craftable". | Each group combines its selected values with OR. The groups combine with AND. No selection in a group shows all. Below 600 px, the filters are behind 1 button with a badge of the selected count. |
| Icon grid | The game icons in the order of the game, with the name under each icon. The number of columns follows the width. | A click opens the modal. Each icon is a link to the `#/` route of the entity. |
| Modal | A panel with the detail of the entity, and a close button. | 1. The route changes to the route of the entity, for example `#/items/<game ID>`. Back closes the modal. 2. A link inside the modal replaces its content. Back shows the content before it. 3. Esc, the close button and a click outside (600 px and wider) close it. The focus goes back to the icon. 4. On a narrow window, the modal fills the screen. |
| Entity link | The icon of the entity, and its name. | It opens the entity in the modal. |
| Area entry | An area in a list (the Gather group of an item, "Found in" of a monster): the area name as a link, the zone name under it in the small label size, and 1 badge (a rate or a level range). | It opens the area in the modal. |

The modal builds the detail from `data.js` in the page. The site needs JavaScript.

- **Routes.** Each page and each entity is a `#/` route of `index.html`, with the game ID of the entity, for example `#/areas/<area ID>` or `#/research/main/<research ID>`. The filters of a page are a query in the route, for example `#/items?cat=…&shop=…&craft=1`. The Monster type filter is not in the route.
- **Filter icons.** A filter option has an icon only when the game has 1 for it. The monster type and the character group have no game icon, so their toggles show the name only.
- **Header icons.** Areas uses the category icon `cat-16`. Monsters and Characters use `nav-monsters` and `nav-characters`. Research uses `cat-10`. The files are in `prototype/img/ui/`.

## Build and deploy

The site is the approved prototype in `prototype/` ([decision 0013](../decisions/0013-prototype-is-the-site.md)): 1 HTML page, its JS, its data copy `data.js`, its CSS, its fonts and its images. The pages are `#/` routes of the 1 HTML page. The site has no build step.

- **Deploy.** A GitHub Actions workflow runs on each push to `main` that changes `prototype/` or the workflow itself, and on a manual start. It uploads only the site files of `prototype/` (`index.html`, `app.js`, `data.js`, `style.css`, `fonts/`, `img/`) and deploys them to GitHub Pages with the official Pages actions. The scripts and the packages of the prototype are not deployed.
- **Change of the site.** A change of the site is a change of `prototype/`.

Rejected option: a push of the site files to a `gh-pages` branch. The official Pages actions need no extra branch and no token with write access to the code.

## Pages

The site has no landing page. The root URL shows the Items page.

### Category pages (Items, Monsters, Characters)

- **Blocks, in order:** Header. Filters. Icon grid.
- **Empty state:** The panel says "Nothing matches the filters." It has a button that clears the filters.

### Items page

- **Route:** `#/items`, and the root URL shows it. The filters are the query `cat`, `shop` and `craft=1`. A link from the grid to an item keeps the query, so the modal closes back to the filtered grid.
- **Filters, in order:** "Category" (the item categories of the game in the order of the game; the element items are in Material), "Sold at" (only the shops that sell 1 or more items), and "Synthesis" with 1 toggle "Craftable" (an item with a recipe). Each toggle of Category has the icon of the game category, and each toggle of Sold at has the icon of the shop.
- **Grid:** each item that is not a placeholder, in the order of `data/items.json`. Each tile has the icon and the name. No badge.

### Item detail

The blocks, in order. A block or a line with no data does not show.

1. **Head:** the name of the item as the title, and the close button in the modal.
2. **Top:** the icon at 112 px, and next to it these lines: the category with its icon (the text is the sub-category, or "category · sub-category" when the sub-category does not hold the category name); the price in money format, when it is above 0; "Sold at" with the icon and the name of each shop; "Reduces into" with the icon of each element and its value, for each element above 0. Each element links to its element item.
3. **Description**, as 1 paragraph.
4. **Synthesis**, only for an item with a recipe:
   - The materials as item tiles, with the quantity badge for 2 or more.
   - 1 row of stats: "Synth. Lv." (the level format), "Synthesis cost", "Cumulative synthesis cost", "Selling price" and "Value per cumulative synthesis cost". An item with a price of 0 shows no selling price and no value per cumulative synthesis cost.
   - The cumulative synthesis cost of an item is its synthesis cost, plus the cumulative synthesis cost of each material that a recipe makes, times the quantity of that material. A material that no recipe makes adds 0. Each item has at most 1 recipe, and a recipe makes 1 item. The value comes from `cumulativeSynthesisCost` of `data/recipes.json`, so the site and the workbook show the same number. The model export stops on a recipe loop.
   - The value per cumulative synthesis cost is the selling price divided by the cumulative synthesis cost, in the format "Value per synthesis cost".
   - The unlock lines: "Recipe set" (only when its name is not the name of the item), "Taught by" (the face of the teacher, the name and the friendship heart when the level is above 0), "Research" (the research, with its icon by the rule of "Icons"; the researchers show only on the research detail), and "Event" (the label of the story event, or "An event" when the game has only an internal ID).
5. **How to get**, with these groups in order: "Gather" (each area with its zone name under it and the rate, the highest rate first, and no rate for 100%), "Monster drops" (monster tiles, no badge), 1 group for each special kind with the item (Treasure, Bug Net, Digging, Fishing: the zone links with the rate), and "Farm" (the growing area).
6. **Used in:** the tiles of each item whose recipe uses the item as a material, with no badge.

The synthesis level is the rule of [the model technical doc](../technical/model.md), section "Synthesis level" ([decision 0012](../decisions/0012-synthesis-level.md)).

### Areas page

- **Route:** `#/areas`. An area and a zone are `#/areas/<game ID>`.
- **Blocks, in order:** Header. 1 panel for each zone, in the order of `data/zones.json`. The page has no filters.
- **Zone panel:** the name of the zone as a section title. The title is a link to the zone, so a click opens the zone in the modal. Under it, the names of its areas as plain buttons, in the order of `Zone.areaIds`. A click on an area opens its detail in the modal.

### Area detail

1. **Head:** the name of the area.
2. **Top:** 1 row of stats: "Zone" (link to the zone), "Opens" ("From the start", or "After task N: <name>" from `Zone.task`), "Difficulty by Investigation Lv" (5 cells, each the letter of `Zone.difficulties` with the level 1 to 5 under it), and "Area element" (the icon and the name of each element of `Zone.elements`).
3. **1 panel** with these groups in order:
   - "Gather": the item tiles of `Area.gather`, with the rate badge, the highest rate first.
   - "Monsters": the monster tiles that are not bosses and need no Investigation Lv, with the level badge.
   - "Monsters from Investigation Lv N": 1 group for each Investigation Lv that a monster group needs, in the order of the level.
   - "Bosses": the boss tiles, with the level badge, and "Bosses from Investigation Lv N" by the same rule.
4. **Rare finds** of the zone of the area: the same row as on the zone detail.

### Zone detail

1. **Head:** the name of the zone.
2. **Top:** the stats "Opens" and "Area element", with the formats of the area detail.
3. **Areas:** the links to the areas of the zone.
4. **Bosses:** the monster tiles of the zone encounters that no area lists (for example Master Puni at Ferien Plains, Lv 98), with the level badge. The group does not show when the zone has no such encounter.
5. **Rare finds:** 1 row of columns in the order Treasure, Bug Net, Digging, Fishing, from `Zone.specialItems`. A column with no item does not show. In a column, each spot is 1 group of item tiles with the rate badge. When a kind has 2 or more spots, each group has the caption "Chest N" (Treasure) or "Spot N" (the tools).

### Monsters page

- **Route:** `#/monsters`, and `#/monsters/<game ID>` for a monster.
- **Filters:** "Type" with the toggles "Monsters" and "Bosses".
- **Grid:** each monster in the order of `data/monsters.json`, with the icon and the name. No badge.

### Monster detail

1. **Head:** the name of the monster.
2. **Top:** the icon at 112 px, and next to it these lines: the type ("Monster" or "Boss"), and "Element DEF" as 1 line of element icons, each with its value.
3. **Description**, as 1 paragraph.
4. **Drops:** the item tiles of `Monster.drops`, with the quantity badge for 2 or more. A drop rate of 100% does not show.
5. **Found in:** 1 area entry for each area of the monster, with the level range badge, and 1 entry for each zone encounter that no area lists (the zone name as a link, with the level badge).

### Characters page

- **Route:** `#/characters`, and `#/characters/<game ID>` for a character.
- **Grid:** each character that can join the town (a join event, an icon and a description), in the order of `data/characters.json`, with the face icon and the name.
- **Filters:** "Group" with the toggles "Alchemist" and "Townsfolk", in the query `group`. The group of a character is Alchemist when `Character.type` is `Alchemist`, and Townsfolk for each other type.

### Character detail

1. **Head:** the name of the character.
2. **Top:** the face icon at 112 px, and next to it these lines: the group, and the source game in italics.
3. **Description**, as 1 paragraph.
4. **Skills:** 1 line for each skill: the name and its level ("Lv N"). The event skill shows its name and "Learned at an event".
5. **Joins the town:**
   - When the join event is not the game start (`EVENT_MS01_010`), the line "Joins in a story event", and the sub-title "Joins with" with the face tiles of the other characters with the same join event.
   - The stats "Town population" ("N people") and "Turn (not confirmed)" ("Turn N"). The rule "A condition that each player meets does not show" applies to both.
   - The section does not show when it has no line.
6. **Teaches:** 1 group for each recipe set of `Character.recipeSetIds`: the item tiles of the results of its recipes. The sub-title of the group is the set name. It shows when the set has 2 or more recipes, or a name that is not the name of its item.

### Research detail

1. **Head:** the name of the research.
2. **Top:** 1 row: the face and the name of each researcher (links), and the stats "Total friendship" (the heart with `Research.friendship`), "Duration" (the turns format) and "Research fee" (the money format).
3. **Materials:** the item tiles of `Research.materials`, with the quantity badge.
4. **Requires:** the tiles of the prerequisite research.
5. **Gives:** the rules of "Research tree page". The sub-title "Recipe set: <name>" holds the result tiles of the prize recipe set. The sub-title "Item" holds the prize item tiles, and shows only when the research also gives a recipe set or a bonus. The sub-title "Bonus" follows the rule of "Research tree page".

The research icon rule of "Icons" is 1 shared function. The item detail and the research tiles use it.

### About page

- **Blocks, in order:** Header. 1 panel with the 3 sections below, each with a section title. Footer. The header has no link to the page, and no category link is selected.
- **Contact:** 1 sentence: errors and questions go to the issues of the GitHub repository, with a link to `https://github.com/Arkased/NelkeData/issues`.
- **Source:** a link to the repository `https://github.com/Arkased/NelkeData`, and 1 sentence: the data comes from the files of the Steam version of the game.
- **Legal:** the legal notice of the requirements, in the body size.
- **Layout:** the panel has the width of the content column up to 720 px, centered. The text has the body size. A link has the style of the other text links.

### Details

Each detail is 1 panel. The prototype composes each panel from the parts of "Visual style", with the data that the requirements list for its category. A material is a tile with its quantity in the format of the UI standard. An element is its icon with its value.

### Research tree page

- **Purpose:** Browse the research as the game shows it: a grid of nodes with lines from left to right.
- **Route:** `#/research/<tree>` (`main`, `attack`, `support`, `emergency`), and `#/research/<tree>/<game ID>` for a research. `#/research` selects Main.
- **Blocks, in order:** Header. 1 tab for each of the 4 trees: "Main", "Attack", "Town Building" and "Emergency". The game message files do not hold the names of the trees, so the names are the names of the approved prototype. Tree box.
- **Tree box:** The game stores each tree as a grid of 20 columns. Each node has its icon and its name, in the column and the row of the game. The icon is on a beige square with round corners, in the same color as the background of the character face icons. The game uses the even rows for the nodes and the odd rows for the lines only. Each line is 1 prerequisite of `study/stdy_conditions.xml`: it leaves the right side of the prerequisite and enters the left side of the research that needs it. The lines that enter 1 node join before the node, so 3 prerequisites show as 3 lines that meet. No line shows that is not a prerequisite. The link types of the tree files only confirm the drawing. The box has the full width of the content column, the same as the tab panel above it. It scrolls horizontally inside the page. The page itself does not scroll horizontally.
- **Research detail, "Gives":** the prize items, and the items that the recipes of the prize recipe set make. The bonus item of `study/stdy_prize.xml` (`STDY_PRIZE_BONUS_ITEM`) is a tile with its quantity under the sub-title "Bonus". When `STDY_BONUS_FRIEND_POINT` is above 0, the sub-title also shows that friendship value. A bonus with no item (cost down, construction expenses up) shows the name of its type in the game when the game has 1, else it does not show. A sub-title never shows with nothing under it.
- **Interactions:** A click on a node opens the research in the modal.
