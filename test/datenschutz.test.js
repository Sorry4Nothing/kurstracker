// Die Datenschutzerklärung (public/datenschutz.html) nennt alles, was der Code im Browser ablegt.
// Kommt ein Cookie oder ein Speicher-Schlüssel dazu, schlägt der Test fehl, bis die Erklärung nachgeführt ist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = file => readFileSync(file, 'utf8');
const sources = dir => readdirSync(join(ROOT, dir), { recursive: true })
  .filter(f => f.endsWith('.js'))
  .map(f => read(join(ROOT, dir, f)))
  .join('\n');
const notice = read(join(ROOT, 'public', 'datenschutz.html'));
const names = (text, pattern) => [...new Set([...text.matchAll(pattern)].map(m => m[1]))];

test('Datenschutzerklärung nennt jedes Cookie, das der Server setzt', () => {
  const cookies = names(sources('src'), /res\.cookie\(\s*'([^']+)'/g);
  assert.ok(cookies.length >= 2, 'keine Cookies gefunden: hat sich das Muster in src/ geändert?');
  assert.deepEqual(cookies.filter(name => !notice.includes(`<code>${name}</code>`)), []);
});

test('Datenschutzerklärung nennt jeden Schlüssel, den das Frontend im Browser speichert', () => {
  const keys = names(sources('public'), /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*'([^']+)'/g);
  assert.ok(keys.length >= 1, 'keine Speicher-Schlüssel gefunden: hat sich das Muster in public/ geändert?');
  assert.deepEqual(keys.filter(key => !notice.includes(`<code>${key}</code>`)), []);
});
