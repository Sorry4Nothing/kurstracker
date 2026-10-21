import { envConfig, validateEnv } from '../src/config/env.js';

console.log('\n======================================================');
console.log('       CEVI KURSTRACKER - ENVIRONMENT DIAGNOSE        ');
console.log('======================================================\n');

const validation = validateEnv();

console.log(`📍 Aktuelle Umgebung (APP_ENV) : ${envConfig.app.env.toUpperCase()}`);
console.log(`🌐 Modus (NODE_ENV)            : ${envConfig.app.nodeEnv}`);
console.log(`🏷️  App Name                    : ${envConfig.app.name}`);
console.log(`🔗 Server Basis-URL (APP_URL)   : ${envConfig.server.url}`);
console.log(`🚪 Port                        : ${envConfig.server.port}`);
console.log(`🔒 Cookie Secure               : ${envConfig.auth.cookieSecure ? 'Ja (HTTPS erforderlich)' : 'Nein (Lokal OK)'}`);
console.log('------------------------------------------------------');
console.log(`🏕️  Cevi-DB Base URL            : ${envConfig.ceviDb.baseUrl}`);
console.log(`🔑 Cevi-DB Client ID           : ${envConfig.ceviDb.clientId ? 'Konfiguriert ✅' : 'FEHLT ❌'}`);
console.log(`🔐 Cevi-DB Secret              : ${envConfig.ceviDb.clientSecret ? 'Konfiguriert ✅' : 'FEHLT ❌'}`);
console.log(`🔄 Cevi-DB Redirect URI        : ${envConfig.ceviDb.redirectUri}`);
console.log(`📦 Cevi-DB Vorbereitungsmodus : ${envConfig.ceviDb.preparationMode ? 'AKTIVIERT 🟡 (Lokale Testdaten aktiv)' : 'DEAKTIVIERT 🟢 (Echte Cevi-DB)'}`);
console.log('======================================================');

if (validation.valid) {
  console.log('\n✨ Konfiguration ist gültig und betriebsbereit!\n');
} else {
  console.log('\n⚠️  Warnungen in der Konfiguration:');
  validation.errors.forEach(err => console.log(`   - ${err}`));
  console.log('\n💡 Hinweis: Für lokale Tests kann CEVI_DB_PREPARATION_MODE=true gesetzt werden.\n');
}
