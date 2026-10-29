# Betrieb: Monitoring und Logs

Vorbereitung für #32 (Teil von #12). Was davon gilt, hängt an der Plattformwahl in #29; die offenen Punkte stehen am Ende.

## Erreichbarkeit überwachen

`GET /api/health` ohne Login, ohne Cookie.

| Antwort | Bedeutung |
|---|---|
| `200 {"status":"ok","database":"ok"}` | App läuft, Datenbank antwortet |
| `200 {"status":"ok","database":"nicht konfiguriert"}` | App läuft, keine Datenbank eingerichtet (lokal, Tests) |
| `503 {"status":"degraded","database":"fehler"}` | App läuft, Datenbank nicht erreichbar (Zeitlimit 5 s, Neon braucht beim Aufwecken einige Sekunden) |

- Die Antwort enthält keine Personen-, Konfigurations- oder Verbindungsdaten.
- Die Cevi-DB ist bewusst nicht Teil des Checks: ein Ausfall der Cevi-DB ist kein Ausfall der App, und ein Alarm dafür gehört nicht in den Erreichbarkeits-Check.
- Der Dienst sollte `https://<Adresse>/api/health` alle 1 bis 5 Minuten abfragen und bei Antwort ausser 200 oder bei Zeitüberschreitung alarmieren.
- In Produktion leitet die App HTTP auf HTTPS um (308). Ein Check der Plattform, der intern per HTTP fragt, braucht deshalb `X-Forwarded-Proto: https` oder muss die HTTPS-Adresse abfragen.
- `GET /api/system/status` bleibt für die Anzeige im Frontend (Version, Modus), nicht für Monitoring: er prüft nichts.

## Logs

Die App schreibt nur nach stdout und stderr; Aufbewahrung, Zeitstempel und Einsicht übernimmt die Plattform. Jede Zeile beginnt mit einem Präfix:

| Präfix | Quelle | Stufe | Handeln |
|---|---|---|---|
| `[Unbehandelter Fehler]`, `[<Bereich>]` mit Stack | `sendError`, Fehler-Handler | Fehler | Jede Zeile prüfen, 500er |
| `[Sicherheit]` | `logSecurity` (SR-52) | Warnung | Häufung (viele 403, abgelehnte Zugriffe) prüfen, SR-53 |
| `[OAuth Callback]` | Anmeldung | Fehler | Häufung deutet auf Cevi-DB- oder Key-Problem |
| `[Health]`, `[Datenbank]` | Datenbank | Fehler | Datenbank prüfen |
| `[KURS]`, `[HTTP]`, `[ENV]`, `[MODE]`, `[API]` | Start | Info | nur beim Start |

Alle Nutzereingaben laufen über `logSafe` (ein Eintrag pro Zeile, höchstens 300 Zeichen).

## Personendaten in Logs (SR-50)

Stand der Prüfung aller `console.*`-Stellen in `src/`:

- `[Sicherheit]` loggt `akteur=<Person-ID>`, keinen Namen und keine E-Mail. Die ID ist pseudonym; sie darf im Log bleiben, solange das Log nur dem Betrieb zugänglich ist.
- Anfragen ohne Query-String: `req.originalUrl.split('?')[0]`.
- Es gibt kein Zugriffs-Log mit IP-Adressen. Das Rate-Limit zählt IPs nur im Arbeitsspeicher.
- Offener Punkt: `ceviDbService.js` hängt bei fehlgeschlagenem Token-Tausch und Userinfo-Abruf den Antworttext der Cevi-DB an die Fehlermeldung (`errorText`). Der Callback loggt davon höchstens 300 Zeichen. Bei einer Fehlerantwort ist das normalerweise nur eine Fehlermeldung. Falls die Cevi-DB dort Profildaten mitschickt, den Text kürzen oder weglassen.
- Fehler an den Client sind generisch (SR-51), Stacks bleiben im Server-Log.

## Offen bis #29 entschieden ist

- Wo Logs eingesehen werden (Plattform-Konsole, Log-Dienst) und wie lange sie liegen bleiben.
- Welcher Dienst `/api/health` abfragt und an wen der Alarm geht.
- Wer die Logs liest (Rolle) und wie oft; Grundlage ist SR-53.
- Aufbewahrungsfrist der Logs, abgestimmt mit der Datenschutzerklärung (#35).
