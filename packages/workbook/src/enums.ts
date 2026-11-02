/** The item category ids of item.xml. */
export enum ItemCategory {
  Material = '0',
  Construction = '1',
  Merchandise = '2',
  Element = '5',
  BattleItem = '7',
}

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

/** The encounter group types of encount_group.xml that the workbook tells apart. */
export enum EncounterSymbol {
  Boss = 'BTL_ENCOUNT_SYMBOL_TYPE_BOSS',
}
