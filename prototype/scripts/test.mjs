// Interactive test in a real browser, with the DOM audit and the mechanical UI rules (see auditFn in lib.mjs).
// Usage: node test.mjs [width]. Without a width it runs at 360, 768, 1280 and 1920 and fails when 1 run fails.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch, newPage, settle, audit, pick, url } from './lib.mjs';

if (!process.argv[2]) {
  let bad = 0;
  for (const w of [360, 768, 1280, 1920]) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), String(w)], { stdio: 'inherit' });
    if (r.status !== 0) bad++;
  }
  console.log(bad ? `\nFAILED at ${bad} of 4 widths` : '\nALL 4 WIDTHS PASS');
  process.exit(bad ? 1 : 0);
}

const width = Number(process.argv[2]);
const browser = await launch();
const page = await newPage(browser, width);
let fails = 0, auditTotal = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };
const step = async (name, fn) => {
  console.log(`[${width}] ${name}`);
  const before = page.errs.length;
  try { await fn(); } catch (e) { ok(false, `exception: ${e.message.split('\n')[0]}`); }
  await settle(page);
  auditTotal += await audit(page, name);
  const errs = page.errs.slice(before);
  ok(errs.length === 0, `console clean${errs.length ? ': ' + errs.join(' | ') : ''}`);
};
const hash = () => page.evaluate(() => location.hash);
const modalTitle = () => page.locator('.modal .name').innerText().catch(() => null);
const P = await pick(page);
console.log(JSON.stringify(P));

const openItem = async (name) => {
  await page.locator('#q').fill(name);
  await page.locator('#grid .cell', { hasText: name }).first().click();
  await page.waitForSelector('.modal');
};
const closeEsc = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.modal')); };
const go = async (h) => { await page.goto(`${url}${h}`); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(50); };
/** Clicks a nav link, opening the menu first when the nav is collapsed. */
async function navTo(label) {
  if (width < 600) await page.locator('#menu').click();
  await page.locator('#nav a', { hasText: label }).click();
}

await step('home', async () => {
  await go('#/home');
  await page.waitForSelector('.home .card');
  ok((await page.locator('.home .card').count()) === 5, '5 category cards');
  ok((await page.locator('.nav img').count()) === 5, 'nav has 5 icons');
});

await step('items page loads', async () => {
  await go('#/items');
  await page.waitForSelector('#grid .cell');
  ok((await page.locator('#grid .cell').count()) === 296, '296 item cells');
  const shops = await page.evaluate(() => Object.keys({ GSTORE_SALE_FLAG: 1, ASHOP_SALE_FLAG: 1, GRSTORE_SALE_FLAG: 1, CSTORE_SALE_FLAG: 1, DRSTORE_SALE_FLAG: 1 }).filter((s) => window.DATA.items.some((i) => i.shops.includes(s))).length);
  ok(shops === 5, 'all 5 shops have items');
  ok((await page.locator('.toolbar .toggle img').count()) === 4 + shops + 1, `filters have icons (4 categories + ${shops} shops + craftable)`);
  ok((await page.locator('.toolbar [data-shop] img[src*="shop-"]').count()) === shops, 'shop toggles have the shop icons');
  ok(!/of \d+ items/.test(await page.locator('main').innerText()), 'no item count');
});

await step('toggle each filter group', async () => {
  const n0 = await page.locator('#grid .cell').count();
  await page.locator('[data-cat=Material]').click();
  const nMat = await page.locator('#grid .cell').count();
  ok(nMat < n0 && (await hash()).includes('cat=Material'), `Material filter: ${nMat} cells, url ${await hash()}`);
  await page.locator('[data-cat=Merchandise]').click();
  ok((await page.locator('#grid .cell').count()) > nMat, 'second category is OR');
  await page.locator('[data-shop=GSTORE_SALE_FLAG]').click();
  const nShop = await page.locator('#grid .cell').count();
  ok(nShop > 0 && nShop < n0, `shop AND category: ${nShop}`);
  await page.locator('[data-craft]').click();
  const nCraft = await page.locator('#grid .cell').count();
  ok(nCraft <= nShop && (await hash()).includes('craft=1'), `craftable AND rest: ${nCraft}`);
  ok(await page.locator('#reset').isVisible(), 'Clear filters is visible with filters');
  await page.locator('#reset').click();
  ok((await page.locator('#grid .cell').count()) === n0 && (await hash()) === '#/items', 'clear filters');
  ok(!(await page.locator('#reset').isVisible()), 'Clear filters is hidden without filters');
  await page.locator('[data-craft]').click();
  await page.locator('[data-craft]').click();
});

