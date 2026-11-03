// Interactive test in a real browser, with the DOM audit and the mechanical UI rules (see auditFn in lib.mjs).
// Usage: node test.mjs [widthsCsv]. Default 360,768,1280,1920. One browser, 1 context for each width, all widths at the same time.
// A width shares no state with another width. The run fails when 1 width fails.
import { fileURLToPath } from 'node:url';
import { launch, newPage, settle, audit, pick, url } from './lib.mjs';

const widths = (process.argv[2] || '360,768,1280,1920').split(',').map(Number);

/** Runs the whole test at 1 width in its own browser context. Returns { fails, text } with the buffered output. */
async function runWidth(browser, width) {
const lines = [];
const console = { log: (...a) => lines.push(a.join(' ')) };
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
  if (!(await page.locator('#grid .cell .nm').first().isVisible().catch(() => false)) || !/^#\/items(\?|$)/.test(await hash())) { await go('#/items'); await page.waitForSelector('#grid .cell'); }
  const exact = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  await page.locator('#grid .cell').filter({ has: page.locator('.nm', { hasText: exact }) }).first().click();
  await page.waitForSelector('.modal');
};
const closeEsc = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.modal')); };
const go = async (h) => { await page.goto(`${url}${h}`); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(50); };
/** Clicks a nav link, opening the menu first when the nav is collapsed. */
async function navTo(label) {
  if (width < 600) await page.locator('#menu').click();
  await page.locator('#nav a', { hasText: label }).click();
}

/** Below 600 px the filter groups are behind the "Filters" button: opens them. */
async function openFilters() {
  if (width >= 600) return;
  if ((await page.locator('#ftoggle').getAttribute('aria-expanded')) !== 'true') await page.locator('#ftoggle').click();
}

await step('root URL shows the Items page, no landing page', async () => {
  await page.goto(url);
  await page.waitForSelector('#grid .cell');
  ok((await page.locator('.home').count()) === 0, 'no home page');
  ok((await page.locator('#nav a[aria-current="page"]').allInnerTexts()).join() === 'Items', 'the Items nav button is active');
  ok((await page.locator('#grid .cell').count()) > 100 && (await hash()) === '#/items', `items grid at the root, hash ${await hash()}`);
  ok((await page.locator('.nav img').count()) === 5, 'nav has 5 icons');
});

await step('background covers the full page height', async () => {
  await go('#/areas');
  await page.waitForSelector('.zone');
  const r = await page.evaluate(() => { const h = document.documentElement.getBoundingClientRect().height; const bs = getComputedStyle(document.documentElement); return { h, inner: innerHeight, img: bs.backgroundImage, color: bs.backgroundColor }; });
  ok(r.img === 'none' && r.color !== 'rgba(0, 0, 0, 0)', `the page background is 1 flat color, no image (${r.color}; page ${Math.round(r.h)} px, viewport ${r.inner} px)`);
});
await step('no frame texture in the CSS, the markup or the inline styles', async () => {
  const fs = await import('node:fs');
  const dir = fileURLToPath(new URL('..', import.meta.url));
  const TEX = /bg-town|panel-(star|cream|tan|note|notebook|scroll|w01)|popup-crest|corner[-_a-z0-9]*\.png|\bplate-|\bbar-(brown|bronze)|\bbtn-(brown|cream|gold)|\btabw?-(on|off)|frame\.png|glow\.png|highlight\.png|border-image/;
  const FONT = /font-family:[^;}]*/g;
  for (const f of ['style.css', 'app.js', 'index.html']) {
    const hit = fs.readFileSync(dir + f, 'utf8').split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => TEX.test(l.replace(/\/\*.*?\*\//g, '')));
    ok(hit.length === 0, `${f} names no frame texture${hit.length ? ': line ' + hit.map((h) => h[0]).join(',') : ''}`);
  }
  // Typefaces: only Lora and Source Sans 3, from local files.
  const css = fs.readFileSync(dir + 'style.css', 'utf8');
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  ok(faces.length === 4 && faces.every((f) => /font-family:\s*"(Lora|Source Sans 3)"/.test(f)), `${faces.length} @font-face rules, all Lora or Source Sans 3`);
  const urls = [...css.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g)].map((m) => m[1]).filter((u) => /\.(woff2?|ttf|otf|eot|g1n|fnt)$/i.test(u) || /^(https?:)?\/\//.test(u));
  ok(urls.length === 4 && urls.every((u) => /^fonts\/[\w-]+\.woff2$/.test(u) && fs.existsSync(dir + u)), `font URLs are local files: ${urls.join(', ')}`);
  const fams = (css.match(FONT) || []).map((x) => x.replace('font-family:', '').trim());
  ok(fams.every((x) => /^(var\(--font(-head)?\)|inherit|"Lora"|"Source Sans 3")/.test(x) || x === '"Lora", serif' || x === '"Source Sans 3", sans-serif'), `font-family only Lora or Source Sans 3: ${fams.join(' | ')}`);
  ok(/--font:\s*"Source Sans 3", sans-serif;/.test(css) && /--font-head:\s*"Lora", serif;/.test(css), 'the body font is Source Sans 3, the heading font is Lora');
  const used = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '') + ' ' + f.weight); });
  ok(used.some((u) => u.startsWith('Lora')) && used.some((u) => u.startsWith('Source Sans 3')), `both fonts loaded: ${used.join(', ')}`);
  const inline = await page.evaluate(() => [...document.querySelectorAll('[style]')].map((e) => e.getAttribute('style')).filter((s) => /url\(/.test(s)));
  ok(inline.length === 0, 'no inline style loads an image');
});

