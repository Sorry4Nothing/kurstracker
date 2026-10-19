# Cevi-DB (Hitobito) Schnittstellen- & Integrationsleitfaden

## 1. Überblick: Was ist die Cevi-DB?
Die **Cevi-DB** ([db.cevi.ch](https://db.cevi.ch)) ist die zentrale Mitglieder-, Gruppen- und Kursverwaltungsplattform des **Cevi Schweiz**.
Sie basiert auf der Schweizer Open-Source-Plattform **Hitobito** (entwickelt u. a. von Puzzle ITC), welche auch von anderen Jugendverbänden (z. B. Pfadi MiData / Jubla JublaNet) eingesetzt wird.

---

## 2. Authentifizierung: OAuth 2.0 & OpenID Connect (OIDC)
Hitobito fungiert als standardkonformer **OAuth 2.0 Provider** (mittels *Doorkeeper*). Externe Anwendungen wie der *Cevi Kurstracker* können Benutzer über die Cevi-DB anmelden lassen (Single Sign-On).

### 2.1 OAuth Endpoints auf db.cevi.ch
| Funktion | Endpoint URL | Methode | Beschreibung |
| :--- | :--- | :--- | :--- |
| **Authorization Endpoint** | `https://db.cevi.ch/oauth/authorize` | `GET` | Leitet den Benutzer zur Cevi-DB Login-Maske |
| **Token Endpoint** | `https://db.cevi.ch/oauth/token` | `POST` | Tauscht `code` gegen `access_token` ein |
| **Userinfo Endpoint** | `https://db.cevi.ch/oauth/userinfo` | `GET` | Liefert Benutzeridentität (OpenID Connect) |

### 2.2 Scopes (Berechtigungen)
Bei der Autorisierung müssen folgende Scopes angefordert werden:
- `openid`: Standard OpenID Connect Token & Userinfo Endpoint
- `email`: E-Mail-Adresse des Cevi-Mitglieds
- `name`: Vorname, Nachname und Ceviname/Pfadiname (Nickname)
- `with_roles`: Abteilungszugehörigkeiten, Rollen (z. B. Abteilungsleiter, Kursleiter)
- `events`: Zugriff auf Kurse und Anlässe
- `people`: Zugriff auf Personendaten & Qualifikationen

### 2.3 Beantragung der OAuth-Credentials
Um Kurstracker im echten Betrieb an die Cevi-DB anzubinden:
1. Kontaktiere den **Cevi Schweiz DB-Administrator** (oder den zuständigen Verbands-IT-Support).
2. Beantrage eine neue **OAuth2 Application** mit:
   - **Name**: `Cevi Kurstracker`
   - **Redirect URIs**:
     - Lokal: `http://localhost:3000/api/auth/callback`
     - Dev: `https://dev.kurstracker.ch/api/auth/callback`
     - Live: `https://kurstracker.ch/api/auth/callback`
   - **Scopes**: `openid email name with_roles events people`
3. Du erhältst:
   - `Client UID` (entspricht `CEVI_DB_CLIENT_ID`)
   - `Application Secret` (entspricht `CEVI_DB_CLIENT_SECRET`)

---

## 3. Hitobito REST & JSON:API Schnittstellen

Hitobito stellt eine moderne **JSON:API (v1.0)** sowie REST-Endpunkte zur Verfügung.

### 3.1 Kurse & Anlässe (`/api/events`)
- **GET `/api/events?filter[type]=Course`**: Liefert alle publizierten Kurse (GLK, SLK, Sicherheitsmodule, etc.).
- **GET `/groups/{group_id}/events.json`**: Liefert Kurse einer spezifischen Cevi-Region oder Abteilung.
- **Wichtige Kursattribute**:
  - `name` / `title`: Name des Kurses (z. B. "Gruppenleiterkurs Herbst 2026")
  - `start_date` / `end_date`: Kursdauer
  - `location`: Kursort (z. B. Hasliberg, Vaumarcus)
  - `application_deadline`: Anmeldeschluss
  - `state`: Status (`open_for_application`, `closed`, `fully_booked`)

### 3.2 Kursteilnahmen (`/api/event_participations`)
- **GET `/api/event_participations?filter[person_id]={id}`**:
  Zeigt alle Kurse, an denen die angemeldete Person teilgenommen hat oder angemeldet ist.
- **Rollen in Kursen**: `Teilnehmer`, `Kursleiter`, `Küchenteam`, `Gast`.

### 3.3 Qualifikationen (`/api/qualifications` / `/people/{id}/qualifications.json`)
- Zeigt J+S-Leiterrechte (Lagersport/Trekking Jugendsport/Kindersport) sowie Verbandsanerkennungen (Scharleiter, SLRG Brevet, etc.).
- **Felder**:
  - `valid_until`: Datum, an dem die J+S Anerkennung verfällt (alle 2 Jahre Fortbildungspflicht!).
  - `status`: `gültig`, `weggefallen`, `suspendiert`.

---

## 4. Lokaler Mock-Modus für Entwicklung
Solange noch keine offiziellen Credentials von Cevi Schweiz vorliegen, unterstützt der Kurstracker einen **Mock-Modus**:
```env
CEVI_DB_USE_MOCK=true
```
In diesem Modus werden realistische Kurs- und Personendaten simuliert, inklusive Cevi-Rollen und J+S Gültigkeitsfristen.
