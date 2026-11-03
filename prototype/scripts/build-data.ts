// Builds prototype/data.js (window.DATA = ...) and prototype/img/icons/*.png from the game files.
// Usage: build-data.ts <extractedDir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IconKind } from '../../packages/extract/src/enums.ts';
import { loadGame } from '../../packages/workbook/src/game.ts';
import { ELEMENTS } from '../../packages/workbook/src/characters.ts';
import { characterIconOf } from '../../packages/workbook/src/characterColumns.ts';
import { parseElements } from '../../packages/workbook/src/xml.ts';
import { isEmptySlot } from '../../packages/workbook/src/recipes.ts';

const EXTRACTED = process.argv[2] ?? '';
if (!EXTRACTED) throw new Error('Usage: build-data.ts <extractedDir>');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const g = loadGame(EXTRACTED, 128);
const { items, recipes, zones, characters, messages, icons } = g;
const t = messages.t;
const readRows = (rel: string): Record<string, string>[] => parseElements(fs.readFileSync(path.join(EXTRACTED, 'saves', rel), 'utf8'));
const charIcon = characterIconOf(g);
// The start population of the game: a join population at or below it is met by each player, so it is not data of the join.
const initialPopulation = Number(readRows('out_constant/out_constant.xml').find((r) => r.OUT_CONSTANT_DEF === 'OC_INITIAL_POPULATION')?.OUT_CONSTANT_NUM);
if (!Number.isFinite(initialPopulation)) throw new Error('OC_INITIAL_POPULATION not found');

// ---- characters (only the ones that the prototype shows) ----
const charByBattle = new Map(characters.characters.map((c) => [c.BTL_CHARACTER_ID, c]));
const monsterSet = new Map<string, { n: string; icon: string; boss: boolean; rank: number; desc: string; def: number[] | null }>();
const ELEMENT_ORDER = ELEMENTS;
const monsterKey = (c: (typeof characters.characters)[number]): string => {
  const k = c.CHARACTER_ID;
  const nm = characters.characterName.get(k) ?? '';
  if (isPh(nm) || isPh(g.messages.jp(c.CHARACTER_NAME_LABEL_ID))) {
    const msg = `${k}: ${nm || '(empty name)'}`;
    if (!filtered.monsters.includes(msg)) filtered.monsters.push(msg);
    return '';
  }
  if (!monsterSet.has(k)) {
    monsterSet.set(k, {
      n: characters.characterName.get(k) ?? k,
      icon: charIcon(c),
      boss: c.CHARACTER_CATEGORY_ID === '9',
      rank: Number(c.CHARACTER_RANK_ID),
      desc: t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID),
      // The element DEF in the order Fire, Water, Wind, Earth (the Monsters sheet columns "<Element> DEF"); null for a monster with no battle data or only 0.
      def: ((): number[] | null => {
        const d = ELEMENT_ORDER.map((e) => characters.elementDef(c, e));
        return d.every((v) => typeof v === 'number') && d.some((v) => v !== 0) ? (d as number[]) : null;
      })(),
    });
  }
  return k;
};
const npcByName = new Map<string, string>();
const npcFace = (id: string): string => {
  const c = characters.characters.find((x) => x.CHARACTER_ID === id);
  return c ? charIcon(c) : '';
};
const charName = (id: string): string => characters.characterName.get(id) ?? '';
void npcByName;

// ---- placeholders (point 11) ----
// A name is a placeholder when it is empty, starts with '*', or is "Item 015" / "アイテムの名前015". An item whose description starts with '*' is a placeholder too.
const isPh = (n: string): boolean => !n || n.trim() === '' || n.startsWith('*') || /^Item \d+$/i.test(n.trim()) || /^アイテムの名前\d+$/.test(n.trim());
const hiddenItems = new Map<string, string>();
for (const i of items.items) {
  const why = isPh(t(i.ITEM_NAME_LABEL_ID)) || isPh(messages.jp(i.ITEM_NAME_LABEL_ID)) ? 'placeholder name' : t(i.ITEM_DESCRIPTION_LABEL_ID).startsWith('*') ? 'placeholder description' : '';
  if (why) hiddenItems.set(i.ITEM_ID, `${t(i.ITEM_NAME_LABEL_ID)} (${why})`);
}
const filtered: Record<string, string[]> = { characters: [], items: [...hiddenItems].map(([id, w]) => `${id}: ${w}`), recipes: [], research: [], monsters: [], areas: [] };

