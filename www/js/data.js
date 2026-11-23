// Kraje, waluty, kategorie.

export const COUNTRIES = [
  ['it', 'Włochy', 'EUR'], ['hr', 'Chorwacja', 'EUR'], ['es', 'Hiszpania', 'EUR'], ['gr', 'Grecja', 'EUR'],
  ['pl', 'Polska', 'PLN'], ['eg', 'Egipt', 'USD'], ['tr', 'Turcja', 'TRY'],
  ['al', 'Albania', 'EUR'], ['at', 'Austria', 'EUR'], ['be', 'Belgia', 'EUR'], ['bg', 'Bułgaria', 'EUR'],
  ['cy', 'Cypr', 'EUR'], ['me', 'Czarnogóra', 'EUR'], ['cz', 'Czechy', 'CZK'], ['dk', 'Dania', 'DKK'],
  ['do', 'Dominikana', 'USD'], ['ee', 'Estonia', 'EUR'], ['eu', 'Europa (inne)', 'EUR'], ['fi', 'Finlandia', 'EUR'],
  ['fr', 'Francja', 'EUR'], ['ge', 'Gruzja', 'USD'], ['nl', 'Holandia', 'EUR'], ['id', 'Indonezja (Bali)', 'IDR'],
  ['ie', 'Irlandia', 'EUR'], ['is', 'Islandia', 'ISK'], ['jp', 'Japonia', 'JPY'], ['lt', 'Litwa', 'EUR'],
  ['lv', 'Łotwa', 'EUR'], ['mt', 'Malta', 'EUR'], ['ma', 'Maroko', 'EUR'], ['mx', 'Meksyk', 'MXN'],
  ['de', 'Niemcy', 'EUR'], ['no', 'Norwegia', 'NOK'], ['pt', 'Portugalia', 'EUR'], ['ro', 'Rumunia', 'RON'],
  ['sk', 'Słowacja', 'EUR'], ['si', 'Słowenia', 'EUR'], ['us', 'Stany Zjednoczone', 'USD'], ['ch', 'Szwajcaria', 'CHF'],
  ['se', 'Szwecja', 'SEK'], ['th', 'Tajlandia', 'THB'], ['tn', 'Tunezja', 'EUR'], ['hu', 'Węgry', 'HUF'],
  ['gb', 'Wielka Brytania', 'GBP'], ['vn', 'Wietnam', 'USD'], ['ae', 'Zjedn. Emiraty Arabskie', 'USD']
];

// Waluty z tabeli A NBP (kurs aktualizowany codziennie).
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF', 'DKK', 'SEK', 'NOK', 'ISK', 'RON', 'TRY', 'JPY', 'THB', 'IDR', 'MXN', 'PLN'];

export const DEFAULT_RATES = { EUR: 4.25, USD: 3.65, GBP: 4.85, CHF: 4.55, CZK: 0.17, HUF: 0.011, DKK: 0.57, SEK: 0.38, NOK: 0.36, ISK: 0.03, RON: 0.84, TRY: 0.09, JPY: 0.024, THB: 0.11, IDR: 0.00022, MXN: 0.2, PLN: 1 };

const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', PLN: 'zł' };
export const sym = (c) => SYMBOLS[c] || c;

export const countryName = (code) => (COUNTRIES.find((c) => c[0] === code) || [code, code])[1];
export const countryCurrency = (code) => (COUNTRIES.find((c) => c[0] === code) || [0, 0, 'EUR'])[2];

export const DEFAULT_CATEGORIES = ['Jedzenie', 'Kawa', 'Zakupy', 'Paliwo', 'Nocleg', 'Bilety', 'Atrakcje', 'Restauracja', 'Transport', 'Autostrada', 'Parking', 'Inne'];
// Dodatkowe kategorie – zawsze do wyboru w „Więcej…”, także w starszych wyjazdach.
export const EXTRA_CATEGORIES = ['Bar / Alkohol', 'Lody / Desery', 'Plaża', 'Pamiątki', 'Apteka', 'Taxi', 'Pociąg', 'Prom / Statek', 'Bilety lotnicze',
  'Wypożyczalnia', 'Muzeum', 'Basen / SPA', 'Napiwek', 'Internet / SIM', 'Wycieczka', 'Pralnia', 'Kantor / Opłaty'];
