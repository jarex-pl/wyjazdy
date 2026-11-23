import { createStore, newId } from './store.js';
import { computeBalances, settle, toPLN, round2, totalWeight, memberWeight } from './calc.js';
import { COUNTRIES, CURRENCIES, DEFAULT_RATES, DEFAULT_CATEGORIES, sym, countryName, countryCurrency, iconKey, iconSvg, iconBg, iconColor } from './data.js';
import { isNative, updateWidget, consumeWidgetAction, onBackButton, onResume, exitApp, setBarsTheme, setWidgetLead, removeWidgetTrip } from './native.js';
import { APP_BUILD } from './version.js';
import { artSvg, tripPhoto, findPhoto, creditHtml, fileToCoverData } from './cover.js';
import { sceneHtml, globeLogo, showIntro } from './scene.js';

const GITHUB_REPO = 'jarex-pl/wyjazdy';
const APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Wyjazdy.apk`;
const WEB_URL = 'https://jarex-pl.github.io/wyjazdy/';

// ============================================================ narzędzia
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
const NB = '\u00A0';
const grp = (int) => String(int).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
const fmt = (n) => { const v = round2(n || 0); const [i, d] = Math.abs(v).toFixed(2).split('.'); return (v < 0 ? '-' : '') + grp(i) + ',' + d; };
const fmt0 = (n) => { const v = Math.round(n || 0); return (v < 0 ? '-' : '') + grp(Math.abs(v)); };
const money = (n, cur) => `${fmt(n)}${NB}${sym(cur)}`;
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
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>', 23, 1.7),
  pie: svg('<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>', 23, 1.7),
  rows: svg('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', 23, 1.7),
  swap2: svg('<path d="M4 8h15l-4-4M20 16H5l4 4"/>', 23, 1.7),
  users2: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.6 4.5 4.5"/>', 23, 1.7),
  cam: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 20),
  dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  logo: '<img src="icons/icon-192.png" alt="" width="40" height="40" style="border-radius:11px;display:block">'
};

// ============================================================ motyw
function themeSetting() { return ls.get('theme', 'dark'); }
function resolvedTheme() {
  const t = themeSetting();
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#0F1115' : '#EEF3FC');
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
  unsub: [], watching: null, filter: 'all', settleMode: 'split', repTab: 0, newTrip: null, adminKey: null, online: navigator.onLine,
  add: null, picker: null, showAdminKey: false, joinOpen: false
};
const isAdmin = () => !!(S.trip && (S.trip.admins || []).includes(S.uid));
const isOpen = () => !!(S.trip && S.trip.status !== 'closed');
const meId = () => (S.trip ? ls.get('me:' + S.trip.id, null) : null);
const member = (id) => (S.trip?.members || []).find((m) => m.id === id);
const mName = (id) => (id === meId() ? 'Ty' : member(id)?.name || '?');
const mNameFull = (id) => member(id)?.name || '?';
const foreign = () => S.trip?.currency || 'EUR';
const HUES = { food: '#F97316', coffee: '#D97706', cart: '#8B5CF6', fuel: '#EF4444', bed: '#3B82F6', ticket: '#EC4899', star: '#CA8A04', plane: '#0EA5E9', bus: '#14B8A6', car: '#6366F1', parking: '#0D9488', other: '#64748B', loan: '#F59E0B', transfer: '#16A34A' };
const hue = (k) => HUES[k] || HUES.other;
function peopleLabel(t) {
  const ms = t.members || [];
  const pairs = ms.filter((m) => memberWeight(m) === 2).length;
  const singles = ms.filter((m) => memberWeight(m) === 1);
  const big = ms.filter((m) => memberWeight(m) > 2);
  if (!pairs && !big.length) { const n = singles.length; return n + (n === 1 ? ' osoba' : n < 5 ? ' osoby' : ' osób'); }
  const parts = [];
  if (pairs) parts.push(pairs === 1 ? '1 para' : pairs + (pairs < 5 ? ' pary' : ' par'));
  big.forEach((m) => parts.push(m.name + ' (' + memberWeight(m) + ' os.)'));
  if (singles.length) parts.push(singles.length <= 2 ? singles.map((m) => m.name).join(', ') : singles.length + ' os.');
  return parts.join(' + ');
}
const unitLabel = (w) => (w === 2 ? 'Na parę' : w === 1 ? 'Na osobę' : `Na ${w} os.`);
function shareCells(t, total) {
  const ws = [...new Set((t.members || []).map(memberWeight))].sort((a, c) => c - a).slice(0, 2);
  const per = total / (totalWeight(t) || 1);
  return ws.map((w) => `<div><span>${unitLabel(w)}</span><b>${fmt0(per * w)} zł</b></div>`).join('');
}
function memberTag(m) { const w = memberWeight(m); return w === 2 ? '<span class="tag">PARA</span>' : w > 2 ? `<span class="tag">${w} OS.</span>` : ''; }
const paidVerb = (m) => (memberWeight(m) > 1 ? 'zapłacili' : 'zapłacił(a)');

const leadCode = () => ls.get('leadTrip', null);
function forgetTrip(code) {
  removeWidgetTrip(code);
  if (leadCode() === code) ls.set('leadTrip', null);
  ls.set('history', ls.get('history', []).filter((x) => x.code !== code));
  ['me:', 'thumb:', 'thumbSig:', 'lastCur:'].forEach((k) => { try { localStorage.removeItem(k + code); } catch (e) {} });
  if (ls.get('lastTrip', null) === code) { const h = ls.get('history', []); ls.set('lastTrip', h[0] ? h[0].code : null); }
  delete PH.res['hist:' + code];
}
function rememberTrip(t) {
  const h = ls.get('history', []);
  const old = h.find((x) => x.code === t.id) || {};
  const exps = S.watching === t.id ? S.expenses : null;
  const c = t.cover || {};
  const entry = {
    ...old, code: t.id, title: t.title, country: t.country, status: t.status || 'open',
    cover: c.type === 'photo' ? { type: 'photo' } : c, people: totalWeight(t), label: peopleLabel(t),
    admin: isAdmin(), currency: t.currency || 'EUR'
  };
  if (exps) {
    const bb = computeBalances(t, exps);
    entry.total = bb.total;
    const me = ls.get('me:' + t.id, null);
    entry.my = me && bb.balance[me] != null ? round2(bb.balance[me]) : null;
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
  if (S.msheet) { S.msheet = null; closePicker(); }
  const r = parseHash();
  S.route = r;
  if (r.code !== S.watching) {
    stopWatching();
    closeAdd(); closePicker(); S.msheet = null; S.q = null;
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
    if (S.pendingAdd && trip) { const c = S.pendingAdd; S.pendingAdd = null; quickCur(c); }
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
  if (r.name === 'trip' && r.sub === 'people') drawQr();
  if (S.msheet) renderMemberSheet();
  if (S.trip) scheduleWidget();
  hydratePhotos();
}

// ------------------------------------------------------------ zdjęcia (bez przerysowywania całego ekranu)
const PH = { res: {}, loaded: {} };
function photoBox(key, country, cls = '', extra = '') {
  const r = PH.res[key];
  const img = r && r.src ? `<img class="ph ${PH.loaded[r.src] ? 'ok' : ''}" src="${esc(r.src)}" alt="" onload="this.classList.add('ok')">` : '';
  const cr = r && r.src && /hero|coverbox/.test(cls) ? creditHtml(r, esc) : '';
  return `<div class="photo ${cls}" data-photo="${esc(key)}" data-country="${esc(country || 'eu')}">${artSvg(country || 'eu', true)}${img}${cr}${extra}`;
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
    if (key.startsWith('trip:')) scheduleWidget();
    if (p && p.src) {
      document.querySelectorAll(`[data-photo="${CSS.escape(key)}"]`).forEach((box) => {
        if (box.querySelector('img.ph')) return;
        const img = document.createElement('img');
        img.className = 'ph'; img.alt = '';
        img.onload = () => { img.classList.add('ok'); PH.loaded[p.src] = true; };
        img.src = p.src;
        box.appendChild(img);
        const cr = creditHtml(p, esc);
        if (cr && /hero|coverbox/.test(box.className)) box.insertAdjacentHTML('beforeend', cr);
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
  return `<nav class="navbar" aria-label="Menu">${it('home', '#/', 'Wyjazdy', ico.globe)}${it('reports', '#/reports', 'Raporty', ico.pie)}${it('settings', '#/settings', 'Ustawienia', ico.gear)}</nav>`;
}
const TRIP_TABS = ['', 'expenses', 'settle', 'people'];
function tripTabs(active) {
  const c = '#/t/' + esc(S.trip.id);
  const it = (k, label, icon) => `<a href="${c}${k ? '/' + k : ''}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  return `<nav class="navbar" aria-label="Wyjazd">${it('', 'Dodaj', ico.plus)}${it('expenses', 'Lista', ico.rows)}${it('settle', 'Rozliczenie', ico.swap2)}${it('people', 'Osoby', ico.users2)}</nav>`;
}
function pageHead(title, right = '') {
  return `<header class="topbar"><a class="ibtn" href="#/t/${esc(S.trip.id)}" aria-label="Wróć">${ico.back}</a><span class="grow"></span>${right}</header>
    ${title ? `<div class="phead"><h1><span class="sub">${esc(S.trip.title)}</span>${title}</h1></div>` : `<div class="phead"><span class="sub" style="font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)">${esc(S.trip.title)} · Rozliczenie</span></div>`}`;
}
function quickAdd(compact) {
  if (!isOpen()) return '';
  const f = foreign();
  if (f === 'PLN') return `<button class="btn gold big" data-act="add" data-cur="PLN"><span class="pl">+</span> Dodaj wydatek</button>`;
  return `<div class="quick2 ${compact ? 'sm' : ''}"><button class="btn gold" data-act="add" data-cur="foreign"><span class="pl">+</span> ${f === 'EUR' ? 'Euro' : esc(f)}</button><button class="btn outline" data-act="add" data-cur="PLN"><span class="pl">+</span> Złotówki</button></div>`;
}
function liveChip() {
  if (store.mode === 'demo') return '<span class="live demo"><i></i>Demo</span>';
  if (!S.online) return '<span class="live off"><i></i>Offline</span>';
  if (S.meta.pending || S.tripMeta?.pending) return '<span class="live busy"><i></i>Wysyłanie</span>';
  return '<span class="live"><i></i>Na żywo</span>';
}
function subTop(title, extra = '') {
  return `<header class="topbar"><a class="ibtn" href="#/t/${esc(S.trip.id)}/people" aria-label="Wróć">${ico.back}</a><h1>${title}</h1>${extra || '<span style="width:44px"></span>'}</header>`;
}

