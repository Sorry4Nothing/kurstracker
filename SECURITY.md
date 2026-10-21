# Sicherheit

Der Kurstracker verarbeitet Personendaten von Cevi-Leitenden: Name, Geburtsdatum, besuchte Kurse und Qualifikationen. Wir nehmen Sicherheitslücken deshalb ernst.

## Unterstützte Versionen

Sicherheitskorrekturen gibt es nur für den aktuellen Stand. Ältere Releases werden nicht nachgebessert.

## Eine Lücke melden

Bitte melde Sicherheitslücken **nicht** als öffentliches Issue. Nutze die private Meldung über GitHub:

**[Sicherheitslücke privat melden](https://github.com/Sorry4Nothing/kurstracker/security/advisories/new)**

Hilfreich sind:

- betroffene Stelle (Seite, API-Endpunkt oder Datei)
- Schritte, um das Problem nachzustellen
- was ein Angreifer damit erreichen kann, z. B. fremde Daten lesen oder Rechte erweitern

Wir bestätigen den Eingang, prüfen die Meldung und halten dich über den Stand der Korrektur auf dem Laufenden. Bitte veröffentliche Details erst, wenn eine Korrektur verfügbar ist.

## Was dazugehört

- Anmeldung und Sessions (OAuth mit der Cevi-DB, Session-Cookies)
- Zugriff auf Personendaten, die man nicht sehen dürfte
- Rechte im Stufenleiter-Planer
- eingeschleuster Code in der Oberfläche (XSS)
- offengelegte Zugangsdaten oder Secrets

Lücken in der Cevi-DB (Hitobito) selbst meldest du bitte direkt der Cevi-DB-Verantwortung unter cevidb@cevi.ch.
