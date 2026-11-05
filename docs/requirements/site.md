# Website

A website for lookups of the game data of _Nelke & the Legendary Alchemists_, for players. The source of each row is the owner's words in the chat (dates in UTC). The rules that the orchestrator made, and the proof of each row, are in [the site design](../design/site.md), section "Design requirements".

## General

| Name | Requirement | Source |
| --- | --- | --- |
| Live site | The approved HTML prototype in `prototype/` is the live site ([decision 0013](../decisions/0013-prototype-is-the-site.md)). | Owner answer "1" to the question "Source of the live site", 2026-11-05: "Publish the prototype as the live site". |
| Host | The site is on GitHub Pages. | 2026-11-02: "I think we will just build it ourselves and host on gh pages". |
| New pages | The layouts of the drafted pages are approved. Another page (for example the buildings) needs a separate approval. | 2026-11-03: "layouts are approved for drafted pages, for other pages (buildings, etc.) need separate approval". |
| Priority | Items and recipes come first. The other pages have a lower priority. | 2026-11-02: "recipes and items (specifically gatherables) should be on separate pages … we can make pages for the other data but its lower prio". |
| Site name | The site is "Westwald Archive", with the tagline "Unofficial fansite for _Nelke & the Legendary Alchemists_". The name makes clear that the site is not official content. | 2026-11-03: "I need a site name that distinguishes it from official content"; "westwald archive and the tagline should be unoffocial fansite for <game title>". |
| Legal notice | The site has a legal notice on the model of [the legal page of Barrel Wisdom](https://barrelwisdom.com/blog/legal). | 2026-11-03: "this has been up since 2021 and can probably be followed, https://barrelwisdom.com/blog/legal". |
| About page | 1 page gives the contact, the source and the legal notice. | 2026-11-03: "probably an about page with contact/source/legal disclaimers". The owner approved its layout (answer "1" to the question "Layout of the About page and the new header", 2026-11-03). |
| Own look | The site must not look official. It keeps the layout of the prototype with its own styling and a typeface that is not a font of the game. A clear and organized view of the data comes before game assets. | 2026-11-03: "making a fan site LOOK official could increase likelihood of enforcement"; "ok keep the layout but change the styling"; "typeface should be diff from game too". 2026-11-02: "I don't think literall EVERY UI element should be ripped from game assets, you should prioritize organized and clear representation of data". |
| No lists or tables | The pages are grids of icons, not lists, tables or a spreadsheet look. | 2026-11-02: "I fundamentally do not want to structure the pages into lists or tables"; "no spreadsheet look, grid of icons please". |
| Tiles and modals | The layout follows Barrel Wisdom: tile entries that open a modal. | 2026-11-02: "you should adopt the layout from barel wisdom (tile entries with modals)". |
| Filters | The pages use filters, not tabs. The shop that sells an item is a filter. | 2026-11-02: "categories should also consider what store the good is sold in, I'm not sure a tab based approach is ideal. Might want filters instead". |
| No search box | The site has no search box. Players use the filters and the find command of the browser. | Owner answer "1" to the question "Keep or remove the search box", 2026-11-03. |
| Bad data | Placeholder data does not show. | 2026-11-02: "bad data should be filtered". |
| Numbers | No floating-point errors show. | 2026-11-02: "fix the floats". |
| Units | The units and the counts are consistent, with unit icons. The orchestrator sets the standards. | 2026-11-03: "unit icons are missing in places, unit counts are inconsistent … You need to set standards and fix these". |
| Any width | The width of the page adapts to the screen. | 2026-11-02: "can we make screen width dynamic? why are you restricting to 360 px". |

## Items and recipes

| Name | Requirement | Source |
| --- | --- | --- |
| 1 item page | Items and recipes are on 1 page, with a filter. The elements are not a separate category. | 2026-11-02: "I'm not sure it makes sense to split recipies and items anymore, might make more sense to unify and have a filter"; "element shouldn't have it's own category". |
| Shops | The item shows the shops that sell it, with shop icons. A shop is not a way to get the item. | 2026-11-03: "there should be icons for stores"; "shops is not an acquisition method". |
| Reduce | The Reduce elements show, as a small note, not as a full row. | 2026-11-02: "reduce elements are important". 2026-11-03: "the count reduction is a side note and should not take a full row". |
| How to get | The detail shows the ways to get the item. A farm ("grown in") is one of them, not a fact at the top. The open conditions of an area do not show on the item. A drop shows no count. | 2026-11-03: "grown in is an acquisition method, why is it at the top?"; "area unlock conditions should not be on item acquisition pages"; "for items x3 drops implies three monsters not three items per drop, just remove the count". |
| Synthesis | A craftable item has an optional section with the synthesis data: the synthesis cost, the minimum alchemy level, and the material counts as "x3". | 2026-11-02: "synth cost is a first-class recipe property"; "There should be an alchemy level property (min req)"; "for craftable items include an optional section with crafting info". 2026-11-03: "I think the x-count representation (e.g., x3) is better". |
| Recipe value | A recipe shows the cumulative synthesis cost of the item and the value per cumulative synthesis cost. It does not show the material cost, the added value or the value per cost. | 2026-11-05: "replace custom cost calculation (mat cost, added value, value/cost) with cumulative synth cost per item and value per cumulative synth cost". |
| Unlock | The recipe shows how it unlocks, with the friendship level icon. | 2026-11-01: "unlock is generally tied to a zone or event, can you look into it". 2026-11-03: "recipie friendship level icon". |

## Research

| Name | Requirement | Source |
| --- | --- | --- |
| Research trees | The research trees have the layout of the game, with horizontal scroll, and the tree names of the game. | 2026-11-02: "horizontal scroll will probably be needed for browsing the research trees (please emulate ingame layouts here)". 2026-11-03: "research tree names seem wrong". |
| Research detail | A research shows its duration in turns and the friendship level that it needs. It is defined by its output, not by its people. | 2026-11-03: "duration of research is turns, and why are there no freindship level reqs on research?"; "research is better defined by output not people". |

## Areas, monsters and characters

| Name | Requirement | Source |
| --- | --- | --- |
| Areas | The areas are grouped under their top-level zones, not in a grid. An interior is a separate area. An area shows its dispatch data. A Bountiful area shows no monsters, and a Bestial area shows no gather items. Bug Net, Digging and Treasure share 1 row. | 2026-11-02: "areas should be grouped based on top level zones first, should not be a grid layout". 2026-11-03: "interior is a distinct zone from non-interior, do not group them"; "areas should include dispatch info"; "bountiful zones do not have monsters and bestial zones do not have gathers"; "bug net/digging and treasure should be in the same row". |
| Monsters | A monster shows no rank. | 2026-11-03: "remove monster rank". |
| Characters | The characters are Alchemists and Townsfolk, and both show. Nelke, Misty, Knoss and Lotos are Townsfolk. The join population and the join turn show. A join on turn 1 does not show. | 2026-11-03: "townsfolk vs alchemist is a distinction, both need to be included"; "nelke misty knoss lotos are townfolk"; "Turn 1 join should be omitted". 2026-11-02: "why is join pop and join turn excluded". |
