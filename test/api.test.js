import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Vor dem Import setzen: env.js liest die Variablen beim Laden, dotenv überschreibt sie nicht
process.env.CEVI_DB_PREPARATION_MODE = 'true';
// Alle Tests laufen von derselben IP: das Anmelde-Limit hier anheben, der 429-Test am Dateiende zählt bis dahin weiter
process.env.RATE_LIMIT_AUTH_MAX = '200';
const { app, logSafe } = await import('../src/app.js');
const { ceviDbService } = await import('../src/services/ceviDbService.js');
const { envConfig } = await import('../src/config/env.js');
const { COURSE_NODES } = await import('../src/domain/courseTreeData.js');

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
// Eigene Referenz: einzelne Tests ersetzen globalThis.fetch, um die Cevi-DB zu simulieren
const httpFetch = globalThis.fetch;

let baseUrl;
let server;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function request(path, { method = 'GET', cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return httpFetch(baseUrl + path, {
    method,
    headers,
    redirect: 'manual',
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

// Set-Cookie-Zeile eines Cookies, z.B. "cevi_session_id=s%3A...; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax"
const setCookieLine = (res, name) => res.headers.getSetCookie().find(line => line.startsWith(`${name}=`));
// "name=wert" für den Cookie-Header
const cookiePair = line => line.split(';')[0];

// Startet den Login: Weiterleitungsziel, state daraus und das zugehörige state-Cookie
async function startLogin() {
  const res = await request('/api/auth/login');
  const location = new URL(res.headers.get('location'), baseUrl);
  return { res, location, state: location.searchParams.get('state'), cookie: cookiePair(setCookieLine(res, 'cevi_oauth_state')) };
}

// Live-Modus mit simulierter Cevi-DB (Token-Tausch und Userinfo ohne Netzwerk); login(user) liefert die Set-Cookie-Zeile der Session
function useLiveCeviDb(t) {
  let currentUser;
  t.mock.method(ceviDbService, 'isPreparationMode', () => false);
  t.mock.method(ceviDbService, 'exchangeCodeForToken', async code => ({ access_token: `live_${code}` }));
  t.mock.method(ceviDbService, 'getUserInfo', async () => currentUser);
  return async user => {
    currentUser = user;
    const { state, cookie } = await startLogin();
    const res = await request(`/api/auth/callback?code=abc&state=${state}`, { cookie });
    assert.equal(res.headers.get('location'), '/?login=success');
    return setCookieLine(res, 'cevi_session_id');
  };
}

// Neuester Git-Tag wie in src/app.js, ohne Tag oder ohne Git null
function latestGitTag() {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim() || null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Profil und Daten im Vorbereitungsmodus
// -----------------------------------------------------------------------------

test('API: ohne Session ist das Demo-Profil mit Planerzugriff aktiv', async () => {
  const res = await request('/api/auth/me');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    authenticated: true,
    user: ceviDbService.getMockUser(),
    isMock: true,
    canUsePlanner: true
  });
});

test('API: Kurse, Historie und Qualifikationen kommen im Vorbereitungsmodus aus den Testdaten, ohne Abruf der Cevi-DB', async (t) => {
  const fetchList = t.mock.method(ceviDbService, 'fetchList');
  const expected = {
    '/api/courses': ceviDbService.getMockCourses(),
    '/api/user/history': ceviDbService.getMockParticipations(),
    '/api/user/qualifications': ceviDbService.getMockQualifications()
  };
  for (const [path, data] of Object.entries(expected)) {
    const res = await request(path);
    assert.equal(res.status, 200, path);
    assert.deepEqual(await res.json(), data, path);
  }
  assert.equal(fetchList.mock.callCount(), 0);
});

test('API: Kurse und Historie verweisen nur auf Kurse im Baum, Qualifikationen nur auf vergebene', async () => {
  const structure = await request('/api/tree/structure');
  assert.equal(structure.status, 200);
  const { nodes } = await structure.json();
  assert.deepEqual(Object.keys(nodes).sort(), Object.keys(COURSE_NODES).sort());
  const known = id => Object.hasOwn(nodes, id);

  for (const course of await (await request('/api/courses')).json()) {
    assert.ok(known(course.course_node_id), `${course.id}: unbekannter Kurs ${course.course_node_id}`);
    // Das Kursangebot rendert und durchsucht diese Felder als Text
    for (const key of ['title', 'code', 'category', 'status', 'organizer', 'location', 'description']) {
      assert.equal(typeof course[key], 'string', `${course.id}.${key}`);
    }
    assert.ok(course.registration_deadline <= course.start_date && course.start_date <= course.end_date, `${course.id}: Datumsfolge`);
  }
  for (const participation of await (await request('/api/user/history')).json()) {
    assert.ok(known(participation.course_node_id), `${participation.id}: unbekannter Kurs ${participation.course_node_id}`);
  }
  const granted = new Set(Object.values(nodes).flatMap(node => node.grantsQualifications));
  for (const qualification of await (await request('/api/user/qualifications')).json()) {
    assert.ok(granted.has(qualification.key), `${qualification.id}: ${qualification.key} vergibt kein Kurs`);
    assert.equal(typeof qualification.status, 'string', qualification.id);
  }
});

// -----------------------------------------------------------------------------
// Ausbildungsbaum
// -----------------------------------------------------------------------------

test('API: Baumbewertung übernimmt absolvierte und angemeldete Kurse sowie Qualifikationen aus dem Profil', async () => {
  const res = await request('/api/tree/evaluation');
  assert.equal(res.status, 200);
  const { person, evaluation } = await res.json();
  for (const participation of ceviDbService.getMockParticipations()) {
    const expected = { completed: 'COMPLETED', in_progress: 'IN_PROGRESS' }[participation.status];
    assert.equal(evaluation.nodes[participation.course_node_id].status, expected, participation.course_node_id);
  }
  assert.deepEqual([...person.qualifications].sort(), ceviDbService.getMockQualifications().map(q => q.key).sort());
  assert.equal(person.birthdate, ceviDbService.getMockUser().birthday);
  assert.equal(typeof evaluation.personAge, 'number');
});

test('API: nicht bestandener Kurs zählt nicht als absolviert', {
  todo: 'Bug #52: resolveActivePerson zählt result "Nicht bestanden" als bestanden, weil nur auf includes("bestanden") geprüft wird (src/app.js:240)'
}, async (t) => {
  t.mock.method(ceviDbService, 'getMockParticipations', () => [
    { id: 'p1', course_node_id: 'glk1', status: 'failed', result: 'Nicht bestanden', certificate_issued: false }
  ]);
  const { person, evaluation } = await (await request('/api/tree/evaluation')).json();
  assert.deepEqual(person.completedCourses, []);
  assert.notEqual(evaluation.nodes.glk1.status, 'COMPLETED');
});

test('API: Pfad rechnet mit dem Profil der Session und löst Schreibweise und Aliase auf', async () => {
  const { evaluation } = await (await request('/api/tree/evaluation')).json();
  const res = await request('/api/tree/path/EXPERTE');
  assert.equal(res.status, 200);
  const path = await res.json();
  assert.equal(path.target.id, 'experte');
  assert.ok(path.pathSteps.length > 0);
  for (const step of path.pathSteps) {
    assert.equal(step.isCompleted, evaluation.nodes[step.id].status === 'COMPLETED', step.id);
  }
  assert.equal((await (await request('/api/tree/path/glk')).json()).target.id, 'glk3');
});

test('API: Pfad zu unbekanntem Kurs oder Prototyp-Schlüssel liefert einen JSON-Fehler', async () => {
  for (const id of ['gibt_es_nicht', 'constructor', '__proto__']) {
    const res = await request(`/api/tree/path/${id}`);
    assert.ok(res.status >= 400, id);
    assert.match((await res.json()).error, /existiert nicht im Ausbildungsbaum/, id);
  }
});

test('API: Pfad zu unbekanntem Kurs ist ein Client-Fehler (404), kein Serverfehler (#53)', async () => {
  const res = await request('/api/tree/path/gibt_es_nicht');
  assert.equal(res.status, 404);
});

// -----------------------------------------------------------------------------
// Stufenleiter-Planer
// -----------------------------------------------------------------------------

test('API: Planer-Übersicht analysiert die ganze Demo-Gruppe und meldet den J+S-Verfall', async () => {
  const res = await request('/api/planner/overview');
  assert.equal(res.status, 200);
  const { group, analysis, nominations } = await res.json();
  assert.ok(group.length > 0);
  assert.equal(analysis.totalCount, group.length);
  assert.deepEqual(analysis.analyzedParticipants.map(a => a.participant.id), group.map(p => p.id));
  assert.ok(Array.isArray(nominations));
  for (const key of ['readyForHlk', 'readyForGlk', 'readyForSlk', 'urgentRenewalCount']) {
    assert.equal(typeof analysis.summaryStats[key], 'number', key);
  }
  // tn_3: J+S-Anerkennung läuft am 30.11.2026 ab, das Fortbildungsmodul steht dringend zuoberst
  const expiring = analysis.analyzedParticipants.find(a => a.participant.id === 'tn_3');
  assert.equal(expiring.recommendedCourses[0].courseId, 'mf_lst');
  assert.equal(expiring.recommendedCourses[0].priority, 'DRINGEND');
  assert.deepEqual(analysis.urgentRenewals.map(u => u.participant.id), ['tn_3']);
});

test('API: Vorschlag kürzt lange Freitexte, meldet die Eignung und erscheint in der Übersicht', async () => {
  const res = await request('/api/planner/propose', {
    method: 'POST',
    body: { personId: 'tn_5', targetCourseId: 'llm', proposedSeason: 'S'.repeat(80), notes: 'N'.repeat(600), proposedBy: 'P'.repeat(150) }
  });
  assert.equal(res.status, 200);
  const { success, proposal, pathCheck } = await res.json();
  assert.equal(success, true);
  assert.deepEqual([proposal.season.length, proposal.notes.length, proposal.plannedBy.length], [50, 500, 100]);
  // tn_5 ist über 19, hat GLK 3 und die J+S-Anerkennung: direkt fürs Lagerleiter-Modul geeignet
  assert.equal(proposal.isEligibleNow, true);
  assert.equal(pathCheck.isDirectlyEligible, true);

  const overview = await (await request('/api/planner/overview')).json();
  const person = overview.analysis.analyzedParticipants.find(a => a.participant.id === 'tn_5');
  assert.equal(person.activeNomination.courseId, 'llm');
});

test('API: abgewiesene Vorschläge (unbekannte Person, fehlender oder ungültiger Kurs) werden nicht gespeichert', async () => {
  const countNominations = async () => (await (await request('/api/planner/overview')).json()).nominations.length;
  const countBefore = await countNominations();
  const cases = [
    [{ personId: 'tn_x', targetCourseId: 'glk3' }, 404, 'Person nicht gefunden'],
    [{ personId: 'tn_1' }, 400, 'Ungültiger Zielkurs'],
    [{ personId: 'tn_1', targetCourseId: 42 }, 400, 'Ungültiger Zielkurs'],
    [{ personId: 'tn_1', targetCourseId: '__proto__' }, 400, 'Ungültiger Zielkurs'],
    [{ personId: 'tn_1', targetCourseId: 'glk4' }, 400, 'Ungültiger Zielkurs']
  ];
  for (const [body, status, error] of cases) {
    const res = await request('/api/planner/propose', { method: 'POST', body });
    assert.equal(res.status, status, JSON.stringify(body));
    assert.deepEqual(await res.json(), { error }, JSON.stringify(body));
  }
  assert.equal(await countNominations(), countBefore);
});

// -----------------------------------------------------------------------------
// System und Routing
// -----------------------------------------------------------------------------

test('API: Systemstatus meldet Vorbereitungsmodus, Version nur mit Git-Tag und verrät keine Secrets', async () => {
  const res = await request('/api/system/status');
  assert.equal(res.status, 200);
  const status = await res.json();
  assert.equal(status.status, 'online');
  assert.equal(status.version, latestGitTag());
  assert.equal(status.preparationMode, true);
  assert.equal(status.ceviDbStatus.message, 'Vorbereitungsmodus (Testdaten)');
  assert.ok(status.configValidation.warnings.some(w => w.startsWith('VORBEREITUNGSMODUS')));
  assert.ok(Math.abs(Date.parse(status.timestamp) - Date.now()) < 60_000);

  const body = JSON.stringify(status);
  const secrets = [envConfig.auth.sessionSecret, envConfig.ceviDb.clientSecret, envConfig.ceviDb.serviceToken].filter(s => s.length >= 8);
  assert.ok(secrets.every(secret => !body.includes(secret)), 'Systemstatus enthält ein Secret');
});

test('API: falsche Methode oder nackter /api-Pfad gibt JSON-404 statt index.html', async () => {
  for (const [method, path] of [['POST', '/api/courses'], ['DELETE', '/api/planner/propose'], ['GET', '/api']]) {
    const res = await request(path, { method });
    assert.equal(res.status, 404, `${method} ${path}`);
    assert.deepEqual(await res.json(), { error: 'API-Route nicht gefunden' });
  }
});

test('Statisch: Startseite und App-Pfade liefern index.html, Module und Styles mit passendem Typ', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const path of ['/', '/planer', '/profil/qualifikationen']) {
    const res = await request(path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type'), /^text\/html/, path);
    assert.equal(await res.text(), index, path);
  }
  for (const [path, type] of [['/app.js', /javascript/], ['/js/tree-map.js', /javascript/], ['/style.css', /^text\/css/]]) {
    const res = await request(path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type'), type, path);
  }
});

test('Statisch: Quellcode und Umgebungsdateien werden nie ausgeliefert', async () => {
  for (const path of ['/.env.local', '/.env', '/package.json', '/src/app.js', '/src/config/env.js']) {
    const body = await (await request(path)).text();
    // Eigene Meldung, damit ein Fehlschlag keine Secrets ins Log schreibt
    assert.doesNotMatch(body, /SESSION_SECRET|process\.env|"dependencies"/, `${path} wird ausgeliefert`);
  }
});

// -----------------------------------------------------------------------------
// Login, Session und Zugriffsschutz
// -----------------------------------------------------------------------------

test('Login: signiertes, kurzlebiges state-Cookie passend zur Weiterleitung, Mock-Login führt zurück zur App', async () => {
  const { res, location, state } = await startLogin();
  assert.equal(res.status, 302);
  assert.equal(location.pathname, '/api/auth/mock-login');
  const line = setCookieLine(res, 'cevi_oauth_state');
  assert.match(line, /Max-Age=600(;|$)/);
  assert.match(line, /HttpOnly/);
  assert.match(line, /SameSite=Lax/);
  assert.ok(decodeURIComponent(cookiePair(line)).startsWith(`cevi_oauth_state=s:${state}.`), 'state-Cookie ist nicht signiert oder passt nicht');
  assert.notEqual((await startLogin()).state, state);

  const mockLogin = await request(location.pathname + location.search);
  assert.equal(mockLogin.status, 302);
  assert.equal(mockLogin.headers.get('location'), '/?login=success');
});

test('OAuth-Callback: Abbruch, fehlender Code und Vorbereitungsmodus führen ohne Session zurück und löschen das state-Cookie', async (t) => {
  t.mock.method(console, 'error', () => {});
  // Jeder Fall mit eigenem Login: ein State ist serverseitig nur einmal einlösbar
  const cases = [
    // Anbieter-Text bleibt im Log; der Client sieht nur den festen Code (keine fremden Inhalte in der URL)
    [() => `error=access_denied&error_description=${encodeURIComponent('Zugriff verweigert')}`, '/?error=provider_error'],
    [state => `state=${state}`, '/?error=missing_code'],
    [state => `state=${state}&code=abc`, '/?error=preparation_mode']
  ];
  for (const [buildQuery, location] of cases) {
    const { state, cookie } = await startLogin();
    const query = buildQuery(state);
    const res = await request(`/api/auth/callback?${query}`, { cookie });
    assert.equal(res.status, 302, query);
    assert.equal(res.headers.get('location'), location, query);
    assert.match(setCookieLine(res, 'cevi_oauth_state'), /Expires=Thu, 01 Jan 1970/, query);
    assert.equal(setCookieLine(res, 'cevi_session_id'), undefined, query);
  }
});

test('OAuth-Callback: fehlender state sowie state-Cookie mit falscher oder ohne Signatur werden abgewiesen', async () => {
  // Ohne state und ohne state-Cookie sind beide Seiten leer: das darf nicht als passender state durchgehen
  assert.equal((await request('/api/auth/callback?code=abc')).headers.get('location'), '/?error=invalid_state');

  const { state, cookie } = await startLogin();
  for (const forged of [cookie.replace(/\.[^.]+$/, '.falsch'), `cevi_oauth_state=${state}`]) {
    const res = await request(`/api/auth/callback?state=${state}&code=abc`, { cookie: forged });
    assert.equal(res.headers.get('location'), '/?error=invalid_state', forged);
  }
});

test('Live-Login: leitet zur Cevi-DB-Autorisierung mit Client-ID, Redirect-URI, Scopes und state', async (t) => {
  t.mock.method(ceviDbService, 'isPreparationMode', () => false);
  const { location, state } = await startLogin();
  assert.equal(location.origin + location.pathname, `${ceviDbService.baseUrl}/oauth/authorize`);
  assert.equal(location.searchParams.get('client_id'), envConfig.ceviDb.clientId);
  assert.equal(location.searchParams.get('redirect_uri'), envConfig.ceviDb.redirectUri);
  assert.equal(location.searchParams.get('response_type'), 'code');
  assert.equal(location.searchParams.get('scope'), envConfig.ceviDb.scopes);
  assert.ok(state);
});

test('OAuth-Callback: fehlgeschlagener Token-Tausch legt keine Session an', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(ceviDbService, 'isPreparationMode', () => false);
  t.mock.method(ceviDbService, 'exchangeCodeForToken', async () => { throw new Error('Token abgelehnt'); });
  const { state, cookie } = await startLogin();
  const res = await request(`/api/auth/callback?code=abc&state=${state}`, { cookie });
  // Interne Fehlertexte gehören nicht in die URL: fester Code statt err.message
  assert.equal(res.headers.get('location'), '/?error=callback_failed');
  assert.equal(setCookieLine(res, 'cevi_session_id'), undefined);
});

test('Live-Login: Session-Cookie ist signiert, httpOnly, 7 Tage gültig und trägt das Cevi-DB-Profil', async (t) => {
  const login = useLiveCeviDb(t);
  const user = { id: 'p_1', first_name: 'Mia', last_name: 'Muster', roles: ['Mitglied'] };
  const line = await login(user);
  assert.match(line, /Max-Age=604800(;|$)/);
  assert.match(line, /HttpOnly/);
  assert.match(line, /SameSite=Lax/);
  assert.equal(/;\s*Secure/i.test(line), envConfig.auth.cookieSecure);
  assert.ok(decodeURIComponent(cookiePair(line)).startsWith('cevi_session_id=s:'), 'Session-Cookie ist nicht signiert');
  assert.equal(ceviDbService.exchangeCodeForToken.mock.calls[0].arguments[0], 'abc');
  assert.equal(ceviDbService.getUserInfo.mock.calls[0].arguments[0], 'live_abc');

  const me = await (await request('/api/auth/me', { cookie: cookiePair(line) })).json();
  assert.deepEqual(me, { authenticated: true, user, isMock: false, canUsePlanner: false });
});

test('Live-Login: Planer ist ohne Leitungsrolle gesperrt, Stufenleiterin hat Zugriff', async (t) => {
  const login = useLiveCeviDb(t);
  const member = cookiePair(await login({ id: 'p_2', first_name: 'Tim', roles: ['Mitglied', 'J+S Leiter LS/T'] }));
  for (const [path, method, body] of [
    ['/api/planner/overview', 'GET'],
    ['/api/planner/propose', 'POST', { personId: 'tn_1', targetCourseId: 'heku' }]
  ]) {
    const res = await request(path, { method, body, cookie: member });
    assert.equal(res.status, 403, path);
    assert.deepEqual(await res.json(), { error: 'Kein Zugriff auf den Stufenleiter-Planer' });
  }

  const leader = cookiePair(await login({ id: 'p_3', first_name: 'Ida', roles: ['Stufenleiterin Jungschar'] }));
  assert.equal((await request('/api/planner/overview', { cookie: leader })).status, 200);
});

test('Logout: nur per POST, beendet die Session serverseitig und löscht das Cookie', async (t) => {
  const login = useLiveCeviDb(t);
  const cookie = cookiePair(await login({ id: 'p_4', first_name: 'Ida', roles: [] }));

  assert.equal((await request('/api/auth/logout', { cookie })).status, 404);
  assert.equal((await (await request('/api/auth/me', { cookie })).json()).user.id, 'p_4');

  const res = await request('/api/auth/logout', { method: 'POST', cookie });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true });
  assert.match(setCookieLine(res, 'cevi_session_id'), /Expires=Thu, 01 Jan 1970/);

  // Altes Cookie erneut gesendet: die Session ist serverseitig weg; im Live-Modus ist man damit abgemeldet
  const me = await (await request('/api/auth/me', { cookie })).json();
  assert.deepEqual(me, { authenticated: false });
});

