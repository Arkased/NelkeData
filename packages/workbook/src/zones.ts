import { z } from 'zod';
import { EncounterSymbol } from './enums.js';
import type { Story } from './story.js';
import { getOrCreate, listFor, range, required } from './util.js';
import type { ReadTable } from './xml.js';

const areaSchema = z
  .object({
    expl_area: z.string(),
    area_name: z.string(),
    // The first area has no task: it is open from the start.
    task_id: z.string().default(''),
    area_collect: z.string(),
    diff_00: z.string(),
    diff_01: z.string(),
    diff_02: z.string(),
    diff_03: z.string(),
    diff_04: z.string(),
  })
  .transform((a) => ({ ...a, difficulties: [a.diff_00, a.diff_01, a.diff_02, a.diff_03, a.diff_04] }));

const researchSchema = z.object({
  expl_research: z.string(),
  expl_area: z.string(),
  map_name: z.string(),
  expl_rootnumber: z.string(),
});

const collectSchema = z.object({ AREA_TAG: z.string(), ITEM_TAG: z.string(), RATE: z.string() });
const uniqueCollectSchema = z.object({ AREA_TAG: z.string(), ITEM_TAG: z.string() });

const groupSchema = z
  .object({
    ENCOUNT_TABLE: z.string(),
    ENCOUNT_SYMBOL_TYPE: z.enum(EncounterSymbol),
    AREA_TAG: z.string(),
    // A group with fewer than 3 monsters leaves the other slots out.
    MONSTER_00: z.string().default(''),
    MONSTER_01: z.string().default(''),
    MONSTER_02: z.string().default(''),
    Lv_0: z.string().default('0'),
    Lv_1: z.string().default('0'),
    Lv_2: z.string().default('0'),
  })
  .transform((g) => ({
    ...g,
    /** The monsters of the group with their levels. Empty slots are dropped. */
    members: [
      { id: g.MONSTER_00, lv: Number(g.Lv_0) },
      { id: g.MONSTER_01, lv: Number(g.Lv_1) },
      { id: g.MONSTER_02, lv: Number(g.Lv_2) },
    ].filter((m) => m.id),
  }));

const encounterSchema = z.object({ AREA_TAG: z.string(), ENCOUNT_TABLE: z.string(), REQ_LV: z.string() });

/** An exploration area. */
export interface Area {
  expl_area: string;
  task_id: string;
  difficulties: string[];
  name: string;
  /** The number of the main task that opens the area, 0 for an area open from the start. */
  task: number;
}

/** A spot of an exploration area. */
export interface Spot {
  expl_research: string;
  expl_rootnumber: string;
  area: Area;
  name: string;
}

/** An item that a spot gives. */
export interface Collect {
  ITEM_TAG: string;
  RATE: string;
}

/** The places where an item is gathered. */
interface Gather {
  texts: string[];
  /** The lowest main task number that opens one of the places. */
  task: number;
}

/** The levels at which a monster appears in a list of encounters. */
interface Appearance {
  lvs: number[];
  reqLv: number;
}

type EncounterGroup = z.output<typeof groupSchema>;

/** An encounter group at a spot, with the area level that it needs. */
export interface Encounter {
  group: EncounterGroup;
  reqLv: number;
}

/** Where the items are gathered and the monsters are found. */
export interface Zones {
  /** The spots, in file order. */
  spots: Spot[];
  /** Maps a spot id to the items that it gives. */
  collectBySpot: Map<string, Collect[]>;
  /** Maps an area id to the item ids of its special spots. */
  uniqueByArea: Map<string, string[]>;
  /** Maps an item id to the texts of its gather places and the lowest main task number that opens one. */
  gather: Map<string, Gather>;
  /** Maps a spot id to its encounters. */
  encountersBySpot: Map<string, Encounter[]>;
  /** Maps a battle character id to the levels at which it appears, by area name. */
  habitat: Map<string, Map<string, number[]>>;
  isBossGroup: (g: EncounterGroup) => boolean;
  /** Lists the monsters of a list of encounters with their levels and the area level that they need. */
  monstersText: (encounters: readonly Encounter[]) => string;
}

/**
 * Loads the areas, the spots, the gather tables and the encounters.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @param story - the main tasks
 * @param nameOfBattleId - the name of the character of a battle character id
 * @returns the zone data
 * @sideEffects reads the exploration tables through the table reader
 */