await step('search, empty state, clear', async () => {
  await page.locator('#q').fill('uni');
  const n = await page.locator('#grid .cell').count();
  ok(n > 0 && n < 296, `search "uni": ${n}`);
  await page.locator('#q').fill('zzzzqq');
  ok((await page.locator('.empty').count()) === 1, 'empty state shows');
  await page.locator('#reset').click();
  ok((await page.locator('#grid .cell').count()) === 296 && (await page.locator('#q').inputValue()) === '', 'clear from empty state');
  const jp = await page.evaluate(() => window.DATA.items.find((i) => i.n === 'Uni').jp);
  await page.locator('#q').fill(jp);
  ok((await page.locator('#grid .cell').count()) > 0, 'japanese search');
  await page.locator('#q').fill('');
});

for (const [k, label] of [['gather', 'material with gather spots'], ['drop', 'monster drop item'], ['shop', 'shop item'], ['farm', 'farm item'], ['craftPriced', 'craftable with price'], ['craftNoPrice', 'craftable without price'], ['unpriced', 'craftable with unpriced materials'], ['rare', 'rare find item'], ['longName', 'longest name']]) {
  await step(`item modal: ${label} (${P[k]?.n})`, async () => {
    await openItem(P[k].n);
    ok((await hash()).startsWith(`#/items/${P[k].id}`), `url ${await hash()}`);
    ok((await modalTitle()) === P[k].n, 'title');
    const t = await page.locator('.modal-body').innerText();
    const synT = (await page.locator('.modal .syn').count()) ? await page.locator('.modal .syn').innerText() : '';
    const topT = await page.locator('.modal .top').innerText();
    const howT = (await page.locator('.modal .bar', { hasText: 'How to get' }).count()) ? await page.evaluate(() => { let s = ''; let n = [...document.querySelectorAll('.modal .bar')].find((b) => /How to get/.test(b.textContent)).nextElementSibling; while (n && !n.classList.contains('bar')) { s += n.innerText + '\n'; n = n.nextElementSibling; } return s; }) : '';
    if (k === 'gather') ok(/GATHER/i.test(t) && /Used in/i.test(t), 'has Gather and Used in');
    if (k === 'gather') ok(!/opens after|open from the start/.test(howT), 'gather cards have no "opens after"');
    if (k === 'drop') ok(/Monster drops/i.test(t) && /\d per drop/.test(t), 'has Monster drops with "N per drop"');
    if (k === 'drop') ok((await page.locator('.modal a.mini[href^="#/monsters/"]').count()) > 0, 'drops are monster links');
    if (k === 'shop') ok(/sold at/i.test(topT) && (await page.locator('.modal .top .sold img').count()) > 0, 'top block has "Sold at" with shop icons');
    ok(!/Shops|Medicine Shop|General Store|Grocery Store|Clothing Store|Weapon\/Armor Shop/.test(howT), 'no shop in How to get');
    if (k === 'farm') ok(/Farm/.test(t) && !/Grown in/.test(t), 'has Farm group');
    if (k.startsWith('craft') || k === 'unpriced') ok(/Synthesis cost/i.test(t) && /\d needed/.test(synT) && !/\bx\d/i.test(synT), 'synthesis block: "N needed", no "x3"');
    if (k === 'craftNoPrice') ok(!/Selling price/i.test(synT) && /Material cost/i.test(synT), 'no selling price: only the material cost row shows');
    if (k === 'drop') ok((await page.locator('.modal .mini small').allInnerTexts()).every((s) => /^\d[\d,]* per drop · \d+(\.\d)?%$/.test(s)), 'drop tiles have 1 value line "N per drop · N%"');
    if (k === 'rare') ok(/(Treasure|Bug Net|Digging|Fishing)/.test(t), 'rare group');
    if (k === 'craftPriced') ok((await page.locator('.modal .syn .cost img[src$="cost.png"]').count()) >= 2 && (await page.locator('.modal .syn .money img[src$="coin.png"]').count()) >= 3, 'synthesis cost and money have their icons');
    ok((await page.locator('.modal .top').innerText()).match(/Reduces into|Material|Merchandise|Battle|Construction/) !== null, 'top has category');
  });
  await closeEsc();
}

