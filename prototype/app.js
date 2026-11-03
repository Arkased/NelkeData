/* Prototype app, round 4: hash routing, 6 views (home, items, areas, monsters, characters, research) on the real data (window.DATA).
   Recipes are part of the item (decision 0008): the item modal has the Synthesis section.
   An area is one spot of the game data: "Life Spring: Interior" is not part of "Life Spring".
   Units, 1 format each: money = coin icon + number; synthesis cost = its icon + number; rate = N%; quantity = "N needed" / "N per drop" / "N given";
   duration = "N turns"; level = "Lv N"; friendship = heart + number. */
(() => {
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  /** At most 1 decimal, no float artifacts, thousands separated. */
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const IT = new Map(D.items.map((i) => [i.id, i]));
  const RS = D.research;
  const ZONE = new Map();
  const AREA = new Map();
  for (const z of D.zones) {
    ZONE.set(z.id, z);
    for (const a of z.areas) AREA.set(a.id, { ...a, zone: z });
  }
  /** Monster id -> the areas where it lives, with its level range there. */
  const HABITAT = new Map();
  for (const z of D.zones) {
    for (const a of z.areas) for (const m of a.mons) (HABITAT.get(m.m) || HABITAT.set(m.m, []).get(m.m)).push({ area: a.id, lo: m.lo, hi: m.hi });
  }
  /** Monster id -> the items it drops. */
  const DROPS = new Map();
  for (const i of D.items) for (const d of i.drops) (DROPS.get(d.m) || DROPS.set(d.m, []).get(d.m)).push({ id: i.id, num: d.num, rate: d.rate });
  const ELEMENT_IDS = ['ITEM_MAT_ELEMENT_FIRE', 'ITEM_MAT_ELEMENT_WATER', 'ITEM_MAT_ELEMENT_AIR', 'ITEM_MAT_ELEMENT_SOIL'];
  const ELEMENT_NAMES = ['Fire', 'Water', 'Wind', 'Earth'];
  /** The shops (the sale flags of the item data), in the order of the game list. The icons are the item category icons of the game (0 General, 1 Grocery, 2 Weapon/Armor, 3 Medicine, 4 Clothing). */
  const SHOP = {
    GSTORE_SALE_FLAG: { label: 'General Store', img: 'shop-general' },
    ASHOP_SALE_FLAG: { label: 'Weapon/Armor Shop', img: 'shop-weapon' },
    GRSTORE_SALE_FLAG: { label: 'Grocery Store', img: 'shop-grocery' },
    CSTORE_SALE_FLAG: { label: 'Clothing Store', img: 'shop-clothing' },
    DRSTORE_SALE_FLAG: { label: 'Medicine Shop', img: 'shop-medicine' },
  };
  // Category order of the filter. The 4 element items are in Material (decision 0008).
  const CATS = ['Material', 'Merchandise', 'Battle Item', 'Construction'];
  // The game category icons (win03_icon01 list): cat-N.png.
  const CAT_ICON = { Material: 5, Merchandise: 2, 'Battle Item': 8, Construction: 1, craft: 11 };
  const FACE_MONSTER = D.monsters[Object.keys(D.monsters)[0]].icon;
  const FACE_CHAR = D.chars[0].icon;
  const NAV = [
    { k: 'items', label: 'Items', href: '#/items', cat: 15 },
    { k: 'areas', label: 'Areas', href: '#/areas', cat: 16 },
    { k: 'monsters', label: 'Monsters', href: '#/monsters', face: FACE_MONSTER },
    { k: 'characters', label: 'Characters', href: '#/characters', face: FACE_CHAR },
    { k: 'research', label: 'Research', href: '#/research/main', cat: 10 },
  ];
  const BLURB = {
    items: 'Prices, recipes and where each item comes from.',
    areas: 'The gather items, monsters and dispatch data of each area.',
    monsters: 'Drops, and the areas where they live.',
    characters: 'Alchemists, townsfolk and the research they do.',
    research: 'The 4 research trees and what each research needs and gives.',
  };
  /** The research trees. The names are the tab texts of the study screen (ui_en/20th_mix/uil_20th_study_1031.xml, text_on): Main, Attack, Town Building, Emergency. */
  const TREES = [
    { key: 'main', label: 'Main' },
    { key: 'attack', label: 'Attack' },
    { key: 'support', label: 'Town Building' },
    { key: 'emergency', label: 'Emergency' },
  ];
  /** The exploration gimmicks that give rare items (expl_gimmick type). The labels are the game terms of MESSAGE_EXPLORATION_21 to 24 ("How to Obtain"). */
  const GIMMICK = {
    BOX: { label: 'Treasure', unit: 'Chest' },
    BUG: { label: 'Bug Net', unit: 'Spot' },
    DIG: { label: 'Digging', unit: 'Spot' },
    FISH: { label: 'Fishing', unit: 'Spot' },
  };
  const GIMMICK_ORDER = ['BOX', 'BUG', 'DIG', 'FISH'];
  /** An internal id of the game files (EVENT_MM00_110): it never shows to the user. */
  const INTERNAL_ID = /\b[A-Z][A-Z0-9]+(_[A-Z0-9]+)+\b/;
  const CHAR_TYPES = ['Main', 'Story', 'Alchemist', 'Townsfolk', 'Fairy'];

  let base = null; // { view, key, hash, tree }
  let viewKey = '';
  let lastFocus = null;
  const st = { cat: [], shop: [], craft: false, q: '', aq: '', mq: '', mk: '', cq: '', ck: [] };

  // ---------- small parts ----------
  const icon = (f) => `img/icons/${f}`;
  const catImg = (n, cls = '') => `<img class="cat ${cls}" src="img/ui/cat-${n}.png" alt="">`;
  /** An item icon or a face, with no frame. href makes it a link; tip is the hover and screen reader name. */
  /** The face files have a transparent margin in a 128 px canvas: the monster portraits fill 76 px, the character faces 113 px. */
  const crop = (f) => (f && f.startsWith('monster_') ? 'm76' : f && f.startsWith('npc_') ? 'n113' : '');
  function slot(o) {
    const tag = o.href ? 'a' : 'span';
    const tip = o.tip ? ` data-tip="${esc(o.tip)}" aria-label="${esc(o.tip)}"` : '';
    return `<${tag} class="slot ${crop(o.icon)} ${o.cls || ''}"${o.href ? ` href="${o.href}"` : ''}${tip}>${o.icon ? `<img src="${icon(o.icon)}" alt="">` : ''}</${tag}>`;
  }
  /** The tile of an entity, used everywhere: icon, name (at most 2 lines), then at most 1 value line (val) right under the name. It is 1 link when it has a page. */
  function ent(o) {
    const tag = o.href ? 'a' : 'div';
    const tip = o.name.length > 14 ? ` data-tip="${esc(o.name)}"` : '';
    return `<${tag} class="mini ${o.cls || ''}"${o.href ? ` href="${o.href}"` : ''}${tip}><span class="slot ${crop(o.icon)}">${o.icon ? `<img src="${icon(o.icon)}" alt="">` : ''}</span><span class="nm">${esc(o.name)}</span>${o.val ? `<small>${o.val}</small>` : ''}</${tag}>`;
  }
  /** The icon of a research: the same as its node in the tree (the face of the first researcher, else the item that it gives). */
  const resIcon = (n) => (n.who[0] ? n.who[0].icon : n.prizeItem ? IT.get(n.prizeItem.id).icon : '');
  const resEnt = (id, o = {}) => {
    const n = RS[id];
    return ent({ href: `#/research/${n.tree}/${id}`, icon: resIcon(n), name: n.n, ...o });
  };
  const charEnt = (c, o = {}) => ent({ href: `#/characters/${c.id}`, icon: c.icon, name: c.n, ...o });
  const icoLink = (href, ic, name) => `<a class="tl" href="${href}"><img class="ico" src="${icon(ic)}" alt="">${esc(name)}</a>`;
  const itemEnt = (id, o = {}) => {
    const it = IT.get(id);
    return ent({ href: `#/items/${id}`, icon: it.icon, name: it.n, ...o });
  };
  const monEnt = (id, o = {}) => {
    const m = D.monsters[id];
    return ent({ href: `#/monsters/${id}`, icon: m.icon, name: m.n, ...o });
  };
  const itemLink = (id) => icoLink(`#/items/${id}`, IT.get(id).icon, IT.get(id).n);
  const bar = (text) => `<div class="bar bi p-brown">${esc(text)}</div>`;
  // units
  const coin = '<img class="ico" src="img/ui/coin.png" alt="Cole">';
  const money = (n, cls = '') => `<span class="money ${cls}">${coin}${fmt(n)}</span>`;
  const costU = (n, cls = '') => `<span class="cost ${cls}"><img class="ico" src="img/ui/cost.png" alt="Synthesis cost">${fmt(n)}</span>`;
  const pct = (n) => `<span class="rate">${fmt(n)}%</span>`;
  const turns = (n) => `${n} turn${n === 1 ? '' : 's'}`;
  const lvRange = (lo, hi) => `Lv ${lo === hi ? lo : `${lo}-${hi}`}`;
  /** Friendship as the game heart and a number. */
  /** The value line of a drop tile: 1 line, the quantity and the rate. */
  const dropVal = (d) => `${fmt(d.num)} per drop · ${pct(d.rate)}`;
  const heart = (n) => `<span class="fr" role="img" aria-label="Friendship ${n}"><img src="img/ui/fav-icon.png" alt=""><b>${n}</b></span>`;
  const shopChip = (key) => `<span class="shop"><img src="img/ui/${SHOP[key].img}.png" alt="">${SHOP[key].label}</span>`;
  /** A group of a modal: a title, then the content. No caption (the title says what it is). */
  const grp = (title, body) => `<section class="grp"><div class="gh"><b>${esc(title)}</b></div>${body}</section>`;
  /** The 1 style of a small label. */
  const cap = (text, cls = '') => `<small class="cap ${cls}">${esc(text)}</small>`;
  const head = (name) => `<div class="mhead"><h2 class="name bi p-gold">${esc(name)}</h2><button class="close btn" data-close aria-label="Close">&times;</button></div>`;
  const searchBox = (q, ph) => `<label class="search">${catImg(9)}<input type="search" id="q" placeholder="${ph}" value="${esc(q)}" autocomplete="off" aria-label="Search by name"></label>`;
  /** The unlock of a zone: "From the start", or "After task N" with the name of the task. */
  const opens = (z) => (z.task ? `After task ${z.task}${z.taskName ? `: ${z.taskName}` : ''}` : 'From the start');
  /** Below 600 px the filter groups are behind this button (CSS); the badge shows the number of active filters. */
  const filtersBtn = () => '<button class="btn ftoggle" id="ftoggle" aria-expanded="false" aria-controls="fpanel"><span>Filters</span><b class="badge" hidden>0</b></button>';
  const setFilterCount = (n) => {
    const b = $('#ftoggle .badge');
    b.hidden = !n;
    b.textContent = n;
    $('#ftoggle').setAttribute('aria-label', n ? `Filters, ${n} active` : 'Filters');
  };
  const wireFilters = () => $('#ftoggle').addEventListener('click', () => $('#ftoggle').setAttribute('aria-expanded', $('.toolbar').classList.toggle('fopen')));
  const tg = (attr, val, label, on, ic) => `<button class="toggle" ${attr}="${esc(val)}" aria-pressed="${on}">${ic || ''}<span>${esc(label)}</span></button>`;

  // ---------- tooltip ----------
  const tip = $('#tip');
  function showTip(el) {
    tip.textContent = el.dataset.tip;
    tip.classList.add('show');
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const x = Math.max(4, Math.min(innerWidth - tw - 4, r.left + r.width / 2 - tw / 2));
    let y = r.top - tip.offsetHeight - 4;
    if (y < 4) y = r.bottom + 4;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }
  const hideTip = () => tip.classList.remove('show');
  document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-tip]'); el ? showTip(el) : hideTip(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('focusout', hideTip);
  addEventListener('scroll', hideTip, true);
  addEventListener('hashchange', hideTip);

  // ---------- header ----------
  function renderNav() {
    $('#nav').innerHTML = NAV.map((n) => {
      const on = base && base.view === n.k;
      const ic = n.face ? slot({ icon: n.face, cls: 'navface' }) : catImg(n.cat);
      return `<a href="${n.href}" ${on ? 'aria-current="page"' : ''}>${ic}<span>${n.label}</span></a>`;
    }).join('');
  }
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) $('#nav').classList.remove('open'); });
  $('#menu').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    $('#menu').setAttribute('aria-expanded', open);
  });

  // ---------- home ----------
  function homePage() {
    $('#main').innerHTML = `<div class="home">${NAV.map((n) => `<a class="card bi p-gold" href="${n.href}"><span class="card-ic">${n.face ? slot({ icon: n.face }) : catImg(n.cat)}</span><span class="card-tx"><b>${n.label}</b><small>${BLURB[n.k]}</small></span></a>`).join('')}</div>`;
  }

  // ---------- items page (filters live in the hash query) ----------
  const qsOf = () => {
    const p = new URLSearchParams();
    if (st.cat.length) p.set('cat', st.cat.join(','));
    if (st.shop.length) p.set('shop', st.shop.join(','));
    if (st.craft) p.set('craft', '1');
    if (st.q.trim()) p.set('q', st.q.trim());
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const readQs = (qs) => {
    const p = new URLSearchParams(qs);
    st.cat = (p.get('cat') || '').split(',').filter((c) => CATS.includes(c));
    st.shop = (p.get('shop') || '').split(',').filter((c) => SHOP[c]);
    st.craft = p.get('craft') === '1';
    st.q = p.get('q') || '';
  };
  const itemHash = () => `#/items${qsOf()}`;
  function filterItems() {
    const s = st.q.trim().toLowerCase();
    return D.items.filter((i) =>
      (!st.cat.length || st.cat.includes(i.cat)) &&
      (!st.shop.length || i.shops.some((x) => st.shop.includes(x))) &&
      (!st.craft || i.syn) &&
      (!s || i.n.toLowerCase().includes(s) || i.jp.includes(st.q.trim())));
  }
  function itemsPage() {
    const shopsUsed = Object.keys(SHOP).filter((s) => D.items.some((i) => i.shops.includes(s)));
    $('#main').innerHTML = `
      <div class="toolbar">
        <div class="srow">${searchBox(st.q, 'Search items')}${filtersBtn()}<button class="btn" id="reset" hidden>Clear filters</button></div>
        <div class="fpanel" id="fpanel"><div class="fgroup"><span class="cap">Category</span><div class="opts">${CATS.map((c) => tg('data-cat', c, c, st.cat.includes(c), catImg(CAT_ICON[c]))).join('')}</div></div>
        <div class="fgroup"><span class="cap">Sold at</span><div class="opts">${shopsUsed.map((s) => tg('data-shop', s, SHOP[s].label, st.shop.includes(s), `<img class="cat" src="img/ui/${SHOP[s].img}.png" alt="">`)).join('')}</div></div>
        <div class="fgroup"><span class="cap">Synthesis</span><div class="opts">${tg('data-craft', '1', 'Craftable', st.craft, catImg(CAT_ICON.craft))}</div></div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const list = filterItems();
      const qs = qsOf();
      $('#reset').hidden = !qs;
      setFilterCount(st.cat.length + st.shop.length + (st.craft ? 1 : 0));
      $('#grid').innerHTML = list.length
        ? list.map((i) => ent({ href: `#/items/${i.id}${qs}`, icon: i.icon, name: i.n, cls: 'cell' })).join('')
        : `<div class="empty">Nothing matches the filters.</div>`;
      document.querySelectorAll('.toolbar .toggle').forEach((b) => {
        const on = b.dataset.cat ? st.cat.includes(b.dataset.cat) : b.dataset.shop ? st.shop.includes(b.dataset.shop) : st.craft;
        b.setAttribute('aria-pressed', on);
      });
      base = { ...base, hash: itemHash(), key: `items${qs}` };
      viewKey = base.key;
      history.replaceState(null, '', itemHash());
    };
    const flip = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    const clear = () => { st.cat = []; st.shop = []; st.craft = false; st.q = ''; $('#q').value = ''; draw(); };
    draw();
    wireFilters();
    $('#q').addEventListener('input', (e) => { st.q = e.target.value; draw(); });
    $('.toolbar').addEventListener('click', (e) => {
      const b = e.target.closest('.toggle');
      if (b) {
        if (b.dataset.cat) st.cat = flip(st.cat, b.dataset.cat);
        else if (b.dataset.shop) st.shop = flip(st.shop, b.dataset.shop);
        else st.craft = !st.craft;
        draw();
      } else if (e.target.closest('#reset')) clear();
    });
  }

  // ---------- areas page ----------
  function areasPage() {
    $('#main').innerHTML = `
      <div class="toolbar">${searchBox(st.aq, 'Search areas')}</div>
      <div class="zones" id="zones"></div>`;
    const draw = () => {
      const q = st.aq.trim().toLowerCase();
      const html = D.zones.map((z) => {
        const areas = z.areas.filter((a) => !q || a.n.toLowerCase().includes(q) || z.n.toLowerCase().includes(q));
        if (!areas.length) return '';
        return `<section class="zone bi u p-star" aria-label="${esc(z.n)}"><div class="zone-in">
          <a class="zone-head bi p-brown" href="#/areas/${z.id}"><h2>${esc(z.n)}</h2></a>
          <div class="areas">${areas.map((a) => `<a class="area bi p-gold" href="#/areas/${a.id}"><span>${esc(a.n)}</span></a>`).join('')}</div>
        </div></section>`;
      }).join('');
      $('#zones').innerHTML = html || `<div class="empty">Nothing matches the search.</div>`;
    };
    draw();
    $('#q').addEventListener('input', (e) => { st.aq = e.target.value; draw(); });
  }

  // ---------- monsters and characters pages ----------
  function monstersPage() {
    $('#main').innerHTML = `
      <div class="toolbar">
        <div class="srow">${searchBox(st.mq, 'Search monsters')}${filtersBtn()}</div>
        <div class="fpanel" id="fpanel"><div class="fgroup"><span class="cap">Type</span><div class="opts">${[['', 'All'], ['monster', 'Monsters'], ['boss', 'Bosses']].map(([v, l]) => tg('data-mk', v, l, st.mk === v)).join('')}</div></div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const q = st.mq.trim().toLowerCase();
      const list = Object.entries(D.monsters).filter(([, m]) => (!st.mk || (st.mk === 'boss') === m.boss) && (!q || m.n.toLowerCase().includes(q)));
      $('#grid').innerHTML = list.length ? list.map(([id, m]) => ent({ href: `#/monsters/${id}`, icon: m.icon, name: m.n, cls: `cell${m.boss ? ' boss' : ''}` })).join('') : '<div class="empty">Nothing matches the filters.</div>';
      document.querySelectorAll('.toolbar [data-mk]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mk === st.mk));
      setFilterCount(st.mk ? 1 : 0);
    };
    draw();
    wireFilters();
    $('#q').addEventListener('input', (e) => { st.mq = e.target.value; draw(); });
    $('.toolbar').addEventListener('click', (e) => { const b = e.target.closest('[data-mk]'); if (b) { st.mk = b.dataset.mk; draw(); } });
  }
  function charactersPage() {
    const types = CHAR_TYPES.filter((t) => D.chars.some((c) => c.type === t));
    $('#main').innerHTML = `
      <div class="toolbar">
        <div class="srow">${searchBox(st.cq, 'Search characters')}${filtersBtn()}</div>
        <div class="fpanel" id="fpanel"><div class="fgroup"><span class="cap">Type</span><div class="opts">${types.map((t) => tg('data-ck', t, t, st.ck.includes(t))).join('')}</div></div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const q = st.cq.trim().toLowerCase();
      const list = D.chars.filter((c) => (!st.ck.length || st.ck.includes(c.type)) && (!q || c.n.toLowerCase().includes(q)));
      $('#grid').innerHTML = list.length ? list.map((c) => ent({ href: `#/characters/${c.id}`, icon: c.icon, name: c.n, cls: 'cell' })).join('') : '<div class="empty">Nothing matches the filters.</div>';
      document.querySelectorAll('.toolbar [data-ck]').forEach((b) => b.setAttribute('aria-pressed', st.ck.includes(b.dataset.ck)));
      setFilterCount(st.ck.length);
    };
    draw();
    wireFilters();
    $('#q').addEventListener('input', (e) => { st.cq = e.target.value; draw(); });
    $('.toolbar').addEventListener('click', (e) => { const b = e.target.closest('[data-ck]'); if (b) { st.ck = st.ck.includes(b.dataset.ck) ? st.ck.filter((x) => x !== b.dataset.ck) : [...st.ck, b.dataset.ck]; draw(); } });
  }

  // ---------- research tree ----------
  const CW = 104, NODE_H = 126, CONN_H = 36, CY = 38; // column width, node row height, connector row height, line height inside a node row
  const SIDES = { HORIZONTAL: 'R', VERTICAL: 'UD', RIGHT_UP: 'RU', RIGHT_DOWN: 'RD', LEFT_UP: 'LU', LEFT_DOWN: 'LD' };
  function researchPage(treeKey) {
    const tree = D.trees[treeKey];
    const ys = []; let y = 0;
    for (let r = 0; r < tree.res.length; r++) { ys.push(y); y += r % 2 === 0 ? NODE_H : CONN_H; }
    let lastRow = 0;
    tree.res.forEach((row, r) => { if (r % 2 === 0 && row.some((id) => id && RS[id])) lastRow = r; });
    // The box fits the tree: the columns up to the last one that has a node or a line, and the rows up to the last node row.
    let lastCol = 0;
    for (let r = 0; r <= lastRow; r++) for (let c = 0; c < 20; c++) if (tree.res[r][c] || tree.con[r][c]) lastCol = Math.max(lastCol, c);
    const W = (lastCol + 1) * CW;
    let H = ys[lastRow] + NODE_H;
    const sides = (r, c) => (tree.con[r][c] ? SIDES[tree.con[r][c]] || '' : '');
    const lines = [];
    for (let r = 0; r < tree.res.length; r++) {
      for (let c = 0; c < 20; c++) {
        const own = sides(r, c);
        if (!(tree.res[r][c] || own)) continue;
        const cx = c * CW + CW / 2;
        const top = ys[r], odd = r % 2 === 1;
        const cy = odd ? top + CONN_H / 2 : top + CY;
        const bottom = top + (odd ? CONN_H : NODE_H);
        const segs = [];
        if (own.includes('R')) segs.push([c * CW + CW, cy]);
        if (c > 0 && sides(r, c - 1).includes('R')) segs.push([c * CW, cy]);
        // A node's line up reaches the foot of the node above, so a join is never left half drawn.
        if (own.includes('U') && r > 0) segs.push([cx, !odd && tree.res[r][c] && RS[tree.res[r][c]] && r > 1 ? top - CONN_H - 8 : top]);
        if (own.includes('D')) segs.push([cx, bottom]);
        for (const [x2, y2] of segs) {
          // A line that leaves a node downwards starts under its label, never through the text.
          const hasNode = !odd && tree.res[r][c] && RS[tree.res[r][c]];
          const y1 = hasNode && x2 === cx && y2 > cy ? bottom - 8 : cy;
          lines.push(`<line x1="${cx}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
        }
      }
    }
    const nodes = [];
    for (let r = 0; r < tree.res.length; r += 2) {
      for (let c = 0; c < 20; c++) {
        const id = tree.res[r][c];
        if (!id || !RS[id]) continue;
        const n = RS[id];
        const face = resIcon(n);
        nodes.push(`<a class="node" href="#/research/${treeKey}/${id}" style="left:${c * CW}px;top:${ys[r]}px"><span class="slot ${crop(face)}">${face ? `<img src="${icon(face)}" alt="">` : ''}</span><span class="nm">${esc(n.n)}</span></a>`);
      }
    }
    $('#main').innerHTML = `
      <div class="toolbar"><div class="fgroup"><span class="cap">Tree</span><div class="opts">${TREES.map((t) => `<a class="toggle" href="#/research/${t.key}" aria-pressed="${t.key === treeKey}">${t.label}</a>`).join('')}</div></div></div>
      <div class="treebox bi u p-tan"><div class="treein">
        <div class="treescroll"><div class="tree" style="width:${W}px;height:${H}px">
          <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="#9a6a35" stroke-width="7" stroke-linecap="round" aria-hidden="true">${lines.join('')}</svg>
          ${nodes.join('')}
        </div></div>
      </div></div>`;
    // The height ends at the foot of the lowest node (its name can take 2 or 3 lines).
    const treeEl = $('.tree');
    H = Math.max(...[...treeEl.querySelectorAll('.node')].map((n) => n.offsetTop + n.offsetHeight));
    treeEl.style.height = `${H}px`;
    const svg = $('svg', treeEl);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  // ---------- modals ----------
  /** The Synthesis block of a craftable item: the cost and the materials, then the value as a ledger, then the unlock. */
  function synthesis(it) {
    const s = it.syn;
    const u = s.unlock;
    const pos = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
    const row = (op, label, v, cls = '') => `<div class="lr ${cls}"><span class="op">${op}</span><span class="lb">${label}</span><b class="val">${v}</b></div>`;
    let h = bar('Synthesis') + '<div class="syn">';
    h += `<div class="syn-top"><div class="bigstat">${cap('Synthesis cost')}<b>${costU(s.cost)}</b></div><div class="row mats">${s.mats.map((m) => itemEnt(m.id, { val: `${fmt(m.q)} needed` })).join('')}</div></div>`;
    h += '<div class="syn-body"><div class="syn-val">';
    if (s.added === null) {
      // No selling price: the value is not calculated, and the only known row is the material cost.
      h += `<div class="ledger">${row('', 'Material cost', money(s.input))}</div>`;
    } else {
      h += `<div class="ledger">
        ${row('', 'Selling price', money(s.price))}
        ${row('&minus;', 'Material cost', money(s.input))}
        ${row('=', 'Added value', money(s.added), `sum ${pos(s.added)}`)}
        ${s.per === null ? '' : `${row('&divide;', 'Synthesis cost', costU(s.cost))}${row('=', 'Value per cost', `${money(s.per)}<span class="per">per</span><img class="ico" src="img/ui/cost.png" alt="Synthesis cost">`, `sum ${pos(s.per)}`)}`}
      </div>`;
    }
    if (s.unpriced.length) h += `<div class="ul">${cap('Counted as 0 (no price)')}<span class="uv wrap">${s.unpriced.map(itemLink).join('')}</span></div>`;
    h += '</div>';
    const bits = [];
    const ul = (c, body) => `<div class="ul">${cap(c)}${body}</div>`;
    if (u) {
      if (u.set) bits.push(ul('Recipe set', `<span class="uv">${esc(u.set)}</span>`));
      if (u.teacher) bits.push(ul('Taught by', `<span class="uv">${slot({ icon: u.tIcon, tip: u.teacher })}<span>${esc(u.teacher)}</span>${u.friendship > 0 ? heart(u.friendship) : ''}</span>`));
      if (s.researchId) bits.push(ul(`Research${u.researcher ? ` (${u.researcher})` : ''}`, `<span class="uv">${icoLink(`#/research/${RS[s.researchId].tree}/${s.researchId}`, resIcon(RS[s.researchId]), u.research || RS[s.researchId].n)}</span>`));
      else if (u.research) bits.push(ul('Research', `<span class="uv">${esc(u.research)}</span>`));
      // An event with no name in the game files is an internal id: it shows as "An event", never as the id.
      if (u.event) bits.push(ul('Event', `<span class="uv">${INTERNAL_ID.test(u.event) ? 'An event' : esc(u.event)}</span>`));
    }
    h += `${bits.length ? `<div class="unlock">${bits.join('')}</div>` : ''}</div></div>`;
    return h;
  }

  /** The rare finds of a zone, 1 group for each gimmick type. */
  function rareGroups(z) {
    return GIMMICK_ORDER.map((t) => {
      const tables = z.rare.filter((r) => r.t === t);
      if (!tables.length) return '';
      const g = GIMMICK[t];
      const body = tables.map((tb) => `<div class="tbl">${tables.length > 1 ? cap(`${g.unit} ${tb.n}`) : ''}<div class="minis">${tb.items.map((x) => itemEnt(x.i, { val: pct(x.r) })).join('')}</div></div>`).join('');
      return grp(g.label, body);
    }).join('');
  }

  /** The element icon with its name under it (expl_area.xml ele_00..03 flags, in the order Fire, Water, Wind, Earth). */
  const elmIcon = (k, val = '') => `<span class="elm" data-tip="${ELEMENT_NAMES[k]}"><span class="slot">${IT.has(ELEMENT_IDS[k]) ? `<img src="${icon(IT.get(ELEMENT_IDS[k]).icon)}" alt="">` : ''}</span>${val ? `<b>${ELEMENT_NAMES[k]}</b>` : ''}<small>${val || ELEMENT_NAMES[k]}</small></span>`;

  /**
   * The dispatch data of a zone: the elements of the area (expl_area.xml ele_00..03).
   * The element rating table (expl_send_element.xml) is the same on every area, so it does not show here.
   */
  function dispatch(z) {
    const els = z.ele.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
    if (!els.length) return '';
    return grp('Area element', `<div class="elms">${els.map((k) => elmIcon(k)).join('')}</div>`);
  }

  function itemModal(id) {
    const it = IT.get(id);
    if (!it) return null;
    const elems = it.red.map((v, k) => ({ v, id: ELEMENT_IDS[k] })).filter((e) => e.v > 0 && IT.has(e.id));
    const gathers = [...it.gather].sort((a, b) => b.rate - a.rate);
    const catText = it.sub && !it.sub.toLowerCase().includes(it.cat.toLowerCase()) ? `${it.cat} · ${it.sub}` : it.sub || it.cat;
    let h = head(it.n);
    h += `<div class="top">${slot({ icon: it.icon })}
      <div class="facts">
        <span class="catline">${catImg(CAT_ICON[it.cat])}${esc(catText)}</span>
        ${it.price > 0 ? money(it.price, 'price') : ''}
        ${it.shops.length ? `<span class="sold">${cap('Sold at')}${it.shops.filter((s) => SHOP[s]).map(shopChip).join('')}</span>` : ''}
        ${elems.length ? `<span class="reduce">${cap('Reduces into')}<span class="els">${elems.map((e) => `<a class="el" href="#/items/${e.id}" data-tip="${esc(IT.get(e.id).n)}"><img src="${icon(IT.get(e.id).icon)}" alt="${esc(IT.get(e.id).n)}"><b>${fmt(e.v)}</b></a>`).join('')}</span></span>` : ''}
      </div></div>`;
    if (it.desc) h += `<p class="desc">${esc(it.desc)}</p>`;
    if (it.syn) h += synthesis(it);
    const groups = [];
    if (gathers.length) {
      groups.push(grp('Gather', `<div class="cols">${gathers.map((g) => {
        const a = AREA.get(g.spot);
        return `<a class="link" href="#/areas/${a.id}"><span class="lt"><b>${esc(a.n)}</b><small>${esc(a.zone.n)}</small></span><span class="pct">${pct(g.rate)}</span></a>`;
      }).join('')}</div>`));
    }
    if (it.drops.length) {
      groups.push(grp('Monster drops', `<div class="minis">${it.drops.map((d) => monEnt(d.m, { val: dropVal(d) })).join('')}</div>`));
    }
    for (const t of GIMMICK_ORDER) {
      const rows = it.special.filter((e) => e.t === t);
      if (!rows.length) continue;
      const g = GIMMICK[t];
      groups.push(grp(g.label, `<div class="cols">${rows.map((e) => {
        const z = ZONE.get(e.z);
        const rates = [...new Set(e.r)].sort((a, b) => b - a).map(pct).join(' / ');
        return `<a class="link" href="#/areas/${z.id}"><span class="lt"><b>${esc(z.n)}</b></span><span class="pct">${rates}</span></a>`;
      }).join('')}</div>`));
    }
    if (it.farm) groups.push(grp('Farm', `<div class="chips"><span class="chip">${esc(it.farm)}</span></div>`));
    if (groups.length) h += bar('How to get') + groups.join('');
    if (it.usedIn.length) h += bar('Used in') + `<div class="minis">${it.usedIn.map((u) => itemEnt(u.i)).join('')}</div>`;
    return h;
  }

  function areaModal(id) {
    const a = AREA.get(id);
    if (a) {
      let h = head(a.n);
      h += `<div class="crumb left"><div class="stat">${cap('Zone')}<a class="tl" href="#/areas/${a.zone.id}">${esc(a.zone.n)}</a></div><div class="stat">${cap('Opens')}<span>${esc(opens(a.zone))}</span></div></div>`;
      h += `<div class="diffline"><span class="cap">Difficulty by area level</span><div class="diffs">${a.diff.map((d, i) => `<div class="diff"><b>${d}</b><span>${i + 1}</span></div>`).join('')}</div></div>`;
      const mon = (m) => monEnt(m.m, { val: lvRange(m.lo, m.hi) });
      if (a.gather.length) h += grp('Gather', `<div class="minis">${a.gather.map((g) => itemEnt(g.i, { val: pct(g.r) })).join('')}</div>`);
      // The tile has 1 value line (the level), so the monsters that only show from an area level are their own group.
      for (const [boss, title] of [[false, 'Monsters'], [true, 'Bosses']]) {
        const reqs = [...new Set(a.mons.filter((m) => !!m.boss === boss).map((m) => m.req || 0))].sort((x, y) => x - y);
        for (const req of reqs) {
          const list = a.mons.filter((m) => !!m.boss === boss && (m.req || 0) === req);
          h += grp(req ? `${title} from area level ${req}` : title, `<div class="minis${boss ? ' boss' : ''}">${list.map(mon).join('')}</div>`);
        }
      }
      h += dispatch(a.zone);
      h += rareGroups(a.zone);
      return h;
    }
    const z = ZONE.get(id);
    if (!z) return null;
    let h = head(z.n);
    h += `<div class="crumb left"><div class="stat">${cap('Opens')}<span>${esc(opens(z))}</span></div></div>`;
    h += grp('Areas', `<div class="cols">${z.areas.map((x) => `<a class="link" href="#/areas/${x.id}"><span class="lt"><b>${esc(x.n)}</b></span></a>`).join('')}</div>`);
    h += dispatch(z);
    h += rareGroups(z);
    return h;
  }

  function monsterModal(id) {
    const m = D.monsters[id];
    if (!m) return null;
    let h = head(m.n);
    h += `<div class="top">${slot({ icon: m.icon })}<div class="facts"><span class="catline">${m.boss ? 'Boss' : 'Monster'}</span><span class="catline">Rank ${m.rank}</span></div></div>`;
    if (m.desc) h += `<p class="desc">${esc(m.desc)}</p>`;
    const drops = DROPS.get(id) || [];
    // m.def: the element DEF in the order Fire, Water, Wind, Earth (btl_chara element_1..4). A monster with no battle data or only 0 has none.
    // An element with DEF 0 has no modifier, so it does not show.
    if (m.def) h += bar('Element DEF') + `<div class="elms">${m.def.map((v, k) => (v ? elmIcon(k, String(v)) : '')).join('')}</div>`;
    if (drops.length) h += bar('Drops') + `<div class="minis">${drops.map((d) => itemEnt(d.id, { val: dropVal(d) })).join('')}</div>`;
    const hab = HABITAT.get(id) || [];
    if (hab.length) {
      h += bar('Found in') + `<div class="cols">${hab.map((x) => { const a = AREA.get(x.area); return `<a class="link" href="#/areas/${a.id}"><span class="lt"><b>${esc(a.n)}</b><small>${esc(a.zone.n)}</small></span><span class="pct">${lvRange(x.lo, x.hi)}</span></a>`; }).join('')}</div>`;
    }
    return h;
  }

  function characterModal(id) {
    const c = D.chars.find((x) => x.id === id);
    if (!c) return null;
    let h = head(c.n);
    h += `<div class="top">${slot({ icon: c.icon })}<div class="facts"><span class="catline">${esc(c.type)}</span>${c.game ? `<span class="catline">${esc(c.game)}</span>` : ''}</div></div>`;
    if (c.desc) h += `<p class="desc">${esc(c.desc)}</p>`;
    if (c.apt.length) h += bar('Aptitudes') + `<div class="chips">${c.apt.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>`;
    if (c.skills.length) {
      h += bar('Skills') + `<div class="cols">${c.skills.map((s) => `<div class="link plain"><span class="lt"><b>${esc(s.n)}</b>${s.ev ? cap('Learned at an event') : ''}</span>${s.ev ? '' : `<span class="pct">Lv ${s.lv}</span>`}</div>`).join('')}</div>`;
    }
    if (c.join) {
      // The event of the join is an internal id with no player-facing name in the game files, so it does not show.
      const j = c.join;
      const st = (label, v) => `<div class="stat">${cap(label)}<span>${v}</span></div>`;
      const stats = [
        j.pop ? st('Town population', `${fmt(j.pop)} ${j.pop === 1 ? 'person' : 'people'}`) : '',
        j.turn ? st('Turn (not confirmed)', `Turn ${j.turn}`) : '',
      ].filter(Boolean);
      if (stats.length) h += bar('Joins the town') + `<div class="crumb left">${stats.join('')}</div>`;
    }
    // The game has no icon for a research (the tree cells show state icons only), so a research is a card with its name and its tree.
    const rs = Object.values(RS).filter((r) => r.who.some((w) => w.id === c.id));
    if (rs.length) {
      h += bar('Research') + `<div class="cols">${rs.map((r) => `<a class="link rcard" href="#/research/${r.tree}/${r.id}"><span class="lt"><b>${esc(r.n)}</b><small>${esc(TREES.find((t) => t.key === r.tree).label)}</small></span></a>`).join('')}</div>`;
    }
    // The recipe sets that the character teaches, with the items that their recipes make: 1 section, 1 label for each set.
    const taught = D.items.filter((i) => i.syn && i.syn.unlock && i.syn.unlock.teacher === c.nr);
    const sets = Object.entries(Object.groupBy(taught, (i) => i.syn.unlock.set || ''));
    if (sets.length) {
      h += bar('Teaches') + `<div class="sets">${sets.map(([set, list]) => `<div class="tbl${list.length > 1 ? ' multi' : ''}">${set ? cap(set) : ''}<div class="row">${list.map((i) => itemEnt(i.id)).join('')}</div></div>`).join('')}</div>`;
    }
    return h;
  }

  function researchModal(id) {
    const n = RS[id];
    if (!n) return null;
    let h = head(n.n);
    const stats = [];
    if (n.dur > 0) stats.push(`<div class="bigstat">${cap('Duration')}<b>${turns(n.dur)}</b></div>`);
    if (n.money > 0) stats.push(`<div class="bigstat">${cap('Research fee')}<b>${money(n.money)}</b></div>`);
    const person = (w) => {
      const c = D.chars.find((x) => x.id === w.id);
      return `<${c ? 'a' : 'div'} class="person"${c ? ` href="#/characters/${c.id}"` : ''}>${slot({ icon: w.icon, tip: w.n })}<span>${esc(w.n)}</span></${c ? 'a' : 'div'}>`;
    };
    h += `<div class="who">${n.who.map(person).join('')}${n.friendNeed > 0 ? `<div class="need">${cap('Total friendship')}${heart(n.friendNeed)}</div>` : ''}${stats.length ? `<div class="stats">${stats.join('')}</div>` : ''}</div>`;
    if (n.mats.length) h += bar('Materials') + `<div class="minis">${n.mats.map((m) => itemEnt(m.id, { val: `${fmt(m.q)} needed` })).join('')}</div>`;
    if (n.pre.length || n.conds.length) {
      h += bar('Requires');
      if (n.pre.length) h += `<div class="minis">${n.pre.filter((p) => RS[p]).map((p) => resEnt(p)).join('')}</div>`;
      if (n.conds.length) h += `<div class="conds">${n.conds.map((c) => `<div class="link plain"><span class="lt">${cap(c.k === 'district' ? 'District' : 'Request')}<b>${esc(c.v)}</b></span></div>`).join('')}</div>`;
    }
    if (n.set || n.prizeItem || n.bonus) {
      h += bar('Gives');
      if (n.set) h += grp(`Recipe set: ${n.set.n}`, `<div class="minis">${n.set.recipes.filter((i) => IT.has(i)).map((i) => itemEnt(i)).join('')}</div>`);
      // The sub-heading names the kind only when there is more than 1 kind of reward.
      const kinds = [n.set, n.prizeItem, n.bonus].filter(Boolean).length;
      const kind = (title, body) => (kinds > 1 ? grp(title, body) : body);
      if (n.prizeItem) h += kind('Item', `<div class="minis">${itemEnt(n.prizeItem.id, { val: `${fmt(n.prizeItem.q)} given` })}</div>`);
      if (n.bonus) h += kind('Bonus', `<div class="link plain"><span class="lt"><b>${esc(n.bonus)}</b></span></div>`);
    }
    return h;
  }

  // ---------- modal host ----------
  const root = $('#modal-root');
  function closeModal(go) {
    if (!root.firstChild) return;
    root.innerHTML = '';
    document.body.style.overflow = '';
    if (go && base) history.replaceState(null, '', base.hash);
    if (go) { route(); if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); }
  }
  function openModal(html) {
    if (!root.firstChild) lastFocus = document.activeElement;
    root.innerHTML = `<div class="overlay" data-overlay><div class="modal bi u p-star" role="dialog" aria-modal="true" tabindex="-1"><div class="modal-body">${html}</div></div></div>`;
    document.body.style.overflow = 'hidden';
    $('.modal', root).focus({ preventScroll: true });
  }
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-overlay]') || e.target.closest('[data-close]')) closeModal(true);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.firstChild) closeModal(true); });

  // ---------- routing ----------
  function parse() {
    const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const parts = path.split('/').filter(Boolean);
    const view = NAV.some((n) => n.k === parts[0]) ? parts[0] : 'home';
    if (view === 'home') return { view, key: 'home', hash: '#/home' };
    if (view === 'research') {
      const tree = D.trees[parts[1]] ? parts[1] : 'main';
      const id = parts[1] && !D.trees[parts[1]] ? null : parts[2];
      return { view, tree, id, key: `research/${tree}`, hash: `#/research/${tree}` };
    }
    return { view, id: parts[1], qs, key: view === 'items' ? `items${qs ? `?${qs}` : ''}` : view, hash: view === 'items' ? `#/items${qs ? `?${qs}` : ''}` : `#/${view}` };
  }
  function renderBase(b) {
    if (viewKey === b.key) return;
    viewKey = b.key;
    window.scrollTo(0, 0);
    if (b.view === 'home') homePage();
    else if (b.view === 'items') { readQs(b.qs || ''); itemsPage(); }
    else if (b.view === 'areas') areasPage();
    else if (b.view === 'monsters') monstersPage();
    else if (b.view === 'characters') charactersPage();
    else researchPage(b.tree);
  }
  function route() {
    const p = parse();
    if (p.id) {
      // A research node only opens over its own tree, so a pasted link never shows another page behind it.
      if (!base || (p.view === 'research' && base.view !== 'research')) base = { ...p, id: undefined };
      renderBase(base);
      renderNav();
      const html = { items: itemModal, areas: areaModal, research: researchModal, monsters: monsterModal, characters: characterModal }[p.view](p.id);
      if (html) openModal(html);
      else closeModal(true);
    } else {
      closeModal(false);
      // The page already shows this hash after a filter change, so it keeps its state.
      if (!(base && viewKey === p.key && p.view === 'items' && base.hash === p.hash)) base = p;
      renderBase(base);
      renderNav();
    }
    $('#nav').classList.remove('open');
  }
  addEventListener('hashchange', route);
  route();
})();
