// Builds the Nelke data workbook from the extracted game files.
// Usage: node tools/build.js [extractedDir] [outFile]
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { createIconSet } = require('./icons');

const EXTRACTED = process.argv[2] || path.join(__dirname, '..', 'extracted');
const SAVES = path.join(EXTRACTED, 'saves');
const OUT = process.argv[3] || path.join(__dirname, '..', 'output', 'nelke_data.xlsx');
const ICON_DIR = path.join(path.dirname(OUT), 'icons');
const ICON_SIZE = 64;

/** Reads every <elem .../> of a game XML file as a plain object. */
function parse(rel) {
  const text = fs.readFileSync(path.join(SAVES, rel), 'utf8');
  return [...text.matchAll(/<elem ([^>]*?)\/>/g)].map((m) =>
    Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2])])),
  );
}

function decode(s) {
  return s
    .replace(/&lt;CR&gt;/g, ' ')
    .replace(/&lt;[A-Z]+&gt;/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const en = {};
const jp = {};
for (const e of [...parse('message_en/message.xml'), ...parse('message_en/expl_message_str.xml')]) en[e.NAME_LABEL] = e.NAME_ENGLISH;
for (const e of parse('message/message.xml')) jp[e.NAME_LABEL] = e.NAME_JAPAN;
const t = (label) => en[label] || '';
const isPlaceholder = (name) => !name || name.startsWith('*');
const round = (n) => Math.round(n * 100) / 100;
const unique = (list) => [...new Set(list)];
const range = (nums) => (Math.min(...nums) === Math.max(...nums) ? `${nums[0]}` : `${Math.min(...nums)}-${Math.max(...nums)}`);

const icons = createIconSet(SAVES, path.join(EXTRACTED, 'data'), ICON_SIZE);

const CATEGORY = { 0: 'Material', 1: 'Construction', 2: 'Merchandise', 5: 'Element', 7: 'Battle Item' };
const SHOPS = [
  ['GSTORE_SALE_FLAG', 'General Store'],
  ['ASHOP_SALE_FLAG', 'Weapon/Armor Shop'],
  ['GRSTORE_SALE_FLAG', 'Grocery Store'],
  ['CSTORE_SALE_FLAG', 'Clothing Store'],
  ['DRSTORE_SALE_FLAG', 'Medicine Shop'],
];
const CHARACTER_TYPE = { 0: 'Main', 1: 'Main', 2: 'Alchemist', 3: 'Townsfolk', 4: 'Story', 7: 'Fairy', 8: 'Monster', 9: 'Boss' };
const MONSTER_TYPES = ['8', '9'];
const PLAY_TYPE = { BTL_PLAY_TYPE_ATTACKER: 'Attacker', BTL_PLAY_TYPE_SUPPORTER: 'Supporter' };
// Stat fields of para_archetype / para_growtype, with the English status names of the game.
const STATS = [
  ['HP', 'HP'],
  ['STR', 'STR'],
  ['VIT', 'CON'],
  ['INT', 'INT'],
  ['DEX', 'DEX'],
  ['LUCK', 'LUC'],
  ['AGI', 'AGI'],
  ['CHR', 'CHM'],
];
// btl_chara element_1..4 follow battle/element.xml: element_0 is "no element" and is always 0.
const ELEMENTS = ['Fire', 'Water', 'Wind', 'Earth'];

// --- Items ---------------------------------------------------------------------------------

const items = parse('item/item.xml').filter((i) => !isPlaceholder(t(i.ITEM_NAME_LABEL_ID)));
const itemById = new Map(items.map((i) => [i.ITEM_ID, i]));
const itemName = (id) => (itemById.has(id) ? t(itemById.get(id).ITEM_NAME_LABEL_ID) : id);

const subCategory = new Map(parse('item/item_sub_category.xml').map((s) => [s.ITEM__SUB_CATEGORY_ID, t(s.ITEM_SUB_CATEGORY_NAME_LABEL_ID)]));
const aptitude = new Map(parse('preparation_aptitude/preparation_aptitude.xml').map((a) => [a.PREPARATION_APTITUDE_ID, t(a.PREPARATION_APTITUDE_NAME_LABEL_ID)]));
const categoryOf = (i) => CATEGORY[i.ITEM_CATEGORY_ID] || `Category ${i.ITEM_CATEGORY_ID}`;
const subCategoryOf = (i) => subCategory.get(i.ITEM_SUB_CATEGORY_ID) || '';
const aptitudesOf = (row, prefix) =>
  [1, 2, 3]
    .map((n) => row[`${prefix}${n}`])
    .filter((a) => a !== 'PREPARATION_APTITUDE_INVALID')
    .map((a) => aptitude.get(a) || a)
    .join(', ');

// Growing area type (FARM_ID) -> name of the level 0 farm facility of that sub-category.
const farm = new Map();
for (const f of parse('facility/facility.xml')) {
  if (f.FACILITY_CATEGORY_ID === '2' && !farm.has(f.FACILITY_SUB_CATEGORY_ID)) farm.set(f.FACILITY_SUB_CATEGORY_ID, t(f.FACILITY_PARENTNAME_LABEL_ID));
}

// --- Story progress ------------------------------------------------------------------------

// Main tasks: MAIN_TASK_000 is Task 1.
const mainTask = new Map(
  parse('task/task.xml')
    .filter((k) => k.TASK_TYPE_ID === '0')
    .map((k) => [k.TASK_ID, { num: +k.TASK_ID.slice(-3) + 1, name: t(k.TASK_NAME) }]),
);
const taskLabel = (id) => (mainTask.has(id) ? `Task ${mainTask.get(id).num}: ${mainTask.get(id).name}` : id);

// EVENT_MM01_0<N+1>0 is the review event where Lotos approves main task N.
// The data has no event names; this rule comes from the English dialog of event_message_mm01_*.ebm.
function eventLabel(id) {
  if (!id || id === 'EVENT_NONE') return '';
  const m = /^EVENT_MM01_(\d)(\d)0$/.exec(id);
  const n = m ? +(m[1] + m[2]) - 1 : 0;
  const task = [...mainTask.keys()].find((k) => mainTask.get(k).num === n);
  return task ? `After ${taskLabel(task)}` : id;
}

// --- Characters and monsters ---------------------------------------------------------------

const characters = parse('character/character.xml').filter((c) => !isPlaceholder(t(c.CHARACTER_NAME_LABEL_ID)));
const characterName = new Map(characters.map((c) => [c.CHARACTER_ID, t(c.CHARACTER_NAME_LABEL_ID)]));
const battleById = new Map(parse('battle/btl_chara.xml').map((b) => [b.BTL_CHARACTER_ID, b]));
const battleOf = (c) => battleById.get(c.BTL_CHARACTER_ID);
const nameOfBattleId = (id) => characterName.get(battleById.get(id)?.CHARACTER_ID) || id;
const archetype = new Map(parse('character/para_archetype.xml').map((a) => [a.PARA_ARCHETYPE_ID, a]));
const growtype = new Map(parse('character/para_growtype.xml').map((g) => [g.PARA_GROWTYPE_ID, g]));
const product = new Map(parse('character/product.xml').map((p) => [p.PRODUCT_ID, t(p.PRODUCT_NAME_LABEL_ID)]));
const skill = new Map(parse('character/character_skill.xml').map((s) => [s.CHARACTER_SKILL_ID, t(s.SKILL_NAME_LABEL_ID)]));
const joinCondition = new Map(parse('character/character_app_con.xml').map((a) => [a.CHARA_APP_CON_ID, a]));

const baseStat = (c, field) => +(archetype.get(c.PARA_ARCHETYPE_ID)?.[`PARA_ARCHETYPE_${field}`] ?? 0);
function growthText(c) {
  const g = growtype.get(c.PARA_GROWTYPE_ID);
  if (!g) return '';
  return STATS.map(([field, label]) => [label, +g[`PARA_GROWTYPE_${field}MIN`], +g[`PARA_GROWTYPE_${field}MAX`]])
    .filter(([, , max]) => max > 0)
    .map(([label, min, max]) => `${label} ${min === max ? min : `${min}-${max}`}`)
    .join(', ');
}
function skillsText(c) {
  const list = [1, 2, 3, 4]
    .filter((n) => c[`CHARACTER_SKILL${n}_ID`] !== 'SKILL_INVALID')
    .sort((a, b) => c[`CHARACTER_SKILL${a}_LEARNING_LV`] - c[`CHARACTER_SKILL${b}_LEARNING_LV`])
    .map((n) => `${skill.get(c[`CHARACTER_SKILL${n}_ID`])} (Lv ${c[`CHARACTER_SKILL${n}_LEARNING_LV`]})`);
  if (c.CHARACTER_SKILL5_ID !== 'SKILL_INVALID') list.push(`${skill.get(c.CHARACTER_SKILL5_ID)} (${eventLabel(c.CHARACTER_SKILL5_LEARNING_EVENT)})`);
  return list.join(', ');
}
const elementDef = (c, n) => {
  const b = battleOf(c);
  return b ? +b[`element_${n + 1}`] : '';
};
// Characters use the NPC face list at their illustration number; monsters use the monster
// face list, where number 200 is the first entry.
const characterIcon = (c) =>
  MONSTER_TYPES.includes(c.CHARACTER_CATEGORY_ID)
    ? icons.ref('monster', +c.CHARACTER_ANILLUSTRATION_NUM - 200)
    : icons.ref('npc', +c.CHARACTER_ANILLUSTRATION_NUM);

// Monster drops, by item.
const droppedBy = new Map();
const dropsOf = (b) =>
  [0, 1, 2]
    .map((n) => ({ id: b[`drop_item${n}`], num: +b[`item_num${n}`], rate: +b[`drop_rate${n}`] }))
    .filter((d) => d.id && d.id !== 'ITEM_NONE');
for (const c of characters.filter((c) => MONSTER_TYPES.includes(c.CHARACTER_CATEGORY_ID) && battleOf(c))) {
  for (const d of dropsOf(battleOf(c))) {
    if (!droppedBy.has(d.id)) droppedBy.set(d.id, []);
    droppedBy.get(d.id).push(`${characterName.get(c.CHARACTER_ID)} x${d.num} (${d.rate}%)`);
  }
}

// --- Zones ---------------------------------------------------------------------------------

// An area opens when its main task (task_id) is complete; the first area is open from the start.
const areas = parse('expl_area/expl_area.xml');
const areaInfo = (a) => ({ ...a, name: t(a.area_name), task: a.task_id ? mainTask.get(a.task_id).num : 0 });
const areaById = new Map(areas.map((a) => [a.expl_area, areaInfo(a)]));
// Keyed by the "EA03" prefix: some tables spell the area tags differently (EA03_MOUNTAN).
const areaByPrefix = new Map(areas.map((a) => [a.area_collect.slice(0, 4), areaInfo(a)]));
const spots = parse('expl_research/expl_research.xml').filter((s) => areaById.has(s.expl_area));
const spotById = new Map(spots.map((s) => [s.expl_research, { ...s, area: areaById.get(s.expl_area), name: t(s.map_name) }]));
const opensText = (task) => (task ? `after Task ${task}` : 'start');

const collectBySpot = new Map();
const uniqueByArea = new Map();
const gather = new Map();
const addGather = (id, text, task) => {
  if (!gather.has(id)) gather.set(id, { texts: [], task });
  const g = gather.get(id);
  if (!g.texts.includes(text)) g.texts.push(text);
  g.task = Math.min(g.task, task);
};
for (const c of parse('expl_collect/area_collect.xml')) {
  const s = spotById.get(c.AREA_TAG);
  if (!s) continue;
  if (!collectBySpot.has(c.AREA_TAG)) collectBySpot.set(c.AREA_TAG, []);
  collectBySpot.get(c.AREA_TAG).push(c);
  addGather(c.ITEM_TAG, `${s.area.name} - ${s.name} (${c.RATE}%, ${opensText(s.area.task)})`, s.area.task);
}
for (const c of parse('expl_collect/unique_collect.xml')) {
  const a = areaByPrefix.get(c.AREA_TAG.slice(0, 4));
  if (!uniqueByArea.has(a.expl_area)) uniqueByArea.set(a.expl_area, []);
  uniqueByArea.get(a.expl_area).push(c.ITEM_TAG);
  addGather(c.ITEM_TAG, `${a.name} (special spot, ${opensText(a.task)})`, a.task);
}

// Encounters: a spot lists encounter groups (area_encount); a group lists up to 3 monsters with levels.
const groups = new Map(parse('expl_encount/encount_group.xml').map((g) => [g.ENCOUNT_TABLE, g]));
const membersOf = (g) =>
  [0, 1, 2].map((n) => ({ id: g[`MONSTER_0${n}`], lv: +g[`Lv_${n}`] })).filter((m) => m.id);
const isBossGroup = (g) => g.ENCOUNT_SYMBOL_TYPE === 'BTL_ENCOUNT_SYMBOL_TYPE_BOSS';
const encountersBySpot = new Map();
for (const e of parse('expl_encount/area_encount.xml')) {
  if (!encountersBySpot.has(e.AREA_TAG)) encountersBySpot.set(e.AREA_TAG, []);
  if (groups.has(e.ENCOUNT_TABLE)) encountersBySpot.get(e.AREA_TAG).push({ group: groups.get(e.ENCOUNT_TABLE), reqLv: +e.REQ_LV });
}
// Monster name -> levels and area level needed, for a list of encounters.
function monstersText(encounters) {
  const byName = new Map();
  for (const { group, reqLv } of encounters) {
    for (const m of membersOf(group)) {
      const name = nameOfBattleId(m.id);
      if (!byName.has(name)) byName.set(name, { lvs: [], reqLv });
      byName.get(name).lvs.push(m.lv);
      byName.get(name).reqLv = Math.min(byName.get(name).reqLv, reqLv);
    }
  }
  return [...byName]
    .map(([name, { lvs, reqLv }]) => `${name} Lv ${range(lvs)}${reqLv ? ` (area Lv ${reqLv}+)` : ''}`)
    .join(', ');
}
// Battle character id -> areas where it appears, with its levels there.
const habitat = new Map();
for (const g of groups.values()) {
  const a = areaByPrefix.get(g.AREA_TAG.slice(0, 4));
  if (!a) continue;
  for (const m of membersOf(g)) {
    if (!habitat.has(m.id)) habitat.set(m.id, new Map());
    const byArea = habitat.get(m.id);
    if (!byArea.has(a.name)) byArea.set(a.name, []);
    byArea.get(a.name).push(m.lv);
  }
}

// --- Recipes -------------------------------------------------------------------------------

const recipes = parse('recipe/recipe.xml').filter((r) => !isPlaceholder(t(r.RECIPE_NAME_LABEL_ID)) && itemById.has(r.ITEM_COMPLETION_ID));
const recipeCollections = parse('recipe/recipe_collection.xml');
const researchByCollection = new Map();
const prizeToCollection = new Map(parse('study/stdy_prize.xml').map((p) => [p.STDY_PRIZE_ID, p.STDY_PRIZE_RECIPE_COLLECTION]));
for (const r of parse('study/stdy_research.xml')) {
  const coll = prizeToCollection.get(r.STDY_PRIZE_TAG);
  if (coll && coll !== 'RECIPE_COLLECTION_INVALID') researchByCollection.set(coll, r);
}
const researchName = new Map(parse('study/stdy_research.xml').map((r) => [r.STDY_RES_ID, t(r.STDY_RES_NAME_LABEL_ID)]));
const researchCond = new Map(parse('study/stdy_conditions.xml').map((c) => [c.STDY_COND_ID, c]));
const district = new Map(parse('commercial_district/commercial_district.xml').map((d) => [d.COMMERCIAL_DISTRICT_ID, t(d.COMMERCIAL_DISTRICT_LABEL_ID)]));
function researchPrereqs(res) {
  const c = researchCond.get(res.STDY_RES_COND_TAG);
  if (!c) return '';
  const parts = [0, 1, 2, 3].map((n) => c[`STDY_COND_RES_TAG_0${n}`]).filter((r) => r !== 'STDY_RES_INVALID').map((r) => researchName.get(r) || r);
  if (c.STDY_COMMERCIAL_DISTRICT_ID !== 'COMMERCIAL_DISTRICT_INVALID') parts.push(`District: ${district.get(c.STDY_COMMERCIAL_DISTRICT_ID)}`);
  return parts.join(', ');
}
const setName = (c) => (isPlaceholder(t(c.RECIPE_COLLECTION_NAME_LABEL_ID)) ? '' : t(c.RECIPE_COLLECTION_NAME_LABEL_ID));
const unlock = new Map();
const setsTaughtBy = new Map();
for (const c of recipeCollections) {
  const res = researchByCollection.get(c.RECIPE_COLLECTION_ID);
  const teacher = characterName.get(c.CHARACTER_ID) || '';
  const info = {
    set: setName(c),
    teacher,
    friendship: teacher ? +c.RECIPE_COLLECTION_COMPANION_NUM : '',
    research: res ? t(res.STDY_RES_NAME_LABEL_ID) : '',
    researcher: res ? characterName.get(res.STDY_RES_CHARACTER_TAG_00) || '' : '',
    prereqs: res ? researchPrereqs(res) : '',
    event: eventLabel(c.RECIPE_RCONDITION_EVENT),
  };
  if (teacher && info.set) {
    if (!setsTaughtBy.has(c.CHARACTER_ID)) setsTaughtBy.set(c.CHARACTER_ID, []);
    setsTaughtBy.get(c.CHARACTER_ID).push(`${info.set} (FRD ${info.friendship})`);
  }
  for (let n = 1; n <= 4; n++) {
    const id = c[`RECIPE_COLLECTION_RECIPE${n}_ID`];
    if (id !== 'RECIPE_INVALID' && !unlock.has(id)) unlock.set(id, info);
  }
}

const materialsOf = (r) =>
  [1, 2, 3, 4]
    .map((n) => ({ id: r[`ITEM_MATERIAL${n}_ID`], num: +r[`ITEM_MATERIAL${n}_NUM`] }))
    .filter((m) => m.id !== 'ITEM_INVALID');

// Recipe economics use the selling price of each item. Elements have no price, so they cost 0.
// Every recipe gives 1 item, so the output value is the price of the result.
const priceOf = (id) => +(itemById.get(id)?.ITEM_SELLING_PRICE || 0);
const inputCost = (r) => round(materialsOf(r).reduce((sum, m) => sum + priceOf(m.id) * m.num, 0));
// Blank when the result has no price (construction and battle items): the item is not sold.
const addedValue = (r) => (priceOf(r.ITEM_COMPLETION_ID) > 0 ? round(priceOf(r.ITEM_COMPLETION_ID) - inputCost(r)) : '');
const unpricedInputs = (r) => materialsOf(r).filter((m) => priceOf(m.id) === 0 && itemById.get(m.id)?.ITEM_CATEGORY_ID !== '5');

// --- Sheets --------------------------------------------------------------------------------

// A column is [header, width, getter]. The getter of an ICON column returns the PNG file name
// of the icon in output/icons/. See "Icons" in README.md to show the pictures in Google Sheets.
const ICON = 'Icon';
const iconColumn = (get) => [ICON, 9, get];

const itemColumns = [
  iconColumn((i) => icons.ref('item', +i.ITEM_IMAGE_NUM)),
  ['Name', 28, (i) => t(i.ITEM_NAME_LABEL_ID)],
  ['Name (JP)', 18, (i) => jp[i.ITEM_NAME_LABEL_ID] || ''],
  ['Category', 14, categoryOf],
  ['Sub-category', 18, subCategoryOf],
  ['Rank', 7, (i) => +i.ITEM_RANK],
  ['Price', 9, (i) => +i.ITEM_SELLING_PRICE],
  ['Base Sales', 9, (i) => +i.ITEM_BASIC_SALES_NUM],
  ['Sold In', 26, (i) => SHOPS.filter(([k]) => i[k] === '1').map(([, n]) => n).join(', ')],
  // ITEM_DI_ACQ_*ELEMENT: elements that the Reduce command gives for 1 of the item.
  ...ELEMENTS.map((e) => [`Reduce: ${e}`, 8, (i) => +i[`ITEM_DI_ACQ_${e.toUpperCase()}ELEMENT`]]),
  ['Growing Area', 16, (i) => (i.FARM_ID === '-1' ? '' : farm.get(i.FARM_ID) || `Farm ${i.FARM_ID}`)],
  ['Base Yield', 8, (i) => (i.FARM_ID === '-1' ? '' : +i.ITEM_BASIC_CULTIVATION_NUM)],
  ['Gathered At', 60, (i) => (gather.get(i.ITEM_ID)?.texts || []).join('; ')],
  ['First Gather Task', 9, (i) => (gather.has(i.ITEM_ID) ? gather.get(i.ITEM_ID).task : '')],
  ['Dropped By', 30, (i) => (droppedBy.get(i.ITEM_ID) || []).join(', ')],
  ['Description', 80, (i) => t(i.ITEM_DESCRIPTION_LABEL_ID)],
];

const resultOf = (r) => itemById.get(r.ITEM_COMPLETION_ID);
const recipeColumns = [
  iconColumn((r) => icons.ref('item', +resultOf(r).ITEM_IMAGE_NUM)),
  ['Item', 28, (r) => itemName(r.ITEM_COMPLETION_ID)],
  ['Category', 14, (r) => categoryOf(resultOf(r))],
  ['Sub-category', 18, (r) => subCategoryOf(resultOf(r))],
  ['Rank', 7, (r) => +resultOf(r).ITEM_RANK],
  ['Price', 9, (r) => priceOf(r.ITEM_COMPLETION_ID)],
  ['Synthesis Cost', 10, (r) => +r.ITEM_COMP_MH],
  ['Input Cost', 10, inputCost],
  ['Added Value', 10, addedValue],
  ['Added Value / Synth Cost', 12, (r) => (addedValue(r) !== '' && +r.ITEM_COMP_MH > 0 ? round(addedValue(r) / +r.ITEM_COMP_MH) : '')],
  ['Unpriced Inputs', 24, (r) => unpricedInputs(r).map((m) => itemName(m.id)).join(', ')],
  ...[1, 2, 3, 4].flatMap((n) => [
    [`Material ${n}`, 22, (r) => (r[`ITEM_MATERIAL${n}_ID`] === 'ITEM_INVALID' ? '' : itemName(r[`ITEM_MATERIAL${n}_ID`]))],
    [`Qty ${n}`, 6, (r) => (r[`ITEM_MATERIAL${n}_ID`] === 'ITEM_INVALID' ? '' : +r[`ITEM_MATERIAL${n}_NUM`])],
  ]),
  ['Recipe Set', 24, (r) => unlock.get(r.RECIPE_ID)?.set || ''],
  ['Taught By', 12, (r) => unlock.get(r.RECIPE_ID)?.teacher || ''],
  ['Friendship Lv', 9, (r) => unlock.get(r.RECIPE_ID)?.friendship ?? ''],
  ['Research', 26, (r) => unlock.get(r.RECIPE_ID)?.research || ''],
  ['Researcher', 12, (r) => unlock.get(r.RECIPE_ID)?.researcher || ''],
  ['Research Prereqs', 30, (r) => unlock.get(r.RECIPE_ID)?.prereqs || ''],
  ['Unlock Event', 36, (r) => unlock.get(r.RECIPE_ID)?.event || ''],
];

const zoneColumns = [
  ['Area', 20, (s) => s.area.name],
  ['Spot', 24, (s) => s.name],
  ['Route', 7, (s) => +s.expl_rootnumber],
  ['Opens', 34, (s) => (s.area.task_id ? `After ${taskLabel(s.area.task_id)}` : 'Start')],
  // diff_00..04: difficulty rank (S to F) at area level 1 to 5.
  ['Difficulty by Area Lv', 14, (s) => [0, 1, 2, 3, 4].map((n) => s.area[`diff_0${n}`].replace('EXPL_AREA_DIFFICULTY_', '')).join(' ')],
  [
    'Gather Items',
    70,
    (s) =>
      (collectBySpot.get(s.expl_research) || [])
        .sort((a, b) => b.RATE - a.RATE)
        .map((c) => `${itemName(c.ITEM_TAG)} (${c.RATE}%)`)
        .join(', '),
  ],
  ['Special Spot Items', 40, (s) => unique((uniqueByArea.get(s.area.expl_area) || []).map(itemName)).join(', ')],
  ['Monsters', 70, (s) => monstersText((encountersBySpot.get(s.expl_research) || []).filter((e) => !isBossGroup(e.group)))],
  ['Bosses', 30, (s) => monstersText((encountersBySpot.get(s.expl_research) || []).filter((e) => isBossGroup(e.group)))],
];

const statColumns = STATS.map(([field, label]) => [label, 6, (c) => baseStat(c, field)]);
const elementColumns = ELEMENTS.map((e, n) => [`${e} DEF`, 7, (c) => elementDef(c, n)]);

const monsterColumns = [
  iconColumn(characterIcon),
  ['Name', 22, (c) => characterName.get(c.CHARACTER_ID)],
  ['Name (JP)', 16, (c) => jp[c.CHARACTER_NAME_LABEL_ID] || ''],
  ['Type', 9, (c) => CHARACTER_TYPE[c.CHARACTER_CATEGORY_ID]],
  ['Rank', 6, (c) => +c.CHARACTER_RANK_ID],
  ['Wage', 7, (c) => +c.CHARACTER_SUBMONEY],
  ...statColumns,
  ['Growth / Lv', 40, growthText],
  ...elementColumns,
  ['EXP', 6, (c) => (battleOf(c) ? +battleOf(c).battle_exp : '')],
  ['Drops', 36, (c) => (battleOf(c) ? dropsOf(battleOf(c)).map((d) => `${itemName(d.id)} x${d.num} (${d.rate}%)`).join(', ') : '')],
  ['Found In', 40, (c) => [...(habitat.get(c.BTL_CHARACTER_ID) || [])].map(([area, lvs]) => `${area} (Lv ${range(lvs)})`).join(', ')],
  ['Description', 80, (c) => t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID)],
];

const characterColumns = [
  iconColumn(characterIcon),
  ['Name', 22, (c) => characterName.get(c.CHARACTER_ID)],
  ['Name (JP)', 16, (c) => jp[c.CHARACTER_NAME_LABEL_ID] || ''],
  ['Type', 11, (c) => CHARACTER_TYPE[c.CHARACTER_CATEGORY_ID] || `Category ${c.CHARACTER_CATEGORY_ID}`],
  ['Source Game', 36, (c) => product.get(c.PRODUCT_ID) || ''],
  ['Rank', 6, (c) => (c.CHARACTER_RANK_ID === '-1' ? '' : +c.CHARACTER_RANK_ID)],
  ['Aptitudes', 26, (c) => aptitudesOf(c, 'CHARACTER_PREPARATION_APTITUDE_ID')],
  // CHM is 1 for every character, and the element DEF values are the same for every character.
  ...statColumns.filter(([label]) => label !== 'CHM'),
  ['Growth / Lv', 40, growthText],
  ['Skills', 50, skillsText],
  ['Battle Role', 10, (c) => PLAY_TYPE[battleOf(c)?.BTL_PLAY_TYPE_ID] || ''],
  ['Friendship Start', 9, (c) => +c.CHARA_COMPANION_INITIAL],
  ['Friendship Max', 9, (c) => +c.CHARA_COMPANION_MAX],
  ['Join Event', 30, (c) => eventLabel(joinCondition.get(c.CHARACTER_APP_CON_ID)?.CHARACTER_APP_EVENT)],
  ['Join Population', 10, (c) => +(joinCondition.get(c.CHARACTER_APP_CON_ID)?.CHARACTER_APP_POPULATION ?? 0)],
  ['Join Turn', 7, (c) => +(joinCondition.get(c.CHARACTER_APP_CON_ID)?.CHARACTER_APP_CTURN ?? 0)],
  ['Recipe Sets Taught', 50, (c) => (setsTaughtBy.get(c.CHARACTER_ID) || []).join(', ')],
  ['Description', 80, (c) => t(c.CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID)],
];

/** Adds a sheet with a frozen header and name column, and a filter on all columns. */
function addSheet(wb, name, columns, rows) {
  const hasIcon = columns[0][0] === ICON;
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: hasIcon ? 2 : 1, ySplit: 1 }] });
  ws.columns = columns.map(([header, width]) => ({ header, width }));
  for (const row of rows) {
    const added = ws.addRow(columns.map(([, , get]) => get(row) ?? null));
    if (hasIcon) added.height = ICON_SIZE * 0.6;
  }
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  reportRedundantColumns(name, columns, rows);
  return ws;
}

