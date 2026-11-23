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

export const DEFAULT_CATEGORIES = ['Jedzenie', 'Restauracja', 'Kawa', 'Zakupy', 'Paliwo', 'Autostrada', 'Parking', 'Nocleg', 'Bilety lotnicze', 'Transport', 'Atrakcje', 'Inne'];

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
  other: ['M4 7h16v12H4zM8 7V5h8v2M4 12h16', '#8899BB']
};
export const ICON_KEYS = Object.keys(ICONS);
export const iconColor = (key) => (ICONS[key] || ICONS.other)[1];

export function iconKey(e) {
  if (e.type === 'loan') return 'loan';
  if (e.type === 'transfer') return 'transfer';
  const t = ((e.category || '') + ' ' + (e.desc || '')).toLowerCase();
  if (/kaw|caf|lod|deser/.test(t)) return 'coffee';
  if (/lot|samolot|lotnisk|ryanair|wizz/.test(t)) return 'plane';
  if (/jedz|obiad|kolac|śniad|sniad|resta|pizz|trattor|bar|lunch|food/.test(t)) return 'food';
  if (/paliw|benz|tank|orlen|diesel/.test(t)) return 'fuel';
  if (/autobus|pociąg|pociag|metro|transport|bus\b|prom|taxi|uber/.test(t)) return 'bus';
  if (/autostr|winiet|myto|bramk|auto/.test(t)) return 'car';
  if (/park/.test(t)) return 'parking';
  if (/zakup|sklep|market|biedr|lidl|carref|conad/.test(t)) return 'cart';
  if (/nocleg|hotel|apart|airbnb|booking|kemping|camping/.test(t)) return 'bed';
  if (/bilet|wstęp|wstep|muzeum/.test(t)) return 'ticket';
  if (/atrakc|wycieczk|rejs|kajak|basen/.test(t)) return 'star';
  return 'other';
}

export function iconSvg(key, size = 20, color) {
  const [d, c] = ICONS[key] || ICONS.other;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color || c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
export const iconBg = (key) => (ICONS[key] || ICONS.other)[1] + '26';
