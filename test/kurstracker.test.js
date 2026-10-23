import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Vor dem Import setzen: env.js liest die Variablen beim Laden, dotenv überschreibt sie nicht
process.env.CEVI_DB_PREPARATION_MODE = 'true';
// Ein Service-Token aus .env.local lädt Kurse und Gruppe live; diese Tests laufen mit Testdaten
process.env.CEVI_DB_SERVICE_TOKEN = '';
const { courseTreeEngine } = await import('../src/domain/courseTreeEngine.js');
const { StufenleiterPlanningEngine } = await import('../src/domain/stufenleiterPlanningEngine.js');
const { app } = await import('../src/app.js');

const yearsAgo = (years) => `${new Date().getFullYear() - years}-01-01`;

test('GLK 3 allein gilt inklusive aller Vorstufen als absolviert', () => {
  const { nodes } = courseTreeEngine.evaluatePersonInTree({ birthdate: yearsAgo(25), completedCourses: ['glk3'] });
  for (const id of ['voku', 'heku', 'glk1', 'glk2', 'glk3']) {
    assert.equal(nodes[id].status, 'COMPLETED', id);
  }
  // Pioniertechnik verlangt GLK 1: wer GLK 1 übersprungen und GLK 3 hat, darf trotzdem
  assert.equal(nodes.pionier.status, 'AVAILABLE');
});

test('Heku, GLK 1 und GLK 2 sind Vorbereitung: GLK 3 ist ab 17 ohne sie bereit', () => {
  const { nodes } = courseTreeEngine.evaluatePersonInTree({ birthdate: yearsAgo(17), completedCourses: [] });
  for (const id of ['heku', 'glk1', 'glk2', 'glk3']) {
    assert.equal(nodes[id].status, 'AVAILABLE', id);
  }
  assert.equal(courseTreeEngine.evaluatePersonInTree({ birthdate: yearsAgo(16) }).nodes.glk3.status, 'LOCKED');
});

test('SLK allein schaltet GLK 3 und die Kaderstufe frei', () => {
  const { nodes } = courseTreeEngine.evaluatePersonInTree({
    birthdate: yearsAgo(25),
    completedCourses: ['slk'],
    qualifications: ['js_leiter_lst']
  });
  assert.equal(nodes.glk3.status, 'COMPLETED');
  assert.equal(nodes.llm.status, 'AVAILABLE');
});

test('fehlendes Geburtsdatum erfüllt kein Mindestalter', () => {
  const { nodes, personAge } = courseTreeEngine.evaluatePersonInTree({ completedCourses: ['glk3'] });
  assert.equal(personAge, null);
  assert.equal(nodes.slk.status, 'LOCKED');
  assert.match(nodes.slk.blockers.join(' '), /Geburtsdatum fehlt/);
  assert.equal(courseTreeEngine.findPathToTarget({}, 'voku').ageCheck.isFulfilled, false);
});

test('findPathToTarget: Vorstufen von GLK 3 sind Empfehlung in Kettenreihenfolge, keine Pflicht', () => {
  const result = courseTreeEngine.findPathToTarget({ birthdate: yearsAgo(14), completedCourses: ['heku'] }, 'glk');
  assert.equal(result.target.id, 'glk3');
  assert.deepEqual(result.pathSteps, []);
  assert.deepEqual(result.missingCourses, []);
  assert.deepEqual(result.recommendedSteps.map(s => s.id), ['voku', 'heku', 'glk1', 'glk2']);
  assert.deepEqual(result.missingRecommended.map(s => s.id), ['glk1', 'glk2']);
  assert.equal(result.summary,
    'Mindestalter (17 Jahre) noch nicht erreicht (aktuell: 14 Jahre). | ' +
    'Empfohlen vorher (keine Pflicht): Gruppenleiter/-innen-Kurs 1 (GLK 1) -> Gruppenleiter/-innen-Kurs 2 (GLK 2).');
});

test('findPathToTarget: herausgewachsene Vorstufen werden nicht mehr empfohlen', () => {
  const adult = courseTreeEngine.findPathToTarget({ birthdate: yearsAgo(25) }, 'glk3');
  assert.deepEqual(adult.recommendedSteps, []);
  assert.equal(adult.isDirectlyEligible, true);
  assert.doesNotMatch(adult.summary, /Empfohlen/);
  // 16: nur noch GLK 2 (recommendedAge 15 + 1 Jahr Toleranz), Voku bis GLK 1 sind vorbei
  const sixteen = courseTreeEngine.findPathToTarget({ birthdate: yearsAgo(16) }, 'glk3');
  assert.deepEqual(sixteen.missingRecommended.map(s => s.id), ['glk2']);
  // Ohne Geburtsdatum lässt sich nichts ausschliessen
  assert.deepEqual(courseTreeEngine.findPathToTarget({}, 'glk3').missingRecommended.map(s => s.id), ['voku', 'heku', 'glk1', 'glk2']);
});

test('findPathToTarget: Pflichtkurs GLK 3 vor der Kaderstufe', () => {
  const result = courseTreeEngine.findPathToTarget({ birthdate: yearsAgo(25), qualifications: ['js_leiter_lst'] }, 'llm');
  assert.deepEqual(result.missingCourses.map(s => s.id), ['glk3']);
  assert.deepEqual(result.missingRecommended, []);
  assert.equal(result.isDirectlyEligible, false);
  assert.equal(result.summary, 'Noch 1 Kurs(e) notwendig: Gruppenleiter/-innen-Kurs 3 (GLK 3)');
});

test('summaryStats zählt Heku- und GLK-Kandidaten', () => {
  const engine = new StufenleiterPlanningEngine();
  const { summaryStats } = engine.analyzeGroup([
    { id: 'a', birthdate: yearsAgo(15), completedCourses: [] },
    { id: 'b', birthdate: yearsAgo(17), completedCourses: ['hlk'] }
  ]);
  assert.equal(summaryStats.readyForHlk, 1);
  assert.equal(summaryStats.readyForGlk, 1);
});

let baseUrl;
let server;

before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('Planer: Vorschlag speichern und in der Übersicht sehen', async () => {
  const propose = await fetch(`${baseUrl}/api/planner/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'tn_2', targetCourseId: 'glk3', notes: 'Test' })
  });
  assert.equal(propose.status, 200);
  assert.equal((await propose.json()).proposal.courseId, 'glk3');

  const overview = await (await fetch(`${baseUrl}/api/planner/overview`)).json();
  assert.ok(overview.nominations.some(n => n.participantId === 'tn_2'));
  assert.ok(overview.analysis.summaryStats.readyForGlk >= 1);
});

test('Planer: ungültiger Zielkurs gibt 400', async () => {
  const res = await fetch(`${baseUrl}/api/planner/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'tn_2', targetCourseId: 'constructor' })
  });
  assert.equal(res.status, 400);
});

test('unbekannte API-Route gibt JSON-404 statt index.html', async () => {
  const res = await fetch(`${baseUrl}/api/gibt-es-nicht`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'API-Route nicht gefunden');
});

test('OAuth-Callback ohne passenden state wird abgewiesen', async () => {
  const res = await fetch(`${baseUrl}/api/auth/callback?code=mock_auth_code_cevi&state=abc`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/?error=invalid_state');
  assert.ok(!res.headers.get('set-cookie')?.includes('cevi_session_id'));
});
