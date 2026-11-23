import { createStore, newId } from './store.js';
import { computeBalances, settle, toPLN, round2, totalWeight, memberWeight } from './calc.js';
import { COUNTRIES, CURRENCIES, DEFAULT_RATES, DEFAULT_CATEGORIES, sym, countryName, countryCurrency, iconKey, iconSvg, iconBg, iconColor } from './data.js';
import { isNative, updateWidget, consumeWidgetAction, onBackButton, onResume, exitApp, setBarsTheme } from './native.js';
import { APP_BUILD } from './version.js';
import { artSvg, tripPhoto, findPhoto, creditHtml, fileToCoverData } from './cover.js';

const GITHUB_REPO = 'jarex-pl/wyjazdy';
const APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Wyjazdy.apk`;
const WEB_URL = 'https://jarex-pl.github.io/wyjazdy/';

// ============================================================ narzędzia
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
const fmt = (n) => NF.format(round2(n || 0)).replace(/ /g, ' ');
const fmt0 = (n) => Math.round(n || 0).toLocaleString('pl-PL').replace(/ /g, ' ');
const money = (n, cur) => `${fmt(n)} ${sym(cur)}`;
const signed = (n) => (n > 0.009 ? '+' : n < -0.009 ? '−' : '') + fmt(Math.abs(n));
const fmtRate = (r) => (r >= 0.1 ? r.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : r.toLocaleString('pl-PL', { maximumSignificantDigits: 4 }));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
const fmtDate = (iso) => (iso || '').split('-').reverse().join('.');
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const flagImg = (cc) => `<img class="flag" src="https://flagcdn.com/w80/${esc(cc || 'eu')}.png" alt="">`;
const svg = (d, size = 22, sw = 2) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ico = {
  back: svg('<path d="M15 18l-6-6 6-6"/>', 24, 2.2),
  chev: svg('<path d="M9 6l6 6-6 6"/>', 20, 2.2),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 22, 2.4),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 22, 2.2),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 22),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 22),
  home: svg('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', 24),
  chart: svg('<path d="M5 20V10M12 20V4M19 20v-7"/>', 24, 2.4),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 24),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', 16),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.6 4.5 4.5"/>', 16),
  wallet: svg('<path d="M3 7a2 2 0 0 1 2-2h12v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>', 22),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>', 22),
  swap: svg('<path d="M7 7h13l-4-4"/><path d="M17 17H4l4 4"/>', 22),
  pdf: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14h6M9 17h4"/>', 22),
  share: svg('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>', 22),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 24, 2.8),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 22),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', 22),
  widget: svg('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/>', 22),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', 22),
  bksp: svg('<path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>', 28, 2),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 22),
  photo: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>', 22),
  brush: svg('<path d="M3 17c3 0 4-2 6-2s3 2 6 2 4-2 6-2M3 11c3 0 4-2 6-2s3 2 6 2 4-2 6-2"/>', 22),
  split: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>', 22),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', 22),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>', 22),
  logo: '<img src="icons/icon-192.png" alt="" width="40" height="40" style="border-radius:11px;display:block">'
};

// ============================================================ motyw
function themeSetting() { return ls.get('theme', 'system'); }
function resolvedTheme() {
  const t = themeSetting();
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#0A1430' : '#F2F5FB');
  setBarsTheme(t === 'dark');
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (themeSetting() === 'system') { applyTheme(); scheduleRender(); } });

let toastTimer = null;
function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
async function copyText(t, msg) {
  try { await navigator.clipboard.writeText(t); toast(msg || 'Skopiowano'); }
  catch (e) { window.prompt('Skopiuj:', t); }
}
function fail(e) {
  console.error(e);
  const m = String(e && (e.code || e.message) || e);
  toast(m.includes('permission') ? 'Brak uprawnień (wyjazd rozliczony albo nie jesteś organizatorem)' : 'Coś poszło nie tak: ' + m, 4000);
}

// ============================================================ stan
const store = createStore();
const S = {
  uid: null, route: { name: 'home' }, trip: null, expenses: [], meta: { pending: false }, tripMeta: null,
  unsub: [], watching: null, filter: 'all', settleMode: 'pln', repTab: 0, newTrip: null, adminKey: null, online: navigator.onLine,
  add: null, picker: null, showAdminKey: false, joinOpen: false
};
const isAdmin = () => !!(S.trip && (S.trip.admins || []).includes(S.uid));
const isOpen = () => !!(S.trip && S.trip.status !== 'closed');
const meId = () => (S.trip ? ls.get('me:' + S.trip.id, null) : null);
const member = (id) => (S.trip?.members || []).find((m) => m.id === id);
const mName = (id) => (id === meId() ? 'Ty' : member(id)?.name || '?');
const mNameFull = (id) => member(id)?.name || '?';
const foreign = () => S.trip?.currency || 'EUR';

function rememberTrip(t) {
  const h = ls.get('history', []);
  const old = h.find((x) => x.code === t.id) || {};
  const exps = S.watching === t.id ? S.expenses : null;
  const c = t.cover || {};
  const entry = {
    ...old, code: t.id, title: t.title, country: t.country, status: t.status || 'open',
    cover: c.type === 'photo' ? { type: 'photo' } : c, people: totalWeight(t)
  };
  if (exps) {
    entry.total = computeBalances(t, exps).total;
    const d = exps.map((e) => e.date).filter(Boolean).sort();
    entry.from = d[0] || null; entry.to = d[d.length - 1] || null;
  }
  const rest = h.filter((x) => x.code !== t.id);
  const isFirst = h[0] && h[0].code === t.id;
  ls.set('history', (isFirst || !old.code ? [entry, ...rest] : h.map((x) => (x.code === t.id ? entry : x))).slice(0, 30));
  ls.set('lastTrip', t.id);
  if (c.type === 'photo' && c.data) {
    const sig = c.data.length;
    if (ls.get('thumbSig:' + t.id, 0) !== sig) makeThumb(c.data, 420).then((th) => { if (th) { ls.set('thumb:' + t.id, th); ls.set('thumbSig:' + t.id, sig); } });
  }
}

// ============================================================ routing
function parseHash() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 't' && p[1]) return { name: 'trip', code: decodeURIComponent(p[1]).toUpperCase(), sub: p[2] || '' };
  if (p[0] === 'reports') { const code = ls.get('lastTrip', null); return { name: 'reports', code }; }
  if (p[0] === 'settings') return { name: 'settings' };
  if (p[0] === 'new') return { name: 'new' };
  return { name: 'home' };
}
function go(hash) { if (location.hash !== hash) location.hash = hash; else onRoute(); }
function stopWatching() { S.unsub.forEach((f) => { try { f(); } catch (e) {} }); S.unsub = []; S.watching = null; }

function onRoute() {
  const r = parseHash();
  S.route = r;
  if (r.code !== S.watching) {
    stopWatching();
    closeAdd(); closePicker();
    S.trip = null; S.expenses = []; S.adminKey = null; S.showAdminKey = false; S.filter = 'all';
    if (r.code) watch(r.code);
  }
  if (r.name === 'new' && !S.newTrip) startNewTrip();
  render();
  window.scrollTo(0, 0);
}

function watch(code) {
  S.watching = code;
  S.loading = true;
  S.unsub.push(store.watchTrip(code, (trip, meta) => {
    S.loading = false;
    S.trip = trip;
    S.tripMeta = meta;
    if (trip) rememberTrip(trip);
    scheduleRender();
    if (S.pendingAdd && trip) { const c = S.pendingAdd; S.pendingAdd = null; openAdd(c); }
  }, (e) => { S.loading = false; S.trip = null; fail(e); scheduleRender(); }));
  S.unsub.push(store.watchExpenses(code, (list, meta) => {
    S.expenses = list;
    S.meta = meta;
    if (S.trip) rememberTrip(S.trip);
    scheduleRender();
  }, fail));
}

// ============================================================ render (zbiorczo, raz na klatkę)
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}
function render() {
  const app = $('#app');
  const r = S.route;
  let html = '';
  if (r.name === 'home') html = viewHome();
  else if (r.name === 'new') html = viewNewTrip();
  else if (r.name === 'settings') html = viewSettings();
  else if (r.name === 'reports') html = viewReportsNav();
  else if (r.name === 'trip') html = viewTripRoute();
  const act = document.activeElement;
  const keep = act && act.id && app.contains(act) ? { id: act.id, v: act.value, s: act.selectionStart } : null;
  if (keep && act.tagName === 'INPUT' && S.lastHtml === html) return;
  S.lastHtml = html;
  app.innerHTML = html;
  if (keep) {
    const el = document.getElementById(keep.id);
    if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch (e) {} }
  }
  if (r.name === 'trip' && r.sub === 'edit') drawQr();
  if (S.trip) scheduleWidget();
  hydratePhotos();
}

// ------------------------------------------------------------ zdjęcia (bez przerysowywania całego ekranu)
const PH = { res: {}, loaded: {} };
function photoBox(key, country, cls = '', extra = '') {
  const r = PH.res[key];
  const img = r && r.src ? `<img class="ph ${PH.loaded[r.src] ? 'ok' : ''}" src="${esc(r.src)}" alt="" onload="this.classList.add('ok')">` : '';
  return `<div class="photo ${cls}" data-photo="${esc(key)}" data-country="${esc(country || 'eu')}">${artSvg(country || 'eu', true)}${img}${extra}`;
}
async function hydratePhotos() {
  for (const el of document.querySelectorAll('[data-photo]')) {
    const key = el.dataset.photo;
    if (PH.res[key] !== undefined) continue;
    PH.res[key] = null;
    let p = null;
    try {
      if (key.startsWith('trip:') && S.trip) p = await tripPhoto(S.trip, 1280);
      else if (key.startsWith('hist:')) {
        const code = key.split(':')[1];
        const h = ls.get('history', []).find((x) => x.code === code);
        const thumb = ls.get('thumb:' + code, null);
        if (thumb) p = { src: thumb, own: true };
        else if (h) p = await tripPhoto({ country: h.country, cover: h.cover || {} }, 640);
      } else if (key === 'welcome') p = await findPhoto('Positano', { size: 1280, langs: ['en'] });
    } catch (e) {}
    PH.res[key] = p;
    if (p && p.src) {
      document.querySelectorAll(`[data-photo="${CSS.escape(key)}"]`).forEach((box) => {
        if (box.querySelector('img.ph')) return;
        const img = document.createElement('img');
        img.className = 'ph'; img.alt = '';
        img.onload = () => { img.classList.add('ok'); PH.loaded[p.src] = true; };
        img.src = p.src;
        box.appendChild(img);
        const cr = creditHtml(p, esc);
        if (cr && box.dataset.credit === '1') box.insertAdjacentHTML('beforeend', cr);
      });
    }
  }
}
const coverSig = (t) => { const c = t.cover || {}; return (c.type || 'auto') + ':' + (c.query || '') + ':' + (c.data ? c.data.length : 0); };
function makeThumb(dataUrl, w) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const h = Math.round(img.height * (w / img.width));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      res(cv.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

// ------------------------------------------------------------ awatary
const initials = (n) => String(n || '?').split(/\s+i\s+|\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
function avatar(id, cls = '') {
  const ms = S.trip?.members || [];
  const i = Math.max(0, ms.findIndex((m) => m.id === id));
  const m = member(id);
  return `<span class="av c${i % 6} ${cls}" aria-hidden="true">${m && m.photo ? `<img src="${esc(m.photo)}" alt="">` : esc(initials(m?.name))}</span>`;
}

// ------------------------------------------------------------ paski
function navbar(active) {
  const it = (k, href, label, icon) => `<a href="${href}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  return `<nav class="navbar" aria-label="Menu">${it('home', '#/', 'Wyjazdy', ico.home)}${it('reports', '#/reports', 'Raporty', ico.chart)}${it('settings', '#/settings', 'Ustawienia', ico.gear)}</nav>`;
}
function liveChip() {
  if (store.mode === 'demo') return '<span class="live demo"><i></i>Demo</span>';
  if (!S.online) return '<span class="live off"><i></i>Offline</span>';
  if (S.meta.pending || S.tripMeta?.pending) return '<span class="live busy"><i></i>Wysyłanie</span>';
  return '<span class="live"><i></i>Na żywo</span>';
}
function subTop(title, extra = '') {
  return `<header class="topbar"><a class="ibtn" href="#/t/${esc(S.trip.id)}" aria-label="Wróć">${ico.back}</a><h1>${title}</h1>${extra || '<span style="width:44px"></span>'}</header>`;
}

