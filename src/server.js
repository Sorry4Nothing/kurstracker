import { envConfig, validateEnv } from './config/env.js';
import { app, logSafe } from './app.js';
import { applyKindLabels } from './domain/courseTreeData.js';
import { ceviDbService } from './services/ceviDbService.js';

// Server starten
const validation = validateEnv();
// Nur lokal darf mit Konfigurationsfehlern gestartet werden; development und production laufen auf geteilten Servern
if (!validation.valid && !envConfig.app.isLocal) {
  console.error(`\n❌ FEHLER: Ungültige Konfiguration (${envConfig.app.env})!`);
  validation.errors.forEach(e => console.error('  -', e));
  process.exit(1);
}

app.listen(envConfig.server.port, envConfig.server.host, () => {
  console.log('\n======================================================');
  console.log(`[CEVI] ${envConfig.app.name.toUpperCase()}`);
  console.log('======================================================');
  console.log(`[HTTP] Server laeuft auf    : ${envConfig.server.url}`);
  console.log(`[ENV]  Umgebung (APP_ENV)   : ${envConfig.app.env.toUpperCase()}`);
  console.log(`[API]  Cevi-DB Schnittstelle: ${envConfig.ceviDb.baseUrl}`);
  console.log(`[MODE] Cevi-DB Modus        : ${envConfig.ceviDb.preparationMode ? 'Vorbereitung / Testdaten' : 'Live Cevi-DB'}`);
  console.log('======================================================\n');
});

// Titel der J+S- und SLRG-Kurse aus der Cevi-DB, einmal pro Start. Der Start wartet nicht darauf:
// bis zur Antwort, ohne Service-Token und bei einem Ausfall gelten die Titel der Datei
ceviDbService.getKindLabels()
  .then(labels => {
    if (labels.size) console.log(`[KURS] Titel aus der Cevi-DB   : ${applyKindLabels(labels)} J+S- und SLRG-Kurse`);
  })
  .catch(err => console.warn(`[KURS] Kursarten nicht geladen, es gelten die Titel der Datei: ${logSafe(err.message)}`));