// ============================================================ ekrany
function homeDates(h) { return h.from ? fmtDay(h.from) + (h.to && h.to !== h.from ? ' – ' + fmtDate(h.to) : '') : ''; }
function homePeople(h) { return h.label || (h.people ? h.people + ' os.' : ''); }
function statusPill(h) {
  return h.status === 'closed' ? `<span class="pill ok">${svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 14, 3)} Rozliczony</span>`
    : (h.my != null && h.my < -0.009) ? '<span class="pill warn">Do oddania</span>' : '<span class="pill blue">W trakcie</span>';
}
function tripCard(h, i) {
  const meta = [homeDates(h), homePeople(h)].filter(Boolean);
  return `
  <div class="tcard" style="animation-delay:${Math.min(i, 6) * 60}ms">
    <a class="tc-link" href="#/t/${esc(h.code)}">
      ${photoBox('hist:' + h.code, h.country, 'tc-ph')}</div>
      <span class="tc-body">
        <span class="tc-name">${flagImg(h.country)}<b>${esc(h.title)}</b>${h.code === leadCode() ? '<i class="lead" title="Wiodący">★</i>' : ''}</span>
        ${meta[0] ? `<span class="tc-meta">${ico.cal}${esc(meta[0])}</span>` : ''}
        ${meta[1] ? `<span class="tc-meta">${ico.users}${esc(meta[1])}</span>` : ''}
        <b class="tc-amt">${h.total != null ? fmt(h.total) + ' zł' : '—'}</b>
        ${statusPill(h)}
      </span>
    </a>
    <button class="tc-more" data-act="trip-menu" data-code="${esc(h.code)}" aria-label="Opcje wyjazdu ${esc(h.title)}">${ico.dots}</button>
  </div>`;
}
function viewHome() {
  const hist = ls.get('history', []);
  if (!hist.length) return viewWelcome();
  const upd = S.update;
  const f = S.homeFilter || 'all';
  const cur = hist.find((h) => h.code === leadCode()) || hist[0];
  const list = hist.filter((h) => f === 'all' || (f === 'open' ? h.status !== 'closed' : h.status === 'closed'));
  const tab = (k, label) => `<button class="${f === k ? 'on' : ''}" data-act="home-filter" data-v="${k}" aria-pressed="${f === k}">${label}</button>`;
  return `
  <main class="page home nav-pad">
    <header class="topbar hhead"><span class="brand">${globeLogo(38)}<b>Wyjazdy</b></span><span class="grow"></span>
      <a class="ibtn" href="#/new" aria-label="Nowy wyjazd">${ico.plus}</a></header>
    ${upd ? `<div class="banner info"><span class="grow"><b>Nowa wersja ${esc(upd)}</b><br>Pobierz i zainstaluj na starej.</span><a class="btn primary sm" href="${APK_URL}" target="_blank" rel="noopener">Pobierz</a></div>` : ''}
    ${store.mode === 'demo' ? `<div class="banner warn">Tryb demo – dane tylko na tym urządzeniu.</div>` : ''}
    <section class="feat">
      <a class="feat-top" href="#/t/${esc(cur.code)}">
        ${photoBox('hist:' + cur.code, cur.country, 'feat-ph')}<div class="shade"></div>
          <span class="feat-tag">${cur.code === leadCode() ? '★ Wiodący wyjazd' : cur.status === 'closed' ? 'Ostatni wyjazd' : 'Bieżący wyjazd'}</span>
          <svg class="feat-plane" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z" fill="#fff" transform="rotate(90 12 12)"/></svg>
          <span class="feat-in"><span class="feat-name">${flagImg(cur.country)}<b>${esc(cur.title)}</b></span>
            <span class="feat-sub">${esc([countryName(cur.country), homeDates(cur), homePeople(cur)].filter(Boolean).join(' · '))}</span></span>
        </div>
      </a>
      <a class="feat-stats" href="#/t/${esc(cur.code)}/settle">
        <span><small>Twój bilans</small><b class="${cur.my > 0.009 ? 'pos-t' : cur.my < -0.009 ? 'neg-t' : ''}">${cur.my != null ? (cur.my > 0.5 ? '+' : cur.my < -0.5 ? '−' : '') + fmt0(Math.abs(cur.my)) + ' zł' : '—'}</b></span>
        <span><small>Wydatki</small><b>${cur.total != null ? fmt0(cur.total) + ' zł' : '—'}</b></span>
        <span><small>Na osobę</small><b>${cur.total != null && cur.people ? fmt0(cur.total / cur.people) + ' zł' : '—'}</b></span>
      </a>
      <a class="btn primary big" href="#/t/${esc(cur.code)}">${cur.status === 'closed' ? 'Otwórz wyjazd' : `${ico.plus} Dodaj wydatek`}</a>
    </section>
    <div class="sec-title">Moje wyjazdy <span class="muted small">${hist.length}</span></div>
    <div class="seg" role="group" aria-label="Filtr wyjazdów">${tab('all', 'Wszystkie')}${tab('open', 'W trakcie')}${tab('closed', 'Rozliczone')}</div>
    <div class="tcards">${list.length ? list.map(tripCard).join('') : '<div class="empty">Brak wyjazdów w tej grupie.</div>'}</div>
    <p class="hint">Stuknij „⋯” przy wyjeździe, żeby go usunąć</p>
    <a class="btn outline" href="#/new">${ico.plus} Nowy wyjazd</a>
    <section class="card">
      <label class="field-label" for="join-code" style="margin:0">Dołącz do wyjazdu znajomego</label>
      <div class="row"><input id="join-code" class="input code" placeholder="WYJ-XXXXXX" autocomplete="off" autocapitalize="characters" enterkeyhint="go">
        <button class="btn primary" style="flex:none" data-act="join">Dołącz</button></div>
    </section>
  </main>${navbar('home')}`;
}
function renderTripMenu(code) {
  const h = ls.get('history', []).find((x) => x.code === code);
  if (!h) return;
  $('#picker-root').innerHTML = `<div class="overlay" data-act="tm-close"></div>
  <div class="picker tmenu" role="dialog" aria-modal="true" aria-label="${esc(h.title)}"><div class="grip"></div>
    <div class="tm-head">${photoBox('hist:' + h.code, h.country, 'tm-ph')}</div><span class="grow"><b>${esc(h.title)}</b><span>${esc([countryName(h.country), homeDates(h)].filter(Boolean).join(' · '))}</span></span></div>
    <a class="opt" href="#/t/${esc(h.code)}" data-act="tm-close-nav">${ico.chev}<span class="grow"><b>Otwórz wyjazd</b><span>Wydatki, rozliczenie, osoby</span></span></a>
    ${h.code === leadCode() ? `<div class="opt on"><span class="star">★</span><span class="grow"><b>To jest wiodący wyjazd</b><span>Pokazywany na górze i w widżetach</span></span></div>`
      : `<button class="opt" data-act="set-lead" data-code="${esc(h.code)}"><span class="star">☆</span><span class="grow"><b>Ustaw jako wiodący</b><span>Na górze ekranu głównego i w widżetach</span></span></button>`}
    <button class="opt" data-act="forget" data-code="${esc(h.code)}">${ico.close}<span class="grow"><b>Usuń z mojej listy</b><span>Znika tylko u Ciebie – inni dalej go widzą</span></span></button>
    ${h.admin !== false ? `<button class="opt danger" data-act="delete-trip-home" data-code="${esc(h.code)}">${ico.trash}<span class="grow"><b>Usuń cały wyjazd</b><span>U wszystkich uczestników, razem z wydatkami</span></span></button>` : ''}
    <button class="btn" data-act="tm-close">Anuluj</button>
  </div>`;
  hydratePhotos();
}

function viewWelcome() {
  return `
  <main class="welcome">
    ${sceneHtml()}
    <div class="inner">
      ${globeLogo(124)}
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
  if (sub === 'report') return `<main class="page tab-pad">${pageHead('Raport')}${reportBody()}</main>${tripTabs('settle')}`;
  if (sub === 'edit') return viewEdit();
  if (sub === 'people') return viewPeople();
  if (sub === 'dash') return viewDashboard();
  return viewQuick();
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
// ------------------------------------------------------------ szybkie dodawanie
function qState() {
  const t = S.trip;
  if (!S.q || S.q.trip !== t.id) S.q = { trip: t.id, amount: '', currency: ls.get('lastCur:' + t.id, foreign()), payer: null };
  const q = S.q;
  if (!q.payer || !member(q.payer)) q.payer = meId() && member(meId()) ? meId() : t.members[0]?.id;
  if (foreign() === 'PLN') q.currency = 'PLN';
  else if (q.currency !== 'PLN' && q.currency !== foreign()) q.currency = foreign();
  return q;
}
function qText(q) {
  const raw = q.amount || '0';
  const [i, d] = raw.split(',');
  const int = grp(Number(i || 0));
  return d !== undefined ? int + ',' + d : int;
}
const qValue = (q) => { const v = parseFloat((q.amount || '0').replace(',', '.')); return isNaN(v) ? 0 : v; };
function qConv(q) {
  if (foreign() === 'PLN') return '&nbsp;';
  if (q.currency === 'PLN') return qValue(q) ? `≈ ${money(qValue(q) / S.trip.rate, foreign())}` : `kurs ${fmtRate(S.trip.rate)} zł`;
  return `≈ ${money(qValue(q) * S.trip.rate, 'PLN')} · kurs ${fmtRate(S.trip.rate)}`;
}
function qClass(q) { const n = qText(q).length; return (n > 9 ? 'xlong' : n > 6 ? 'long' : '') + (q.amount ? '' : ' zero'); }
function qUpdate() {
  const q = S.q, el = $('#q-amount');
  if (!q || !el) return;
  el.className = 'v ' + qClass(q);
  el.innerHTML = `${qText(q)}<small>${esc(sym(q.currency))}</small>`;
  const c = $('#q-conv'); if (c) c.innerHTML = qConv(q);
}
function qKey(k) {
  const q = S.q;
  let s = q.amount || '';
  if (k === 'del') s = s.slice(0, -1);
  else if (k === ',') { if (!s.includes(',')) s = (s || '0') + ','; }
  else {
    const [i, d] = s.split(',');
    if (d !== undefined && d.length >= 2) return;
    if (d === undefined && (i || '').replace(/^0+/, '').length >= 7) return;
    s = s === '0' ? k : s + k;
  }
  q.amount = s;
  if (navigator.vibrate) navigator.vibrate(8);
  qUpdate();
}
function quickTiles(t) {
  const cats = (t.categories && t.categories.length ? t.categories : DEFAULT_CATEGORIES).filter((c) => !/^inne$/i.test(c));
  return cats.slice(0, 7);
}
function viewQuick() {
  const t = S.trip, me = meId();
  const b = computeBalances(t, S.expenses);
  const my = me ? round2(b.balance[me] || 0) : null;
  const head = `<header class="qtop"><a class="ibtn plain" href="#/" aria-label="Start">${ico.back}</a>
      <div class="grow"><b>${esc(t.title)}</b><span>${esc(peopleLabel(t))}</span></div>
      ${me ? `<a class="balp" href="#/t/${esc(t.id)}/settle"><span>Twój bilans</span><b class="${my > 0.009 ? 'pos-t' : my < -0.009 ? 'neg-t' : ''}">${signed(my)} zł</b></a>` : ''}</header>`;
  if (!isOpen()) return `<main class="page qa tab-pad">${head}<div class="banner ok">${ico.check}<span><b>Wyjazd rozliczony.</b> Nie można już dodawać wydatków.</span></div>
    <div class="closed-note"><a class="btn primary" href="#/t/${esc(t.id)}/settle">Zobacz rozliczenie</a></div></main>${tripTabs('')}`;
  const q = qState();
  return `
  <main class="page qa tab-pad">
    ${head}
    ${foreign() !== 'PLN' ? `<div class="seg">
      <button class="${q.currency === foreign() ? 'on' : ''}" data-act="qcur" data-v="${esc(foreign())}">${esc(sym(foreign()))}&nbsp; ${esc(foreign() === 'EUR' ? 'Euro' : foreign())}</button>
      <button class="${q.currency === 'PLN' ? 'on' : ''}" data-act="qcur" data-v="PLN">zł&nbsp; Złotówki</button></div>` : ''}
    <div class="qamt"><div class="v ${qClass(q)}" id="q-amount">${qText(q)}<small>${esc(sym(q.currency))}</small></div><div class="c" id="q-conv">${qConv(q)}</div></div>
    <div class="qwho" role="group" aria-label="Kto płaci">${t.members.map((m) => `<button class="${q.payer === m.id ? 'on' : ''}" data-act="qpayer" data-id="${m.id}">${avatar(m.id)}<span>${esc(m.id === me ? 'Ty' : m.name)}</span></button>`).join('')}</div>
    <div class="keypad q">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((x) => `<button data-act="qkey" data-k="${x}">${x}</button>`).join('')}<button data-act="qkey" data-k="del" aria-label="Usuń cyfrę">${ico.bksp}</button></div>
    <div class="qcats">${quickTiles(t).map((c) => { const k = iconKey({ category: c }); return `<button class="qcat" data-act="qcat" data-v="${esc(c)}" style="--h:${hue(k)}">${iconSvg(k, 24, 'currentColor')}<span>${esc(c)}</span></button>`; }).join('')}
      <button class="qcat" data-act="qmore" style="--h:${hue('other')}">${ico.dots}<span>Więcej…</span></button></div>
    <p class="qhint">Kwota → kategoria = zapisane</p>
  </main>${tripTabs('')}`;
}
let utTimer = null;
function undoToast(title, sub, id) {
  let el = $('#utoast');
  if (!el) { el = document.createElement('div'); el.id = 'utoast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span class="ck">${ico.check}</span><span class="grow"><b>${esc(title)}</b><span>${esc(sub)}</span></span>${id ? `<button data-act="undo" data-id="${esc(id)}">Cofnij</button>` : ''}`;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(utTimer);
  utTimer = setTimeout(() => el.classList.remove('show'), 5000);
}
function quickSave(cat) {
  const q = S.q, t = S.trip;
  const amount = round2(qValue(q));
  if (!(amount > 0)) { toast('Najpierw wpisz kwotę'); return; }
  const id = newId();
  store.addExpense(t.id, { id, amount, currency: q.currency, type: 'shared', payer: q.payer, recipient: null, splitAmong: null, shares: null,
    category: cat, desc: cat, note: '', date: todayISO(), createdAt: Date.now(), createdBy: S.uid }).catch(fail);
  ls.set('lastCur:' + t.id, q.currency);
  q.amount = ''; qUpdate();
  if (navigator.vibrate) navigator.vibrate(20);
  undoToast(`${cat} · ${money(amount, q.currency)}`, `Zapisano · ${mName(q.payer)} · po równo`, id);
}
function quickCur(c) {
  if (!S.trip) return;
  qState();
  S.q.currency = c === 'PLN' || foreign() === 'PLN' ? 'PLN' : foreign();
  if (S.route.sub) go('#/t/' + S.trip.id); else render();
}

