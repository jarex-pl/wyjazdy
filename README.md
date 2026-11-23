# Wyjazdy – wspólne wydatki na wyjazdach

Aplikacja na Androida (APK) i w przeglądarce. Wydatki w euro i złotówkach, rozliczenie na żywo (Firebase), widżety na ekranie głównym, raport PDF.

## Pobierz na Androida
**https://github.com/jarex-pl/wyjazdy/releases/latest/download/Wyjazdy.apk**

Otwórz link na telefonie → pobierz → zainstaluj (za pierwszym razem telefon poprosi o zgodę na instalację z przeglądarki).

## Jak to jest zbudowane
- `www/` – aplikacja (HTML/CSS/JS). Ten sam folder można wrzucić na Netlify jako wersję przeglądarkową (iPhone).
- `android/` – projekt Android (Capacitor) z widżetami: *Wyjazd ze zdjęciem*, *Bilans wyjazdu*, *Do oddania* i *Szybki wydatek* (styl Granat i 7 innych).
- `firestore.rules` – reguły bezpieczeństwa bazy Firebase.
- `.github/workflows/android.yml` – każda zmiana w gałęzi `main` automatycznie buduje nowy APK i publikuje go w *Releases*.

## Wygląd
Styl **Granat**: animowany ekran startowy (samolot nad górami), lista wyjazdów z prawdziwymi zdjęciami miejsc (Wikipedia / Wikimedia Commons), usuwanie wyjazdu z listy lub całkowicie (menu „⋯” przy wyjeździe).