// ---- items ----
const shownItems = items.items.filter((i) => !hiddenItems.has(i.ITEM_ID));
const itemIds = new Map(shownItems.map((i, n) => [i.ITEM_ID, n]));
// The element items (category "Element", 4 items) go to Material: their ids are ITEM_MAT_* and the recipes use them as materials.
const catOf = (i: (typeof shownItems)[number]): string => (items.categoryOf(i) === 'Element' ? 'Material' : items.categoryOf(i));
type Syn = {
  cost: number;
  mats: { id: string; q: number }[];
  price: number;
  input: number;
  added: number | null;
  per: number | null;
  unpriced: string[];
  unlock: { set: string; teacher: string; tIcon: string; friendship: number | ''; research: string; researcher: string; event: string } | null;
  researchId: string;
};
const itemOut = shownItems.map((i) => ({
  id: i.ITEM_ID,
  n: t(i.ITEM_NAME_LABEL_ID),
  jp: messages.jp(i.ITEM_NAME_LABEL_ID),
  cat: catOf(i),
  sub: items.subCategoryOf(i),
  price: Number(i.ITEM_SELLING_PRICE),
  // ITEM_IMAGE_NUM 0 is the fire element icon. The 9 other items with 0 are placeholders and are hidden.
  icon: icons.ref(IconKind.Item, Number(i.ITEM_IMAGE_NUM)),
  desc: t(i.ITEM_DESCRIPTION_LABEL_ID),
  red: [i.reduce.Fire, i.reduce.Water, i.reduce.Wind, i.reduce.Earth].map(Number),
  shops: i.shops.map((s) => s),
  farm: i.FARM_ID === '-1' ? '' : (items.farm.get(i.FARM_ID) ?? ''),
  gather: [] as { spot: string; rate: number }[],
  special: [] as { z: string; t: string; r: number[] }[],
  drops: [] as { m: string; num: number; rate: number }[],
  syn: null as Syn | null,
  usedIn: [] as { i: string; q: number }[],
}));
const itemById = new Map(itemOut.map((i) => [i.id, i]));
const itemRef = (id: string): string => (itemIds.has(id) ? id : '');

// drops
for (const c of characters.characters.filter(characters.isMonster)) {
  const b = characters.battleOf(c);
  if (!b) continue;
  const mk = monsterKey(c);
  if (mk) for (const d of characters.dropsOf(b)) itemById.get(d.id)?.drops.push({ m: mk, num: d.num, rate: d.rate });
}

