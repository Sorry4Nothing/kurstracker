import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

// Die Konfiguration wird beim Laden gelesen: jede Variante startet die App in einem eigenen Node-Prozess
// und meldet Status, Location, Set-Cookie, HSTS und Body einer einzigen Anfrage als JSON-Zeile.
const PROBE = `
const { app } = await import('./src/app.js');
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const res = await fetch('http://127.0.0.1:' + server.address().port + process.env.PROBE_PATH, {
  redirect: 'manual',
  headers: JSON.parse(process.env.PROBE_HEADERS || '{}')
});
console.log(JSON.stringify({
  status: res.status,
  location: res.headers.get('location'),
  cookies: res.headers.getSetCookie(),
  hsts: res.headers.get('strict-transport-security'),
  body: await res.text()
}));
server.close();
`;

function probe(env, path, headers = {}) {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], {
    cwd: projectRoot,
    encoding: 'utf8',
    // Leere Werte statt fehlender: dotenv überschreibt gesetzte Variablen nicht, eine lokale .env.local wirkt so nicht hinein
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      APP_ENV: '',
      NODE_ENV: '',
      APP_URL: '',
      COOKIE_SECURE: '',
      TRUST_PROXY: '',
      CEVI_DB_PREPARATION_MODE: 'true',
      PROBE_PATH: path,
      PROBE_HEADERS: JSON.stringify(headers),
      ...env
    }
  });
  // dotenv schreibt eine Hinweiszeile vor die eigentliche Ausgabe
  return JSON.parse(out.trim().split('\n').pop());
}

const PRODUCTION = {
  APP_ENV: 'production',
  SESSION_SECRET: 'p'.repeat(48),
  APP_URL: 'https://kurstracker.example',
  TRUST_PROXY: '1'
};

test('Cookies tragen Secure, sobald die App per HTTPS erreichbar ist, auch ausserhalb Produktion (#51)', () => {
  const https = probe({ APP_URL: 'https://dev.kurstracker.example' }, '/api/auth/login');
  assert.ok(https.cookies.length > 0, 'kein Cookie gesetzt');
  for (const cookie of https.cookies) assert.match(cookie, /;\s*Secure/i, cookie);

  const http = probe({ APP_URL: 'http://localhost:3000' }, '/api/auth/login');
  for (const cookie of http.cookies) assert.doesNotMatch(cookie, /;\s*Secure/i, cookie);
});

test('Produktion hinter Proxy: HTTP wird auf die HTTPS-Adresse aus APP_URL umgeleitet, HTTPS bekommt HSTS (#43)', () => {
  const plain = probe(PRODUCTION, '/api/system/status?x=1', { 'X-Forwarded-Proto': 'http' });
  assert.equal(plain.status, 308);
  assert.equal(plain.location, 'https://kurstracker.example/api/system/status?x=1');

  const secure = probe(PRODUCTION, '/api/system/status', { 'X-Forwarded-Proto': 'https' });
  assert.equal(secure.status, 200);
  assert.match(secure.hsts, /max-age=31536000/);

  // Weder Host-Header noch ein Pfad wie "//fremd" lenken die Umleitung auf eine fremde Seite
  const foreign = probe(PRODUCTION, '//boese.example/x', { 'X-Forwarded-Proto': 'http', Host: 'boese.example' });
  assert.equal(foreign.status, 308);
  assert.ok(foreign.location.startsWith('https://kurstracker.example/'), foreign.location);
});

test('Ohne TRUST_PROXY leitet Produktion nicht um (sonst Endlosschleife hinter einem TLS-Proxy)', () => {
  const res = probe({ ...PRODUCTION, TRUST_PROXY: '' }, '/api/system/status', { 'X-Forwarded-Proto': 'http' });
  assert.equal(res.status, 200);
});

test('API-Output nur lokal und in development: nur dort meldet der Systemstatus appEnv', () => {
  // Das Frontend blendet den Tab API-Output erst ein, wenn der Status appEnv enthält (public/js/system.js)
  const appEnv = env => JSON.parse(probe(env, '/api/system/status', { 'X-Forwarded-Proto': 'https' }).body).appEnv;
  assert.equal(appEnv({ APP_ENV: 'local' }), 'local');
  assert.equal(appEnv({ APP_ENV: 'development' }), 'development');
  assert.equal(appEnv(PRODUCTION), undefined);
  // Ohne APP_ENV zählt NODE_ENV=production als Produktion
  assert.equal(appEnv({ ...PRODUCTION, APP_ENV: '', NODE_ENV: 'production' }), undefined);
});