// ============================================================ ekrany
function viewHome() {
  const hist = ls.get('history', []);
  if (!hist.length) return viewWelcome();
  const upd = S.update;
  return `
  <main class="page nav-pad">
    <header class="topbar"><span style="width:44px">${ico.logo}</span><h1>Moje wyjazdy</h1><a class="ibtn" href="#/new" aria-label="Nowy wyjazd">${ico.plus}</a></header>
    ${upd ? `<div class="banner info"><span class="grow"><b>Nowa wersja ${esc(upd)}</b><br>Pobierz i zainstaluj na starej.</span><a class="btn primary sm" href="${APK_URL}" target="_blank" rel="noopener">Pobierz</a></div>` : ''}
    ${store.mode === 'demo' ? `<div class="banner warn">Tryb demo – dane tylko na tym urządzeniu.</div>` : ''}
    <div class="stack">
      ${hist.map((h) => `
        <a class="tripcard" href="#/t/${esc(h.code)}">
          ${photoBox('hist:' + h.code, h.country)}</div>
          <div class="info">
            <h2>${flagImg(h.country)}<span>${esc(h.title)}</span></h2>
            ${h.from ? `<div class="meta">${ico.cal}${fmtDate(h.from)}${h.to && h.to !== h.from ? ' – ' + fmtDate(h.to) : ''}</div>` : ''}
            ${h.people ? `<div class="meta">${ico.users}${h.people} ${h.people === 1 ? 'osoba' : h.people < 5 ? 'osoby' : 'osób'}</div>` : ''}
            <div class="sum">${h.total != null ? fmt(h.total) + ' zł' : '&nbsp;'}</div>
            <div>${h.status === 'closed' ? `<span class="pill ok">${svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 14, 3)} Rozliczony</span>` : `<span class="pill warn">● W trakcie</span>`}</div>
          </div>
          <span class="chev">${ico.chev}</span>
        </a>`).join('')}
    </div>
    <section class="card">
      <label class="field-label" for="join-code" style="margin:0">Dołącz do wyjazdu znajomego</label>
      <div class="row"><input id="join-code" class="input code" placeholder="WYJ-XXXXXX" autocomplete="off" autocapitalize="characters" enterkeyhint="go">
        <button class="btn primary" style="flex:none" data-act="join">Dołącz</button></div>
    </section>
  </main>${navbar('home')}`;
}

function viewWelcome() {
  return `
  <main class="welcome">
    ${photoBox('welcome', 'it')}</div><div class="shade"></div>
    <div class="inner">
      <img class="logo" src="icons/icon-512.png" alt="">
      <h1>Wy<span>jazdy</span></h1>
      <p>Wspólne wyjazdy,<br>proste rozliczenia</p>
      <div style="flex:1"></div>
      ${store.mode === 'demo' ? `<div class="banner warn">Tryb demo – dane tylko na tym urządzeniu.</div>` : ''}
      ${S.joinOpen ? `<div class="row"><input id="join-code" class="input code" placeholder="WYJ-XXXXXX" autocomplete="off" autocapitalize="characters" enterkeyhint="go"><button class="btn primary" style="flex:none" data-act="join">OK</button></div>` : ''}
      <a class="btn primary big" href="#/new">Rozpocznij nowy wyjazd</a>
      <button class="btn outline big" data-act="join-open">Mam kod wyjazdu</button>
    </div>
  </main>`;
}