export const allCategories = (t) => {
  const base = t && t.categories && t.categories.length ? t.categories : DEFAULT_CATEGORIES;
  const seen = new Set(base.map((c) => c.toLowerCase()));
  const extra = EXTRA_CATEGORIES.filter((c) => !seen.has(c.toLowerCase()));
  const inne = base.filter((c) => /^inne$/i.test(c));
  return [...base.filter((c) => !/^inne$/i.test(c)), ...extra, ...(inne.length ? inne : ['Inne'])];
};

// Ikony kategorii (ścieżki SVG 24×24, obrys) i żywe kolory (ikony, wykres).
const ICONS = {
  food: ['M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 2-3 5-3 8h4v10', '#FF8A3D'],
  coffee: ['M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3', '#C7834B'],
  fuel: ['M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3', '#22B98A'],
  car: ['M5 17h14l-1.5-6.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5zM8 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', '#2F80FF'],
  parking: ['M5 3h14v18H5zM10 17V7h3a3 3 0 0 1 0 6h-3', '#5B8CFF'],
  cart: ['M3 4h2l2.4 11h10.2L20 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', '#A06BFF'],
  bed: ['M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5M7 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', '#16B5C9'],
  plane: ['M10.5 13.5L3 11l1.5-1.5 8 .5 4-4a2 2 0 0 1 3 3l-4 4 .5 8L14.5 22l-2.5-7.5-3 3V20l-1.5 1-1-3.5L3 16.5 4 15h2.5z', '#2F80FF'],
  ticket: ['M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3zM14 6v12', '#FF5C8A'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', '#FFB547'],
  bus: ['M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11M5 11h14M7 21v-4M17 21v-4M8 14h.01M16 14h.01', '#14B8A6'],
  loan: ['M5 12h14M13 6l6 6-6 6', '#E8950C'],
  transfer: ['M5 12.5l4.5 4.5L19 7.5', '#0E9F6E'],
  drink: ['M8 3h8l-.6 5.2a3.4 3.4 0 0 1-6.8 0zM12 11.6V20M8 21h8', '#A855F7'],
  icecream: ['M8 10a4 4 0 0 1 8 0M7.5 10h9L12 21z', '#F472B6'],
  beach: ['M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 0 4 0M12 3v-.5', '#06B6D4'],
  gift: ['M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-1.5-3-5-3-5 0M12 7c1.5-3 5-3 5 0', '#E11D48'],
  health: ['M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z', '#10B981'],
  taxi: ['M5 17h14v-4l-2-5H7l-2 5zM9 8l1-3h4l1 3M7.5 17v2M16.5 17v2M7.5 13h.01M16.5 13h.01', '#EAB308'],
  train: ['M7 3h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 11h14M9 14.5h.01M15 14.5h.01M8 21l2-3M16 21l-2-3', '#0EA5E9'],
  ship: ['M3 16l2 5h14l2-5zM5 16v-5h14v5M8 11V7h8v4M12 3v4', '#2563EB'],
  bike: ['M2 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M15 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M5.5 17.5l4-8h5l4 8M9.5 9.5L8 6H6M14.5 9.5l-3 8', '#65A30D'],
  museum: ['M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8', '#B45309'],
  spa: ['M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M8 9V4M16 9V4M8 6h8', '#0891B2'],
  tip: ['M5 8a7 3 0 1 0 14 0a7 3 0 1 0 -14 0M5 8v4c0 1.7 3.1 3 7 3s7-1.3 7-3V8M5 12v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4', '#D97706'],
  phone: ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', '#6366F1'],
  laundry: ['M5 3h14v18H5zM5 7h14M12 15a3.5 3.5 0 1 0 0-.01M8 5h.01', '#14B8A6'],
  money: ['M3 6h18v12H3zM12 12a2.5 2.5 0 1 0 0-.01M6 9v6M18 9v6', '#16A34A'],
  trip: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7v5M9.5 9.5h5', '#F43F5E'],
  other: ['M4 7h16v12H4zM8 7V5h8v2M4 12h16', '#8899BB']
};
export const ICON_KEYS = Object.keys(ICONS);
export const iconColor = (key) => (ICONS[key] || ICONS.other)[1];

export function iconKey(e) {
  if (e.type === 'loan') return 'loan';
  if (e.type === 'transfer') return 'transfer';
  const t = ((e.category || '') + ' ' + (e.desc || '')).toLowerCase();
  if (/lody|lod |lodów|deser|gelat|ciast|słodk|slodk/.test(t)) return 'icecream';
  if (/alkohol|piwo|piw[ao]|wino|drink|\bbar\b|pub|aperol|koktajl/.test(t)) return 'drink';
  if (/kaw|caf|espresso|cappucc/.test(t)) return 'coffee';
  if (/bilety lotnicze|lot\b|loty|samolot|lotnisk|ryanair|wizz/.test(t)) return 'plane';
  if (/nocleg|hotel|apartam|airbnb|booking|kemping|camping|pokój|pokoje|willi/.test(t)) return 'bed';
  if (/taxi|taksówk|taksowk|uber|bolt/.test(t)) return 'taxi';
  if (/pociąg|pociag|\bkolej\b|train|metro/.test(t)) return 'train';
  if (/prom|statek|rejs|łód|lod[zź]|tratw|kajak/.test(t)) return 'ship';
  if (/plaż|plaz|leżak|lezak|parasol/.test(t)) return 'beach';
  if (/pamiąt|pamiat|souvenir|prezent|magnes/.test(t)) return 'gift';
  if (/aptek|lekar|lek |leki|zdrow|szpital/.test(t)) return 'health';
  if (/wypożycz|wypozycz|rower|skuter|quad/.test(t)) return 'bike';
  if (/muzeum|zamek|zwiedz|katedr|galeri/.test(t)) return 'museum';
  if (/basen|aquapark|spa\b|spa |termy|sauna|masaż|masaz/.test(t)) return 'spa';
  if (/napiw/.test(t)) return 'tip';
  if (/internet|sim\b|esim|telefon|roaming/.test(t)) return 'phone';
  if (/pralni/.test(t)) return 'laundry';
  if (/kantor|opłat|oplat|prowizj|bankomat/.test(t)) return 'money';
  if (/wycieczk/.test(t)) return 'trip';
  if (/jedz|obiad|kolac|śniad|sniad|resta|pizz|trattor|lunch|food|kebab/.test(t)) return 'food';
  if (/paliw|benz|tank|orlen|diesel/.test(t)) return 'fuel';
  if (/autobus|transport|bus\b/.test(t)) return 'bus';
  if (/autostr|winiet|myto|bramk|auto/.test(t)) return 'car';
  if (/park/.test(t)) return 'parking';
  if (/zakup|sklep|market|biedr|lidl|carref|conad|płaszcz|plaszcz/.test(t)) return 'cart';
  if (/nocleg|hotel|apart|airbnb|booking|kemping|camping|pokój|pokoj|will/.test(t)) return 'bed';
  if (/bilet|wstęp|wstep/.test(t)) return 'ticket';
  if (/atrakc|basen/.test(t)) return 'star';
  return 'other';
}

export function iconSvg(key, size = 20, color) {
  const [d, c] = ICONS[key] || ICONS.other;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color || c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
export const iconBg = (key) => (ICONS[key] || ICONS.other)[1] + '26';