/** Prints the columns that hold 1 value only, and the columns that duplicate another column. */
function reportRedundantColumns(sheet, columns, rows) {
  const values = columns.map(([, , get]) => rows.map((r) => JSON.stringify(get(r) ?? '')));
  columns.forEach(([header], i) => {
    if (header === ICON) return;
    if (rows.length > 1 && new Set(values[i]).size === 1) console.warn(`${sheet}: column "${header}" has 1 value only (${values[i][0]})`);
    const twin = values.findIndex((v, j) => j < i && columns[j][0] !== ICON && v.join('\n') === values[i].join('\n'));
    if (twin >= 0) console.warn(`${sheet}: column "${header}" is the same as "${columns[twin][0]}"`);
  });
}

async function main() {
  const wb = new ExcelJS.Workbook();
  const byName = (get) => (a, b) => get(a).localeCompare(get(b));
  const isMonster = (c) => MONSTER_TYPES.includes(c.CHARACTER_CATEGORY_ID);
  // Story NPCs with no face ("Old Man", "Young Woman") are generic roles, not named characters.
  const isGenericNpc = (c) => c.CHARACTER_CATEGORY_ID === '4' && !characterIcon(c);
  const sheets = [
    ['Items', itemColumns, [...items].sort(byName((i) => t(i.ITEM_NAME_LABEL_ID)))],
    ['Recipes', recipeColumns, [...recipes].sort(byName((r) => itemName(r.ITEM_COMPLETION_ID)))],
    ['Zones', zoneColumns, [...spotById.values()]],
    ['Monsters', monsterColumns, characters.filter(isMonster)],
    ['Characters', characterColumns, characters.filter((c) => !isMonster(c) && !isGenericNpc(c)).sort(byName((c) => characterName.get(c.CHARACTER_ID)))],
  ];
  for (const [name, columns, rows] of sheets) addSheet(wb, name, columns, rows);

  fs.mkdirSync(ICON_DIR, { recursive: true });
  for (const [name, png] of icons.images) fs.writeFileSync(path.join(ICON_DIR, name), png);
  await wb.xlsx.writeFile(OUT);
  console.log(sheets.map(([name, , rows]) => `${name}: ${rows.length}`).join(', ') + `, icons: ${icons.images.size}`);
  console.log(`wrote ${OUT} and ${ICON_DIR}`);
}

main();