// ---- recipes ----
// A recipe goes into its result item (decision 0008). A recipe whose result or material is hidden is dropped.
const recipeOut = recipes.recipes.filter((r) => {
  const bad = hiddenItems.has(r.ITEM_COMPLETION_ID) || r.slots.some((s) => !isEmptySlot(s) && hiddenItems.has(s.id));
  if (bad) filtered.recipes.push(`${r.RECIPE_ID} (uses or makes a hidden item)`);
  return !bad;
}).map((r) => {
  const price = recipes.priceOf(r.ITEM_COMPLETION_ID);
  const added = recipes.addedValue(r);
  const cost = Number(r.ITEM_COMP_MH);
  const u = recipes.unlock.get(r.RECIPE_ID);
  return {
    id: r.RECIPE_ID,
    item: r.ITEM_COMPLETION_ID,
    mats: r.slots.filter((s) => !isEmptySlot(s)).map((s) => ({ id: s.id, q: s.num })),
    cost,
    price,
    input: recipes.inputCost(r),
    added: added === '' ? null : added,
    per: added !== '' && cost > 0 ? added / cost : null,
    unpriced: recipes.unpricedInputs(r).map((m) => m.id),
    unlock: u
      ? {
          set: u.set,
          teacher: u.teacher,
          tIcon: u.teacher ? npcFace(characters.characters.find((c) => charName(c.CHARACTER_ID) === u.teacher)?.CHARACTER_ID ?? '') : '',
          friendship: u.friendship,
          research: u.research,
          researcher: u.researcher,
          event: u.event,
        }
      : null,
  };
});
const recipeById = new Map(recipeOut.map((r) => [r.id, r]));
for (const r of recipeOut) {
  const res = itemById.get(r.item);
  if (res && !res.syn) {
    const { id: _id, item: _item, ...rest } = r;
    void _id;
    void _item;
    res.syn = { ...rest, researchId: '' } as unknown as Syn;
  }
  for (const m of r.mats) itemById.get(m.id)?.usedIn.push({ i: r.item, q: m.q });
}

// ---- rare finds (expl_collect/unique_collect.xml + expl_gimmick/expl_gimmick.xml) ----
// Each COLLECT_ITEM_TAG is 1 reward table of an exploration gimmick: BOX (treasure chest), BUG (bug net), DIG (digging), FISH (fishing).
// RATE_03 is the share of an item in its table: the shares of each table add up to 100.
type Rare = { t: string; n: number; items: { i: string; r: number }[] };
const gimmickType = new Map(readRows('expl_gimmick/expl_gimmick.xml').map((r) => [r.table_01, (r.type ?? '').replace('EXPL_GIMMICK_TYPE_', '')]));
const zoneByPrefix = new Map(readRows('expl_research/expl_research.xml').map((r) => [(r.area_collect ?? '').slice(0, 4), r.expl_area ?? '']));
const rareByZone = new Map<string, Rare[]>();
{
  const tables = new Map<string, Rare & { zone: string }>();
  for (const r of readRows('expl_collect/unique_collect.xml')) {
    const key = r.COLLECT_ITEM_TAG ?? '';
    const zone = zoneByPrefix.get((r.AREA_TAG ?? '').slice(0, 4)) ?? '';
    const cur = tables.get(key) ?? { zone, t: gimmickType.get(key) ?? '', n: 0, items: [] };
    cur.items.push({ i: r.ITEM_TAG ?? '', r: Number(r.RATE_03) });
    tables.set(key, cur);
  }
  const count = new Map<string, number>();
  for (const tb of tables.values()) {
    const k = tb.zone + tb.t;
    count.set(k, (count.get(k) ?? 0) + 1);
    const list = rareByZone.get(tb.zone) ?? [];
    list.push({ t: tb.t, n: count.get(k)!, items: tb.items });
    rareByZone.set(tb.zone, list);
  }
}

