<div align="center">

![Cevi Kurstracker Banner](public/banner.svg)

<p style="font-size: 16px; color: #94A3B8; margin-top: 14px; margin-bottom: 8px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  Ausbildungs- und Kursmanagement für Schweizer Cevi-Leitende und Stufenleitungen.
</p>
<p style="font-size: 13px; color: #64748B; margin-top: 0; margin-bottom: 16px; font-family: monospace;">
  Interaktives Stufenleiter-Cockpit • J+S-Früherkennung • Hitobito Cevi-DB Vorbereitung
</p>

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Cevi Corporate Design](https://img.shields.io/badge/Cevi_CD-C41333%20%7C%20323394-C41333?style=for-the-badge&logoColor=white)](https://cevi.tools/)
[![J+S Lagersport](https://img.shields.io/badge/J%2BS-Lagersport%2FTrekking-108A43?style=for-the-badge&logoColor=white)](https://www.jugendundsport.ch/)
[![Tests](https://img.shields.io/badge/Tests-Passing-108A43?style=for-the-badge&logo=vitest&logoColor=white)](test/test-tree-logic.js)

<div style="margin-top: 20px; margin-bottom: 24px;">
  <a href="#interface-vorschau" style="background: rgba(50, 51, 148, 0.25); border: 1px solid #38BDF8; color: #BAE6FD; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 4px; display: inline-block;">Interface Vorschau</a>
  <a href="#schnellstart" style="background: rgba(196, 19, 51, 0.25); border: 1px solid #C41333; color: #FCA5A5; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 4px; display: inline-block;">Schnellstart</a>
  <a href="#befehlsuebersicht" style="background: rgba(16, 138, 67, 0.25); border: 1px solid #108A43; color: #86EFAC; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 4px; display: inline-block;">Befehle</a>
  <a href="#cevi-db" style="background: rgba(2, 132, 199, 0.25); border: 1px solid #0284C7; color: #7DD3FC; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 4px; display: inline-block;">Cevi-DB</a>
  <a href="#ui-komponenten" style="background: rgba(50, 51, 148, 0.3); border: 1px solid #323394; color: #CBD5E1; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 4px; display: inline-block;">UI Komponenten</a>
</div>

</div>

<!-- INTERFACE VORSCHAU CARD -->
<div id="interface-vorschau" style="background: linear-gradient(180deg, #141933 0%, #0c1022 100%); border: 1px solid rgba(50, 51, 148, 0.45); border-radius: 12px; padding: 24px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <div style="border-bottom: 2px solid #323394; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Interface Vorschau</h2>
    <span style="background: rgba(50, 51, 148, 0.3); border: 1px solid #38BDF8; color: #38BDF8; font-family: monospace; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">DASHBOARD // MOCKUP</span>
  </div>

  <div align="center">
    <img src="public/preview-mockup.svg" alt="Cevi Kurstracker Interface" width="100%" style="border-radius: 8px;"/>
  </div>
</div>

<!-- SCHNELLSTART CARD -->
<div id="schnellstart" style="background: linear-gradient(180deg, #141933 0%, #0c1022 100%); border: 1px solid rgba(196, 19, 51, 0.45); border-radius: 12px; padding: 24px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <div style="border-bottom: 2px solid #C41333; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
    <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Schnellstart</h2>
    <div style="display: flex; gap: 8px;">
      <span style="background: #10152b; border: 1px solid #1e293b; color: #94A3B8; font-family: monospace; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">Node.js v20+</span>
      <span style="background: #10152b; border: 1px solid #1e293b; color: #94A3B8; font-family: monospace; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">NPM v9+</span>
    </div>
  </div>

  <!-- Schritt 1 -->
  <div style="background: #10152b; border: 1px solid #323394; border-left: 5px solid #323394; border-radius: 8px; padding: 18px; margin-bottom: 16px;">
    <span style="background: rgba(50, 51, 148, 0.35); border: 1px solid #38BDF8; color: #BAE6FD; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 11px; font-weight: 700;">SCHRITT 1 // SETUP</span>
    <h3 style="color: #FFFFFF; font-size: 16px; margin: 10px 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Repository Klonen &amp; Abhängigkeiten Installieren</h3>
    <p style="color: #94A3B8; font-size: 13px; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Klont das Git-Repository lokal und installiert alle Pakete für Express und Motion.</p>
    <pre style="background: #060914; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 16px; color: #38BDF8; font-family: monospace; font-size: 13px; margin: 0; overflow-x: auto;"><code>git clone https://github.com/Sorry4Nothing/kurstracker.git
cd kurstracker
npm install</code></pre>
  </div>

  <!-- Schritt 2 -->
  <div style="background: #10152b; border: 1px solid #C41333; border-left: 5px solid #C41333; border-radius: 8px; padding: 18px; margin-bottom: 16px;">
    <span style="background: rgba(196, 19, 51, 0.25); border: 1px solid #C41333; color: #FCA5A5; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 11px; font-weight: 700;">SCHRITT 2 // CONFIG</span>
    <h3 style="color: #FFFFFF; font-size: 16px; margin: 10px 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Lokale Umgebung Konfigurieren</h3>
    <p style="color: #94A3B8; font-size: 13px; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Kopiert die Konfigurationsvorlage. Die Applikation läuft standardmässig im Cevi-DB Simulationsmodus mit Schweizer Testdaten.</p>
    <pre style="background: #060914; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 16px; color: #FCA5A5; font-family: monospace; font-size: 13px; margin: 0; overflow-x: auto;"><code># Windows (PowerShell / CMD):
copy .env.example .env.local

# macOS / Linux:
cp .env.example .env.local</code></pre>
  </div>

  <!-- Schritt 3 -->
  <div style="background: #10152b; border: 1px solid #108A43; border-left: 5px solid #108A43; border-radius: 8px; padding: 18px; margin-bottom: 0;">
    <span style="background: rgba(16, 138, 67, 0.25); border: 1px solid #108A43; color: #86EFAC; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 11px; font-weight: 700;">SCHRITT 3 // RUN</span>
    <h3 style="color: #FFFFFF; font-size: 16px; margin: 10px 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Entwicklungsserver Starten</h3>
    <p style="color: #94A3B8; font-size: 13px; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Startet den lokalen Express-Server mit automatischem Hot-Reload. Öffne anschliessend <b>http://localhost:3000</b> im Browser.</p>
    <pre style="background: #060914; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 16px; color: #86EFAC; font-family: monospace; font-size: 13px; margin: 0; overflow-x: auto;"><code>npm run dev</code></pre>
  </div>
</div>

<!-- BEFEHLSÜBERSICHT CARD -->
<div id="befehlsuebersicht" style="background: linear-gradient(180deg, #141933 0%, #0c1022 100%); border: 1px solid rgba(16, 138, 67, 0.45); border-radius: 12px; padding: 24px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <div style="border-bottom: 2px solid #108A43; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Befehlsübersicht</h2>
    <span style="background: rgba(16, 138, 67, 0.25); border: 1px solid #108A43; color: #86EFAC; font-family: monospace; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">NPM SCRIPTS</span>
  </div>

  <!-- Row 1: npm run dev -->
  <div style="background: #10152b; border: 1px solid #108A43; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="background: rgba(16, 138, 67, 0.2); color: #86EFAC; border: 1px solid #108A43; padding: 5px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold;">npm run dev</code>
      <span style="background: rgba(16, 138, 67, 0.25); color: #4ADE80; border: 1px solid #108A43; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 10px; font-weight: bold;">DEV WATCH</span>
      <span style="background: #1e293b; color: #94A3B8; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 10px;">PORT 3000</span>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Startet den Express-Server mit automatischem Hot-Reload (node --watch)</span>
  </div>

  <!-- Row 2: npm start -->
  <div style="background: #10152b; border: 1px solid #323394; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="background: rgba(50, 51, 148, 0.35); color: #BAE6FD; border: 1px solid #38BDF8; padding: 5px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold;">npm start</code>
      <span style="background: rgba(50, 51, 148, 0.35); color: #7DD3FC; border: 1px solid #38BDF8; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 10px; font-weight: bold;">PRODUCTION</span>
      <span style="background: #1e293b; color: #94A3B8; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 10px;">PORT 3000</span>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Startet den Express-Server im Produktionsmodus</span>
  </div>

  <!-- Row 3: npm run test:tree -->
  <div style="background: #10152b; border: 1px solid #C41333; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="background: rgba(196, 19, 51, 0.25); color: #FCA5A5; border: 1px solid #C41333; padding: 5px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold;">npm run test:tree</code>
      <span style="background: rgba(196, 19, 51, 0.25); color: #F87171; border: 1px solid #C41333; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 10px; font-weight: bold;">TEST SUITE</span>
      <span style="background: #1e293b; color: #94A3B8; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 10px;">100% PASS</span>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Führt Domain-Tests für Kursbaum, Mindestalter, Pfadfinder und J+S-Ampel aus</span>
  </div>

  <!-- Row 4: npm run env:check -->
  <div style="background: #10152b; border: 1px solid #0284C7; border-radius: 8px; padding: 14px 18px; margin-bottom: 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <code style="background: rgba(2, 132, 199, 0.25); color: #7DD3FC; border: 1px solid #0284C7; padding: 5px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold;">npm run env:check</code>
      <span style="background: rgba(2, 132, 199, 0.25); color: #38BDF8; border: 1px solid #0284C7; padding: 3px 10px; border-radius: 12px; font-family: monospace; font-size: 10px; font-weight: bold;">DIAGNOSE</span>
      <span style="background: #1e293b; color: #94A3B8; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 10px;">CONFIG OK</span>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Validiert Umgebungsvariablen, Cevi-DB Modus und Konfiguration</span>
  </div>
</div>

<!-- CEVI-DB CARD (VOLL DURCHGESTYLT) -->
<div id="cevi-db" style="background: linear-gradient(180deg, #141933 0%, #0c1022 100%); border: 1px solid rgba(2, 132, 199, 0.45); border-left: 5px solid #0284C7; border-radius: 12px; padding: 24px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <div style="border-bottom: 2px solid #0284C7; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
    <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Cevi-DB (Hitobito) Schnittstelle</h2>
    <span style="background: rgba(2, 132, 199, 0.25); border: 1px solid #0284C7; color: #7DD3FC; font-family: monospace; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">REST API &amp; OAUTH 2.0</span>
  </div>

  <!-- Item 1: OAuth 2.0 Single Sign-On -->
  <div style="background: #10152b; border: 1px solid rgba(2, 132, 199, 0.35); border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="background: rgba(2, 132, 199, 0.25); color: #38BDF8; border: 1px solid #0284C7; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: bold;">SSO AUTH</span>
      <code style="background: #060914; color: #7DD3FC; border: 1px solid #1e293b; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">https://db.cevi.ch/oauth/authorize</code>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Single Sign-On über offiziellen Cevi.DB Verbandslogin</span>
  </div>

  <!-- Item 2: Hitobito JSON:API v1.1 -->
  <div style="background: #10152b; border: 1px solid rgba(2, 132, 199, 0.35); border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
      <span style="background: rgba(16, 138, 67, 0.25); color: #86EFAC; border: 1px solid #108A43; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: bold;">SYNC API</span>
      <code style="background: #060914; color: #E2E8F0; border: 1px solid #1e293b; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">/api/events</code>
      <code style="background: #060914; color: #E2E8F0; border: 1px solid #1e293b; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">/api/qualifications</code>
      <code style="background: #060914; color: #E2E8F0; border: 1px solid #1e293b; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">/api/event_participations</code>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Automatischer Kurs-, Teilnahme- und J+S-Statusabgleich</span>
  </div>

  <!-- Item 3: Service-Token -->
  <div style="background: #10152b; border: 1px solid rgba(2, 132, 199, 0.35); border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="background: rgba(50, 51, 148, 0.35); color: #BAE6FD; border: 1px solid #38BDF8; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: bold;">SERVICE TOKEN</span>
      <code style="background: #060914; color: #BAE6FD; border: 1px solid #1e293b; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">X-Token: &lt;secret&gt;</code>
    </div>
    <span style="color: #E2E8F0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Direkter Abgleich für Ortsgruppen ohne interaktiven Benutzerlogin</span>
  </div>

  <!-- Config Hint Banner -->
  <div style="background: #060914; border: 1px dashed rgba(2, 132, 199, 0.5); border-radius: 6px; padding: 12px 16px; font-size: 12.5px; color: #94A3B8; font-family: monospace;">
    Produktivschaltung: <span style="color: #38BDF8;">CEVI_DB_CLIENT_ID</span> und <span style="color: #38BDF8;">CEVI_DB_CLIENT_SECRET</span> in <span style="color: #FCA5A5;">.env.local</span> eintragen und <span style="color: #86EFAC;">CEVI_DB_PREPARATION_MODE=false</span> setzen.
  </div>
</div>

<!-- UI KOMPONENTEN CARD (VOLL DURCHGESTYLT) -->
<div id="ui-komponenten" style="background: linear-gradient(180deg, #141933 0%, #0c1022 100%); border: 1px solid rgba(50, 51, 148, 0.45); border-left: 5px solid #38BDF8; border-radius: 12px; padding: 24px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <div style="border-bottom: 2px solid #38BDF8; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
    <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">UI Komponenten</h2>
    <span style="background: rgba(50, 51, 148, 0.35); border: 1px solid #38BDF8; color: #BAE6FD; font-family: monospace; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">EMBEDDED CODE</span>
  </div>

  <!-- Card 1: Ohne Build-Schritt -->
  <div style="background: #10152b; border: 1px solid rgba(16, 138, 67, 0.4); border-left: 4px solid #108A43; border-radius: 8px; padding: 16px 18px; margin-bottom: 14px;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
      <span style="background: rgba(16, 138, 67, 0.25); color: #86EFAC; border: 1px solid #108A43; padding: 3px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: bold;">OHNE BUILD</span>
      <code style="background: #060914; color: #38BDF8; border: 1px solid #1e293b; padding: 3px 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">public/</code>
    </div>
    <p style="color: #E2E8F0; font-size: 13px; line-height: 1.5; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Die Oberfläche ist reines HTML, CSS und JavaScript (ES-Module) und läuft ohne Build-Schritt. <b>Kein Token oder Registrierung für Klonen, Setup oder Weiterentwicklung erforderlich.</b></p>
  </div>

  <!-- Card 2: Optionale Registry -->
  <div style="background: #10152b; border: 1px solid rgba(50, 51, 148, 0.4); border-left: 4px solid #323394; border-radius: 8px; padding: 16px 18px;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
      <span style="background: rgba(50, 51, 148, 0.35); color: #BAE6FD; border: 1px solid #38BDF8; padding: 3px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: bold;">OPTIONALE REGISTRY</span>
      <code style="background: #060914; color: #FCA5A5; border: 1px solid #1e293b; padding: 3px 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">KOKO_PRO_TOKEN in .env.local</code>
    </div>
    <p style="color: #94A3B8; font-size: 13px; line-height: 1.5; margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Nur falls du <i>neue, zusätzliche</i> Komponenten aus der privaten Registry nachladen möchtest: <code style="color: #E2E8F0; background: #060914; padding: 2px 6px; border-radius: 4px;">npx shadcn@latest add @kokonutui-pro/&lt;name&gt;</code>.</p>
  </div>
</div>

<div align="center" style="padding: 24px 0 10px 0; color: #64748B; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  Entwickelt für Leiterinnen und Leiter der <b>Cevi Schweiz</b> • Kompatibel mit <b>Jugend+Sport (BASPO)</b>
</div>
