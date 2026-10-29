# Übergabe an die Arbeitsgruppe Cevi.tools

Stand der Vorbereitung für die Übergabe des Kurstrackers. Was die Arbeitsgruppe vor dem Go-live klären und eintragen muss, steht hier. Cevi-DB-Anbindung: [CEVI_DB_INTEGRATION.md](CEVI_DB_INTEGRATION.md).

## Urheber

Der Footer nennt «Built by Robin», ohne Link. Auf jeder Seite ist der Datenschutz-Link erreichbar: in der App, auf den Fehlerseiten (401, 404, 502) und auf der Datenschutzerklärung selbst.

## Vor dem Go-live einzutragen

| Was | Wo | Abhängig von |
| --- | --- | --- |
| Kontaktadresse im Footer | `public/index.html`, Kommentar im Footer; dazu `src/views/fehler.html` und `public/datenschutz.html` | Entscheid, wer Ansprechstelle ist (z. B. `info@cevi.tools`, braucht Freigabe der Gruppe) |
| Verantwortliche Stelle | `public/datenschutz.html` | Entscheid, wer den Kurstracker betreibt |
| Hoster und Serverstandort | `public/datenschutz.html` | Serverwahl (#29), Domain und Umgebung (#30) |
| OAuth-App bei der Cevi-DB | Cevi-DB-Steuergruppe, `cevidb@cevi.ch` | Produktions-Redirect-URI aus #29 (#21) |
| Absprache zur Datennutzung | Cevi-DB-Verantwortliche | #36, Voraussetzung für #21 und #33 |

Ein Impressum ist nicht nötig, der Kurstracker handelt nicht online mit Waren oder Leistungen (UWG Art. 3 lit. s).

## Prüfen nach dem Eintragen

- `npm test` und `npx playwright test` laufen grün.
- Die Datenschutzerklärung nennt jedes Cookie und jeden Speicher-Schlüssel (prüft `test/datenschutz.test.js`).
- Letzte Prüfung auf dem Live-Server: #82.