// ------------------------------------------------------------ nowy wyjazd
function startNewTrip() {
  const cc = 'it';
  S.newTrip = { title: '', country: cc, currency: countryCurrency(cc), members: [], meId: null, pair: false, place: '' };
}
function viewNewTrip() {
  const n = S.newTrip;
  return `
  <main class="page">
    <header class="topbar"><a class="ibtn" href="#/" aria-label="Wróć">${ico.back}</a><h1>Nowy wyjazd</h1><span style="width:44px"></span></header>
    <section class="card">
      <label class="field-label" for="nt-title">Nazwa wyjazdu</label>
      <input id="nt-title" class="input" placeholder="np. Włochy 2026" value="${esc(n.title)}" data-change="nt-title">
      <div class="grid2">
        <div class="stack" style="gap:10px"><label class="field-label" for="nt-country">Kraj</label>
          <select id="nt-country" class="input" data-change="nt-country">${countryOptions(n.country)}</select></div>
        <div class="stack" style="gap:10px"><label class="field-label" for="nt-currency">Waluta</label>
          <select id="nt-currency" class="input" data-change="nt-currency">${CURRENCIES.map((c) => `<option ${c === n.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
      <label class="field-label" for="nt-place">Miejsce na zdjęcie (opcjonalnie)</label>
      <input id="nt-place" class="input" placeholder="np. Rimini, Dubrownik, Zakopane" value="${esc(n.place || '')}" data-change="nt-place">
    </section>
    <section class="card">
      <b style="font-size:17px">Kto jedzie?</b>
      <p class="muted small">Para to jeden wspólny portfel – liczona za 2 osoby. Kółkiem zaznacz siebie.</p>
      ${n.members.length ? `<div class="list" style="box-shadow:none;padding:0;border:0">${n.members.map((m) => `
        <div class="member"><div class="r1">
          <button class="radio ${n.meId === m.id ? 'on' : ''}" data-act="nt-me" data-id="${m.id}" aria-label="To ja: ${esc(m.name)}"></button>
          <span class="grow"><b>${esc(m.name)}</b><br><span class="muted small">${memberWeight(m) > 1 ? 'para · ' + memberWeight(m) + ' os.' : '1 os.'}${n.meId === m.id ? ' · to Ty' : ''}</span></span>
          <button class="link danger" data-act="nt-remove" data-id="${m.id}">Usuń</button>
        </div></div>`).join('')}</div>` : ''}
      ${addMemberForm('nt')}
    </section>
    <button class="btn primary big" data-act="nt-create" ${n.members.length < 2 ? 'disabled' : ''}>Utwórz wyjazd</button>
    ${n.members.length < 2 ? '<p class="muted small center">Dodaj co najmniej 2 osoby lub pary.</p>' : ''}
  </main>`;
}
function countryOptions(sel) { return COUNTRIES.map(([c, name]) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(name)}</option>`).join(''); }
function addMemberForm(prefix) {
  const pair = prefix === 'nt' ? S.newTrip.pair : S.pairForm;
  return `
    <div class="stack" style="gap:10px">
      <div class="seg">
        <button class="${!pair ? 'on' : ''}" data-act="${prefix}-pair" data-v="0">Osoba</button>
        <button class="${pair ? 'on' : ''}" data-act="${prefix}-pair" data-v="1">Para</button>
      </div>
      <div class="row">
        <input id="${prefix}-n1" class="input" placeholder="${pair ? 'Imię 1' : 'Imię'}" enterkeyhint="done" data-enter="${prefix}-add">
        ${pair ? `<span class="muted">i</span><input id="${prefix}-n2" class="input" placeholder="Imię 2" enterkeyhint="done" data-enter="${prefix}-add">` : ''}
        <button class="btn primary" style="flex:none;width:52px;padding:0" data-act="${prefix}-add" aria-label="Dodaj">${ico.plus}</button>
      </div>
    </div>`;
}
function readMemberForm(prefix, pair) {
  const n1 = ($('#' + prefix + '-n1')?.value || '').trim();
  const n2 = ($('#' + prefix + '-n2')?.value || '').trim();
  if (!n1 || (pair && !n2)) { toast(pair ? 'Wpisz oba imiona' : 'Wpisz imię'); return null; }
  return { id: newId(), name: pair ? `${n1} i ${n2}` : n1, weight: pair ? 2 : 1 };
}

// ------------------------------------------------------------ wyjazd
function viewTripRoute() {
  if (S.loading && !S.trip) return `<main class="page center-page"><div class="spinner"></div><p class="muted">Łączenie…</p></main>`;
  if (!S.trip) return `
    <main class="page center-page">
      <h2>Nie znaleziono wyjazdu</h2>
      <p class="muted">Kod ${esc(S.route.code)} nie istnieje albo wyjazd został usunięty.</p>
      <button class="btn" data-act="forget" data-code="${esc(S.route.code)}">Usuń z mojej listy</button>
      <a class="btn primary" href="#/">Wróć</a>
    </main>`;
  if (!meId() && !S.skipMe) return viewPickMe();
  const sub = S.route.sub;
  if (sub === 'expenses') return viewExpenses();
  if (sub === 'settle') return viewSettle();
  if (sub === 'report') return `<main class="page">${subTop('Raport wydatków')}${reportBody()}</main>`;
  if (sub === 'edit') return viewEdit();
  return viewDashboard();
}
function viewPickMe() {
  const t = S.trip;
  return `
  <main class="page">
    <header class="topbar"><a class="ibtn" href="#/" aria-label="Wróć">${ico.back}</a><h1>${esc(t.title)}</h1><span style="width:44px"></span></header>
    <h2 style="font-size:26px;font-weight:800">Kim jesteś?</h2>
    <p class="muted">Dzięki temu pokażę Twój bilans i ustawię Cię jako płacącego.</p>
    <div class="stack">
      ${(t.members || []).map((m) => `<button class="opt" data-act="pick-me" data-id="${m.id}">${avatar(m.id)}<span class="grow"><b>${esc(m.name)}</b><span>${memberWeight(m) > 1 ? 'para · ' + memberWeight(m) + ' os.' : '1 os.'}</span></span>${ico.chev}</button>`).join('')}
    </div>
    <button class="btn ghost" data-act="skip-me">Tylko podgląd</button>
  </main>`;
}

