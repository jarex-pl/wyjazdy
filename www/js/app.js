import { createStore, newId } from './store.js';
import { computeBalances, settle, toPLN, round2, totalWeight, memberWeight } from './calc.js';
import { COUNTRIES, CURRENCIES, DEFAULT_RATES, DEFAULT_CATEGORIES, sym, countryName, countryCurrency, iconKey, iconSvg, iconBg } from './data.js';
import { isNative, updateWidget, consumeWidgetAction, onBackButton, onResume, exitApp } from './native.js';
import { APP_BUILD } from './version.js';
import { artSvg, tripPhoto, creditHtml, fileToCoverData } from './cover.js';

const GITHUB_REPO = 'jarex-pl/wyjazdy';
const APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Wyjazdy.apk`;

// ============================================================ narzędzia
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
const fmt = (n) => NF.format(round2(n || 0)).replace(/ /g, ' ');
const money = (n, cur) => `${fmt(n)} ${sym(cur)}`;
const signed = (n) => (n > 0.009 ? '+' : n < -0.009 ? '−' : '') + fmt(Math.abs(n));
const fmtRate = (r) => (r >= 0.1 ? r.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : r.toLocaleString('pl-PL', { maximumSignificantDigits: 4 }));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const flagImg = (cc, h = 20) => `<img class="flag" src="https://flagcdn.com/w80/${esc(cc || 'eu')}.png" alt="" style="height:${h}px">`;
const ico = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  list: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  swap: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h13l-4-4"/><path d="M17 17H4l4 4"/></svg>',
  people: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.6 4.5 4.5"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/></svg>',
  bksp: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>',
  pin: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  photo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/></svg>',
  brush: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17c3 0 4-2 6-2s3 2 6 2 4-2 6-2M3 11c3 0 4-2 6-2s3 2 6 2 4-2 6-2"/></svg>',
  logo: '<img src="icons/icon-192.png" width="40" height="40" alt="" style="border-radius:11px;display:block">'
};

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
  uid: null, route: { name: 'home' }, trip: null, expenses: [], meta: { pending: false, cache: false },
  unsub: [], filter: 'all', settleMode: 'pln', newTrip: null, adminKey: null, online: navigator.onLine,
  sheet: null, showAdminKey: false
};
const isAdmin = () => !!(S.trip && (S.trip.admins || []).includes(S.uid));
const isOpen = () => !!(S.trip && S.trip.status !== 'closed');
const meId = () => (S.trip ? ls.get('me:' + S.trip.id, null) : null);
const member = (id) => (S.trip?.members || []).find((m) => m.id === id);
const mName = (id) => (id === meId() ? 'Ty' : member(id)?.name || '?');
const mNameFull = (id) => member(id)?.name || '?';
const foreign = () => S.trip?.currency || 'EUR';

function rememberTrip(t) {
  const h = ls.get('history', []).filter((x) => x.code !== t.id);
  const c = t.cover || {};
  h.unshift({ code: t.id, title: t.title, country: t.country, status: t.status || 'open', cover: c.type === 'photo' ? { type: 'photo' } : c });
  if (c.type === 'photo' && c.data) {
    const sig = c.data.length;
    if (ls.get('thumbSig:' + t.id, 0) !== sig) makeThumb(c.data).then((th) => { if (th) { ls.set('thumb:' + t.id, th); ls.set('thumbSig:' + t.id, sig); } });
  } else { try { localStorage.removeItem('thumb:' + t.id); localStorage.removeItem('thumbSig:' + t.id); } catch (e) {} }
  ls.set('history', h.slice(0, 30));
  ls.set('lastTrip', t.id);
}

// ============================================================ routing
function parseHash() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 't' && p[1]) return { name: 'trip', code: decodeURIComponent(p[1]).toUpperCase(), tab: p[2] || 'list' };
  if (p[0] === 'new') return { name: 'new' };
  return { name: 'home' };
}
function go(hash) { if (location.hash !== hash) location.hash = hash; else onRoute(); }

function stopWatching() { S.unsub.forEach((f) => { try { f(); } catch (e) {} }); S.unsub = []; }

function onRoute() {
  const r = parseHash();
  const prevCode = S.route.name === 'trip' ? S.route.code : null;
  S.route = r;
  if (r.name !== 'trip' || r.code !== prevCode) {
    stopWatching();
    closeSheet();
    S.trip = null; S.expenses = []; S.adminKey = null; S.showAdminKey = false; S.filter = 'all';
    if (r.name === 'trip') watch(r.code);
  }
  if (r.name === 'new' && !S.newTrip) startNewTrip();
  render();
  window.scrollTo(0, 0);
}

function watch(code) {
  S.loading = true;
  S.unsub.push(store.watchTrip(code, (trip, meta) => {
    S.loading = false;
    S.trip = trip;
    S.tripMeta = meta;
    if (trip) rememberTrip(trip);
    render();
    if (S.pendingAdd && trip) { const c = S.pendingAdd; S.pendingAdd = null; openAdd(c); }
  }, (e) => { S.loading = false; S.trip = null; fail(e); render(); }));
  S.unsub.push(store.watchExpenses(code, (list, meta) => {
    S.expenses = list;
    S.meta = meta;
    render();
  }, fail));
}

// ============================================================ render
function render() {
  const app = $('#app');
  const r = S.route;
  let html = '';
  if (r.name === 'home') html = viewHome();
  else if (r.name === 'new') html = viewNewTrip();
  else if (r.name === 'trip') html = viewTripRoute();
  // zachowaj fokus i wartość aktywnego pola przy przerysowaniu
  const act = document.activeElement;
  const keep = act && act.id && app.contains(act) ? { id: act.id, v: act.value, s: act.selectionStart } : null;
  app.innerHTML = html;
  const key = r.name + '|' + (r.code || '') + '|' + (r.tab || '') + '|' + (S.trip ? (meId() || S.skipMe ? 'in' : 'pick') : 'none');
  if (key !== S.lastKey) { S.lastKey = key; app.firstElementChild?.classList.add('fade-in'); }
  if (keep) {
    const el = document.getElementById(keep.id);
    if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch (e) {} }
  }
  if (r.name === 'trip' && r.tab === 'people') drawQr();
  if (r.name === 'trip' && S.trip) scheduleWidget();
  hydrateCovers();
}

// ------------------------------------------------------------ widżety Androida
let widgetTimer = null;
function scheduleWidget() {
  if (!isNative) return;
  clearTimeout(widgetTimer);
  widgetTimer = setTimeout(pushWidget, 400);
}
function oweData(b, me) {
  if (!me) return { title: 'Rozliczenie', who: '', amount: '', extra: 'Wybierz w aplikacji, kim jesteś' };
  const tr = settle(b.balance);
  const toMe = tr.filter((x) => x.to === me), fromMe = tr.filter((x) => x.from === me);
  if (toMe.length) {
    const [a, ...rest] = toMe;
    return { title: 'Do oddania Tobie', who: mNameFull(a.from), amount: money(a.amount, 'PLN'), sign: 'pos',
      extra: rest.length ? rest.map((x) => '+ ' + money(x.amount, 'PLN') + ' · ' + mNameFull(x.from)).join('\n') : '' };
  }
  if (fromMe.length) {
    const [a, ...rest] = fromMe;
    return { title: 'Ty oddajesz', who: mNameFull(a.to), amount: money(a.amount, 'PLN'), sign: 'neg',
      extra: rest.length ? rest.map((x) => '+ ' + money(x.amount, 'PLN') + ' · ' + mNameFull(x.to)).join('\n') : '' };
  }
  return { title: 'Rozliczenie', who: 'Wszyscy na zero', amount: '', sign: 'zero', extra: '' };
}
function pushWidget() {
  const t = S.trip;
  if (!t) return;
  const me = meId();
  const b = computeBalances(t, S.expenses);
  const bal = me ? round2(b.balance[me] || 0) : null;
  const recent = [...S.expenses].filter((e) => e.type !== 'transfer')
    .sort((a, c) => (c.date || '').localeCompare(a.date || '') || (c.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3)
    .map((e) => ({ t: `${e.desc || e.category || 'Wydatek'} · ${mNameFull(e.payer)}`, a: money(e.amount, e.currency) }));
  updateWidget({
    code: t.id, title: t.title, closed: t.status === 'closed',
    foreign: foreign(), foreignSym: sym(foreign()),
    balanceLabel: me ? 'Twój bilans · ' + mNameFull(me) : 'Koszt wyjazdu',
    balanceText: me ? signed(bal) + ' zł' : fmt(b.total) + ' zł',
    balanceSign: me ? (bal > 0.009 ? 'pos' : bal < -0.009 ? 'neg' : 'zero') : 'zero',
    balanceHint: me ? (bal > 0.009 ? 'Inni oddadzą Ci tę kwotę' : bal < -0.009 ? 'Tyle musisz oddać' : 'Jesteś na zero') : '',
    recent, owe: oweData(b, me)
  });
}

// ------------------------------------------------------------ okładki
const S_cov = { res: {}, loaded: {} };
function coverBox(key, country, cls = '') {
  const r = S_cov.res[key];
  const img = r && r.src ? `<img src="${esc(r.src)}" alt="" class="${S_cov.loaded[r.src] ? 'ok' : ''}" onload="this.classList.add('ok')">` : '';
  return `<div class="cover ${cls}" data-cover="${esc(key)}">${artSvg(country, matchMedia('(prefers-color-scheme: dark)').matches)}${img}`;
}
function coverCredit(key) { return creditHtml(S_cov.res[key], esc); }
async function hydrateCovers() {
  const els = document.querySelectorAll('[data-cover]');
  for (const el of els) {
    const key = el.dataset.cover;
    if (key in S_cov.res) continue;
    S_cov.res[key] = null;
    let p = null;
    if (key.startsWith('trip:') && S.trip) p = await tripPhoto(S.trip, 1280);
    else if (key.startsWith('hist:')) {
      const h = ls.get('history', []).find((x) => 'hist:' + x.code === key);
      if (h) {
        const thumb = ls.get('thumb:' + h.code, null);
        p = thumb ? { src: thumb, own: true } : await tripPhoto({ country: h.country, cover: h.cover || {} }, 800);
      }
    }
    S_cov.res[key] = p;
    if (p && p.src) {
      const pre = new Image();
      pre.onload = () => { S_cov.loaded[p.src] = true; render(); };
      pre.src = p.src;
    }
  }
}
function resetTripCover() { Object.keys(S_cov.res).forEach((k) => { if (k.startsWith('trip:')) delete S_cov.res[k]; }); }
function makeThumb(dataUrl) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const w = 420, h = Math.round(img.height * (w / img.width));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      res(cv.toDataURL('image/jpeg', 0.7));
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
  return `<span class="av c${i % 6} ${cls}" aria-hidden="true">${esc(initials(member(id)?.name))}</span>`;
}

// ------------------------------------------------------------ start
function viewHome() {
  const hist = ls.get('history', []);
  const demo = store.mode === 'demo';
  const upd = S.update;
  const [first, ...rest] = hist;
  const fmtWhen = (h) => (h.status === 'closed' ? 'Rozliczony' : 'Aktywny') + ' · ' + esc(h.code);
  return `
  <main class="screen">
    <header class="top">
      <div class="page-head"><div class="over">Wyjazdy</div><h1>${hist.length ? 'Twoje wyjazdy' : 'Wspólne wydatki<br>na wyjazdach'}</h1></div>
      ${ico.logo}
    </header>
    ${upd ? `<div class="banner info"><span class="grow"><b>Nowa wersja ${esc(upd)}</b><br>Pobierz i zainstaluj na starej.</span><a class="btn primary" href="${APK_URL}" target="_blank" rel="noopener">Pobierz</a></div>` : ''}
    ${demo ? `<div class="banner warn"><b>Tryb demo.</b> Dane zapisują się tylko na tym urządzeniu.</div>` : ''}
    ${!hist.length ? `<p class="muted">Dodawaj w euro albo złotówkach. Aplikacja na bieżąco liczy, kto komu oddaje.</p>` : ''}
    ${first ? `
      <a class="post" href="#/t/${esc(first.code)}">
        ${coverBox('hist:' + first.code, first.country)}<div class="scrim" style="opacity:.5"></div></div>
        <div class="info"><span class="grow"><h2>${esc(first.title)}</h2><div class="sub">${fmtWhen(first)}</div></span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--muted)"><path d="M9 6l6 6-6 6"/></svg></div>
      </a>` : ''}
    ${rest.length ? `<div class="stack">${rest.map((h) => `
      <a class="mini" href="#/t/${esc(h.code)}">
        ${coverBox('hist:' + h.code, h.country)}</div>
        <span class="grow"><b>${esc(h.title)}</b><span class="muted small">${fmtWhen(h)}</span></span>
      </a>`).join('')}</div>` : ''}
    <div class="spacer"></div>
    <section class="card">
      <label class="h3" for="join-code">Masz kod od znajomego?</label>
      <div class="join-row">
        <input id="join-code" class="input code" placeholder="WYJ-XXXXXX" autocomplete="off" autocapitalize="characters" enterkeyhint="go">
        <button class="btn primary" data-act="join">Dołącz</button>
      </div>
    </section>
    <a class="btn dark big" href="#/new">${ico.plus} Nowy wyjazd</a>
  </main>`;
}

// ------------------------------------------------------------ nowy wyjazd
function startNewTrip() {
  const cc = 'it';
  S.newTrip = { title: '', country: cc, currency: countryCurrency(cc), members: [], meId: null, pair: false };
}
function viewNewTrip() {
  const n = S.newTrip;
  return `
  <main class="screen">
    <header class="top"><a class="icon-btn" href="#/" aria-label="Wróć">${ico.back}</a><div class="top-title">Nowy wyjazd</div><span style="width:46px"></span></header>
    <section class="card">
      <label class="field-label" for="nt-title">Nazwa wyjazdu</label>
      <input id="nt-title" class="input" placeholder="np. Włochy 2026" value="${esc(n.title)}" data-change="nt-title">
      <div class="grid2">
        <div><label class="field-label" for="nt-country">Dokąd?</label>
          <select id="nt-country" class="input" data-change="nt-country">${countryOptions(n.country)}</select></div>
        <div><label class="field-label" for="nt-currency">Waluta na miejscu</label>
          <select id="nt-currency" class="input" data-change="nt-currency">${CURRENCIES.map((c) => `<option ${c === n.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
      <label class="field-label" for="nt-place">Miejsce na zdjęcie okładki (opcjonalnie)</label>
      <input id="nt-place" class="input" placeholder="np. Rimini, Dubrownik, Zakopane" value="${esc(n.place || '')}" data-change="nt-place">
    </section>
    <section class="card">
      <div class="h3">Kto jedzie?</div>
      <p class="muted small">Para to jeden wspólny portfel – liczona za 2 osoby. Kółkiem zaznacz siebie.</p>
      ${n.members.length ? `<div class="group" style="box-shadow:none;padding:0">${n.members.map((m) => `
        <div class="member"><div class="row1">
          <button class="radio ${n.meId === m.id ? 'on' : ''}" data-act="nt-me" data-id="${m.id}" aria-label="To ja: ${esc(m.name)}"></button>
          <span class="grow"><span class="nm">${esc(m.name)}</span><br><span class="muted small">${memberWeight(m) > 1 ? 'para · ' + memberWeight(m) + ' os.' : '1 os.'}${n.meId === m.id ? ' · to Ty' : ''}</span></span>
          <button class="link danger" data-act="nt-remove" data-id="${m.id}">Usuń</button>
        </div></div>`).join('')}</div>` : ''}
      ${addMemberForm('nt')}
    </section>
    <div class="spacer"></div>
    <button class="btn dark big" data-act="nt-create" ${n.members.length < 2 ? 'disabled' : ''}>Utwórz wyjazd</button>
    ${n.members.length < 2 ? '<p class="muted small center">Dodaj co najmniej 2 osoby lub pary.</p>' : ''}
  </main>`;
}
function countryOptions(sel) {
  return COUNTRIES.map(([c, name]) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(name)}</option>`).join('');
}
function addMemberForm(prefix) {
  const pair = prefix === 'nt' ? S.newTrip.pair : S.pairForm;
  return `
    <div class="add-member">
      <div class="seg small">
        <button class="${!pair ? 'on' : ''}" data-act="${prefix}-pair" data-v="0">Osoba</button>
        <button class="${pair ? 'on' : ''}" data-act="${prefix}-pair" data-v="1">Para</button>
      </div>
      <div class="row">
        <input id="${prefix}-n1" class="input" placeholder="${pair ? 'Imię 1' : 'Imię'}" enterkeyhint="done" data-enter="${prefix}-add">
        ${pair ? `<span class="and">i</span><input id="${prefix}-n2" class="input" placeholder="Imię 2" enterkeyhint="done" data-enter="${prefix}-add">` : ''}
        <button class="btn primary sq" data-act="${prefix}-add" aria-label="Dodaj">${ico.plus}</button>
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
  if (S.loading && !S.trip) return `<main class="screen center-screen"><div class="spinner"></div><p class="muted">Łączenie…</p></main>`;
  if (!S.trip) return `
    <main class="screen center-screen">
      <h2 class="top-title">Nie znaleziono wyjazdu</h2>
      <p class="muted">Kod ${esc(S.route.code)} nie istnieje albo wyjazd został usunięty.</p>
      <button class="btn" data-act="forget" data-code="${esc(S.route.code)}">Usuń z mojej listy</button>
      <a class="btn primary" href="#/">Wróć</a>
    </main>`;
  if (!meId() && !S.skipMe) return viewPickMe();
  const tab = S.route.tab;
  const body = tab === 'settle' ? tabSettle() : tab === 'people' ? tabPeople() : tabList();
  return `
  <main class="screen with-nav ${tab === 'list' ? 'flush' : ''}">${body}</main>
  <nav class="pillnav" aria-label="Menu wyjazdu">
    ${tabLink('list', 'Wydatki', ico.list)}
    ${isOpen() ? `<button class="add" data-act="add" aria-label="Dodaj wydatek">${ico.plus}</button>` : ''}
    ${tabLink('settle', 'Rozliczenie', ico.swap)}${tabLink('people', 'Ludzie', ico.people)}
  </nav>`;
}
function tabLink(t, label, icon) {
  return `<a href="#/t/${esc(S.trip.id)}/${t}" class="${S.route.tab === t ? 'on' : ''}" ${S.route.tab === t ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
}
function liveChip() {
  if (store.mode === 'demo') return '<span class="live demo"><i class="dot"></i>Tryb demo</span>';
  if (!S.online) return '<span class="live off"><i class="dot"></i>Offline</span>';
  if (S.meta.pending || S.tripMeta?.pending) return '<span class="live busy"><i class="dot"></i>Wysyłanie…</span>';
  return '<span class="live"><i class="dot"></i>Na żywo</span>';
}
function pageHead(title) {
  return `<header class="top"><div class="page-head"><div class="over">${esc(S.trip.title)}</div><h1>${title}</h1></div>${liveChip()}</header>
  ${!isOpen() ? `<div class="banner ok">${ico.check}<span><b>Wyjazd rozliczony.</b> Tylko do odczytu.</span></div>` : ''}`;
}
function viewPickMe() {
  const t = S.trip;
  return `
  <main class="screen">
    <header class="top"><a class="icon-btn" href="#/" aria-label="Wróć">${ico.back}</a><span></span></header>
    <div class="page-head"><div class="over">${esc(t.title)}</div><h1>Kim jesteś?</h1></div>
    <p class="muted">Dzięki temu pokażę Twój bilans i ustawię Cię jako płacącego.</p>
    <div class="stack">
      ${(t.members || []).map((m) => `<button class="pick" data-act="pick-me" data-id="${m.id}">${avatar(m.id)}<span class="grow"><b>${esc(m.name)}</b><span class="muted small">${memberWeight(m) > 1 ? 'para · ' + memberWeight(m) + ' os.' : '1 os.'}</span></span></button>`).join('')}
    </div>
    <button class="btn link" data-act="skip-me">Tylko podgląd</button>
  </main>`;
}

// ------------------------------------------------------------ zakładka: wydatki
function dayLabel(iso) {
  const today = todayISO();
  const y = new Date(); y.setDate(y.getDate() - 1); y.setMinutes(y.getMinutes() - y.getTimezoneOffset());
  const d = new Date(iso + 'T12:00:00');
  const nice = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  if (iso === today) return 'Dziś · ' + nice;
  if (iso === y.toISOString().slice(0, 10)) return 'Wczoraj · ' + nice;
  return nice;
}
function expenseSub(e) {
  const type = e.type || 'shared';
  if (type === 'loan') return `${esc(mName(e.payer))} → ${esc(mName(e.recipient))}`;
  if (type === 'transfer') return `${esc(mName(e.payer))} oddał(a) → ${esc(mName(e.recipient))}`;
  const n = Array.isArray(e.splitAmong) && e.splitAmong.length ? e.splitAmong.length : (S.trip.members || []).length;
  const all = !(Array.isArray(e.splitAmong) && e.splitAmong.length) || n === (S.trip.members || []).length;
  return `${esc(mName(e.payer))} · ${all ? 'dla wszystkich' : 'dla ' + n + ' z ' + (S.trip.members || []).length}`;
}
function expenseRow(e) {
  const k = iconKey(e);
  const badge = e.type === 'loan' ? ' <span class="badge loan">POŻYCZKA</span>' : e.type === 'transfer' ? ' <span class="badge ok">ZWROT</span>' : '';
  return `
  <button class="exp" data-act="edit" data-id="${esc(e.id)}">
    <span class="exp-ico" style="background:${iconBg(k)}">${iconSvg(k)}</span>
    <span class="grow">
      <span class="exp-title">${esc(e.desc || e.category || 'Wydatek')}${badge}</span>
      <span class="exp-sub">${expenseSub(e)}${e.note ? ' · ' + esc(e.note) : ''}</span>
    </span>
    <span class="exp-amt"><b>${money(e.amount, e.currency)}</b>${e.currency !== 'PLN' ? `<span>${money(toPLN(e, S.trip.rate), 'PLN')}</span>` : ''}</span>
  </button>`;
}
function tripCover() {
  const t = S.trip;
  const dates = S.expenses.map((e) => e.date).filter(Boolean).sort();
  const range = dates.length ? (dates[0] === dates[dates.length - 1] ? fmtDay(dates[0]) : fmtDay(dates[0]) + ' – ' + fmtDay(dates[dates.length - 1])) : countryName(t.country);
  return `
  ${coverBox('trip:' + t.id + ':' + coverSig(t), t.country, 'trip-cover')}
    <div class="scrim"></div>
    <div class="bar"><a class="icon-btn glass" href="#/" aria-label="Lista wyjazdów">${ico.back}</a>${liveChip()}</div>
    <div class="title">
      <span class="where">${flagImg(t.country, 16)}${esc(range)}</span>
      <h1>${esc(t.title)}</h1>
    </div>
    ${coverCredit('trip:' + t.id + ':' + coverSig(t))}
  </div>`;
}
const fmtDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
const coverSig = (t) => { const c = t.cover || {}; return (c.type || 'auto') + ':' + (c.query || '') + ':' + (c.data ? c.data.length : 0); };
function tabList() {
  const t = S.trip, me = meId();
  const b = computeBalances(t, S.expenses);
  const myBal = me ? round2(b.balance[me] || 0) : null;
  const fTotal = S.expenses.filter((e) => (e.type || 'shared') === 'shared' && e.currency !== 'PLN').reduce((s, e) => s + e.amount, 0);
  const tr = settle(b.balance);
  let hint = '';
  if (me) {
    if (myBal > 0.009) { const who = tr.filter((x) => x.to === me).map((x) => mNameFull(x.from)); hint = who.length ? `${who.join(', ')} ${who.length > 1 ? 'oddadzą' : 'odda'} Ci tę kwotę` : 'Inni oddadzą Ci tę kwotę'; }
    else if (myBal < -0.009) { const to = tr.filter((x) => x.from === me).map((x) => mNameFull(x.to)); hint = 'Oddajesz: ' + (to.join(', ') || 'innym'); }
    else hint = 'Jesteś na zero';
  }
  let list = [...S.expenses];
  if (S.filter === 'mine' && me) list = list.filter((e) => e.payer === me || e.recipient === me || ((e.type || 'shared') === 'shared' && (!e.splitAmong?.length || e.splitAmong.includes(me))));
  list.sort((a, c) => (c.date || '').localeCompare(a.date || '') || (c.createdAt || 0) - (a.createdAt || 0));
  const groups = [];
  for (const e of list) { const g = groups[groups.length - 1]; if (g && g.date === e.date) g.items.push(e); else groups.push({ date: e.date, items: [e] }); }
  const hasF = foreign() !== 'PLN';
  return `
  ${tripCover()}
  <section class="bal">
    <div class="row" style="align-items:flex-start">
      <div class="grow">
        <div class="lbl">${me ? 'Twój bilans · ' + esc(mNameFull(me)) : 'Koszt wyjazdu'}</div>
        <div class="num ${me ? (myBal > 0.009 ? 'pos' : myBal < -0.009 ? 'neg' : '') : ''}">${me ? signed(myBal) : fmt(b.total)} zł</div>
        ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
      </div>
      <div style="text-align:right"><div class="stack-av">${(t.members || []).slice(0, 4).map((m) => avatar(m.id, 'sm')).join('')}</div>
        <div class="muted small" style="margin-top:4px">${totalWeight(t)} os.</div></div>
    </div>
    ${isOpen() ? `<div class="quick ${hasF ? '' : 'one'}">
      ${hasF ? `<button class="q1" data-act="add-cur" data-v="foreign"><b>+ ${esc(sym(foreign()))}</b><span>wydatek<br>w ${esc(curName(foreign()))}</span></button>` : ''}
      <button class="${hasF ? 'q2' : 'q1'}" data-act="add-cur" data-v="PLN"><b>+ zł</b><span>wydatek<br>w złotych</span></button>
    </div>` : `<a class="btn" href="#/t/${esc(t.id)}/settle">${ico.check} Wyjazd rozliczony – zobacz podsumowanie</a>`}
  </section>

  <h2 class="sec">Wydatki <small>${fTotal ? money(fTotal, foreign()) + ' · ' : ''}${fmt(b.total)} zł</small></h2>
  ${me ? `<div class="chips">
    <button class="chip ${S.filter === 'all' ? 'on' : ''}" data-act="filter" data-v="all">Wszystkie</button>
    <button class="chip ${S.filter === 'mine' ? 'on' : ''}" data-act="filter" data-v="mine">Moje</button>
  </div>` : ''}
  ${groups.length ? groups.map((g) => `
    <div class="day">${esc(dayLabel(g.date || todayISO()))}</div>
    <div class="group">${g.items.map(expenseRow).join('')}</div>`).join('') : `
    <div class="empty"><p><b>Brak wydatków.</b></p><p class="muted">Stuknij „+ ${esc(sym(foreign()))}” albo „+ zł”, żeby dodać pierwszy.</p></div>`}`;
}
const curName = (c) => ({ EUR: 'euro', USD: 'dolarach', GBP: 'funtach', CHF: 'frankach', CZK: 'koronach', HUF: 'forintach', DKK: 'koronach', SEK: 'koronach', NOK: 'koronach', TRY: 'lirach', JPY: 'jenach', THB: 'batach' }[c] || c);

// ------------------------------------------------------------ zakładka: rozliczenie
function balanceList(bal, cur) {
  return `<div class="group">${(S.trip.members || []).map((m) => {
    const v = round2(bal[m.id] || 0);
    return `<div class="who">${avatar(m.id)}<span class="name">${esc(m.name)}${m.id === meId() ? ' <em>(Ty)</em>' : ''}</span><span class="val ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${signed(v)} ${sym(cur)}</span></div>`;
  }).join('')}</div>`;
}
function transferCards(transfers, cur) {
  if (!transfers.length) return `<div class="done-box">${ico.check}<span>Wszyscy są na zero</span></div>`;
  return transfers.map((tr) => `
    <section class="card">
      <div class="tr">
        <div class="side">${avatar(tr.from, 'lg')}${esc(mNameFull(tr.from))}</div>
        <div class="mid"><div class="amt">${money(tr.amount, cur)}</div>
          ${cur !== 'PLN' ? `<div class="conv">≈ ${money(tr.amount * S.trip.rate, 'PLN')}</div>` : ''}
          <svg class="arrow" width="90" height="16" viewBox="0 0 90 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h84M78 2l8 6-8 6"/></svg></div>
        <div class="side">${avatar(tr.to, 'lg')}${esc(mNameFull(tr.to))}</div>
      </div>
      ${isOpen() ? `<div class="grid2">
        <button class="btn" data-act="copy-amt" data-v="${tr.amount.toFixed(2).replace('.', ',')}">Kopiuj kwotę</button>
        <button class="btn dark" data-act="mark-paid" data-from="${tr.from}" data-to="${tr.to}" data-amt="${tr.amount}" data-cur="${cur}">${ico.check} Oddane</button>
      </div>` : ''}
    </section>`).join('');
}
function tabSettle() {
  const t = S.trip;
  const hasF = foreign() !== 'PLN';
  const mode = hasF ? S.settleMode : 'pln';
  const b = computeBalances(t, S.expenses);
  const done = S.expenses.filter((e) => e.type === 'transfer').sort((a, c) => (c.createdAt || 0) - (a.createdAt || 0));
  let main = '';
  if (mode === 'pln') {
    const tr = settle(b.balance);
    main = `${balanceList(b.balance, 'PLN')}<h2 class="sec">Przelewy <small>${tr.length ? tr.length + ' do zrobienia' : ''}</small></h2>${transferCards(tr, 'PLN')}`;
  } else {
    main = [foreign(), 'PLN'].map((cur) => {
      const bc = computeBalances(t, S.expenses, { currency: cur });
      const tr = settle(bc.balance);
      return `<h2 class="sec">W ${cur} <small>wydano ${money(bc.total, cur)}</small></h2>${balanceList(bc.balance, cur)}${transferCards(tr, cur)}`;
    }).join('');
  }
  const remaining = settle(b.balance).length;
  return `
  ${pageHead('Kto komu oddaje')}
  ${!isOpen() ? finishSummary(b) : ''}
  ${hasF ? `<div class="seg">
    <button class="${mode === 'pln' ? 'on' : ''}" data-act="settle-mode" data-v="pln">Wszystko w PLN</button>
    <button class="${mode === 'cur' ? 'on' : ''}" data-act="settle-mode" data-v="cur">Osobno ${esc(foreign())} i PLN</button>
  </div>` : ''}
  ${main}
  ${done.length ? `<h2 class="sec">Oddane</h2><div class="group">${done.map((e) => `
    <div class="done-row"><span class="stack-av">${avatar(e.payer, 'sm')}${avatar(e.recipient, 'sm')}</span>
      <span class="t">${esc(mNameFull(e.payer))} → ${esc(mNameFull(e.recipient))}<small>${ico.check} oddane ${esc(dayLabel(e.date || todayISO()).toLowerCase())}</small></span>
      <b>${money(e.amount, e.currency)}</b>
      ${isOpen() ? `<button class="link danger" data-act="undo-paid" data-id="${esc(e.id)}">Cofnij</button>` : ''}</div>`).join('')}</div>` : ''}
  <section class="card summary">
    <div><span>Koszt wyjazdu</span><b>${fmt(b.total)} zł</b></div>
    <div><span>Na 1 osobę</span><b>${fmt(b.total / (totalWeight(t) || 1))} zł</b></div>
    <div><span>Kurs</span><b>1 ${esc(foreign())} = ${fmtRate(t.rate)} zł</b></div>
  </section>
  <button class="btn big" data-act="pdf">${ico.down} Raport PDF</button>
  ${isOpen() && isAdmin() ? `<button class="btn dark big" data-act="close-trip" data-remaining="${remaining}">${ico.check} Zakończ wyjazd</button>` : ''}
  ${!isOpen() && isAdmin() ? `<button class="btn link" data-act="reopen">Otwórz wyjazd ponownie</button>` : ''}`;
}
function finishSummary(b) {
  const t = S.trip;
  const days = new Set(S.expenses.map((e) => e.date)).size;
  return `
  <section class="card finish">
    <div class="finish-ico">${ico.check}</div>
    <h2>${esc(t.title)} rozliczone</h2>
    <p class="muted">Kurs zamrożony: 1 ${esc(foreign())} = ${fmtRate(t.rate)} zł${t.closedAt ? ' · ' + new Date(t.closedAt).toLocaleDateString('pl-PL') : ''}</p>
    <div class="grid2">
      <div class="stat"><span>Koszt wyjazdu</span><b>${fmt(b.total)} zł</b></div>
      <div class="stat"><span>Na osobę</span><b>${fmt(b.total / (totalWeight(t) || 1))} zł</b></div>
      <div class="stat"><span>Wydatki</span><b>${S.expenses.filter((e) => e.type !== 'transfer').length}</b></div>
      <div class="stat"><span>Dni z wydatkami</span><b>${days}</b></div>
    </div>
    <button class="btn dark big" data-act="pdf">${ico.down} Pobierz raport PDF</button>
    <button class="btn big" data-act="pdf-share">${ico.share} Wyślij raport grupie</button>
  </section>`;
}

// ------------------------------------------------------------ zakładka: ludzie
function tabPeople() {
  const t = S.trip, admin = isAdmin(), me = meId();
  const used = new Set();
  S.expenses.forEach((e) => { used.add(e.payer); if (e.recipient) used.add(e.recipient); (e.splitAmong || []).forEach((x) => used.add(x)); });
  const c = t.cover || {};
  const ckey = 'trip:' + t.id + ':' + coverSig(t);
  return `
  ${pageHead('Ludzie')}
  <section class="invite">
    <div id="qr" class="qr" role="img" aria-label="Kod QR zaproszenia"></div>
    <div class="grow">
      <div class="small inv-l">Kod zaproszenia</div>
      <div class="inv-code">${esc(t.id)}</div>
      <div class="row">
        <button class="btn light" data-act="share-link">${ico.share} Wyślij link</button>
        <button class="btn ghost-light" data-act="copy-code">Kopiuj</button>
      </div>
    </div>
  </section>

  <h2 class="sec">Na wyjeździe <small>${totalWeight(t)} os.</small></h2>
  <section class="group">
    ${(t.members || []).map((m) => `
      <div class="member">
        <div class="row1">${avatar(m.id)}
          <span class="grow"><span class="nm">${esc(m.name)}</span>${m.id === me ? ' <span class="pill blue">Ty</span>' : ''}<br>
            <span class="muted small">${memberWeight(m) > 1 ? 'para · ' : ''}${memberWeight(m)} os.</span></span>
          ${m.id !== me ? `<button class="link" data-act="pick-me" data-id="${m.id}">To ja</button>` : ''}
        </div>
        ${admin && isOpen() ? `<div class="tools">
          <span class="muted small nowrap">Osób:</span>
          <span class="stepper"><button data-act="weight" data-id="${m.id}" data-d="-1" aria-label="Mniej osób">−</button><button data-act="weight" data-id="${m.id}" data-d="1" aria-label="Więcej osób">+</button></span>
          <span class="grow"></span>
          <button class="link" data-act="rename" data-id="${m.id}">Zmień nazwę</button>
          ${!used.has(m.id) ? `<button class="link danger" data-act="remove-member" data-id="${m.id}">Usuń</button>` : ''}
        </div>` : ''}
      </div>`).join('')}
  </section>
  ${admin && isOpen() ? `<section class="card">${addMemberForm('pm')}</section>` : ''}

  ${admin ? `
  <h2 class="sec">Okładka wyjazdu</h2>
  <section class="card">
    ${coverBox(ckey, t.country, 'cover-preview')}${coverCredit(ckey)}</div>
    <div class="cover-pick">
      <button class="${!c.type || c.type === 'place' ? 'on' : ''}" data-act="cover-auto">${ico.pin}Zdjęcie miejsca</button>
      <label class="${c.type === 'photo' ? 'on' : ''}">${ico.photo}Własne zdjęcie<input type="file" accept="image/*" data-change="cover-file" hidden></label>
      <button class="${c.type === 'art' ? 'on' : ''}" data-act="cover-art">${ico.brush}Rysunek</button>
    </div>
    <label class="field-label" for="cv-place">Jakie miejsce pokazać?</label>
    <div class="row"><input id="cv-place" class="input" placeholder="np. Rimini" value="${esc(c.query || '')}" enterkeyhint="search" data-enter="cover-place">
      <button class="btn primary" data-act="cover-place">Szukaj</button></div>
    <p class="muted small">Puste pole = typowe zdjęcie kraju. Zdjęcia z Wikipedii (Wikimedia Commons).</p>
  </section>

  <h2 class="sec">Ustawienia</h2>
  <section class="card">
    <label class="field-label" for="st-title">Nazwa</label>
    <input id="st-title" class="input" value="${esc(t.title)}">
    <div class="grid2">
      <div><label class="field-label" for="st-country">Kraj</label><select id="st-country" class="input">${countryOptions(t.country)}</select></div>
      <div><label class="field-label" for="st-currency">Waluta</label><select id="st-currency" class="input">${CURRENCIES.map((x) => `<option ${x === t.currency ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    </div>
    <label class="field-label" for="st-rate">Kurs: 1 ${esc(foreign())} = ? zł</label>
    <div class="row">
      <input id="st-rate" class="input" type="number" step="any" inputmode="decimal" value="${t.rate}" ${isOpen() ? '' : 'disabled'}>
      ${isOpen() ? '<button class="btn" data-act="nbp">Kurs NBP</button>' : ''}
    </div>
    <p class="muted small">${t.rateDate ? 'Kurs z ' + esc(t.rateDate) + (t.rateSource ? ' (' + esc(t.rateSource) + ')' : '') : ''}</p>
    <label class="field-label" for="st-cats">Kategorie (jedna w linii)</label>
    <textarea id="st-cats" class="input" rows="4">${esc((t.categories || DEFAULT_CATEGORIES).join('\n'))}</textarea>
    <button class="btn primary" data-act="save-settings">Zapisz ustawienia</button>
  </section>
  <section class="card">
    <div class="h3">Drugi organizator</div>
    <p class="muted small">Daj ten kod osobie, która też ma zarządzać wyjazdem.</p>
    ${S.showAdminKey ? `<div class="inv-code dark">${esc(S.adminKey || '…')}</div>` : `<button class="btn" data-act="show-admin-key">Pokaż kod organizatora</button>`}
  </section>
  <button class="btn danger-outline" data-act="delete-trip">Usuń cały wyjazd</button>` : `
  <section class="card">
    <label class="h3" for="admin-key">Jesteś organizatorem?</label>
    <p class="muted small">Wpisz kod organizatora, żeby móc zmieniać ustawienia.</p>
    <div class="row"><input id="admin-key" class="input code" placeholder="XXXX-XXXX" autocapitalize="characters"><button class="btn primary" data-act="claim-admin">OK</button></div>
  </section>`}
  <button class="btn link" data-act="forget" data-code="${esc(t.id)}">Usuń wyjazd z mojej listy</button>
  <p class="muted small center">${store.mode === 'demo' ? 'Tryb demo' : 'Firebase'} · wersja 1.${APP_BUILD}</p>`;
}

function inviteUrl() {
  const base = isNative ? 'https://jarex-pl.github.io/wyjazdy/' : location.origin + location.pathname;
  return base + '?join=' + encodeURIComponent(S.trip.id);
}
function drawQr() {
  const el = $('#qr');
  if (!el || typeof window.qrcode !== 'function') return;
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(inviteUrl());
    qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  } catch (e) { el.textContent = ''; }
}

// ============================================================ arkusz dodawania wydatku
function openAdd(currency) {
  if (!S.trip || !isOpen()) return;
  const me = meId();
  const t = S.trip;
  const cur = currency === 'foreign' ? foreign() : currency || ls.get('lastCur:' + t.id, foreign());
  S.sheet = {
    mode: 'add', id: null, amount: '', currency: foreign() === 'PLN' ? 'PLN' : cur,
    category: null, desc: '', note: '', date: todayISO(),
    payer: me && member(me) ? me : t.members[0]?.id,
    split: 'all', among: (t.members || []).map((m) => m.id), recipient: null, details: false
  };
  renderSheet();
}
function openEdit(id) {
  const e = S.expenses.find((x) => x.id === id);
  if (!e) return;
  if (!isOpen()) { toast('Wyjazd rozliczony – tylko podgląd'); return; }
  const t = S.trip;
  const type = e.type || 'shared';
  const among = Array.isArray(e.splitAmong) && e.splitAmong.length ? e.splitAmong : t.members.map((m) => m.id);
  S.sheet = {
    mode: 'edit', id, amount: String(e.amount).replace('.', ','), currency: e.currency,
    category: e.category || null, desc: e.desc || '', note: e.note || '', date: e.date || todayISO(),
    payer: e.payer, split: type === 'loan' ? 'loan' : type === 'transfer' ? 'transfer' : among.length === t.members.length ? 'all' : 'some',
    among, recipient: e.recipient || null, details: true
  };
  renderSheet();
}
function closeSheet() {
  S.sheet = null;
  const root = $('#sheet-root');
  if (root) root.innerHTML = '';
  document.body.classList.remove('sheet-open');
}
function amountValue() {
  const v = parseFloat((S.sheet.amount || '0').replace(',', '.'));
  return isNaN(v) ? 0 : v;
}
function amountText() {
  const s = S.sheet;
  const raw = s.amount || '0';
  const [i, d] = raw.split(',');
  const int = Number(i || 0).toLocaleString('pl-PL').replace(/ /g, ' ');
  return (d !== undefined ? int + ',' + d : int) + ' ' + sym(s.currency);
}
function convText() {
  const s = S.sheet;
  if (s.currency === 'PLN') return foreign() !== 'PLN' ? `≈ ${money(amountValue() / S.trip.rate, foreign())}` : '&nbsp;';
  return `≈ ${money(amountValue() * S.trip.rate, 'PLN')} · kurs ${fmtRate(S.trip.rate)}`;
}
function renderSheet() {
  const s = S.sheet;
  const root = $('#sheet-root');
  if (!s) { closeSheet(); return; }
  const t = S.trip, ms = t.members || [];
  const cats = t.categories && t.categories.length ? t.categories : DEFAULT_CATEGORIES;
  const isTransfer = s.split === 'transfer';
  const others = ms.filter((m) => m.id !== s.payer);
  const dateTxt = s.date === todayISO() ? 'Dziś' : fmtDay(s.date);
  document.body.classList.add('sheet-open');
  root.innerHTML = `
  <div class="sheet-overlay" data-act="sheet-close"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${s.mode === 'add' ? 'Nowy wydatek' : 'Edytuj wydatek'}">
    <div class="grip"></div>
    <div class="sheet-head">
      <button class="round" data-act="sheet-close" aria-label="Zamknij"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <b>${s.mode === 'add' ? 'Nowy wydatek' : isTransfer ? 'Zwrot' : 'Edytuj wydatek'}</b>
      <label class="date-chip">${esc(dateTxt)}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        <input id="sh-date" type="date" value="${esc(s.date)}" data-change="sh-date" aria-label="Data wydatku"></label>
    </div>
    ${foreign() !== 'PLN' ? `<div class="curs">
      <button class="${s.currency === foreign() ? 'on' : ''}" data-act="sheet-cur" data-v="${esc(foreign())}"><b>${esc(sym(foreign()))}</b><span>${esc(foreign() === 'EUR' ? 'Euro' : foreign())}</span></button>
      <button class="${s.currency === 'PLN' ? 'on' : ''}" data-act="sheet-cur" data-v="PLN"><b>zł</b><span>Złotówki</span></button>
    </div>` : ''}
    <div class="amount ${amountClass()}" id="sh-amount">${amountText()}</div>
    <div class="conv-line" id="sh-conv">${convText()}</div>

    ${!isTransfer ? `<div class="cats">${cats.map((c) => { const k = iconKey({ category: c }); return `<button class="cat ${s.category === c ? 'on' : ''}" data-act="sheet-cat" data-v="${esc(c)}">${iconSvg(k)}${esc(c)}</button>`; }).join('')}</div>` : ''}

    <div class="field-cap">${isTransfer ? 'Kto oddał?' : 'Kto zapłacił?'}</div>
    <div class="payers">${ms.map((m) => `<button class="payer ${m.id === s.payer ? 'on' : ''}" data-act="sheet-payer" data-id="${m.id}">${avatar(m.id)}${esc(m.id === meId() ? 'Ty' : m.name)}</button>`).join('')}</div>

    ${isTransfer ? `<div class="field-cap">Komu?</div>
      <div class="payers">${others.map((m) => `<button class="payer ${m.id === s.recipient ? 'on' : ''}" data-act="sheet-recipient" data-id="${m.id}">${avatar(m.id)}${esc(m.name)}</button>`).join('')}</div>` : `
    <div class="field-cap">Dla kogo?</div>
    <div class="split-row">
      <button class="chip ${s.split === 'all' ? 'on' : ''}" data-act="sheet-split" data-v="all">Wszyscy (${totalWeight(t)} os.)</button>
      <button class="chip ${s.split === 'some' ? 'on' : ''}" data-act="sheet-split" data-v="some">Wybrani</button>
      <button class="chip ${s.split === 'loan' ? 'on' : ''}" data-act="sheet-split" data-v="loan">Pożyczka</button>
    </div>
    ${s.split === 'some' ? `<div class="payers">${ms.map((m) => `<button class="payer ${s.among.includes(m.id) ? 'on' : ''}" data-act="sheet-among" data-id="${m.id}">${avatar(m.id)}${esc(m.name)}</button>`).join('')}</div>` : ''}
    ${s.split === 'loan' ? `<div class="field-cap">Pożyczka dla:</div><div class="payers">${others.map((m) => `<button class="payer ${m.id === s.recipient ? 'on' : ''}" data-act="sheet-recipient" data-id="${m.id}">${avatar(m.id)}${esc(m.name)}</button>`).join('')}</div>` : ''}`}

    ${s.details ? `<div class="details">
      <label class="field-label" for="sh-desc">Opis</label>
      <input id="sh-desc" class="input" value="${esc(s.desc)}" placeholder="${esc(s.category || 'np. Kolacja w trattorii')}" data-change="sh-desc" list="sh-sugg">
      <datalist id="sh-sugg">${Array.from(new Set(S.expenses.map((e) => e.desc).filter(Boolean))).slice(0, 40).map((d) => `<option value="${esc(d)}">`).join('')}</datalist>
      <label class="field-label" for="sh-note">Notatka</label>
      <input id="sh-note" class="input" value="${esc(s.note)}" data-change="sh-note">
    </div>` : `<button class="btn link" data-act="sheet-details" style="align-self:flex-start;padding:0 4px">+ Dodaj opis lub notatkę</button>`}

    <div class="keypad">
      ${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((k) => `<button data-act="key" data-k="${k}">${k}</button>`).join('')}
      <button data-act="key" data-k="del" aria-label="Usuń cyfrę">${ico.bksp}</button>
    </div>
    <div class="sheet-foot">
      ${s.mode === 'edit' ? `<button class="btn danger-outline big" data-act="sheet-delete" style="width:auto">Usuń</button>` : ''}
      <button class="btn dark big grow" id="sh-save" data-act="sheet-save">${saveLabel()}</button>
    </div>
  </div>`;
}
function saveLabel() { return (S.sheet.mode === 'add' ? 'Dodaj ' : 'Zapisz ') + amountText(); }
function amountClass() {
  const n = amountText().length;
  return n > 13 ? 'xlong' : n > 10 ? 'long' : '';
}
function updateAmount() {
  const el = $('#sh-amount');
  el.textContent = amountText();
  el.className = 'amount ' + amountClass();
  $('#sh-conv').innerHTML = convText();
  $('#sh-save').textContent = saveLabel();
}
function keypress(k) {
  const s = S.sheet;
  let a = s.amount || '';
  if (k === 'del') a = a.slice(0, -1);
  else if (k === ',') { if (!a.includes(',')) a = (a || '0') + ','; }
  else {
    const [i, d] = a.split(',');
    if (d !== undefined && d.length >= 2) return;
    if (d === undefined && (i || '').replace(/^0+/, '').length >= 7) return;
    a = a === '0' ? k : a + k;
  }
  s.amount = a;
  updateAmount();
}
function readSheetInputs() {
  const s = S.sheet;
  if ($('#sh-desc')) s.desc = $('#sh-desc').value;
  if ($('#sh-note')) s.note = $('#sh-note').value;
  if ($('#sh-date')) s.date = $('#sh-date').value || todayISO();
}
function saveSheet() {
  readSheetInputs();
  const s = S.sheet, t = S.trip;
  const amount = round2(amountValue());
  if (!(amount > 0)) { toast('Wpisz kwotę'); return; }
  let type = s.split === 'loan' ? 'loan' : s.split === 'transfer' ? 'transfer' : 'shared';
  if ((type === 'loan' || type === 'transfer') && (!s.recipient || s.recipient === s.payer)) { toast('Wybierz, dla kogo (inna osoba niż płacący)'); return; }
  if (s.split === 'some' && !s.among.length) { toast('Zaznacz co najmniej jedną osobę'); return; }
  const data = {
    amount, currency: s.currency, type, payer: s.payer,
    recipient: type === 'shared' ? null : s.recipient,
    splitAmong: type === 'shared' && s.split === 'some' ? s.among : null,
    category: s.category || null,
    desc: (s.desc || '').trim() || (type === 'transfer' ? 'Zwrot' : s.category || (type === 'loan' ? 'Pożyczka' : 'Wydatek')),
    note: (s.note || '').trim(), date: s.date || todayISO()
  };
  ls.set('lastCur:' + t.id, s.currency);
  const p = s.mode === 'add'
    ? store.addExpense(t.id, { ...data, id: newId(), createdAt: Date.now(), createdBy: S.uid })
    : store.updateExpense(t.id, s.id, { ...data, updatedAt: Date.now() });
  p.catch(fail);
  closeSheet();
  if (navigator.vibrate) navigator.vibrate(15);
  toast(s.mode === 'add' ? `Dodano ${money(amount, s.currency)}` : 'Zapisano zmiany');
}

// ============================================================ PDF
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
      <p>${esc(countryName(t.country))}${range ? ' · ' + range : ''} · ${totalWeight(t)} os. · kurs 1 ${esc(foreign())} = ${fmtRate(t.rate)} zł</p></div>
      <span class="rep-status">${t.status === 'closed' ? 'ROZLICZONY' : 'W TRAKCIE'}</span>
    </div>
    <div class="rep-boxes">
      <div><span>Koszt całego wyjazdu</span><b>${fmt(b.total)} zł</b></div>
      <div><span>Na jedną osobę</span><b>${fmt(b.total / (totalWeight(t) || 1))} zł</b></div>
      <div><span>Przelewy</span><b>${tr.length ? tr.length + ' do zrobienia' : 'wszystko oddane'}</b></div>
    </div>
    <h2>Bilans uczestników</h2>
    <table><thead><tr><th>Uczestnik</th><th class="r">Zapłacił</th><th class="r">Udział</th><th class="r">Bilans</th></tr></thead><tbody>
      ${(t.members || []).map((m) => `<tr><td>${esc(m.name)} (${memberWeight(m)} os.)</td><td class="r">${fmt(b.paid[m.id])} zł</td><td class="r">${fmt(b.share[m.id])} zł</td><td class="r"><b>${signed(round2(b.balance[m.id]))} zł</b></td></tr>`).join('')}
    </tbody></table>
    <div class="rep-cols">
      <div><h2>Przelewy</h2>
        ${tr.map((x) => `<div class="rep-tr"><span>${esc(mNameFull(x.from))} → ${esc(mNameFull(x.to))}</span><b>${money(x.amount, 'PLN')}</b></div>`).join('')}
        ${done.map((e) => `<div class="rep-tr ok"><span>${esc(mNameFull(e.payer))} → ${esc(mNameFull(e.recipient))} ✓</span><b>${money(e.amount, e.currency)}</b></div>`).join('')}
        ${!tr.length && !done.length ? '<p>Brak przelewów.</p>' : ''}
      </div>
      <div><h2>Na co poszły pieniądze</h2>
        ${catList.map(([k, v]) => `<div class="rep-cat"><span>${esc(k)}</span><i><em style="width:${(v / maxCat) * 100}%"></em></i><b>${fmt(v)} zł</b></div>`).join('')}
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

const actions = {
  join: () => joinCode($('#join-code').value),
  forget: (el) => {
    ls.set('history', ls.get('history', []).filter((x) => x.code !== el.dataset.code));
    go('#/');
  },
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
    try { const r = await fetchNbp(n.currency); rate = r.rate; rateDate = r.date; rateSource = 'NBP'; } catch (e) { /* zostaje domyślny */ }
    try {
      const code = await store.createTrip({
        title: n.title, country: n.country, currency: n.currency, rate, rateDate, rateSource,
        status: 'open', members: n.members, categories: DEFAULT_CATEGORIES,
        cover: { type: 'place', query: (n.place || '').trim() }
      });
      if (n.meId) ls.set('me:' + code, n.meId);
      S.newTrip = null;
      go('#/t/' + code + '/people');
      toast(rateSource === 'NBP' ? `Gotowe! Kurs NBP: ${fmtRate(rate)} zł` : 'Gotowe! Sprawdź kurs w ustawieniach', 3500);
    } catch (e) { el.disabled = false; el.textContent = 'Utwórz wyjazd'; fail(e); }
  },
  'pick-me': (el) => { ls.set('me:' + S.trip.id, el.dataset.id); S.skipMe = false; render(); },
  'skip-me': () => { S.skipMe = true; render(); },
  filter: (el) => { S.filter = el.dataset.v; render(); },
  'settle-mode': (el) => { S.settleMode = el.dataset.v; render(); },
  add: () => openAdd(),
  'add-cur': (el) => openAdd(el.dataset.v === 'PLN' ? 'PLN' : 'foreign'),
  'cover-auto': () => setCover({ type: 'place', query: ($('#cv-place')?.value || '').trim() }),
  'cover-place': () => {
    const q = ($('#cv-place')?.value || '').trim();
    setCover(q ? { type: 'place', query: q } : { type: 'place', query: '' });
    toast(q ? 'Szukam zdjęcia: ' + q : 'Typowe zdjęcie kraju');
  },
  'cover-art': () => setCover({ type: 'art' }),
  'sheet-payer': (el) => { readSheetInputs(); S.sheet.payer = el.dataset.id; if (S.sheet.recipient === el.dataset.id) S.sheet.recipient = null; renderSheet(); },
  'sheet-recipient': (el) => { readSheetInputs(); S.sheet.recipient = el.dataset.id; renderSheet(); },
  'sheet-split': (el) => {
    readSheetInputs();
    S.sheet.split = el.dataset.v;
    if (el.dataset.v === 'all') S.sheet.among = S.trip.members.map((m) => m.id);
    renderSheet();
  },
  edit: (el) => openEdit(el.dataset.id),
  'copy-amt': (el) => copyText(el.dataset.v, 'Skopiowano kwotę ' + el.dataset.v),
  'mark-paid': (el) => {
    const { from, to, cur } = el.dataset, amt = Number(el.dataset.amt);
    if (!confirm(`${mNameFull(from)} oddał(a) ${money(amt, cur)} dla ${mNameFull(to)}?`)) return;
    store.addExpense(S.trip.id, {
      id: newId(), type: 'transfer', payer: from, recipient: to, amount: amt, currency: cur,
      desc: 'Zwrot', note: '', date: todayISO(), createdAt: Date.now(), createdBy: S.uid, splitAmong: null, category: null
    }).catch(fail);
    toast('Oznaczono jako oddane');
  },
  'undo-paid': (el) => { if (confirm('Cofnąć oznaczenie przelewu?')) store.deleteExpense(S.trip.id, el.dataset.id).catch(fail); },
  pdf: () => makePdf(false),
  'pdf-share': () => makePdf(true),
  'close-trip': (el) => {
    const rem = Number(el.dataset.remaining);
    const msg = rem ? `Zostały ${rem} nieoddane przelewy. Zakończyć wyjazd mimo to?\n\nPo zakończeniu nikt nie dodaje już wydatków, a kurs zostaje zamrożony.` : 'Zakończyć wyjazd? Nikt nie doda już wydatków, a kurs zostanie zamrożony.';
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
    if (S.trip.members.length <= 2) { toast('Na wyjeździe muszą zostać co najmniej 2 pozycje'); return; }
    if (!confirm(`Usunąć „${m.name}” z wyjazdu?`)) return;
    store.updateTrip(S.trip.id, { members: S.trip.members.filter((x) => x.id !== m.id) }).catch(fail);
  },
  nbp: async (el) => {
    const cur = $('#st-currency').value;
    el.disabled = true;
    try {
      const r = await fetchNbp(cur);
      $('#st-rate').value = r.rate;
      S.nbpDate = r.date;
      toast(`Kurs NBP z ${r.date}: ${fmtRate(r.rate)} zł. Zapisz ustawienia.`, 3500);
    } catch (e) { toast('Nie udało się pobrać kursu NBP – wpisz ręcznie'); }
    el.disabled = false;
  },
  'save-settings': () => {
    const t = S.trip;
    const currency = $('#st-currency').value;
    const used = new Set(S.expenses.filter((e) => e.currency !== 'PLN').map((e) => e.currency));
    if (currency !== t.currency && used.size && !used.has(currency)) { toast(`Są już wydatki w ${[...used].join(', ')} – nie można zmienić waluty`, 4000); return; }
    const patch = {
      title: ($('#st-title').value || '').trim() || t.title,
      country: $('#st-country').value, currency,
      categories: $('#st-cats').value.split('\n').map((x) => x.trim()).filter(Boolean)
    };
    if (isOpen()) {
      const rate = parseFloat(String($('#st-rate').value).replace(',', '.'));
      if (!(rate > 0)) { toast('Podaj poprawny kurs'); return; }
      if (rate !== t.rate) { patch.rate = rate; patch.rateDate = S.nbpDate || todayISO(); patch.rateSource = S.nbpDate ? 'NBP' : 'ręcznie'; }
    }
    S.nbpDate = null;
    store.updateTrip(t.id, patch).then(() => toast('Zapisano ustawienia')).catch(fail);
  },
  'show-admin-key': async () => {
    try { S.adminKey = await store.getAdminKey(S.trip.id); S.showAdminKey = true; render(); } catch (e) { fail(e); }
  },
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
    try {
      stopWatching();
      await store.deleteTrip(code);
      ls.set('history', ls.get('history', []).filter((x) => x.code !== code));
      go('#/');
      toast('Wyjazd usunięty');
    } catch (e) { fail(e); watch(code); }
  },
  // arkusz
  'sheet-close': () => closeSheet(),
  'sheet-details': () => { readSheetInputs(); S.sheet.details = !S.sheet.details; renderSheet(); },
  'sheet-cur': (el) => { S.sheet.currency = el.dataset.v; readSheetInputs(); renderSheet(); },
  'sheet-cat': (el) => { readSheetInputs(); S.sheet.category = S.sheet.category === el.dataset.v ? null : el.dataset.v; renderSheet(); },
  'sheet-among': (el) => {
    readSheetInputs();
    const s = S.sheet, id = el.dataset.id;
    s.among = s.among.includes(id) ? s.among.filter((x) => x !== id) : [...s.among, id];
    renderSheet();
  },
  key: (el) => keypress(el.dataset.k),
  'sheet-save': () => saveSheet(),
  'sheet-delete': () => {
    if (!confirm('Usunąć ten wydatek u wszystkich?')) return;
    store.deleteExpense(S.trip.id, S.sheet.id).catch(fail);
    closeSheet();
    toast('Usunięto');
  }
};

