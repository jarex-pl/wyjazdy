// Obliczenia rozliczeń – czyste funkcje, bez DOM.

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function toPLN(e, rate) {
  return e.currency === 'PLN' ? e.amount : e.amount * rate;
}

export function memberWeight(m) {
  const w = Number(m && m.weight);
  return w > 0 ? w : 1;
}

/**
 * Bilans uczestników.
 * opts.currency = null → wszystko przeliczone na PLN kursem wyjazdu,
 * opts.currency = 'EUR' / 'PLN' → tylko wydatki w tej walucie, bez przeliczania.
 */
export function computeBalances(trip, expenses, opts = {}) {
  const cur = opts.currency || null;
  const members = trip.members || [];
  const ids = new Set(members.map((m) => m.id));
  const weightOf = Object.fromEntries(members.map((m) => [m.id, memberWeight(m)]));
  const balance = {}, paid = {}, share = {};
  members.forEach((m) => { balance[m.id] = 0; paid[m.id] = 0; share[m.id] = 0; });
  let total = 0;

  for (const e of expenses) {
    if (cur && e.currency !== cur) continue;
    const amt = cur ? e.amount : toPLN(e, trip.rate || 1);
    if (!(amt > 0) || !ids.has(e.payer)) continue;
    const type = e.type || 'shared';
    if (type === 'shared' && e.shares && typeof e.shares === 'object') {
      // podział indywidualny: kwoty wpisane ręcznie dla każdej osoby
      const entries = Object.entries(e.shares).filter(([id, v]) => ids.has(id) && Number(v) > 0);
      const sum = entries.reduce((s, [, v]) => s + Number(v), 0);
      if (!sum) continue;
      total += amt;
      paid[e.payer] += amt;
      balance[e.payer] += amt;
      for (const [id, v] of entries) {
        const s = (amt * Number(v)) / sum;
        share[id] += s;
        balance[id] -= s;
      }
    } else if (type === 'shared') {
      let among = (Array.isArray(e.splitAmong) && e.splitAmong.length ? e.splitAmong : members.map((m) => m.id))
        .filter((id) => ids.has(id));
      if (!among.length) among = members.map((m) => m.id);
      const W = among.reduce((s, id) => s + weightOf[id], 0);
      total += amt;
      paid[e.payer] += amt;
      balance[e.payer] += amt;
      for (const id of among) {
        const s = (amt * weightOf[id]) / W;
        share[id] += s;
        balance[id] -= s;
      }
    } else if (type === 'loan' || type === 'transfer') {
      if (!ids.has(e.recipient) || e.recipient === e.payer) continue;
      balance[e.payer] += amt;
      balance[e.recipient] -= amt;
    }
  }
  return { balance, paid, share, total };
}

/** Najmniejsza (zachłanna) liczba przelewów, żeby wszyscy wyszli na zero. */
export function settle(balance) {
  const debtors = [], creditors = [];
  for (const [id, v] of Object.entries(balance)) {
    const r = round2(v);
    if (r < -0.009) debtors.push({ id, amount: -r });
    else if (r > 0.009) creditors.push({ id, amount: r });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const out = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i], c = creditors[j];
    const amt = round2(Math.min(d.amount, c.amount));
    if (amt >= 0.01) out.push({ from: d.id, to: c.id, amount: amt });
    d.amount = round2(d.amount - amt);
    c.amount = round2(c.amount - amt);
    if (d.amount < 0.01) i++;
    if (c.amount < 0.01) j++;
  }
  return out;
}

export function totalWeight(trip) {
  return (trip.members || []).reduce((s, m) => s + memberWeight(m), 0);
}
