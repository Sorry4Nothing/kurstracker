import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

// Konfiguration und Antworten in einem eigenen Node-Prozess prüfen: die Umgebung wird beim Laden gelesen.
// Leere Werte statt fehlender, damit eine lokale .env.local nicht hineinwirkt (dotenv überschreibt Gesetztes nicht).
function inChild(script, env) {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT,
      APP_ENV: '', NODE_ENV: '', APP_URL: '', COOKIE_SECURE: '', TRUST_PROXY: '', ALLOWED_HOSTS: '',
      CEVI_DB_CLIENT_ID: '', CEVI_DB_CLIENT_SECRET: '', CEVI_DB_SERVICE_TOKEN: '', DATABASE_URL: '',
      CEVI_DB_PREPARATION_MODE: 'true', SESSION_SECRET: 'p'.repeat(48),
      ...env
    }
  });
  return JSON.parse(out.trim().split('\n').pop());
}

const VALIDATE = "const { validateEnv } = await import('./src/config/env.js'); console.log(JSON.stringify(validateEnv()));";
const PRODUCTION = { APP_ENV: 'production', APP_URL: 'https://kurstracker.example', TRUST_PROXY: '1' };
const LIVE = { CEVI_DB_PREPARATION_MODE: 'false', CEVI_DB_CLIENT_ID: 'client_x', CEVI_DB_CLIENT_SECRET: 'secret_x' };

test('Produktion im Vorbereitungsmodus ist ein Konfigurationsfehler, kein Warnhinweis (#168)', () => {
  const prep = inChild(VALIDATE, PRODUCTION);
  assert.equal(prep.valid, false);
  assert.match(prep.errors.join(' '), /Vorbereitungsmodus ist aktiv/);

  // Fehlt nur die Client-ID, fällt die App still in den Vorbereitungsmodus zurück: auch das ist ein Fehler
  const noClient = inChild(VALIDATE, { ...PRODUCTION, CEVI_DB_PREPARATION_MODE: 'false' });
  assert.equal(noClient.valid, false);
  assert.match(noClient.errors.join(' '), /Vorbereitungsmodus ist aktiv/);

  assert.deepEqual(inChild(VALIDATE, { ...PRODUCTION, ...LIVE }).errors, []);
  // Lokal bleibt der Vorbereitungsmodus der Normalfall
  assert.equal(inChild(VALIDATE, {}).valid, true);
});

test('Produktion ohne gültige Anmeldung: kein Demo-Profil, auch wenn die Konfiguration trotzdem durchrutscht (#168)', () => {
  const probe = `
    const { app } = await import('./src/app.js');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const get = async path => (await fetch('http://127.0.0.1:' + server.address().port + path, { headers: { 'X-Forwarded-Proto': 'https' } }));
    console.log(JSON.stringify({ me: await (await get('/api/auth/me')).json(), planner: (await get('/api/planner/overview')).status, settings: (await get('/api/settings/cevi-db-key')).status }));
    server.close();
  `;
  const result = inChild(probe, PRODUCTION);
  assert.deepEqual(result, { me: { authenticated: false }, planner: 401, settings: 401 });
});

test('Bekannte Beispiel-Secrets aus der Git-Historie zählen nicht als gesetztes SESSION_SECRET (#175)', () => {
  for (const secret of [
    'change-this-to-a-secure-random-secret',
    'live-production-high-entropy-crypto-secret-key-32chars-min',
    'local-development-secret-key-cevi-tracker-9876543210',
    'dev-server-random-crypto-secret-replace-in-actual-environment'
  ]) {
    const result = inChild(VALIDATE, { ...PRODUCTION, ...LIVE, SESSION_SECRET: secret });
    assert.match(result.errors.join(' '), /SESSION_SECRET/, secret);
  }
});

// --- In-Prozess: Host-Allowlist und Header ------------------------------------------------------------------
process.env.APP_ENV = 'local';
process.env.CEVI_DB_PREPARATION_MODE = 'true';
process.env.CEVI_DB_SERVICE_TOKEN = '';
process.env.DATABASE_URL = '';
process.env.APP_URL = 'http://localhost:3000';
process.env.ALLOWED_HOSTS = 'lan.test.example';
const { app } = await import('../src/app.js');

let server;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
});
after(() => server.close());

// Roh anfragen, damit der Host-Header genau so ankommt, wie er geschrieben ist
const raw = (path, host) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port: server.address().port, path, headers: { host }, agent: false }, res => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  }).on('error', reject);
});

test('Host-Allowlist: fremde Namen (DNS-Rebinding) bekommen 421, erlaubte Namen durchgehen (#169)', async () => {
  for (const host of ['rebind.attacker.example', 'evil.example:3000', 'localhost.evil.example', '127.0.0.1.evil.example', 'exa mple']) {
    const res = await raw('/api/planner/overview', host);
    assert.equal(res.status, 421, `Host «${host}»`);
    assert.doesNotMatch(res.body, /group|members|id/i, `Host «${host}» liefert Daten`);
  }
  for (const host of [`127.0.0.1:${server.address().port}`, 'localhost:3000', 'LOCALHOST', '[::1]:3000', 'lan.test.example:3000']) {
    const res = await raw('/api/system/status', host);
    assert.equal(res.status, 200, `Host «${host}»`);
  }
});

test('Der Server verrät sein Framework nicht über X-Powered-By (#173)', async () => {
  const res = await raw('/api/system/status', 'localhost:3000');
  assert.equal(res.headers['x-powered-by'], undefined);
});