function tripDates() {
  const d = S.expenses.map((e) => e.date).filter(Boolean).sort();
  if (!d.length) return '';
  return d[0] === d[d.length - 1] ? fmtDate(d[0]) : fmtDay(d[0]) + ' – ' + fmtDate(d[d.length - 1]);
}
function viewDashboard() {
  const t = S.trip, me = meId();
  const b = computeBalances(t, S.expenses);
  const myBal = me ? round2(b.balance[me] || 0) : 0;
  const tr = settle(b.balance);
  let hint = '';
  if (me) {
    if (myBal > 0.009) { const who = tr.filter((x) => x.to === me).map((x) => mNameFull(x.from)); hint = (who.join(', ') || 'Inni') + (who.length > 1 ? ' oddadzą Ci' : ' odda Ci'); }
    else if (myBal < -0.009) { const to = tr.filter((x) => x.from === me).map((x) => mNameFull(x.to)); hint = 'Oddajesz: ' + (to.join(', ') || 'innym'); }
    else hint = 'Jesteś rozliczony – nikt nikomu nic';
  }
  const recent = [...S.expenses].sort((a, c) => (c.date || '').localeCompare(a.date || '') || (c.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  const key = 'trip:' + t.id + ':' + coverSig(t);
  const dates = tripDates();
  return `
  <main class="page flush">
    ${photoBox(key, t.country, 'hero', '')}
      <div class="shade"></div>
      <div class="bar"><a class="ibtn onphoto" href="#/" aria-label="Wróć">${ico.back}</a><span class="sp"></span>${liveChip()}
        <button class="ibtn onphoto" data-act="toggle-theme" aria-label="Jasny lub ciemny motyw">${resolvedTheme() === 'dark' ? ico.sun : ico.moon}</button>
        <a class="ibtn onphoto" href="#/t/${esc(t.id)}/edit" aria-label="Ustawienia wyjazdu">${ico.edit}</a></div>
      <div class="title">
        <h2>${flagImg(t.country)}<span>${esc(t.title)}</span></h2>
        <div class="meta">${dates ? `<span>${ico.cal}${esc(dates)}</span>` : ''}<span>${ico.users}${totalWeight(t)} ${totalWeight(t) < 5 ? 'osoby' : 'osób'}</span></div>
      </div>
    </div>
    ${!isOpen() ? `<div class="banner ok">${ico.check}<span><b>Wyjazd rozliczony.</b> Tylko do odczytu.</span></div>` : ''}
    <div class="people">${(t.members || []).map((m) => `<a class="person" href="#/t/${esc(t.id)}/edit" style="text-decoration:none;color:inherit">${avatar(m.id, 'lg')}<span>${esc(m.id === me ? 'Ty' : m.name)}</span></a>`).join('')}</div>
    ${me ? `<a class="balance ${myBal > 0.009 ? '' : myBal < -0.009 ? 'neg' : 'zero'}" href="#/t/${esc(t.id)}/settle">
      <span class="grow"><span class="t">Twój bilans</span><div class="v">${signed(myBal)} zł</div><span class="h">${esc(hint)}</span></span>${ico.chev}</a>` : ''}
    <div class="tiles">
      <div class="tile"><span class="ico">${ico.wallet}</span><span class="grow"><span>Łączne wydatki</span><b>${fmt(b.total)} zł</b></span></div>
      <div class="tile"><span class="ico">${ico.user}</span><span class="grow"><span>Na osobę</span><b>${fmt(b.total / (totalWeight(t) || 1))} zł</b></span></div>
    </div>
    ${isOpen() ? `<button class="btn primary big" data-act="add">${ico.plus} Dodaj wydatek</button>` : ''}
    <div class="quick">
      <a href="#/t/${esc(t.id)}/settle">${ico.swap}Rozliczenie</a>
      <a href="#/t/${esc(t.id)}/report">${ico.chart}Raport</a>
      <button data-act="pdf">${ico.pdf}PDF</button>
    </div>
    <div class="sec-title">Ostatnie wydatki ${S.expenses.length ? `<a href="#/t/${esc(t.id)}/expenses">Zobacz wszystkie ›</a>` : ''}</div>
    ${recent.length ? `<div class="list">${recent.map(expenseRow).join('')}</div>` : `<div class="empty">Brak wydatków. Stuknij „Dodaj wydatek”.</div>`}
  </main>`;
}

function expenseSub(e) {
  const type = e.type || 'shared';
  const d = e.date ? fmtDate(e.date) + ' · ' : '';
  if (type === 'loan') return d + `${esc(mName(e.payer))} → ${esc(mName(e.recipient))}`;
  if (type === 'transfer') return d + `${esc(mName(e.payer))} oddał(a) → ${esc(mName(e.recipient))}`;
  if (e.shares) return d + `${esc(mName(e.payer))} · indywidualnie`;
  const n = Array.isArray(e.splitAmong) && e.splitAmong.length ? e.splitAmong.length : (S.trip.members || []).length;
  const all = n === (S.trip.members || []).length;
  return d + `${esc(mName(e.payer))}${all ? '' : ' · dla ' + n + ' z ' + (S.trip.members || []).length}`;
}
function expenseRow(e) {
  const k = iconKey(e);
  const badge = e.type === 'loan' ? ' <span class="badge loan">POŻYCZKA</span>' : e.type === 'transfer' ? ' <span class="badge ok">ZWROT</span>' : '';
  return `
  <button class="exp" data-act="edit" data-id="${esc(e.id)}">
    <span class="ei" style="background:${iconBg(k)}">${iconSvg(k, 22)}</span>
    <span class="grow"><span class="t">${esc(e.desc || e.category || 'Wydatek')}${badge}</span><span class="s">${expenseSub(e)}${e.note ? ' · ' + esc(e.note) : ''}</span></span>
    <span class="a"><b>${money(e.amount, e.currency)}</b>${e.currency !== 'PLN' ? `<span>${money(toPLN(e, S.trip.rate), 'PLN')}</span>` : ''}</span>
  </button>`;
}
function viewExpenses() {
  const me = meId();
  let list = [...S.expenses];
  if (S.filter === 'mine' && me) list = list.filter((e) => e.payer === me || e.recipient === me || ((e.type || 'shared') === 'shared' && (!e.splitAmong?.length || e.splitAmong.includes(me)) && (!e.shares || e.shares[me])));
  list.sort((a, c) => (c.date || '').localeCompare(a.date || '') || (c.createdAt || 0) - (a.createdAt || 0));
  const groups = [];
  for (const e of list) { const g = groups[groups.length - 1]; if (g && g.date === e.date) g.items.push(e); else groups.push({ date: e.date, items: [e] }); }
  return `
  <main class="page ${isOpen() ? 'bar-pad' : ''}">
    ${subTop(`Wydatki (${S.expenses.length})`)}
    ${me ? `<div class="seg"><button class="${S.filter === 'all' ? 'on' : ''}" data-act="filter" data-v="all">Wszystkie</button><button class="${S.filter === 'mine' ? 'on' : ''}" data-act="filter" data-v="mine">Moje</button></div>` : ''}
    ${groups.length ? groups.map((g) => `<div class="day">${esc(dayLabel(g.date || todayISO()))}</div><div class="list">${g.items.map(expenseRow).join('')}</div>`).join('') : '<div class="empty">Brak wydatków.</div>'}
  </main>
  ${isOpen() ? `<div class="actionbar"><button class="btn primary big" data-act="add">${ico.plus} Dodaj wydatek</button></div>` : ''}`;
}
function dayLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  const nice = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  if (iso === todayISO()) return 'Dziś · ' + nice;
  return nice;
}

// ------------------------------------------------------------ rozliczenie
function viewSettle() {
  const t = S.trip;
  const hasF = foreign() !== 'PLN';
  const mode = hasF ? S.settleMode : 'pln';
  const cur = mode === 'pln' ? null : mode;
  const b = computeBalances(t, S.expenses, cur ? { currency: cur } : {});
  const unit = cur || 'PLN';
  const tr = settle(b.balance);
  const done = S.expenses.filter((e) => e.type === 'transfer').sort((a, c) => (c.createdAt || 0) - (a.createdAt || 0));
  const allTr = settle(computeBalances(t, S.expenses).balance).length;
  return `
  <main class="page">
    ${subTop('Rozliczenie wyjazdu')}
    <div class="done-head">
      <div class="ok ${tr.length ? 'wait' : ''}">${tr.length ? ico.swap : ico.check}</div>
      <h2>${tr.length ? `Do oddania: ${tr.length} ${tr.length === 1 ? 'przelew' : tr.length < 5 ? 'przelewy' : 'przelewów'}` : 'Rozliczenie zakończone!'}</h2>
      <p class="muted small">${tr.length ? 'Najmniej przelewów, żeby wszyscy wyszli na zero.' : 'Wszyscy są na zero.'}</p>
    </div>
    ${hasF ? `<div class="seg">
      <button class="${mode === 'pln' ? 'on' : ''}" data-act="settle-mode" data-v="pln">Wszystko w PLN</button>
      <button class="${mode === foreign() ? 'on' : ''}" data-act="settle-mode" data-v="${esc(foreign())}">Tylko ${esc(foreign())}</button>
      <button class="${mode === 'PLN' ? 'on' : ''}" data-act="settle-mode" data-v="PLN">Tylko PLN</button>
    </div>` : ''}
    <div class="list">${(t.members || []).map((m) => {
      const v = round2(b.balance[m.id] || 0);
      return `<div class="who">${avatar(m.id)}<span class="n"><b>${esc(m.name)}${m.id === meId() ? ' (Ty)' : ''}</b><span>${v > 0 ? 'ma otrzymać' : v < 0 ? 'powinien(-na) dopłacić' : 'rozliczony'}</span></span>
        <span class="pill ${v > 0 ? 'ok' : v < 0 ? 'neg' : 'blue'}">${signed(v)} ${esc(sym(unit))}</span></div>`;
    }).join('')}</div>
    ${tr.length ? `<div class="sec-title">Kto komu oddaje</div>` : ''}
    ${tr.map((x) => `
      <section class="card trc">
        <div class="top">${avatar(x.from)}<span class="arrow">${svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 20)}</span>${avatar(x.to)}
          <span class="names"><b>${esc(mNameFull(x.from))}</b>oddaje → ${esc(mNameFull(x.to))}</span>
          <span class="amt">${money(x.amount, unit)}</span></div>
        ${unit !== 'PLN' ? `<div class="muted small">≈ ${money(x.amount * t.rate, 'PLN')}</div>` : ''}
        ${isOpen() ? `<div class="grid2">
          <button class="btn sm" style="flex:1" data-act="copy-amt" data-v="${x.amount.toFixed(2).replace('.', ',')}">Kopiuj kwotę</button>
          <button class="btn primary sm" style="flex:1" data-act="mark-paid" data-from="${x.from}" data-to="${x.to}" data-amt="${x.amount}" data-cur="${unit}">${svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 18, 2.8)} Oddane</button>
        </div>` : ''}
      </section>`).join('')}
    ${done.length ? `<div class="sec-title">Oddane</div><div class="list">${done.map((e) => `
      <div class="who">${avatar(e.payer, 'sm')}<span class="n"><b>${esc(mNameFull(e.payer))} → ${esc(mNameFull(e.recipient))}</b><span>${fmtDate(e.date)}</span></span>
        <b class="nowrap">${money(e.amount, e.currency)}</b>${isOpen() ? `<button class="link danger" data-act="undo-paid" data-id="${esc(e.id)}">Cofnij</button>` : ''}</div>`).join('')}</div>` : ''}
    <button class="btn primary big" data-act="share-result">${ico.share} Udostępnij wynik</button>
    <div class="grid2">
      <button class="btn" data-act="pdf">${ico.pdf} Raport PDF</button>
      ${isOpen() && isAdmin() ? `<button class="btn" data-act="close-trip" data-remaining="${allTr}">${ico.check} Zakończ</button>` : !isOpen() && isAdmin() ? `<button class="btn" data-act="reopen">Otwórz ponownie</button>` : `<a class="btn" href="#/t/${esc(t.id)}/report">${ico.chart} Raport</a>`}
    </div>
  </main>`;
}