test('Session: Cookie mit falscher Signatur oder ohne Signatur wird ignoriert', async (t) => {
  const login = useLiveCeviDb(t);
  const signed = cookiePair(await login({ id: 'p_5', roles: [] }));
  const sessionId = decodeURIComponent(signed).split(':')[1].split('.')[0];
  for (const cookie of [signed.replace(/\.[^.]+$/, '.falsch'), `cevi_session_id=${sessionId}`]) {
    // Gefälschte Cookies zählen im Live-Modus als nicht angemeldet, nie als Demo-Profil
    assert.deepEqual(await (await request('/api/auth/me', { cookie })).json(), { authenticated: false }, cookie);
  }
  assert.equal((await (await request('/api/auth/me', { cookie: signed })).json()).user.id, 'p_5');
});

test('Live-Modus: Daten kommen gefiltert von der Cevi-DB, Fehler werden als 401/502 gemeldet statt mit Testdaten', async (t) => {
  const login = useLiveCeviDb(t);
  const cookie = cookiePair(await login({ id: 'p_6', roles: [] }));
  let reply = () => Response.json({ data: [{ id: '7', type: 'events', attributes: { name: 'GLK 3 Herbst' } }] });
  const remote = t.mock.method(globalThis, 'fetch', async () => reply());

  // Ohne Login gibt es im Live-Modus keinen Zugriff und keinen Abruf der Cevi-DB
  const anon = await request('/api/courses');
  assert.equal(anon.status, 401);
  assert.deepEqual(await anon.json(), { error: 'Nicht angemeldet' });
  assert.equal(remote.mock.callCount(), 0);

  const courses = await request('/api/courses', { cookie });
  assert.equal(courses.status, 200);
  assert.deepEqual(await courses.json(), [{ id: '7', name: 'GLK 3 Herbst' }]);
  const [url, init] = remote.mock.calls[0].arguments;
  assert.equal(url, `${ceviDbService.baseUrl}/api/events?filter[type]=Course`);
  assert.equal(init.headers.Authorization, 'Bearer live_abc');

  // Teilnahmen nur der eingeloggten Person abfragen
  await request('/api/user/history', { cookie });
  assert.equal(remote.mock.calls[1].arguments[0], `${ceviDbService.baseUrl}/api/event_participations?filter[person_id]=p_6`);

  for (const [upstream, expected] of [[401, 401], [500, 502]]) {
    reply = () => new Response('Fehler', { status: upstream });
    const res = await request('/api/courses', { cookie });
    assert.equal(res.status, expected, `Cevi-DB ${upstream}`);
    assert.match((await res.json()).error, /Cevi-DB Abruf fehlgeschlagen/);
  }
});

