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
  const out = { hscroll: [], overflow: [], textOverflow: [], overlap: [], tight: [], brokenImg: [], empty: [], orphan: [], italic: [] };
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
    // a tile name must not break inside a word (a literal hyphen or soft hyphen in the word allows the break)
    if (e.matches('.mini .nm')) {
      const tn = [...e.childNodes].find((n) => n.nodeType === 3);
      if (tn) for (const m of tn.textContent.matchAll(/\S+/g)) {
        if (/[-­‐]/.test(m[0])) continue;
        const wr = document.createRange(); wr.setStart(tn, m.index); wr.setEnd(tn, m.index + m[0].length);
        const tops = new Set([...wr.getClientRects()].map((q) => Math.round(q.top / 4)));
        if (tops.size > 1) out.textOverflow.push(`name breaks inside the word "${m[0]}": ${desc(e)}`);
      }
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
  for (const e of document.querySelectorAll('.grp, .minis, .row, .cols, .syn-stats, .panel-cols, .col, .unlock, .tbl, .areas, .opts, .zone-in, .facts, .who, main > *')) {
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
  const BANNED = /\b\d+ (needed|per drop|given)\b|\bQty\b|\bNeeds\b|(^|\s)x\d|\d(\.\d+)?x\b|game units|opens after|open from the start|Scroll sideways|\d+ of \d+ items|Element rating|Friendship needed/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName) || !vis(el)) continue;
    const s = n.textContent.trim();
    if (!s) continue;
    if (BANNED.test(s)) out.banned.push(`"${s.slice(0, 40)}" in ${desc(el)}`);
    if (ID_RE.test(s)) out.ids.push(`internal id "${s.slice(0, 40)}" in ${desc(el)}`);
    // every % is a rate with the format N%
    if (/\d%/.test(s) && !el.closest('.rate, .tbadge, .name, .node, .link, .lt, .desc, .person')) out.units.push(`% outside .rate: "${s.slice(0, 40)}"`);
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
  for (const e of document.querySelectorAll('.who .stat')) if (!e.querySelector('.money, .cost, .fr') && !/^\d+ turns?$/.test(e.querySelector('b')?.textContent.trim() ?? '')) out.units.push(`stat is not money, friendship or "N turns": ${desc(e)}`);
  for (const e of document.querySelectorAll('.fr')) {
    if (!e.querySelector('img[src$="fav-icon.png"]') || !e.querySelector('img[src*="favc-"]')) out.units.push(`friendship without heart or digit sprite: ${desc(e)}`);
    if (/\d/.test(e.textContent)) out.units.push(`friendship with a number in the page font: ${desc(e)}`);
  }
  // A rate of 100% never shows, as text or as a badge.
  for (const e of document.querySelectorAll('.rate, .tbadge, .pct')) if (/(^|[^\d.])100(\.0)?\s?%/.test(e.textContent)) out.units.push(`visible 100%: ${desc(e)}`);
  if (/(^|[^\d.])100(\.0)?\s?%/.test(document.body.innerText)) out.units.push('visible text "100%" on the page');
  // 3. unit formats
  for (const e of document.querySelectorAll('.rate')) if (!/^\d+(\.\d)?%$/.test(e.textContent.trim())) out.units.push(`rate format: "${e.textContent.trim()}"`);
  // A tile has no value line. A rate or a level is a badge on the bottom right corner of the icon: "25%" or "Lv 34".
  for (const e of document.querySelectorAll('.mini small')) out.tiles.push(`tile with a value line: "${e.textContent.trim()}" in ${desc(e.parentElement)}`);
  for (const e of document.querySelectorAll('.tbadge')) {
    const t = e.textContent.trim();
    if (!/^(\d+(\.\d)?%|Lv \d+(–\d+)?)$/.test(t)) out.units.push(`tile badge format: "${t}"`);
    const sl = e.parentElement.getBoundingClientRect(), b = e.getBoundingClientRect();
    if (!e.parentElement.matches('.slot') || b.right > sl.right + 1 || b.bottom > sl.bottom + 1 || sl.right - b.right > 8 || sl.bottom - b.bottom > 8) out.units.push(`tile badge is not on the bottom right corner of the icon: "${t}"`);
  }
  // No 2 tiles of 1 section link to the same entity (a monster with several levels in an area is 1 tile with a level range).
  for (const sec of document.querySelectorAll('.minis, .grid, .row')) {
    const seen = new Set();
    for (const a of sec.querySelectorAll(':scope > a.mini')) {
      const h = (a.getAttribute('href') || '').split('?')[0];
      if (seen.has(h)) out.tiles.push(`2 tiles of 1 section link to the same entity: ${h}`);
      seen.add(h);
    }
  }
  // A tile has at most 1 badge (a quantity, a rate or a level).
  for (const sl of document.querySelectorAll('.slot')) if (sl.querySelectorAll('.qty, .tbadge').length > 1) out.tiles.push(`tile with more than 1 badge: ${desc(sl)}`);
  // The quantity of an item is a badge "×N" (N of 2 or more) on the bottom right corner of the item icon.
  for (const e of document.querySelectorAll('.qty')) {
    const t = e.textContent.trim();
    if (!/^×\d+$/.test(t) || Number(t.slice(1)) < 2) out.units.push(`quantity badge format: "${t}"`);
    const sl = e.parentElement.getBoundingClientRect(), b = e.getBoundingClientRect();
    if (!e.parentElement.matches('.slot') || b.right > sl.right + 1 || b.bottom > sl.bottom + 1 || sl.right - b.right > 8 || sl.bottom - b.bottom > 8) out.units.push(`quantity badge is not on the bottom right corner of the icon: "${t}"`);
  }
  // The values of the synthesis stats have their unit.
  for (const e of document.querySelectorAll('.syn-stats .val')) if (!e.querySelector('.money, .cost')) out.money.push(`synthesis value without unit: ${desc(e)}`);
  // From 768 px the header row of a research detail (the researchers, the friendship, the stats) is 1 row: its children have the same top (±4 px).
  out.rows = [];
  if (innerWidth >= 768) {
    for (const row of document.querySelectorAll('.modal .who')) {
      const tops = [...row.children].filter(vis).map((k) => k.getBoundingClientRect().top);
      if (tops.length && Math.max(...tops) - Math.min(...tops) > 4) out.rows.push(`header row is not 1 row: tops ${tops.map(Math.round).join(',')}`);
    }
  }
  // Round 6: no emoji or heart glyph in the page text (the friendship level is the heart icon of the game).
  out.emoji = [];
  const GLYPH = /[\u2764\u2665\u2661\u{1F300}-\u{1FAFF}]/u;
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w2.nextNode(); n; n = w2.nextNode()) {
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName) || !vis(el)) continue;
    if (GLYPH.test(n.textContent)) out.emoji.push(`glyph "${n.textContent.trim().slice(0, 30)}" in ${desc(el)}`);
  }
  // Round 6: no tooltip (data-tip or title) whose text is already visible in the element or, for an icon, next to it.
  out.tooltips = [];
  for (const e of document.querySelectorAll('[data-tip], [title]')) {
    if (!vis(e)) continue;
    const tipText = (e.getAttribute('data-tip') || e.getAttribute('title') || '').trim().toLowerCase();
    const near = ((e.textContent || '') + ' ' + (e.parentElement?.textContent || '')).toLowerCase();
    if (tipText && near.includes(tipText)) out.tooltips.push(`tooltip repeats visible text "${tipText}": ${desc(e)}`);
  }
  // Round 6: the text in the header bar, the section bars and the name plates has the same space above and below it (within 2 px), measured on the visible part of the texture, and it does not touch the ornaments.
  // The visible part of bar-brown.png is rows 22..97 of 107, of plate-gold.png rows 5..130 of 142.
  out.titles = [];
  for (const e of document.querySelectorAll('.hdr-bar, .bar, .zone-head, .name, a.area')) {
    if (!vis(e)) continue;
    const gold = e.matches('.name, a.area');
    const [top, bot, full] = gold ? [5, 130, 142] : [22, 97, 107];
    const r = e.getBoundingClientRect();
    const sc = parseFloat(getComputedStyle(e).getPropertyValue('--s'));
    const range = document.createRange();
    range.selectNodeContents(e.matches('.hdr-bar') ? e.querySelector('.site-name') : e);
    const t = range.getBoundingClientRect();
    if (!t.height) continue;
    // the top and the bottom of the texture are drawn at the edges of the border box
    const above = t.top - (r.top + top * sc), below = r.bottom - (full - bot) * sc - t.bottom;
    if (Math.abs(above - below) > 2) out.titles.push(`text space above ${above.toFixed(1)} / below ${below.toFixed(1)}: ${desc(e)}`);
    if (above < 2 || below < 2) out.titles.push(`text too close to the edge of the bar (${above.toFixed(1)} / ${below.toFixed(1)}): ${desc(e)}`);
    const orn = (gold ? 90 : 80) * sc;
    if (t.left < r.left + orn - 1 || t.right > r.right - orn + 1) out.titles.push(`text touches the ornaments: ${desc(e)}`);
  }
  // 4. every entity link and tile has an image that loaded
  for (const e of document.querySelectorAll('.mini, a.slot, .node, .el, .shop, .person, .card')) {
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
  const SP = '.page, .hdr-bar, .nav, .nav a, .toolbar, .srow, .search, .fgroup, .opts, .toggle, .btn, .stat, .ul, .uv, .gridwrap, .grid, .mini, .zones, .zone-in, .zone-head, .areas, a.area, .modal-body, .mhead, .name, .bar, .grp, .gh, .minis, .cols, .row, .link, .chip, .chips, .desc, .top, .facts, .sold, .shop, .reduce, .el, .money, .cost, .fr, .syn, .syn-stats, .panel, .panel-head, .panel-cols, .col, .jn, .qty, .unlock, .ul, .uv, .disp, .dcol, .drs, .dr, .who, .need, .person, .conds, .crumb, .diffline, .diffs, .diff, .home, a.card, .card-tx, .treein, .treescroll, .node, #main, #main > *';
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
  // The title of a game is in italics everywhere it shows.
  for (const e of document.querySelectorAll('.game-title')) if (vis(e) && getComputedStyle(e).fontStyle !== 'italic') out.italic.push(`game title not italic: ${desc(e)}`);
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
      charFull: D.chars.find((c) => c.skills.some((s) => s.ev) && c.join && c.join.pop > 0 && c.join.turn > 0) || D.chars.find((c) => c.skills.length && c.join && c.join.pop > 0),
      resFriend,
      resCond,
      charStory: D.chars.find((c) => c.n === 'Gino'),
      charAlone: D.chars.find((c) => c.join && c.join.story && !c.join.with.length),
      charPop: D.chars.find((c) => c.join && !c.join.story && c.join.pop > 0),
      dusky: Object.values(D.research).find((r) => r.n === 'Dusky Barrier Breaker'),
    };
    return Object.fromEntries(Object.entries({ ...names, ...extra }).map(([k, v]) => [k, v ? { id: v.id, n: v.n } : null]));
  });
