// Integracja z aplikacją Android (Capacitor). W przeglądarce wszystko tu jest bezczynne.
import { Capacitor, registerPlugin, App } from '../vendor/capacitor.js';

export const isNative = Capacitor.isNativePlatform();
const Widget = isNative ? registerPlugin('WidgetBridge') : null;

export function updateWidget(data) {
  if (!Widget) return;
  Widget.update(data).catch(() => {});
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