// ------------------------------------------------------------ raport
function reportData() {
  const t = S.trip;
  const b = computeBalances(t, S.expenses);
  const cats = {};
  S.expenses.filter((e) => (e.type || 'shared') === 'shared').forEach((e) => {
    const k = e.category || 'Inne';
    if (!cats[k]) cats[k] = { name: k, sum: 0, n: 0, key: iconKey({ category: k, desc: e.desc }) };
    cats[k].sum += toPLN(e, t.rate); cats[k].n++;
  });
  const list = Object.values(cats).sort((a, c) => c.sum - a.sum);
  const palette = ['#2F80FF', '#FF8A3D', '#22B98A', '#A06BFF', '#FF5C8A', '#FFB547', '#16B5C9', '#5B8CFF', '#C7834B', '#8899BB'];
  list.forEach((c, i) => { c.color = palette[i % palette.length]; });
  return { b, list };
}
function donut(list, total) {
  const R = 60, C = 2 * Math.PI * R;
  let off = 0;
  const segs = list.map((c) => {
    const len = total ? (c.sum / total) * C : 0;
    const s = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${c.color}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 1.5)} ${C}" stroke-dashoffset="${-off}"/>`;
    off += len;
    return s;
  }).join('');
  return `<div class="donut"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="${R}" fill="none" stroke="var(--card2)" stroke-width="22"/>${segs}</svg>
    <div class="c"><b>${fmt0(total)} zł</b><span>Razem</span></div></div>`;
}
function reportBody() {
  const t = S.trip;
  const { b, list } = reportData();
  const tabs = ['Podsumowanie', 'Kategorie', 'Osoby'];
  let body = '';
  if (S.repTab === 0) {
    body = `
      <section class="card">
        ${list.length ? `<div class="donut-wrap">${donut(list, b.total)}
          <div class="legend">${list.slice(0, 7).map((c) => `<div><i style="background:${c.color}"></i><span>${esc(c.name)}</span><em>${b.total ? Math.round((c.sum / b.total) * 1000) / 10 : 0}%</em></div>`).join('')}</div></div>` : '<div class="empty">Brak wydatków do pokazania.</div>'}
      </section>
      <div class="sec-title">Wydatki na osobę</div>
      <section class="card"><div class="perperson">${(t.members || []).map((m) => `<div>${avatar(m.id, 'lg')}<span>${esc(m.name)}</span><b>${fmt(b.share[m.id] || 0)} zł</b></div>`).join('')}</div></section>`;
  } else if (S.repTab === 1) {
    const max = Math.max(1, ...list.map((c) => c.sum));
    body = list.length ? `<div class="list bars">${list.map((c) => `
      <div><span class="row" style="gap:10px"><span class="ei" style="width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${iconBg(c.key)}">${iconSvg(c.key, 18)}</span><b>${esc(c.name)}</b><span class="muted small">${c.n}×</span></span>
        <b class="nowrap">${fmt(c.sum)} zł</b><span class="bar"><i style="width:${(c.sum / max) * 100}%;background:${c.color}"></i></span></div>`).join('')}</div>` : '<div class="empty">Brak wydatków.</div>';
  } else {
    body = `<div class="list">${(t.members || []).map((m) => {
      const v = round2(b.balance[m.id] || 0);
      return `<div class="who">${avatar(m.id)}<span class="n"><b>${esc(m.name)}</b><span>zapłacił(a) ${fmt(b.paid[m.id] || 0)} zł · udział ${fmt(b.share[m.id] || 0)} zł</span></span>
        <span class="pill ${v > 0 ? 'ok' : v < 0 ? 'neg' : 'blue'}">${signed(v)} zł</span></div>`;
    }).join('')}</div>`;
  }
  return `
    <div class="seg swipe-tabs">${tabs.map((x, i) => `<button class="${S.repTab === i ? 'on' : ''}" data-act="rep-tab" data-v="${i}">${x}</button>`).join('')}</div>
    <div class="swipe-area stack">${body}</div>
    <button class="btn" data-act="pdf">${ico.pdf} Eksportuj raport PDF</button>`;
}
function viewReportsNav() {
  if (!S.route.code) return `<main class="page nav-pad"><header class="topbar left"><h1>Raporty</h1></header><div class="empty">Najpierw utwórz albo otwórz wyjazd.</div></main>${navbar('reports')}`;
  if (S.loading && !S.trip) return `<main class="page nav-pad center-page"><div class="spinner"></div></main>${navbar('reports')}`;
  if (!S.trip) return `<main class="page nav-pad"><header class="topbar left"><h1>Raporty</h1></header><div class="empty">Nie udało się wczytać wyjazdu.</div></main>${navbar('reports')}`;
  const hist = ls.get('history', []);
  return `
  <main class="page nav-pad">
    <header class="topbar left"><h1>Raport wydatków</h1></header>
    ${hist.length > 1 ? `<select class="input" data-change="rep-trip" aria-label="Wyjazd">${hist.map((h) => `<option value="${esc(h.code)}" ${h.code === S.trip.id ? 'selected' : ''}>${esc(h.title)}</option>`).join('')}</select>` : `<div class="label">${esc(S.trip.title)}</div>`}
    ${reportBody()}
  </main>${navbar('reports')}`;
}

// ------------------------------------------------------------ ustawienia (globalne)
const WSTYLES = [['blue', 'Niebieski'], ['violet', 'Fiolet'], ['teal', 'Morski'], ['sunset', 'Zachód'], ['light', 'Jasny'], ['dark', 'Ciemny'], ['clear', 'Bez tła']];
function viewSettings() {
  const th = themeSetting();
  const ws = ls.get('wstyle', 'blue');
  const last = ls.get('lastTrip', null);
  return `
  <main class="page nav-pad">
    <header class="topbar left"><h1>Ustawienia</h1></header>
    <div class="label">Motyw aplikacji</div>
    <div class="seg">
      <button class="${th === 'system' ? 'on' : ''}" data-act="theme" data-v="system">Systemowy</button>
      <button class="${th === 'light' ? 'on' : ''}" data-act="theme" data-v="light">Jasny</button>
      <button class="${th === 'dark' ? 'on' : ''}" data-act="theme" data-v="dark">Ciemny</button>
    </div>
    <div class="label">Wygląd widżetów${isNative ? '' : ' (aplikacja Android)'}</div>
    <section class="card"><div class="swatches">${WSTYLES.map(([k, n]) => `<button class="sw ${ws === k ? 'on' : ''}" data-act="wstyle" data-v="${k}"><i class="w-${k}"></i>${n}</button>`).join('')}</div>
      <p class="muted small">Widżety dodasz, przytrzymując palec na ekranie głównym → Widżety → Wyjazdy.</p></section>
    ${last ? `<div class="label">Bieżący wyjazd</div>
    <div class="list">
      <a class="setrow" href="#/t/${esc(last)}/edit"><span class="si">${ico.share}</span><span class="grow">Udostępnij wyjazd</span>${ico.chev}</a>
      <a class="setrow" href="#/t/${esc(last)}/report"><span class="si">${ico.pdf}</span><span class="grow">Eksport do PDF</span>${ico.chev}</a>
      <a class="setrow" href="#/t/${esc(last)}/edit"><span class="si">${ico.edit}</span><span class="grow">Waluta, kurs, osoby, okładka</span>${ico.chev}</a>
    </div>` : ''}
    <div class="label">Aplikacja</div>
    <div class="list">
      <div class="setrow"><span class="si">${ico.info}</span><span class="grow">Wersja</span><span class="v">1.${APP_BUILD} · ${store.mode === 'demo' ? 'demo' : 'Firebase'}</span></div>
      ${isNative ? `<a class="setrow" href="${APK_URL}" target="_blank" rel="noopener"><span class="si">${ico.share}</span><span class="grow">Pobierz najnowszą wersję</span>${ico.chev}</a>` : `<a class="setrow" href="${APK_URL}" target="_blank" rel="noopener"><span class="si">${ico.share}</span><span class="grow">Aplikacja na Androida (APK)</span>${ico.chev}</a>`}
    </div>
  </main>${navbar('settings')}`;
}