// ---- zones, areas, spots ----
const zoneOrder: string[] = [];
const zoneMap = new Map<string, { id: string; n: string; task: number; taskName: string; diff: string[]; areas: { id: string; n: string; diff: string[]; gather: unknown[]; mons: unknown[] }[]; rare: Rare[] }>();
// Spot types (EXPL_RESEARCH_NAME_0x6 "Bestial ..." and 0x7 "Bountiful ..."): a Bestial spot is the battle-only route and a Bountiful spot is the gather-only route.
// RESEARCH_ROUTE_TUTORIAL_TEXT_001 / _002 (Japanese): the 6th route has battles and no gathering, the 7th route is where the area's main materials are gathered.
const dropped = { bountifulMonsterRows: 0, bountifulSpots: 0, bestialGatherRows: 0, bestialSpots: 0 };
const dispatchRows = new Map(readRows('expl_area/expl_area.xml').map((r) => [r.expl_area ?? '', r]));
for (const s of zones.spots) {
  let enc = zones.encountersBySpot.get(s.expl_research) ?? [];
  let col = zones.collectBySpot.get(s.expl_research) ?? [];
  if (!enc.length && !col.length) continue;
  if (/^Bountiful /.test(s.name)) {
    dropped.bountifulSpots++;
    dropped.bountifulMonsterRows += enc.length;
    enc = [];
  } else if (/^Bestial /.test(s.name)) {
    dropped.bestialSpots++;
    dropped.bestialGatherRows += col.length;
    col = [];
  }
  if (!enc.length && !col.length) continue;
  if (isPh(s.name) || isPh(s.area.name)) {
    filtered.areas.push(`${s.expl_research}: ${s.name || '(empty name)'}`);
    continue;
  }
  const zid = s.area.expl_area;
  if (!zoneMap.has(zid)) {
    zoneOrder.push(zid);
    zoneMap.set(zid, {
      id: zid,
      n: s.area.name,
      task: s.area.task,
      taskName: g.story.mainTask.get(s.area.task_id)?.name ?? '',
      diff: s.area.difficulties.map((d) => d.replace('EXPL_AREA_DIFFICULTY_', '')),
      areas: [],
      rare: rareByZone.get(zid) ?? [],
    });
  }
  const z = zoneMap.get(zid)!;
  const mons = new Map<string, { m: string; lv: number[]; req: number; boss: boolean }>();
  for (const e of enc) {
    for (const m of e.group.members) {
      const c = charByBattle.get(m.id);
      if (!c) continue;
      const k = monsterKey(c);
      if (!k) continue;
      const cur = mons.get(k) ?? { m: k, lv: [], req: e.reqLv, boss: zones.isBossGroup(e.group) };
      cur.lv.push(m.lv);
      cur.req = Math.min(cur.req, e.reqLv);
      mons.set(k, cur);
    }
  }
  const spotId = s.expl_research;
  for (const c of col) itemById.get(c.ITEM_TAG)?.gather.push({ spot: spotId, rate: Number(c.RATE) });
  z.areas.push({
    id: spotId,
    n: s.name,
    diff: s.area.difficulties.map((d) => d.replace('EXPL_AREA_DIFFICULTY_', '')),
    gather: col.toSorted((a, b) => Number(b.RATE) - Number(a.RATE)).map((c) => ({ i: itemRef(c.ITEM_TAG), r: Number(c.RATE) })).filter((c) => c.i),
    mons: [...mons.values()].map((m) => ({ m: m.m, lo: Math.min(...m.lv), hi: Math.max(...m.lv), lvs: [...new Set(m.lv)].sort((x, y) => x - y), req: m.req, boss: m.boss })),
  });
}
const zoneOut = zoneOrder.map((id) => {
  const z = zoneMap.get(id)!;
  const dr = dispatchRows.get(id);
  // expl_area.xml ele_00..03: flags of the 4 elements in the order Fire, Water, Wind, Earth (the order of the character element fields and of the item reduce fields).
  const ele = [0, 1, 2, 3].map((k) => Number(dr?.[`ele_0${k}`] ?? 0));
  return { id, n: z.n, task: z.task, taskName: z.taskName, ele, rare: z.rare, areas: z.areas };
});
for (const z of zoneOut) for (const r of z.rare) for (const x of r.items) x.i = itemRef(x.i);
for (const z of zoneOut) z.rare = z.rare.map((r) => ({ ...r, items: r.items.filter((x) => x.i) })).filter((r) => r.items.length);
for (const z of zoneOut) {
  for (const r of z.rare) {
    for (const x of r.items) {
      const it = itemById.get(x.i)!;
      const cur = it.special.find((e) => e.z === z.id && e.t === r.t);
      if (cur) cur.r.push(x.r);
      else it.special.push({ z: z.id, t: r.t, r: [x.r] });
    }
  }
}

