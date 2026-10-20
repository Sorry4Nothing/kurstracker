import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Vor dem Import setzen: env.js liest die Variablen beim Laden, dotenv überschreibt sie nicht
process.env.CEVI_DB_PREPARATION_MODE = 'true';
const { courseTreeEngine } = await import('../src/domain/courseTreeEngine.js');
const { StufenleiterPlanningEngine } = await import('../src/domain/stufenleiterPlanningEngine.js');
const { app } = await import('../src/app.js');

const yearsAgo = (years) => `${new Date().getFullYear() - years}-01-01`;

test('GLK 3 allein gilt inklusive aller Pflicht-Vorgänger als absolviert', () => {
  const { nodes } = courseTreeEngine.evaluatePersonInTree({ birthdate: yearsAgo(25), completedCourses: ['glk3'] });
  for (const id of ['heku', 'glk1', 'glk2', 'glk3']) {
    assert.equal(nodes[id].status, 'COMPLETED', id);
  }
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

test('findPathToTarget liefert die fehlenden Schritte in pathSteps', () => {
  const result = courseTreeEngine.findPathToTarget({ birthdate: yearsAgo(25), completedCourses: ['heku'] }, 'glk');
  assert.equal(result.target.id, 'glk3');
  assert.deepEqual(result.pathSteps.map(s => s.id).sort(), ['glk1', 'glk2', 'heku']);
  assert.deepEqual(result.missingCourses.map(s => s.id).sort(), ['glk1', 'glk2']);
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
