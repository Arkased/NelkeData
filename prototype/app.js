/* Prototype app, round 6: hash routing, 5 views (items, areas, monsters, characters, research; the root shows items) on the real data (window.DATA).
   Recipes are part of the item (decision 0008): the item modal has the Synthesis section.
   An area is one spot of the game data: "Life Spring: Interior" is not part of "Life Spring".
   Units, 1 format each: money = coin icon + number; synthesis cost = its icon + number; rate = N%; quantity = a "×N" badge on the bottom right of the icon (N of 2 or more); rate and level = a badge on the bottom left of the icon;
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
    // A monster that the zone itself meets (no area of the zone): the habitat is the zone.
    for (const m of z.mons || []) (HABITAT.get(m.m) || HABITAT.set(m.m, []).get(m.m)).push({ area: z.id, lo: m.lo, hi: m.hi });
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
  /** The nav icons of Monsters and Characters are the quest category icons of the game (20th_main_quest.g1t, m_q01_icon02 LIST01 and LIST02). */
  const NAV = [
    { k: 'items', label: 'Items', href: '#/items', cat: 15 },
    { k: 'areas', label: 'Areas', href: '#/areas', cat: 16 },
    { k: 'monsters', label: 'Monsters', href: '#/monsters', img: 'nav-monsters' },
    { k: 'characters', label: 'Characters', href: '#/characters', img: 'nav-characters' },
    { k: 'research', label: 'Research', href: '#/research/main', cat: 10 },
  ];
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
  /** The groups of a character: Alchemist is the category 2 of the game, Townsfolk is each other category. */
  const CHAR_GROUPS = ['Alchemist', 'Townsfolk'];
  const groupOf = (c) => (c.type === 'Alchemist' ? 'Alchemist' : 'Townsfolk');

  let base = null; // { view, key, hash, tree }
  let viewKey = '';
  let lastFocus = null;
  const st = { cat: [], shop: [], craft: false, mk: '', cg: [] };

  // ---------- small parts ----------
  const icon = (f) => (f.startsWith('img/') ? f : `img/icons/${f}`);
  const catImg = (n, cls = '') => `<img class="cat ${cls}" src="img/ui/cat-${n}.png" alt="">`;
  /** An item icon or a face, with no frame. href makes it a link; tip is the hover and screen reader name. */
  /** The face files have a transparent margin in a 128 px canvas: the monster portraits fill 76 px, the character faces 113 px. */
  const crop = (f) => (f && f.startsWith('monster_') ? 'm76' : f && f.startsWith('npc_') ? 'n113' : '');
  function slot(o) {
    const tag = o.href ? 'a' : 'span';
    return `<${tag} class="slot ${crop(o.icon)} ${o.cls || ''}"${o.href ? ` href="${o.href}"` : ''}>${o.icon ? `<img src="${icon(o.icon)}" alt="">` : ''}</${tag}>`;
  }
  /** The tile of an entity, used everywhere: the icon with its badges (o.qty or o.badge, both on the bottom right: a rate or a level; a tile has 1 badge), then the name (at most 2 lines). No value line, no tooltip. It is 1 link when it has a page. */
  function ent(o) {
    const tag = o.href ? 'a' : 'div';
    const qty = o.qty >= 2 ? `<b class="qty">×${o.qty}</b>` : '';
    const badge = o.badge ? `<b class="tbadge">${esc(o.badge)}</b>` : '';
    return `<${tag} class="mini ${o.cls || ''}"${o.href ? ` href="${o.href}"` : ''}><span class="slot ${crop(o.icon)}">${o.icon ? `<img src="${icon(o.icon)}" alt="">` : ''}${badge}${qty}</span><span class="nm">${esc(o.name)}</span></${tag}>`;
  }
  /** The icon of a research: the icon of its output (the data picks the first prize item, else the first item of the prize recipe set, else the bonus item). With no output it is the Research icon of the nav. */
  const RES_NAV_ICON = 'img/ui/cat-10.png';
  const resIcon = (n) => n.icon || RES_NAV_ICON;
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
  /** A rate of 100% never shows: the item is certain, so these return an empty string. */
  const certain = (n) => fmt(n) === '100';
  const pct = (n) => (certain(n) ? '' : `<span class="rate">${fmt(n)}%</span>`);
  const pctText = (n) => (certain(n) ? '' : `${fmt(n)}%`);
  const turns = (n) => `${n} turn${n === 1 ? '' : 's'}`;
  const lvRange = (lo, hi) => `Lv ${lo === hi ? lo : `${lo}–${hi}`}`;
  /** The tile options of a drop: the quantity is the badge on the icon. Each drop rate is 100%, so the rate does not show. */
  const dropOpts = (d) => ({ qty: d.num });
  /** The shared friendship level: the game heart with the level on it in the digit sprites (favc-0 to favc-10). A level above 10 uses 1 sprite for each digit. No text node. */
  const heart = (n) => {
    const sprites = n <= 10 ? [n] : String(n).split('');
    return `<span class="fr" role="img" aria-label="Friendship ${n}"><img class="hb" src="img/ui/fav-icon.png" alt=""><span class="fd">${sprites.map((d) => `<img src="img/ui/favc-${d}.png" alt="">`).join('')}</span></span>`;
  };
  const shopChip = (key) => `<span class="shop"><img src="img/ui/${SHOP[key].img}.png" alt="">${SHOP[key].label}</span>`;
  /** A group of a modal: a title, then the content. No caption (the title says what it is). */
  const grp = (title, body) => `<section class="grp"><div class="gh"><b class="sub">${esc(title)}</b></div>${body}</section>`;
  /** The 1 style of a small label. */
  const cap = (text, cls = '') => `<small class="cap ${cls}">${esc(text)}</small>`;
  const head = (name) => `<div class="mhead"><h2 class="name bi p-gold">${esc(name)}</h2><button class="close btn" data-close aria-label="Close">&times;</button></div>`;
  /** The empty state of a category page: the text and the button that clears the filters (the page wires [data-clear]). */
  const emptyState = () => '<div class="empty">Nothing matches the filters.<button class="btn" data-clear>Clear filters</button></div>';
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

  /** The values of a filter: toggle buttons. */
  const filterOpts = (attr, values, selected) => values.map((t) => tg(attr, t, t, selected.includes(t))).join('');

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
      const ic = n.img ? `<img class="cat" src="img/ui/${n.img}.png" alt="">` : catImg(n.cat);
      return `<a href="${n.href}" ${on ? 'aria-current="page"' : ''}>${ic}<span>${n.label}</span></a>`;
    }).join('');
  }
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) $('#nav').classList.remove('open'); });
  $('#menu').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    $('#menu').setAttribute('aria-expanded', open);
  });

  // ---------- items page (filters live in the hash query) ----------
  const qsOf = () => {
    const p = new URLSearchParams();
    if (st.cat.length) p.set('cat', st.cat.join(','));
    if (st.shop.length) p.set('shop', st.shop.join(','));
    if (st.craft) p.set('craft', '1');
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const readQs = (qs) => {
    const p = new URLSearchParams(qs);
    st.cat = (p.get('cat') || '').split(',').filter((c) => CATS.includes(c));
    st.shop = (p.get('shop') || '').split(',').filter((c) => SHOP[c]);
    st.craft = p.get('craft') === '1';
  };
  const itemHash = () => `#/items${qsOf()}`;
  const filterItems = () => D.items.filter((i) =>
    (!st.cat.length || st.cat.includes(i.cat)) &&
    (!st.shop.length || i.shops.some((x) => st.shop.includes(x))) &&
    (!st.craft || i.syn));
  function itemsPage() {
    const shopsUsed = Object.keys(SHOP).filter((s) => D.items.some((i) => i.shops.includes(s)));
    $('#main').innerHTML = `
      <div class="toolbar">
        <div class="srow">${filtersBtn()}<button class="btn" id="reset" hidden>Clear filters</button></div>
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
        : emptyState();
      document.querySelectorAll('.toolbar .toggle').forEach((b) => {
        const on = b.dataset.cat ? st.cat.includes(b.dataset.cat) : b.dataset.shop ? st.shop.includes(b.dataset.shop) : st.craft;
        b.setAttribute('aria-pressed', on);
      });
      base = { ...base, hash: itemHash(), key: `items${qs}` };
      viewKey = base.key;
      history.replaceState(null, '', itemHash());
    };
    const flip = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    const clear = () => { st.cat = []; st.shop = []; st.craft = false; draw(); };
    draw();
    wireFilters();
    $('#grid').addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) clear(); });
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

  // ---------- about page ----------
  const REPO = 'https://github.com/Arkased/NelkeData';
  const GAME_TITLE = '<cite class="game-title">Nelke &amp; the Legendary Alchemists</cite>';
  /** The About page: 1 panel with the sections Contact, Source and Legal. */
  function aboutPage() {
    $('#main').innerHTML = `<div class="about-wrap"><div class="about bi u p-cream">
      <section>${bar('Contact')}<div class="atext"><p>Errors and questions go to the <a class="tl" href="${REPO}/issues">issues of the GitHub repository</a>.</p></div></section>
      <section>${bar('Source')}<div class="atext"><p><a class="tl" href="${REPO}">${REPO}</a></p><p>The data comes from the files of the Steam version of the game.</p></div></section>
      <section>${bar('Legal')}<div class="atext"><p>Unofficial fan site. We claim no affiliation with Koei Tecmo. The game data, images and texts are owned by Koei Tecmo, the copyright holder of ${GAME_TITLE}.</p></div></section>
    </div></div>`;
  }

  // ---------- areas page ----------
  function areasPage() {
    $('#main').innerHTML = '<div class="zones" id="zones"></div>';
    $('#zones').innerHTML = D.zones.map((z) => {
      const areas = z.areas;
      return `<section class="zone bi u p-star" aria-label="${esc(z.n)}"><div class="zone-in">
          <h2 class="bar zone-name"><a class="zone-link" href="#/areas/${z.id}">${esc(z.n)}</a></h2>
          <div class="areas">${areas.map((a) => `<a class="area bi p-gold" href="#/areas/${a.id}"><span>${esc(a.n)}</span></a>`).join('')}</div>
        </div></section>`;
    }).join('');
  }

  // ---------- monsters and characters pages ----------
  function monstersPage() {
    $('#main').innerHTML = `
      <div class="toolbar">
        ${filtersBtn()}
        <div class="fpanel" id="fpanel"><div class="fgroup"><span class="cap">Type</span><div class="opts">${[['', 'All'], ['monster', 'Monsters'], ['boss', 'Bosses']].map(([v, l]) => tg('data-mk', v, l, st.mk === v)).join('')}</div></div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const list = Object.entries(D.monsters).filter(([, m]) => !st.mk || (st.mk === 'boss') === m.boss);
      $('#grid').innerHTML = list.length ? list.map(([id, m]) => ent({ href: `#/monsters/${id}`, icon: m.icon, name: m.n, cls: `cell${m.boss ? ' boss' : ''}` })).join('') : emptyState();
      document.querySelectorAll('.toolbar [data-mk]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mk === st.mk));
      setFilterCount(st.mk ? 1 : 0);
    };
    draw();
    wireFilters();
    $('#grid').addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) { st.mk = ''; draw(); } });
    $('.toolbar').addEventListener('click', (e) => { const b = e.target.closest('[data-mk]'); if (b) { st.mk = b.dataset.mk; draw(); } });
  }
  /** The characters page keeps its filter in the hash query: group. */
  const charQs = () => {
    const p = new URLSearchParams();
    if (st.cg.length) p.set('group', st.cg.join(','));
    const q = p.toString();
    return q ? `?${q}` : '';
  };
  const readCharQs = (qs) => {
    const p = new URLSearchParams(qs);
    st.cg = (p.get('group') || '').split(',').filter((c) => CHAR_GROUPS.includes(c));
  };
  function charactersPage() {
    $('#main').innerHTML = `
      <div class="toolbar">
        ${filtersBtn()}
        <div class="fpanel" id="fpanel"><div class="fgroup"><span class="cap">Group</span><div class="opts">${filterOpts('data-cg', CHAR_GROUPS, st.cg)}</div></div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const qs = charQs();
      const list = D.chars.filter((c) => !st.cg.length || st.cg.includes(groupOf(c)));
      $('#grid').innerHTML = list.length ? list.map((c) => ent({ href: `#/characters/${c.id}${qs}`, icon: c.icon, name: c.n, cls: 'cell' })).join('') : emptyState();
      document.querySelectorAll('.toolbar .toggle[data-cg]').forEach((b) => b.setAttribute('aria-pressed', st.cg.includes(b.dataset.cg)));
      setFilterCount(st.cg.length);
      base = { ...base, hash: `#/characters${qs}`, key: `characters${qs}` };
      viewKey = base.key;
      history.replaceState(null, '', base.hash);
    };
    draw();
    wireFilters();
    $('#grid').addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) { st.cg = []; draw(); } });
    $('.toolbar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cg]');
      if (!b) return;
      st.cg = st.cg.includes(b.dataset.cg) ? st.cg.filter((x) => x !== b.dataset.cg) : [...st.cg, b.dataset.cg];
      draw();
    });
  }

  // ---------- research tree ----------
  // Layout: the node rows (0, 2, 4 of the game) are NODE_H high and the connector rows (1, 3) are CONN_H thin. The lines are drawn from the prerequisites
  // (stdy_conditions.xml), not from the connector cells: each line leaves the right side of the prerequisite icon and enters the left side of the research that needs it.
  // A vertical segment belongs to exactly 1 group: the fan-out of 1 source (a bus near the source) or the fan-in of 1 target (a bus near the target).
  // A source with 2 or more lines fans out; every other line goes down at the fan-in bus of its target. Two groups of 1 gap never share an x where their vertical extents meet.
  const CW = 128, NODE_H = 128, CONN_H = 16, CY = 40, HALF = 36, LANE0 = 26, LANE = 10, AH = 9; // column width (56 px between 2 icons), node row height, connector row height, icon center y in a node row, half icon width, first bus distance from the icon, distance between 2 buses of 1 gap, arrowhead length
  function researchPage(treeKey) {
    const tree = D.trees[treeKey];
    const ys = []; let y = 0;
    for (let r = 0; r < tree.res.length; r++) { ys.push(y); y += r % 2 === 0 ? NODE_H : CONN_H; }
    let lastRow = 0;
    let lastCol = 0;
    const pos = new Map();
    tree.res.forEach((row, r) => row.forEach((id, c) => {
      if (!id || !RS[id]) return;
      pos.set(id, { c, r });
      if (r % 2 === 0) lastRow = Math.max(lastRow, r);
      lastCol = Math.max(lastCol, c);
    }));
    const W = (lastCol + 1) * CW;
    let H = ys[lastRow] + NODE_H;
    const edges = [];
    for (const [id, to] of pos) {
      for (const pre of RS[id].pre) {
        const from = pos.get(pre);
        if (from) edges.push({ pre, id, from, to, y1: ys[from.r] + CY, y2: ys[to.r] + CY });
      }
    }
    const outDeg = new Map();
    for (const e of edges) outDeg.set(e.pre, (outDeg.get(e.pre) ?? 0) + 1);
    // The groups: a fan-out per source with 2 or more lines, a fan-in per target for the other lines.
    const groups = new Map();
    for (const e of edges) {
      const out = outDeg.get(e.pre) > 1;
      const key = `${out ? 'o' : 'i'}:${out ? e.pre : e.id}`;
      let g = groups.get(key);
      if (!g) { g = { out, gap: out ? e.from.c : e.to.c - 1, lo: Infinity, hi: -Infinity, lane: 0 }; groups.set(key, g); }
      g.lo = Math.min(g.lo, e.y1, e.y2); g.hi = Math.max(g.hi, e.y1, e.y2);
      e.g = g;
    }
    // Lanes: in 1 gap, a group takes the first lane where its vertical extent meets no other group.
    const byGap = new Map();
    for (const g of groups.values()) {
      if (g.lo === g.hi) continue;
      const list = byGap.get(g.gap) ?? [];
      while (list.some((o) => o.lane === g.lane && o.lo <= g.hi && g.lo <= o.hi)) g.lane++;
      list.push(g); byGap.set(g.gap, list);
    }
    const lines = [], heads = [];
    for (const e of edges) {
      const x1 = e.from.c * CW + CW / 2 + HALF, x2 = e.to.c * CW + CW / 2 - HALF;
      const xb = e.g.out ? x1 + LANE0 + LANE * e.g.lane : x2 - LANE0 - LANE * e.g.lane;
      lines.push(`<path data-from="${e.pre}" data-to="${e.id}" d="M${x1} ${e.y1}${e.y1 === e.y2 ? `H${x2}` : `H${xb}V${e.y2}H${x2}`}"/>`);
      heads.push(`<path d="M${x2 - AH} ${e.y2 - 6}L${x2} ${e.y2}L${x2 - AH} ${e.y2 + 6}Z"/>`);
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
          <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="#9a6a35" stroke-width="4" stroke-linejoin="round" aria-hidden="true">${lines.join('')}<g fill="#9a6a35" stroke-width="1">${heads.join('')}</g></svg>
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
  /**
   * The Synthesis block of a craftable item, 3 rows: the materials in 1 grid, the values in 1 row of stats (label above the value, 1 baseline), then the unlock.
   * The stats are in 1 grid with equal gaps, so the cost and the values do not float.
   */
  function synthesis(it) {
    const s = it.syn;
    const u = s.unlock;
    const pos = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
    const stat = (label, v, cls = '') => `<div class="stat ${cls}">${cap(label)}<b class="val">${v}</b></div>`;
    let h = bar('Synthesis') + '<div class="syn">';
    h += `<div class="minis mats">${s.mats.map((m) => itemEnt(m.id, { qty: m.q })).join('')}</div>`;
    const stats = [stat('Synthesis cost', costU(s.cost))];
    if (s.lv) stats.push(stat('Synth. Lv.', `Lv ${s.lv}`));
    if (s.added === null) {
      // No selling price: the value is not calculated, and the only known value is the material cost.
      stats.push(stat('Material cost', money(s.input)));
    } else {
      stats.push(stat('Selling price', money(s.price)), stat('Material cost', money(s.input)), stat('Added value', money(s.added), pos(s.added)));
      if (s.per !== null) stats.push(stat('Value per cost', `${money(s.per)}<span class="per">per</span><img class="ico" src="img/ui/cost.png" alt="Synthesis cost">`, pos(s.per)));
    }
    h += `<div class="syn-stats">${stats.join('')}</div>`;
    if (s.unpriced.length) h += `<div class="ul">${cap('Counted as 0 (no price)')}<span class="uv wrap">${s.unpriced.map(itemLink).join('')}</span></div>`;
    const bits = [];
    const ul = (c, body) => `<div class="ul">${cap(c)}${body}</div>`;
    if (u) {
      if (u.set && u.set !== it.n) bits.push(ul('Recipe set', `<span class="uv">${esc(u.set)}</span>`));
      if (u.teacher) bits.push(ul('Taught by', `<span class="uv">${slot({ icon: u.tIcon })}<span>${esc(u.teacher)}</span>${u.friendship > 0 ? heart(u.friendship) : ''}</span>`));
      if (s.researchId) bits.push(ul(`Research${u.researcher ? ` (${u.researcher})` : ''}`, `<span class="uv">${icoLink(`#/research/${RS[s.researchId].tree}/${s.researchId}`, resIcon(RS[s.researchId]), u.research || RS[s.researchId].n)}</span>`));
      else if (u.research) bits.push(ul('Research', `<span class="uv">${esc(u.research)}</span>`));
      // An event with no name in the game files is an internal id: it shows as "An event", never as the id.
      if (u.event) bits.push(ul('Event', `<span class="uv">${INTERNAL_ID.test(u.event) ? 'An event' : esc(u.event)}</span>`));
    }
    h += `${bits.length ? `<div class="unlock">${bits.join('')}</div>` : ''}</div>`;
    return h;
  }

  /** The rare finds of a zone, 1 group for each gimmick type, in the order Treasure, Bug Net, Digging, Fishing. They are 1 row of columns on the area and the zone detail. */
  function rareGroups(z) {
    return GIMMICK_ORDER.map((t) => {
      const tables = z.rare.filter((r) => r.t === t);
      if (!tables.length) return '';
      const g = GIMMICK[t];
      const body = tables.map((tb) => `<div class="tbl">${tables.length > 1 ? cap(`${g.unit} ${tb.n}`) : ''}<div class="minis">${tb.items.map((x) => itemEnt(x.i, { badge: pctText(x.r) })).join('')}</div></div>`).join('');
      return col(grp(g.label, body));
    }).join('');
  }

  /** An element: its game icon, then the text (the element name, or a value). The icon files are the element items of the game. */
  const elChip = (k, val = '') => `<span class="el"${val ? ` data-tip="${ELEMENT_NAMES[k]}"` : ''}><img src="${IT.has(ELEMENT_IDS[k]) ? icon(IT.get(ELEMENT_IDS[k]).icon) : ''}" alt="${ELEMENT_NAMES[k]}"><b>${val || ELEMENT_NAMES[k]}</b></span>`;
  /** A stat: a label above a value. */
  const statBox = (label, v) => `<div class="stat">${cap(label)}${v}</div>`;

  /**
   * The elements of a zone (expl_area.xml ele_00..03), as a stat of the head line of a panel.
   * The element rating table (expl_send_element.xml) is the same on every area, so it does not show here.
   */
  function elementStat(z) {
    const els = z.ele.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
    return els.length ? statBox('Area element', `<span class="els">${els.map((k) => elChip(k)).join('')}</span>`) : '';
  }

  /** 1 panel for the related parts of a detail: the head line, then the columns (the parts side by side when there is room). */
  const panel = (headBits, ...sections) => `<div class="panel"><div class="crumb left panel-head">${headBits.filter(Boolean).join('')}</div>${sections.filter(Boolean).map((x) => `<div class="panel-cols${x.row ? ' gathers' : ''}">${x.row ? x.h : x}</div>`).join('')}</div>`;
  const col = (...parts) => (parts.some(Boolean) ? `<div class="col">${parts.filter(Boolean).join('')}</div>` : '');

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
      groups.push(grp('Monster drops', `<div class="minis">${it.drops.map((d) => monEnt(d.m)).join('')}</div>`));
    }
    for (const t of GIMMICK_ORDER) {
      const rows = it.special.filter((e) => e.t === t);
      if (!rows.length) continue;
      const g = GIMMICK[t];
      groups.push(grp(g.label, `<div class="cols">${rows.map((e) => {
        const z = ZONE.get(e.z);
        const rates = [...new Set(e.r)].sort((a, b) => b - a).map(pct).filter(Boolean).join(' / ');
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
      // 1 tile for each monster; its badge is the level range of the area (Lv 3–8) or the one level (Lv 5).
      const mon = (m) => monEnt(m.m, { badge: lvRange(m.lo, m.hi) });
      const gather = a.gather.length ? grp('Gather', `<div class="minis">${a.gather.map((g) => itemEnt(g.i, { badge: pctText(g.r) })).join('')}</div>`) : '';
      // The monsters that only show from an Investigation Lv are their own group.
      let mons = '';
      for (const [boss, title] of [[false, 'Monsters'], [true, 'Bosses']]) {
        const reqs = [...new Set(a.mons.filter((m) => !!m.boss === boss).map((m) => m.req || 0))].sort((x, y) => x - y);
        for (const req of reqs) {
          const list = a.mons.filter((m) => !!m.boss === boss && (m.req || 0) === req);
          mons += grp(req ? `${title} from Investigation Lv ${req}` : title, `<div class="minis${boss ? ' boss' : ''}">${list.map(mon).join('')}</div>`);
        }
      }
      const diff = statBox('Difficulty by Investigation Lv', `<div class="diffs">${a.diff.map((d, i) => `<div class="diff"><b>${d}</b><span>${i + 1}</span></div>`).join('')}</div>`);
      return head(a.n) + panel(
        [statBox('Zone', `<a class="tl" href="#/areas/${a.zone.id}">${esc(a.zone.n)}</a>`), statBox('Opens', `<span>${esc(opens(a.zone))}</span>`), diff, elementStat(a.zone)],
        col(gather) + col(mons),
        rareGroups(a.zone) && { h: rareGroups(a.zone), row: true },
      );
    }
    const z = ZONE.get(id);
    if (!z) return null;
    return head(z.n) + panel(
      [statBox('Opens', `<span>${esc(opens(z))}</span>`), elementStat(z)],
      col(grp('Areas', `<div class="cols">${z.areas.map((x) => `<a class="link" href="#/areas/${x.id}"><span class="lt"><b>${esc(x.n)}</b></span></a>`).join('')}</div>`)
        + (z.mons?.length ? grp('Bosses', `<div class="minis boss">${z.mons.map((m) => monEnt(m.m, { badge: lvRange(m.lo, m.hi) })).join('')}</div>`) : '')),
      rareGroups(z) && { h: rareGroups(z), row: true },
    );
  }

  function monsterModal(id) {
    const m = D.monsters[id];
    if (!m) return null;
    let h = head(m.n);
    h += `<div class="top">${slot({ icon: m.icon })}<div class="facts"><span class="catline">${m.boss ? 'Boss' : 'Monster'}</span>${m.def ? `<span class="reduce">${cap('Element DEF')}<span class="els">${m.def.map((v, k) => elChip(k, String(v))).join('')}</span></span>` : ''}</div></div>`;
    if (m.desc) h += `<p class="desc">${esc(m.desc)}</p>`;
    const drops = DROPS.get(id) || [];
    // m.def: the element DEF in the order Fire, Water, Wind, Earth (btl_chara element_1..4). A monster with no battle data or only 0 has none.
    // An element with DEF 0 has no modifier, so it does not show.
    if (drops.length) h += bar('Drops') + `<div class="minis">${drops.map((d) => itemEnt(d.id, dropOpts(d))).join('')}</div>`;
    const hab = HABITAT.get(id) || [];
    if (hab.length) {
      h += bar('Found in') + `<div class="cols">${hab.map((x) => { const a = AREA.get(x.area); if (!a) { const z = ZONE.get(x.area); return `<a class="link" href="#/areas/${z.id}"><span class="lt"><b>${esc(z.n)}</b></span><span class="pct">${lvRange(x.lo, x.hi)}</span></a>`; } return `<a class="link" href="#/areas/${a.id}"><span class="lt"><b>${esc(a.n)}</b><small>${esc(a.zone.n)}</small></span><span class="pct">${lvRange(x.lo, x.hi)}</span></a>`; }).join('')}</div>`;
    }
    return h;
  }

  function characterModal(id) {
    const c = D.chars.find((x) => x.id === id);
    if (!c) return null;
    let h = head(c.n);
    h += `<div class="top">${slot({ icon: c.icon })}<div class="facts"><span class="catline">${groupOf(c)}</span>${c.game ? `<span class="catline"><cite class="game-title">${esc(c.game)}</cite></span>` : ''}</div></div>`;
    if (c.desc) h += `<p class="desc">${esc(c.desc)}</p>`;
    if (c.skills.length) {
      h += bar('Skills') + `<div class="cols">${c.skills.map((s) => `<div class="link plain"><span class="lt"><b>${esc(s.n)}</b>${s.ev ? cap('Learned at an event') : ''}</span>${s.ev ? '' : `<span class="pct">Lv ${s.lv}</span>`}</div>`).join('')}</div>`;
    }
    if (c.join) {
      // The event of the join has no name in the game files, so the section says "Joins in a story event" and lists the characters that join with it.
      // A turn of 0 or 1 and a population of 0 are met by each player: the data has dropped them.
      const j = c.join;
      const st = (label, v) => `<div class="stat">${cap(label)}<span>${v}</span></div>`;
      const stats = [
        j.pop ? st('Town population', `${fmt(j.pop)} ${j.pop === 1 ? 'person' : 'people'}`) : '',
        j.turn ? st('Turn (not confirmed)', `Turn ${j.turn}`) : '',
      ].filter(Boolean);
      const withIds = j.with.map((id) => D.chars.find((x) => x.id === id)).filter(Boolean);
      if (j.story || stats.length) {
        h += bar('Joins the town') + `<div class="jn">${j.story ? '<span class="uv">Joins in a story event</span>' : ''}${stats.length ? `<div class="crumb left">${stats.join('')}</div>` : ''}${withIds.length ? grp('Joins with', `<div class="minis">${withIds.map((x) => charEnt(x)).join('')}</div>`) : ''}</div>`;
      }
    }
    // A research shows the icon of its output, as in the tree.
    const rs = Object.values(RS).filter((r) => r.who.some((w) => w.id === c.id));
    if (rs.length) {
      h += bar('Research') + `<div class="minis">${rs.map((r) => resEnt(r.id)).join('')}</div>`;
    }
    // The recipe sets that the character teaches, with the items that their recipes make: 1 section, 1 label for each set.
    const taught = D.items.filter((i) => i.syn && i.syn.unlock && i.syn.unlock.teacher === c.nr);
    const sets = Object.entries(Object.groupBy(taught, (i) => i.syn.unlock.set || ''));
    if (sets.length) {
      // The set label shows only when the set has 2 or more items or its name differs from its single item. The sets with no label go together in 1 row at the top.
      const labelled = sets.filter(([set, list]) => set && (list.length > 1 || set.toLowerCase() !== list[0].n.toLowerCase()));
      const bare = sets.filter((x) => !labelled.includes(x)).flatMap(([, list]) => list);
      h += bar('Teaches') + `<div class="sets">${bare.length ? `<div class="tbl"><div class="row">${bare.map((i) => itemEnt(i.id)).join('')}</div></div>` : ''}${labelled.map(([set, list]) => `<div class="tbl${list.length > 1 ? ' multi' : ''}">${cap(set)}<div class="row">${list.map((i) => itemEnt(i.id)).join('')}</div></div>`).join('')}</div>`;
    }
    return h;
  }

  function researchModal(id) {
    const n = RS[id];
    if (!n) return null;
    let h = head(n.n);
    const stats = [];
    if (n.friendNeed > 0) stats.push(`<div class="stat need">${cap('Total friendship')}${heart(n.friendNeed)}</div>`);
    if (n.dur > 0) stats.push(`<div class="stat">${cap('Duration')}<b>${turns(n.dur)}</b></div>`);
    if (n.money > 0) stats.push(`<div class="stat">${cap('Research fee')}<b>${money(n.money)}</b></div>`);
    const person = (w) => {
      const c = D.chars.find((x) => x.id === w.id);
      return `<${c ? 'a' : 'div'} class="person"${c ? ` href="#/characters/${c.id}"` : ''}>${slot({ icon: w.icon })}<span>${esc(w.n)}</span></${c ? 'a' : 'div'}>`;
    };
    h += `<div class="who">${n.who.map(person).join('')}${stats.length ? `<div class="stats">${stats.join('')}</div>` : ''}</div>`;
    if (n.mats.length) h += bar('Materials') + `<div class="minis">${n.mats.map((m) => itemEnt(m.id, { qty: m.q })).join('')}</div>`;
    if (n.pre.length || n.conds.length) {
      h += bar('Requires');
      if (n.pre.length) h += `<div class="minis">${n.pre.filter((p) => RS[p]).map((p) => resEnt(p)).join('')}</div>`;
      if (n.conds.length) h += `<div class="conds">${n.conds.map((c) => `<div class="link plain"><span class="lt">${cap(c.k === 'district' ? 'District' : 'Request')}<b>${esc(c.v)}</b></span></div>`).join('')}</div>`;
    }
    // A bonus shows only with an item or the name of its type in the game: a sub-title never shows with nothing under it.
    const bonus = n.bonus && (n.bonus.item || n.bonus.type) ? n.bonus : null;
    if (n.set || n.prizeItem || bonus) {
      h += bar('Gives');
      if (n.set) h += grp(`Recipe set: ${n.set.n}`, `<div class="minis">${n.set.recipes.filter((i) => IT.has(i)).map((i) => itemEnt(i)).join('')}</div>`);
      // The sub-heading names the kind only when there is more than 1 kind of reward.
      const kinds = [n.set, n.prizeItem, bonus].filter(Boolean).length;
      const kind = (title, body) => (kinds > 1 ? grp(title, body) : body);
      if (n.prizeItem) h += kind('Item', `<div class="minis">${itemEnt(n.prizeItem.id, { qty: n.prizeItem.q })}</div>`);
      if (bonus) {
        const body = (bonus.item ? `<div class="minis">${itemEnt(bonus.item.id, { qty: bonus.item.q })}</div>` : '') + (bonus.type ? `<div class="link plain"><span class="lt"><b>${esc(bonus.type)}</b></span></div>` : '');
        h += `<section class="grp"><div class="gh"><b class="sub">Bonus</b>${bonus.friend > 0 ? heart(bonus.friend) : ''}</div>${body}</section>`;
      }
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
  function openModal(html, cls = '') {
    if (!root.firstChild) lastFocus = document.activeElement;
    root.innerHTML = `<div class="overlay" data-overlay><div class="modal bi u p-star ${cls}" role="dialog" aria-modal="true" tabindex="-1"><div class="modal-body">${html}</div></div></div>`;
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
    const view = NAV.some((n) => n.k === parts[0]) || parts[0] === 'about' ? parts[0] : 'items';
    if (view === 'research') {
      const tree = D.trees[parts[1]] ? parts[1] : 'main';
      const id = parts[1] && !D.trees[parts[1]] ? null : parts[2];
      return { view, tree, id, key: `research/${tree}`, hash: `#/research/${tree}` };
    }
    return { view, id: view === 'about' ? undefined : parts[1], qs, key: view === 'items' || view === 'characters' ? `${view}${qs ? `?${qs}` : ''}` : view, hash: view === 'items' || view === 'characters' ? `#/${view}${qs ? `?${qs}` : ''}` : `#/${view}` };
  }
  function renderBase(b) {
    if (viewKey === b.key) return;
    viewKey = b.key;
    window.scrollTo(0, 0);
    // The About page shows the notice in its section "Legal", so it has no footer.
    document.querySelector('footer.foot').hidden = b.view === 'about';
    if (b.view === 'items') { readQs(b.qs || ''); itemsPage(); }
    else if (b.view === 'about') aboutPage();
    else if (b.view === 'areas') areasPage();
    else if (b.view === 'monsters') monstersPage();
    else if (b.view === 'characters') { readCharQs(b.qs || ''); charactersPage(); }
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
      if (html) openModal(html, p.view === 'areas' ? 'wide' : '');
      else closeModal(true);
    } else {
      closeModal(false);
      // The page already shows this hash after a filter change, so it keeps its state.
      if (!(base && viewKey === p.key && (p.view === 'items' || p.view === 'characters') && base.hash === p.hash)) base = p;
      renderBase(base);
      renderNav();
    }
    $('#nav').classList.remove('open');
    setTitle();
  }
  /** The document title of each view ends with the site name; an open detail leads with its name. */
  function setTitle() {
    const view = base && base.view === 'about' ? 'About' : (NAV.find((n) => base && n.k === base.view) || NAV[0]).label;
    const detail = $('.modal .name');
    document.title = `${detail ? detail.textContent : view} - Westwald Archive`;
  }
  addEventListener('hashchange', route);
  route();
})();
