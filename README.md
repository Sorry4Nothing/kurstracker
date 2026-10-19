# Cevi Kurstracker

> Moderne Verwaltung und Nachverfolgung von Cevi- und Jugend+Sport-Ausbildungen mit nativer **Cevi-DB (Hitobito)** Anbindung.

---

## 🌟 Funktionen

- 🏕️ **Cevi-DB (Hitobito) OAuth 2.0 / OIDC Login**: Sichere Anmeldung über `db.cevi.ch`.
- 📋 **Kurstracker & Historie**: Vollständige Übersicht besuchter Cevi-Kurse (GLK, SLK, Sicherheitsmodule, etc.).
- 🎖️ **J+S & Verbands-Qualifikationen**: Automatische Nachverfolgung von Leiteranerkennungen (Lagersport/Trekking) und Gültigkeitsfristen (2-jährige Fortbildungspflicht).
- 📅 **Kursangebot**: Durchsuchen und Filtern von anstehenden Ausbildungen von Cevi Schweiz und den Regionalverbänden.
- ⚙️ **Saubere Multi-Environment Trennung**: Vorkonfigurierte Umgebungen für `local`, `development` und `production`.
- 🛡️ **Datensicherheit im Git**: Striktes `.gitignore` gegen KI-Dateien und `.env`-Secrets sowie integrierter Schutz vor dem Verlust von *untracked files*.

---

## 🚀 Schnellstart (Lokal)

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/Sorry4Nothing/kurstracker.git
cd kurstracker
npm install
```

### 2. Lokale Umgebungskonfiguration erstellen
```bash
# Kopiere die lokale Vorlage (standardmässig im sicheren Mock-Modus):
copy .env.local.example .env.local
```

### 3. Server im Entwicklungsmodus starten
```bash
npm run dev
```
Öffne [http://localhost:3000](http://localhost:3000) im Browser.

---

## 🌲 Cevi-DB (Hitobito) Schnittstelle

Die Cevi-DB läuft auf **Hitobito** und bietet:
- **OAuth 2.0**: Single Sign-On über `https://db.cevi.ch/oauth/authorize`.
- **JSON:API**: REST-Schnittstellen für Events (`/api/events`), Participations (`/api/event_participations`) und Qualifikationen (`/api/qualifications`).

Ausführliche Details zum Beantragen der OAuth Client-ID und Secret bei Cevi Schweiz findest du im Dokumentation:
👉 [docs/CEVI_DB_INTEGRATION.md](docs/CEVI_DB_INTEGRATION.md)

---

## 🌿 Git Branching & Umgebungen

| Branch | Umgebung | Einsatzzweck |
| :--- | :--- | :--- |
| **`main`** *(Live/Master)* | **Production** | Produktiver Webserver (`kurstracker.ch`) |
| **`develop`** | **Development** | Dev-/Staging-Server (`dev.kurstracker.ch`) |

### Sicherer Branch-Wechsel (Schutz vor Verlust von ungetrackten Dateien)
Um unbeabsichtigten Datenverlust bei ungetrackten Dateien zu verhindern:
```bash
# Sicher zu develop wechseln:
npm run switch:dev

# Sicher zu main (Live) wechseln:
npm run switch:main
```
Mehr Details dazu:
👉 [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)

---

## 🔧 Verfügbare NPM Scripts

| Befehl | Beschreibung |
| :--- | :--- |
| `npm run dev` | Startet den Entwicklungsserver mit Hot-Reload (`node --watch`) |
| `npm start` | Startet den Server im Produktionsmodus |
| `npm run env:check` | Führt eine Diagnose der geladenen `.env`-Variablen durch |
| `npm run switch:dev` | Sicherer Wechsel zum `develop` Branch mit Stash-Schutz |
| `npm run switch:main` | Sicherer Wechsel zum `main` (Live) Branch mit Stash-Schutz |
| `npm run git:status` | Kompakte Statusanzeige der geänderten/ungetrackten Dateien |

---

## 📄 Lizenz
Entwickelt für Leiterinnen und Leiter der Cevi Schweiz.
