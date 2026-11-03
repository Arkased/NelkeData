// Shared: browser launch, the DOM audit and the data picks.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const url = 'file:///' + path.resolve(root, 'index.html').replace(/\\/g, '/');
export const launch = () => chromium.launch({ executablePath: 'C:/Users/Kevin Liu/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe' });

/** Opens a page at a width and collects the console errors in page.errs. */
export async function newPage(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 800 : 900 } });
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + e.message));
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && page.errs.push(m.type() + ': ' + m.text()));
  page.on('requestfailed', (r) => page.errs.push('requestfailed: ' + r.url().slice(-60)));
  await page.goto(url);
  return page;
}

/** Makes lazy images load, then waits for all of them. */
export async function settle(page) {
  await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }));
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(250);
}

/** The DOM audit. Returns { category: [descriptions] }. */
export function auditFn() {
  const out = { hscroll: [], overflow: [], textOverflow: [], overlap: [], tight: [], brokenImg: [], empty: [], orphan: [] };
  const desc = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''} "${(e.textContent || '').trim().slice(0, 30)}"`;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const skip = (e) => e.closest('.treescroll, #tip, svg') || (e.closest('.overlay') && false);
  const all = [...document.querySelectorAll('body *')].filter((e) => vis(e) && !skip(e) && !['SCRIPT', 'STYLE'].includes(e.tagName));
  if (document.documentElement.scrollWidth > innerWidth) out.hscroll.push(`scrollWidth ${document.documentElement.scrollWidth} > ${innerWidth}`);
  if (document.querySelector('.overlay') && document.querySelector('.modal-body').scrollWidth > document.querySelector('.modal-body').clientWidth + 1) out.hscroll.push('modal-body scrolls horizontally');
  for (const e of all) {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const p = e.parentElement;
    // child outside its parent
    if (p && cs.position !== 'absolute' && cs.position !== 'fixed' && !p.closest('.treescroll')) {
      const pr = p.getBoundingClientRect();
      const pcs = getComputedStyle(p);
      if (pcs.display !== 'contents' && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5)) out.overflow.push(`${desc(e)} in ${desc(p)} (${Math.round(r.left - pr.left)}..${Math.round(r.right - pr.right)})`);
    }
    // text wider than its box
    if (!e.matches('.slot.m76, .slot.n113') && cs.display !== 'inline' && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') out.textOverflow.push(`${desc(e)} ${e.scrollWidth}>${e.clientWidth}`);
    if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.textOverflow.push(`ellipsis cut: ${desc(e)}`);
    // text taller than a fixed box (the 2-line names are cut on purpose, only when 3 lines were needed)
    if (e.matches('.nm') && !e.closest('.node')) {
      const lines = Math.round(e.scrollHeight / parseFloat(cs.lineHeight));
      if (lines > 2) out.textOverflow.push(`name needs ${lines} lines (cut by ellipsis): ${desc(e)}`);
    }
    // text touching the border of a control
    if (cs.borderTopWidth !== '0px' && cs.borderTopColor !== 'rgba(0, 0, 0, 0)' && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const range = document.createRange(); range.selectNodeContents(e);
      const t = range.getBoundingClientRect();
      if (t.left - r.left < 8 || r.right - t.right < 8) out.tight.push(`${desc(e)} text gap ${Math.round(t.left - r.left)}/${Math.round(r.right - t.right)}`);
    }
    // siblings that overlap
    if (cs.position === 'static' || cs.position === 'relative') {
      for (const s of e.parentElement ? [...e.parentElement.children] : []) {
        void s;
      }
    }
  }
  // overlap between in-flow siblings
  for (const p of new Set(all.map((e) => e.parentElement))) {
    if (!p || p.closest('.tree, .treescroll')) continue;
    const kids = [...p.children].filter((k) => vis(k) && !['absolute', 'fixed', 'sticky'].includes(getComputedStyle(k).position) && !['SCRIPT', 'STYLE'].includes(k.tagName));
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) out.overlap.push(`${desc(kids[i])} x ${desc(kids[j])}`);
      }
    }
  }
  for (const i of document.images) if (i.complete && i.naturalWidth === 0) out.brokenImg.push(i.src.slice(-50));
  for (const e of document.querySelectorAll('.grp, .minis, .row, .cols, .syn-val, .unlock, .tbl, .ledger, .areas, .opts, .zone-in, .facts, .syn-top, .syn-body, .who, main > *')) {
    if (!e.children.length && !e.textContent.trim()) out.empty.push(desc(e));
  }
  // ---- round 4: the mechanical rules of the UI standard ----
  // No internal id of the game files (EVENT_MM00_110) in any visible text, tooltip, label or placeholder.
  const ID_RE = /\b[A-Z][A-Z0-9]+(_[A-Z0-9]+)+\b/;
  out.ids = [];
  for (const e of document.querySelectorAll('[data-tip], [aria-label], [placeholder], [title], img[alt]')) {
    if (!vis(e)) continue;
    for (const a of ['data-tip', 'aria-label', 'placeholder', 'title', 'alt']) if (ID_RE.test(e.getAttribute(a) || '')) out.ids.push(`internal id in ${a}: ${desc(e)}`);
  }
  Object.assign(out, { captions: [], banned: [], money: [], units: [], images: [], tiles: [], spacing: [], fonts: [] });
  // 1. banned text. A multiplier is written ×1.25, never 1.25x or x3.
  const BANNED = /\bQty\b|\bNeeds\b|(^|\s)x\d|\d(\.\d+)?x\b|game units|opens after|open from the start|Scroll sideways|\d+ of \d+ items|Element rating|Friendship needed/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName) || !vis(el)) continue;
    const s = n.textContent.trim();
    if (!s) continue;
    if (BANNED.test(s)) out.banned.push(`"${s.slice(0, 40)}" in ${desc(el)}`);
    if (ID_RE.test(s)) out.ids.push(`internal id "${s.slice(0, 40)}" in ${desc(el)}`);
    // every % is a rate with the format N%
    if (/\d%/.test(s) && !el.closest('.rate, .name, .node, .link, .lt, .desc, .person')) out.units.push(`% outside .rate: "${s.slice(0, 40)}"`);
  }
  // 2. money and synthesis cost have their icon, the numbers of the stat lines are a unit
  for (const e of document.querySelectorAll('.money')) {
    const im = e.querySelector('img.ico');
    if (!im || !/coin\.png$/.test(im.getAttribute('src')) || !/^-?\d[\d,]*(\.\d)?$/.test(e.textContent.trim())) out.money.push(`money without coin or number: ${desc(e)}`);
  }
  for (const e of document.querySelectorAll('.cost')) {
    const im = e.querySelector('img.ico');
    if (!im || !/cost\.png$/.test(im.getAttribute('src')) || !/^-?\d[\d,]*(\.\d)?$/.test(e.textContent.trim())) out.money.push(`synthesis cost without icon or number: ${desc(e)}`);
  }
  for (const e of document.querySelectorAll('.lr .val')) if (!e.querySelector('.money, .cost')) out.money.push(`ledger value without unit: ${desc(e)}`);
  for (const e of document.querySelectorAll('.bigstat b')) if (!e.querySelector('.money, .cost') && !/^\d+ turns?$/.test(e.textContent.trim())) out.units.push(`stat is not money, cost or "N turns": ${desc(e)}`);
  for (const e of document.querySelectorAll('.fr')) if (!e.querySelector('img[src$="fav-icon.png"]') || !/^\d+$/.test(e.textContent.trim())) out.units.push(`friendship without heart or number: ${desc(e)}`);
  // 3. unit formats
  for (const e of document.querySelectorAll('.rate')) if (!/^\d+(\.\d)?%$/.test(e.textContent.trim())) out.units.push(`rate format: "${e.textContent.trim()}"`);
  for (const e of document.querySelectorAll('.mini small')) {
    if (e.querySelector('.rate')) continue;
    const s = e.textContent.trim();
    if (!/^\d[\d,]* (needed|given)$/.test(s) && !/^\d[\d,]* per drop · \d+(\.\d)?%$/.test(s) && !/^Lv \d+(-\d+)?$/.test(s)) out.units.push(`tile value format: "${s}" in ${desc(e.parentElement)}`);
  }
  // A tile has at most 1 value line, and the line does not wrap.
  for (const e of document.querySelectorAll('.mini')) {
    const smalls = e.querySelectorAll('small');
    if (smalls.length > 1) out.tiles.push(`tile with ${smalls.length} value lines: ${desc(e)}`);
    for (const sm of smalls) if (sm.getBoundingClientRect().height > parseFloat(getComputedStyle(sm).lineHeight) * 1.5) out.tiles.push(`tile value wraps: "${sm.textContent.trim()}"`);
  }
  // 4. every entity link and tile has an image that loaded
  for (const e of document.querySelectorAll('.mini, a.slot, .node, .elm, .shop, .person, .card')) {
    if (!vis(e)) continue;
    const im = e.querySelector('img');
    if (!im || !im.complete || im.naturalWidth === 0) out.images.push(`no loaded image: ${desc(e)}`);
  }
  // 4b. every mention of an item, a monster, a character or a research has its icon, also a link inside a text
  for (const e of document.querySelectorAll('a[href^="#/items/"], a[href^="#/monsters/"], a[href^="#/characters/"], a[href^="#/research/"]')) {
    // A research has no icon in the game, so the research card of a character shows its name and its tree.
    if (!vis(e) || e.matches('.rcard') || /^#\/research\/[a-z]+$/.test(e.getAttribute('href'))) continue;
    const im = e.querySelector('img');
    if (!im || !im.complete || im.naturalWidth === 0) out.images.push(`entity mention without icon: ${desc(e)}`);
  }
  // 4c. no caption under a section heading (a caption repeats the title or explains a unit), and 1 label style
  for (const e of document.querySelectorAll('.gh small, .bar + small, .bar + .note, .bar + p, .gh + small, .gh + .note, .gh + p')) if (vis(e)) out.captions.push(`caption under a heading: ${desc(e)}`);
  for (const e of document.querySelectorAll('small')) {
    if (!vis(e) || e.closest('.mini, .lt, .elm, .card-tx, .site-name')) continue;
    const cs = getComputedStyle(e);
    if (!e.classList.contains('cap') || cs.textTransform !== 'uppercase' || cs.fontSize !== '12px' || cs.fontWeight !== '800') out.captions.push(`label without the label style: ${desc(e)}`);
  }
  // 5. empty sections
  for (const e of document.querySelectorAll('.grp, .conds, .elms, .sold, .drs, .disp, .dcol, .home, .opts, .toolbar, .zones')) {
    if (!e.textContent.trim() && !e.querySelector('img')) out.empty.push(`empty: ${desc(e)}`);
  }
  for (const g of document.querySelectorAll('.grp')) if (g.children.length < 2) out.empty.push(`group without body: ${desc(g)}`);
  // 6. tiles of one grid have the same width
  for (const p of document.querySelectorAll('.grid, .minis, .row.mats')) {
    const ws = [...p.children].filter((k) => k.classList.contains('mini') && vis(k)).map((k) => k.getBoundingClientRect().width);
    if (ws.length > 1 && Math.max(...ws) - Math.min(...ws) > 1) out.tiles.push(`uneven tiles ${Math.min(...ws).toFixed(1)}..${Math.max(...ws).toFixed(1)} in ${desc(p)}`);
  }
  // 7. paddings, margins and gaps of the containers are multiples of 4 px
  const SP = '.page, .hdr-bar, .nav, .nav a, .toolbar, .srow, .search, .fgroup, .opts, .toggle, .btn, .stat, .ul, .uv, .gridwrap, .grid, .mini, .zones, .zone-in, .zone-head, .areas, a.area, .modal-body, .mhead, .name, .bar, .grp, .gh, .minis, .cols, .row, .link, .chip, .chips, .desc, .top, .facts, .sold, .shop, .reduce, .el, .money, .cost, .fr, .syn, .syn-top, .syn-body, .syn-val, .ledger, .lr, .unlock, .ul, .uv, .bigstat, .disp, .dcol, .elms, .elm, .drs, .dr, .who, .need, .person, .conds, .crumb, .diffline, .diffs, .diff, .home, a.card, .card-tx, .treein, .treescroll, .node, #main, #main > *';
  const ok4 = (v) => v === 'normal' || v === 'auto' || (Number.isFinite(parseFloat(v)) && Math.abs(parseFloat(v) / 4 - Math.round(parseFloat(v) / 4)) < 0.001);
  for (const e of document.querySelectorAll(SP)) {
    if (!vis(e)) continue;
    const cs = getComputedStyle(e);
    for (const k of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap']) {
      // a centered box has auto margins: its computed margin is a used value, so it is not a design value
      if (k.startsWith('margin') && e.matches('.page')) continue;
      if (!ok4(cs[k])) out.spacing.push(`${k} ${cs[k]} on ${desc(e)}`);
    }
  }
  // 8. font sizes are on the scale
  const SCALE = [12, 14, 16, 20, 22, 28];
  for (const e of all) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (!SCALE.includes(f)) out.fonts.push(`font ${f}px on ${desc(e)}`);
  }
  for (const e of document.querySelectorAll('.gh')) if (e.parentElement.children.length === 1) out.orphan.push(`header without content: ${desc(e)}`);
  for (const e of document.querySelectorAll('.bar')) { const n = e.nextElementSibling; if (!n || n.classList.contains('bar')) out.orphan.push(`bar without content: ${desc(e)}`); }
  return out;
}

export async function audit(page, label, quiet = false) {
  const res = await page.evaluate(auditFn);
  const n = Object.values(res).reduce((a, v) => a + v.length, 0);
  if (!quiet || n) console.log(`  audit ${label}: ${n}${n ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(res).filter(([, v]) => v.length).map(([k, v]) => [k, v.slice(0, 4)]))) : ''}`);
  return n;
}

export const pick = (page) =>
  page.evaluate(() => {
    const D = window.DATA;
    const first = (f) => D.items.find(f);
    const names = {
      gather: first((i) => i.gather.length > 2 && i.usedIn.length && i.cat === 'Material' && !i.id.includes('ELEMENT')),
      drop: first((i) => i.drops.length && !i.gather.length) || first((i) => i.drops.length),
      shop: first((i) => i.shops.length && !i.syn && !i.gather.length) || first((i) => i.shops.length),
      farm: first((i) => i.farm),
      craftPriced: first((i) => i.syn && i.syn.added !== null && i.syn.unlock && i.syn.unlock.friendship > 0 && i.syn.researchId) || first((i) => i.syn && i.syn.added !== null && i.syn.unlock && i.syn.unlock.friendship > 0) || first((i) => i.syn && i.syn.added !== null),
      craftNoPrice: first((i) => i.syn && i.syn.added === null),
      rare: first((i) => i.special.length > 1),
      unpriced: first((i) => i.syn && i.syn.unpriced.length),
      jpItem: first((i) => i.jp && i.shops.length),
      longName: D.items.reduce((a, b) => (b.n.length > a.n.length ? b : a)),
    };
    const spots = D.zones.flatMap((z) => z.areas);
    const mk = Object.keys(D.monsters);
    const withHab = mk.find((k) => D.zones.some((z) => z.areas.some((a) => a.mons.some((m) => m.m === k))) && D.items.some((i) => i.drops.some((d) => d.m === k)));
    const resFriend = Object.values(D.research).find((r) => r.friendNeed > 0 && r.mats.length) || Object.values(D.research).find((r) => r.friendNeed > 0);
    const resCond = Object.values(D.research).find((r) => r.conds.length);
    const charRes = D.chars.find((c) => Object.values(D.research).some((r) => r.who.some((w) => w.n === c.n)) && D.items.some((i) => i.syn && i.syn.unlock && i.syn.unlock.teacher === c.n));
    const extra = {
      bestial: spots.find((a) => /^Bestial /.test(a.n)),
      bountiful: spots.find((a) => /^Bountiful /.test(a.n)),
      monster: withHab ? { id: withHab, n: D.monsters[withHab].n } : null,
      boss: mk.find((k) => D.monsters[k].boss) ? { id: mk.find((k) => D.monsters[k].boss), n: '' } : null,
      character: charRes,
      monDef: mk.map((k) => ({ id: k, n: D.monsters[k].n, m: D.monsters[k] })).find((x) => x.m.def && D.items.some((i) => i.drops.some((d) => d.m === x.id)) && D.zones.some((z) => z.areas.some((a) => a.mons.some((m) => m.m === x.id)))),
      charFull: D.chars.find((c) => c.apt.length && c.skills.some((s) => s.ev) && c.join && c.join.pop > 0 && c.join.turn > 0) || D.chars.find((c) => c.apt.length && c.skills.length && c.join && c.join.pop > 0),
      resFriend,
      resCond,
    };
    return Object.fromEntries(Object.entries({ ...names, ...extra }).map(([k, v]) => [k, v ? { id: v.id, n: v.n } : null]));
  });
