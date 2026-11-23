// Integracja z aplikacją Android (Capacitor). W przeglądarce wszystko tu jest bezczynne.
import { Capacitor, registerPlugin, App } from '../vendor/capacitor.js';

export const isNative = Capacitor.isNativePlatform();
const Widget = isNative ? registerPlugin('WidgetBridge') : null;

export function updateWidget(data) {
  if (!Widget) return;
  Widget.update(data).catch(() => {});
}

export function setWidgetLead(code) {
  if (!Widget) return;
  Widget.setCurrent({ code }).catch(() => {});
}

export function removeWidgetTrip(code) {
  if (!Widget) return;
  Widget.remove({ code }).catch(() => {});
}

export function clearWidget() {
  if (!Widget) return;
  Widget.clear().catch(() => {});
}

/** Zwraca 'foreign' / 'PLN', jeśli aplikację otwarto przyciskiem z widżetu. */
export async function consumeWidgetAction() {
  if (!Widget) return null;
  try { return (await Widget.consumeAction()).action || null; } catch (e) { return null; }
}

export function onBackButton(fn) {
  if (!isNative) return;
  App.addListener('backButton', fn);
}

export function onResume(fn) {
  if (isNative) App.addListener('resume', fn);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fn(); });
}

export function exitApp() {
  if (isNative) App.exitApp();
}

/** Kolor ikon paska statusu i nawigacji Androida zgodny z motywem aplikacji. */
export async function setBarsTheme(dark) {
  if (!isNative) return;
  try {
    const { SystemBars, SystemBarsStyle } = await import('../vendor/capacitor.js');
    await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  } catch (e) {}
}
