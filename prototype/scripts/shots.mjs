// Usage: node shots.mjs [widthsCsv] [statesCsv]  - screenshots of every state, with the DOM audit of each.
import fs from 'node:fs';
import { launch, newPage, settle, audit, pick, root } from './lib.mjs';

const widths = (process.argv[2] || '360,768,1280,1920').split(',').map(Number);
const only = process.argv[3] ? process.argv[3].split(',') : null;
const browser = await launch();
if (!only) for (const f of fs.readdirSync(`${root}/shots`)) fs.unlinkSync(`${root}/shots/${f}`);
let total = 0;

for (const w of widths) {
  const page = await newPage(browser, w);
  const P = await pick(page);
  const first = await page.evaluate((a) => ({ friendTree: window.DATA.research[a[0]].tree, condTree: window.DATA.research[a[1]].tree, lifeSpring: 'EXPL_RESEARCH_SPRING_00', interior: 'EXPL_RESEARCH_SPRING_01', zone: 'EXPL_AREA_SPRING', res: Object.keys(window.DATA.research).find((k) => window.DATA.research[k].tree === 'main' && window.DATA.research[k].mats.length), resA: Object.keys(window.DATA.research).find((k) => window.DATA.research[k].tree === 'attack') }), [P.resFriend.id, P.resCond.id]);
  const item = (k) => `#/items/${P[k].id}`;
  const states = [
    ['items', '#/items'],
    ['items-filtered', '#/items?cat=Material,Merchandise&shop=GSTORE_SALE_FLAG&craft=1'],
    ['items-search', '#/items?q=ra'],
    ['items-empty', '#/items?q=zzzz'],
    ['item-gather', item('gather')],
    ['item-drop', item('drop')],
    ['item-farm', item('farm')],
    ['item-rare', item('rare')],
    ['item-craft', item('craftPriced')],
    ['item-craft-noprice', item('craftNoPrice')],
    ['item-craft-unpriced', item('unpriced')],
    ['item-longname', item('longName')],
    ['areas', '#/areas'],
    ['area-interior', `#/areas/${first.interior}`],
    ['area-outside', `#/areas/${first.lifeSpring}`],
    ['zone', `#/areas/${first.zone}`],
    ['home', '#/home'],
    ['item-shop', item('shop')],
    ['area-bestial', `#/areas/${P.bestial.id}`],
    ['area-bountiful', `#/areas/${P.bountiful.id}`],
    ['monsters', '#/monsters'],
    ['monster', `#/monsters/${P.monster.id}`],
    ['characters', '#/characters'],
    ['character', `#/characters/${P.character.id}`],
    ['research-friend', `#/research/${first.friendTree}/${P.resFriend.id}`],
    ['research-cond', `#/research/${first.condTree}/${P.resCond.id}`],
    ['research-main', '#/research/main'],
    ['research-attack', '#/research/attack'],
    ['research-support', '#/research/support'],
    ['research-emergency', '#/research/emergency'],
    ['research-node', `#/research/main/${first.res}`],
    ['research-node-attack', `#/research/attack/${first.resA}`],
  ];
  for (const [name, hash] of states) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(() => { location.hash = '#/items'; });
    await page.evaluate((h) => { location.hash = h; }, hash);
    await settle(page);
    const errs = page.errs.splice(0);
    const n = await audit(page, `${name}-${w}`, true);
    total += n;
    if (errs.length) console.log('  console:', errs.slice(0, 3));
    await page.screenshot({ path: `${root}/shots/${name}-${w}.png`, fullPage: !(await page.evaluate(() => !!document.querySelector('.overlay'))) });
    const more = await page.evaluate(() => { const b = document.querySelector('.modal-body'); if (b && b.scrollHeight > b.clientHeight + 1) { b.scrollTop = b.scrollHeight; return true; } return false; });
    if (more) await page.screenshot({ path: `${root}/shots/${name}-b-${w}.png` });
  }
  if (w < 600) {
    await page.evaluate(() => { location.hash = '#/items'; });
    await page.locator('#menu').click();
    await page.screenshot({ path: `${root}/shots/menu-open-${w}.png` });
  }
  await page.close();
}
console.log('TOTAL AUDIT FINDINGS', total);
await browser.close();