function viewDashboard() {
  const t = S.trip, me = meId();
  const b = computeBalances(t, S.expenses);
  const myBal = me ? round2(b.balance[me] || 0) : 0;
  const tr = settle(b.balance);
  let note = '';
  if (me) {
    if (myBal > 0.009) note = 'Oddadzą Ci: ' + tr.filter((x) => x.to === me).map((x) => `${esc(mNameFull(x.from))} <b>${money(x.amount, 'PLN')}</b>`).join(', ');
    else if (myBal < -0.009) note = 'Oddajesz: ' + tr.filter((x) => x.from === me).map((x) => `${esc(mNameFull(x.to))} <b>${money(x.amount, 'PLN')}</b>`).join(', ');
    else note = 'Jesteś na zero — nikt nikomu nic.';
  }
  const f = foreign();
  const sumF = S.expenses.filter((e) => (e.type || 'shared') === 'shared' && e.currency === f).reduce((s, e) => s + Number(e.amount || 0), 0);
  const recent = sortedExp(S.expenses).slice(0, 6);
  const key = 'trip:' + t.id + ':' + coverSig(t);
  const dates = tripDates();
  const people = totalWeight(t);
  return `
  <main class="page flush tab-pad">
    ${photoBox(key, t.country, 'hero', '')}
      <div class="shade"></div>
      <div class="bar"><a class="ibtn onphoto" href="#/" aria-label="Wszystkie wyjazdy">${ico.back}</a><span class="sp"></span>${liveChip()}
        <button class="ibtn onphoto" data-act="toggle-theme" aria-label="Jasny lub ciemny motyw">${resolvedTheme() === 'dark' ? ico.sun : ico.moon}</button>
        <a class="ibtn onphoto" href="#/t/${esc(t.id)}/edit" aria-label="Osoby i ustawienia wyjazdu">${ico.dots}</a></div>
      <div class="title">
        <div class="eyebrow">${esc(countryName(t.country) || '')}${dates ? ' · ' + esc(dates) : ''}</div>
        <h2>${esc(t.title)}</h2>
        <div class="meta"><span>${people} ${people < 5 && people > 1 ? 'osoby' : people === 1 ? 'osoba' : 'osób'}</span><a class="faces" href="#/t/${esc(t.id)}/edit" aria-label="Osoby">${(t.members || []).slice(0, 5).map((m) => avatar(m.id, 'sm')).join('')}</a></div>
      </div>
    </div>
    ${!isOpen() ? `<div class="banner ok">${ico.check}<span><b>Wyjazd rozliczony.</b> Tylko do odczytu.</span></div>` : ''}
    ${me ? `<a class="bal" href="#/t/${esc(t.id)}/settle">
      <span class="lbl">Twój bilans <span>Rozliczenie ›</span></span>
      <div class="big ${myBal < -0.009 ? 'neg' : 'pos'}">${signed(myBal)}<small>zł</small></div>
      <div class="note">${note}</div></a>` : `<button class="btn outline" data-act="skip-me-off">Wybierz, kim jesteś</button>`}
    ${quickAdd()}
    <div class="stats">
      <div><span>Wydatki</span><b>${fmt0(b.total)} zł</b></div>
      <div><span>Na osobę</span><b>${fmt0(b.total / (people || 1))} zł</b></div>
      ${f !== 'PLN' ? `<div><span>W ${f === 'EUR' ? 'euro' : esc(f)}</span><b>${fmt0(sumF)} ${esc(sym(f))}</b></div>` : `<div><span>Pozycji</span><b>${S.expenses.length}</b></div>`}
    </div>
    ${recent.length ? `<div class="sec-title">Ostatnie <a href="#/t/${esc(t.id)}/expenses">Wszystkie (${S.expenses.length}) ›</a></div>
      ${groupByDay(recent)}
      <p class="hint">Stuknij wydatek, aby go poprawić lub usunąć</p>` : `<div class="empty">Brak wydatków.<br>Stuknij „+ ${f === 'PLN' ? 'Dodaj wydatek' : f === 'EUR' ? 'Euro' : esc(f)}”, żeby dodać pierwszy.</div>`}
  </main>${tripTabs('')}`;
}
function sortedExp(list) { return [...list].sort((a, c) => (c.date || '').localeCompare(a.date || '') || (c.createdAt || 0) - (a.createdAt || 0)); }
function groupByDay(list) {
  const groups = [];
  for (const e of list) { const g = groups[groups.length - 1]; if (g && g.date === e.date) g.items.push(e); else groups.push({ date: e.date, items: [e] }); }
  return groups.map((g) => {
    const sum = g.items.filter((e) => (e.type || 'shared') !== 'transfer').reduce((s, e) => s + toPLN(e, S.trip.rate), 0);
    return `<div class="day"><span>${esc(dayLabel(g.date || todayISO()))}</span>${sum ? `<b>${fmt0(sum)} zł</b>` : ''}</div><div class="xlist">${g.items.map(expenseRow).join('')}</div>`;
  }).join('');
}

function expenseSub(e) {
  const type = e.type || 'shared';
  if (type === 'loan') return `Pożyczka: ${esc(mName(e.payer))} → ${esc(mName(e.recipient))}`;
  if (type === 'transfer') return `${esc(mName(e.payer))} oddał(a) → ${esc(mName(e.recipient))}`;
  if (e.shares) return `${esc(mName(e.payer))} · indywidualnie`;
  const all = (S.trip.members || []).length;
  const n = Array.isArray(e.splitAmong) && e.splitAmong.length ? e.splitAmong.length : all;
  return `${esc(mName(e.payer))} · ${n === all ? 'po równo' : 'dla ' + n + ' z ' + all}`;
}
function expenseRow(e) {
  const k = iconKey(e);
  const badge = e.type === 'loan' ? '<span class="badge loan">POŻYCZKA</span>' : e.type === 'transfer' ? '<span class="badge ok">ZWROT</span>' : '';
  return `
  <button class="exp" data-act="edit" data-id="${esc(e.id)}">
    <span class="ei" style="--h:${hue(k)}">${iconSvg(k, 21, 'currentColor')}</span>
    <span class="grow"><span class="t">${esc(e.desc || e.category || 'Wydatek')} ${badge}</span><span class="s">${expenseSub(e)}${e.note ? ' · ' + esc(e.note) : ''}</span></span>
    <span class="a"><b>${money(e.amount, e.currency)}</b>${e.currency !== 'PLN' ? `<span>${money(toPLN(e, S.trip.rate), 'PLN')}</span>` : ''}</span>
  </button>`;
}
function viewExpenses() {
  const me = meId();
  let list = [...S.expenses];
  if (S.filter === 'mine' && me) list = list.filter((e) => e.payer === me || e.recipient === me || ((e.type || 'shared') === 'shared' && (!e.splitAmong?.length || e.splitAmong.includes(me)) && (!e.shares || e.shares[me])));
  list = sortedExp(list);
  return `
  <main class="page tab-pad">
    ${pageHead(`Lista <span class="muted" style="font-size:.6em">${S.expenses.length}</span>`)}
    <div class="sum3"><div><span>Razem</span><b>${fmt0(computeBalances(S.trip, S.expenses).total)} zł</b></div>${shareCells(S.trip, computeBalances(S.trip, S.expenses).total)}</div>
    ${me ? `<div class="seg"><button class="${S.filter === 'all' ? 'on' : ''}" data-act="filter" data-v="all">Wszystkie</button><button class="${S.filter === 'mine' ? 'on' : ''}" data-act="filter" data-v="mine">Dotyczące mnie</button></div>` : ''}
    ${list.length ? groupByDay(list) + '<p class="hint">Stuknij wydatek, aby go poprawić lub usunąć</p>' : `<div class="empty">Brak wydatków.<br><a href="#/t/${esc(S.trip.id)}">Dodaj pierwszy ›</a></div>`}
  </main>${tripTabs('expenses')}`;
}
function dayLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  const nice = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  if (iso === todayISO()) return 'Dziś · ' + nice;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yi = new Date(y.getTime() - y.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (iso === yi) return 'Wczoraj · ' + nice;
  return nice;
}