if (width < 600) {
  await step('filters behind 1 button below 600 px', async () => {
    await go('#/items');
    await page.waitForSelector('#grid .cell');
    ok(await page.locator('#ftoggle').isVisible() && !(await page.locator('[data-shop]').first().isVisible()), 'Filters button shows and the groups are closed');
    const top = await page.evaluate(() => document.querySelector('.toolbar').getBoundingClientRect().height);
    ok(top < 160, `closed toolbar is small (${Math.round(top)} px)`);
    await go('#/items?cat=Material,Merchandise&craft=1');
    await page.waitForSelector('#grid .cell');
    ok((await page.locator('#ftoggle .badge').innerText()) === '3', 'badge shows 3 active filters');
    ok(!(await page.locator('[data-cat]').first().isVisible()), 'closed by default with filters in the URL');
    await page.locator('#ftoggle').click();
    ok(await page.locator('[data-cat]').first().isVisible(), 'the button opens the groups');
    ok((await hash()).includes('cat=Material%2CMerchandise') && (await hash()).includes('craft=1'), 'URL state is unchanged');
  });
} else {
  await step('filters are visible from 600 px', async () => {
    await go('#/items');
    await page.waitForSelector('#grid .cell');
    ok(!(await page.locator('#ftoggle').isVisible()) && (await page.locator('[data-shop]').first().isVisible()), 'no Filters button, groups visible');
  });
}

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
  await go('#/items');
  await page.waitForSelector('#grid .cell');
  await openFilters();
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

await step('empty state and its clear button', async () => {
  const pair = await page.evaluate(() => {
    const cats = [...new Set(window.DATA.items.map((i) => i.cat))];
    const shops = [...new Set(window.DATA.items.flatMap((i) => i.shops))];
    for (const c of cats) for (const s of shops) if (!window.DATA.items.some((i) => i.cat === c && i.shops.includes(s))) return [c, s];
    return null;
  });
  ok(!!pair, `a category and a shop with no common item: ${pair}`);
  await go(`#/items?cat=${pair[0]}&shop=${pair[1]}`);
  await page.waitForSelector('.empty');
  ok((await page.locator('.empty').innerText()).startsWith('Nothing matches the filters.'), 'empty state text');
  await page.locator('.empty [data-clear]').click();
  ok((await page.locator('#grid .cell').count()) === 296 && (await hash()) === '#/items', 'the empty-state button clears the filters');
  for (const h of ['#/items', '#/areas', '#/monsters', '#/characters']) {
    await go(h);
    ok((await page.locator('#q, input[type="search"], .search').count()) === 0, `no search box on ${h}`);
  }
  await go('#/areas');
  ok((await page.locator('.empty').count()) === 0, 'no empty state on Areas');
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
    if (k === 'drop') ok(/Monster drops/i.test(t) && !/per drop/.test(t), 'has Monster drops, with no "N per drop" text');
    if (k === 'drop') ok((await page.locator('.modal a.mini[href^="#/monsters/"]').count()) > 0, 'drops are monster links');
    if (k === 'shop') ok(/sold at/i.test(topT) && (await page.locator('.modal .top .sold img').count()) > 0, 'top block has "Sold at" with shop icons');
    ok(!/Shops|Medicine Shop|General Store|Grocery Store|Clothing Store|Weapon\/Armor Shop/.test(howT), 'no shop in How to get');
    if (k === 'farm') ok(/Farm/.test(t) && !/Grown in/.test(t), 'has Farm group');
    if (k.startsWith('craft') || k === 'unpriced') ok(/Synthesis cost/i.test(t) && !/\d needed/.test(synT) && !/\bx\d/i.test(synT), 'synthesis block: no "N needed", no "x3"');
    if (k.startsWith('craft') || k === 'unpriced') {
      const want = await page.evaluate((id) => window.DATA.items.find((i) => i.id === id).syn.mats.filter((m) => m.q >= 2).map((m) => '×' + m.q), P[k].id);
      const got = await page.locator('.modal .syn .mats .qty').allInnerTexts();
      ok(got.join(',') === want.join(','), `material badges ${got.join(',') || '(none)'} = the quantities of 2 or more`);
      ok((await page.locator('.modal .syn .mats .mini').count()) === (await page.evaluate((id) => window.DATA.items.find((i) => i.id === id).syn.mats.length, P[k].id)), 'the materials are 1 grid of tiles');
      const gaps = await page.evaluate(() => { const g = getComputedStyle(document.querySelector('.modal .syn-stats')); return [g.rowGap, g.columnGap]; });
      ok(gaps.every((g) => parseFloat(g) % 4 === 0), `synthesis stat gaps ${gaps.join(' / ')} on the 4 px scale`);
      ok(await page.evaluate(() => { const rs = {}; document.querySelectorAll('.modal .syn-stats .val').forEach((e) => { const t = Math.round(e.getBoundingClientRect().top / 2); const k = Math.round(e.closest('.stat').getBoundingClientRect().top / 2); (rs[k] ||= new Set()).add(t); }); return Object.values(rs).every((v) => v.size === 1); }), 'the stat values of a row share 1 baseline');
    }
    if (k === 'craftNoPrice') ok(!/Selling price/i.test(synT) && /Material cost/i.test(synT), 'no selling price: only the material cost row shows');
    if (k === 'drop') ok((await page.locator('.modal .mini .tbadge').count()) === 0 && (await page.locator('.modal .mini small').count()) === 0, 'drop tiles show no rate (each drop rate is 100%)');
    if (k === 'rare') ok(/(Treasure|Bug Net|Digging|Fishing)/.test(t), 'rare group');
    if (k === 'craftPriced') ok((await page.locator('.modal .syn img[src$="cost.png"]').count()) >= 2 && (await page.locator('.modal .syn .money img[src$="coin.png"]').count()) >= 3, 'synthesis cost and money have their icons');
    ok((await page.locator('.modal .top').innerText()).match(/Reduces into|Material|Merchandise|Battle|Construction/) !== null, 'top has category');
  });
  await closeEsc();
}

