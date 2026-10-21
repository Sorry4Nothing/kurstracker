import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Multi-Environment Lade-Reihenfolge:
// 1. .env.local (falls vorhanden, hat höchste Priorität für Entwickler)
// 2. .env.development bzw. .env.production falls spezifisch
// 3. .env als Standard-Fallback
const envLocalPath = path.join(projectRoot, '.env.local');
const envDefaultPath = path.join(projectRoot, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envDefaultPath)) {
  dotenv.config({ path: envDefaultPath });
} else {
  dotenv.config(); // fallback
}

// Ohne APP_ENV zählt NODE_ENV=production: sonst liefe ein Produktions-Deployment mit allen Dev-Lockerungen (Default-Secret, volle Diagnose)
const rawAppEnv = (process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'local')).toLowerCase().trim();
const normalizedAppEnv = ['local', 'development', 'production'].includes(rawAppEnv)
  ? rawAppEnv
  : 'local';

// Platzhalter aus .env.example und der frühere Default stehen öffentlich im Repo: sie zählen als "kein Secret gesetzt"
const SECRET_PLACEHOLDERS = ['change-this-to-a-secure-random-secret', 'dev-insecure-secret-key-change-in-production'];
const configuredSessionSecret = SECRET_PLACEHOLDERS.includes(process.env.SESSION_SECRET) ? '' : (process.env.SESSION_SECRET || '');

export const envConfig = {
  app: {
    name: process.env.APP_NAME || 'Cevi Kurstracker',
    env: normalizedAppEnv,
    nodeEnv: process.env.NODE_ENV || (normalizedAppEnv === 'production' ? 'production' : 'development'),
    isLocal: normalizedAppEnv === 'local',
    isDevelopment: normalizedAppEnv === 'development',
    isProduction: normalizedAppEnv === 'production'
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    // Nur Produktion (hinter Proxy) lauscht auf allen Interfaces; lokal und development bleiben auf localhost
    host: process.env.HOST || (normalizedAppEnv === 'production' ? '0.0.0.0' : 'localhost'),
    url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
    // Hinter einem Reverse Proxy: Anzahl Proxy-Hops (z. B. 1) oder Express-Wert wie "loopback".
    // Nötig, damit Rate Limit die echte Client-IP zählt und req.secure die HTTPS-Verbindung des Proxys erkennt.
    trustProxy: process.env.TRUST_PROXY || ''
  },
  ceviDb: {
    baseUrl: process.env.CEVI_DB_BASE_URL || 'https://db.cevi.ch',
    clientId: process.env.CEVI_DB_CLIENT_ID || '',
    clientSecret: process.env.CEVI_DB_CLIENT_SECRET || '',
    redirectUri: process.env.CEVI_DB_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/callback`,
    scopes: process.env.CEVI_DB_SCOPES || 'openid email name with_roles events people',
    // Cevi.DB API-Keys / Service Token (aus CeviWiki: https://wiki.cevi.ch/index.php/Cevi.DB_API)
    serviceToken: process.env.CEVI_DB_SERVICE_TOKEN || '',
    // Vorbereitungsmodus (Testdaten): Standardmässig TRUE, da offizielle OAuth-Applikation noch bei cevidb@cevi.ch registriert werden muss.
    // Live nur mit CEVI_DB_PREPARATION_MODE=false und einer echten Client-ID.
    preparationMode: process.env.CEVI_DB_PREPARATION_MODE !== 'false' || !process.env.CEVI_DB_CLIENT_ID || process.env.CEVI_DB_CLIENT_ID.startsWith('local_')
  },
  auth: {
    // Lokal ohne eigenes Secret: pro Start zufällig (Sessions liegen ohnehin nur im Speicher und enden mit dem Prozess).
    // development und production starten ohne echtes Secret nicht (siehe validateEnv).
    sessionSecret: configuredSessionSecret || (normalizedAppEnv === 'local' ? crypto.randomBytes(32).toString('hex') : ''),
    sessionSecretConfigured: Boolean(configuredSessionSecret),
    // Secure überall, wo die App per HTTPS erreichbar ist, nicht nur in Produktion (#51)
    cookieSecure: process.env.COOKIE_SECURE === 'true' || normalizedAppEnv === 'production' || (process.env.APP_URL || '').startsWith('https://')
  },
  logging: {
    level: process.env.LOG_LEVEL || (normalizedAppEnv === 'production' ? 'warn' : 'debug')
  }
};

/**
 * Validiert die Umgebungsvariablen entsprechend der Zielumgebung.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  if (envConfig.ceviDb.preparationMode) {
    warnings.push('VORBEREITUNGSMODUS: Cevi-DB OAuth-Registrierung ist noch nicht live aktiv. Lokale Simulation/Mock ist aktiv.');
  }

  if (envConfig.app.isProduction) {
    if (!envConfig.ceviDb.preparationMode) {
      if (!envConfig.ceviDb.clientId || envConfig.ceviDb.clientId === 'official_live_cevi_db_client_id') {
        errors.push('PRODUKTION: CEVI_DB_CLIENT_ID fehlt oder ist noch der Platzhalter.');
      }
      if (!envConfig.ceviDb.clientSecret || envConfig.ceviDb.clientSecret === 'official_live_cevi_db_client_secret') {
        errors.push('PRODUKTION: CEVI_DB_CLIENT_SECRET fehlt oder ist noch der Platzhalter.');
      }
    }
    if (!envConfig.auth.sessionSecretConfigured || envConfig.auth.sessionSecret.length < 32) {
      errors.push('PRODUKTION: SESSION_SECRET muss gesetzt, mindestens 32 Zeichen lang und kryptografisch sicher sein (kein Platzhalter).');
    }
    if (!envConfig.server.url.startsWith('https://')) {
      errors.push('PRODUKTION: APP_URL muss mit https:// beginnen.');
    }
    if (!envConfig.server.trustProxy) {
      warnings.push('PRODUKTION: TRUST_PROXY ist nicht gesetzt. Hinter einem Reverse Proxy zählt das Rate Limit sonst die Proxy-IP, und die Umleitung auf HTTPS bleibt aus.');
    }
  }

  if (envConfig.app.isDevelopment && !envConfig.ceviDb.preparationMode && !envConfig.ceviDb.clientSecret) {
    errors.push('DEVELOPMENT: Entweder Cevi-DB Credentials eintragen oder CEVI_DB_PREPARATION_MODE=true setzen.');
  }

  if (envConfig.app.isDevelopment && !envConfig.auth.sessionSecretConfigured) {
    errors.push('DEVELOPMENT: SESSION_SECRET muss gesetzt sein (kein Platzhalter). Erzeugen z. B. mit: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
