# Website

The page and UI layouts of the website. [The site requirements](../requirements/site.md) ask for this design. A category page is a grid of game icons, and an icon opens its detail in a modal ([decision 0005](../decisions/0005-icon-grids.md)). A clear view of the data comes first ([decision 0007](../decisions/0007-clear-data-and-filters.md)).

The owner approved the layouts of the prototype (#11) on 2026-11-02: the Items, Areas, Monsters, Characters and Research pages, and their details. The owner approved the About page and the header with the site name (#15) on 2026-11-03. A new page (for example the buildings) needs its own prototype and a separate approval before it is built.

## Visual style

The site has its own plain look in the colors of the game: cream, warm brown and gold ([decision 0009](../decisions/0009-own-look.md)). It uses no UI texture of the game for a frame part, so it does not look official. CSS draws each part with colors, borders and radii only. The game icons that carry data stay: the items, the monsters, the characters, the shops, the categories, the elements, the money, the synthesis cost and the friendship heart with its digits.

| Site part | Look |
| --- | --- |
| Typeface | 2 open fonts (SIL Open Font License), not fonts of the game: Lora (a warm serif) for the titles and the entity names, and Source Sans 3 for all other text. The site serves the WOFF2 files itself (from the Fontsource packages `@fontsource/lora` and `@fontsource/source-sans-3`), with no font CDN. The CSS has no other `@font-face`. |
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

Each page follows these rules. The UI test checks each rule that a script can check. The orchestrator checks the screenshots against the other rules before the owner sees a page.

### Values and units

Each kind of value has 1 format on all pages.

| Value | Format | Example |
| --- | --- | --- |
| Money (a price, a cost, a research fee) | The coin icon of the game, then the number. | 🪙 1,200 |
| Synthesis cost | The synthesis cost icon of the game, then the number. | ⚗ 4 |
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

- Each entity mention has its game icon: an item, a monster, a character, a shop. A research has no icon in the game, so it shows the icon of its output, in this order: the first prize item, the first item of the prize recipe set, the bonus item. A research with no output in the game files shows the research icon of the game. The researchers show only on the research detail.
- A shop has the icon of its building. A category filter has the icon of the game category.
- A unit with a game icon (money, synthesis cost, friendship) shows the icon each time.

### Components

- 1 tile component shows each entity on each page: the icon, the name under it, and at most 1 value line under the name. The tile has the same size in each grid of a page.
- 1 section component: the section title, then the content. A section with no content does not show.
- 1 stat component: a small label above a value with its unit.
- The text of the page has 3 sizes only: the title, the body and the small label.

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
- "Joins the town" on a character shows the conditions of `character/character_app_con.xml`: the town population and the turn. A character whose join event is not the game start (`EVENT_MS01_010`) joins in a story event. The event has no name in the game files, so the section says "Joins in a story event" and shows the tiles of the other characters with the same event, under "Joins with". 100 characters join this way, for example Gino with Melvia, Mimi, Marc, Gerard, the 2 Chims and Piana.
- A short list of values is 1 line in the top block of the detail, not a section. For example the element DEF of a monster is 1 line of element icons, each with its value.
- The related parts of a detail are in 1 panel: on an area, the difficulty, the gather items and the monsters of the area; on a zone, its areas and its treasure.
- The parts of 1 row align on 1 baseline. A header row of a detail (for example the researchers and the stats of a research) stays on 1 row at 768 px and wider.
- The page shows no count of the visible entities.
- A fact shows 1 time on a page. The terms of a calculation are the exception: the "Selling price" stat of the recipe value repeats the price of the top block, because the requirement "Recipe value" asks for the full calculation in 1 place.
- A fact of an area does not show on the page of an item, for example the condition that opens the area.

### Self-review

Before the owner sees a round, the orchestrator does these steps:

1. Make sure that each page, filter, section and fact traces to a row of `docs/requirements/site.md`. A part that no row asks for is removed, or goes to the owner as a requirement change before it is built.
2. Run the UI test. It must pass with no audit failure.
3. Open each screenshot at 360, 768, 1280 and 1920 px. Write 1 line for each screenshot: its name and the defects found, or "no defect".
4. Check each screenshot against each rule of this section, and against the spacing and the alignment rules of "Visual style".
5. Fix each failure, and do steps 1 to 4 again.

## Shared parts

Each part is 1 component. A page composes parts and has no markup of its own.

| Part | Holds | Behavior |
| --- | --- | --- |
| Header | The site name "Westwald Archive" in Lora 700, the tagline "Unofficial fansite for _Nelke & the Legendary Alchemists_" in the small label size after it, and the links to the 5 categories with their game icons. Monsters and Characters use the quest category icons of the game (`20th_main_quest.g1t`, `gen_20th_m_q01_icon02` LIST01, a demon head, and LIST02, a person bust), from the same set as the Research chart icon. | Below 600 px, the tagline goes to a second line under the name, and the links go into a menu button. |
| Footer | The legal notice of the requirements and a link "About" to the About page, in the small label size, centered. | It shows on each page, below the content. On the About page, the footer has no legal notice and no About link, because the section "Legal" shows the notice and a fact shows 1 time on a page. |
| Filters | 1 group of toggle buttons for each filter of the page, for example on the Items page the item category, the shop and "Craftable". | Each group combines its selected values with OR. The groups combine with AND. No selection in a group shows all. The selection is in the URL. |
| Icon grid | The game icons in the order of the game. The number of columns follows the width. | The name shows on hover and on focus. A click opens the modal. Each icon is a real link, so Ctrl+click opens the page of the entity in a new tab. |
| Modal | A panel with the detail of the entity, and a close button. | 1. The URL changes to the URL of the entity. Back closes the modal. 2. A link inside the modal replaces its content. Back shows the content before it. 3. Esc, the close button and a click outside close it. The focus goes back to the icon. 4. On a narrow window, the modal fills the screen. |
| Entity page | The same detail panel as the modal, on a full page. | The page for a direct visit, a search engine and a new tab. |
| Entity link | The icon of the entity, and its name. | It opens the entity in the modal. An entity with no page is plain text with its icon. 1 constant lists the kinds that have pages. Each page item adds its kind, so the link check passes after each change. |

The modal gets its content from the entity page: a click fetches the HTML of the entity page and shows its detail panel. So the markup of a detail exists 1 time, and the list page does not hold the detail of each entity. Without JavaScript, each icon is a plain link to the entity page.

Only the latest load of the modal acts. Esc, Back or a newer click cancels the load before it. When a load fails:

1. The modal logs the error with `console.error`, for each load.
2. When the load is the latest, a click opens the entity page (`location.href`), and Back or Forward reloads the page.
3. When the load is cancelled, the modal does nothing more.

## Build and deploy

The site is the package `@nelke/site`: an Astro project with static output ([decision 0002](../decisions/0002-stack.md)). The build writes only HTML, CSS, JS, fonts and images to `packages/site/dist/`. The site reads the entities only through the files of `data/` and the schemas of `@nelke/model`.

- **Base path.** GitHub Pages serves the site under `/NelkeData/`. 1 module holds the base path. The Astro config, the link check and the UI test read it from there. Each internal URL comes from 1 function that adds the base path. No component writes a root-relative URL by hand. So a change of the host changes 1 setting.
- **Layout.** 1 layout component holds the `<html>` element, the fonts, the global CSS, the header and the footer. Each page uses it and gives its content, and its name when it has one. The title of the page is `<page name> · Westwald Archive`. The title of the root page is `Westwald Archive`.
- **Global CSS.** 1 file holds the colors, the 4 px spacing scale, the 3 text sizes and the radii as CSS custom properties. The values come from `prototype/style.css`. A component uses only these properties for these values.
- **Category links of the header.** The header links only to the category pages that exist, in the order Items, Areas, Monsters, Characters, Research. The first page item (the Items page) adds the list of these links, and each later page item adds its row. So the header never links to a page that does not exist, and the link check passes after each change. The menu button for a narrow window comes with the list. For the same reason, the About link of the footer comes in the change that adds the About page.
- **Link check.** After the build, a script reads each HTML file of `dist/`. It collects each `href` and `src` that starts with the base path, and fails when no file of `dist/` matches it. It parses the HTML with a parser library, not with a regular expression, because attribute quotes and entities are easy to get wrong.
- **UI test.** A Playwright test opens the built site in `astro preview`, at 360, 768, 1280 and 1920 px, each width in its own browser context at the same time. It checks the rules of the requirements that a script can check: the site name and the tagline in the header, the legal notice in the footer, the title of the page, and no horizontal scroll. Each page item adds the checks of its page.
- **Deploy.** A GitHub Actions workflow runs on each push to `main` that changes `data/`, `packages/site/` or the workflow itself, and on a manual start. It installs the packages, builds the site, runs the link check and the UI test, and deploys `dist/` to GitHub Pages with the official Pages actions. A failed step stops the deploy, so the live site stays at the last good build.

Rejected options:

- A push of the build output to a `gh-pages` branch. The official Pages actions need no extra branch and no token with write access to the code.
- A link check through a crawler of the live site. It finds a broken link only after the deploy.
- The UI test in `npm run check`. It needs a browser and a full build, so it is too slow for each commit. The deploy workflow runs it on each change of the site, and an agent runs it on its own change of the site.

## Pages

The site has no landing page. The root URL shows the Items page.

### Category pages (Items, Monsters, Characters)

- **Blocks, in order:** Header. Filters. Icon grid.
- **Empty state:** The panel says "Nothing matches the filters." It has a button that clears the filters.

### Items page

- **URLs:** the Items page is the root URL `/NelkeData/`. The page of an item is `/NelkeData/items/<slug>/`, with the `slug` of the model. The filters are query parameters of the root URL: `cat` (the category names, comma-separated), `shop` (the shop names of the model, comma-separated) and `craft=1`. A link from the grid to an item keeps no query: the modal closes back to the URL with the filters.
- **Filters, in order:** "Category" (the item categories of the game in the order of the game; the element items are in Material), "Sold at" (only the shops that sell 1 or more items), and "Synthesis" with 1 toggle "Craftable" (an item with a recipe). Each toggle of Category has the icon of the game category, and each toggle of Sold at has the icon of the shop.
- **Grid:** each item that is not a placeholder, in the order of `data/items.json`. Each tile has the icon and the name. No badge.
- **Header:** this item adds the category links of the header with the menu button, with only Items in the list.

### Item detail

The blocks, in order. A block or a line with no data does not show.

1. **Head:** the name of the item as the title, and the close button in the modal.
2. **Top:** the icon at 112 px, and next to it these lines: the category with its icon (the text is the sub-category, or "category · sub-category" when the sub-category does not hold the category name); the price in money format, when it is above 0; "Sold at" with the icon and the name of each shop; "Reduces into" with the icon of each element and its value, for each element above 0. Each element links to its element item.
3. **Description**, as 1 paragraph.
4. **Synthesis**, only for an item with a recipe:
   - The materials as item tiles, with the quantity badge for 2 or more.
   - 1 row of stats: "Synth. Lv." (the level format), "Synthesis cost", "Selling price", "Material cost", "Added value" (green when above 0, red when below 0) and "Value per cost" (money per synthesis cost). When the added value is `null`, the row shows only "Synth. Lv.", "Synthesis cost" and "Material cost".
   - "Counted as 0 (no price)": the links to the materials with no price.
   - The unlock lines: "Recipe set" (only when its name is not the name of the item), "Taught by" (the face of the teacher, the name and the friendship heart when the level is above 0), "Research" (the research, with its icon by the rule of "Icons"; the researchers show only on the research detail), and "Event" (the label of the story event; the ID never shows).
5. **How to get**, with these groups in order: "Gather" (each area with its zone name under it and the rate, the highest rate first, and no rate for 100%), "Monster drops" (monster tiles, no badge), "Special spots" (each zone whose special spot items hold the item), and "Farm" (the growing area).
6. **Used in:** the tiles of each item whose recipe uses the item as a material, with no badge.

The area, zone, monster, character and research of these blocks are plain text with their icon until their own page item adds their kind to the entity link.

The synthesis level is `Recipe.synthesisLevel` of the model: the rule of `README.md`, section "Synthesis level" ([decision 0012](../decisions/0012-synthesis-level.md)).

### Areas page

- **Blocks, in order:** Header. 1 panel for each top-level zone, in the order of the game.
- **Zone panel:** The name of the zone as a section title, and the names of its areas as plain buttons. A click on an area opens its detail in the modal.

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
- **Blocks, in order:** Header. 1 tab for each of the 4 trees, with the name of the tree in the game. Tree box.
- **Tree box:** The game stores each tree as a grid of 20 columns. Each node has its icon and its name, in the column and the row of the game. The icon is on a beige square with round corners, in the same color as the background of the character face icons. The game uses the even rows for the nodes and the odd rows for the lines only. Each line is 1 prerequisite of `study/stdy_conditions.xml`: it leaves the right side of the prerequisite and enters the left side of the research that needs it. The lines that enter 1 node join before the node, so 3 prerequisites show as 3 lines that meet. No line shows that is not a prerequisite. The link types of the tree files only confirm the drawing. The box has the full width of the content column, the same as the tab panel above it. It scrolls horizontally inside the page. The page itself does not scroll horizontally.
- **Research detail, "Gives":** the prize items, and the items that the recipes of the prize recipe set make. The bonus item of `study/stdy_prize.xml` (`STDY_PRIZE_BONUS_ITEM`) is a tile with its quantity under the sub-title "Bonus". When `STDY_BONUS_FRIEND_POINT` is above 0, the sub-title also shows that friendship value. A bonus with no item (cost down, construction expenses up) shows the name of its type in the game when the game has 1, else it does not show. A sub-title never shows with nothing under it.
- **Interactions:** A click on a node opens the research in the modal.
- **States:** A node that the game has with no name shows its ID.