// ------------------------------------------------------------ rozliczenie
const ARROW = '<svg class="xf-arr" width="46" height="20" viewBox="0 0 46 20" fill="none" aria-hidden="true"><path d="M2 10h38M33 3l7 7-7 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function meTag(id) { return id === meId() ? ' <em>(Ty)</em>' : ''; }
/** Karta jednego przelewu: kto → komu, kwota w walucie, pod spodem mniejsza kwota w zł. */
function xferCard(x, unit, i) {
  const t = S.trip;
  const sub = unit === 'PLN' ? '' : `≈ ${money(x.amount * t.rate, 'PLN')}`;
  return `
  <section class="xfer" style="animation-delay:${i * 70}ms">
    <div class="xf-row">${avatar(x.from, 'md')}<span class="xf-n"><b>${esc(mNameFull(x.from))}${meTag(x.from)}</b><span>oddaje</span></span></div>
    <div class="xf-mid">${ARROW}<span class="xf-amt">${money(x.amount, unit)}${sub ? `<small>${sub}</small>` : ''}</span></div>
    <div class="xf-row">${avatar(x.to, 'md')}<span class="xf-n"><b>${esc(mNameFull(x.to))}${meTag(x.to)}</b><span>otrzymuje</span></span></div>
    <div class="xf-acts">
      <button class="btn sm" data-act="copy-amt" data-v="${esc(fmt(x.amount))}">${svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>', 18)} Kopiuj</button>
      ${isOpen() ? `<button class="btn sm okb" data-act="mark-paid" data-from="${x.from}" data-to="${x.to}" data-amt="${x.amount}" data-cur="${unit}">${svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 18, 2.8)} Oddane</button>` : ''}
    </div>
  </section>`;
}
/** Karta osoby: imię w jednej linii, kwoty pod spodem. lines = [{v, cur}], total = bilans w zł (mały) */
function balCard(m, lines, paid, share, totalPLN) {
  const main = lines.find((l) => Math.abs(l.v) > 0.009) || lines[0];
  const sumPLN = totalPLN != null ? totalPLN : main.v;
  const cls = sumPLN > 0.009 ? 'pos' : sumPLN < -0.009 ? 'neg' : 'zero';
  const word = sumPLN > 0.009 ? 'otrzyma' : sumPLN < -0.009 ? 'odda' : 'na zero';
  return `<div class="balcard ${cls}">
    <div class="bc-top">${avatar(m.id, 'md')}<span class="bc-name"><b>${esc(m.name)}${meTag(m.id)}</b><span class="bc-word">${word}${memberWeight(m) > 1 ? ' · para' : ''}</span></span></div>
    <div class="bc-lines">${lines.map((l) => `<div class="bc-l ${l.v > 0.009 ? 'pos' : l.v < -0.009 ? 'neg' : ''}"><span>${l.cur === 'PLN' ? 'w złotówkach' : 'w ' + (l.cur === 'EUR' ? 'euro' : esc(l.cur))}</span><b>${l.v ? signed(l.v) : '0,00'}${NB}${esc(sym(l.cur))}</b></div>`).join('')}
      ${totalPLN != null ? `<div class="bc-sum">razem po przeliczeniu <b>${signed(totalPLN)}${NB}zł</b></div>` : ''}</div>
    <div class="bc-grid"><div><span>Zapłacili</span><b>${money(paid, 'PLN')}</b></div><div><span>Udział w kosztach</span><b>${money(share, 'PLN')}</b></div></div>
  </div>`;
}
function viewSettle() {
  const t = S.trip;
  const f = foreign();
  const hasF = f !== 'PLN';
  const mode = hasF ? (S.settleMode === 'pln' ? 'pln' : 'split') : 'pln';
  const bAll = computeBalances(t, S.expenses);
  const done = S.expenses.filter((e) => e.type === 'transfer').sort((a, c) => (c.createdAt || 0) - (a.createdAt || 0));
  const allTr = settle(bAll.balance).length;
  const plural = (n) => n + (n === 1 ? ' przelew' : n < 5 ? ' przelewy' : ' przelewów');
  const settled = `<section class="xfer done"><div class="xf-ok">${ico.check}</div><b>Wszyscy są rozliczeni</b><span>Nikt nikomu nic nie oddaje.</span></section>`;
  let body = '';
  if (mode === 'split') {
    const bF = computeBalances(t, S.expenses, { currency: f }), trF = settle(bF.balance);
    const bP = computeBalances(t, S.expenses, { currency: 'PLN' }), trP = settle(bP.balance);
    const trAll = settle(bAll.balance);
    body = `
    <p class="settle-note">Co płacone w ${f === 'EUR' ? 'euro' : esc(f)} – oddajecie w ${f === 'EUR' ? 'euro' : esc(f)}. Co w złotówkach – w złotówkach.</p>
    ${!trF.length && !trP.length ? settled : ''}
    ${trF.length ? `<div class="cur-head"><span class="cur-badge">${esc(sym(f))}</span><b>Do oddania w ${f === 'EUR' ? 'euro' : esc(f)}</b><span class="muted small">${plural(trF.length)}</span></div>${trF.map((x, i) => xferCard(x, f, i)).join('')}` : ''}
    ${trP.length ? `<div class="cur-head"><span class="cur-badge pl">zł</span><b>Do oddania w zł</b><span class="muted small">${plural(trP.length)}</span></div>${trP.map((x, i) => xferCard(x, 'PLN', i)).join('')}` : ''}
    <section class="sumpln">
      <div class="sp-h">Podsumowanie w złotówkach</div>
      ${trAll.length ? trAll.map((x) => `<div class="sp-r"><span>${esc(mNameFull(x.from))} → ${esc(mNameFull(x.to))}</span><b>${money(x.amount, 'PLN')}</b></div>`).join('') : '<div class="sp-r"><span>Wszyscy na zero</span><b>0,00 zł</b></div>'}
      <div class="sp-r tot"><span>Wydatki razem (kurs ${fmtRate(t.rate)})</span><b>${money(bAll.total, 'PLN')}</b></div>
    </section>
    <div class="sec-title">Bilans uczestników</div>
    <div class="balcards">${(t.members || []).map((m) => balCard(m,
      [{ v: round2(bF.balance[m.id] || 0), cur: f }, { v: round2(bP.balance[m.id] || 0), cur: 'PLN' }],
      bAll.paid[m.id] || 0, bAll.share[m.id] || 0, round2(bAll.balance[m.id] || 0))).join('')}</div>`;
  } else {
    const tr = settle(bAll.balance);
    body = `
    ${tr.length ? `<div class="cur-head"><span class="cur-badge pl">zł</span><b>Kto komu oddaje</b><span class="muted small">${plural(tr.length)}</span></div>${tr.map((x, i) => xferCard(x, 'PLN', i)).join('')}` : settled}
    <div class="sec-title">Bilans uczestników</div>
    <div class="balcards">${(t.members || []).map((m) => balCard(m, [{ v: round2(bAll.balance[m.id] || 0), cur: 'PLN' }], bAll.paid[m.id] || 0, bAll.share[m.id] || 0, null)).join('')}
      <div class="bc-total"><span>Wydatki razem</span><b>${money(bAll.total, 'PLN')}</b></div></div>`;
  }
  return `
  <main class="page tab-pad settle">
    ${pageHead('Rozliczenie')}
    ${hasF ? `<div class="seg">
      <button class="${mode === 'split' ? 'on' : ''}" data-act="settle-mode" data-v="split">Osobno ${esc(sym(f))} i zł</button>
      <button class="${mode === 'pln' ? 'on' : ''}" data-act="settle-mode" data-v="pln">Wszystko w zł</button>
    </div>` : ''}
    ${body}
    ${done.length ? `<div class="sec-title">Już oddane</div><div class="xlist">${done.map((e) => `
      <div class="paid-row">${avatar(e.payer, 'sm')}<span class="grow"><b>${esc(mNameFull(e.payer))} → ${esc(mNameFull(e.recipient))}</b><span>${fmtDate(e.date)}</span></span>
        <span class="v">${money(e.amount, e.currency)}</span>${isOpen() ? `<button class="link danger" data-act="undo-paid" data-id="${esc(e.id)}">Cofnij</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="btnrow">
      <button class="btn primary" data-act="share-result">${ico.share} Wyślij</button>
      <button class="btn" data-act="pdf">${ico.pdf} PDF</button>
      <a class="btn" href="#/t/${esc(t.id)}/report">${ico.pie} Raport</a>
    </div>
    ${isOpen() && isAdmin() ? `<button class="btn" data-act="close-trip" data-remaining="${allTr}">${ico.check} Zakończ wyjazd (rozliczony)</button>` : !isOpen() && isAdmin() ? `<button class="btn" data-act="reopen">Otwórz wyjazd ponownie</button>` : ''}
  </main>${tripTabs('settle')}`;
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
  const palette = ['#3B82F6', '#F97316', '#EC4899', '#8B5CF6', '#14B8A6', '#EAB308', '#EF4444', '#22C55E', '#0EA5E9', '#64748B'];
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
    <div class="c"><b>${fmt0(total)} zł</b><span>Razem</span></div></div>`;
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
      <section class="card"><div class="perperson">${(t.members || []).map((m) => `<div>${avatar(m.id, 'lg')}<span>${esc(m.name)}</span><b>${fmt(b.share[m.id] || 0)} zł</b></div>`).join('')}</div></section>`;
  } else if (S.repTab === 1) {
    const max = Math.max(1, ...list.map((c) => c.sum));
    body = list.length ? `<div class="list bars">${list.map((c) => `
      <div><span class="row" style="gap:10px"><span class="ei" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center">${iconSvg(c.key, 18, 'currentColor')}</span><b>${esc(c.name)}</b><span class="muted small">${c.n}×</span></span>
        <b class="nowrap">${fmt(c.sum)} zł</b><span class="bar"><i style="width:${(c.sum / max) * 100}%;background:${c.color}"></i></span></div>`).join('')}</div>` : '<div class="empty">Brak wydatków.</div>';
  } else {
    body = `<div class="balcards">${(t.members || []).map((m) => balCard(m, [{ v: round2(b.balance[m.id] || 0), cur: 'PLN' }], b.paid[m.id] || 0, b.share[m.id] || 0, null)).join('')}</div>`;
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
    <header class="topbar left"><h1>Raport</h1></header>
    ${hist.length > 1 ? `<select class="input" data-change="rep-trip" aria-label="Wyjazd">${hist.map((h) => `<option value="${esc(h.code)}" ${h.code === S.trip.id ? 'selected' : ''}>${esc(h.title)}</option>`).join('')}</select>` : `<div class="label">${esc(S.trip.title)}</div>`}
    ${reportBody()}
  </main>${navbar('reports')}`;
}

// ------------------------------------------------------------ ustawienia (globalne)
const WSTYLES = [['navy', 'Ciemny'], ['dark', 'Grafit'], ['light', 'Jasny'], ['clear', 'Szkło'], ['blue', 'Niebieski'], ['violet', 'Fiolet'], ['teal', 'Morski'], ['sunset', 'Zachód']];
function viewSettings() {
  const th = themeSetting();
  const ws = ls.get('wstyle', 'navy');
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

// ------------------------------------------------------------ osoby
function usedMembers() {
  const used = new Set();
  S.expenses.forEach((e) => { used.add(e.payer); if (e.recipient) used.add(e.recipient); (e.splitAmong || []).forEach((x) => used.add(x)); Object.keys(e.shares || {}).forEach((x) => used.add(x)); });
  return used;
}
function viewPeople() {
  const t = S.trip, me = meId(), admin = isAdmin();
  return `
  <main class="page tab-pad">
    ${pageHead('Osoby')}
    <div class="list">${(t.members || []).map((m) => `
      <button class="mrow" data-act="member" data-id="${m.id}">${avatar(m.id, 'md')}
        <span class="grow"><b>${esc(m.name)}${m.id === me ? ' (Ty)' : ''}</b>${memberTag(m)}<span>${memberWeight(m) === 1 ? '1 osoba' : 'liczona za ' + memberWeight(m) + ' osoby'}</span></span>${ico.chev}</button>`).join('')}</div>
    <p class="hint">Stuknij osobę: zdjęcie, imię, liczba osób</p>
    ${admin && isOpen() ? `<section class="card"><b style="font-size:16px">Dodaj osobę lub parę</b>${addMemberForm('pm')}</section>` : ''}
    <section class="card">
      <div class="invite">
        <div id="qr" class="qr" role="img" aria-label="Kod QR zaproszenia"></div>
        <div class="grow stack" style="gap:8px">
          <span class="label">Zaproś do wyjazdu</span>
          <span class="code-big">${esc(t.id)}</span>
          <div class="row" style="flex-wrap:wrap"><button class="btn primary sm" data-act="share-link">${ico.share} Wyślij link</button><button class="btn sm" data-act="copy-code">Kopiuj</button></div>
        </div>
      </div>
    </section>
    <div class="list">
      <a class="setrow" href="#/t/${esc(t.id)}/edit"><span class="si">${ico.gear}</span><span class="grow">Ustawienia wyjazdu<br><span class="muted small">nazwa, waluta, kurs, zdjęcie, kategorie</span></span>${ico.chev}</a>
      <a class="setrow" href="#/t/${esc(t.id)}/report"><span class="si">${ico.pie}</span><span class="grow">Raport wydatków</span>${ico.chev}</a>
    </div>
  </main>${tripTabs('people')}`;
}
function renderMemberSheet() {
  const id = S.msheet, m = id && S.trip ? member(id) : null;
  if (!m) { S.msheet = null; return; }
  const admin = isAdmin() && isOpen(), me = meId();
  const used = usedMembers();
  $('#picker-root').innerHTML = `<div class="overlay" data-act="msheet-close"></div>
  <div class="picker msheet" role="dialog" aria-modal="true" aria-label="${esc(m.name)}"><div class="grip"></div>
    ${avatar(m.id, 'xl')}
    <h3>${esc(m.name)}</h3><p class="muted">${memberWeight(m) === 1 ? '1 osoba' : 'para / grupa · ' + memberWeight(m) + ' osoby'}${m.id === me ? ' · to Ty' : ''}</p>
    <div class="acts">
      ${admin ? `<label class="act">${ico.cam} ${m.photo ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}<input type="file" accept="image/*" hidden data-change="member-photo" data-id="${m.id}"></label>
      ${m.photo ? `<button class="del" data-act="member-photo-del" data-id="${m.id}">${ico.trash} Usuń zdjęcie</button>` : ''}
      <button data-act="rename" data-id="${m.id}">${ico.edit} Zmień imię</button>` : ''}
      ${m.id !== me ? `<button data-act="pick-me" data-id="${m.id}">${ico.user} To ja</button>` : ''}
    </div>
    ${admin ? `<div class="wgt"><span>Liczba osób</span><span class="stepper"><button data-act="weight" data-id="${m.id}" data-d="-1" aria-label="Mniej">−</button><b>${memberWeight(m)}</b><button data-act="weight" data-id="${m.id}" data-d="1" aria-label="Więcej">+</button></span></div>` : '<p class="muted small">Zdjęcie, imię i liczbę osób zmienia organizator wyjazdu.</p>'}
    ${admin && !used.has(m.id) ? `<button class="btn danger sm" style="align-self:center" data-act="remove-member" data-id="${m.id}">Usuń z wyjazdu</button>` : ''}
    <button class="btn" data-act="msheet-close">Gotowe</button>
  </div>`;
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
    ${subTop('Ustawienia wyjazdu')}
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
  const int = grp(Number(i || 0));
  return d !== undefined ? int + ',' + d : int;
}
function amountClass() { const n = amountText().length; return n > 10 ? 'xlong' : n > 7 ? 'long' : ''; }
function convText() {
  const a = S.add;
  if (a.currency === 'PLN') return foreign() !== 'PLN' ? `≈ ${money(amountValue() / S.trip.rate, foreign())}` : '&nbsp;';
  return `≈ ${money(amountValue() * S.trip.rate, 'PLN')} · kurs ${fmtRate(S.trip.rate)}`;
}
function splitLabel() {
  const a = S.add;
  if (a.split === 'equal') return `Po równo · wszyscy (${totalWeight(S.trip)} os.)`;
  if (a.split === 'some') return 'Tylko: ' + (a.among.map(mNameFull).join(', ') || '—');
  if (a.split === 'custom') return 'Indywidualnie · ' + Object.values(a.shares).filter((v) => parseFloat(String(v).replace(',', '.')) > 0).length + ' os.';
  if (a.split === 'loan') return 'Pożyczka dla: ' + (a.recipient ? mNameFull(a.recipient) : 'wybierz…');
  if (a.split === 'transfer') return 'Zwrot dla: ' + (a.recipient ? mNameFull(a.recipient) : 'wybierz…');
  return '';
}
function saveLabel() {
  const a = S.add;
  const v = amountValue();
  return `${ico.check} ${a.mode === 'add' ? 'Zapisz' : 'Zapisz zmiany'}${v > 0 ? ' ' + money(v, a.currency) : ''}`;
}
function renderAdd() {
  const a = S.add;
  if (!a) return;
  const t = S.trip, me = meId();
  const cats = t.categories && t.categories.length ? t.categories : DEFAULT_CATEGORIES;
  const typing = document.activeElement && document.activeElement.id === 'add-desc';
  document.body.classList.add('no-scroll');
  $('#sheet-root').innerHTML = `
  <div class="add ${typing ? 'typing' : ''}" role="dialog" aria-modal="true" aria-label="${a.mode === 'add' ? 'Nowy wydatek' : 'Edytuj wydatek'}">
    <div class="scroll" id="add-scroll">
      <header class="topbar addtop">
        <button class="ibtn" data-act="add-close" aria-label="Zamknij">${ico.close}</button>
        ${foreign() !== 'PLN' ? `<div class="seg mini">
          <button class="${a.currency === foreign() ? 'on' : ''}" data-act="add-cur" data-v="${esc(foreign())}">${esc(sym(foreign()))} ${esc(foreign() === 'EUR' ? 'Euro' : foreign())}</button>
          <button class="${a.currency === 'PLN' ? 'on' : ''}" data-act="add-cur" data-v="PLN">zł</button>
        </div>` : `<h1>${a.mode === 'add' ? 'Nowy wydatek' : 'Edycja'}</h1>`}
        <label class="datechip">${ico.cal}<span id="add-date-txt">${a.date === todayISO() ? 'Dziś' : fmtDay(a.date)}</span><input id="add-date" type="date" value="${esc(a.date)}" data-change="add-date" aria-label="Data"></label>
      </header>
      <button class="amount-box" data-act="show-keys" aria-label="Kwota">
        <div class="amount ${amountClass()}" id="add-amount">${amountText()}<span class="caret"></span><small>${esc(sym(a.currency))}</small></div>
        <div class="conv" id="add-conv">${convText()}</div>
      </button>
      ${a.split !== 'transfer' ? `<div class="cats">${cats.map((c) => `<button class="cat ${a.category === c ? 'on' : ''}" data-act="add-cat" data-v="${esc(c)}">${iconSvg(iconKey({ category: c }), 18, 'currentColor')}${esc(c)}</button>`).join('')}</div>` : ''}
      <input id="add-desc" class="input" placeholder="${a.split === 'transfer' ? 'Opis (opcjonalnie)' : 'Opis, np. kolacja w trattorii'}" value="${esc(a.desc)}" data-change="add-desc" list="add-sugg" enterkeyhint="done" autocomplete="off">
      <datalist id="add-sugg">${Array.from(new Set(S.expenses.map((e) => e.desc).filter(Boolean))).slice(0, 40).map((d) => `<option value="${esc(d)}">`).join('')}</datalist>
      <div class="flabel">${a.split === 'transfer' ? 'Kto oddał?' : 'Kto zapłacił?'}</div>
      <div class="payers">${t.members.map((m) => `<button class="payer ${a.payer === m.id ? 'on' : ''}" data-act="add-payer" data-id="${m.id}">${avatar(m.id, 'sm')}<span>${esc(m.id === me ? 'Ty' : m.name)}</span></button>`).join('')}</div>
      <button class="splitline" data-act="pick" data-v="split"><span class="k">Podział</span><b>${esc(splitLabel())}</b><span class="more">Zmień</span></button>
      ${a.mode === 'edit' ? `<button class="btn danger sm del-exp" data-act="add-delete">${ico.trash} Usuń ten wydatek</button>` : ''}
    </div>
    <div class="keypad-wrap">
      <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((x) => `<button data-act="key" data-k="${x}">${x}</button>`).join('')}<button data-act="key" data-k="del" aria-label="Usuń cyfrę">${ico.bksp}</button></div>
      <button class="btn primary big" id="add-save" data-act="add-save">${saveLabel()}</button>
    </div>
  </div>`;
  if (typing) { const d = $('#add-desc'); if (d) { d.focus(); try { d.setSelectionRange(d.value.length, d.value.length); } catch (e) {} } }
}
function updateAmount() {
  const el = $('#add-amount');
  if (!el) return;
  el.className = 'amount ' + amountClass();
  el.innerHTML = `${amountText()}<span class="caret"></span><small>${esc(sym(S.add.currency))}</small>`;
  $('#add-conv').innerHTML = convText();
  const sv = $('#add-save'); if (sv) sv.innerHTML = saveLabel();
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
  S.lastAddId = newId();
  const p = a.mode === 'add'
    ? store.addExpense(t.id, { ...data, id: S.lastAddId, createdAt: Date.now(), createdBy: S.uid })
    : store.updateExpense(t.id, a.id, { ...data, updatedAt: Date.now() });
  p.catch(fail);
  const mode = a.mode;
  closeAdd();
  if (navigator.vibrate) navigator.vibrate(20);
  if (mode === 'add') { if (S.q) { S.q.amount = ''; qUpdate(); } undoToast(`${data.desc} · ${money(amount, data.currency)}`, `Zapisano · ${mName(data.payer)} · ${type === 'loan' ? 'pożyczka' : type === 'transfer' ? 'zwrot' : a.split === 'equal' ? 'po równo' : 'wybrany podział'}`, S.lastAddId); }
  else toast('Zapisano zmiany');
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
function widgetPhoto(t) {
  const c = t.cover || {};
  if (c.type === 'photo') { const th = ls.get('thumb:' + t.id, null); return th ? { photoKey: 'own:' + t.id + ':' + (c.data ? c.data.length : 0), photoData: th.replace(/^data:image\/\w+;base64,/, '') } : {}; }
  const p = PH.res['trip:' + t.id + ':' + coverSig(t)];
  return p && p.src && /^https:/.test(p.src) ? { photoKey: p.src, photoUrl: p.src.replace(/\/\d+px-/, '/640px-') } : {};
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
    style: ls.get('wstyle', 'navy'), code: t.id, title: t.title, closed: t.status === 'closed',
    foreign: foreign(), foreignSym: sym(foreign()),
    balanceLabel: me ? 'Twój bilans' : 'Koszt wyjazdu',
    balanceText: me ? signed(bal) + ' zł' : fmt(b.total) + ' zł',
    balanceSign: me ? (bal > 0.009 ? 'pos' : bal < -0.009 ? 'neg' : 'zero') : 'zero',
    balanceHint: me ? (bal > 0.009 ? 'Inni oddadzą Ci tę kwotę' : bal < -0.009 ? 'Tyle musisz oddać' : 'Jesteś na zero') : '',
    recent, owe: oweData(b, me),
    totalText: fmt0(b.total) + ' zł', perPersonText: fmt0(b.total / (totalWeight(t) || 1)) + ' zł',
    subtitle: [countryName(t.country), tripDates(), peopleLabel(t)].filter(Boolean).join(' · '),
    count: S.expenses.length, lead: !leadCode() || leadCode() === t.id, ...widgetPhoto(t)
  };
  updateWidget(S.widgetData);
}
function reportHtml() {
  const t = S.trip, b = computeBalances(t, S.expenses), tr = settle(b.balance);
  const done = S.expenses.filter((e) => e.type === 'transfer');
  const rows = [...S.expenses].sort((a, c) => (a.date || '').localeCompare(c.date || '') || (a.createdAt || 0) - (c.createdAt || 0));
  const cats = {};
  S.expenses.filter((e) => (e.type || 'shared') === 'shared').forEach((e) => { const k = e.category || 'Inne'; cats[k] = (cats[k] || 0) + toPLN(e, t.rate); });
  const catList = Object.entries(cats).sort((a, c) => c[1] - a[1]);
  const maxCat = Math.max(1, ...catList.map((c) => c[1]));
  const dates = rows.map((e) => e.date).filter(Boolean);
  const range = dates.length ? `${dates[0].split('-').reverse().join('.')} – ${dates[dates.length - 1].split('-').reverse().join('.')}` : '';
  return `
  <div class="rep">
    <div class="rep-head">
      <div><h1>${esc(t.title)} · rozliczenie</h1>
      <p>${esc(countryName(t.country))}${range ? ' · ' + range : ''} · ${totalWeight(t)} os. · kurs 1 ${esc(foreign())} = ${fmtRate(t.rate)} zł</p></div>
      <span class="rep-status">${t.status === 'closed' ? 'ROZLICZONY' : 'W TRAKCIE'}</span>
    </div>
    <div class="rep-boxes">
      <div><span>Koszt całego wyjazdu</span><b>${fmt(b.total)} zł</b></div>
      <div><span>Na jedną osobę</span><b>${fmt(b.total / (totalWeight(t) || 1))} zł</b></div>
      <div><span>Przelewy</span><b>${tr.length ? tr.length + ' do zrobienia' : 'wszystko oddane'}</b></div>
    </div>
    <h2>Bilans uczestników</h2>
    <table><thead><tr><th>Uczestnik</th><th class="r">Zapłacił</th><th class="r">Udział</th><th class="r">Bilans</th></tr></thead><tbody>
      ${(t.members || []).map((m) => `<tr><td>${esc(m.name)} (${memberWeight(m)} os.)</td><td class="r">${fmt(b.paid[m.id])} zł</td><td class="r">${fmt(b.share[m.id])} zł</td><td class="r"><b>${signed(round2(b.balance[m.id]))} zł</b></td></tr>`).join('')}
    </tbody></table>
    <div class="rep-cols">
      <div><h2>Przelewy</h2>
        ${tr.map((x) => `<div class="rep-tr"><span>${esc(mNameFull(x.from))} → ${esc(mNameFull(x.to))}</span><b>${money(x.amount, 'PLN')}</b></div>`).join('')}
        ${done.map((e) => `<div class="rep-tr ok"><span>${esc(mNameFull(e.payer))} → ${esc(mNameFull(e.recipient))} ✓</span><b>${money(e.amount, e.currency)}</b></div>`).join('')}
        ${!tr.length && !done.length ? '<p>Brak przelewów.</p>' : ''}
      </div>
      <div><h2>Na co poszły pieniądze</h2>
        ${catList.map(([k, v]) => `<div class="rep-cat"><span>${esc(k)}</span><i><em style="width:${(v / maxCat) * 100}%"></em></i><b>${fmt(v)} zł</b></div>`).join('')}
      </div>
    </div>
    <h2>Lista wydatków</h2>
    <table><thead><tr><th>Data</th><th>Opis</th><th>Zapłacił</th><th class="r">Kwota</th></tr></thead><tbody>
      ${rows.map((e) => `<tr><td>${esc((e.date || '').split('-').reverse().join('.'))}</td><td><b>${esc(e.desc)}</b>${e.type === 'loan' ? ` <span class="rep-loan">· pożyczka dla ${esc(mNameFull(e.recipient))}</span>` : e.type === 'transfer' ? ` <span class="rep-ok">· zwrot dla ${esc(mNameFull(e.recipient))}</span>` : e.splitAmong?.length && e.splitAmong.length !== t.members.length ? ` <span class="rep-loan">· dla ${e.splitAmong.map(mNameFull).map(esc).join(', ')}</span>` : ''}${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</td><td>${esc(mNameFull(e.payer))}</td><td class="r"><b>${money(e.amount, e.currency)}</b>${e.currency !== 'PLN' ? `<br><small>${money(toPLN(e, t.rate), 'PLN')}</small>` : ''}</td></tr>`).join('')}
    </tbody></table>
    <p class="rep-foot">Wygenerowano w aplikacji Wyjazdy · ${new Date().toLocaleDateString('pl-PL')}</p>
  </div>`;
}
let html2pdfLoading = null;
function loadHtml2pdf() {
  if (window.html2pdf) return Promise.resolve();
  if (!html2pdfLoading) html2pdfLoading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/html2pdf.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return html2pdfLoading;
}
async function makePdf(share) {
  const btns = document.querySelectorAll('[data-act="pdf"],[data-act="pdf-share"]');
  btns.forEach((b) => { b.disabled = true; });
  toast('Tworzę raport PDF…', 8000);
  const holder = document.createElement('div');
  holder.className = 'rep-holder';
  holder.innerHTML = reportHtml();
  document.body.appendChild(holder);
  try {
    await loadHtml2pdf();
    const name = 'Raport_' + S.trip.title.replace(/[^\p{L}\p{N}]+/gu, '_') + '.pdf';
    const worker = window.html2pdf().set({
      margin: [10, 10, 12, 10], filename: name,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: 1024, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.rep-tr', '.rep-cat', '.rep-boxes'] }
    }).from(holder.firstElementChild);
    if (share) {
      const blob = await worker.outputPdf('blob');
      const file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: S.trip.title });
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } else {
      await worker.save();
    }
    toast('Raport gotowy');
  } catch (e) {
    if (e && e.name === 'AbortError') toast('Anulowano');
    else fail(e);
  } finally {
    holder.remove();
    btns.forEach((b) => { b.disabled = false; });
  }
}

// ============================================================ akcje
async function joinCode(raw) {
  const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code) { toast('Wpisz kod wyjazdu'); return; }
  const full = code.startsWith('WYJ-') ? code : code.startsWith('WYJ') ? 'WYJ-' + code.slice(3) : 'WYJ-' + code;
  try {
    const t = await store.getTrip(full);
    if (!t) { toast('Nie znaleziono wyjazdu o tym kodzie'); return; }
    go('#/t/' + full);
  } catch (e) { fail(e); }
}

async function fetchNbp(cur) {
  if (cur === 'PLN') return { rate: 1, date: todayISO() };
  const r = await fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${cur}/?format=json`);
  if (!r.ok) throw new Error('NBP ' + r.status);
  const j = await r.json();
  return { rate: j.rates[0].mid, date: j.rates[0].effectiveDate };
}

// ============================================================ akcje
const actions = {
  join: () => joinCode($('#join-code')?.value),
  'join-open': () => { S.joinOpen = true; render(); $('#join-code')?.focus(); },
  forget: (el) => {
    const code = el.dataset.code;
    const h = ls.get('history', []).find((x) => x.code === code);
    if (!confirm(`Usunąć „${h ? h.title : code}” z Twojej listy?\n\nWyjazd zostanie u pozostałych uczestników. Wrócisz do niego, wpisując kod ${code}.`)) return;
    if (S.watching === code) stopWatching();
    forgetTrip(code); closePicker(); go('#/'); toast('Usunięto z listy');
  },
  'set-lead': (el) => {
    const code = el.dataset.code;
    ls.set('leadTrip', code); setWidgetLead(code); closePicker(); render();
    const h = ls.get('history', []).find((x) => x.code === code);
    toast(`Wiodący wyjazd: ${h ? h.title : code}${isNative ? ' · widżety pokazują go teraz' : ''}`, 3500);
    if (isNative && S.watching !== code) go('#/t/' + code + '/dash');
  },
  'home-filter': (el) => { S.homeFilter = el.dataset.v; render(); },
  'trip-menu': (el) => renderTripMenu(el.dataset.code),
  'tm-close': () => closePicker(),
  'tm-close-nav': (el) => { closePicker(); go(el.getAttribute('href')); },
  'delete-trip-home': async (el) => {
    const code = el.dataset.code;
    const h = ls.get('history', []).find((x) => x.code === code);
    if (!confirm(`Usunąć CAŁY wyjazd „${h ? h.title : code}” u wszystkich uczestników, razem z wydatkami?\n\nTego nie da się cofnąć.`)) return;
    if ((prompt('Wpisz USUŃ, żeby potwierdzić') || '').trim().toUpperCase() !== 'USUŃ') return;
    closePicker();
    try {
      if (S.watching === code) stopWatching();
      await store.deleteTrip(code);
      forgetTrip(code); go('#/'); render(); toast('Wyjazd usunięty');
    } catch (e) {
      const m = String(e && (e.code || e.message) || e);
      if (m.includes('permission')) toast('Cały wyjazd usuwa tylko organizator. Możesz usunąć go ze swojej listy.', 4500);
      else fail(e);
    }
  },
  'toggle-theme': () => { ls.set('theme', resolvedTheme() === 'dark' ? 'light' : 'dark'); applyTheme(); render(); },
  theme: (el) => { ls.set('theme', el.dataset.v); applyTheme(); render(); },
  wstyle: (el) => {
    ls.set('wstyle', el.dataset.v); render();
    if (S.widgetData) { S.widgetData.style = el.dataset.v; updateWidget(S.widgetData); }
    toast(isNative ? 'Zmieniono wygląd widżetów' : 'Zapisano – działa w aplikacji na Androida');
  },
  'rep-tab': (el) => { S.repTab = Number(el.dataset.v); render(); },
  // nowy wyjazd
  'nt-pair': (el) => { S.newTrip.pair = el.dataset.v === '1'; render(); $('#nt-n1')?.focus(); },
  'nt-add': () => {
    const m = readMemberForm('nt', S.newTrip.pair);
    if (!m) return;
    if (S.newTrip.members.some((x) => x.name.toLowerCase() === m.name.toLowerCase())) { toast('Ta osoba już jest na liście'); return; }
    S.newTrip.members.push(m);
    if (!S.newTrip.meId) S.newTrip.meId = m.id;
    render(); $('#nt-n1')?.focus();
  },
  'nt-remove': (el) => {
    S.newTrip.members = S.newTrip.members.filter((m) => m.id !== el.dataset.id);
    if (S.newTrip.meId === el.dataset.id) S.newTrip.meId = S.newTrip.members[0]?.id || null;
    render();
  },
  'nt-me': (el) => { S.newTrip.meId = el.dataset.id; render(); },
  'nt-create': async (el) => {
    const n = S.newTrip;
    n.place = ($('#nt-place')?.value || '').trim();
    n.title = ($('#nt-title').value || '').trim() || countryName(n.country) + ' ' + new Date().getFullYear();
    if (n.members.length < 2) { toast('Dodaj co najmniej 2 osoby lub pary'); return; }
    el.disabled = true; el.textContent = 'Tworzenie…';
    let rate = DEFAULT_RATES[n.currency] || 1, rateDate = null, rateSource = 'domyślny';
    try { const r = await fetchNbp(n.currency); rate = r.rate; rateDate = r.date; rateSource = 'NBP'; } catch (e) {}
    try {
      const code = await store.createTrip({
        title: n.title, country: n.country, currency: n.currency, rate, rateDate, rateSource,
        status: 'open', members: n.members, categories: DEFAULT_CATEGORIES, cover: { type: 'place', query: n.place || '' }
      });
      if (n.meId) ls.set('me:' + code, n.meId);
      S.newTrip = null;
      go('#/t/' + code);
      toast(rateSource === 'NBP' ? `Gotowe! Kurs NBP: ${fmtRate(rate)} zł` : 'Gotowe! Sprawdź kurs w ustawieniach wyjazdu', 3500);
    } catch (e) { el.disabled = false; el.textContent = 'Utwórz wyjazd'; fail(e); }
  },
  'pick-me': (el) => { ls.set('me:' + S.trip.id, el.dataset.id); S.skipMe = false; if (S.q) S.q.payer = null; render(); },
  'skip-me': () => { S.skipMe = true; render(); },
  filter: (el) => { S.filter = el.dataset.v; render(); },
  'settle-mode': (el) => { S.settleMode = el.dataset.v === 'pln' ? 'pln' : 'split'; render(); },
  add: (el) => openAdd(el && el.dataset ? el.dataset.cur : undefined),
  'skip-me-off': () => { S.skipMe = false; render(); },
  edit: (el) => openEdit(el.dataset.id),
  'copy-amt': (el) => copyText(el.dataset.v, 'Skopiowano kwotę ' + el.dataset.v),
  'mark-paid': (el) => {
    const { from, to, cur } = el.dataset, amt = Number(el.dataset.amt);
    if (!confirm(`${mNameFull(from)} oddał(a) ${money(amt, cur)} dla ${mNameFull(to)}?`)) return;
    store.addExpense(S.trip.id, { id: newId(), type: 'transfer', payer: from, recipient: to, amount: amt, currency: cur, desc: 'Zwrot', note: '', date: todayISO(), createdAt: Date.now(), createdBy: S.uid, splitAmong: null, shares: null, category: null }).catch(fail);
    toast('Oznaczono jako oddane');
  },
  'undo-paid': (el) => { if (confirm('Cofnąć oznaczenie przelewu?')) store.deleteExpense(S.trip.id, el.dataset.id).catch(fail); },
  'share-result': async () => {
    const t = S.trip, b = computeBalances(t, S.expenses), tr = settle(b.balance);
    const lines = [`Rozliczenie: ${t.title}`, `Koszt wyjazdu: ${fmt(b.total)} zł (na osobę ${fmt(b.total / (totalWeight(t) || 1))} zł)`, ''];
    const f = foreign();
    if (f !== 'PLN' && S.settleMode !== 'pln') {
      const trF = settle(computeBalances(t, S.expenses, { currency: f }).balance), trP = settle(computeBalances(t, S.expenses, { currency: 'PLN' }).balance);
      if (trF.length) { lines.push(`Do oddania w ${f}:`); trF.forEach((x) => lines.push(`• ${mNameFull(x.from)} → ${mNameFull(x.to)}: ${money(x.amount, f)} (≈ ${money(x.amount * t.rate, 'PLN')})`)); lines.push(''); }
      if (trP.length) { lines.push('Do oddania w złotówkach:'); trP.forEach((x) => lines.push(`• ${mNameFull(x.from)} → ${mNameFull(x.to)}: ${money(x.amount, 'PLN')}`)); lines.push(''); }
      if (!trF.length && !trP.length) lines.push('Wszyscy są rozliczeni ✓');
      else if (tr.length) lines.push(`Razem w zł: ${tr.map((x) => `${mNameFull(x.from)} → ${mNameFull(x.to)} ${money(x.amount, 'PLN')}`).join(', ')}`);
    } else if (tr.length) { lines.push('Kto komu oddaje:'); tr.forEach((x) => lines.push(`• ${mNameFull(x.from)} → ${mNameFull(x.to)}: ${money(x.amount, 'PLN')}`)); }
    else lines.push('Wszyscy są rozliczeni ✓');
    const text = lines.join('\n').replace(/\u00a0/g, ' ');
    if (navigator.share) { try { await navigator.share({ title: t.title, text }); } catch (e) {} } else copyText(text, 'Skopiowano rozliczenie');
  },
  pdf: () => makePdf(false),
  'pdf-share': () => makePdf(true),
  'close-trip': (el) => {
    const rem = Number(el.dataset.remaining);
    const msg = rem ? `Zostały ${rem} nieoddane przelewy. Zakończyć wyjazd mimo to?\n\nPo zakończeniu nikt nie doda już wydatków, a kurs zostanie zamrożony.` : 'Zakończyć wyjazd? Nikt nie doda już wydatków, a kurs zostanie zamrożony.';
    if (!confirm(msg)) return;
    store.updateTrip(S.trip.id, { status: 'closed', closedAt: Date.now() }).then(() => toast('Wyjazd rozliczony')).catch(fail);
  },
  reopen: () => { if (confirm('Otworzyć wyjazd ponownie?')) store.updateTrip(S.trip.id, { status: 'open', closedAt: null }).catch(fail); },
  'share-link': async () => {
    const url = inviteUrl();
    const text = `Dołącz do wyjazdu „${S.trip.title}” w aplikacji Wyjazdy. Kod: ${S.trip.id}`;
    if (navigator.share) { try { await navigator.share({ title: S.trip.title, text, url }); } catch (e) {} }
    else copyText(text + '\n' + url, 'Skopiowano zaproszenie');
  },
  'copy-code': () => copyText(S.trip.id, 'Skopiowano kod ' + S.trip.id),
  'pm-pair': (el) => { S.pairForm = el.dataset.v === '1'; render(); $('#pm-n1')?.focus(); },
  'pm-add': () => {
    const m = readMemberForm('pm', S.pairForm);
    if (!m) return;
    if (S.trip.members.some((x) => x.name.toLowerCase() === m.name.toLowerCase())) { toast('Ta osoba już jest na liście'); return; }
    store.updateTrip(S.trip.id, { members: [...S.trip.members, m] }).catch(fail);
    toast('Dodano: ' + m.name);
  },
  weight: (el) => {
    const members = S.trip.members.map((m) => m.id === el.dataset.id ? { ...m, weight: Math.min(8, Math.max(1, memberWeight(m) + Number(el.dataset.d))) } : m);
    store.updateTrip(S.trip.id, { members }).catch(fail);
  },
  rename: (el) => {
    const m = member(el.dataset.id);
    const name = (prompt('Nowa nazwa:', m.name) || '').trim();
    if (!name || name === m.name) return;
    store.updateTrip(S.trip.id, { members: S.trip.members.map((x) => x.id === m.id ? { ...x, name } : x) }).catch(fail);
  },
  'remove-member': (el) => {
    const m = member(el.dataset.id);
    if (S.trip.members.length <= 2) { toast('Muszą zostać co najmniej 2 osoby'); return; }
    if (!confirm(`Usunąć „${m.name}” z wyjazdu?`)) return;
    store.updateTrip(S.trip.id, { members: S.trip.members.filter((x) => x.id !== m.id) }).catch(fail);
  },
  nbp: async (el) => {
    const cur = $('#st-currency').value;
    el.disabled = true;
    try { const r = await fetchNbp(cur); $('#st-rate').value = r.rate; S.nbpDate = r.date; toast(`Kurs NBP z ${r.date}: ${fmtRate(r.rate)} zł. Zapisz ustawienia.`, 3500); }
    catch (e) { toast('Nie udało się pobrać kursu NBP – wpisz ręcznie'); }
    el.disabled = false;
  },
  'save-settings': () => {
    const t = S.trip;
    const currency = $('#st-currency').value;
    const used = new Set(S.expenses.filter((e) => e.currency !== 'PLN').map((e) => e.currency));
    if (currency !== t.currency && used.size && !used.has(currency)) { toast(`Są już wydatki w ${[...used].join(', ')} – nie można zmienić waluty`, 4000); return; }
    const patch = { title: ($('#st-title').value || '').trim() || t.title, country: $('#st-country').value, currency,
      categories: $('#st-cats').value.split('\n').map((x) => x.trim()).filter(Boolean) };
    if (isOpen()) {
      const rate = parseFloat(String($('#st-rate').value).replace(',', '.'));
      if (!(rate > 0)) { toast('Podaj poprawny kurs'); return; }
      if (rate !== t.rate) { patch.rate = rate; patch.rateDate = S.nbpDate || todayISO(); patch.rateSource = S.nbpDate ? 'NBP' : 'ręcznie'; }
    }
    S.nbpDate = null;
    store.updateTrip(t.id, patch).then(() => toast('Zapisano ustawienia')).catch(fail);
  },
  'show-admin-key': async () => { try { S.adminKey = await store.getAdminKey(S.trip.id); S.showAdminKey = true; render(); } catch (e) { fail(e); } },
  'claim-admin': async () => {
    const key = $('#admin-key').value;
    if (!key.trim()) return;
    const ok = await store.claimAdmin(S.trip.id, key, S.trip).catch(() => false);
    toast(ok ? 'Jesteś teraz organizatorem' : 'Nieprawidłowy kod organizatora');
  },
  'delete-trip': async () => {
    if (!confirm('Usunąć CAŁY wyjazd u wszystkich uczestników? Tego nie da się cofnąć.')) return;
    if ((prompt('Wpisz USUŃ, żeby potwierdzić') || '').trim().toUpperCase() !== 'USUŃ') return;
    const code = S.trip.id;
    try { stopWatching(); await store.deleteTrip(code); forgetTrip(code); go('#/'); toast('Wyjazd usunięty'); }
    catch (e) { fail(e); watch(code); }
  },
  'cover-auto': () => setCover({ type: 'place', query: ($('#cv-place')?.value || '').trim() }),
  'cover-place': () => { const q = ($('#cv-place')?.value || '').trim(); setCover({ type: 'place', query: q }); toast(q ? 'Szukam zdjęcia: ' + q : 'Typowe zdjęcie kraju'); },
  'cover-art': () => setCover({ type: 'art' }),
  // dodawanie
  'add-close': () => closeAdd(),
  'add-cur': (el) => { readAddInputs(); S.add.currency = el.dataset.v; renderAdd(); },
  'add-save': () => saveAdd(),
  'add-delete': () => {
    if (!confirm('Usunąć ten wydatek u wszystkich?')) return;
    store.deleteExpense(S.trip.id, S.add.id).catch(fail);
    closeAdd(); toast('Usunięto');
  },
  key: (el) => keypress(el.dataset.k),
  qkey: (el) => qKey(el.dataset.k),
  qcur: (el) => { S.q.currency = el.dataset.v; render(); },
  qpayer: (el) => { S.q.payer = el.dataset.id; document.querySelectorAll('[data-act="qpayer"]').forEach((b) => b.classList.toggle('on', b.dataset.id === el.dataset.id)); },
  qcat: (el) => quickSave(el.dataset.v),
  qmore: () => { const q = S.q; openAdd(q.currency); if (S.add) { S.add.amount = q.amount; S.add.payer = q.payer; renderAdd(); } },
  undo: (el) => { store.deleteExpense(S.trip.id, el.dataset.id).catch(fail); $('#utoast')?.classList.remove('show'); toast('Cofnięto'); },
  member: (el) => { S.msheet = el.dataset.id; renderMemberSheet(); },
  'msheet-close': () => { S.msheet = null; closePicker(); },
  'member-photo-del': (el) => {
    if (!confirm('Usunąć zdjęcie? Wróci inicjał.')) return;
    store.updateTrip(S.trip.id, { members: S.trip.members.map((m) => { if (m.id !== el.dataset.id) return m; const { photo, ...rest } = m; return rest; }) }).then(() => toast('Usunięto zdjęcie')).catch(fail);
  },
  'show-keys': () => { const d = $('#add-desc'); if (d) d.blur(); $('.add')?.classList.remove('typing'); },
  'add-cat': (el) => { readAddInputs(); S.add.category = S.add.category === el.dataset.v ? null : el.dataset.v; const sc = $('#add-scroll')?.scrollTop; const cx = $('.cats')?.scrollLeft; renderAdd(); if (sc != null) $('#add-scroll').scrollTop = sc; if (cx != null && $('.cats')) $('.cats').scrollLeft = cx; },
  'add-payer': (el) => { readAddInputs(); S.add.payer = el.dataset.id; if (S.add.recipient === el.dataset.id) S.add.recipient = null; const sc = $('#add-scroll')?.scrollTop; renderAdd(); if (sc != null) $('#add-scroll').scrollTop = sc; },
  pick: (el) => openPicker(el.dataset.v),
  'pk-close': () => { closePicker(); renderAdd(); },
  'pk-done': () => { closePicker(); renderAdd(); },
  'pk-cat': (el) => { S.add.category = el.dataset.v; closePicker(); renderAdd(); },
  'pk-payer': (el) => { S.add.payer = el.dataset.id; if (S.add.recipient === el.dataset.id) S.add.recipient = null; closePicker(); renderAdd(); },
  'pk-split': (el) => {
    const a = S.add, v = el.dataset.v;
    a.split = v;
    if (v === 'equal') a.among = S.trip.members.map((m) => m.id);
    if ((v === 'loan' || v === 'transfer') && a.recipient === a.payer) a.recipient = null;
    renderPicker();
    if (v === 'equal') { closePicker(); renderAdd(); }
  },
  'pk-among': (el) => { const a = S.add, id = el.dataset.id; a.among = a.among.includes(id) ? a.among.filter((x) => x !== id) : [...a.among, id]; renderPicker(); },
  'pk-rec': (el) => { S.add.recipient = el.dataset.id; closePicker(); renderAdd(); }
};
function setCover(cover) { store.updateTrip(S.trip.id, { cover }).then(() => toast('Zmieniono okładkę')).catch(fail); }

const changes = {
  'nt-title': (el) => { S.newTrip.title = el.value; },
  'nt-place': (el) => { S.newTrip.place = el.value; },
  'nt-country': (el) => { S.newTrip.country = el.value; S.newTrip.currency = countryCurrency(el.value); S.newTrip.title = $('#nt-title').value; render(); },
  'nt-currency': (el) => { S.newTrip.currency = el.value; },
  'rep-trip': (el) => { ls.set('lastTrip', el.value); onRoute(); },
  'add-desc': (el) => { S.add.desc = el.value; },
  'add-date': (el) => { S.add.date = el.value || todayISO(); const t = $('#add-date-txt'); if (t) t.textContent = S.add.date === todayISO() ? 'Dziś' : fmtDate(S.add.date); },
  'pk-share': (el) => { S.add.shares[el.dataset.id] = el.value; updateSharesLeft(); },
  'cover-file': async (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    toast('Przygotowuję zdjęcie…');
    try { const data = await fileToCoverData(f); setCover({ type: 'photo', data }); } catch (e) { fail(e); }
  },
  'member-photo': async (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    try {
      const big = await fileToCoverData(f, 400, 400);
      const small = await squareThumb(big, 128);
      store.updateTrip(S.trip.id, { members: S.trip.members.map((m) => m.id === el.dataset.id ? { ...m, photo: small } : m) }).then(() => toast('Dodano zdjęcie')).catch(fail);
    } catch (e) { fail(e); }
  }
};
function squareThumb(dataUrl, size) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      res(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el, ev); }
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (el && changes[el.dataset.change]) changes[el.dataset.change](el, ev);
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-input]');
  if (el && changes[el.dataset.input]) changes[el.dataset.input](el, ev);
});
document.addEventListener('keydown', (ev) => {
  const t = ev.target;
  if (ev.key === 'Enter' && t.dataset && t.dataset.enter) { ev.preventDefault(); actions[t.dataset.enter](t); return; }
  if (ev.key === 'Enter' && t.id === 'join-code') { ev.preventDefault(); actions.join(); return; }
  if (!S.add && !S.picker && S.route.name === 'trip' && !S.route.sub && S.q && isOpen() && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
    if (/^[0-9]$/.test(ev.key)) { qKey(ev.key); ev.preventDefault(); }
    else if (ev.key === ',' || ev.key === '.') { qKey(','); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { qKey('del'); ev.preventDefault(); }
    return;
  }
  if (S.add && !S.picker && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
    if (/^[0-9]$/.test(ev.key)) { keypress(ev.key); ev.preventDefault(); }
    else if (ev.key === ',' || ev.key === '.') { keypress(','); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { keypress('del'); ev.preventDefault(); }
    else if (ev.key === 'Enter') { saveAdd(); ev.preventDefault(); }
    else if (ev.key === 'Escape') closeAdd();
  }
});
document.addEventListener('focusin', (e) => { if (e.target && e.target.id === 'add-desc') { $('.add')?.classList.add('typing'); setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); } });
document.addEventListener('focusout', (e) => { if (e.target && e.target.id === 'add-desc') setTimeout(() => { if (document.activeElement?.id !== 'add-desc') $('.add')?.classList.remove('typing'); }, 120); });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.id === 'add-desc') { e.preventDefault(); e.target.blur(); } });
window.addEventListener('online', () => { S.online = true; scheduleRender(); });
window.addEventListener('offline', () => { S.online = false; scheduleRender(); });
window.addEventListener('hashchange', onRoute);

// ------------------------------------------------------------ przesuwanie palcem w bok
let touch = null;
document.addEventListener('touchstart', (e) => {
  if (S.add || S.picker || e.touches.length !== 1) { touch = null; return; }
  const el = e.target;
  if (el.closest('.people, input, select, textarea, .cats')) { touch = null; return; }
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), inTabs: !!el.closest('.swipe-area, .swipe-tabs') };
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
  const st = touch; touch = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > 50 || Date.now() - st.t > 600) return;
  const r = S.route;
  if (st.inTabs && (r.name === 'reports' || r.sub === 'report')) {
    const n = Math.min(2, Math.max(0, S.repTab + (dx < 0 ? 1 : -1)));
    if (n !== S.repTab) { S.repTab = n; render(); }
    return;
  }
  const order = ['#/', '#/reports', '#/settings'];
  const cur = r.name === 'home' ? 0 : r.name === 'reports' ? 1 : r.name === 'settings' ? 2 : -1;
  if (cur >= 0) { const n = cur + (dx < 0 ? 1 : -1); if (n >= 0 && n < 3) go(order[n]); return; }
  if (r.name === 'trip') {
    const i = TRIP_TABS.indexOf(r.sub || '');
    if (i < 0) { if (dx > 0) go('#/t/' + r.code); return; }
    const n = i + (dx < 0 ? 1 : -1);
    if (n < 0) go('#/');
    else if (n < TRIP_TABS.length) go('#/t/' + r.code + (TRIP_TABS[n] ? '/' + TRIP_TABS[n] : ''));
  }
}, { passive: true });

// ============================================================ start
async function boot() {
  const hideIntro = showIntro();
  $('#app').innerHTML = '<main class="page center-page"><div class="spinner"></div></main>';
  try { S.uid = await store.init(); }
  catch (e) {
    console.error(e);
    $('#app').innerHTML = `<main class="page center-page"><h2>Brak połączenia z Firebase</h2><p class="muted">${esc(e.code || e.message)}</p><p class="muted small">Sprawdź internet i spróbuj ponownie.</p><button class="btn primary" onclick="location.reload()">Spróbuj ponownie</button></main>`;
    return;
  }
  const params = new URLSearchParams(location.search);
  const join = params.get('join'), add = params.get('add');
  if (join || add) history.replaceState(null, '', location.pathname + location.hash);
  if (join) { await joinCode(join); onRoute(); hideIntro(); return; }
  if (add) { const last = ls.get('lastTrip', null); if (last) { S.pendingAdd = add === 'PLN' ? 'PLN' : 'foreign'; location.hash = '#/t/' + last; } }
  onRoute();
  hideIntro();
  handleWidgetAction();
}
boot();

if (!isNative && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

async function handleWidgetAction() {
  const raw = await consumeWidgetAction();
  if (!raw) return;
  const [a, wcode] = String(raw).split('|');
  const last = wcode || leadCode() || ls.get('lastTrip', null);
  if (!last) { toast('Najpierw otwórz albo utwórz wyjazd'); return; }
  if (a === 'open') { if (S.route.code !== last) go('#/t/' + last + '/dash'); return; }
  const cur = a === 'PLN' ? 'PLN' : 'foreign';
  if (S.route.code === last && S.trip) { closeAdd(); quickCur(cur); return; }
  S.pendingAdd = cur;
  go('#/t/' + last);
}
onResume(handleWidgetAction);
onBackButton(() => {
  if (S.msheet) { S.msheet = null; closePicker(); return; }
  if (S.picker) { closePicker(); renderAdd(); return; }
  if (S.add) { closeAdd(); return; }
  if ($('#picker-root')?.innerHTML) { closePicker(); return; }
  const r = S.route;
  if (r.name === 'trip' && r.sub) { go('#/t/' + r.code); return; }
  if (r.name !== 'home') { go('#/'); return; }
  exitApp();
});
async function checkUpdate() {
  if (!isNative || !APP_BUILD) return;
  let tag = ls.get('updTag', null);
  if (Date.now() - ls.get('updCheck', 0) > 6 * 3600e3) {
    try { const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`); if (r.ok) { tag = (await r.json()).tag_name; ls.set('updTag', tag); ls.set('updCheck', Date.now()); } } catch (e) {}
  }
  const n = Number(String(tag || '').split('.').pop());
  if (n > APP_BUILD) { S.update = String(tag).replace(/^v/, ''); scheduleRender(); }
}
checkUpdate();
