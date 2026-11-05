import { z } from 'zod';
import { EncounterSymbol } from '../enums.js';
import { listFor, required } from '../util.js';
import type { Messages } from './messages.js';
import type { Story } from './story.js';
import type { ReadTable } from './xml.js';

const zoneSchema = z
  .object({
    expl_area: z.string(),
    area_name: z.string(),
    // The first zone has no task: it is open from the start.
    task_id: z.string().default(''),
    area_collect: z.string(),
    diff_00: z.string(),
    diff_01: z.string(),
    diff_02: z.string(),
    diff_03: z.string(),
    diff_04: z.string(),
  })
  .transform((a) => ({ ...a, difficulties: [a.diff_00, a.diff_01, a.diff_02, a.diff_03, a.diff_04] }));

const areaSchema = z.object({
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

/** A top-level exploration area of the game (a zone of the model). */
export interface ZoneRow {
  expl_area: string;
  area_collect: string;
  task_id: string;
  difficulties: string[];
  name: string;
  /** The number of the main task that opens the zone, 0 for a zone open from the start. */
  task: number;
  /** The name of the main task that opens the zone, '' for a zone open from the start. */
  taskName: string;
}

/** A spot of an exploration area of the game (an area of the model). */
export interface AreaRow {
  expl_research: string;
  expl_rootnumber: string;
  zone: ZoneRow;
  name: string;
}

/** An item that an area gives. */
export interface Collect {
  ITEM_TAG: string;
  RATE: string;
}

/** A row of encount_group.xml. */
export type EncounterGroup = z.output<typeof groupSchema>;

/** An encounter group at an area, with the zone level that it needs. */
export interface Encounter {
  group: EncounterGroup;
  reqLv: number;
}

/** The zones and the areas of the game, with what they give and who lives there. */
export interface Zones {
  /** The zones, in file order. */
  zones: ZoneRow[];
  /** The areas, in file order. */
  areas: AreaRow[];
  /** Maps an area id to the items that it gives. */
  collectByArea: Map<string, Collect[]>;
  /** Maps a zone id to the item ids of its special spots, in file order, repeats included. */
  uniqueByZone: Map<string, string[]>;
  /** Maps an area id to its encounters. */
  encountersByArea: Map<string, Encounter[]>;
  /** The encounter groups that no area lists, with the zone that holds them, in file order. */
  zoneEncounters: { group: EncounterGroup; zone: ZoneRow }[];
  isBossGroup: (g: EncounterGroup) => boolean;
}

/**
 * Loads the zones, the areas, the gather tables and the encounters.
 * @param read - the table reader of the saves folder
 * @param messages - the game texts
 * @param story - the main tasks
 * @returns the zone data, without the zones and areas that are placeholders
 * @sideEffects reads the exploration tables through the table reader
 */
export function loadZones(read: ReadTable, messages: Messages, story: Story): Zones {
  const { t } = messages;
  // A zone opens when its main task (task_id) is complete; the first zone is open from the start.
  const allZoneRows = read('expl_area/expl_area.xml', zoneSchema);
  const zoneRows = allZoneRows.filter((a) => !messages.isPlaceholder(a.area_name));
  // The rows of a dropped zone are dropped too, so no link can point to it.
  const droppedPrefixes = new Set(allZoneRows.filter((a) => messages.isPlaceholder(a.area_name)).map((a) => a.area_collect.slice(0, 4)));
  const zoneInfo = (a: (typeof zoneRows)[number]): ZoneRow => {
    const task = a.task_id ? required(story.mainTask, a.task_id) : undefined;
    return { ...a, name: t(a.area_name), task: task?.num ?? 0, taskName: task?.name ?? '' };
  };
  const zones = zoneRows.map(zoneInfo);
  const zoneById = new Map(zones.map((z) => [z.expl_area, z]));
  // Keyed by the "EA03" prefix: some tables spell the area tags differently (EA03_MOUNTAN).
  const zoneByPrefix = new Map(zones.map((z) => [z.area_collect.slice(0, 4), z]));
  const areaById = new Map<string, AreaRow>();
  for (const s of read('expl_research/expl_research.xml', areaSchema)) {
    const zone = zoneById.get(s.expl_area);
    if (zone && !messages.isPlaceholder(s.map_name)) areaById.set(s.expl_research, { ...s, zone, name: t(s.map_name) });
  }

  const collectByArea = new Map<string, Collect[]>();
  const uniqueByZone = new Map<string, string[]>();
  for (const c of read('expl_collect/area_collect.xml', collectSchema)) {
    if (areaById.has(c.AREA_TAG)) listFor(collectByArea, c.AREA_TAG).push(c);
  }
  for (const c of read('expl_collect/unique_collect.xml', uniqueCollectSchema)) {
    const prefix = c.AREA_TAG.slice(0, 4);
    if (droppedPrefixes.has(prefix) && !zoneByPrefix.has(prefix)) continue;
    const zone = required(zoneByPrefix, prefix);
    listFor(uniqueByZone, zone.expl_area).push(c.ITEM_TAG);
  }

  // Encounters: an area lists encounter groups (area_encount); a group lists up to 3 monsters with levels.
  const groups = new Map(read('expl_encount/encount_group.xml', groupSchema).map((g) => [g.ENCOUNT_TABLE, g]));
  const encountersByArea = new Map<string, Encounter[]>();
  const listed = new Set<string>();
  for (const e of read('expl_encount/area_encount.xml', encounterSchema)) {
    const list = listFor(encountersByArea, e.AREA_TAG);
    const group = groups.get(e.ENCOUNT_TABLE);
    if (group) list.push({ group, reqLv: Number(e.REQ_LV) });
    listed.add(e.ENCOUNT_TABLE);
  }
  // Some groups (ENCOUNTER_ETC_*) are in no area. Their AREA_TAG names the zone.
  const zoneEncounters = [...groups.values()].flatMap((group) => {
    const zone = zoneByPrefix.get(group.AREA_TAG.slice(0, 4));
    return zone && !listed.has(group.ENCOUNT_TABLE) ? [{ group, zone }] : [];
  });

  return {
    zones,
    areas: [...areaById.values()],
    collectByArea,
    uniqueByZone,
    encountersByArea,
    zoneEncounters,
    isBossGroup: (g) => g.ENCOUNT_SYMBOL_TYPE === EncounterSymbol.Boss,
  };
}
