import pg from 'pg';
import { envConfig } from '../config/env.js';

// Gemeinsame Verbindung zur Datenbank (Neon); null, wenn DATABASE_URL fehlt
let pool;
function newPool() {
  const created = new pg.Pool({ connectionString: envConfig.credentials.databaseUrl, max: 3 });
  // Ein gekappter Leerlauf-Client (Neon schläft ein) darf den Prozess nicht beenden
  created.on('error', err => console.error('[Datenbank] Leerlauf-Verbindung verloren:', err.code || err.message));
  return created;
}

export const query = envConfig.credentials.databaseUrl
  ? (sql, params) => (pool ??= newPool()).query(sql, params)
  : null;
