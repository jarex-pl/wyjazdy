
// ============================================================ akcje
const actions = {
  join: () => joinCode($('#join-code')?.value),
  'join-open': () => { S.joinOpen = true; render(); $('#join-code')?.focus(); },
  forget: (el) => { ls.set('history', ls.get('history', []).filter((x) => x.code !== el.dataset.code)); go('#/'); },
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
      toast(rateSource === 'NBP' ? `Gotowe! Kurs NBP: ${fmtRate(rate)} zł` : 'Gotowe! Sprawdź kurs w ustawieniach wyjazdu', 3500);
    } catch (e) { el.disabled = false; el.textContent = 'Utwórz wyjazd'; fail(e); }
  },
  'pick-me': (el) => { ls.set('me:' + S.trip.id, el.dataset.id); S.skipMe = false; render(); },
  'skip-me': () => { S.skipMe = true; render(); },
  filter: (el) => { S.filter = el.dataset.v; render(); },
  'settle-mode': (el) => { S.settleMode = el.dataset.v === 'pln' ? 'pln' : el.dataset.v; render(); },
  add: () => openAdd(),
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
    const lines = [`Rozliczenie: ${t.title}`, `Koszt wyjazdu: ${fmt(b.total)} zł (na osobę ${fmt(b.total / (totalWeight(t) || 1))} zł)`, ''];
    if (tr.length) { lines.push('Kto komu oddaje:'); tr.forEach((x) => lines.push(`• ${mNameFull(x.from)} → ${mNameFull(x.to)}: ${money(x.amount, 'PLN')}`)); }
    else lines.push('Wszyscy są rozliczeni ✓');
    const text = lines.join('\n');
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
    try { const r = await fetchNbp(cur); $('#st-rate').value = r.rate; S.nbpDate = r.date; toast(`Kurs NBP z ${r.date}: ${fmtRate(r.rate)} zł. Zapisz ustawienia.`, 3500); }
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
    try { stopWatching(); await store.deleteTrip(code); ls.set('history', ls.get('history', []).filter((x) => x.code !== code)); go('#/'); toast('Wyjazd usunięty'); }
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
  if (S.add && !S.picker && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
    if (/^[0-9]$/.test(ev.key)) { keypress(ev.key); ev.preventDefault(); }
    else if (ev.key === ',' || ev.key === '.') { keypress(','); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { keypress('del'); ev.preventDefault(); }
    else if (ev.key === 'Enter') { saveAdd(); ev.preventDefault(); }
    else if (ev.key === 'Escape') closeAdd();
  }
});
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
  if (r.name === 'trip' && dx > 0) go(r.sub ? '#/t/' + r.code : '#/');
}, { passive: true });

// ============================================================ start
async function boot() {
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
  if (join) { await joinCode(join); onRoute(); return; }
  if (add) { const last = ls.get('lastTrip', null); if (last) { S.pendingAdd = add === 'PLN' ? 'PLN' : 'foreign'; location.hash = '#/t/' + last; } }
  onRoute();
  handleWidgetAction();
}
boot();

if (!isNative && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

async function handleWidgetAction() {
  const a = await consumeWidgetAction();
  if (!a) return;
  const last = ls.get('lastTrip', null);
  if (!last) { toast('Najpierw otwórz albo utwórz wyjazd'); return; }
  const cur = a === 'PLN' ? 'PLN' : 'foreign';
  if (S.route.code === last && S.trip) { openAdd(cur); return; }
  S.pendingAdd = cur;
  go('#/t/' + last);
}
onResume(handleWidgetAction);
onBackButton(() => {
  if (S.picker) { closePicker(); renderAdd(); return; }
  if (S.add) { closeAdd(); return; }
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
