// Okładki wyjazdów: prawdziwe zdjęcia (Wikipedia / Wikimedia Commons), własne zdjęcie albo ilustracja.

// Domyślne miejsca na zdjęcie dla kraju (tytuły artykułów angielskiej Wikipedii, kilka na wypadek braku zdjęcia).
export const PLACES = {
  it: ['Positano', 'Manarola', 'Florence'], hr: ['Dubrovnik', 'Hvar (town)', 'Plitvice Lakes National Park'],
  es: ['Ronda', 'Calp', 'Seville'], gr: ['Oia, Greece', 'Navagio', 'Santorini'], pl: ['Morskie Oko', 'Zakopane', 'Gdańsk'],
  eg: ['Giza pyramid complex', 'Hurghada'], tr: ['Cappadocia', 'Pamukkale'], al: ['Ksamil', 'Gjirokastër'],
  at: ['Hallstatt', 'Salzburg'], be: ['Bruges'], bg: ['Nesebar', 'Sozopol'], cy: ['Ayia Napa', 'Paphos'],
  me: ['Kotor', 'Budva'], cz: ['Charles Bridge', 'Český Krumlov'], dk: ['Nyhavn'], do: ['Punta Cana'],
  ee: ['Tallinn Old Town'], eu: ['Lake Bled'], fi: ['Helsinki Cathedral'], fr: ['Mont-Saint-Michel', 'Eiffel Tower'],
  ge: ['Gergeti Trinity Church', 'Tbilisi'], nl: ['Kinderdijk'], id: ['Tanah Lot', 'Bali'], ie: ['Cliffs of Moher'],
  is: ['Skógafoss', 'Seljalandsfoss'], jp: ['Fushimi Inari-taisha', 'Mount Fuji'], lt: ['Trakai Island Castle'],
  lv: ['Riga'], mt: ['Valletta'], ma: ['Chefchaouen'], mx: ['Tulum'], de: ['Neuschwanstein Castle'],
  no: ['Geirangerfjord'], pt: ['Ponta da Piedade', 'Lisbon'], ro: ['Bran Castle'], sk: ['High Tatras'],
  si: ['Lake Bled'], us: ['Golden Gate Bridge'], ch: ['Matterhorn'], se: ['Gamla stan'], th: ['Phi Phi Islands'],
  tn: ['Sidi Bou Said'], hu: ['Hungarian Parliament Building'], gb: ['Tower Bridge'], vn: ['Hạ Long Bay'],
  ae: ['Burj Khalifa']
};

const CACHE_DAYS = 30;
const mem = new Map();

function readCache(key) {
  try {
    const v = JSON.parse(localStorage.getItem('cover:' + key));
    if (v && Date.now() - v.at < CACHE_DAYS * 864e5) return v;
  } catch (e) {}
  return null;
}
function writeCache(key, v) {
  try { localStorage.setItem('cover:' + key, JSON.stringify({ ...v, at: Date.now() })); } catch (e) {}
}

const goodImage = (url) => /\.(jpe?g|webp)(\/|$|\?)/i.test(url) || /\.(jpe?g|webp)\/\d+px-/i.test(url);

async function wikiImage(lang, title, size) {
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1` +
    `&prop=pageimages&piprop=thumbnail|name&pithumbsize=${size}&titles=${encodeURIComponent(title)}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const j = await r.json();
  const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
  for (const p of pages) {
    const src = p.thumbnail && p.thumbnail.source;
    if (src && goodImage(src) && (p.thumbnail.width || 0) >= 400) {
      return { src, file: p.pageimage || '', title: p.title, lang };
    }
  }
  return null;
}

/** Zwraca {src, file, title} albo null. query = nazwa miejsca wpisana przez użytkownika. */
export async function findPhoto(query, { size = 1280, langs = ['pl', 'en'] } = {}) {
  const key = langs.join(',') + '|' + query + '|' + size;
  if (mem.has(key)) return mem.get(key);
  const cached = readCache(key);
  if (cached) { mem.set(key, cached.v || null); return cached.v || null; }
  let res = null;
  for (const lang of langs) {
    try { res = await wikiImage(lang, query, size); } catch (e) { return null; } // offline – nie zapisuj
    if (res) break;
  }
  writeCache(key, { v: res });
  mem.set(key, res);
  return res;
}

