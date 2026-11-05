# Alchemy level of an item

Research item for issue #12.

## Question

Where does the game store the minimum alchemy level ("Synth. Lv.", label `MESSAGE_COMMON_MIX_LEVEL`) of a craftable item?

## Method

1. List the 6 archives in `Data/` with `npm run extract -- list`.
2. Count the file types of each archive.
3. Search the XML in `extracted/saves/` for the label, for field names with LV, LEVEL, RANK and for the UI nodes that show the level.
4. Extract the 22 compressed `.xml.e` files of `item/`, `recipe/`, `mix/` and `facility/` to a temp folder. Compare their sizes with the plain XML.
5. Search the strings of `Nelke_and_the_Legendary_Alchemists.exe` for field names. The search only reads the file.
6. Read the English tutorial texts about the level.
7. Check the candidate field against all recipes.

## Archives

| Archive           | File types                                      | Game tables? |
| ----------------- | ----------------------------------------------- | ------------ |
| `PACK01.PAK`      | 1273 xml, 251 xml.e, 4910 ebd, 5685 ebm, 38 nut | Yes          |
| `PACK00_01.PAK`   | 2615 g1t, 168 g1s, 246 gz, 5 fpo, 3 cpo, 1 g1sv | No           |
| `PACK00_02.PAK`   | 979 g1t, 2289 gz (models and maps)              | No           |
| `PACK00_03.PAK`   | 141 gz, 2 g1t, 2 g1pf, 1 bin (`charatest_env`)  | No           |
| `PACK00_04_01.PAK` | 123 g1t, 1 gz, 1 mpg                           | No           |
| `PACK00_04_02.PAK` | 113 g1t, 1 mpg                                 | No           |

Only `PACK01.PAK` holds tables. The other archives hold textures, models and 1 video each.

## What the files say

- The label `MESSAGE_COMMON_MIX_LEVEL` is "Synth. Lv.". The UI nodes `mix_lv` in `ui/20th_mix/uil_20th_mix_recipe_1008.xml` and `ui/20th_management/uil_20th_item_info_0925.xml` show it. The UI files hold dummy text. The code fills the number at run time.
- The tutorial text `PREPARATION_TUTORIAL_TEXT_009` says: "If an item's level is higher than the alchemist's level, there's a higher chance that the synthesis will fail." So each item has a level.
- `out_constant/out_constant.xml` has the constants of the failure rule, for example `OC_ATELIER_MIX_FAILURE_LEVEL_DIFFERENCE_BORDER` = 10. The `.exe` has the field `OC_ITEM_RANK_ADJUSTMENT_COEFFICIENT`. It is not in any XML.
- The `.exe` has no field name with `MIX_LV` for an item or a recipe. It has `AVUserDataMixLv`, `AVACMixGEMasterMixLv` and `AVACMixUPMasterMixLv`. These names belong to the save data and the achievements, not to a table.
- `request/request_item_rank.xml` maps the request ranks A to E to item ranks 80, 50, 30, 16 and 1. These values are on the same scale as `ITEM_RANK`.
- 15 of the 22 `.xml.e` files hold the same data as their plain XML: the size in the header (bytes 4 to 7) is equal to the size of the plain file. The 7 other files (`itemrecipedata`, `itemfactordata`, `itemfactordata_no`, `item_book`, `mixmotiondata`, `mixpanellineeffectdata`, `mixpanellineeffectdata_no`) have no plain XML. They are encrypted and compressed (entropy 7.98 bits per byte). We could not read them. Their names match the old-game `itemdata.xml`, so they probably are old-game data too.

## Search of the fields

The XML in `extracted/saves/` has these attributes with LV, LEVEL or RANK in the name:

- `ITEM_RANK` (650 tags, `item/item.xml`).
- `REQ_LV` (355 tags, `expl_encount/area_encount.xml`, the level of the zone).
- `CHARACTER_LEVEL` (100 tags, `character/character_levelup_exp.xml`, 1 to 99).
- `CHARACTER_SKILL1..4_LEARNING_LV`, `FACILITY_RANK_ID`, `CHARACTER_RANK_ID`, request ranks.

