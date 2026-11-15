/* ==========================================================
   Kiosk – Prototyp-Shop
   Jede Animation nutzt die Web Animations API mit Start-/End-
   Posen ("Pose to pose"): der Browser interpoliert dazwischen.
   ========================================================== */
(() => {
  'use strict';

  // ---------- Daten ----------
  const CATEGORIES = ['Alle', 'Küche', 'Taschen', 'Wohnen']; // Hick's Law: wenige Optionen

  const PRODUCTS = [
    { id: 'kaffee',  name: 'Röstkaffee „Morgenrot“', cat: 'Küche',   price: 12.9, emoji: '☕', g: 'linear-gradient(135deg,#ffd9a8,#f6a96b)', desc: 'Schokoladig, nussig, wenig Säure. 500 g ganze Bohne aus kleiner Rösterei.', sizes: ['250 g', '500 g', '1 kg'], tags: 'bohnen espresso coffee' },
    { id: 'tasse',   name: 'Steinzeug-Tasse',        cat: 'Küche',   price: 18.0, emoji: '🍵', g: 'linear-gradient(135deg,#c9f2d8,#7fd1a8)', desc: 'Handgedreht, spülmaschinenfest, liegt satt in der Hand.', colors: ['#7fd1a8', '#f2c14e', '#e86f5a'], tags: 'becher mug keramik' },
    { id: 'pfanne',  name: 'Gusseisen-Pfanne',       cat: 'Küche',   price: 49.0, emoji: '🍳', g: 'linear-gradient(135deg,#e2e2e2,#9da3ab)', desc: 'Hält ein Leben lang, wird mit jeder Nutzung besser.', sizes: ['24 cm', '28 cm'], tags: 'braten kochen' },
    { id: 'tote',    name: 'Canvas-Tasche',          cat: 'Taschen', price: 29.0, emoji: '👜', g: 'linear-gradient(135deg,#ffe1ec,#f59ab8)', desc: 'Robustes Baumwoll-Canvas, Innentasche, trägt den Wocheneinkauf.', colors: ['#f59ab8', '#2d2a26', '#e9dcc5'], tags: 'beutel shopper bag' },
    { id: 'rucksack',name: 'Tages-Rucksack',         cat: 'Taschen', price: 89.0, emoji: '🎒', g: 'linear-gradient(135deg,#ffe3b3,#ffb347)', desc: '20 Liter, Laptopfach, wasserabweisend.', colors: ['#ffb347', '#4a6fa5', '#2d2a26'], tags: 'backpack laptop' },
    { id: 'kerze',   name: 'Duftkerze „Wald“',       cat: 'Wohnen',  price: 22.5, emoji: '🕯️', g: 'linear-gradient(135deg,#efe6d8,#cbb89a)', desc: 'Sojawachs, Zeder und Moos, ca. 40 Stunden Brenndauer.', tags: 'licht duft candle' },
    { id: 'pflanze', name: 'Monstera im Topf',       cat: 'Wohnen',  price: 34.0, emoji: '🪴', g: 'linear-gradient(135deg,#d6f5c9,#86c76b)', desc: 'Pflegeleicht, mag hellen Halbschatten. Inkl. Keramiktopf.', sizes: ['S', 'M', 'L'], tags: 'grün zimmerpflanze plant' },
    { id: 'decke',   name: 'Woll-Decke',             cat: 'Wohnen',  price: 79.0, emoji: '🧶', g: 'linear-gradient(135deg,#dcd6ff,#9d8df1)', desc: 'Merinowolle, 130 × 180 cm, kuschelig fürs Sofa.', colors: ['#9d8df1', '#e9dcc5', '#5a7d6a'], tags: 'plaid wolle sofa' },
  ];

  // ---------- Helfer ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

  const EASE = {
    out: 'cubic-bezier(.22, 1, .36, 1)',
    in: 'cubic-bezier(.55, 0, .75, .2)',
    inOut: 'cubic-bezier(.65, 0, .35, 1)',
    spring: 'cubic-bezier(.34, 1.56, .64, 1)',
  };

  /** Pose to pose: Keyframes setzen, Browser füllt die Frames dazwischen. */
  function anim(el, keyframes, opts) {
    const o = typeof opts === 'number' ? { duration: opts } : { ...opts };
    if (reduceMotion.matches) o.duration = 1, o.delay = 0;
    o.easing ??= EASE.out;
    return el.animate(keyframes, o);
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem('kiosk:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('kiosk:' + k, JSON.stringify(v)); } catch { /* egal */ } },
  };

  const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // ---------- State ----------
  const state = {
    cat: 'Alle',
    query: '',
    favs: new Set(store.get('favs', [])),
    cart: store.get('cart', []), // [{ key, id, variant, qty }]
    step: 0,
  };
  const byId = id => PRODUCTS.find(p => p.id === id);
  const saveCart = () => store.set('cart', state.cart);

  // ---------- Elemente ----------
  const el = {
    grid: $('#grid'), chips: $('#chips'), empty: $('#empty'), search: $('#search'),
    cartBtn: $('#cartBtn'), badge: $('#cartBadge'),
    scrim: $('#scrim'), modal: $('#modal'), drawer: $('#drawer'),
    cartList: $('#cartList'), cartEmpty: $('#cartEmpty'), cartTotal: $('#cartTotal'),
    steps: $('#steps'), next: $('#nextBtn'), back: $('#backBtn'),
    success: $('#success'), toast: $('#toast'), fx: $('#fx'),
  };

  // ==========================================================
  // Postel's Law: unscharfe Suche (Groß/Klein, Umlaute, Tippfehler)
  // ==========================================================
  const norm = s => s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').trim();

  function lev(a, b) {
    const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return dp[b.length];
  }

  function matches(p, query) {
    const q = norm(query);
    if (!q) return true;
    const words = norm(`${p.name} ${p.cat} ${p.tags || ''}`).split(/\s+/);
    return q.split(/\s+/).every(t => {
      const tol = t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0;
      // Tippfehler-Toleranz: mit jedem gleich langen Wortausschnitt vergleichen
      return words.some(w => {
        if (w.includes(t)) return true;
        if (!tol) return false;
        for (let i = 0; i <= Math.max(0, w.length - t.length); i++) {
          for (const len of [t.length - 1, t.length, t.length + 1]) {
            if (lev(t, w.slice(i, i + len)) <= tol) return true;
          }
        }
        return false;
      });
    });
  }

  // ==========================================================
  // Rendering
  // ==========================================================
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z"/></svg>';

  function renderChips() {
    el.chips.innerHTML = CATEGORIES.map(c =>
      `<button class="chip" aria-pressed="${c === state.cat}" data-cat="${c}">${c}</button>`).join('');
  }

  function cardHTML(p, i) {
    const tag = (txt) => i === 0 ? ` data-principle="${txt}"` : '';
    return `
      <article class="card" tabindex="0" data-id="${p.id}" aria-label="${p.name}">
        <button class="icon-btn fav hit" aria-pressed="${state.favs.has(p.id)}" aria-label="Merken"${tag('Exaggerated Feedback · Hit Area')}>${heartSvg}</button>
        <div class="media" style="--g:${p.g}"><span class="emoji">${p.emoji}</span></div>
        <div class="card-body">
          <h3 class="card-title">${p.name}</h3>
          <p class="card-sub">${p.cat}${p.colors ? ` · ${p.colors.length} Farben` : ''}${p.sizes ? ` · ${p.sizes.length} Größen` : ''}</p>
          <div class="card-foot">
            <span class="price">${fmt.format(p.price)}</span>
            <button class="btn primary sm add"${tag('Anticipation · Arcs · Secondary')}>In den Korb</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid({ animateIn = false } = {}) {
    const list = PRODUCTS.filter(p => (state.cat === 'Alle' || p.cat === state.cat) && matches(p, state.query));
    el.grid.innerHTML = list.map(cardHTML).join('');
    el.empty.hidden = list.length > 0;
    if (animateIn) {
      // Staging + Slow out: Karten nacheinander, damit das Auge einen Fluss hat
      $$('.card', el.grid).forEach((c, i) => anim(c,
        [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }],
        { duration: 260, delay: Math.min(i, 8) * 35, fill: 'backwards' }));
    }
  }

  function renderSkeleton(n = 8) {
    el.grid.innerHTML = Array.from({ length: n }, () => `
      <div class="card skeleton" aria-hidden="true">
        <div class="media"></div>
        <div class="card-body"><div class="bar" style="width:70%"></div><div class="bar" style="width:40%;margin-top:8px"></div></div>
      </div>`).join('');
  }

  // ==========================================================
  // Solid drawing in 3D: Tilt nach Mausposition
  // ==========================================================
  el.grid.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || reduceMotion.matches) return;
    const card = e.target.closest('.card:not(.skeleton)');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', `${(px - .5) * 10}deg`);
    card.style.setProperty('--rx', `${(.5 - py) * 8}deg`);
    card.style.setProperty('--mx', `${px * 100}%`);
    card.style.setProperty('--my', `${py * 100}%`);
  });
  el.grid.addEventListener('pointerout', e => {
    const card = e.target.closest('.card');
    if (card && !card.contains(e.relatedTarget)) { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
  });

  // ==========================================================
  // Effekte
  // ==========================================================

  /** Squash & stretch: zusammendrücken beim Aufprall, dann zurückfedern. */
  function squash(target, amount = 1) {
    const a = .3 * amount;
    return anim(target, [
      { transform: 'scale(1, 1)' },
      { transform: `scale(${1 + a}, ${1 - a})`, offset: .25 },
      { transform: `scale(${1 - a * .5}, ${1 + a * .5})`, offset: .55 },
      { transform: `scale(${1 + a * .15}, ${1 - a * .15})`, offset: .8 },
      { transform: 'scale(1, 1)' },
    ], { duration: 280, easing: EASE.inOut });
  }

  /** Follow through: Teile schwingen nach und setzen sich. */
  function wiggle(target) {
    return anim(target, [
      { rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '5deg' }, { rotate: '-2deg' }, { rotate: '0deg' },
    ], { duration: 300, easing: EASE.out });
  }

  /** Anticipation: kurz zurückziehen, bevor die große Bewegung kommt. */
  function windUp(target) {
    return anim(target, [
      { transform: 'scale(1) translateY(0)' },
      { transform: 'scale(.92) translateY(2px)' },
    ], { duration: 90, easing: EASE.in, fill: 'forwards' });
  }
  function release(target) {
    return anim(target, [
      { transform: 'scale(.92) translateY(2px)' },
      { transform: 'scale(1.06) translateY(-1px)', offset: .5 },
      { transform: 'scale(1) translateY(0)' },
    ], { duration: 220, easing: EASE.out });
  }

  /** Moving in arcs: Flug entlang einer quadratischen Bézierkurve. */
  function flyToCart(from, product) {
    if (reduceMotion.matches) return Promise.resolve();
    const a = centerOf(from), b = centerOf(el.cartBtn);
    const ctrl = { x: (a.x + b.x) / 2 + (b.x > a.x ? -60 : 60), y: Math.min(a.y, b.y) - 160 };
    const flyer = document.createElement('div');
    flyer.className = 'flyer';
    flyer.style.setProperty('--g', product.g);
    flyer.textContent = product.emoji;
    el.fx.append(flyer);

    const N = 14, frames = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      const x = u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x;
      const y = u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y;
      // Stretch in Bewegung: in der Mitte gestreckt, am Ende klein
      const s = 1 - t * .6;
      const stretch = 1 + Math.sin(t * Math.PI) * .18;
      frames.push({ transform: `translate(${x}px, ${y}px) rotate(${t * -25}deg) scale(${s * stretch}, ${s / stretch})`, offset: t });
    }
    const flight = anim(flyer, frames, { duration: 300, easing: EASE.inOut });
    return flight.finished.then(() => flyer.remove(), () => flyer.remove());
  }

  const CONFETTI = ['#ff5a36', '#f2c14e', '#7fd1a8', '#9d8df1', '#f59ab8', '#4a6fa5'];

  /** Secondary action: Partikel, die die Hauptaktion unterstreichen. */
  function burst(x, y, { count = 10, spread = 60, colors = CONFETTI, duration = 520 } = {}) {
    if (reduceMotion.matches) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.background = colors[i % colors.length];
      el.fx.append(p);
      const ang = (Math.PI * 2 * i) / count + Math.random() * .6;
      const dist = spread * (.6 + Math.random() * .6);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      // Bogen: erst raus, dann leicht nach unten (Schwerkraft)
      anim(p, [
        { transform: `translate(${x}px, ${y}px) rotate(0) scale(1)`, opacity: 1 },
        { transform: `translate(${x + dx * .7}px, ${y + dy * .7 - 12}px) rotate(${180 * Math.random()}deg) scale(1)`, opacity: 1, offset: .6 },
        { transform: `translate(${x + dx}px, ${y + dy + 24}px) rotate(${360 * Math.random()}deg) scale(.4)`, opacity: 0 },
      ], { duration: duration * (.8 + Math.random() * .4), easing: EASE.out }).finished.then(() => p.remove());
    }
  }

  function plusOne(x, y, text = '+1') {
    if (reduceMotion.matches) return;
    const t = document.createElement('span');
    t.className = 'plus-one'; t.textContent = text;
    el.fx.append(t);
    anim(t, [
      { transform: `translate(${x}px, ${y}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x}px, ${y - 22}px) scale(1.2)`, opacity: 1, offset: .35 },
      { transform: `translate(${x}px, ${y - 40}px) scale(1)`, opacity: 0 },
    ], { duration: 600, easing: EASE.out }).finished.then(() => t.remove());
  }

  function ring(x, y, color) {
    if (reduceMotion.matches) return;
    const r = document.createElement('span');
    r.className = 'ring'; r.style.borderColor = color;
    el.fx.append(r);
    anim(r, [
      { transform: `translate(${x}px, ${y}px) scale(.3)`, opacity: 1, borderWidth: '6px' },
      { transform: `translate(${x}px, ${y}px) scale(1.8)`, opacity: 0, borderWidth: '1px' },
    ], { duration: 420, easing: EASE.out }).finished.then(() => r.remove());
  }

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    clearTimeout(toastTimer);
    anim(el.toast, [{ opacity: 0, transform: 'translateY(12px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 200, fill: 'forwards' });
    toastTimer = setTimeout(() => anim(el.toast, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 160, easing: EASE.in, fill: 'forwards' }), 1800);
  }

  // ==========================================================
  // Favoriten – Exaggerated feedback
  // ==========================================================
  function toggleFav(btn, id) {
    const on = !state.favs.has(id);
    on ? state.favs.add(id) : state.favs.delete(id);
    store.set('favs', [...state.favs]);
    btn.setAttribute('aria-pressed', on);
    const svg = $('svg', btn);
    if (on) {
      // über "echt" hinaus: Pop auf 1.45×, Ringe, Partikel
      anim(svg, [
        { transform: 'scale(1)' },
        { transform: 'scale(.7)', offset: .15 },  // Anticipation
        { transform: 'scale(1.45)', offset: .5 },
        { transform: 'scale(.92)', offset: .75 },
        { transform: 'scale(1)' },
      ], { duration: 300, easing: EASE.out });
      const c = centerOf(btn);
      ring(c.x, c.y, '#e8336d');
      burst(c.x, c.y, { count: 8, spread: 34, colors: ['#e8336d', '#ff8fb1', '#ffc2d4'], duration: 420 });
    } else {
      anim(svg, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }, { transform: 'scale(1)' }], { duration: 160 });
    }
  }

  // ==========================================================
  // Warenkorb
  // ==========================================================
  const cartCount = () => state.cart.reduce((n, i) => n + i.qty, 0);
  const cartSum = () => state.cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);

  function addToCart(id, variant = defaultVariant(byId(id))) {
    const key = id + '|' + JSON.stringify(variant || {});
    const found = state.cart.find(i => i.key === key);
    found ? found.qty++ : state.cart.push({ key, id, variant, qty: 1 });
    saveCart();
    renderCart();
  }

  function defaultVariant(p) {
    const v = {};
    if (p.sizes) v.size = p.sizes[Math.min(1, p.sizes.length - 1)];
    if (p.colors) v.color = p.colors[0];
    return Object.keys(v).length ? v : null;
  }

  function updateBadge({ bounce = false } = {}) {
    const n = cartCount();
    el.badge.textContent = n;
    el.badge.hidden = n === 0;
    el.cartBtn.setAttribute('aria-label', `Warenkorb öffnen, ${n} Artikel`);
    if (bounce && n) {
      squash(el.badge, 1.4);
      wiggle($('svg', el.cartBtn));
      const c = centerOf(el.badge);
      plusOne(c.x, c.y - 10);
      burst(c.x, c.y, { count: 10, spread: 40 });
    }
  }

  function renderCart() {
    el.cartList.innerHTML = state.cart.map(item => {
      const p = byId(item.id);
      const sw = item.variant?.color ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.variant.color};vertical-align:-1px;margin-right:4px"></span>` : '';
      return `
        <li class="cart-item" data-key="${encodeURIComponent(item.key)}">
          <div class="thumb" style="--g:${p.g}">${p.emoji}</div>
          <div>
            <div class="ci-title">${p.name}</div>
            <div class="ci-meta">${sw}${item.variant?.size || ''}${!item.variant ? p.cat : ''}</div>
          </div>
          <div class="ci-right">
            <span class="price">${fmt.format(p.price * item.qty)}</span>
            <div class="qty">
              <button data-qty="-1" aria-label="Weniger">−</button>
              <output aria-live="polite">${item.qty}</output>
              <button data-qty="1" aria-label="Mehr">+</button>
            </div>
          </div>
        </li>`;
    }).join('');
    el.cartEmpty.hidden = state.cart.length > 0;
    el.cartTotal.textContent = fmt.format(cartSum());
    updateStepUI();
    updateBadge();
  }

  async function handleAdd(btn, id, variant, fromEl) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    const p = byId(id);
    // Doherty threshold: Zustand sofort aktualisieren (optimistisch)
    addToCart(id, variant);
    el.badge.textContent = cartCount() - 1 || '';
    el.badge.hidden = cartCount() - 1 === 0;

    const w = windUp(btn);               // Anticipation
    await w.finished;
    w.cancel();
    release(btn);
    squash(btn, .5);                      // Squash & stretch
    const label = btn.textContent;
    btn.classList.add('added');
    btn.textContent = '✓ Drin';
    await flyToCart(fromEl || btn, p);   // Arc
    updateBadge({ bounce: true });       // Follow through + Secondary action
    setTimeout(() => { btn.classList.remove('added'); btn.textContent = label; delete btn.dataset.busy; }, 900);
  }

  // ==========================================================
  // Overlays: Staging (Modal) & Follow-through (Drawer)
  // ==========================================================
  let lastFocus = null;
  let openLayer = null; // 'modal' | 'drawer'

  function showScrim() {
    el.scrim.hidden = false;
    anim(el.scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    document.body.classList.add('locked');
  }
  async function hideScrim() {
    await anim(el.scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE.in }).finished;
    el.scrim.hidden = true;
    document.body.classList.remove('locked');
  }

  const isMobile = () => matchMedia('(max-width: 720px)').matches;

  let modalProduct = null, modalVariant = null;
  function openModal(id) {
    const p = byId(id);
    modalProduct = p;
    modalVariant = defaultVariant(p);
    $('#modalMedia').getAnimations().forEach(a => a.cancel());
    $('#modalMedia').style.setProperty('--g', p.g);
    $('#modalMedia').innerHTML = `<span class="emoji">${p.emoji}</span>`;
    $('#modalCat').textContent = p.cat;
    $('#modalTitle').textContent = p.name;
    $('#modalDesc').textContent = p.desc;
    $('#modalPrice').textContent = fmt.format(p.price);
    renderVariants();

    lastFocus = document.activeElement;
    openLayer = 'modal';
    showScrim();
    el.modal.hidden = false;
    anim(el.modal, isMobile()
      ? [{ transform: 'translateY(100%)' }, { transform: 'translateY(-8px)', offset: .75 }, { transform: 'translateY(0)' }]
      : [{ opacity: 0, transform: 'scale(.94) translateY(16px)' }, { opacity: 1, transform: 'scale(1.01) translateY(0)', offset: .7 }, { opacity: 1, transform: 'none' }],
      { duration: 280, easing: EASE.out });
    // Secondary action: Produkt "landet" leicht verzögert
    anim($('.emoji', el.modal), [{ transform: 'translateY(24px) scale(.8) rotate(-8deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 280, delay: 60, easing: EASE.spring, fill: 'backwards' });
    $('#modalAdd').focus({ preventScroll: true });
  }

  async function closeModal() {
    if (el.modal.hidden) return;
    openLayer = null;
    hideScrim();
    await anim(el.modal, isMobile()
      ? [{ transform: 'none' }, { transform: 'translateY(100%)' }]
      : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97) translateY(8px)' }],
      { duration: 160, easing: EASE.in }).finished;
    el.modal.hidden = true;
    lastFocus?.focus?.({ preventScroll: true });
  }

  function renderVariants() {
    const p = modalProduct, v = modalVariant || {};
    let html = '';
    if (p.colors) html += `<div><div class="label">Farbe</div><div class="swatches">${p.colors.map(c =>
      `<button class="swatch hit" style="background:${c}" aria-label="Farbe ${c}" aria-pressed="${v.color === c}" data-color="${c}"></button>`).join('')}</div></div>`;
    if (p.sizes) html += `<div><div class="label">Größe</div><div class="sizes">${p.sizes.map(s =>
      `<button class="size" aria-pressed="${v.size === s}" data-size="${s}">${s}</button>`).join('')}</div></div>`;
    $('#modalVariants').innerHTML = html;
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    openLayer = 'drawer';
    setStep(0, { instant: true });
    showScrim();
    el.drawer.hidden = false;
    // Follow through: überschwingen und einpendeln
    anim(el.drawer, [
      { transform: 'translateX(100%)' },
      { transform: 'translateX(-14px)', offset: .7 },
      { transform: 'translateX(0)' },
    ], { duration: 300, easing: EASE.out });
    // Inhalte folgen leicht verzögert (Teile bewegen sich nach dem Körper)
    $$('.cart-item', el.drawer).forEach((li, i) => anim(li,
      [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }],
      { duration: 240, delay: 80 + i * 40, fill: 'backwards' }));
    el.next.focus({ preventScroll: true });
  }

  async function closeDrawer() {
    if (el.drawer.hidden) return;
    openLayer = null;
    hideScrim();
    await anim(el.drawer, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 180, easing: EASE.in }).finished;
    el.drawer.hidden = true;
    lastFocus?.focus?.({ preventScroll: true });
  }

  // ==========================================================
  // Checkout – Miller's Law (3 Schritte) & Postel's Law (Eingaben)
  // ==========================================================
  const STEP_LABELS = ['Zur Kasse', 'Weiter zur Zahlung', 'Jetzt bezahlen'];

  function updateStepUI() {
    el.next.textContent = STEP_LABELS[state.step];
    el.next.disabled = state.step === 0 && state.cart.length === 0;
    el.back.hidden = state.step === 0;
    $$('li', el.steps).forEach((li, i) => {
      li.classList.toggle('active', i === state.step);
      li.classList.toggle('done', i < state.step);
    });
  }

  async function setStep(n, { instant = false } = {}) {
    const dir = n > state.step ? 1 : -1;
    const cur = $(`.step[data-step="${state.step}"]`, el.drawer);
    const nxt = $(`.step[data-step="${n}"]`, el.drawer);
    if (!instant && cur !== nxt) {
      await anim(cur, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-24 * dir}px)` }], { duration: 120, easing: EASE.in }).finished;
    }
    $$('.step', el.drawer).forEach(s => s.hidden = s !== nxt);
    state.step = n;
    updateStepUI();
    if (!instant && cur !== nxt) {
      anim(nxt, [{ opacity: 0, transform: `translateX(${24 * dir}px)` }, { opacity: 1, transform: 'none' }], { duration: 200 });
      $('input', nxt)?.focus({ preventScroll: true });
    }
  }

  // Unordentliche Eingabe annehmen, sauber zurückgeben
  const CLEAN = {
    name: v => v.replace(/\s+/g, ' ').trim(),
    street: v => v.replace(/\s+/g, ' ').trim().replace(/str\.?(\s|$)/i, 'str. ').trim(),
    city: v => v.replace(/\s+/g, ' ').trim().replace(/^\w/, c => c.toUpperCase()),
    zip: v => v.replace(/\D/g, '').slice(-5),
    card: v => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '),
    exp: v => {
      const d = v.replace(/\D/g, '');
      let m, y;
      if (/[\/\-. ]/.test(v.trim())) { [m, y] = v.trim().split(/[\/\-. ]+/); }
      else { m = d.slice(0, d.length - (d.length > 4 ? 4 : 2)); y = d.slice(m.length); }
      m = (m || '').replace(/\D/g, ''); y = (y || '').replace(/\D/g, '');
      if (!m || !y) return v.trim();
      return `${m.padStart(2, '0').slice(-2)}/${y.slice(-2)}`;
    },
    cvc: v => v.replace(/\D/g, '').slice(0, 4),
  };
  const VALID = {
    name: v => v.length >= 2,
    street: v => /\d/.test(v) && v.length >= 4,
    city: v => v.length >= 2,
    zip: v => /^\d{5}$/.test(v),
    card: v => /^\d{13,19}$/.test(v.replace(/\s/g, '')),
    exp: v => { const m = /^(\d{2})\/(\d{2})$/.exec(v); return !!m && +m[1] >= 1 && +m[1] <= 12; },
    cvc: v => /^\d{3,4}$/.test(v),
  };

  function cleanField(input) {
    const f = input.name;
    if (!CLEAN[f]) return true;
    const before = input.value;
    input.value = CLEAN[f](before);
    const ok = VALID[f](input.value);
    input.classList.toggle('valid', ok);
    input.classList.toggle('invalid', !ok && input.value !== '');
    return ok;
  }

  function validateForm(form) {
    let firstBad = null;
    $$('input', form).forEach(i => { if (!cleanField(i)) { i.classList.add('invalid'); firstBad ??= i; } });
    if (firstBad) {
      // Exaggerated feedback: deutliches Kopfschütteln
      anim(firstBad, [
        { transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' },
        { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' },
      ], { duration: 280, easing: EASE.out });
      firstBad.focus();
      return false;
    }
    return true;
  }

  async function celebrate() {
    await closeDrawer();
    el.success.hidden = false;
    document.body.classList.add('locked');
    const card = $('.success-card', el.success);
    anim(el.success, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    anim(card, [
      { transform: 'scale(.6) translateY(40px)', opacity: 0 },
      { transform: 'scale(1.06) translateY(-6px)', opacity: 1, offset: .6 },
      { transform: 'scale(.98)', offset: .82 },
      { transform: 'none', opacity: 1 },
    ], { duration: 300, easing: EASE.out });
    // Frequency of use: seltene Aktion → die große Feier
    anim($('.check circle', card), [{ strokeDashoffset: 151 }, { strokeDashoffset: 0 }], { duration: 300, delay: 120, easing: EASE.inOut, fill: 'forwards' });
    anim($('.check path', card), [{ strokeDashoffset: 36 }, { strokeDashoffset: 0 }], { duration: 220, delay: 380, easing: EASE.out, fill: 'forwards' });
    setTimeout(() => {
      const c = centerOf($('.check', card));
      burst(c.x, c.y, { count: 36, spread: 220, duration: 900 });
      squash($('.check', card), .8);
    }, 420);

    state.cart = []; saveCart(); renderCart();
    setTimeout(() => $('#successClose').focus(), 50);
  }

  async function closeSuccess() {
    await anim(el.success, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE.in }).finished;
    el.success.hidden = true;
    document.body.classList.remove('locked');
    $$('#addrForm input, #payForm input').forEach(i => { i.value = ''; i.classList.remove('valid', 'invalid'); });
    state.step = 0;
  }

  // ==========================================================
  // Events
  // ==========================================================
  el.chips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat;
    $$('.chip', el.chips).forEach(c => c.setAttribute('aria-pressed', c === b));
    renderGrid({ animateIn: true });
  });

  // Frequency of use: Suche filtert sofort, ohne Animation
  el.search.addEventListener('input', () => { state.query = el.search.value; renderGrid(); });

  el.grid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card || card.classList.contains('skeleton')) return;
    const id = card.dataset.id;
    const fav = e.target.closest('.fav');
    if (fav) return toggleFav(fav, id);
    const add = e.target.closest('.add');
    if (add) return handleAdd(add, id, undefined, $('.media', card));
    openModal(id);
  });
  el.grid.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); openModal(e.target.dataset.id); }
  });

  $('#modalVariants').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    modalVariant = { ...(modalVariant || {}) };
    if (b.dataset.color) modalVariant.color = b.dataset.color;
    if (b.dataset.size) modalVariant.size = b.dataset.size;
    $$('button', b.parentElement).forEach(x => x.setAttribute('aria-pressed', x === b));
    squash(b, .4);
    if (b.dataset.color) {
      const idx = [...b.parentElement.children].indexOf(b);
      anim($('#modalMedia'), [{ filter: 'hue-rotate(0deg)' }, { filter: `hue-rotate(${idx * 40}deg)` }], { duration: 240, fill: 'forwards' });
    }
  });

  $('#modalAdd').addEventListener('click', e => {
    handleAdd(e.currentTarget, modalProduct.id, modalVariant, $('#modalMedia'));
    // Staging: Modal tritt zurück, damit der Blick dem Produkt zum Warenkorb folgt
    setTimeout(closeModal, 110);
  });

  el.cartBtn.addEventListener('click', openDrawer);

  el.scrim.addEventListener('click', () => openLayer === 'modal' ? closeModal() : closeDrawer());
  $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('.modal') ? closeModal() : closeDrawer()));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!el.success.hidden) return closeSuccess();
    if (openLayer === 'modal') closeModal();
    else if (openLayer === 'drawer') closeDrawer();
  });

  el.cartList.addEventListener('click', e => {
    const b = e.target.closest('[data-qty]'); if (!b) return;
    const key = decodeURIComponent(b.closest('.cart-item').dataset.key);
    const item = state.cart.find(i => i.key === key);
    item.qty += +b.dataset.qty;
    if (item.qty <= 0) {
      const li = b.closest('.cart-item');
      anim(li, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 180, easing: EASE.in })
        .finished.then(() => { state.cart = state.cart.filter(i => i !== item); saveCart(); renderCart(); toast('Artikel entfernt'); });
      return;
    }
    saveCart(); renderCart(); // bewusst ohne Animation – wird sehr oft benutzt
  });

  $$('#addrForm input, #payForm input').forEach(i => {
    i.addEventListener('blur', () => { if (i.value) cleanField(i); });
    if (i.name === 'card') i.addEventListener('input', () => {
      // sanft live formatieren, Cursor ans Ende
      const atEnd = i.selectionStart === i.value.length;
      i.value = CLEAN.card(i.value);
      if (atEnd) i.setSelectionRange(i.value.length, i.value.length);
    });
  });
  $$('#addrForm, #payForm').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); el.next.click(); }));

  el.next.addEventListener('click', () => {
    if (state.step === 0) return state.cart.length && setStep(1);
    if (state.step === 1) return validateForm($('#addrForm')) && setStep(2);
    if (state.step === 2 && validateForm($('#payForm'))) {
      squash(el.next, .3);
      el.next.textContent = 'Wird bezahlt …';
      el.next.disabled = true;
      setTimeout(() => { el.next.disabled = false; celebrate(); }, 380); // < 400 ms (Doherty)
    }
  });
  el.back.addEventListener('click', () => setStep(state.step - 1));

  $('#successClose').addEventListener('click', closeSuccess);

  $('#principlesToggle').addEventListener('click', e => {
    const on = document.body.classList.toggle('show-principles');
    e.currentTarget.setAttribute('aria-pressed', on);
    toast(on ? 'Prinzipien eingeblendet' : 'Prinzipien ausgeblendet');
  });

  // ---------- Start ----------
  renderChips();
  renderCart();
  // Doherty threshold: Skeleton sofort, Inhalte nach simuliertem Netz (< 400 ms)
  renderSkeleton();
  setTimeout(() => renderGrid({ animateIn: true }), 350);
})();
