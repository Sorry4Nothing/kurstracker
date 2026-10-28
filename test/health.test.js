import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

// DATABASE_URL wird beim Laden gelesen: die App startet in einem eigenen Node-Prozess und ruft /api/health einmal ab
const PROBE = `
const { app } = await import('./src/app.js');
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const res = await fetch('http://127.0.0.1:' + server.address().port + '/api/health');
console.log(JSON.stringify({ status: res.status, body: await res.text() }));
server.close();
`;

test('Health-Check: unerreichbare Datenbank gibt 503 und verrät weder Zugangsdaten noch Host (#32)', () => {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], {
    cwd: projectRoot,
    encoding: 'utf8',
    // Port 1 lehnt die Verbindung sofort ab; leere Werte statt fehlender, damit .env.local nicht hineinwirkt
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      APP_ENV: '',
      NODE_ENV: '',
      CEVI_DB_PREPARATION_MODE: 'true',
      CEVI_DB_SERVICE_TOKEN: '',
      DATABASE_URL: 'postgres://geheimer_nutzer:geheimes_passwort@127.0.0.1:1/kurstracker'
    },
    stdio: ['ignore', 'pipe', 'ignore']
  });
  const res = JSON.parse(out.trim().split('\n').pop());
  assert.equal(res.status, 503);
  assert.deepEqual(JSON.parse(res.body), { status: 'degraded', database: 'fehler' });
  assert.ok(!res.body.includes('geheim') && !res.body.includes('127.0.0.1'));
});