// The vertical scroll bar showing or going away must not move the header (scrollbar-gutter: stable on the root).
if (width === 1280) {
  await step('no layout shift: header x with all items, empty state, modal open', async () => {
    const xs = () => page.evaluate(() => ({ title: document.querySelector('.site-name').getBoundingClientRect().left, nav: document.querySelector('.nav a').getBoundingClientRect().left }));
    await go('#/items');
    await page.waitForSelector('#grid .cell');
    const all = await xs();
    const pair = await page.evaluate(() => {
      const cats = [...new Set(window.DATA.items.map((i) => i.cat))];
      const shops = [...new Set(window.DATA.items.flatMap((i) => i.shops))];
      for (const c of cats) for (const s of shops) if (!window.DATA.items.some((i) => i.cat === c && i.shops.includes(s))) return [c, s];
    });
    await go(`#/items?cat=${pair[0]}&shop=${pair[1]}`);
    await page.waitForSelector('.empty');
    const empty = await xs();
    await go('#/items');
    await page.waitForSelector('#grid .cell');
    await openItem(P.craftPriced.n);
    const modal = await xs();
    console.log(`  header x (title, nav link): all items ${all.title}, ${all.nav}; empty ${empty.title}, ${empty.nav}; modal ${modal.title}, ${modal.nav}`);
    ok(all.title === empty.title && empty.title === modal.title && all.nav === empty.nav && empty.nav === modal.nav, 'the header x is equal in the 3 states');
    await closeEsc();
  });
}

