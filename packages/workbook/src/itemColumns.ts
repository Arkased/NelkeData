import { Element, Shop, type Item } from '@nelke/model';
import { required, type Lookup } from './lookup.js';
import { iconColumn, type Column } from './sheet.js';

const ELEMENTS: readonly Element[] = [Element.Fire, Element.Water, Element.Wind, Element.Earth];

/** The shops in column order, with their names. */
const SHOP_NAMES: readonly [Shop, string][] = [
  [Shop.General, 'General Store'],
  [Shop.Weapon, 'Weapon/Armor Shop'],
  [Shop.Grocery, 'Grocery Store'],
  [Shop.Clothing, 'Clothing Store'],
  [Shop.Medicine, 'Medicine Shop'],
];

/** The places where an item is gathered, as text, and the lowest main task number that opens one. */
interface GatherPlaces {
  texts: string[];
  task: number;
}

function gatherPlaces(item: Item, lookup: Lookup): GatherPlaces | undefined {
  const texts: string[] = [];
  const tasks: number[] = [];
  const add = (text: string, task: number): void => {
    if (!texts.includes(text)) texts.push(text);
    tasks.push(task);
  };
  const opens = (task: number): string => (task ? `after Task ${task}` : 'start');
  for (const { areaId, rate } of item.gather) {
    const area = required(lookup.areas, areaId);
    const zone = required(lookup.zones, area.zoneId);
    const task = zone.task?.number ?? 0;
    add(`${zone.name} - ${area.name} (${rate}%, ${opens(task)})`, task);
  }
  for (const zoneId of item.specialZoneIds) {
    const zone = required(lookup.zones, zoneId);
    const task = zone.task?.number ?? 0;
    add(`${zone.name} (special spot, ${opens(task)})`, task);
  }
  return tasks.length === 0 ? undefined : { texts, task: Math.min(...tasks) };
}

/**
 * Builds the columns of the Items sheet.
 * @param lookup - the entities by ID
 * @returns the columns
 * @sideEffects none
 */
export function itemColumns(lookup: Lookup): Column<Item>[] {
  const reduceColumn = (e: Element): Column<Item> => ({ header: `Reduce: ${e}`, width: 8, get: (i) => i.reduce[e] });
  return [
    iconColumn((i) => i.icon ?? ''),
    { header: 'Name', width: 28, get: (i) => i.name },
    { header: 'Name (JP)', width: 18, get: (i) => i.nameJp ?? '' },
    { header: 'Category', width: 14, get: (i) => i.category },
    { header: 'Sub-category', width: 18, get: (i) => i.subCategory ?? '' },
    { header: 'Rank', width: 7, get: (i) => i.rank },
    { header: 'Price', width: 9, get: (i) => i.price },
    { header: 'Base Sales', width: 9, get: (i) => i.baseSales },
    {
      header: 'Sold In',
      width: 26,
      get: (i) =>
        SHOP_NAMES.filter(([shop]) => i.shops.includes(shop))
          .map(([, name]) => name)
          .join(', '),
    },
    ...ELEMENTS.map(reduceColumn),
    { header: 'Growing Area', width: 16, get: (i) => i.growingArea ?? '' },
    { header: 'Base Yield', width: 8, get: (i) => i.baseYield ?? '' },
    { header: 'Gathered At', width: 60, get: (i) => (gatherPlaces(i, lookup)?.texts ?? []).join('; ') },
    { header: 'First Gather Task', width: 9, get: (i) => gatherPlaces(i, lookup)?.task ?? '' },
    {
      header: 'Dropped By',
      width: 30,
      get: (i) => i.drops.map((d) => `${required(lookup.monsters, d.monsterId).name} x${d.quantity} (${d.rate}%)`).join(', '),
    },
    { header: 'Description', width: 80, get: (i) => i.description ?? '' },
  ];
}
