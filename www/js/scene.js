// Animowana scena podróży: ekran powitalny i krótka animacja startowa.

const PLANE = '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z" fill="#fff"/>';
const CLOUD = '<path d="M20 40h80a18 18 0 0 0 0-36 26 26 0 0 0-48 4 16 16 0 0 0-32 32Z" fill="#fff"/>';

/** Tło: gwiazdy, słońce, góry, jezioro z tratwą, chmury i lecący samolot. */
export function sceneHtml() {
  const stars = [[10, 7], [31, 13], [77, 8], [90, 18], [18, 23], [55, 5], [66, 15], [42, 20]]
    .map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:-${(i * 0.4).toFixed(1)}s"></i>`).join('');
  return `
  <div class="scene" aria-hidden="true">
    <div class="sc-stars">${stars}</div>
    <svg class="sc-land" viewBox="0 0 390 420" preserveAspectRatio="xMidYMax slice">
      <defs>
        <radialGradient id="sc-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4D6"/><stop offset=".45" stop-color="#FFD58A" stop-opacity=".9"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient>
        <linearGradient id="sc-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DB8F5"/><stop offset="1" stop-color="#2B64C4"/></linearGradient>
        <linearGradient id="sc-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071233" stop-opacity="0"/><stop offset=".5" stop-color="#071233" stop-opacity=".85"/><stop offset="1" stop-color="#071233"/></linearGradient>
      </defs>
      <circle class="sc-sunc" cx="270" cy="190" r="90" fill="url(#sc-sun)"/>
      <path d="M0 190 L40 150 L80 175 L125 120 L165 165 L205 130 L250 175 L295 135 L340 170 L390 140 V420 H0Z" fill="#5C86D1" fill-opacity=".75"/>
      <path d="M0 240 L45 205 L85 220 L120 165 L140 185 L162 135 L184 178 L208 150 L236 202 L285 188 L330 216 L390 195 V420 H0Z" fill="#2E5AAE"/>
      <path d="M120 165 L132 178 L140 185 L128 184ZM162 135 L172 155 L184 178 L168 170ZM208 150 L218 165 L230 190 L214 180Z" fill="#B9D3FA" fill-opacity=".8"/>
      <path d="M0 285 C60 260 130 280 190 270 S310 252 390 275 V420 H0Z" fill="#183C86"/>
      <path d="M0 298 C100 288 290 288 390 298 V332 C290 324 100 324 0 332Z" fill="url(#sc-water)"/>
      <path class="sc-shim" d="M40 308h40M150 314h60M260 306h50M90 322h30M300 320h40" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <g class="sc-raft"><rect x="110" y="304" width="46" height="7" rx="2" fill="#8B5A2B"/><circle cx="120" cy="299" r="4" fill="#F97316"/><circle cx="132" cy="299" r="4" fill="#FACC15"/><circle cx="144" cy="299" r="4" fill="#22C55E"/><path d="M152 292 L158 311" stroke="#5B3A1E" stroke-width="2" stroke-linecap="round"/></g>
      <path d="M0 340 C80 322 170 350 260 332 S360 324 390 340 V420 H0Z" fill="#0B1E4E"/>
      <rect y="150" width="390" height="270" fill="url(#sc-fade)"/>
    </svg>
    <svg class="sc-cloud c1" viewBox="0 0 120 44">${CLOUD}</svg>
    <svg class="sc-cloud c2" viewBox="0 0 120 44">${CLOUD}</svg>
    <svg class="sc-cloud c3" viewBox="0 0 120 44">${CLOUD}</svg>
    <svg class="sc-trail" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
      <path id="sc-route" d="M-40 470 C60 380 170 470 250 360 S380 250 440 230" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-dasharray="6 10" stroke-linecap="round"/>
      <g class="sc-plane"><g transform="rotate(90) translate(-17 -17)"><svg width="34" height="34" viewBox="0 0 24 24">${PLANE}</svg></g>
        <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path="M-40 470 C60 380 170 470 250 360 S380 250 440 230"/>
        <animate attributeName="opacity" dur="7s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;.08;.9;1"/></g>
    </svg>
  </div>`;
}

/** Logo: globus z krążącym samolotem. */
export function globeLogo(size = 120) {
  return `
  <div class="glogo" style="width:${size}px;height:${size}px" aria-hidden="true">
    <svg viewBox="0 0 132 132" fill="none" width="100%" height="100%">
      <circle cx="66" cy="66" r="46" fill="#1D5BD8"/><circle cx="66" cy="66" r="46" stroke="#9CC6FF" stroke-width="2.5"/>
      <ellipse cx="66" cy="66" rx="20" ry="46" stroke="#9CC6FF" stroke-width="2"/>
      <path d="M20 66h92M26 44h80M26 88h80" stroke="#9CC6FF" stroke-width="2"/>
      <path d="M44 40c8 4 10 10 6 16s4 10 10 8 8 6 4 12M80 30c-4 8 2 12 8 12s8 8 4 14" stroke="#4ADE80" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    </svg>
    <div class="gorbit"><svg viewBox="0 0 132 132" fill="none" width="100%" height="100%"><path d="M14 74 A54 54 0 0 1 104 26" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 8"/></svg>
      <svg class="gplane" viewBox="0 0 24 24">${PLANE}</svg></div>
  </div>`;
}

/** Krótka animacja przy uruchomieniu aplikacji. Zwraca funkcję, która ją chowa. */
export function showIntro() {
  if (sessionStorage.getItem('introShown')) return () => {};
  sessionStorage.setItem('introShown', '1');
  const el = document.createElement('div');
  el.id = 'intro';
  el.innerHTML = `${sceneHtml()}<div class="intro-in">${globeLogo(128)}<h1>Wy<span>jazdy</span></h1><p>Wspólne wyjazdy, proste rozliczenia</p></div>`;
  document.body.appendChild(el);
  const started = Date.now();
  let done = false;
  const hide = () => {
    if (done) return;
    done = true;
    const wait = Math.max(0, 2300 - (Date.now() - started));
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, wait);
  };
  el.addEventListener('click', () => { el.classList.add('out'); setTimeout(() => el.remove(), 600); done = true; });
  setTimeout(hide, 6000);
  return hide;
}