export function loadZones(read: ReadTable, t: (label: string) => string, story: Story, nameOfBattleId: (id: string) => string): Zones {
  // An area opens when its main task (task_id) is complete; the first area is open from the start.
  const areas = read('expl_area/expl_area.xml', areaSchema);
  const areaInfo = (a: (typeof areas)[number]): Area => ({
    ...a,
    name: t(a.area_name),
    task: a.task_id ? required(story.mainTask, a.task_id).num : 0,
  });
  const areaById = new Map(areas.map((a) => [a.expl_area, areaInfo(a)]));
  // Keyed by the "EA03" prefix: some tables spell the area tags differently (EA03_MOUNTAN).
  const areaByPrefix = new Map(areas.map((a) => [a.area_collect.slice(0, 4), areaInfo(a)]));
  const spotById = new Map<string, Spot>();
  for (const s of read('expl_research/expl_research.xml', researchSchema)) {
    const area = areaById.get(s.expl_area);
    if (area) spotById.set(s.expl_research, { ...s, area, name: t(s.map_name) });
  }
  const opensText = (task: number): string => (task ? `after Task ${task}` : 'start');

  const collectBySpot = new Map<string, Collect[]>();
  const uniqueByArea = new Map<string, string[]>();
  const gather = new Map<string, Gather>();
  const addGather = (id: string, text: string, task: number): void => {
    const g = getOrCreate(gather, id, () => ({ texts: [], task }));
    if (!g.texts.includes(text)) g.texts.push(text);
    g.task = Math.min(g.task, task);
  };
  for (const c of read('expl_collect/area_collect.xml', collectSchema)) {
    const s = spotById.get(c.AREA_TAG);
    if (!s) continue;
    listFor(collectBySpot, c.AREA_TAG).push(c);
    addGather(c.ITEM_TAG, `${s.area.name} - ${s.name} (${c.RATE}%, ${opensText(s.area.task)})`, s.area.task);
  }
  for (const c of read('expl_collect/unique_collect.xml', uniqueCollectSchema)) {
    const a = required(areaByPrefix, c.AREA_TAG.slice(0, 4));
    listFor(uniqueByArea, a.expl_area).push(c.ITEM_TAG);
    addGather(c.ITEM_TAG, `${a.name} (special spot, ${opensText(a.task)})`, a.task);
  }

  // Encounters: a spot lists encounter groups (area_encount); a group lists up to 3 monsters with levels.
  const groups = new Map(read('expl_encount/encount_group.xml', groupSchema).map((g) => [g.ENCOUNT_TABLE, g]));
  const encountersBySpot = new Map<string, Encounter[]>();
  for (const e of read('expl_encount/area_encount.xml', encounterSchema)) {
    const list = listFor(encountersBySpot, e.AREA_TAG);
    const group = groups.get(e.ENCOUNT_TABLE);
    if (group) list.push({ group, reqLv: Number(e.REQ_LV) });
  }
  const monstersText = (encounters: readonly Encounter[]): string => {
    const byName = new Map<string, Appearance>();
    for (const { group, reqLv } of encounters) {
      for (const m of group.members) {
        const name = nameOfBattleId(m.id);
        const entry = getOrCreate(byName, name, () => ({ lvs: [], reqLv }));
        entry.lvs.push(m.lv);
        entry.reqLv = Math.min(entry.reqLv, reqLv);
      }
    }
    return [...byName].map(([name, { lvs, reqLv }]) => `${name} Lv ${range(lvs)}${reqLv ? ` (area Lv ${reqLv}+)` : ''}`).join(', ');
  };

  const habitat = new Map<string, Map<string, number[]>>();
  for (const g of groups.values()) {
    const a = areaByPrefix.get(g.AREA_TAG.slice(0, 4));
    if (!a) continue;
    for (const m of g.members) {
      listFor(
        getOrCreate(habitat, m.id, () => new Map<string, number[]>()),
        a.name,
      ).push(m.lv);
    }
  }

  return {
    spots: [...spotById.values()],
    collectBySpot,
    uniqueByArea,
    gather,
    encountersBySpot,
    habitat,
    isBossGroup: (g) => g.ENCOUNT_SYMBOL_TYPE === EncounterSymbol.Boss,
    monstersText,
  };
}
