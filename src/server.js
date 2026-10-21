import { envConfig, validateEnv } from './config/env.js';
import { app } from './app.js';

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