// ---- research ----
const prize = new Map(readRows('study/stdy_prize.xml').map((p) => [p.STDY_PRIZE_ID, p]));
const collections = new Map(readRows('recipe/recipe_collection.xml').map((c) => [c.RECIPE_COLLECTION_ID, c]));
const cond = new Map(readRows('study/stdy_conditions.xml').map((c) => [c.STDY_COND_ID, c]));
const districts = new Map(readRows('commercial_district/commercial_district.xml').map((d) => [d.COMMERCIAL_DISTRICT_ID ?? '', d.COMMERCIAL_DISTRICT_LABEL_ID ?? '']));
const requests = new Map(readRows('request/request.xml').map((d) => [d.REQUEST_ID ?? '', d.REQUEST_DESCRIPTION_LABEL_ID ?? '']));
const researchRows = readRows('study/stdy_research.xml');
const researchById = new Map(researchRows.map((r) => [r.STDY_RES_ID, r]));
const bonusName: Record<string, string> = {
  STDY_BONUS_TYPE_COST_DOWN: 'Cost down',
  STDY_BONUS_TYPE_BONUS_ITEM: 'Bonus item',
  STDY_BONUS_TYPE_CONSTRUCTION_EXPENSES_UP: 'Construction expenses up',
};
const researchOut: Record<string, unknown> = {};
const treeNames = ['main', 'attack', 'support', 'emergency'];
const trees: Record<string, { res: (string | null)[][]; con: (string | null)[][] }> = {};
const resTree: Record<string, string> = {};
for (const tn of treeNames) {
  const rows = readRows(`study/stdy_tree_${tn}.xml`);
  const res: (string | null)[][] = [];
  const con: (string | null)[][] = [];
  for (const row of rows) {
    const rr: (string | null)[] = [];
    const cc: (string | null)[] = [];
    for (let c = 0; c < 20; c++) {
      const k = String(c).padStart(3, '0');
      const r = row[`STDY_TREE_RES_TAG_${k}`] ?? '';
      const cn = row[`STDY_TREE_CONNECT_TAG_${k}`] ?? '';
      rr.push(r.startsWith('STDY_RES_') && r !== 'STDY_RES_INVALID' ? r : null);
      cc.push(cn.startsWith('STDY_CONNECT_TYPE_') && !cn.endsWith('INVALID') ? cn.replace('STDY_CONNECT_TYPE_', '') : null);
    }
    res.push(rr);
    con.push(cc);
  }
  trees[tn] = { res, con };
  for (const rr of res) for (const id of rr) if (id) resTree[id] = tn;
}
const setItemRecipes = (collId: string): string[] =>
  ['1', '2', '3', '4'].map((n) => collections.get(collId)?.[`RECIPE_COLLECTION_RECIPE${n}_ID`] ?? '').filter((id) => recipeById.has(id)).map((id) => recipeById.get(id)!.item);