await step('modal: link inside, Back, Esc', async () => {
  await go('#/items');
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
  ok((await page.locator('.modal .panel').count()) === 1 && (await page.locator('.modal .panel .grp').count()) >= 2 && (await page.locator('.modal > .modal-body > .grp').count()) === 0, 'the area is 1 panel with its parts inside (no floating section)');
  if (width >= 1200) {
    const pos = await page.evaluate(() => { const g = [...document.querySelectorAll('.modal .panel-cols')[0].children].map((c) => c.getBoundingClientRect()); const m = document.querySelector('.modal-body').getBoundingClientRect(); return { n: g.length, sameTop: g.length < 2 || Math.abs(g[0].top - g[1].top) < 2, w: g.reduce((a, r) => a + r.width, 0) / m.width }; });
    ok(pos.n === 2 && pos.sameTop && pos.w > 0.8, `gather and monsters side by side, ${Math.round(pos.w * 100)}% of the width`);
  }
  ok(/Treasure/.test(t) && /Bug Net/.test(t), 'rare groups with the game terms');
  ok(/Area element/i.test(t) && !/Element rating|\dx\b/.test(t), 'the area element shows, the global rating table does not');
  ok((await page.locator('.modal .panel-head .el img').count()) >= 1, 'the area elements have their icons, in the head line of the panel');
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
  ok((await page.locator('.modal .panel').count()) === 1 && (await page.locator('.modal > .modal-body > .grp').count()) === 0, 'the zone is 1 panel (areas and treasure inside)');
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
  // The rank is not shown, so 2 monsters (the 2 "Beast") share a name; they differ by the icon.
  ok(await page.evaluate(() => { const m = Object.values(window.DATA.monsters).map((x) => `${x.n}|${x.icon}`); return new Set(m).size === m.length; }), 'no 2 monsters with the same name and the same icon');
  await openFilters();
  await page.locator('[data-mk=boss]').click();
  const nb = await page.locator('#grid .cell').count();
  ok(nb > 0 && nb < n, `boss filter: ${nb}`);
  await page.locator('[data-mk=""]').click();
  await go(`#/monsters/${P.monster.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  ok(/Drops/.test(t) && !/per drop/.test(t) && /Found in/.test(t) && /Lv \d+/.test(t), 'drops with a rate and areas with "Lv N"');
  ok(!/Rank/.test(t), 'no rank');
});
await closeEsc();
await step('monster with element DEF', async () => {
  await go(`#/monsters/${P.monDef.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  const want = await page.evaluate((id) => window.DATA.monsters[id].def.filter((v) => v).map(String), P.monDef.id);
  const all = await page.evaluate((id) => window.DATA.monsters[id].def.map(String), P.monDef.id);
  ok(/Element DEF/i.test(await page.locator('.modal .top').innerText()) && !(await page.locator('.modal .bar', { hasText: 'Element DEF' }).count()), 'element DEF is in the top block, not a section');
  ok((await page.locator('.modal .top .el img').count()) === 4, 'the DEF line has the 4 element icons');
  const vals = await page.locator('.modal .top .el b').allInnerTexts();
  ok(vals.join(',') === all.join(','), `DEF values ${vals.join(',')}`);
  const ys = await page.evaluate(() => [...document.querySelectorAll('.modal .top .el')].map((e) => Math.round(e.getBoundingClientRect().top)));
  ok(width < 600 || new Set(ys).size === 1, 'the DEF line is 1 row (from 600 px)');
  void want;
});
await closeEsc();

await step('characters page and modal', async () => {
  await navTo('Characters');
  await page.waitForSelector('#grid .cell');
  const n = await page.locator('#grid .cell').count();
  await openFilters();
  await page.locator('[data-cg=Alchemist]').click();
  const na = await page.locator('#grid .cell').count();
  ok(na === 22, `Alchemist filter: ${na} of ${n}`);
  await page.locator('[data-cg=Alchemist]').click();
  await page.locator('[data-cg=Townsfolk]').click();
  ok((await page.locator('#grid .cell').count()) === n - na, `Townsfolk filter: ${n - na} (every character that is not an Alchemist)`);
  await page.locator('[data-cg=Townsfolk]').click();
  ok((await page.locator('.toolbar .dd, .toolbar [data-ck]').count()) === 0 && !(await page.locator('.toolbar').innerText()).includes('Game'), 'no Game filter');
  ok(await page.evaluate(() => window.DATA.chars.filter((c) => ['Nelke', 'Misty', 'Knoss', 'Lotos'].includes(c.n)).length === 4), 'Nelke, Misty, Knoss and Lotos are in the data');
  await page.locator('[data-cg=Townsfolk]').click();
  ok((await page.locator('#grid .cell', { hasText: /^Nelke$/ }).count()) === 1, 'Townsfolk filter includes Nelke');
  ok(/group=Townsfolk/.test(await hash()) && !/game=/.test(await hash()), `URL has group, no game: ${await hash()}`);
  await page.locator('[data-cg=Townsfolk]').click();
  await go('#/characters');
  await page.waitForSelector('#grid .cell');
  ok((await page.locator('.toolbar [data-cg]').allInnerTexts()).every((x) => !/^(Story|Fairy|Main)$/.test(x.trim())), 'no Story, Fairy or Main filter');
  const dat = await page.evaluate(() => { const D = window.DATA; const ids = new Set(D.chars.map((c) => c.nr)); const t = D.items.find((i) => i.syn && i.syn.unlock && i.syn.unlock.teacher && !ids.has(i.syn.unlock.teacher)); return { names: D.chars.map((c) => c.n), ids: D.chars.map((c) => c.id), taught: t ? t.id : '' }; });
  for (const nm of ['Fairy', 'Boss', 'Weapon Shopkeeper', 'Uryu', 'Lise', 'Annie', 'Lina', 'Veola', 'Arlin', 'Fee']) ok(!dat.names.includes(nm), `${nm} does not join: not in the list`);
  ok(!dat.ids.includes('CHARACTER_HAGEL_A3') && !dat.ids.includes('CHARACTER_HAGEL_A1'), 'no Gerhard variant');
  ok(dat.ids.length === 130, `${dat.ids.length} characters that join`);
  if (dat.taught) {
    await go(`#/items/${dat.taught}`);
    await page.waitForSelector('.modal');
    ok((await page.locator('.modal a[href^="#/characters/"]').count()) === 0, 'a teacher that does not join is plain text, not a link');
    await closeEsc();
  }
  await go(`#/characters/${P.character.id}`);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .top').count()) === 1, 'character modal');
  const names = await page.evaluate(() => window.DATA.chars.map((c) => c.n));
  ok(new Set(names).size === names.length, 'no 2 characters with the same name');
  ok((await page.locator('.modal .bar', { hasText: 'Research' }).count()) === 1 && (await page.locator('.modal a.mini[href^="#/research/"]').count()) > 0 && (await page.locator('.modal a.rcard').count()) === 0, 'research tiles show the icon of the output');
});
await closeEsc();
await step('character with aptitudes, skills and join conditions', async () => {
  await go(`#/characters/${P.charFull.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  ok(!/Aptitudes/i.test(t) && /Skills/i.test(t) && /Joins the town/i.test(t), 'no aptitudes; skills and join sections');
  ok(/Lv \d+/.test(t) && /Town population/i.test(t) && !/Turn [01]\b/.test(t) && !/population 0\b/i.test(t), 'skill level, population; no turn of 0 or 1');
  ok(/Learned at an event/i.test(t) && !/\b[A-Z][A-Z0-9]+(_[A-Z0-9]+)+\b/.test(t), 'event skill reads "Learned at an event", no internal id');
  const teach = await page.evaluate(() => [...document.querySelectorAll('.modal .bar')].filter((b) => /^Teaches/.test(b.textContent)).length);
  ok(teach <= 1, `at most 1 Teaches section (${teach})`);
});
await closeEsc();

const TREE_LABELS = { main: 'Main', attack: 'Attack', support: 'Town Building', emergency: 'Emergency' };
for (const tree of ['main', 'attack', 'support', 'emergency']) {
  await step(`research tree ${tree}`, async () => {
    await navTo('Research');
    await page.locator('.opts a', { hasText: new RegExp(`^${TREE_LABELS[tree]}$`) }).click();
    await page.waitForSelector('.node');
    ok((await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), 'page has no horizontal scroll');
    // The box has the full width of the content column; the tree scrolls inside it when it is wider.
    const fit = await page.evaluate(() => { const b = document.querySelector('.treebox').getBoundingClientRect(); const t = document.querySelector('.tree').getBoundingClientRect(); return { dh: b.height - t.height, dw: b.width - t.width, scrolls: document.querySelector('.treescroll').scrollWidth > document.querySelector('.treescroll').clientWidth }; });
    ok(fit.dh <= 76, `box height fits the tree (+${Math.round(fit.dh)} px)`);
    ok(fit.scrolls || fit.dw >= 0, `box is at least as wide as the tree, or the tree scrolls inside its box (+${Math.round(fit.dw)} px)`);
    ok(!/Scroll sideways/.test(await page.locator('main').innerText()), 'no how-to text');
    const n = await page.locator('.node').count();
    ok(n > 3 || tree === 'emergency', `${n} nodes`);
    // The drawn lines are exactly the prerequisites of the nodes of the tree (stdy_conditions.xml): no extra line, no missing line.
    const drawn = await page.evaluate(() => [...document.querySelectorAll('.tree svg path[data-from]')].map((p) => `${p.dataset.from}>${p.dataset.to}`).sort());
    const want = await page.evaluate((tk) => {
      const D = window.DATA;
      const ids = new Set(D.trees[tk].res.flat().filter((id) => id && D.research[id]));
      return [...ids].flatMap((id) => D.research[id].pre.map((p) => `${p}>${id}`)).sort();
    }, tree);
    ok(drawn.join() === want.join(), `${drawn.length} lines = ${want.length} prerequisites${drawn.join() === want.join() ? '' : ': extra ' + drawn.filter((d) => !want.includes(d)).join(' ') + ' missing ' + want.filter((d) => !drawn.includes(d)).join(' ')}`);
    // Each line leaves the right side of the prerequisite icon and enters the left side of the research, in orthogonal segments.
    const geo = await page.evaluate(() => {
      const bad = [];
      const sv = document.querySelector('.tree svg').getBoundingClientRect();
      for (const p of document.querySelectorAll('.tree svg path[data-from]')) {
        const f = document.querySelector(`.node[href$="/${p.dataset.from}"] .slot`)?.getBoundingClientRect();
        const t = document.querySelector(`.node[href$="/${p.dataset.to}"] .slot`)?.getBoundingClientRect();
        const a = p.getPointAtLength(0), b = p.getPointAtLength(p.getTotalLength());
        if (!f || !t) { bad.push(`no node for ${p.dataset.from}>${p.dataset.to}`); continue; }
        if (Math.abs(sv.left + a.x - f.right) > 2 || Math.abs(sv.top + a.y - (f.top + f.height / 2)) > 2) bad.push(`start of ${p.dataset.from}>${p.dataset.to}`);
        if (Math.abs(sv.left + b.x - t.left) > 2 || Math.abs(sv.top + b.y - (t.top + t.height / 2)) > 2) bad.push(`end of ${p.dataset.from}>${p.dataset.to}`);
        if (!/^M[\d.]+ [\d.]+H[\d.]+(V[\d.]+H[\d.]+)?$/.test(p.getAttribute('d'))) bad.push(`not orthogonal: ${p.getAttribute('d')}`);
      }
      return bad;
    });
    ok(geo.length === 0, `lines leave the right side and enter the left side, orthogonal${geo.length ? ': ' + geo.slice(0, 3).join('; ') : ''}`);
    // No false edge: 2 edges whose segments overlap share the source or the target; no line runs within 12 px right of a node that is no source.
    const amb = await page.evaluate(() => {
      const bad = [];
      const edges = [...document.querySelectorAll('.tree svg path[data-from]')].map((p) => {
        const nums = p.getAttribute('d').match(/[MHV]|[\d.]+/g);
        const pts = []; let x = 0, y = 0, cmd = '';
        for (let i = 0; i < nums.length; i++) {
          if (/[MHV]/.test(nums[i])) { cmd = nums[i]; continue; }
          const v = Number(nums[i]);
          if (cmd === 'M') { x = v; y = Number(nums[++i]); cmd = 'L'; } else if (cmd === 'H') x = v; else if (cmd === 'V') y = v;
          pts.push([x, y]);
          if (pts.length === 1) pts.unshift([x, y]);
        }
        const segs = [];
        for (let i = 1; i < pts.length; i++) if (pts[i][0] !== pts[i - 1][0] || pts[i][1] !== pts[i - 1][1]) segs.push([pts[i - 1], pts[i]]);
        return { from: p.dataset.from, to: p.dataset.to, segs };
      });
      const ov = (a, b) => {
        const [[ax1, ay1], [ax2, ay2]] = a, [[bx1, by1], [bx2, by2]] = b;
        if (ax1 === ax2 && bx1 === bx2 && ax1 === bx1) return Math.min(Math.max(ay1, ay2), Math.max(by1, by2)) - Math.max(Math.min(ay1, ay2), Math.min(by1, by2)) > 1;
        if (ay1 === ay2 && by1 === by2 && ay1 === by1) return Math.min(Math.max(ax1, ax2), Math.max(bx1, bx2)) - Math.max(Math.min(ax1, ax2), Math.min(bx1, bx2)) > 1;
        return false;
      };
      for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
        const a = edges[i], b = edges[j];
        if (a.from === b.from || a.to === b.to) continue;
        if (a.segs.some((s) => b.segs.some((t) => ov(s, t)))) bad.push(`overlap ${a.from}>${a.to} / ${b.from}>${b.to}`);
      }
      const sources = new Set(edges.map((e) => e.from));
      const sv = document.querySelector('.tree svg').getBoundingClientRect();
      for (const a of document.querySelectorAll('.tree a.node')) {
        const id = a.getAttribute('href').split('/').pop();
        if (sources.has(id)) continue;
        const r = a.querySelector('.slot').getBoundingClientRect();
        const right = r.right - sv.left, top = r.top - sv.top, bottom = r.bottom - sv.top;
        for (const e of edges) for (const [[x1, y1], [x2, y2]] of e.segs) {
          const nearX = Math.max(Math.min(x1, x2), right) <= Math.min(Math.max(x1, x2), right + 12);
          const nearY = Math.max(Math.min(y1, y2), top) <= Math.min(Math.max(y1, y2), bottom);
          if (nearX && nearY) bad.push(`line ${e.from}>${e.to} within 12 px of ${id}`);
        }
      }
      return bad;
    });
    ok(amb.length === 0, `no line implies a false edge${amb.length ? ': ' + amb.slice(0, 4).join('; ') : ''}`);
    if (tree === 'main') {
      const truth = ['100>103', '101>103', '102>103', '103>132', '132>104', '104>105', '104>106', '104>107', '105>108', '106>108', '107>108', '108>109', '109>110', '110>111'].map((x) => x.split('>').map((i) => 'STDY_RES_' + i).join('>')).sort();
      ok(drawn.join() === truth.join(), 'main tree: the 14 prerequisites of the game (100, 101, 102 have no line between them)');
    }
    const pitch = await page.evaluate(() => { const r = [...document.querySelectorAll('.node')].map((n) => Math.round(n.offsetTop)); return [...new Set(r)].sort((a, b) => a - b); });
    ok(pitch.every((v, i) => i === 0 || v - pitch[i - 1] <= 144), `connector rows are thin (node rows at ${pitch.join(', ')})`);
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
  ok((await page.locator('.modal .who .stat.need .fr img[src$="fav-icon.png"]').count()) === 1, 'heart next to the researcher');
  const need = String(await page.evaluate((id) => window.DATA.research[id].friendNeed, P.resFriend.id));
  const sprites = (await page.locator('.modal .who .stat.need .fr .fd img').evaluateAll((l) => l.map((i) => i.getAttribute('src').replace(/^.*favc-(\d+)\.png$/, '$1')))).join(',');
  ok(sprites === (Number(need) <= 10 ? need : need.split('').join(',')), `heart digit sprites ${sprites} for the level ${need}`);
  const t = await page.locator('.modal-body').innerText();
  ok(/TOTAL FRIENDSHIP/i.test(await page.locator('.modal .who .stat.need').innerText()), 'label "Total friendship"');
  ok(!/\d+ needed/.test(t), 'materials have no "N needed" text');
  ok(/\d+ turns?/.test(t), 'duration as "N turns"');
});
await closeEsc();
await step('research with a condition', async () => {
  await go(`#/research/${(await page.evaluate((id) => window.DATA.research[id].tree, P.resCond.id))}/${P.resCond.id}`);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .conds .link').count()) >= 1, 'condition shown');
});
await closeEsc();

await step('character joining in a story event', async () => {
  await go(`#/characters/${P.charStory.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  const want = await page.evaluate((id) => window.DATA.chars.find((c) => c.id === id).join.with.map((i) => window.DATA.chars.find((c) => c.id === i).n), P.charStory.id);
  ok(/Joins in a story event/.test(t) && /Joins with/.test(t), 'says "Joins in a story event" and "Joins with"');
  const names = await page.locator('.modal .jn .grp a.mini .nm').allInnerTexts();
  ok(names.length === want.length && want.every((n) => names.includes(n)) && !names.includes(P.charStory.n) && want.length >= 10, `${names.length} tiles of the other characters of the event`);
  ok(!/Turn [01]\b|population 0\b/i.test(t), 'no turn of 0 or 1, no population of 0');
});
await closeEsc();
await step('character alone on its story event, and a population join', async () => {
  await go(`#/characters/${P.charAlone.id}`);
  await page.waitForSelector('.modal');
  ok(/Joins in a story event/.test(await page.locator('.modal-body').innerText()) && (await page.locator('.modal .jn .grp').count()) === 0, 'alone: only "Joins in a story event"');
  await go(`#/characters/${P.charPop.id}`);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal-body').innerText();
  ok(/Town population/i.test(t) && !/story event/.test(t) && !/Turn \d/.test(t), 'population join: the population only');
});
await closeEsc();
await step('research header is 1 row (Dusky Barrier Breaker)', async () => {
  await go(`#/research/${await page.evaluate((id) => window.DATA.research[id].tree, P.dusky.id)}/${P.dusky.id}`);
  await page.waitForSelector('.modal .who');
  if (width >= 768) {
    const tops = await page.evaluate(() => [...document.querySelectorAll('.modal .who > *')].map((k) => Math.round(k.getBoundingClientRect().top)));
    ok(tops.length >= 3 && Math.max(...tops) - Math.min(...tops) <= 4, `header children tops ${tops.join(',')}`);
  } else ok(true, 'narrow: the header may wrap');
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

// ---- round 6 ----
await step('character detail: group, game, population', async () => {
  const info = await page.evaluate(() => {
    const D = window.DATA;
    const marie = D.chars.find((c) => c.type === 'Alchemist');
    const townsfolk = D.chars.find((c) => c.type === 'Townsfolk' && c.game);
    const story = D.chars.find((c) => c.n === 'Knoss');
    const low = D.chars.filter((c) => c.join && c.join.pop > 0 && c.join.pop <= 30).length;
    const withPop = D.chars.find((c) => c.join && !c.join.story && c.join.pop > 30);
    return { marie: marie.id, townsfolk: townsfolk.id, story: story.id, low, withPop: withPop && withPop.id };
  });
  ok(info.low === 0, 'no join population at or below 30 in the data');
  await go('#/characters/' + info.marie);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .top .catline').first().innerText()) === 'Alchemist', 'Alchemist line');
  await go('#/characters/' + info.townsfolk);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .top .catline').first().innerText()) === 'Townsfolk', 'Townsfolk line');
  await go('#/characters/' + info.story);
  await page.waitForSelector('.modal');
  const t = await page.locator('.modal .top').innerText();
  ok(/\bTownsfolk\b/.test(t) && !/\b(Story|Fairy|Alchemist)\b/.test(t) && /Atelier of the New World/.test(t), 'story character (Knoss): Townsfolk line, the game of origin shows');
  if (info.withPop) {
    await go('#/characters/' + info.withPop);
    await page.waitForSelector('.modal');
    const pops = await page.locator('.modal .jn .stat', { hasText: /Town population/i }).allInnerTexts();
    ok(pops.length === 1 && Number(pops[0].replace(/\D/g, '')) > 30, `population above 30 shows (${pops[0]?.replace(/\n/g, ' ')})`);
  }
});
await closeEsc();
await step('research icons are the output', async () => {
  const r = await page.evaluate(() => {
    const R = Object.values(window.DATA.research);
    return { total: R.length, prize: R.filter((x) => x.iconKind === 'prize').length, recipe: R.filter((x) => x.iconKind === 'recipe').length, bonus: R.filter((x) => x.iconKind === 'bonus').length, none: R.filter((x) => !x.icon).length, face: R.some((x) => x.who.some((w) => w.icon && w.icon === x.icon)) };
  });
  console.log('  research icons ' + JSON.stringify(r));
  ok(r.prize + r.recipe + r.bonus + r.none === r.total, 'each research has 1 kind of icon');
  await go('#/research/main');
  await page.waitForSelector('.node');
  const faces = await page.evaluate(() => { const f = new Set(window.DATA.research && Object.values(window.DATA.research).flatMap((x) => x.who.map((w) => w.icon))); return [...document.querySelectorAll('.node img')].filter((i) => f.has(i.getAttribute('src').replace('img/icons/', ''))).length; });
  ok(faces === 0, 'no researcher face on a tree node');
  const dusky = P.dusky.id;
  await go('#/research/main/' + dusky);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .who .person .slot img').count()) >= 1, 'the researcher faces show in the detail header');
});
await closeEsc();
await step('zone and area: treasure and tool gathers in 1 row, same order', async () => {
  const order = async (hash) => {
    await go(hash);
    await page.waitForSelector('.modal');
    return page.evaluate(() => {
      const row = document.querySelector('.modal .panel-cols.gathers');
      if (!row) return null;
      const cols = [...row.children].map((c) => ({ t: c.querySelector('.gh b').textContent, top: Math.round(c.getBoundingClientRect().top) }));
      return { titles: cols.map((c) => c.t), oneRow: new Set(cols.map((c) => c.top)).size === 1 };
    });
  };
  const rank = (t) => ['Treasure', 'Bug Net', 'Digging', 'Fishing'].indexOf(t);
  const z = await order('#/areas/EXPL_AREA_SPRING');
  const a = await order('#/areas/EXPL_RESEARCH_SPRING_00');
  ok(z && a && z.titles.join() === a.titles.join(), `zone and area have the same gathers: ${z && z.titles.join(', ')}`);
  ok(z.titles.every((t, i) => i === 0 || rank(t) > rank(z.titles[i - 1])), 'in the order Treasure, Bug Net, Digging, Fishing');
  ok(width < 1200 || z.oneRow, 'the gathers are 1 row');
  await go('#/areas/EXPL_RESEARCH_SPRING_00');
  await page.waitForSelector('.modal');
  const txt = await page.locator('.modal-body').innerText();
  ok(/Difficulty by Investigation Lv/i.test(txt) && !/area level/i.test(txt), 'Investigation Lv term');
});
await closeEsc();
await step('monsters that need an Investigation Lv', async () => {
  const id = await page.evaluate(() => window.DATA.zones.flatMap((z) => z.areas).find((a) => a.mons.some((m) => m.req > 1)).id);
  await go('#/areas/' + id);
  await page.waitForSelector('.modal');
  ok((await page.locator('.modal .gh b', { hasText: /from Investigation Lv \d/i }).count()) >= 1, 'a group says "from Investigation Lv N"');
  ok((await page.locator('.modal .mini .tbadge', { hasText: /^Lv \d+(–\d+)?$/ }).count()) > 0, 'monster levels are badges');
  // A monster with several levels in an area is 1 tile with 1 range badge.
  const multi = await page.evaluate(() => { const D = window.DATA; for (const z of D.zones) for (const a of z.areas) { const m = a.mons.find((x) => x.lo !== x.hi); if (m) return { area: a.id, m: m.m, lo: m.lo, hi: m.hi }; } return null; });
  ok(!!multi, 'the data has an area with a multi-level monster');
  await go('#/areas/' + multi.area);
  await page.waitForSelector('.modal');
  const tiles = page.locator(`.modal a.mini[href="#/monsters/${multi.m}"]`);
  ok((await tiles.count()) === 1, `multi-level monster: ${await tiles.count()} tile`);
  ok((await tiles.locator('.tbadge').innerText()) === `Lv ${multi.lo}–${multi.hi}`, `range badge ${await tiles.locator('.tbadge').innerText()}`);
});
await closeEsc();

await step('research bonus: tile with quantity, friendship heart', async () => {
  await go('#/research/' + (await page.evaluate(() => window.DATA.research.STDY_RES_132.tree)) + '/STDY_RES_132');
  await page.waitForSelector('.modal');
  const stone = page.locator('.modal a.mini', { hasText: 'Spirit Rock' });
  ok((await stone.count()) === 1, 'Spirit Rock tile in the research');
  ok((await stone.locator('.qty').innerText()) === '×100', 'Spirit Rock quantity ×100');
  ok((await page.locator('.modal .gh b', { hasText: /^Bonus$/ }).count()) === 1, 'sub-title Bonus');
  ok((await page.locator('.modal a.mini .qty', { hasText: '×10' }).count()) >= 1, 'prize item Alchemy Equipment ×10');
  const d = await page.evaluate(() => Object.values(window.DATA.research).filter((r) => r.bonus).length);
  ok(d === 21, `21 research of the site have a bonus (23 in the game, 2 are in no tree), got ${d}`);
  const withTile = await page.evaluate(() => Object.values(window.DATA.research).filter((r) => r.bonus && r.bonus.item).length);
  ok(withTile === 18, `18 bonuses have an item tile, got ${withTile}`);
});
await closeEsc();
const PAGES = ['#/items', '#/areas', '#/monsters', '#/characters', '#/research/main', '#/about'];
await step('legal notice and About link in the footer of each page', async () => {
  const want = 'Unofficial fan site. We claim no affiliation with Koei Tecmo. The game data, images and texts are owned by Koei Tecmo, the copyright holder of Nelke & the Legendary Alchemists.';
  await go('#/about');
  await page.waitForSelector('.about');
  ok(!(await page.locator('footer.foot').isVisible()), 'no footer on #/about');
  ok((await page.locator('body').innerText()).split(want).length - 1 === 1, 'the notice shows 1 time on #/about');
  for (const h of PAGES.filter((p) => p !== '#/about')) {
    await go(h);
    await page.waitForTimeout(100);
    const f = page.locator('footer.foot');
    ok((await f.locator('.legal').innerText()).trim() === want, `notice on ${h}`);
    ok((await f.locator('cite.game-title').count()) === 1, `game title in cite on ${h}`);
    ok((await f.locator('a', { hasText: /^About$/ }).getAttribute('href')) === '#/about', `About link on ${h}`);
  }
});
await step('site name and tagline in the header of each page, titles end with the name', async () => {
  for (const h of PAGES) {
    await go(h);
    await page.waitForTimeout(100);
    const b = page.locator('.hdr-bar .brand');
    ok((await b.locator('.site-name').innerText()) === 'Westwald Archive', `site name on ${h}`);
    ok((await b.locator('.tagline').innerText()) === 'Unofficial fansite for Nelke & the Legendary Alchemists' && (await b.locator('.tagline cite.game-title').count()) === 1, `tagline on ${h}`);
    ok((await page.title()).endsWith('Westwald Archive'), `document title on ${h}: ${await page.title()}`);
    ok((await page.locator('.hdr-bar').innerText()).indexOf('Data prototype') < 0, `no prototype label on ${h}`);
    const s = await page.evaluate(() => { const n = document.querySelector('.site-name').getBoundingClientRect(), t = document.querySelector('.tagline').getBoundingClientRect(); return { under: t.top >= n.bottom - 1, font: getComputedStyle(document.querySelector('.site-name')).fontFamily, w: getComputedStyle(document.querySelector('.site-name')).fontWeight }; });
    ok(/Lora/.test(s.font) && s.w === '700', `name in Lora 700 on ${h}`);
    ok(s.under === (width < 600), `tagline ${width < 600 ? 'under' : 'after'} the name on ${h}`);
  }
});
await step('About page', async () => {
  await go('#/about');
  await page.waitForSelector('.about');
  ok((await page.locator('#nav a[aria-current]').count()) === 0, 'no selected category link');
  ok((await page.locator('#nav a[href="#/about"]').count()) === 0, 'no About link in the header');
  ok((await page.locator('.about .bar').allInnerTexts()).join() === 'Contact,Source,Legal', 'the 3 section titles');
  ok((await page.locator('.about a[href="https://github.com/Arkased/NelkeData/issues"]').count()) === 1, 'link to the issues');
  ok((await page.locator('.about a[href="https://github.com/Arkased/NelkeData"]').count()) === 1, 'link to the repository');
  const w = await page.evaluate(() => Math.round(document.querySelector('.about').getBoundingClientRect().width));
  ok(w <= 720, `panel width ${w} up to 720`);
  auditTotal += await audit(page, 'about', true);
});

// The test fails on any audit finding (the rules of the UI standard are part of the audit).
if (auditTotal > 0) { fails++; console.log(`  FAIL ${auditTotal} audit findings`); }
console.log(`\n[${width}] RESULT: ${fails} failures, ${auditTotal} audit findings`);
await page.context().close();
return { fails, text: lines.join('\n') };
}

const browser = await launch();
const results = await Promise.all(widths.map((w) => runWidth(browser, w)));
await browser.close();
for (const r of results) console.log(r.text);
const bad = results.filter((r) => r.fails > 0).length;
console.log(bad ? `\nFAILED at ${bad} of ${widths.length} widths` : `\nALL ${widths.length} WIDTHS PASS`);
process.exit(bad ? 1 : 0);