// -----------------------------------------------------------------------------
// Härtung: Header, CSRF-Schutz, Fehlerbehandlung, Rate Limit (Issue #18, Audit #19)
// -----------------------------------------------------------------------------

test('Security-Header stehen auf Seiten und API, personenbezogene JSON-Antworten sind no-store', async () => {
  for (const path of ['/', '/api/system/status']) {
    const res = await request(path);
    assert.ok(res.headers.get('content-security-policy').includes("default-src 'self'"), path);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
    // HSTS gehört zu HTTPS: lokal (ohne TLS) darf der Header nicht gesetzt sein
    assert.equal(res.headers.get('strict-transport-security'), null, path);
  }
  assert.equal((await request('/api/auth/me')).headers.get('cache-control'), 'no-store');
});

test('CSRF-Schutz: Schreibzugriffe mit fremder Herkunft werden abgelehnt, eigene und headerlose nicht', async () => {
  const foreign = await httpFetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { Origin: 'https://boese.example' } });
  assert.equal(foreign.status, 403);
  assert.deepEqual(await foreign.json(), { error: 'Anfrage von fremder Herkunft abgelehnt' });

  const foreignReferer = await httpFetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { Referer: 'https://boese.example/seite' } });
  assert.equal(foreignReferer.status, 403);

  // Eigene Herkunft (Browser gleicher Origin) und Clients ohne Origin/Referer (curl, Tests) bleiben erlaubt
  const own = await httpFetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { Origin: baseUrl } });
  assert.equal(own.status, 200);
  assert.equal((await request('/api/auth/logout', { method: 'POST' })).status, 200);

  // Lesezugriffe mit fremder Herkunft bleiben möglich (kein CORS-Leak: Antwort liest der fremde Kontext ohnehin nicht)
  assert.equal((await httpFetch(`${baseUrl}/api/system/status`, { headers: { Origin: 'https://boese.example' } })).status, 200);
});

