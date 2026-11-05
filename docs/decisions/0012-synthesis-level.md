# 0012 The synthesis level comes from the item rank

Date: 2026-11-04
Decided by: owner
Status: accepted

## Context

The row "Synthesis" of the site requirements asks for the minimum alchemy level ("Synth. Lv.") of each craftable item. No game file stores the level. The research found 1 candidate: `ITEM_RANK` of `item/item.xml`, from 2 to 199 on the craftable items. The owner read the level of 7 items in the game: Wheat Flour 1, Timber 1, Bomb 3, Iron Board 5, Veggie Bun 6, Maiden Armor 11, Fireproof Plate 14. The rank of these items is 2, 4, 15, 22, 25, 46 and 59.

## Decision

The synthesis level of an item is `ITEM_RANK` ÷ 4, rounded down, and minimum 1. The rule gives all 7 values. The divisor fits the constant `OC_ITEM_RANK_ADJUSTMENT_COEFFICIENT` = 400 in `out_constant/out_constant.xml`.

Rejected options:

- The raw rank as the level: it does not match the game (Timber has rank 4 and level 1).
- Rank ÷ 4 rounded to the nearest value: Iron Board (5.5) and Maiden Armor (11.5) show 5 and 11 in the game.
- No level on the site: the game shows the level, and the rule is now known.

## Consequences

- The rule is in `README.md`, section "Synthesis level". The proof is in `docs/research/2026-11-04-alchemy-level.md`.
- The model computes the level when a consumer shows it, as the design of the model asks for each computed value.
