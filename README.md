# Wyjazdy – wspólne wydatki na wyjazdach

Aplikacja na Androida (APK) i w przeglądarce. Wydatki w euro i złotówkach, rozliczenie na żywo (Firebase), widżety na ekranie głównym, raport PDF.

## Pobierz na Androida
**https://github.com/jarex-pl/wyjazdy/releases/latest/download/Wyjazdy.apk**

Otwórz link na telefonie → pobierz → zainstaluj (za pierwszym razem telefon poprosi o zgodę na instalację z przeglądarki).

## Jak to jest zbudowane
- `www/` – aplikacja (HTML/CSS/JS). Ten sam folder można wrzucić na Netlify jako wersję przeglądarkową (iPhone).
- `android/` – projekt Android (Capacitor) z widżetami: *Bilans wyjazdu* i *Szybki wydatek*.
- `firestore.rules` – reguły bezpieczeństwa bazy Firebase.
- `.github/workflows/android.yml` – każda zmiana w gałęzi `main` automatycznie buduje nowy APK i publikuje go w *Releases*.