/** Zdjęcie okładki dla wyjazdu (własne → wpisane miejsce → domyślne dla kraju). */
export async function tripPhoto(trip, size = 1280) {
  const c = trip.cover || {};
  if (c.type === 'photo' && c.data) return { src: c.data, own: true };
  if (c.type === 'art') return null;
  if (c.type === 'place' && c.query) {
    const r = await findPhoto(c.query, { size });
    if (r) return r;
  }
  for (const place of PLACES[trip.country] || PLACES.eu) {
    const r = await findPhoto(place, { size, langs: ['en'] });
    if (r) return r;
  }
  return null;
}

export function creditHtml(p, esc) {
  if (!p || p.own) return '';
  const href = p.file ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.file)}` : `https://${p.lang || 'en'}.wikipedia.org/wiki/${encodeURIComponent(p.title || '')}`;
  return `<a class="credit" href="${href}" target="_blank" rel="noopener">Zdjęcie: ${esc(p.title || 'Wikimedia')} · Wikimedia Commons</a>`;
}

/** Zmniejsza zdjęcie z galerii do JPEG (do zapisania w bazie). */
export function fileToCoverData(file, maxW = 1200, maxH = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let q = 0.78, data = cv.toDataURL('image/jpeg', q);
      while (data.length > 600000 && q > 0.4) { q -= 0.1; data = cv.toDataURL('image/jpeg', q); }
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie udało się wczytać zdjęcia')); };
    img.src = url;
  });
}

// ---------------------------------------------------------------- ilustracja zapasowa
const ART = {
  warm: { sky1: '#FFC98B', sky2: '#FF8E66', sun: '#FFF0D2', hill1: '#E0744F', hill2: '#7E8F45', tree: '#3F5A2A', sea: '#2F7FA6' },
  sea: { sky1: '#8FD3FF', sky2: '#D2F0FF', sun: '#FFE27A', hill1: '#9BC7D9', hill2: '#E9D7A8', tree: '#5D8A5A', sea: '#1C6FB8' },
  north: { sky1: '#9DB7D9', sky2: '#E6EEF7', sun: '#FFFFFF', hill1: '#7F96B5', hill2: '#4E6E5D', tree: '#2F4A3A', sea: '#3D6E8F' },
  desert: { sky1: '#FFB86B', sky2: '#FFE2B0', sun: '#FFF6E0', hill1: '#E3A15C', hill2: '#C98A47', tree: '#7A5A2E', sea: '#2A8FA8' },
  tropic: { sky1: '#5FD0E8', sky2: '#C9F2EC', sun: '#FFF3A6', hill1: '#2F9E7A', hill2: '#F2DFA6', tree: '#1F6B4A', sea: '#0E8DAE' }
};
const REGION = { eg: 'desert', ae: 'desert', ma: 'desert', tn: 'desert', tr: 'warm', it: 'warm', es: 'warm', pt: 'warm', fr: 'warm',
  gr: 'sea', hr: 'sea', me: 'sea', al: 'sea', cy: 'sea', mt: 'sea', bg: 'sea', th: 'tropic', id: 'tropic', do: 'tropic', mx: 'tropic', vn: 'tropic' };

export function artSvg(country, dark = false) {
  const p = ART[REGION[country] || 'north'];
  const sky1 = dark ? '#2C3E73' : p.sky1, sky2 = dark ? '#8D5B6A' : p.sky2;
  return `<svg class="art" viewBox="0 0 390 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="sky-${country}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
    <rect width="390" height="260" fill="url(#sky-${country})"/>
    <circle cx="300" cy="96" r="44" fill="${p.sun}" opacity="${dark ? 0.85 : 1}"/>
    <path d="M0 170 C60 142 120 150 185 164 S305 148 390 158 V260 H0Z" fill="${p.hill1}"/>
    <path d="M0 192 C80 174 150 180 222 194 S340 184 390 190 V260 H0Z" fill="${p.hill2}"/>
    <path d="M58 196 C52 170 54 142 60 120 C66 142 68 170 62 196Z" fill="${p.tree}"/>
    <path d="M76 198 C71 178 72 156 77 140 C82 156 83 178 79 198Z" fill="${p.tree}"/>
    <rect y="214" width="390" height="46" fill="${p.sea}"/>
    <path d="M20 228 q12 -6 24 0 t24 0 M140 236 q12 -6 24 0 t24 0 M260 226 q12 -6 24 0 t24 0" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}
