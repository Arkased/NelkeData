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
  /** The research trees. The names are the research categories of the game: MESSAGE_COMMON_CATEGORY_MAIN "Main", SUB_TASK_COND_TEXT_041 "Usage Category", _042 "City Building Category"; Emergency is the 4th tab of the study screen. */
  const TREES = [
    { key: 'main', label: 'Main' },
    { key: 'attack', label: 'Usage' },
    { key: 'support', label: 'City Building' },
    { key: 'emergency', label: 'Emergency' },
  ];
  /** The exploration gimmicks that give rare items (expl_gimmick type). The labels are the game terms of MESSAGE_EXPLORATION_21 to 24 ("How to Obtain"). */
  const GIMMICK = {
    BOX: { label: 'Treasure', what: 'Treasure chests', unit: 'Chest' },
    BUG: { label: 'Bug Net', what: 'Bug spots (needs the Butterfly Net)', unit: 'Spot' },
    DIG: { label: 'Digging', what: 'Dig spots (needs the Shovel)', unit: 'Spot' },
    FISH: { label: 'Fishing', what: 'Fishing spots (needs the Fishing Pole)', unit: 'Spot' },
  };
  const GIMMICK_ORDER = ['BOX', 'BUG', 'DIG', 'FISH'];
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
  /** The tile of an entity, used everywhere: icon, name (at most 2 lines), then 1 or 2 value lines (val, val2) right under the name. It is 1 link when it has a page. */
  function ent(o) {
    const tag = o.href ? 'a' : 'div';
    const tip = o.name.length > 14 ? ` data-tip="${esc(o.name)}"` : '';
    return `<${tag} class="mini ${o.cls || ''}"${o.href ? ` href="${o.href}"` : ''}${tip}><span class="slot ${crop(o.icon)}">${o.icon ? `<img src="${icon(o.icon)}" alt="">` : ''}</span><span class="nm">${esc(o.name)}</span>${o.val ? `<small>${o.val}</small>` : ''}${o.val2 ? `<small>${o.val2}</small>` : ''}</${tag}>`;
  }
  const itemEnt = (id, o = {}) => {
    const it = IT.get(id);
    return ent({ href: `#/items/${id}`, icon: it.icon, name: it.n, ...o });
  };
  const monEnt = (id, o = {}) => {
    const m = D.monsters[id];
    return ent({ href: `#/monsters/${id}`, icon: m.icon, name: m.n, ...o });
  };
  const itemLink = (id) => `<a class="tl" href="#/items/${id}">${esc(IT.get(id).n)}</a>`;
  const bar = (text) => `<div class="bar bi p-brown">${esc(text)}</div>`;
  // units
  const coin = '<img class="ico" src="img/ui/coin.png" alt="Cole">';
  const money = (n, cls = '') => `<span class="money ${cls}">${coin}${fmt(n)}</span>`;
  const costU = (n, cls = '') => `<span class="cost ${cls}"><img class="ico" src="img/ui/cost.png" alt="Synthesis cost">${fmt(n)}</span>`;
  const pct = (n) => `<span class="rate">${fmt(n)}%</span>`;
  const turns = (n) => `${n} turn${n === 1 ? '' : 's'}`;
  const lvRange = (lo, hi) => `Lv ${lo === hi ? lo : `${lo}-${hi}`}`;
  /** Friendship as the game heart and a number. */
  const heart = (n) => `<span class="fr" role="img" aria-label="Friendship ${n}"><img src="img/ui/fav-icon.png" alt=""><b>${n}</b></span>`;
  const shopChip = (key) => `<span class="shop"><img src="img/ui/${SHOP[key].img}.png" alt="">${SHOP[key].label}</span>`;
  /** A group of a modal: a small title, an optional explanation, then the content. */
  const grp = (title, sub, body) => `<section class="grp"><div class="gh"><b>${esc(title)}</b>${sub ? `<small>${sub}</small>` : ''}</div>${body}</section>`;
  const head = (name) => `<div class="mhead"><h2 class="name bi p-gold">${esc(name)}</h2><button class="close btn" data-close aria-label="Close">&times;</button></div>`;
  const searchBox = (q, ph) => `<label class="search">${catImg(9)}<input type="search" id="q" placeholder="${ph}" value="${esc(q)}" autocomplete="off" aria-label="Search by name"></label>`;
  const opens = (z) => (z.task ? `opens after Task ${z.task}` : 'open from the start');
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
        <div class="srow">${searchBox(st.q, 'Search items')}<button class="btn" id="reset" hidden>Clear filters</button></div>
        <div class="fgroup"><span class="cap">Category</span><div class="opts">${CATS.map((c) => tg('data-cat', c, c, st.cat.includes(c), catImg(CAT_ICON[c]))).join('')}</div></div>
        <div class="fgroup"><span class="cap">Sold at</span><div class="opts">${shopsUsed.map((s) => tg('data-shop', s, SHOP[s].label, st.shop.includes(s), `<img class="cat" src="img/ui/${SHOP[s].img}.png" alt="">`)).join('')}</div></div>
        <div class="fgroup"><span class="cap">Synthesis</span><div class="opts">${tg('data-craft', '1', 'Craftable', st.craft, catImg(CAT_ICON.craft))}</div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const list = filterItems();
      const qs = qsOf();
      $('#reset').hidden = !qs;
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
        ${searchBox(st.mq, 'Search monsters')}
        <div class="fgroup"><span class="cap">Type</span><div class="opts">${[['', 'All'], ['monster', 'Monsters'], ['boss', 'Bosses']].map(([v, l]) => tg('data-mk', v, l, st.mk === v)).join('')}</div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const q = st.mq.trim().toLowerCase();
      const list = Object.entries(D.monsters).filter(([, m]) => (!st.mk || (st.mk === 'boss') === m.boss) && (!q || m.n.toLowerCase().includes(q)));
      $('#grid').innerHTML = list.length ? list.map(([id, m]) => ent({ href: `#/monsters/${id}`, icon: m.icon, name: m.n, cls: `cell${m.boss ? ' boss' : ''}` })).join('') : '<div class="empty">Nothing matches the filters.</div>';
      document.querySelectorAll('.toolbar [data-mk]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mk === st.mk));
    };
    draw();
    $('#q').addEventListener('input', (e) => { st.mq = e.target.value; draw(); });
    $('.toolbar').addEventListener('click', (e) => { const b = e.target.closest('[data-mk]'); if (b) { st.mk = b.dataset.mk; draw(); } });
  }
  function charactersPage() {
    const types = CHAR_TYPES.filter((t) => D.chars.some((c) => c.type === t));
    $('#main').innerHTML = `
      <div class="toolbar">
        ${searchBox(st.cq, 'Search characters')}
        <div class="fgroup"><span class="cap">Type</span><div class="opts">${types.map((t) => tg('data-ck', t, t, st.ck.includes(t))).join('')}</div></div>
      </div>
      <div class="gridwrap bi u p-cream"><div class="grid" id="grid"></div></div>`;
    const draw = () => {
      const q = st.cq.trim().toLowerCase();
      const list = D.chars.filter((c) => (!st.ck.length || st.ck.includes(c.type)) && (!q || c.n.toLowerCase().includes(q)));
      $('#grid').innerHTML = list.length ? list.map((c) => ent({ href: `#/characters/${c.id}`, icon: c.icon, name: c.n, cls: 'cell' })).join('') : '<div class="empty">Nothing matches the filters.</div>';
      document.querySelectorAll('.toolbar [data-ck]').forEach((b) => b.setAttribute('aria-pressed', st.ck.includes(b.dataset.ck)));
    };
    draw();
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
    const W = 20 * CW, H = ys[lastRow] + NODE_H;
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
        const face = n.who[0] ? n.who[0].icon : n.prizeItem ? IT.get(n.prizeItem.id).icon : '';
        nodes.push(`<a class="node" href="#/research/${treeKey}/${id}" style="left:${c * CW}px;top:${ys[r]}px"><span class="slot ${crop(face)}">${face ? `<img src="${icon(face)}" alt="">` : ''}</span><span class="nm">${esc(n.n)}</span></a>`);
      }
    }
    $('#main').innerHTML = `
      <div class="toolbar"><div class="fgroup"><span class="cap">Category</span><div class="opts">${TREES.map((t) => `<a class="toggle" href="#/research/${t.key}" aria-pressed="${t.key === treeKey}">${t.label}</a>`).join('')}</div></div></div>
      <div class="treebox bi u p-tan"><div class="treein">
        <div class="treescroll"><div class="tree" style="width:${W}px;height:${H}px">
          <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="#9a6a35" stroke-width="7" stroke-linecap="round" aria-hidden="true">${lines.join('')}</svg>
          ${nodes.join('')}
        </div></div>
      </div></div>`;
  }

  // ---------- modals ----------
  /** The Synthesis block of a craftable item: the cost and the materials, then the value as a ledger, then the unlock. */
  function synthesis(it) {
    const s = it.syn;
    const u = s.unlock;
    const pos = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
    const row = (op, label, v, cls = '') => `<div class="lr ${cls}"><span class="op">${op}</span><span class="lb">${label}</span><b class="val">${v}</b></div>`;
    let h = bar('Synthesis') + '<div class="syn">';
    h += `<div class="syn-top"><div class="bigstat"><small>Synthesis cost</small><b>${costU(s.cost)}</b></div><div class="row mats">${s.mats.map((m) => itemEnt(m.id, { val: `${fmt(m.q)} needed` })).join('')}</div></div>`;
    h += '<div class="syn-body"><div class="syn-val">';
    if (s.added === null) {
      h += `<p class="note">No selling price, so no value is calculated. Material cost: ${money(s.input)}</p>`;
    } else {
      h += `<div class="ledger">
        ${row('', 'Selling price', money(s.price))}
        ${row('&minus;', 'Material cost', money(s.input))}
        ${row('=', 'Added value', money(s.added), `sum ${pos(s.added)}`)}
        ${s.per === null ? '' : `${row('&divide;', 'Synthesis cost', costU(s.cost))}${row('=', 'Value per cost', `${money(s.per)}<span class="per">per</span><img class="ico" src="img/ui/cost.png" alt="Synthesis cost">`, `sum ${pos(s.per)}`)}`}
      </div>`;
    }
    if (s.unpriced.length) h += `<p class="note">No price in the data, counted as 0: ${s.unpriced.map(itemLink).join(', ')}.</p>`;
    h += '</div>';
    const bits = [];
    const cap = (c, body) => `<div class="ul"><small>${c}</small>${body}</div>`;
    if (u) {
      if (u.set) bits.push(cap('Recipe set', `<span class="uv">${esc(u.set)}</span>`));
      if (u.teacher) bits.push(cap('Taught by', `<span class="uv">${slot({ icon: u.tIcon, tip: u.teacher })}<span>${esc(u.teacher)}</span>${u.friendship > 0 ? heart(u.friendship) : ''}</span>`));
      if (s.researchId) bits.push(cap(`Research${u.researcher ? ` (${esc(u.researcher)})` : ''}`, `<a class="uv tl" href="#/research/${RS[s.researchId].tree}/${s.researchId}">${esc(u.research || RS[s.researchId].n)}</a>`));
      else if (u.research) bits.push(cap('Research', `<span class="uv">${esc(u.research)}</span>`));
      if (u.event) bits.push(cap('Event', `<span class="uv">${esc(u.event)}</span>`));
    }
    h += `<div class="unlock">${bits.join('') || '<span class="note">No unlock condition in the data.</span>'}</div></div></div>`;
    return h;
  }

  /** The rare finds of a zone, 1 group for each gimmick type. */
  function rareGroups(z) {
    return GIMMICK_ORDER.map((t) => {
      const tables = z.rare.filter((r) => r.t === t);
      if (!tables.length) return '';
      const g = GIMMICK[t];
      const body = tables.map((tb) => `<div class="tbl">${tables.length > 1 ? `<small class="cap">${g.unit} ${tb.n}</small>` : ''}<div class="minis">${tb.items.map((x) => itemEnt(x.i, { val: pct(x.r) })).join('')}</div></div>`).join('');
      return grp(g.label, `${g.what} in ${esc(z.n)}. The % is the chance of the item in the reward.`, body);
    }).join('');
  }

  /**
   * The dispatch data of a zone (expl_area.xml ele_00..03 and expl_send_element.xml): the elements of the area and the rating of a dispatched character.
   * Only the fields with a supported meaning show.
   */
  function dispatch(z) {
    const els = z.ele.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
    const icons = els.map((k) => `<span class="elm" data-tip="${ELEMENT_NAMES[k]}"><span class="slot">${IT.has(ELEMENT_IDS[k]) ? `<img src="${icon(IT.get(ELEMENT_IDS[k]).icon)}" alt="">` : ''}</span><small>${ELEMENT_NAMES[k]}</small></span>`).join('');
    const rows = D.dispatch.map((r) => `<div class="dr"><b class="mark">${esc(r.mark)}</b><span>${r.gather}x</span><span>${r.battle}x</span></div>`).join('');
    return grp('Dispatch', '', `<div class="disp">
      <div class="dcol"><span class="cap">Area element</span><div class="elms">${icons}</div></div>
      <div class="dcol"><span class="cap">Element rating</span><div class="drs"><div class="dr dh"><span></span><span>Gather</span><span>Battle</span></div>${rows}</div></div>
    </div>`);
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
        ${it.shops.length ? `<span class="sold"><span class="cap">Sold at</span>${it.shops.filter((s) => SHOP[s]).map(shopChip).join('')}</span>` : ''}
        ${elems.length ? `<span class="reduce"><span>Reduces into</span><span class="els">${elems.map((e) => `<a class="el" href="#/items/${e.id}" data-tip="${esc(IT.get(e.id).n)}"><img src="${icon(IT.get(e.id).icon)}" alt="${esc(IT.get(e.id).n)}"><b>${fmt(e.v)}</b></a>`).join('')}</span></span>` : ''}
      </div></div>`;
    if (it.desc) h += `<p class="desc">${esc(it.desc)}</p>`;
    if (it.syn) h += synthesis(it);
    const groups = [];
    if (gathers.length) {
      groups.push(grp('Gather', 'The areas where you gather it, with the chance.', `<div class="cols">${gathers.map((g) => {
        const a = AREA.get(g.spot);
        return `<a class="link" href="#/areas/${a.id}"><span class="lt"><b>${esc(a.n)}</b><small>${esc(a.zone.n)}</small></span><span class="pct">${pct(g.rate)}</span></a>`;
      }).join('')}</div>`));
    }
    if (it.drops.length) {
      groups.push(grp('Monster drops', '', `<div class="minis">${it.drops.map((d) => monEnt(d.m, { val: `${fmt(d.num)} per drop`, val2: pct(d.rate) })).join('')}</div>`));
    }
    for (const t of GIMMICK_ORDER) {
      const rows = it.special.filter((e) => e.t === t);
      if (!rows.length) continue;
      const g = GIMMICK[t];
      groups.push(grp(g.label, `${g.what}, in any area of the zone. The % is the chance of the item in the reward.`, `<div class="cols">${rows.map((e) => {
        const z = ZONE.get(e.z);
        const rates = [...new Set(e.r)].sort((a, b) => b - a).map(pct).join(' / ');
        return `<a class="link" href="#/areas/${z.id}"><span class="lt"><b>${esc(z.n)}</b></span><span class="pct">${rates}</span></a>`;
      }).join('')}</div>`));
    }
    if (it.farm) groups.push(grp('Farm', '', `<div class="chips"><span class="chip">${esc(it.farm)}</span></div>`));
    if (groups.length) h += bar('How to get') + groups.join('');
    if (it.usedIn.length) h += bar('Used in') + `<div class="minis">${it.usedIn.map((u) => itemEnt(u.i)).join('')}</div>`;
    return h;
  }

  function areaModal(id) {
    const a = AREA.get(id);
    if (a) {
      let h = head(a.n);
      h += `<div class="crumb"><span>Zone</span><a class="tl" href="#/areas/${a.zone.id}">${esc(a.zone.n)}</a><small>${opens(a.zone)}</small></div>`;
      h += `<div class="diffline"><span class="cap">Difficulty by area level</span><div class="diffs">${a.diff.map((d, i) => `<div class="diff"><b>${d}</b><span>${i + 1}</span></div>`).join('')}</div></div>`;
      const mon = (m) => monEnt(m.m, { val: lvRange(m.lo, m.hi) });
      if (a.gather.length) h += grp('Gather', 'Items and their chance.', `<div class="minis">${a.gather.map((g) => itemEnt(g.i, { val: pct(g.r) })).join('')}</div>`);
      // The tile has 1 value line (the level), so the monsters that only show from an area level are their own group.
      for (const [boss, title] of [[false, 'Monsters'], [true, 'Bosses']]) {
        const reqs = [...new Set(a.mons.filter((m) => !!m.boss === boss).map((m) => m.req || 0))].sort((x, y) => x - y);
        for (const req of reqs) {
          const list = a.mons.filter((m) => !!m.boss === boss && (m.req || 0) === req);
          h += grp(req ? `${title} from area level ${req}` : title, '', `<div class="minis${boss ? ' boss' : ''}">${list.map(mon).join('')}</div>`);
        }
      }
      h += dispatch(a.zone);
      h += rareGroups(a.zone);
      return h;
    }
    const z = ZONE.get(id);
    if (!z) return null;
    let h = head(z.n);
    h += `<div class="crumb"><small>${opens(z)}</small></div>`;
    h += grp('Areas', '', `<div class="cols">${z.areas.map((x) => `<a class="link" href="#/areas/${x.id}"><span class="lt"><b>${esc(x.n)}</b></span></a>`).join('')}</div>`);
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
    if (drops.length) h += bar('Drops') + `<div class="minis">${drops.map((d) => itemEnt(d.id, { val: `${fmt(d.num)} per drop`, val2: pct(d.rate) })).join('')}</div>`;
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
    const rs = Object.values(RS).filter((r) => r.who.some((w) => w.n === c.n));
    if (rs.length) h += bar('Research') + `<div class="cols">${rs.map((r) => `<a class="link" href="#/research/${r.tree}/${r.id}"><span class="lt"><b>${esc(r.n)}</b><small>${esc(TREES.find((t) => t.key === r.tree).label)}</small></span></a>`).join('')}</div>`;
    const taught = D.items.filter((i) => i.syn && i.syn.unlock && i.syn.unlock.teacher === c.n);
    if (taught.length) h += bar('Teaches') + `<div class="minis">${taught.map((i) => itemEnt(i.id)).join('')}</div>`;
    return h;
  }

  function researchModal(id) {
    const n = RS[id];
    if (!n) return null;
    let h = head(n.n);
    const stats = [];
    if (n.dur > 0) stats.push(`<div class="bigstat"><small>Duration</small><b>${turns(n.dur)}</b></div>`);
    if (n.money > 0) stats.push(`<div class="bigstat"><small>Research fee</small><b>${money(n.money)}</b></div>`);
    h += `<div class="who">${n.who.map((w) => `<div class="person">${slot({ icon: w.icon, tip: w.n })}<span>${esc(w.n)}</span></div>`).join('')}${n.friendNeed > 0 ? `<div class="need"><small>Friendship needed</small>${heart(n.friendNeed)}</div>` : ''}${stats.length ? `<div class="stats">${stats.join('')}</div>` : ''}</div>`;
    if (n.mats.length) h += bar('Materials') + `<div class="minis">${n.mats.map((m) => itemEnt(m.id, { val: `${fmt(m.q)} needed` })).join('')}</div>`;
    if (n.pre.length || n.conds.length) {
      h += bar('Requires');
      if (n.pre.length) h += `<div class="minis">${n.pre.map((p) => { const q = RS[p]; return q ? ent({ href: `#/research/${q.tree}/${p}`, icon: q.who[0] ? q.who[0].icon : '', name: q.n }) : ''; }).join('')}</div>`;
      if (n.conds.length) h += `<div class="conds">${n.conds.map((c) => `<div class="link plain"><span class="lt"><small>${c.k === 'district' ? 'District' : 'Request'}</small><b>${esc(c.v)}</b></span></div>`).join('')}</div>`;
    }
    if (n.set || n.prizeItem || n.bonus) {
      h += bar('Gives');
      if (n.set) h += grp(`Recipe set: ${n.set.n}`, 'The items that its recipes make.', `<div class="minis">${n.set.recipes.filter((i) => IT.has(i)).map((i) => itemEnt(i)).join('')}</div>`);
      // The sub-heading names the kind only when there is more than 1 kind of reward.
      const kinds = [n.set, n.prizeItem, n.bonus].filter(Boolean).length;
      const kind = (title, body) => (kinds > 1 ? grp(title, '', body) : body);
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