function setCover(cover) {
  store.updateTrip(S.trip.id, { cover }).then(() => toast('Zmieniono okładkę')).catch(fail);
}

const changes = {
  'nt-place': (el) => { S.newTrip.place = el.value; },
  'cover-file': async (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    toast('Przygotowuję zdjęcie…');
    try { const data = await fileToCoverData(f); setCover({ type: 'photo', data }); } catch (e) { fail(e); }
  },
  'nt-title': (el) => { S.newTrip.title = el.value; },
  'nt-country': (el) => { S.newTrip.country = el.value; S.newTrip.currency = countryCurrency(el.value); S.newTrip.title = $('#nt-title').value; render(); },
  'nt-currency': (el) => { S.newTrip.currency = el.value; },
  'sh-payer': (el) => { readSheetInputs(); S.sheet.payer = el.value; if (S.sheet.recipient === el.value) S.sheet.recipient = null; renderSheet(); },
  'sh-recipient': (el) => { S.sheet.recipient = el.value || null; },
  'sh-split': (el) => {
    readSheetInputs();
    S.sheet.split = el.value;
    if (el.value === 'all') S.sheet.among = S.trip.members.map((m) => m.id);
    renderSheet();
  },
  'sh-desc': (el) => { S.sheet.desc = el.value; },
  'sh-note': (el) => { S.sheet.note = el.value; },
  'sh-date': (el) => { readSheetInputs(); S.sheet.date = el.value || todayISO(); renderSheet(); }
};

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
document.addEventListener('keydown', (ev) => {
  const t = ev.target;
  if (ev.key === 'Enter' && t.dataset && t.dataset.enter) { ev.preventDefault(); actions[t.dataset.enter](t); return; }
  if (ev.key === 'Enter' && t.id === 'join-code') { ev.preventDefault(); actions.join(); return; }
  if (S.sheet && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
    if (/^[0-9]$/.test(ev.key)) { keypress(ev.key); ev.preventDefault(); }
    else if (ev.key === ',' || ev.key === '.') { keypress(','); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { keypress('del'); ev.preventDefault(); }
    else if (ev.key === 'Enter') { saveSheet(); ev.preventDefault(); }
    else if (ev.key === 'Escape') closeSheet();
  }
});
window.addEventListener('online', () => { S.online = true; render(); });
window.addEventListener('offline', () => { S.online = false; render(); });
window.addEventListener('hashchange', onRoute);

// ============================================================ start
async function boot() {
  $('#app').innerHTML = '<main class="screen center-screen"><div class="spinner"></div></main>';
  try {
    S.uid = await store.init();
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<main class="screen center-screen"><h2>Brak połączenia z Firebase</h2><p class="muted">${esc(e.code || e.message)}</p><p class="muted small">Sprawdź konfigurację w js/config.js i czy w Firebase włączone jest logowanie anonimowe.</p><button class="btn primary" onclick="location.reload()">Spróbuj ponownie</button></main>`;
    return;
  }
  const params = new URLSearchParams(location.search);
  const join = params.get('join');
  const add = params.get('add');
  if (join || add) history.replaceState(null, '', location.pathname + location.hash);
  if (join) { await joinCode(join); onRoute(); return; }
  if (add) {
    const last = ls.get('lastTrip', null);
    if (last) { S.pendingAdd = add === 'PLN' ? 'PLN' : 'foreign'; location.hash = '#/t/' + last; }
  }
  onRoute();
  handleWidgetAction();
}
boot();

if (!isNative && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Przyciski „+ €” / „+ zł” z widżetu
async function handleWidgetAction() {
  const a = await consumeWidgetAction();
  if (!a) return;
  const last = ls.get('lastTrip', null);
  if (!last) { toast('Najpierw otwórz albo utwórz wyjazd'); return; }
  const cur = a === 'PLN' ? 'PLN' : 'foreign';
  if (S.route.name === 'trip' && S.route.code === last && S.trip) { openAdd(cur); return; }
  S.pendingAdd = cur;
  go('#/t/' + last);
}
onResume(handleWidgetAction);

// Systemowy przycisk Wstecz na Androidzie
onBackButton(() => {
  if (S.sheet) { closeSheet(); return; }
  const r = S.route;
  if (r.name === 'trip' && r.tab !== 'list' && S.trip) { go('#/t/' + S.trip.id); return; }
  if (r.name !== 'home') { go('#/'); return; }
  exitApp();
});

// Sprawdzenie nowej wersji APK (raz na 6 godzin)
async function checkUpdate() {
  if (!isNative || !APP_BUILD) return;
  const lastCheck = ls.get('updCheck', 0);
  let tag = ls.get('updTag', null);
  if (Date.now() - lastCheck > 6 * 3600e3) {
    try {
      const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (r.ok) { tag = (await r.json()).tag_name; ls.set('updTag', tag); ls.set('updCheck', Date.now()); }
    } catch (e) {}
  }
  const n = Number(String(tag || '').split('.').pop());
  if (n > APP_BUILD) { S.update = String(tag).replace(/^v/, ''); render(); }
}
checkUpdate();