test('Kaputtes JSON und zu grosse Bodies geben einen JSON-Fehler ohne Interna', async (t) => {
  t.mock.method(console, 'error', () => {});
  const broken = await httpFetch(`${baseUrl}/api/planner/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{kaputt'
  });
  assert.equal(broken.status, 400);
  assert.deepEqual(await broken.json(), { error: 'Ungültige Anfrage' });

  const huge = await httpFetch(`${baseUrl}/api/planner/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'x'.repeat(60 * 1024) })
  });
  assert.equal(huge.status, 413);
  assert.deepEqual(await huge.json(), { error: 'Ungültige Anfrage' });
});

test('logSafe entfernt Zeilenumbrüche und Steuerzeichen und begrenzt die Länge', () => {
  assert.equal(logSafe('a\r\nFAKE-LOGZEILE\x1b[31m\x00b'), 'a FAKE-LOGZEILE [31m b');
  assert.equal(logSafe('x'.repeat(500)).length, 300);
  assert.equal(logSafe(null), '');
});

test('OAuth-Callback: ein State ist nur einmal einlösbar, auch mit gültigem Cookie', async (t) => {
  t.mock.method(ceviDbService, 'isPreparationMode', () => false);
  const exchange = t.mock.method(ceviDbService, 'exchangeCodeForToken', async code => ({ access_token: `live_${code}` }));
  t.mock.method(ceviDbService, 'getUserInfo', async () => ({ id: 'p_9', roles: [] }));
  const { state, cookie } = await startLogin();
  const first = await request(`/api/auth/callback?code=abc&state=${state}`, { cookie });
  assert.equal(first.headers.get('location'), '/?login=success');
  // Wiederholung mit demselben Cookie und State: abgewiesen, ohne erneuten Token-Tausch
  const replay = await request(`/api/auth/callback?code=abc&state=${state}`, { cookie });
  assert.equal(replay.headers.get('location'), '/?error=invalid_state');
  assert.equal(exchange.mock.callCount(), 1);
});

test('OAuth-Callback: Zeilenumbrüche aus der URL landen nicht im Log (#51)', async (t) => {
  const logged = [];
  t.mock.method(console, 'error', (...args) => logged.push(args.join(' ')));
  const error = encodeURIComponent('access_denied\r\n[INFO] Admin-Login erfolgreich');
  const description = encodeURIComponent('a\nb\rc');
  const res = await request(`/api/auth/callback?error=${error}&error_description=${description}`);
  assert.equal(res.headers.get('location'), '/?error=provider_error');
  assert.ok(logged.length > 0, 'nichts geloggt');
  for (const line of logged) assert.doesNotMatch(line, /[\r\n]/, line);
});

// Bleibt der letzte Test der Datei: danach ist das Auth-Kontingent dieser Instanz aufgebraucht
test('Rate Limit: Anmelde-Endpunkte drosseln nach zu vielen Versuchen mit 429', async () => {
  let limited;
  for (let i = 0; i < 250; i++) {
    limited = await request('/api/auth/mock-login');
    if (limited.status === 429) break;
  }
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' });
  assert.ok(limited.headers.get('ratelimit-policy') || limited.headers.get('ratelimit'), 'RateLimit-Header fehlt');
});
