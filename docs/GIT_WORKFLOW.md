# Git Workflow & Sicherheitsleitfaden

## 1. Branch-Strategie

Der Cevi Kurstracker nutzt ein klares Zwei-Ebenen-Branch-Modell:

| Branch | Zweck | Umgebung | Server / Deployment |
| :--- | :--- | :--- | :--- |
| **`main`** *(Live/Master)* | Produktiver, stabiler Code | **Live / Production** | Webserver Live (`kurstracker.ch`) |
| **`develop`** | Aktive Weiterentwicklung & Integration | **Development / Staging** | Webserver Dev (`dev.kurstracker.ch`) |

- **Neue Features**: Werden immer auf `develop` (oder abgeleiteten Feature-Branches `feature/...`) entwickelt.
- **Releases**: Werden nach gründlichem Testen von `develop` nach `main` gemergt.

---

## 2. Schutz vor Verlust nicht getrackter Dateien (Untracked Files)

### 2.1 Warum Dateien bei Branch-Wechseln verloren gehen können
Git schützt standardmässig untracked files vor Überschreiben, aber:
1. `git clean -fd` löscht alle ungetrackten Dateien permanent und unwiderruflich!
2. `git checkout -f` oder `git reset --hard` verwerfen ungesicherte Änderungen.
3. Wenn ein Branch gewechselt wird und der Zielbranch eine gleichnamige Datei getrackt hat, bricht Git ab – erzwingt man den Wechsel mit `-f`, gehen Daten verloren.

### 2.2 Der integrierte Safe-Switch Mechanismus
Um sicherzustellen, dass **niemals** ungetrackte oder ungesicherte Dateien verloren gehen, steht ein automatisierter Switcher bereit:

```bash
# Sicher zu 'develop' wechseln:
npm run switch:dev

# Sicher zu 'main' (Live) wechseln:
npm run switch:main
```

**Was der Safe-Switch automatisch tut:**
1. Prüft den Status (`git status --porcelain`).
2. Erkennt ungetrackte (`??`) und modifizierte Dateien.
3. Sichert diese automatisch mit `git stash push -u -m "safe_switch_backup_..."` (das `-u` schliesst untracked files explizit ein!).
4. Wechselt sicher zum Zielbranch.

### 2.3 Manuelle Best Practice für Git Stash
Falls manuell mit Git gearbeitet wird:
```bash
# Immer inklusive untracked files stashen:
git stash push -u -m "Mein Arbeitsstand vor Branchwechsel"

# Branch wechseln:
git switch develop

# Bei Bedarf Änderungen auf dem neuen Branch anwenden:
git stash pop
```

---

## 3. Strenge AI / KI Dateiausschlüsse (.gitignore)

In der `.gitignore` ist strikt verankert, dass **keine KI- oder Agenten-Artefakte jemals im Git landen**:

- Google Antigravity & Gemini: `.*gemini*`, `*gemini*`, `.agents*`, `*brain*`
- Anthropic Claude & Cline: `.*claude*`, `*claude*`, `*clinerules*`, `CLAUDE*`
- Cursor & Windsurf & Codeium: `.*cursor*`, `*cursor*`, `.cursorrules*`, `.*windsurf*`, `.*codeium*`
- GitHub Copilot & OpenAI: `.*copilot*`, `*copilot*`, `*openai*`
- Prompt-Dateien & KI-Logs: `*.prompt`, `*.prompts`, `prompt_*.txt`, `ai-context/`, `ai_logs/`

---

## 4. Multi-Environment Dateien (.env)

Die echten `.env`-Dateien sind ebenfalls in der `.gitignore` gesperrt. Im Repository befinden sich ausschliesslich die Dokumentationsvorlagen:

- `.env.example`: Allgemeine Übersicht aller Konfigurationsoptionen
- `.env.local.example`: Vorlage für lokale Ausführung auf dem Entwicklerrechner
- `.env.development.example`: Vorlage für den Dev-/Staging-Server
- `.env.production.example`: Vorlage für den Live-Webserver