Only `ITEM_RANK` is a value per item. It is the only candidate.

## Check of `ITEM_RANK`

`recipe/recipe.xml` has 269 recipes. They make 170 different items. The results are checked against `ITEM_RANK` of `item/item.xml`:

- All 170 result items have `ITEM_RANK` greater than 0. The range is 2 to 199.
- 385 items have `ITEM_RANK` 0. These items are not craftable (materials and other items).
- 95 items have a rank greater than 0 and no recipe.
- The rank rises with the tier. The correlation of the rank with the selling price is 0.78 (items with a price and a rank).

Sample values (result item, `ITEM_RANK`, `ITEM_COMP_MH` = synthesis cost, `ITEM_SELLING_PRICE`):

| Item (English name)  | `ITEM_ID`                      | Rank | Synthesis cost | Price |
| -------------------- | ------------------------------ | ---- | -------------- | ----- |
| Wheat Flour          | `ITEM_MIX_FLOUR`               | 2    | 2              | 35    |
| Bomb                 | `ITEM_USE_FLAMME`              | 15   | 7              | 253   |
| Breezy Aroma         | `ITEM_USE_SOFT_WIND_AROMA`     | 26   | 10             | 464   |
| Maiden Armor         | `ITEM_SALE_MAIDEN_ARMOR`       | 46   | 16             | 1297  |
| Berg Medicine        | `ITEM_SALE_SPECULATOR_MEDICINE` | 73  | 23             | 4404  |
| Gold Puni Statue     | `ITEM_SALE_GOLDEN_PUNI_STATUE` | 199  | 52             | 24472 |

## Check in the game

The owner read the "Synth. Lv." of 7 items in the game. The rank is not the level. No stored field holds the level. This rule gives all 7 values:

**Synth. Lv. = `ITEM_RANK` ÷ 4, rounded down, and minimum 1.**

| Item (English name) | `ITEM_ID`                              | Rank | Rank ÷ 4 | Synth. Lv. in the game |
| ------------------- | -------------------------------------- | ---- | -------- | ---------------------- |
| Wheat Flour         | `ITEM_MIX_FLOUR`                       | 2    | 0.5      | 1                      |
| Timber              | `ITEM_BUILD_TIMBER`                    | 4    | 1        | 1                      |
| Bomb                | `ITEM_USE_FLAMME`                      | 15   | 3.75     | 3                      |
| Iron Board          | `ITEM_BUILD_IRON_BOARD`                | 22   | 5.5      | 5                      |
| Veggie Bun          | `ITEM_SALE_VEGETABLE_MANJU`            | 25   | 6.25     | 6                      |
| Maiden Armor        | `ITEM_SALE_MAIDEN_ARMOR`               | 46   | 11.5     | 11                     |
| Fireproof Plate     | `ITEM_BUILD_HEAT_RESIST_ALCHEMY_BOARD` | 59   | 14.75    | 14                     |

- Iron Board (5.5 → 5) and Maiden Armor (11.5 → 11) show that the game rounds down, not to the nearest value.
- Wheat Flour (0.5 → 1) shows the minimum of 1.
- The divisor fits the constant `OC_ITEM_RANK_ADJUSTMENT_COEFFICIENT` = 400 in `out_constant/out_constant.xml`: rank × 100 ÷ 400 = rank ÷ 4. No file states the formula. The constant and the 7 matches are the proof.
- No item above rank 59 was checked. The highest rank, 199 (Gold Puni Statue), gives level 49, so the level of each item stays below the alchemist maximum of 99.

## Result

The source of the alchemy level of an item is `ITEM_RANK` in `extracted/saves/item/item.xml`, with the rule above. It joins to the recipe through `ITEM_COMPLETION_ID` of `recipe/recipe.xml` (`ITEM_ID` = `ITEM_COMPLETION_ID`). [Decision 0012](../decisions/0012-synthesis-level.md) records it.
