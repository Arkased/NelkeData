// Fills the data gaps of prototype/data.js with the values of data/*.json (issue 25). It can run again: the result does not change.
// It keeps each other value of data.js (the display rules are in it): it adds only
//  - syn.lv, the synthesis level of a craftable item: synthesisLevelOf(rank), the rule of README.md "Synthesis level";
//  - syn.cum, the cumulative synthesis cost: cumulativeSynthesisCost of the recipe in data/recipes.json (the model checks the recipe loops);
//  - zone.mons, the monsters that a zone meets itself (data/zones.json "encounters") and that live in no area (Master Puni).
// Usage: node fill-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataJs = path.resolve(here, '..', 'data.js');
const model = (name) => JSON.parse(fs.readFileSync(path.resolve(here, '..', '..', 'data', `${name}.json`), 'utf8'));

const { synthesisLevelOf } = await tsImport('../../packages/model/src/index.ts', import.meta.url);

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(dataJs, 'utf8'), sandbox);
const D = sandbox.window.DATA;

// Synthesis level.
const items = new Map(model('items').map((i) => [i.id, i]));
const recipes = new Map(model('recipes').map((r) => [r.id, r]));
for (const it of D.items) {
  if (!it.syn) continue;
  const m = items.get(it.id);
  const lv = synthesisLevelOf(m.rank);
  const recipeLv = recipes.get(m.recipeId)?.synthesisLevel;
  if (recipeLv !== lv) throw new Error(`${it.id}: rule ${lv}, recipe ${recipeLv}`);
  it.syn.lv = lv;
}

// Cumulative synthesis cost.
for (const it of D.items) if (it.syn) it.syn.cum = recipes.get(items.get(it.id).recipeId).cumulativeSynthesisCost;

// Monsters with no area: the zone that meets them.
const habitat = new Set(D.zones.flatMap((z) => z.areas.flatMap((a) => a.mons.map((x) => x.m))));
for (const z of model('zones')) {
  const target = D.zones.find((x) => x.id === z.id);
  const mons = z.encounters
    .filter((e) => D.monsters[e.monsterId] && !habitat.has(e.monsterId))
    .map((e) => ({ m: e.monsterId, lo: Math.min(...e.levels), hi: Math.max(...e.levels), lvs: [...new Set(e.levels)].sort((a, b) => a - b), req: 0, boss: e.boss }));
  if (mons.length) target.mons = mons;
  else delete target.mons;
}

fs.writeFileSync(dataJs, `window.DATA = ${JSON.stringify(D)};\n`);
console.log(`items ${D.items.length}, with syn.lv ${D.items.filter((i) => i.syn?.lv).length}, with syn.cum ${D.items.filter((i) => i.syn?.cum).length}, zones with mons ${D.zones.filter((z) => z.mons).length}`);