for (const id of Object.keys(resTree)) {
  const r = researchById.get(id);
  if (!r) continue;
  if (isPh(t(r.STDY_RES_NAME_LABEL_ID)) || isPh(messages.jp(r.STDY_RES_NAME_LABEL_ID))) {
    filtered.research.push(`${id}: ${t(r.STDY_RES_NAME_LABEL_ID) || '(empty name)'}`);
    continue;
  }
  const p = prize.get(r.STDY_PRIZE_TAG);
  const coll = p && p.STDY_PRIZE_RECIPE_COLLECTION !== 'RECIPE_COLLECTION_INVALID' ? p.STDY_PRIZE_RECIPE_COLLECTION : '';
  const c = cond.get(r.STDY_RES_COND_TAG);
  const bonusItem = r.STDY_BONUS_TAG;
  // The icon of a research is the icon of its output: the first prize item, else the first item of the prize recipe set, else the bonus item.
  const prizeItemId = p ? itemRef(p.STDY_PRIZE_ITEM_NAME_00 ?? '') : '';
  const setItems = coll ? setItemRecipes(coll) : [];
  const bonusItemId = p ? itemRef(p.STDY_PRIZE_BONUS_ITEM ?? '') : '';
  const [iconKind, iconItem] = prizeItemId ? ['prize', prizeItemId] : setItems.length ? ['recipe', setItems[0]] : bonusItemId ? ['bonus', bonusItemId] : ['', ''];
  researchOut[id] = {
    icon: iconItem ? itemById.get(iconItem)!.icon : '',
    iconKind,
    id,
    tree: resTree[id],
    n: t(r.STDY_RES_NAME_LABEL_ID) || id,
    unnamed: !t(r.STDY_RES_NAME_LABEL_ID),
    who: [r.STDY_RES_CHARACTER_TAG_00, r.STDY_RES_CHARACTER_TAG_01].filter((x) => x && x !== 'CHARACTER_INVALID').map((x) => ({ id: x, n: charName(x) || x, icon: npcFace(x) })),
    dur: Number(r.STDY_RES_DURATION),
    money: Number(r.STDY_RES_MONEY_NUM),
    mats: [0, 1, 2, 3].map((n) => ({ id: r[`STDY_RES_ITEM_NAME_0${n}`] ?? '', q: Number(r[`STDY_RES_ITEM_NUM_0${n}`] ?? 0) })).filter((m) => itemRef(m.id ?? '')),
    pre: (c ? [0, 1, 2, 3].map((n) => c[`STDY_COND_RES_TAG_0${n}`] ?? '') : []).filter((x) => x && x !== 'STDY_RES_INVALID'),
    set: coll ? { n: t(collections.get(coll)?.RECIPE_COLLECTION_NAME_LABEL_ID ?? ''), recipes: setItemRecipes(coll) } : null,
    prizeItem: p && itemRef(p.STDY_PRIZE_ITEM_NAME_00 ?? '') ? { id: p.STDY_PRIZE_ITEM_NAME_00, q: Number(p.STDY_PRIZE_ITEM_NUM_00) } : null,
    bonus: bonusName[bonusItem ?? ''] ?? '',
    // STDY_FRIEND_POINT: the game text MESSAGE_STUDY_FRIENDSHIP is "Researcher friendship level: Over N"; the Japanese text is the TOTAL friendship of the researchers, N or more. The site label is "Total friendship".
    friendNeed: Number(r.STDY_FRIEND_POINT),
    // stdy_conditions.xml: the district and the request conditions. STDY_COND_CHARACTER_TAG_* repeats the researchers of the research, so it is not shown again.
    conds: [
      c && c.STDY_COMMERCIAL_DISTRICT_ID !== 'COMMERCIAL_DISTRICT_INVALID' ? { k: 'district', v: t(districts.get(c.STDY_COMMERCIAL_DISTRICT_ID) ?? '') } : null,
      c && c.STDY_COND_REQUEST_ID !== 'REQUEST_INVALID' ? { k: 'request', v: t(requests.get(c.STDY_COND_REQUEST_ID) ?? '') } : null,
    ].filter((x) => x && x.v),
  };
}
for (const r of recipeOut) {
  // the research that gives the recipe set of this recipe
  const hit = Object.values(researchOut as Record<string, { id: string; set: { recipes: string[] } | null }>).find((x) => x.set?.recipes.includes(r.item));
  const syn = itemById.get(r.item)?.syn;
  if (syn) syn.researchId = hit?.id ?? '';
}