// ------------------------------------------------------------ edycja wyjazdu
function viewEdit() {
  const t = S.trip, admin = isAdmin(), me = meId();
  const used = new Set();
  S.expenses.forEach((e) => { used.add(e.payer); if (e.recipient) used.add(e.recipient); (e.splitAmong || []).forEach((x) => used.add(x)); Object.keys(e.shares || {}).forEach((x) => used.add(x)); });
  const c = t.cover || {};
  const ckey = 'trip:' + t.id + ':' + coverSig(t);
  return `
  <main class="page">
    ${subTop('Wyjazd i osoby')}
    <section class="card">
      <div class="invite">
        <div id="qr" class="qr" role="img" aria-label="Kod QR zaproszenia"></div>
        <div class="grow stack" style="gap:8px">
          <span class="label">Kod zaproszenia</span>
          <span class="code-big">${esc(t.id)}</span>
          <div class="row" style="flex-wrap:wrap"><button class="btn primary sm" data-act="share-link">${ico.share} Wyślij link</button><button class="btn sm" data-act="copy-code">Kopiuj</button></div>
        </div>
      </div>
    </section>

    <div class="sec-title">Osoby <span class="muted small">${totalWeight(t)} os.</span></div>
    <div class="list">
      ${(t.members || []).map((m) => `
        <div class="member">
          <div class="r1">${avatar(m.id)}
            <span class="grow"><b>${esc(m.name)}</b>${m.id === me ? ' <span class="pill blue">Ty</span>' : ''}<br><span class="muted small">${memberWeight(m) > 1 ? 'para · ' : ''}${memberWeight(m)} os.</span></span>
            ${m.id !== me ? `<button class="link" data-act="pick-me" data-id="${m.id}">To ja</button>` : ''}
          </div>
          ${admin && isOpen() ? `<div class="tools">
            <span class="muted small">Osób:</span>
            <span class="stepper"><button data-act="weight" data-id="${m.id}" data-d="-1" aria-label="Mniej">−</button><button data-act="weight" data-id="${m.id}" data-d="1" aria-label="Więcej">+</button></span>
            <label class="link">Zdjęcie<input type="file" accept="image/*" hidden data-change="member-photo" data-id="${m.id}"></label>
            <button class="link" data-act="rename" data-id="${m.id}">Nazwa</button>
            ${!used.has(m.id) ? `<button class="link danger" data-act="remove-member" data-id="${m.id}">Usuń</button>` : ''}
          </div>` : ''}
        </div>`).join('')}
    </div>
    ${admin && isOpen() ? `<section class="card">${addMemberForm('pm')}</section>` : ''}

    ${admin ? `
    <div class="sec-title">Okładka</div>
    <section class="card">
      ${photoBox(ckey, t.country, 'coverbox')}</div>
      <div class="cover-pick">
        <button class="${!c.type || c.type === 'place' ? 'on' : ''}" data-act="cover-auto">${ico.pin}Zdjęcie miejsca</button>
        <label class="${c.type === 'photo' ? 'on' : ''}">${ico.photo}Własne<input type="file" accept="image/*" data-change="cover-file" hidden></label>
        <button class="${c.type === 'art' ? 'on' : ''}" data-act="cover-art">${ico.brush}Rysunek</button>
      </div>
      <div class="row"><input id="cv-place" class="input" placeholder="Miejsce, np. Rimini" value="${esc(c.query || '')}" enterkeyhint="search" data-enter="cover-place"><button class="btn primary" style="flex:none" data-act="cover-place">Szukaj</button></div>
      <p class="muted small">Puste pole = typowe zdjęcie kraju. Zdjęcia z Wikipedii (Wikimedia Commons).</p>
    </section>

    <div class="sec-title">Ustawienia wyjazdu</div>
    <section class="card">
      <label class="field-label" for="st-title">Nazwa</label>
      <input id="st-title" class="input" value="${esc(t.title)}">
      <div class="grid2">
        <div class="stack" style="gap:10px"><label class="field-label" for="st-country">Kraj</label><select id="st-country" class="input">${countryOptions(t.country)}</select></div>
        <div class="stack" style="gap:10px"><label class="field-label" for="st-currency">Waluta</label><select id="st-currency" class="input">${CURRENCIES.map((x) => `<option ${x === t.currency ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div>
      <label class="field-label" for="st-rate">Kurs: 1 ${esc(foreign())} = ? zł</label>
      <div class="row"><input id="st-rate" class="input" type="number" step="any" inputmode="decimal" value="${t.rate}" ${isOpen() ? '' : 'disabled'}>${isOpen() ? '<button class="btn" style="flex:none" data-act="nbp">Kurs NBP</button>' : ''}</div>
      <p class="muted small">${t.rateDate ? 'Kurs z ' + esc(t.rateDate) + (t.rateSource ? ' (' + esc(t.rateSource) + ')' : '') : ''}</p>
      <label class="field-label" for="st-cats">Kategorie (jedna w linii)</label>
      <textarea id="st-cats" class="input" rows="5">${esc((t.categories || DEFAULT_CATEGORIES).join('\n'))}</textarea>
      <button class="btn primary" data-act="save-settings">Zapisz ustawienia</button>
    </section>
    <section class="card">
      <b>Drugi organizator</b>
      <p class="muted small">Daj ten kod osobie, która też ma zarządzać wyjazdem.</p>
      ${S.showAdminKey ? `<div class="code-big center">${esc(S.adminKey || '…')}</div>` : `<button class="btn" data-act="show-admin-key">${ico.key} Pokaż kod organizatora</button>`}
    </section>
    <button class="btn danger" data-act="delete-trip">Usuń cały wyjazd</button>` : `
    <section class="card">
      <label for="admin-key"><b>Jesteś organizatorem?</b></label>
      <p class="muted small">Wpisz kod organizatora, żeby zmieniać ustawienia.</p>
      <div class="row"><input id="admin-key" class="input code" placeholder="XXXX-XXXX" autocapitalize="characters"><button class="btn primary" style="flex:none" data-act="claim-admin">OK</button></div>
    </section>`}
    <button class="btn ghost" data-act="forget" data-code="${esc(t.id)}">Usuń wyjazd z mojej listy</button>
  </main>`;
}
function inviteUrl() { return (isNative ? WEB_URL : location.origin + location.pathname) + '?join=' + encodeURIComponent(S.trip.id); }
function drawQr() {
  const el = $('#qr');
  if (!el || typeof window.qrcode !== 'function') return;
  try { const qr = window.qrcode(0, 'M'); qr.addData(inviteUrl()); qr.make(); el.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) {}
}

// ============================================================ dodawanie wydatku
function openAdd(currency) {
  if (!S.trip || !isOpen()) return;
  const me = meId(), t = S.trip;
  const cur = currency === 'foreign' ? foreign() : currency || ls.get('lastCur:' + t.id, foreign());
  S.add = {
    mode: 'add', id: null, amount: '', currency: foreign() === 'PLN' ? 'PLN' : cur,
    category: null, desc: '', note: '', date: todayISO(),
    payer: me && member(me) ? me : t.members[0]?.id,
    split: 'equal', among: t.members.map((m) => m.id), shares: {}, recipient: null
  };
  renderAdd();
}
function openEdit(id) {
  const e = S.expenses.find((x) => x.id === id);
  if (!e) return;
  if (!isOpen()) { toast('Wyjazd rozliczony – tylko podgląd'); return; }
  const t = S.trip, type = e.type || 'shared';
  const among = Array.isArray(e.splitAmong) && e.splitAmong.length ? e.splitAmong : t.members.map((m) => m.id);
  S.add = {
    mode: 'edit', id, amount: String(e.amount).replace('.', ','), currency: e.currency,
    category: e.category || null, desc: e.desc || '', note: e.note || '', date: e.date || todayISO(), payer: e.payer,
    split: type === 'loan' ? 'loan' : type === 'transfer' ? 'transfer' : e.shares ? 'custom' : among.length === t.members.length ? 'equal' : 'some',
    among, shares: e.shares ? Object.fromEntries(Object.entries(e.shares).map(([k, v]) => [k, String(v).replace('.', ',')])) : {}, recipient: e.recipient || null
  };
  renderAdd();
}
function closeAdd() { S.add = null; const r = $('#sheet-root'); if (r) r.innerHTML = ''; document.body.classList.remove('no-scroll'); }
const amountValue = () => { const v = parseFloat((S.add.amount || '0').replace(',', '.')); return isNaN(v) ? 0 : v; };
function amountText() {
  const raw = S.add.amount || '0';
  const [i, d] = raw.split(',');
  const int = Number(i || 0).toLocaleString('pl-PL').replace(/ /g, ' ');
  return d !== undefined ? int + ',' + d : int;
}
function amountClass() { const n = amountText().length; return n > 10 ? 'xlong' : n > 7 ? 'long' : ''; }
function convText() {
  const a = S.add;
  if (a.currency === 'PLN') return foreign() !== 'PLN' ? `≈ ${money(amountValue() / S.trip.rate, foreign())}` : '&nbsp;';
  return `≈ ${money(amountValue() * S.trip.rate, 'PLN')} · kurs ${fmtRate(S.trip.rate)}`;
}
function splitLabel() {
  const a = S.add, ms = S.trip.members;
  if (a.split === 'equal') return `Po równo na wszystkich (${totalWeight(S.trip)} os.)`;
  if (a.split === 'some') return 'Wybrane: ' + (a.among.map(mNameFull).join(', ') || '—');
  if (a.split === 'custom') return 'Indywidualnie (' + Object.values(a.shares).filter((v) => parseFloat(String(v).replace(',', '.')) > 0).length + ' os.)';
  if (a.split === 'loan') return 'Pożyczka dla: ' + (a.recipient ? mNameFull(a.recipient) : 'wybierz…');
  if (a.split === 'transfer') return 'Zwrot dla: ' + (a.recipient ? mNameFull(a.recipient) : 'wybierz…');
  return '';
}
function renderAdd() {
  const a = S.add;
  if (!a) return;
  const t = S.trip;
  const k = a.category ? iconKey({ category: a.category }) : 'other';
  document.body.classList.add('no-scroll');
  $('#sheet-root').innerHTML = `
  <div class="add" role="dialog" aria-modal="true" aria-label="${a.mode === 'add' ? 'Dodaj wydatek' : 'Edytuj wydatek'}">
    <div class="scroll">
      <header class="topbar">
        <button class="ibtn" data-act="add-close" aria-label="Zamknij">${ico.close}</button>
        <h1>${a.mode === 'add' ? 'Dodaj wydatek' : a.split === 'transfer' ? 'Zwrot' : 'Edytuj wydatek'}</h1>
        ${a.mode === 'edit' ? `<button class="ibtn" data-act="add-delete" aria-label="Usuń wydatek" style="color:var(--neg)">${ico.trash}</button>` : '<span style="width:44px"></span>'}
      </header>
      ${foreign() !== 'PLN' ? `<div class="seg">
        <button class="${a.currency === foreign() ? 'on' : ''}" data-act="add-cur" data-v="${esc(foreign())}">${esc(sym(foreign()))} ${esc(foreign() === 'EUR' ? 'Euro' : foreign())}</button>
        <button class="${a.currency === 'PLN' ? 'on' : ''}" data-act="add-cur" data-v="PLN">zł Złotówki</button>
      </div>` : ''}
      <div class="amount-card">
        <div class="row"><span class="lbl grow">Kwota</span>
          <label class="pill blue" style="position:relative">${ico.cal}<span id="add-date-txt">${a.date === todayISO() ? 'Dziś' : fmtDate(a.date)}</span><input id="add-date" type="date" value="${esc(a.date)}" data-change="add-date" aria-label="Data" style="position:absolute;inset:0;opacity:0;width:100%"></label></div>
        <div class="amount ${amountClass()}" id="add-amount">${amountText()}<small>${esc(sym(a.currency))}</small></div>
        <div class="conv" id="add-conv">${convText()}</div>
      </div>
      ${a.split !== 'transfer' ? `<button class="rowbtn" data-act="pick" data-v="cat">
        <span class="ri" style="background:${iconBg(k)}">${iconSvg(k, 24)}</span>
        <span class="rt"><span>Kategoria</span><b>${esc(a.category || 'Wybierz kategorię')}</b></span><span class="chev">${ico.chev}</span></button>` : ''}
      <button class="rowbtn" data-act="pick" data-v="payer">${avatar(a.payer)}
        <span class="rt"><span>${a.split === 'transfer' ? 'Kto oddał' : 'Zapłacił'}</span><b>${esc(a.payer === meId() ? 'Ty (' + mNameFull(a.payer) + ')' : mNameFull(a.payer))}</b></span><span class="chev">${ico.chev}</span></button>
      <button class="rowbtn" data-act="pick" data-v="split">
        <span class="ri" style="background:var(--blue-l);color:var(--blue)">${ico.split}</span>
        <span class="rt"><span>Podział kosztów</span><b>${esc(splitLabel())}</b></span><span class="chev">${ico.chev}</span></button>
      <input id="add-desc" class="input" placeholder="Opis (opcjonalnie), np. Kolacja w trattorii" value="${esc(a.desc)}" data-change="add-desc" list="add-sugg">
      <datalist id="add-sugg">${Array.from(new Set(S.expenses.map((e) => e.desc).filter(Boolean))).slice(0, 40).map((d) => `<option value="${esc(d)}">`).join('')}</datalist>
    </div>
    <div class="keypad-wrap">
      <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((x) => `<button data-act="key" data-k="${x}">${x}</button>`).join('')}<button data-act="key" data-k="del" aria-label="Usuń cyfrę">${ico.bksp}</button></div>
      <button class="btn primary big" id="add-save" data-act="add-save">${ico.check} ${a.mode === 'add' ? 'Zapisz wydatek' : 'Zapisz zmiany'}</button>
    </div>
  </div>`;
}
function updateAmount() {
  const el = $('#add-amount');
  if (!el) return;
  el.className = 'amount ' + amountClass();
  el.innerHTML = `${amountText()}<small>${esc(sym(S.add.currency))}</small>`;
  $('#add-conv').innerHTML = convText();
}
function keypress(k) {
  const a = S.add;
  let s = a.amount || '';
  if (k === 'del') s = s.slice(0, -1);
  else if (k === ',') { if (!s.includes(',')) s = (s || '0') + ','; }
  else {
    const [i, d] = s.split(',');
    if (d !== undefined && d.length >= 2) return;
    if (d === undefined && (i || '').replace(/^0+/, '').length >= 7) return;
    s = s === '0' ? k : s + k;
  }
  a.amount = s;
  if (navigator.vibrate) navigator.vibrate(8);
  updateAmount();
}
function readAddInputs() { const d = $('#add-desc'); if (d && S.add) S.add.desc = d.value; }
function saveAdd() {
  readAddInputs();
  const a = S.add, t = S.trip;
  const amount = round2(amountValue());
  if (!(amount > 0)) { toast('Wpisz kwotę'); return; }
  const type = a.split === 'loan' ? 'loan' : a.split === 'transfer' ? 'transfer' : 'shared';
  if ((type === 'loan' || type === 'transfer') && (!a.recipient || a.recipient === a.payer)) { toast('Wybierz w „Podział kosztów”, dla kogo'); openPicker('split'); return; }
  if (a.split === 'some' && !a.among.length) { toast('Zaznacz co najmniej jedną osobę'); openPicker('split'); return; }
  let shares = null;
  if (a.split === 'custom') {
    shares = {};
    for (const [id, v] of Object.entries(a.shares)) { const n = round2(parseFloat(String(v).replace(',', '.'))); if (n > 0) shares[id] = n; }
    const sum = round2(Object.values(shares).reduce((s, v) => s + v, 0));
    if (Math.abs(sum - amount) > 0.01) { toast(`Suma kwot osób (${fmt(sum)}) różni się od kwoty (${fmt(amount)})`, 4000); openPicker('split'); return; }
  }
  const data = {
    amount, currency: a.currency, type, payer: a.payer,
    recipient: type === 'shared' ? null : a.recipient,
    splitAmong: type === 'shared' && a.split === 'some' ? a.among : null,
    shares: type === 'shared' && shares ? shares : null,
    category: type === 'transfer' ? null : a.category || null,
    desc: (a.desc || '').trim() || (type === 'transfer' ? 'Zwrot' : a.category || (type === 'loan' ? 'Pożyczka' : 'Wydatek')),
    note: (a.note || '').trim(), date: a.date || todayISO()
  };
  ls.set('lastCur:' + t.id, a.currency);
  const p = a.mode === 'add'
    ? store.addExpense(t.id, { ...data, id: newId(), createdAt: Date.now(), createdBy: S.uid })
    : store.updateExpense(t.id, a.id, { ...data, updatedAt: Date.now() });
  p.catch(fail);
  const mode = a.mode;
  closeAdd();
  if (navigator.vibrate) navigator.vibrate(20);
  toast(mode === 'add' ? `Dodano ${money(amount, data.currency)}` : 'Zapisano zmiany');
}

// ------------------------------------------------------------ arkusze wyboru
function openPicker(type) { readAddInputs(); S.picker = type; renderPicker(); }
function closePicker() { S.picker = null; const r = $('#picker-root'); if (r) r.innerHTML = ''; }
function renderPicker() {
  const a = S.add, t = S.trip;
  if (!S.picker || !a) { closePicker(); return; }
  const ms = t.members;
  let inner = '';
  if (S.picker === 'cat') {
    const cats = t.categories && t.categories.length ? t.categories : DEFAULT_CATEGORIES;
    inner = `<h3>Kategoria</h3><div class="catgrid">${cats.map((c) => { const k = iconKey({ category: c }); return `<button class="${a.category === c ? 'on' : ''}" data-act="pk-cat" data-v="${esc(c)}"><span class="ci" style="background:${iconBg(k)}">${iconSvg(k, 24)}</span>${esc(c)}</button>`; }).join('')}</div>`;
  } else if (S.picker === 'payer') {
    inner = `<h3>Kto zapłacił?</h3>${ms.map((m) => `<button class="opt ${a.payer === m.id ? 'on' : ''}" data-act="pk-payer" data-id="${m.id}">${avatar(m.id)}<span class="grow"><b>${esc(m.name)}${m.id === meId() ? ' (Ty)' : ''}</b></span>${a.payer === m.id ? ico.check : ''}</button>`).join('')}`;
  } else if (S.picker === 'split') {
    const opt = (v, title, sub) => `<button class="opt ${a.split === v ? 'on' : ''}" data-act="pk-split" data-v="${v}"><span class="radio ${a.split === v ? 'on' : ''}"></span><span class="grow"><b>${title}</b><span>${sub}</span></span></button>`;
    const others = ms.filter((m) => m.id !== a.payer);
    let extra = '';
    if (a.split === 'some') extra = `<div class="list">${ms.map((m) => `<button class="exp" data-act="pk-among" data-id="${m.id}" style="min-height:56px"><span class="checkbox ${a.among.includes(m.id) ? 'on' : ''}">${a.among.includes(m.id) ? svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 16, 3) : ''}</span>${avatar(m.id, 'sm')}<span class="grow t">${esc(m.name)}</span></button>`).join('')}</div>`;
    if (a.split === 'custom') {
      const sum = round2(Object.values(a.shares).reduce((s, v) => s + (parseFloat(String(v).replace(',', '.')) || 0), 0));
      const left = round2(amountValue() - sum);
      extra = `<div class="list">${ms.map((m) => `<div class="share-row">${avatar(m.id, 'sm')}<span class="grow"><b>${esc(m.name)}</b></span><input class="input" inputmode="decimal" placeholder="0,00" value="${esc(a.shares[m.id] || '')}" data-change="pk-share" data-input="pk-share" data-id="${m.id}" aria-label="Kwota dla ${esc(m.name)}"><span class="muted">${esc(sym(a.currency))}</span></div>`).join('')}</div>
        <div class="banner ${Math.abs(left) < 0.01 ? 'ok' : 'warn'}" id="pk-left">${Math.abs(left) < 0.01 ? 'Suma się zgadza' : left > 0 ? `Zostało do rozdzielenia: ${money(left, a.currency)}` : `Za dużo o ${money(-left, a.currency)}`}</div>`;
    }
    if (a.split === 'loan' || a.split === 'transfer') extra = `<div class="field-label" style="margin:4px 0 0">${a.split === 'loan' ? 'Pożyczka dla:' : 'Komu oddano:'}</div>${others.map((m) => `<button class="opt ${a.recipient === m.id ? 'on' : ''}" data-act="pk-rec" data-id="${m.id}">${avatar(m.id)}<span class="grow"><b>${esc(m.name)}</b></span>${a.recipient === m.id ? ico.check : ''}</button>`).join('')}`;
    inner = `<h3>Podział kosztów <button class="btn primary sm" data-act="pk-done">Gotowe</button></h3>
      ${opt('equal', 'Po równo na wszystkich', `${totalWeight(t)} os. · para liczona za 2`)}
      ${opt('some', 'Tylko wybrane osoby', 'np. kawa tylko dla dwóch')}
      ${opt('custom', 'Indywidualnie', 'wpisz kwotę dla każdej osoby')}
      ${opt('loan', 'Pożyczka dla jednej osoby', 'zapłaciłeś za kogoś – odda całość')}
      ${opt('transfer', 'Zwrot pieniędzy', 'ktoś komuś oddał gotówkę lub BLIK')}
      ${extra}`;
  }
  $('#picker-root').innerHTML = `<div class="overlay" data-act="pk-close"></div><div class="picker" role="dialog" aria-modal="true"><div class="grip"></div>${inner}</div>`;
}
function updateSharesLeft() {
  const a = S.add, el = $('#pk-left');
  if (!el) return;
  const sum = round2(Object.values(a.shares).reduce((s, v) => s + (parseFloat(String(v).replace(',', '.')) || 0), 0));
  const left = round2(amountValue() - sum);
  el.className = 'banner ' + (Math.abs(left) < 0.01 ? 'ok' : 'warn');
  el.textContent = Math.abs(left) < 0.01 ? 'Suma się zgadza' : left > 0 ? `Zostało do rozdzielenia: ${money(left, a.currency)}` : `Za dużo o ${money(-left, a.currency)}`;
}

// ------------------------------------------------------------ widżety Androida
let widgetTimer = null;
function scheduleWidget() { if (!isNative) return; clearTimeout(widgetTimer); widgetTimer = setTimeout(pushWidget, 500); }
function oweData(b, me) {
  if (!me) return { title: 'Rozliczenie', who: '', amount: '', extra: 'Wybierz w aplikacji, kim jesteś' };
  const tr = settle(b.balance);
  const toMe = tr.filter((x) => x.to === me), fromMe = tr.filter((x) => x.from === me);
  if (toMe.length) { const [a, ...r] = toMe; return { title: 'Do oddania Tobie', who: mNameFull(a.from), amount: money(a.amount, 'PLN'), sign: 'pos', extra: r.map((x) => '+ ' + money(x.amount, 'PLN') + ' · ' + mNameFull(x.from)).join('\n') }; }
  if (fromMe.length) { const [a, ...r] = fromMe; return { title: 'Ty oddajesz', who: mNameFull(a.to), amount: money(a.amount, 'PLN'), sign: 'neg', extra: r.map((x) => '+ ' + money(x.amount, 'PLN') + ' · ' + mNameFull(x.to)).join('\n') }; }
  return { title: 'Rozliczenie', who: 'Wszyscy na zero', amount: '', sign: 'zero', extra: '' };
}
function pushWidget() {
  const t = S.trip;
  if (!t) return;
  const me = meId();
  const b = computeBalances(t, S.expenses);
  const bal = me ? round2(b.balance[me] || 0) : null;
  const recent = [...S.expenses].filter((e) => e.type !== 'transfer')
    .sort((a, c) => (c.date || '').localeCompare(a.date || '') || (c.createdAt || 0) - (a.createdAt || 0)).slice(0, 3)
    .map((e) => ({ t: `${e.desc || e.category || 'Wydatek'} · ${mNameFull(e.payer)}`, a: money(e.amount, e.currency) }));
  S.widgetData = {
    style: ls.get('wstyle', 'blue'), code: t.id, title: t.title, closed: t.status === 'closed',
    foreign: foreign(), foreignSym: sym(foreign()),
    balanceLabel: me ? 'Twój bilans' : 'Koszt wyjazdu',
    balanceText: me ? signed(bal) + ' zł' : fmt(b.total) + ' zł',
    balanceSign: me ? (bal > 0.009 ? 'pos' : bal < -0.009 ? 'neg' : 'zero') : 'zero',
    balanceHint: me ? (bal > 0.009 ? 'Inni oddadzą Ci tę kwotę' : bal < -0.009 ? 'Tyle musisz oddać' : 'Jesteś na zero') : '',
    recent, owe: oweData(b, me)
  };
  updateWidget(S.widgetData);
}
