/** The item category ids of item.xml. */
export enum ItemCategory {
  Material = '0',
  Construction = '1',
  Merchandise = '2',
  Element = '5',
  BattleItem = '7',
}

/** The English names of the item categories, as `Item.category` holds them. */
export enum ItemCategoryName {
  Material = 'Material',
  Construction = 'Construction',
  Merchandise = 'Merchandise',
  Element = 'Element',
  BattleItem = 'Battle Item',
}

/** The English name of each item category, as `Item.category` holds it. */
export const CATEGORY_NAMES: Record<ItemCategory, ItemCategoryName> = {
  [ItemCategory.Material]: ItemCategoryName.Material,
  [ItemCategory.Construction]: ItemCategoryName.Construction,
  [ItemCategory.Merchandise]: ItemCategoryName.Merchandise,
  [ItemCategory.Element]: ItemCategoryName.Element,
  [ItemCategory.BattleItem]: ItemCategoryName.BattleItem,
};

/** The character category ids of character.xml. */
export enum CharacterCategory {
  MainA = '0',
  MainB = '1',
  Alchemist = '2',
  Townsfolk = '3',
  Story = '4',
  Fairy = '7',
  Monster = '8',
  Boss = '9',
}

/** The battle role values of btl_chara.xml. */
export enum PlayType {
  Attacker = 'BTL_PLAY_TYPE_ATTACKER',
  Supporter = 'BTL_PLAY_TYPE_SUPPORTER',
}

/** The sale flag fields of item.xml, 1 per shop. */
export enum ShopFlag {
  General = 'GSTORE_SALE_FLAG',
  Weapon = 'ASHOP_SALE_FLAG',
  Grocery = 'GRSTORE_SALE_FLAG',
  Clothing = 'CSTORE_SALE_FLAG',
  Medicine = 'DRSTORE_SALE_FLAG',
}

/** The stats of para_archetype and para_growtype, by their field name in the XML. */
export enum Stat {
  Hp = 'HP',
  Str = 'STR',
  Vit = 'VIT',
  Int = 'INT',
  Dex = 'DEX',
  Luck = 'LUCK',
  Agi = 'AGI',
  Chr = 'CHR',
}

/** The elements of items and of battle characters. */
export enum Element {
  Fire = 'Fire',
  Water = 'Water',
  Wind = 'Wind',
  Earth = 'Earth',
}

/** The shops that sell items. */
export enum Shop {
  General = 'general',
  Weapon = 'weapon',
  Grocery = 'grocery',
  Clothing = 'clothing',
  Medicine = 'medicine',
}

/** The types of character and monster that the model tells apart. */
export enum CharacterType {
  Main = 'Main',
  Alchemist = 'Alchemist',
  Townsfolk = 'Townsfolk',
  Story = 'Story',
  Fairy = 'Fairy',
  Monster = 'Monster',
  Boss = 'Boss',
}

/** The roles of a character in a battle. */
export enum BattleRole {
  Attacker = 'Attacker',
  Supporter = 'Supporter',
}

/** The difficulty ranks of an exploration area, from the hardest to the easiest. */
export enum Difficulty {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

/** The kinds of rare find of a zone: the chests and the gather tools. */
export enum GatherKind {
  Treasure = 'Treasure',
  BugNet = 'Bug Net',
  Digging = 'Digging',
  Fishing = 'Fishing',
}

/** The gimmick types of expl_gimmick.xml that hold rare finds. */
export enum GimmickType {
  Box = 'EXPL_GIMMICK_TYPE_BOX',
  Bug = 'EXPL_GIMMICK_TYPE_BUG',
  Dig = 'EXPL_GIMMICK_TYPE_DIG',
  Fish = 'EXPL_GIMMICK_TYPE_FISH',
}

/** The encounter group types of encount_group.xml that the workbook tells apart. */
export enum EncounterSymbol {
  Normal = 'BTL_ENCOUNT_SYMBOL_TYPE_NORMAL',
  Boss = 'BTL_ENCOUNT_SYMBOL_TYPE_BOSS',
}
