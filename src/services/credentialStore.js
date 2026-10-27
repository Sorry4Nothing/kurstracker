import crypto from 'crypto';
import pg from 'pg';
import { envConfig } from '../config/env.js';

// Cevi-DB-API-Keys der Abteilungen (#129), AES-256-GCM-verschlüsselt in der Datenbank.
// Der Schlüssel liegt nur in der Server-Umgebung; ohne ihn oder ohne Datenbank bleibt die Seite aus.
// Gespeichert: Chiffretext, die letzten 4 Zeichen (Wiedererkennung), wer wann gespeichert hat. Nie der Klartext.

const ALGORITHM = 'aes-256-gcm';

// Abteilungs-ID als zusätzlich authentifizierte Daten: ein in eine andere Zeile kopierter Chiffretext lässt sich nicht entschlüsseln
export function encrypt(plaintext, key, departmentId) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(String(departmentId)));
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

export function decrypt(payload, key, departmentId) {
  const raw = Buffer.from(payload, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, raw.subarray(0, 12));
  decipher.setAAD(Buffer.from(String(departmentId)));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

const parseKey = hex => (/^[0-9a-f]{64}$/i.test(hex || '') ? Buffer.from(hex, 'hex') : null);

/**
 * @param {{ query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> | null, key: Buffer | null }} deps
 */
export function createCredentialStore({ query, key }) {
  let ready;
  // shortcut: Tabelle wird beim ersten Zugriff angelegt statt per Migration; bei einem zweiten Schema eine Migrationsverwaltung einführen
  const ensureTable = () => (ready ??= query(`
    CREATE TABLE IF NOT EXISTS department_credentials (
      department_id   text PRIMARY KEY,
      department_name text NOT NULL,
      ciphertext      text NOT NULL,
      last4           text NOT NULL,
      saved_by        text NOT NULL,
      saved_at        timestamptz NOT NULL DEFAULT now()
    )`).catch(err => { ready = undefined; throw err; }));

  const view = row => row && { configured: true, last4: row.last4, savedAt: row.saved_at.toISOString(), savedBy: row.saved_by };

  return {
    isConfigured: () => Boolean(query && key),

    async status(departmentId) {
      await ensureTable();
      const { rows } = await query('SELECT last4, saved_by, saved_at FROM department_credentials WHERE department_id = $1', [departmentId]);
      return view(rows[0]) ?? { configured: false };
    },

    async save({ departmentId, departmentName, token, savedBy }) {
      await ensureTable();
      const { rows } = await query(`
        INSERT INTO department_credentials (department_id, department_name, ciphertext, last4, saved_by, saved_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (department_id) DO UPDATE SET department_name = $2, ciphertext = $3, last4 = $4, saved_by = $5, saved_at = now()
        RETURNING last4, saved_by, saved_at`,
      [departmentId, departmentName, encrypt(token, key, departmentId), token.slice(-4), savedBy]);
      return view(rows[0]);
    },

    async remove(departmentId) {
      await ensureTable();
      const { rowCount } = await query('DELETE FROM department_credentials WHERE department_id = $1', [departmentId]);
      return rowCount > 0;
    },

    // Für den Abruf der Cevi-DB im Namen der Abteilung; nie an den Browser senden
    async reveal(departmentId) {
      await ensureTable();
      const { rows } = await query('SELECT ciphertext FROM department_credentials WHERE department_id = $1', [departmentId]);
      return rows[0] ? decrypt(rows[0].ciphertext, key, departmentId) : null;
    }
  };
}

const { databaseUrl, encryptionKey } = envConfig.credentials;
const key = parseKey(encryptionKey);
let pool;
function newPool() {
  const created = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  // Ein gekappter Leerlauf-Client (Neon schläft ein) darf den Prozess nicht beenden
  created.on('error', err => console.error('[Datenbank] Leerlauf-Verbindung verloren:', err.code || err.message));
  return created;
}
const query = databaseUrl
  ? (sql, params) => (pool ??= newPool()).query(sql, params)
  : null;

export const credentialStore = createCredentialStore({ query, key });
