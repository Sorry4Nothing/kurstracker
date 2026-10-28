import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installConsoleCapture, snapshot, resetSystemLog } from '../src/services/systemLog.js';

test('Systemlog: Konsolenausgaben landen mit Stufe und Präfix im Puffer, neueste zuerst', () => {
  installConsoleCapture();
  resetSystemLog();
  const original = console.warn;
  console.warn('[Sicherheit] 403 test akteur=p_1');
  console.error('ohne Präfix');
  const { entries } = snapshot();
  assert.deepEqual(entries.map(e => [e.level, e.source, e.message]), [
    ['error', 'System', 'ohne Präfix'],
    ['warn', 'Sicherheit', '403 test akteur=p_1']
  ]);
  assert.equal(console.warn, original, 'zweiter Aufruf von installConsoleCapture wickelt nicht erneut');
});

test('Systemlog: der Puffer behält höchstens 1000 Einträge', () => {
  resetSystemLog();
  for (let i = 0; i < 1200; i++) console.log(`[Test] ${i}`);
  const { entries, capacity } = snapshot(5000);
  assert.equal(entries.length, capacity);
  assert.equal(entries[0].message, '1199');
});
