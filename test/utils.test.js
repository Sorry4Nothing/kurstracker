import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseError, errorText } from '../public/js/utils.js';

const reply = (status, body) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

test('Fehlermeldung: 5xx nennt nie den Text des Servers, sondern eine verständliche Meldung', async () => {
  // Der Server nennt bei 502 den Pfad der Cevi-DB: das gehört nicht in die Ansicht
  const bad = await responseError(reply(502, { error: 'Cevi-DB Abruf fehlgeschlagen (500): /api/people?fields[people]=first_name' }));
  assert.equal(bad.message, 'Die Cevi-DB antwortet nicht. Bitte versuche es später erneut.');
  assert.match((await responseError(reply(500, 'Interner Fehler'))).message, /^Der Server meldet einen Fehler \(500\)/);
});

test('Fehlermeldung: bei 4xx gilt die Meldung des Servers, sonst eine feste Meldung', async () => {
  assert.equal((await responseError(reply(400, { error: 'Bei einer manuellen Auswahl braucht es eine Bemerkung.' }))).message, 'Bei einer manuellen Auswahl braucht es eine Bemerkung.');
  assert.equal((await responseError(reply(403, 'kein JSON'))).message, 'Dafür fehlt dir die Berechtigung.');
  assert.equal((await responseError(reply(401, {}))).message, 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.');
});

test('Fehlermeldung: ein abgebrochener Abruf heisst «keine Verbindung», nicht «Failed to fetch»', () => {
  assert.match(errorText(new TypeError('Failed to fetch')), /^Keine Verbindung zum Kurstracker/);
  assert.equal(errorText(new Error('Dafür fehlt dir die Berechtigung.')), 'Dafür fehlt dir die Berechtigung.');
});
