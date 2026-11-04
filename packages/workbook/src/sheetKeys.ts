/** The names of the sheets of the workbook. */
export enum SheetName {
  Items = 'Items',
  Recipes = 'Recipes',
  Zones = 'Zones',
  Monsters = 'Monsters',
  Characters = 'Characters',
}

/** The headers of the columns that form a key of a sheet. */
export enum KeyHeader {
  Name = 'Name',
  NameJp = 'Name (JP)',
  Item = 'Item',
  Area = 'Area',
  Spot = 'Spot',
  Icon = 'Icon',
}

/** The key columns of each sheet: the shortest list of columns whose values are unique in the sheet. */
export const SHEET_KEYS: Readonly<Record<SheetName, readonly KeyHeader[]>> = {
  [SheetName.Items]: [KeyHeader.Name],
  [SheetName.Recipes]: [KeyHeader.Item],
  [SheetName.Zones]: [KeyHeader.Area, KeyHeader.Spot],
  [SheetName.Monsters]: [KeyHeader.Name, KeyHeader.NameJp],
  [SheetName.Characters]: [KeyHeader.Name, KeyHeader.NameJp, KeyHeader.Icon],
};
