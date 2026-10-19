# Cevi-DB (Hitobito) Schnittstellen- & Integrationsleitfaden

> Offizielle CeviWiki Referenz: [wiki.cevi.ch/index.php/Cevi.DB_API](https://wiki.cevi.ch/index.php/Cevi.DB_API)

---

## 1. Überblick: Was ist die Cevi-DB?
Die **Cevi-DB** ([db.cevi.ch](https://db.cevi.ch)) ist die zentrale Mitglieder-, Gruppen- und Kursverwaltungsplattform des **Cevi Schweiz**.
Sie basiert auf der Schweizer Open-Source-Plattform **Hitobito** (entwickelt von Puzzle ITC), welche auch von anderen Jugendverbänden (z. B. Pfadi MiData / Jubla JublaNet) eingesetzt wird.

> [!IMPORTANT]
> **Aktueller Status: Vorbereitungsmodus (`CEVI_DB_PREPARATION_MODE=true`)**
> Die Cevi-DB Anbindung im Kurstracker ist als modulare Vorbereitung gebaut. Da die offizielle OAuth2-Applikation auf `db.cevi.ch` erst noch durch die Cevi.DB Steuergruppe eingerichtet werden muss, läuft die Anwendung standardmässig in einer robusten Simulation mit realistischen Kurs- und Leitungsdaten. So kann die gesamte Logik und das Dashboard ohne externe Abhängigkeiten entwickelt und getestet werden.

---

## 2. Authentifizierungsmöglichkeiten gemäss CeviWiki

Die Cevi-DB bietet zwei Authentifizierungsmodelle:

### 2.1 Modell A: OAuth 2.0 Provider (Für Benutzer-Login / SSO)
Exklusiv für Web-Anwendungen, bei denen sich Cevi-Leitende mit ihrem persönlichen Cevi-DB Account einloggen.
- **Zuständigkeit**: Cevi.DB Steuergruppe (`cevidb@cevi.ch`)
- **Endpunkte auf db.cevi.ch**:
  | Funktion | Endpoint URL | Methode | Beschreibung |
  | :--- | :--- | :--- | :--- |
  | **Authorization** | `https://db.cevi.ch/oauth/authorize` | `GET` | Weiterleitung zur Cevi-DB Login-Maske |
  | **Token Exchange** | `https://db.cevi.ch/oauth/token` | `POST` | Tauscht `code` gegen `access_token` ein |
  | **Userinfo / OIDC** | `https://db.cevi.ch/oauth/userinfo` | `GET` | Liefert Benutzeridentität, Rollen & Ceviname |
- **Angeforderte Scopes**:
  `openid email name with_roles events people`

### 2.2 Modell B: Service-Tokens / API-Keys (Für Datenabfragen / Hintergrunddienste)
Für automatisierte Datenabrufe (wie in [cevi/event-overview-cevidb](https://github.com/cevi/event-overview-cevidb) oder [cevi-versand](https://github.com/lucidBrot/cevi-versand)):
- **Erstellung**: Kann durch Abteilungsleiter direkt auf der Ortsgruppe im Reiter *Einstellungen &rarr; API-Keys* erstellt werden:
  `https://db.cevi.ch/groups/{GRUPPENID}/service_tokens`
- **Rechte/Scopes**: Ebene und Rechte (z. B. Anlässe lesen, Personen lesen, Rollen lesen).
- **Übergabe**:
  - Im Header: `X-Token: <dein-token>`
  - Oder als Query-Parameter: `?token=<dein-token>`

---

## 3. Hitobito JSON:API Spezifikation (v1.1)

Hitobito setzt auf den offenen Standard **JSON:API (v1.1)**:
- **Erforderlicher Content-Type**: `application/vnd.api+json`
- **Erforderlicher Accept-Header**: `application/vnd.api+json`
- **Swagger / OpenAPI Dokumentation**: Einsehbar unter `https://db.cevi.ch/api-docs` bzw. [Hitobito JSON:API Doku](https://github.com/hitobito/hitobito/blob/master/doc/developer/common/api/json_api.md).

### 3.1 Für den Kurstracker relevante Endpunkte:
| Ressource | Endpunkt | Zweck im Kurstracker |
| :--- | :--- | :--- |
| **Kurse & Events** | `GET /api/events/` | Liste aller Kurse (GLK, SLK, Sicherheitsmodule) |
| **Kurs-Details** | `GET /api/events/:id` | Daten, Zeiten, Ort, Kosten, Anmeldefrist |
| **Kursteilnahmen** | `GET /api/event_participations/` | Werdegang, bisherige Teilnahmen, Status (bestanden) |
| **Qualifikationen** | `GET /api/qualifications/` | J+S-Leiterrechte, BASPO-Anerkennung, Verfallsdaten |
| **Personen & Rollen** | `GET /api/people/:id`, `/api/roles/` | Ceviname, Abteilung, Leiterfunktion |

---

## 4. Referenz-Projekte aus der Cevi-Community
Im CeviWiki werden folgende bestehende Open-Source-Tools aufgeführt, die als technische Referenz dienen:
1. **[Anlass- und Kursübersicht (event-overview-cevidb)](https://github.com/cevi/event-overview-cevidb)**:
   - Live-Webseite: [events.cevi.tools](https://events.cevi.tools/)
   - Führt die öffentlichen Anlässe und Kurse aus der Cevi.DB zusammen.
2. **[Cevi-Versand (Couvertgenerator)](https://github.com/lucidBrot/cevi-versand)**:
   - Open-Source Tool zur automatisierten Couvert-Bedruckung mit Cevinamen via Cevi-DB API.
3. **[cevidbtool](https://github.com/nchiapol/cevidbtool)**:
   - Python-CLI für Spender- und Mitgliederverwaltung.

---

## 5. Umstellung von Vorbereitungsmodus auf Live-Betrieb

Sobald die OAuth-Applikation bei `cevidb@cevi.ch` genehmigt wurde oder ein Service-Token vorliegt:

1. In `.env.local` (oder auf dem Server in `.env`):
   ```env
   # Vorbereitungsmodus deaktivieren:
   CEVI_DB_PREPARATION_MODE=false
   CEVI_DB_USE_MOCK=false

   # Erhaltene Zugangsdaten eintragen:
   CEVI_DB_CLIENT_ID=deine_offizielle_client_id
   CEVI_DB_CLIENT_SECRET=dein_offizielles_client_secret

   # Optional für Hintergrund-Sync von Kursen:
   CEVI_DB_SERVICE_TOKEN=dein_ortsruppen_service_token
   ```
2. Server neu starten (`npm run dev` bzw. `npm start`).
3. Die Anwendung schaltet automatisch von der lokalen Simulation auf die echte Schnittstelle zu `db.cevi.ch` um.