// ---- write ----
const used = new Set<string>();
const collectIcons = (v: unknown): void => {
  if (Array.isArray(v)) v.forEach(collectIcons);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (k === 'icon' || k === 'tIcon') && typeof x === 'string' && x ? used.add(x) : collectIcons(x);
};
for (const c of characters.characters.filter(characters.isMonster)) monsterKey(c);
// A name that 2 real monsters share (CHARACTER_HOMM0 and CHARACTER_HOMM2 are both "Beast": own name label, description, rank and areas) gets its rank.
const monsterNameCount = new Map<string, number>();
for (const m of monsterSet.values()) monsterNameCount.set(m.n, (monsterNameCount.get(m.n) ?? 0) + 1);
for (const m of monsterSet.values()) if ((monsterNameCount.get(m.n) ?? 0) > 1) m.n = `${m.n} (Rank ${m.rank})`;
const monstersOut = Object.fromEntries(monsterSet);
// Duplicate names (point 11). An entry such as CHARACTER_PAMELA_A4 has the name label of CHARACTER_PAMELA, no description (MESSAGE_COMMON_NOTHING),
// no source game, no aptitudes and no join condition (CHARACTER_APP_CON_078 = EVENT_NONE). It is another picture of the same person
// that only the visit events (visit/data_visit.xml) use. It has no field of its own to show, so it is not a character of the site.
const nonMonsters = characters.characters.filter((c) => !characters.isMonster(c) && !isPh(charName(c.CHARACTER_ID)) && charIcon(c));
const labelCount = new Map<string, number>();
for (const c of nonMonsters) labelCount.set(c.CHARACTER_NAME_LABEL_ID, (labelCount.get(c.CHARACTER_NAME_LABEL_ID) ?? 0) + 1);
const isPicture = (c: (typeof nonMonsters)[number]): boolean => (labelCount.get(c.CHARACTER_NAME_LABEL_ID) ?? 0) > 1 && c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID === 'MESSAGE_COMMON_NOTHING';
for (const c of nonMonsters.filter(isPicture)) filtered.characters.push(`${c.CHARACTER_ID}: picture of ${charName(c.CHARACTER_ID)}`);
// A character joins the town only when its join event (CHARACTER_APP_CON_ID -> character_app_con.xml CHARACTER_APP_EVENT) is not EVENT_NONE.
// The others (Fairy, Boss, shopkeepers, visitors, variants) have no page: a mention of them elsewhere is plain text with the face.
const joinEventOf = (c: (typeof nonMonsters)[number]): string => characters.joinConditionOf(c)?.CHARACTER_APP_EVENT ?? '';
const nonPictures = nonMonsters.filter((c) => !isPicture(c));
const droppedChars = nonPictures.filter((c) => !joinEventOf(c) || joinEventOf(c) === 'EVENT_NONE');
for (const c of droppedChars) filtered.characters.push(`${c.CHARACTER_ID}: ${charName(c.CHARACTER_ID)} (does not join: EVENT_NONE)`);
console.log('NON-JOINING CHARACTERS', droppedChars.length, JSON.stringify(droppedChars.map((c) => `${charName(c.CHARACTER_ID)} [${c.CHARACTER_ID}]`)));
const shownChars = nonPictures.filter((c) => !droppedChars.includes(c));
// A name that is still shared (CHARACTER_CHIM_MALE and CHARACTER_CHIM_FEMALE, 2 persons with their own description) gets the word of its id.
const nameCount = new Map<string, number>();
for (const c of shownChars) nameCount.set(charName(c.CHARACTER_ID), (nameCount.get(charName(c.CHARACTER_ID)) ?? 0) + 1);
const sameNames: string[] = [];
const kindOf = (id: string): string => (/_MALE$/.test(id) ? 'boy' : /_FEMALE$/.test(id) ? 'girl' : '');
const charName2 = (c: (typeof nonMonsters)[number]): string => {
  const n = charName(c.CHARACTER_ID);
  if ((nameCount.get(n) ?? 0) < 2) return n;
  sameNames.push(`${c.CHARACTER_ID}: ${kindOf(c.CHARACTER_ID) || '?'}`);
  return kindOf(c.CHARACTER_ID) ? `${n} (${kindOf(c.CHARACTER_ID)})` : n;
};
// A join event that is not the game start and not EVENT_NONE is a story event (no name in the game files). Characters with the same event join together.
const eventOf = (c: (typeof shownChars)[number]): string => characters.joinConditionOf(c)?.CHARACTER_APP_EVENT ?? '';
const isStoryEvent = (e: string): boolean => e !== '' && e !== 'EVENT_MS01_010' && e !== 'EVENT_NONE';
const byEvent = Object.groupBy(shownChars.filter((c) => isStoryEvent(eventOf(c))), eventOf);
const charsOut = shownChars.map((c) => {
  const j = characters.joinConditionOf(c);
  const ev = eventOf(c);
  const story = isStoryEvent(ev);
  const pop = Number(j?.CHARACTER_APP_POPULATION ?? 0);
  const turn = Number(j?.CHARACTER_APP_CTURN ?? 0);
  return {
    id: c.CHARACTER_ID,
    n: charName2(c),
    // The name of the game data: the recipe teachers of the item data are matched by it.
    nr: charName(c.CHARACTER_ID),
    icon: charIcon(c),
    type: characters.typeOf(c),
    desc: t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID),
    game: characters.sourceGame(c),
    apt: characters.aptitudesText(c) ? characters.aptitudesText(c).split(', ') : [],
    // skillsText: "Name (Lv N)", and for the 5th skill "Name (EVENT_ID)": the skill that the character learns at an event.
    skills: (characters.skillsText(c) ? characters.skillsText(c).split(', ') : []).map((s) => {
      const m = /^(.*) \((?:Lv (\d+)|(EVENT_\w+))\)$/.exec(s);
      return m ? { n: m[1], lv: m[2] ? Number(m[2]) : 0, ev: m[3] ?? '' } : { n: s, lv: 0, ev: '' };
    }),
    // character_app_con.xml. The event has no name in the data, so it shows as its id. The meaning of the join turn is not confirmed.
    // Turn 0 and 1 and a population at or below the start population (OC_INITIAL_POPULATION) are met by each player, so they are not data of the join. The meaning of the join turn is not confirmed.
    join: story || pop > initialPopulation || turn > 1 ? { story, with: story ? (byEvent[ev] ?? []).filter((x) => x !== c).map((x) => x.CHARACTER_ID) : [], pop: pop > initialPopulation ? pop : 0, turn: turn > 1 ? turn : 0 } : null,
    friendMax: Number(c.CHARA_COMPANION_MAX),
  };
});
console.log('STORY EVENT JOIN', charsOut.filter((c) => c.join?.story).length, JSON.stringify(Object.fromEntries(Object.entries(byEvent).map(([k, v]) => [k, v?.length]))));
console.log('SAME NAMES', JSON.stringify(sameNames));
const data = { items: itemOut, zones: zoneOut, monsters: monstersOut, chars: charsOut, research: researchOut, trees };
collectIcons(data);
fs.mkdirSync(path.join(OUT, 'img', 'icons'), { recursive: true });
for (const name of used) {
  const png = icons.images.get(name);
  if (png) fs.writeFileSync(path.join(OUT, 'img', 'icons', name), png);
}
fs.writeFileSync(path.join(OUT, 'data.js'), `window.DATA = ${JSON.stringify(data)};\n`);
{
  const kinds = Object.values(researchOut as Record<string, { iconKind: string }>).map((r) => r.iconKind || 'none');
  console.log('RESEARCH ICONS', JSON.stringify({ total: kinds.length, ...Object.fromEntries([...new Set(kinds)].map((k) => [k, kinds.filter((x) => x === k).length])) }), 'initialPopulation', initialPopulation);
}
console.log('DROPPED', JSON.stringify(dropped));
console.log('CHAR TYPES', JSON.stringify(Object.entries(Object.groupBy(charsOut, (c) => c.type)).map(([k, v]) => [k, v?.length])));
console.log('FILTERED', JSON.stringify({ ...filtered, items: filtered.items }, null, 1));
console.log({ items: itemOut.length, recipes: recipeOut.length, zones: zoneOut.length, research: Object.keys(researchOut).length, icons: used.size, monsters: monsterSet.size });
console.log(zoneOut.map((z) => `${z.n}: ${z.areas.map((a) => `${a.n}`).join(', ')}`).join('\n'));