await step('modal: link inside, Back, Esc', async () => {
  await page.locator('#q').fill('');
  await openItem(P.craftPriced.n);
  const t0 = await modalTitle();
  const h0 = await hash();
  await page.locator('.modal .syn a.mini').first().click();
  await page.waitForFunction((t) => document.querySelector('.modal .name').textContent !== t, t0);
  const t1 = await modalTitle();
  ok(t1 !== t0 && (await hash()) !== h0, `link replaced content: ${t0} -> ${t1}`);
  await page.goBack();
  await page.waitForFunction((t) => document.querySelector('.modal .name')?.textContent === t, t0);
  ok((await modalTitle()) === t0, 'Back shows the previous item');
  await page.locator('.modal [data-close]').click();
  ok((await page.locator('.modal').count()) === 0, 'close button closes');
  await openItem(P.craftPriced.n);
  await page.keyboard.press('Escape');
  ok((await page.locator('.modal').count()) === 0, 'Esc closes');
  ok((await page.evaluate(() => document.activeElement?.className)).includes('cell'), 'focus returns to the icon');
  await openItem(P.gather.n);
  if (width >= 600) {
    await page.locator('.overlay').click({ position: { x: 3, y: 3 } });
    ok((await page.locator('.modal').count()) === 0, 'click outside closes');
  } else {
    await page.locator('.modal [data-close]').click();
    ok((await page.locator('.modal').count()) === 0, 'narrow: the modal is a full sheet, the close button closes');
  }
  await page.goBack().catch(() => {});
});

await step('back button closes the modal', async () => {
  await go('#/items');
  await page.locator('#q').fill('');
  await page.locator('#grid .cell').nth(3).click();
  await page.waitForSelector('.modal');
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('.modal'));
  ok((await page.locator('.modal').count()) === 0, 'Back closes');
});

await step('areas page', async () => {
  await navTo('Areas');
  await page.waitForSelector('.zone');
  ok((await page.locator('.zone').count()) === 8, '8 zones');
  const names = await page.locator('a.area').allInnerTexts();
  ok(names.includes('Life Spring') && names.includes('Life Spring: Interior'), 'Life Spring and its Interior are 2 areas');
  ok(names.some((n) => /^Bestial /.test(n)) && names.some((n) => /^Bountiful /.test(n)), 'Bestial and Bountiful spots are listed');
  ok(!names.includes('Main'), 'no "Main" area name');
});
await step('area modal: interior', async () => {
  await page.locator('a.area', { hasText: /^Life Spring: Interior$/ }).click();
  await page.waitForSelector('.modal');
  ok((await modalTitle()) === 'Life Spring: Interior', 'title is the interior');
  const t = await page.locator('.modal-body').innerText();
  ok(/Gather/.test(t) && /Monsters/.test(t), 'gather and monsters');
  ok(/Treasure/.test(t) && /Bug Net/.test(t), 'rare groups with the game terms');
  ok(/Area element/i.test(t) && !/Element rating|\dx\b/.test(t), 'the area element shows, the global rating table does not');
  ok((await page.locator('.modal .elm img').count()) >= 1, 'the area elements have their icons');
  const crumb = await page.locator('.modal .crumb').innerText();
  ok(/ZONE/i.test(crumb) && /OPENS/i.test(crumb) && /From the start|After task \d+/.test(crumb), `header has labelled Zone and Opens: ${crumb.replace(/\n/g, ' | ')}`);
  ok((await page.locator('.modal .crumb a.tl').count()) === 1, 'the zone is a link');
});
await closeEsc();
await step('area modal: outside area', async () => {
  await page.locator('a.area', { hasText: /^Life Spring$/ }).click();
  await page.waitForSelector('.modal');
  ok((await modalTitle()) === 'Life Spring', 'title is the outside area');
  await page.locator('.modal .crumb a').click();
  await page.waitForFunction(() => document.querySelector('.modal .name')?.textContent === 'Harvest Spring');
  ok((await page.locator('.modal .link').count()) >= 7, 'zone modal lists its areas');
  await page.locator('.modal .link', { hasText: 'Life Spring: Interior' }).click();
  await page.waitForFunction(() => document.querySelector('.modal .name')?.textContent === 'Life Spring: Interior');
  await page.locator('.modal a.mini').first().click();
  await page.waitForFunction(() => /#\/(items|monsters)\//.test(location.hash));
  ok((await page.locator('.modal .top').count()) === 1, 'link from area to item or monster opens it');
});
await closeEsc();

await step('Bestial spot: monsters only', async () => {
  await go(`#/areas/${P.bestial.id}`);
  await page.waitForSelector('.modal');
  ok(/^Bestial /.test(await modalTitle()), `title ${await modalTitle()}`);
  ok((await page.locator('.modal a.mini[href^="#/monsters/"]').count()) > 0, 'has monster tiles');
  ok((await page.locator('.modal .grp .gh b', { hasText: /^Gather$/ }).count()) === 0, 'no Gather group');
  ok((await page.locator('.modal a.mini[href^="#/items/"]').count()) === (await page.locator('.modal .grp:has(.gh b:text-matches("Treasure|Bug Net|Digging|Fishing")) a.mini').count()), 'no gather items (only the rare finds of the zone)');
});
await closeEsc();
await step('Bountiful spot: gather only', async () => {
  await go(`#/areas/${P.bountiful.id}`);
  await page.waitForSelector('.modal');
  ok(/^Bountiful /.test(await modalTitle()), `title ${await modalTitle()}`);
  ok((await page.locator('.modal .grp .gh b', { hasText: /^Gather$/ }).count()) === 1, 'has the Gather group');
  ok((await page.locator('.modal a.mini[href^="#/monsters/"]').count()) === 0, 'no monster tiles');
});
await closeEsc();
await step('no dangling links', async () => {
  const bad = await page.evaluate(() => {
    const D = window.DATA;
    const spots = new Set(D.zones.flatMap((z) => z.areas.map((a) => a.id)));
    const out = [];
    for (const i of D.items) for (const g of i.gather) if (!spots.has(g.spot)) out.push(`${i.n} -> ${g.spot}`);
    for (const z of D.zones) for (const a of z.areas) {
      for (const m of a.mons) if (!D.monsters[m.m]) out.push(`${a.n} -> monster ${m.m}`);
      if (/^Bountiful /.test(a.n) && a.mons.length) out.push(`${a.n} has monsters`);
      if (/^Bestial /.test(a.n) && a.gather.length) out.push(`${a.n} has gather items`);
      if (!a.mons.length && !a.gather.length) out.push(`${a.n} is empty`);
    }
    return out;
  });
  ok(bad.length === 0, `no dangling or empty spots${bad.length ? ': ' + bad.slice(0, 4).join('; ') : ''}`);
});

await step('monsters page and modal', async () => {
  await navTo('Monsters');
  await page.waitForSelector('#grid .cell');
  const n = await page.locator('#grid .cell').count();
  ok(n === (await page.evaluate(() => Object.keys(window.DATA.monsters).length)), `${n} monster cells`);
  await page.locator('[data-mk=boss]').click();
  const nb = await page.locator('#grid .cell').count();
  ok(nb > 0 && nb < n, `boss filter: ${nb}`);
  await page.locator('[data-mk=""]').click();
  await go(`#/monsters/${P.monster.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  ok(/Drops/.test(t) && /\d per drop/.test(t) && /Found in/.test(t) && /Lv \d+/.test(t), 'drops "N per drop" and areas with "Lv N"');
  ok(/Rank \d+/.test(t), 'rank');
});
await closeEsc();
await step('monster with element DEF', async () => {
  await go(`#/monsters/${P.monDef.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  const want = await page.evaluate((id) => window.DATA.monsters[id].def.filter((v) => v).map(String), P.monDef.id);
  ok(/Element DEF/i.test(t) && (await page.locator('.modal .elm img').count()) === want.length, `element DEF with an icon for each of the ${want.length} elements`);
  const vals = await page.locator('.modal .elm small').allInnerTexts();
  ok(vals.join(',') === want.join(','), `DEF values ${vals.join(',')}`);
});
await closeEsc();

await step('characters page and modal', async () => {
  await navTo('Characters');
  await page.waitForSelector('#grid .cell');
  const n = await page.locator('#grid .cell').count();
  await page.locator('[data-ck=Alchemist]').click();
  const na = await page.locator('#grid .cell').count();
  ok(na > 0 && na < n, `type filter: ${na} of ${n}`);
  await page.locator('[data-ck=Alchemist]').click();
  await go(`#/characters/${P.character.id}`);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .top').count()) === 1, 'character modal');
  const names = await page.evaluate(() => window.DATA.chars.map((c) => c.n));
  ok(new Set(names).size === names.length, 'no 2 characters with the same name');
  ok((await page.locator('.modal .bar', { hasText: 'Research' }).count()) === 1 && (await page.locator('.modal a.mini[href^="#/research/"] img').count()) > 0, 'research cards have their icon');
});
await closeEsc();
await step('character with aptitudes, skills and join conditions', async () => {
  await go(`#/characters/${P.charFull.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  ok(/Aptitudes/i.test(t) && /Skills/i.test(t) && /Joins the town/i.test(t), 'aptitudes, skills and join sections');
  ok(/Lv \d+/.test(t) && /Town population/i.test(t) && /Turn \d+/.test(t) && /not confirmed/i.test(t), 'skill level, population, turn marked not confirmed');
});
await closeEsc();

const TREE_LABELS = { main: 'Main', attack: 'Attack', support: 'Town Building', emergency: 'Emergency' };
for (const tree of ['main', 'attack', 'support', 'emergency']) {
  await step(`research tree ${tree}`, async () => {
    await navTo('Research');
    await page.locator('.opts a', { hasText: new RegExp(`^${TREE_LABELS[tree]}$`) }).click();
    await page.waitForSelector('.node');
    ok((await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), 'page has no horizontal scroll');
    // The box fits the tree: its chrome (border and padding, 2 x 36 px) is all that is more than the tree.
    const fit = await page.evaluate(() => { const b = document.querySelector('.treebox').getBoundingClientRect(); const t = document.querySelector('.tree').getBoundingClientRect(); return { dh: b.height - t.height, dw: b.width - t.width, scrolls: document.querySelector('.treescroll').scrollWidth > document.querySelector('.treescroll').clientWidth }; });
    ok(fit.dh <= 76, `box height fits the tree (+${Math.round(fit.dh)} px)`);
    ok(fit.scrolls || fit.dw <= 76, `box width fits the tree (+${Math.round(fit.dw)} px), or the tree scrolls inside its box`);
    ok(!/Scroll sideways/.test(await page.locator('main').innerText()), 'no how-to text');
    const n = await page.locator('.node').count();
    ok(n > 3, `${n} nodes`);
    await page.locator('.node').nth(Math.min(2, n - 1)).click();
    await page.waitForSelector('.modal');
    ok((await page.locator('.modal .who').count()) === 1, 'research modal');
    auditTotal += await audit(page, `research node ${tree}`, true);
  });
  await closeEsc();
}
await step('research tab labels', async () => {
  await navTo('Research');
  const labels = await page.locator('.opts a.toggle').allInnerTexts();
  ok(labels.join(',') === 'Main,Attack,Town Building,Emergency', `tabs: ${labels.join(', ')}`);
  ok((await page.locator('.toolbar .cap').innerText()).toLowerCase() === 'tree', 'the filter label is "Tree"');
});

await step('research with a friendship requirement', async () => {
  await go(`#/research/${(await page.evaluate((id) => window.DATA.research[id].tree, P.resFriend.id))}/${P.resFriend.id}`);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .who .need .fr img[src$="fav-icon.png"]').count()) === 1, 'heart next to the researcher');
  const num = await page.locator('.modal .who .need .fr b').innerText();
  ok(num === String(await page.evaluate((id) => window.DATA.research[id].friendNeed, P.resFriend.id)), `heart number ${num}`);
  const t = await page.locator('.modal-body').innerText();
  ok(/TOTAL FRIENDSHIP/i.test(await page.locator('.modal .who .need').innerText()), 'label "Total friendship"');
  ok(/\d+ needed/.test(t) || !(await page.locator('.modal .minis').count()), 'materials show "N needed"');
  ok(/\d+ turns?/.test(t), 'duration as "N turns"');
});
await closeEsc();
await step('research with a condition', async () => {
  await go(`#/research/${(await page.evaluate((id) => window.DATA.research[id].tree, P.resCond.id))}/${P.resCond.id}`);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .conds .link').count()) >= 1, 'condition shown');
});
await closeEsc();

await step('nav menu (narrow)', async () => {
  if (width >= 600) { ok(true, 'skipped'); return; }
  await go('#/items');
  await page.locator('#menu').click();
  ok(await page.locator('#nav.open').count() === 1, 'menu opens');
  await page.locator('#nav a', { hasText: 'Items' }).click();
  ok(await page.locator('#nav.open').count() === 0, 'menu closes after a click');
});

// The test fails on any audit finding (the rules of the UI standard are part of the audit).
if (auditTotal > 0) { fails++; console.log(`  FAIL ${auditTotal} audit findings`); }
console.log(`\n[${width}] RESULT: ${fails} failures, ${auditTotal} audit findings`);
await browser.close();
process.exit(fails ? 1 : 0);
