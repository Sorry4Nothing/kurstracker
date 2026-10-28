import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Vor dem Import setzen: env.js liest die Variablen beim Laden, dotenv überschreibt sie nicht
process.env.CEVI_DB_PREPARATION_MODE = 'true';
// Ein Service-Token aus .env.local lädt Kurse live; die Tests setzen ihn nur gezielt
process.env.CEVI_DB_SERVICE_TOKEN = '';
// Tests schreiben nie in die echte Datenbank aus .env.local: Vorschläge liegen dann im Arbeitsspeicher
process.env.DATABASE_URL = '';
// Alle Tests laufen von derselben IP: das Anmelde-Limit hier anheben, der 429-Test am Dateiende zählt bis dahin weiter
process.env.RATE_LIMIT_AUTH_MAX = '200';
const { app, logSafe } = await import('../src/app.js');
const { ceviDbService } = await import('../src/services/ceviDbService.js');
const { envConfig } = await import('../src/config/env.js');
const { COURSE_NODES, COURSE_NODES_BY_REGION } = await import('../src/domain/courseTreeData.js');

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
// Die Planer-Tests brauchen Mitglieder: demoGroup hält die Demo-Gruppe auch im simulierten Live-Modus (sonst ist sie leer, #28)
function useLiveCeviDb(t, { demoGroup = true } = {}) {
  let currentUser;
  t.mock.method(ceviDbService, 'isPreparationMode', () => false);
  t.mock.method(ceviDbService, 'usesDemoGroup', () => demoGroup);
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
    canUsePlanner: true,
    canManageSettings: true,
    canViewSystemLog: true,
    canReviewProposals: true
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
  // Demo-Profil hat gender 'm'
  assert.equal(nodes.glk1.title, 'Gruppenleiterkurs 1 (GLK 1)');
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
    const { status } = evaluation.nodes[participation.course_node_id];
    if (participation.status === 'completed') assert.equal(status, 'COMPLETED', participation.course_node_id);
    else assert.notEqual(status, 'IN_PROGRESS', participation.course_node_id);
  }
  assert.deepEqual([...person.qualifications].sort(), ceviDbService.getMockQualifications().map(q => q.key).sort());
  assert.equal(person.birthdate, ceviDbService.getMockUser().birthday);
  assert.equal(typeof evaluation.personAge, 'number');
});

test('API: Region der Person (Mock = Zürich) bestimmt den Baum, Status kommt aus den absolvierten Kursen', async () => {
  const { own, regions } = await (await request('/api/tree/regions')).json();
  assert.equal(own, 'zuerich');
  assert.ok(regions.some(region => region.key === own));

  const { evaluation } = await (await request('/api/tree/evaluation?region=zuerich')).json();
  assert.equal(evaluation.nodes.voku.status, 'COMPLETED');

  // Ein Slot, den die Region nicht hat, ist ein 404; hat sie ihn, rechnet der Pfad
  assert.equal((await request('/api/tree/path/elku?region=bern')).status, 404);
  assert.equal((await request('/api/tree/path/lk?region=bern')).status, 200);
});

test('API: Frösch-Up fehlt im Baum ohne Fröschli-Leitungsrolle, NOLK und SLK zeigt die Abteilungsleitung', async () => {
  const { nodes } = await (await request('/api/tree/structure?region=zuerich')).json();
  const codes = Object.values(nodes).map(node => node.code);
  assert.ok(!codes.includes('Frösch-Up'));
  assert.ok(codes.includes('NOLK') && codes.includes('SLK'));
  assert.ok(Object.hasOwn(COURSE_NODES_BY_REGION.zuerich, 'frosch_up'), 'der Kurs existiert, wird nur ausgeblendet');
});

test('API: nicht bestandener Kurs zählt nicht als absolviert, Bestandenes schon', async (t) => {
  t.mock.method(ceviDbService, 'getMockParticipations', () => [
    { id: 'p1', course_node_id: 'glk1', status: 'failed', result: 'Nicht bestanden', certificate_issued: false },
    { id: 'p2', course_node_id: 'glk2', status: 'confirmed', result: 'Nicht bestanden', certificate_issued: false },
    { id: 'p3', course_node_id: 'voku', status: 'completed', result: 'Erfolgreich bestanden', certificate_issued: true }
  ]);
  const { person, evaluation } = await (await request('/api/tree/evaluation')).json();
  assert.deepEqual(person.completedCourses, ['voku']);
  assert.notEqual(evaluation.nodes.glk1.status, 'COMPLETED');
  assert.notEqual(evaluation.nodes.glk2.status, 'COMPLETED');
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

// Setzt Werte für einen Test und stellt danach die alten wieder her
function setFor(t, target, values) {
  const saved = Object.fromEntries(Object.keys(values).map(key => [key, target[key]]));
  Object.assign(target, values);
  t.after(() => Object.assign(target, saved));
}

test('Cevi-DB: eine Liste über der Seitengrenze wird gemeldet statt still gekürzt', async (t) => {
  const pageOf = n => ({ ok: true, json: async () => ({ data: Array.from({ length: n }, (_, i) => ({ id: String(i), attributes: {} })) }) });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return pageOf(100); });
  await assert.rejects(ceviDbService.fetchList('/api/people'), err => err.status === 502 && /zu gross/.test(err.message));
  assert.equal(calls, 500);
  t.mock.method(globalThis, 'fetch', async () => pageOf(100 - 1));
  assert.equal((await ceviDbService.fetchList('/api/people')).length, 99, 'eine kurze Seite beendet die Liste normal');
});

test('Cevi-DB: mit Gesamtzahl laufen die Seiten parallel und bleiben in der richtigen Reihenfolge', async (t) => {
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(String(url));
    const page = Number(/page\[number\]=(\d+)/.exec(url)[1]);
    await new Promise(resolve => setTimeout(resolve, page === 2 ? 20 : 1));
    const size = page === 4 ? 50 : 100;
    return { ok: true, json: async () => ({ meta: { stats: { total: { count: 350 } } }, data: Array.from({ length: size }, (_, i) => ({ id: `${page}-${i}`, attributes: {} })) }) };
  });
  const list = await ceviDbService.fetchList('/api/people');
  assert.equal(list.length, 350);
  assert.equal(list[100].id, '2-0', 'Seite 2 steht vor Seite 3, auch wenn sie später antwortet');
  assert.equal(list.at(-1).id, '4-49');
  assert.equal(urls.length, 4);
  assert.equal(urls.filter(u => u.includes('stats[total]')).length, 1, 'nur die erste Seite fragt die Gesamtzahl');

  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ meta: { stats: { total: { count: 99_999_999 } } }, data: Array.from({ length: 100 }, () => ({ id: 'x', attributes: {} })) }) }));
  await assert.rejects(ceviDbService.fetchList('/api/people'), err => err.status === 502 && /zu gross/.test(err.message), 'schon die Gesamtzahl über der Grenze wird gemeldet');
});

test('Cevi-DB-Mitglieder: Cache teilt gleichzeitige Abfragen, «Aktualisieren» erst nach 10 s, Fehler werden nicht gemerkt (#27)', async (t) => {
  setFor(t, ceviDbService, { membersCache: undefined });
  let loads = 0;
  let fail = false;
  t.mock.method(ceviDbService, 'loadGroupMembers', async () => { loads++; if (fail) throw new Error('down'); return [{ id: 'p' }]; });

  await Promise.all([ceviDbService.getGroupMembers(), ceviDbService.getGroupMembers()]);
  await ceviDbService.getGroupMembers();
  assert.equal(loads, 1, 'gleichzeitige und folgende Aufrufe teilen eine Abfrage');
  await ceviDbService.getGroupMembers({ fresh: true });
  assert.equal(loads, 1, 'fresh umgeht den Cache erst nach 10 s');

  ceviDbService.membersCache.at -= 11_000;
  await ceviDbService.getGroupMembers({ fresh: true });
  assert.equal(loads, 2);

  ceviDbService.membersCache.at -= 61_000;
  assert.deepEqual(await ceviDbService.getGroupMembers(), [{ id: 'p' }], 'abgelaufene Daten kommen sofort');
  await ceviDbService.membersLoading;
  assert.equal(loads, 3, 'und werden im Hintergrund neu geladen');

  ceviDbService.membersCache.at -= 61_000;
  fail = true;
  await ceviDbService.getGroupMembers();
  await ceviDbService.membersLoading?.catch(() => {});
  assert.deepEqual(await ceviDbService.getGroupMembers(), [{ id: 'p' }], 'ein Fehler im Hintergrund lässt die alten Daten stehen');

  ceviDbService.membersCache.at -= 11_000;
  await assert.rejects(ceviDbService.getGroupMembers({ fresh: true }), /down/, '«Aktualisieren» meldet den Fehler');
  ceviDbService.membersCache.at -= 600_000;
  await assert.rejects(ceviDbService.getGroupMembers(), /down/, 'zu alte Daten werden nicht mehr ausgeliefert');
  fail = false;
  await ceviDbService.getGroupMembers();
  assert.equal(loads, 7, 'ein Fehler bleibt nicht im Cache');
});

test('Cevi-DB-Kurse: mit Service-Token fünf Minuten zwischengespeichert, mit Personen-Token nie, Fehler werden nicht gemerkt (#27)', async (t) => {
  setFor(t, ceviDbService, { serviceToken: 'svc_test', coursesCache: undefined });
  let loads = 0;
  let fail = false;
  t.mock.method(ceviDbService, 'fetchList', async () => { loads++; if (fail) throw new Error('down'); return []; });

  await Promise.all([ceviDbService.getCourses(), ceviDbService.getCourses()]);
  await ceviDbService.getCourses();
  assert.equal(loads, 1, 'gleichzeitige und folgende Aufrufe teilen eine Abfrage');

  ceviDbService.coursesCache.at -= 301_000;
  await ceviDbService.getCourses();
  assert.equal(loads, 2, 'nach fünf Minuten wird neu geladen');

  ceviDbService.coursesCache.at -= 301_000;
  fail = true;
  await assert.rejects(ceviDbService.getCourses(), /down/);
  fail = false;
  await ceviDbService.getCourses();
  assert.equal(loads, 4, 'ein Fehler bleibt nicht im Cache');

  ceviDbService.serviceToken = '';
  t.mock.method(ceviDbService, 'isPreparationMode', () => false);
  await ceviDbService.getCourses('user_token');
  await ceviDbService.getCourses('user_token');
  assert.equal(loads, 6, 'mit dem Token einer Person fragt jeder Aufruf die Cevi-DB');
});

test('Planer: lokal mit Service-Token die echten Mitglieder, nur mit den nötigen Feldern (#26)', async (t) => {
  setFor(t, ceviDbService, { serviceToken: 'svc_test', membersCache: undefined });
  setFor(t, envConfig.app, { isLocal: true });
  setFor(t, envConfig.server, { host: 'localhost' });
  const one = (type, id) => ({ data: { type, id } });
  const many = (type, ...ids) => ({ data: ids.map(id => ({ type, id })) });
  const person = (id, attributes, relationships) => ({ type: 'people', id, attributes, relationships });
  const participation = (id, active, event) => ({ type: 'event_participations', id, attributes: { active }, relationships: { event: one(...event) } });
  const course = (id, name, day) => [
    { type: 'courses', id, attributes: { type: 'Event::Course', name }, relationships: { dates: many('dates', `d${id}`) } },
    { type: 'dates', id: `d${id}`, attributes: { start_at: `${day}T08:00:00+02:00`, finish_at: `${day}T16:00:00+02:00` } }
  ];
  const page = {
    data: [
      person('1', { first_name: 'Anna', last_name: 'Muster', nickname: 'Amsel', gender: 'w', birthday: '2009-05-01' }, {
        roles: many('roles', 'r1', 'r2', 'r6'),
        qualifications: many('qualifications', 'q1', 'q2', 'q3'),
        event_participations: many('event_participations', 'p1', 'p2', 'p3', 'p4')
      }),
      person('2', { first_name: 'Ben', last_name: 'Beispiel', nickname: null, gender: 'm', birthday: '2012-02-02' }, {
        roles: many('roles', 'r3'),
        qualifications: many('qualifications', 'q4', 'q5'),
        event_participations: many('event_participations', 'p5')
      }),
      // Rolle beendet: nicht mehr Mitglied
      person('3', { first_name: 'Carla', last_name: 'Ehemalig', gender: 'w', birthday: '2000-01-01' }, { roles: many('roles', 'r4') }),
      // Nur eine Rolle in einer Externe-Gruppe: kein Mitglied (#96)
      person('4', { first_name: 'Dora', last_name: 'Extern', gender: 'w', birthday: '1990-01-01' }, { roles: many('roles', 'r5') })
    ],
    included: [
      { type: 'roles', id: 'r1', attributes: { name: 'Leiter*in', start_on: '2020-01-01', end_on: null } },
      { type: 'roles', id: 'r2', attributes: { name: 'Teilnehmer*in', start_on: '2015-01-01', end_on: '2019-12-31' } },
      { type: 'roles', id: 'r3', attributes: { name: 'Teilnehmer*in', start_on: '2020-01-01', end_on: null }, relationships: { group: one('groups', 'g1') } },
      { type: 'groups', id: 'g1', attributes: { name: 'M Imperius', type: 'Group::Stufe' } },
      { type: 'roles', id: 'r4', attributes: { name: 'Leiter*in', start_on: '2015-01-01', end_on: '2020-12-31' } },
      { type: 'roles', id: 'r5', attributes: { name: 'Externe-/r', type: 'Group::VereinExterne::Externer', start_on: '2020-01-01', end_on: null } },
      { type: 'roles', id: 'r6', attributes: { name: 'Externe/-r', type: 'Group::JungscharExterne::Externer', start_on: '2020-01-01', end_on: null } },
      { type: 'qualifications', id: 'q1', attributes: { finish_at: '2022-12-31' }, relationships: { qualification_kind: one('qualification_kinds', 'k1') } },
      { type: 'qualifications', id: 'q2', attributes: { finish_at: '2099-12-31' }, relationships: { qualification_kind: one('qualification_kinds', 'k1') } },
      { type: 'qualifications', id: 'q3', attributes: { finish_at: '2030-12-31' }, relationships: { qualification_kind: one('qualification_kinds', 'k2') } },
      { type: 'qualification_kinds', id: 'k1', attributes: { label: 'J+S-Leiter*in LS/T' } },
      // Kindersport kommt nicht aus dem GLK 3
      { type: 'qualification_kinds', id: 'k2', attributes: { label: 'J+S-Leiter*in Kindersport' } },
      // Die Kursteilnahme sieht der Service-Token nicht, die Anerkennung aus dem Kurs schon
      { type: 'qualifications', id: 'q4', attributes: { finish_at: '2030-12-31' }, relationships: { qualification_kind: one('qualification_kinds', 'k3') } },
      { type: 'qualification_kinds', id: 'k3', attributes: { label: 'J+S-Leiter*in SiBe Wasser' } },
      // Ohne Kurs im Baum: keine besuchten Kurse
      { type: 'qualifications', id: 'q5', attributes: { finish_at: '2030-12-31' }, relationships: { qualification_kind: one('qualification_kinds', 'k4') } },
      { type: 'qualification_kinds', id: 'k4', attributes: { label: 'Seilbahnanwender*in' } },
      participation('p1', true, ['courses', 'e1']),
      participation('p2', true, ['courses', 'e2']),
      // Nicht zugeteilt, und ein Lager ist kein Kurs, auch wenn «Berg» im Namen steht
      participation('p3', false, ['courses', 'e3']),
      participation('p4', true, ['events', 'e4']),
      participation('p5', true, ['courses', 'e5']),
      ...course('e1', 'GLK3 Fa 2025', '2025-04-12'),
      ...course('e2', 'HEKU F 2023', '2023-04-12'),
      ...course('e3', 'SLK 2026', '2026-01-10'),
      { type: 'events', id: 'e4', attributes: { type: 'Event', name: 'Pfingstlager Berg' } },
      ...course('e5', 'HEKU M 2099', '2099-04-12')
    ]
  };
  const remote = t.mock.method(globalThis, 'fetch', async () => Response.json(page));

  const res = await request('/api/planner/overview');
  assert.equal(res.status, 200);
  const { group, analysis } = await res.json();

  const [url, init] = remote.mock.calls[0].arguments;
  assert.equal(init.headers['X-Token'], 'svc_test');
  assert.match(url, /fields\[people\]=first_name,last_name,nickname,gender,birthday,roles,qualifications,event_participations&/);
  assert.match(url, /fields\[roles\]=name,type,/);
  assert.doesNotMatch(url, /email|address|phone|additional_information/);
  assert.deepEqual(group, [
    {
      id: '1',
      name: 'Anna Muster',
      ceviname: 'Amsel',
      gender: 'w',
      birthdate: '2009-05-01',
      currentRole: 'Leiter*in, Externe/-r',
      groups: [],
      completedCourses: ['glk3', 'heku'],
      inProgressCourses: [],
      // Neueste Anerkennung zuerst
      qualifications: [
        { id: 'js_leiter_lst', label: 'J+S-Leiter*in LS/T', validUntil: '2099-12-31' },
        { id: 'J+S-Leiter*in Kindersport', label: 'J+S-Leiter*in Kindersport', validUntil: '2030-12-31' },
        { id: 'js_leiter_lst', label: 'J+S-Leiter*in LS/T', validUntil: '2022-12-31' }
      ]
    },
    {
      id: '2', name: 'Ben Beispiel', ceviname: 'Ben', gender: 'm', birthdate: '2012-02-02', currentRole: 'Teilnehmer*in',
      groups: [{ id: 'g1', name: 'M Imperius', shortName: '', type: 'Group::Stufe', roleTypes: [], departmentId: 'g1', departmentName: '' }],
      completedCourses: ['sec_wasser'],
      inProgressCourses: ['heku'],
      qualifications: [
        { id: 'J+S-Leiter*in SiBe Wasser', label: 'J+S-Leiter*in SiBe Wasser', validUntil: '2030-12-31' },
        { id: 'Seilbahnanwender*in', label: 'Seilbahnanwender*in', validUntil: '2030-12-31' }
      ]
    }
  ]);
  assert.deepEqual(analysis.analyzedParticipants[0].completedCourseCodes, ['GLK 3', 'Heku']);
  // Dora hat nur eine Externe-Rolle und fehlt, Anna zeigt ihre Externe-Rolle neben Leiter*in
  assert.equal(group.length, 2);
  // Ben ist für den Heku angemeldet: kein Heku-Vorschlag
  assert.ok(!analysis.analyzedParticipants[1].recommendedCourses.some(rec => rec.courseId === 'heku'));
  // Die abgelaufene alte Anerkennung meldet keinen Verfall
  assert.deepEqual(analysis.urgentRenewals, []);

  // Vorschläge gehen an die echten Mitglieder, nicht mehr an die Demo-Gruppe
  const proposal = await request('/api/planner/propose', { method: 'POST', body: { personId: 'tn_1', targetCourseId: 'heku' } });
  assert.equal(proposal.status, 404);
});

test('Planer: wenn die App nicht nur lokal erreichbar ist, bleibt es trotz Service-Token bei der Demo-Gruppe (#26)', async (t) => {
  setFor(t, ceviDbService, { serviceToken: 'svc_test', membersCache: undefined });
  setFor(t, envConfig.app, { isLocal: true });
  setFor(t, envConfig.server, { host: '0.0.0.0' });
  const remote = t.mock.method(globalThis, 'fetch');
  const demoGroup = async () => (await (await request('/api/planner/overview')).json()).group.map(p => p.id);

  assert.ok((await demoGroup()).includes('tn_1'), 'lauscht auf allen Interfaces');
  Object.assign(envConfig.server, { host: 'localhost' });
  Object.assign(envConfig.app, { isLocal: false });
  assert.ok((await demoGroup()).includes('tn_1'), 'APP_ENV ist nicht local');
  assert.equal(remote.mock.calls.length, 0);
});

test('Cevi-DB: Kurs im Baum aus dem Kürzel der Kursart oder aus dem Anlassnamen', () => {
  for (const [event, expected] of [
    [{ name: 'Anlass 1', kind: { short_name: 'GLK 1' } }, 'glk1'],
    [{ name: 'GLK3 Fb+Mb 2027', kind: { short_name: '' } }, 'glk3'],
    [{ name: 'HEKU M 2028' }, 'heku'],
    [{ name: 'GLK 1 2027' }, 'glk1'],
    [{ name: 'SLK 2026' }, 'slk'],
    [{ name: 'AL-Semi 2027' }, 'al_seminar'],
    [{ name: 'Pioniertechnik-Modul 2027', kind: { short_name: '' } }, 'pionier'],
    [{ name: 'J+S-Modul kulturelle Vielfalt & Inklusion' }, 'vielfalt_inklusion'],
    [{ name: 'Fortbildung Expert*in im Sicherheitsbereich Wasser 2027' }, 'expert_sibe_wasser'],
    [{ name: 'LLK 2027' }, 'llk'],
    [{ name: 'Sommerlager 2026' }, null]
  ]) {
    assert.equal(ceviDbService.courseNodeIdFor(event), expected, event.name);
  }
});

test('API: Vorschlag kürzt lange Freitexte, meldet die Eignung und erscheint in der Übersicht', async () => {
  const res = await request('/api/planner/propose', {
    method: 'POST',
    body: { personId: 'tn_5', targetCourseId: 'llm', proposedSeason: 'S'.repeat(80), notes: 'N'.repeat(600), proposedBy: 'P'.repeat(150) }
  });
  assert.equal(res.status, 200);
  const { success, proposal, pathCheck } = await res.json();
  assert.equal(success, true);
  assert.deepEqual([proposal.season.length, proposal.notes.length], [50, 500]);
  // Wer erfasst, kommt aus der Session; proposedBy aus dem Body wird ignoriert (SR-13)
  const { first_name, last_name } = ceviDbService.getMockUser();
  assert.equal(proposal.plannedBy, `${first_name} ${last_name}`);
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
// Kursvorschläge je Stufe (#131)
// -----------------------------------------------------------------------------

const proposalsUrl = (groupId, action = '') => `/api/planner/proposals/${groupId}${action}`;
const roleOf = (role_class, group_id) => ({ role_class, group_id, group_name: 'Demo' });

test('Planer: die Demo-Gruppe gibt es nur im Vorbereitungsmodus, live bleibt der Planer leer (#28)', async (t) => {
  const prep = await (await request('/api/planner/overview')).json();
  assert.ok(prep.group.length > 0, 'Vorbereitungsmodus zeigt die Demo-Gruppe');

  const login = useLiveCeviDb(t, { demoGroup: false });
  const lead = cookiePair(await login({ id: 'p_30', first_name: 'Max', roles: [roleOf('Group::Jungschar::Abteilungsleiter', 'demo')] }));
  const res = await request('/api/planner/overview', { cookie: lead });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).group, []);
});

test('Vorschläge: Entwurf speichern, abgeben, sperren und von der Abteilungsleitung zurückgeben', async (t) => {
  const login = useLiveCeviDb(t);
  const nord = cookiePair(await login({ id: 'p_20', first_name: 'Ida', roles: [roleOf('Group::Stufe::Stufenleiter', 'demo_nord')] }));
  const lead = cookiePair(await login({ id: 'p_21', first_name: 'Max', roles: [roleOf('Group::Jungschar::Abteilungsleiter', 'demo')] }));
  const overview = await (await request('/api/planner/overview', { cookie: nord })).json();
  const members = overview.group.map(person => person.id);
  assert.ok(members.includes('tn_1') && !members.includes('tn_5'), 'Stufenleitung Nord sieht nur ihre Stufe');

  // Lea (tn_2) wird für die Heku vorgeschlagen; ob das System sie vorsieht, entscheidet allein der Server
  const candidates = overview.analysis.candidatesByCourse;
  const system = Object.entries(candidates).flatMap(([courseId, list]) => list.map(c => ({ personId: c.participantId, courseId })))[0];
  const manual = { personId: 'tn_1', courseId: 'llm' };
  assert.ok(!candidates.llm?.some(c => c.participantId === 'tn_1'), 'Annahme: tn_1 ist kein LLM-Kandidat');

  const save = (cookie, entries, action = '', method = 'PUT') => request(proposalsUrl('demo_nord', action), { method, cookie, body: { entries } });

  // Manuell ohne Bemerkung: abgewiesen, nichts gespeichert
  const noNote = await save(nord, [system, manual]);
  assert.equal(noNote.status, 400);
  assert.match((await noNote.json()).error, /braucht es eine Bemerkung/);
  assert.equal((await (await request('/api/planner/proposals', { cookie: nord })).json()).groups.find(g => g.groupId === 'demo_nord').status, 'offen');

  const draft = await save(nord, [{ ...system, season: ' Herbst 2027 ' }, { ...manual, note: 'Sehr reif für sein Alter' }]);
  assert.equal(draft.status, 200);
  const saved = await draft.json();
  assert.equal(saved.status, 'entwurf');
  assert.deepEqual(saved.entries.map(e => [e.manual, e.season]), [[false, 'Herbst 2027'], [true, '']]);
  assert.equal(saved.updatedBy, 'Ida');
  assert.deepEqual(saved.entries.map(e => e.proposedBy), ['Ida', 'Ida']);

  // Abgeben sperrt das Bearbeiten
  const submitted = await save(nord, saved.entries, '/submit', 'POST');
  assert.equal(submitted.status, 200);
  const sent = await submitted.json();
  assert.equal(sent.status, 'abgegeben');
  assert.deepEqual(sent.entries.map(e => e.proposedBy), ['Ida', 'Ida']);
  assert.equal((await save(nord, [system])).status, 409);
  assert.equal((await save(nord, [system], '/submit', 'POST')).status, 409);

  // Abteilungsleitung liest alles, passt abgegebene Stände an (Stufe bleibt abgegeben) und gibt zurück
  const listed = (await (await request('/api/planner/proposals', { cookie: lead })).json()).groups.find(g => g.groupId === 'demo_nord');
  assert.deepEqual([listed.status, listed.canEdit, listed.canReopen, listed.entries.length], ['abgegeben', true, true, 2]);
  assert.equal((await save(lead, [system])).status, 403);
  assert.equal((await save(nord, [], '/reopen', 'POST')).status, 403);
  assert.equal((await save(nord, [system], '/final')).status, 403);
  const adjusted = await save(lead, [system], '/final');
  assert.equal(adjusted.status, 200);
  const adjustedBody = await adjusted.json();
  assert.deepEqual([adjustedBody.status, adjustedBody.entries.length], ['abgegeben', 1]);
  assert.equal((await save(lead, sent.entries, '/final')).status, 200);

  // Übersicht der finalen Vorschläge: nur Abteilungsleitung, nur abgegebene Stände, mit Namen
  assert.equal((await request('/api/proposals/final', { cookie: nord })).status, 403);
  const final = await (await request('/api/proposals/final', { cookie: lead })).json();
  const finalNord = final.submitted.find(g => g.groupId === 'demo_nord');
  assert.deepEqual([finalNord.entries.length, finalNord.submittedBy], [2, 'Ida']);
  assert.ok(finalNord.entries.every(e => e.name && e.ceviname !== undefined), 'Einträge tragen Namen statt nur IDs');
  assert.ok(finalNord.entries.every(e => Number.isInteger(e.birthYear)), 'Einträge tragen den Jahrgang');
  assert.ok(!final.pending.some(g => g.groupId === 'demo_nord'));

  const reopened = await save(lead, [], '/reopen', 'POST');
  assert.equal(reopened.status, 200);
  assert.equal((await reopened.json()).status, 'entwurf');
  assert.equal((await save(nord, [system])).status, 200);
  const afterReopen = await (await request('/api/proposals/final', { cookie: lead })).json();
  assert.ok(!afterReopen.submitted.some(g => g.groupId === 'demo_nord') && afterReopen.pending.some(g => g.groupId === 'demo_nord'));
});

test('Vorschläge: fremde Stufe, ungültige Einträge und doppelte Vorschläge werden abgewiesen', async (t) => {
  const login = useLiveCeviDb(t);
  const nord = cookiePair(await login({ id: 'p_22', roles: [roleOf('Group::Stufe::Stufenleiter', 'demo_nord')] }));
  const put = (groupId, entries) => request(proposalsUrl(groupId), { method: 'PUT', cookie: nord, body: { entries } });

  // Eine Stufe, die die Rolle nicht sieht, existiert für sie nicht
  assert.equal((await put('demo_sued', [])).status, 404);
  assert.equal((await put('__proto__', [])).status, 404);
  // Person aus einer fremden Stufe
  assert.equal((await put('demo_nord', [{ personId: 'tn_5', courseId: 'llm', note: 'x' }])).status, 400);
  const invalid = [
    undefined, 'nope', [null], [{ personId: 'tn_1', courseId: 'glk4', note: 'x' }], [{ personId: 'tn_1', courseId: '__proto__', note: 'x' }],
    [{ personId: 'tn_1', courseId: 'llm', note: 42 }], [{ personId: 'tn_1', courseId: 'llm', note: 'x'.repeat(501) }],
    [{ personId: 'tn_1', courseId: 'llm', note: '   ' }], [{ personId: 'tn_1', courseId: 'llm', note: 'a' }, { personId: 'tn_1', courseId: 'llm', note: 'b' }]
  ];
  for (const entries of invalid) {
    const res = await put('demo_nord', entries);
    assert.equal(res.status, 400, JSON.stringify(entries));
  }
  assert.equal((await put('demo_nord', [])).status, 200);
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

test('Statisch: Startseite liefert index.html, Module und Styles mit passendem Typ', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /^text\/html/);
  assert.equal(await home.text(), index);
  for (const [path, type] of [['/app.js', /javascript/], ['/js/tree-map.js', /javascript/], ['/style.css', /^text\/css/]]) {
    const res = await request(path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type'), type, path);
  }
});

test('Fehlerseiten: unbekannte Adresse gibt 404, /fehler/401 und /fehler/502 tragen ihren Statuscode', async () => {
  for (const [path, status, title] of [
    ['/planer', 404, 'Seite nicht gefunden'],
    ['/profil/qualifikationen', 404, 'Seite nicht gefunden'],
    ['/fehler/404', 404, 'Seite nicht gefunden'],
    ['/fehler/401', 401, 'Nicht angemeldet'],
    ['/fehler/502', 502, 'Die Cevi-DB antwortet nicht'],
    ['/fehler/418', 404, 'Seite nicht gefunden']
  ]) {
    const res = await request(path);
    assert.equal(res.status, status, path);
    assert.match(res.headers.get('content-type'), /^text\/html/, path);
    const body = await res.text();
    assert.ok(body.includes(`<title>${title} - Cevi Kurstracker</title>`), path);
    assert.ok(body.includes(`data-code="${status}"`), path);
    assert.ok(!body.includes('{{'), `${path}: Platzhalter ersetzt`);
    assert.equal(body.match(/data-error="/g)?.length, 1, `${path}: nur der Abschnitt des Codes`);
    assert.ok(body.includes(`data-error="${status}"`), path);
  }
  // Anmelden: im Vorbereitungsmodus (Tests) über den Mock-Login
  assert.ok((await (await request('/fehler/401')).text()).includes('href="/api/auth/mock-login"'));
  // Die API bleibt JSON
  assert.match((await request('/api/gibt-es-nicht')).headers.get('content-type'), /^application\/json/);
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
  const user = { id: 'p_1', first_name: 'Mia', last_name: 'Muster', roles: [{ role_class: 'Group::Stufe::Teilnehmer', group_id: 10, role_name: 'Mitglied' }] };
  const line = await login(user);
  assert.match(line, /Max-Age=604800(;|$)/);
  assert.match(line, /HttpOnly/);
  assert.match(line, /SameSite=Lax/);
  assert.equal(/;\s*Secure/i.test(line), envConfig.auth.cookieSecure);
  assert.ok(decodeURIComponent(cookiePair(line)).startsWith('cevi_session_id=s:'), 'Session-Cookie ist nicht signiert');
  assert.equal(ceviDbService.exchangeCodeForToken.mock.calls[0].arguments[0], 'abc');
  assert.equal(ceviDbService.getUserInfo.mock.calls[0].arguments[0], 'live_abc');

  const me = await (await request('/api/auth/me', { cookie: cookiePair(line) })).json();
  assert.deepEqual(me, { authenticated: true, user, isMock: false, canUsePlanner: false, canManageSettings: false, canViewSystemLog: false, canReviewProposals: false });
});

test('Live-Login: Planer ist ohne Leitungsrolle gesperrt, Stufenleiterin hat Zugriff', async (t) => {
  const login = useLiveCeviDb(t);
  const member = cookiePair(await login({ id: 'p_2', first_name: 'Tim', roles: [roleOf('Group::Stufe::Teilnehmer', 10), roleOf('Group::Gruppe::Gruppenleiter', 10)] }));
  for (const [path, method, body] of [
    ['/api/planner/overview', 'GET'],
    ['/api/planner/propose', 'POST', { personId: 'tn_1', targetCourseId: 'heku' }]
  ]) {
    const res = await request(path, { method, body, cookie: member });
    assert.equal(res.status, 403, path);
    assert.deepEqual(await res.json(), { error: 'Kein Zugriff auf den Stufenleiter-Planer' });
  }

  const leader = cookiePair(await login({ id: 'p_3', first_name: 'Ida', roles: [roleOf('Group::Stufe::Stufenleiter', 'demo_nord')] }));
  assert.equal((await request('/api/planner/overview', { cookie: leader })).status, 200);
});

test('Live-Login: Rollen als Text öffnen weder Planer noch Einstellungen, nur Rollenobjekte der Cevi-DB zählen (#170)', async (t) => {
  const login = useLiveCeviDb(t);
  const text = cookiePair(await login({ id: 'p_4', first_name: 'Eve', roles: ['Abteilungsleiter', 'Stufenleiterin'], groups: [{ id: 104, name: 'Cevi Abteilung', role: 'Abteilungsleiter' }] }));
  assert.equal((await request('/api/planner/overview', { cookie: text })).status, 403);
  assert.equal((await request('/api/settings/cevi-db-key', { cookie: text })).status, 403);
  const me = await (await request('/api/auth/me', { cookie: text })).json();
  assert.deepEqual([me.canUsePlanner, me.canManageSettings, me.user.roles], [false, false, []]);
});

test('Log: verweigerte Zugriffe und ungültiger state erscheinen mit Akteur, ohne Cookie oder Token (SR-52)', async (t) => {
  const login = useLiveCeviDb(t);
  const member = cookiePair(await login({ id: 'p_8', roles: ['Mitglied'] }));
  const warn = t.mock.method(console, 'warn', () => {});
  await request('/api/courses');
  await request('/api/planner/overview', { cookie: member });
  await request('/api/auth/callback?code=abc&state=falsch');
  const lines = warn.mock.calls.map(call => call.arguments[0]);
  assert.deepEqual(lines, [
    '[Sicherheit] 401 nicht angemeldet GET /api/courses akteur=anonym',
    '[Sicherheit] 403 kein Planer-Zugriff GET /api/planner/overview akteur=p_8',
    '[Sicherheit] OAuth-Callback mit ungültigem state abgewiesen GET /api/auth/callback akteur=anonym'
  ]);
  assert.ok(!lines.join().includes(member.split('=')[1]), 'Session-Cookie nicht im Log');
});

test('Session: ein neuer Login beendet die alte Session serverseitig (SR-02)', async (t) => {
  const login = useLiveCeviDb(t);
  const old = cookiePair(await login({ id: 'p_7', roles: [] }));
  const { state, cookie } = await startLogin();
  const res = await request(`/api/auth/callback?code=abc&state=${state}`, { cookie: `${old}; ${cookie}` });
  assert.notEqual(cookiePair(setCookieLine(res, 'cevi_session_id')), old);
  assert.deepEqual(await (await request('/api/auth/me', { cookie: old })).json(), { authenticated: false });
});

// Rechtematrix (SR-12): jede /api-Route braucht hier eine Zeile, sonst schlägt der Test fehl (deny by default)
test('API: Health-Check ist öffentlich, meldet ok und enthält nur Status und Datenbank', async () => {
  const res = await request('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', database: 'nicht konfiguriert' });
});

test('API: Systemlog zeigt Kennzahlen und Anfragen, aber weder Query-Strings noch Stacks (SR-50, SR-51)', async () => {
  await request('/api/courses?token=geheim');
  console.error(new Error('Beispielfehler').stack);
  const res = await request('/api/system/logs');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.system.database, 'nicht konfiguriert');
  assert.equal(body.system.preparationMode, true);
  assert.ok(body.requests.total >= 1);
  assert.ok(body.entries.some(e => e.source === 'Anfrage' && /^200 GET \/api\/courses \d+ ms akteur=/.test(e.message)));
  const text = JSON.stringify(body);
  assert.ok(!text.includes('geheim'), 'Query-String im Log');
  assert.ok(!/\bat \S+ \(/.test(text), 'Stack im Log');
  assert.ok(body.entries.some(e => e.level === 'error' && e.message.startsWith('Error: Beispielfehler')));
  assert.ok(!body.entries.some(e => e.message.includes('/api/system/logs')), 'Log-Seite loggt sich nicht selbst');
});

const RIGHTS = {
  'GET /api/auth/login': 'public',
  'GET /api/auth/mock-login': 'public',
  'GET /api/auth/callback': 'public',
  'GET /api/auth/me': 'public',
  'POST /api/auth/logout': 'public',
  'GET /api/tree/structure': 'public',
  'GET /api/tree/regions': 'public',
  'GET /api/system/status': 'public',
  'GET /api/health': 'public',
  'GET /api/system/logs': 'lead',
  'GET /api/courses': 'session',
  'GET /api/user/history': 'session',
  'GET /api/user/qualifications': 'session',
  'GET /api/tree/evaluation': 'session',
  'GET /api/tree/path/:courseId': 'session',
  'GET /api/planner/overview': 'planner',
  'POST /api/planner/propose': 'planner',
  'GET /api/planner/proposals': 'planner',
  'PUT /api/planner/proposals/:groupId': 'planner',
  'POST /api/planner/proposals/:groupId/submit': 'planner',
  'PUT /api/planner/proposals/:groupId/final': 'planner',
  'POST /api/planner/proposals/:groupId/reopen': 'planner',
  'GET /api/proposals/final': 'lead',
  'GET /api/settings/cevi-db-key': 'lead',
  'PUT /api/settings/cevi-db-key/:departmentId': 'lead',
  'DELETE /api/settings/cevi-db-key/:departmentId': 'lead'
};

test('Rechtematrix (SR-12): jede API-Route hat eine Zeile, Session- und Planer-Routen verweigern ohne Recht', async (t) => {
  const registered = app.router.stack
    .filter(layer => layer.route?.path.startsWith('/api'))
    .flatMap(({ route }) => Object.keys(route.methods).map(method => `${method.toUpperCase()} ${route.path}`));
  assert.ok(registered.length >= Object.keys(RIGHTS).length - 1, 'Routen aus dem Express-Router gelesen');
  assert.deepEqual(registered.filter(route => !RIGHTS[route]), [], 'Route ohne Zeile in RIGHTS');

  const login = useLiveCeviDb(t);
  const member = cookiePair(await login({ id: 'p_6', first_name: 'Tim', roles: ['Mitglied'] }));
  for (const [route, right] of Object.entries(RIGHTS)) {
    if (right === 'public') continue;
    const [method, pattern] = route.split(' ');
    const path = pattern.replace(':courseId', 'heku').replace(':departmentId', 'demo').replace(':groupId', 'demo_nord');
    const anonymous = await request(path, { method });
    assert.equal(anonymous.status, 401, `${route} ohne Session`);
    if (right !== 'session') {
      const noRole = await request(path, { method, cookie: member });
      assert.equal(noRole.status, 403, `${route} ohne Leitungsrolle`);
    }
  }
});

test('Session: jeder Login bekommt eine neue Session-ID, auch mit vorhandenem Cookie (SR-02)', async (t) => {
  const login = useLiveCeviDb(t);
  const first = await login({ id: 'p_7', roles: [] });
  const { state, cookie } = await startLogin();
  const res = await request(`/api/auth/callback?code=abc&state=${state}`, { cookie: `${cookiePair(first)}; ${cookie}` });
  assert.notEqual(cookiePair(setCookieLine(res, 'cevi_session_id')), cookiePair(first));
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
  assert.equal(anon.headers.get('x-datenquelle'), null);
  assert.equal(remote.mock.callCount(), 0);

  const courses = await request('/api/courses', { cookie });
  assert.equal(courses.status, 200);
  assert.equal(courses.headers.get('x-datenquelle'), 'cevi-db');
  assert.deepEqual((await courses.json()).map(c => c.title), ['GLK 3 Herbst']);
  const [url, init] = remote.mock.calls[0].arguments;
  const today = new Date().toISOString().slice(0, 10);
  // Nur die Felder, die der Kurstracker liest (#34): keine übrigen Anlassfelder wie Kontakte oder Preise
  const eventFields = 'fields[courses]=name,number,location,description,application_closing_at,maximum_participants,participant_count,group_ids,dates,kind'
    + '&fields[event_dates]=start_at,finish_at,location&fields[event_kinds]=label,short_name';
  assert.equal(url, `${ceviDbService.baseUrl}/api/events?filter[type]=Event::Course&filter[after_or_on]=${today}&include=dates,kind&${eventFields}&page[size]=100&page[number]=1&stats[total]=count`);
  assert.equal(init.headers.Authorization, 'Bearer live_abc');

  // Teilnahmen nur der eingeloggten Person abfragen
  const history = await request('/api/user/history', { cookie });
  assert.equal(remote.mock.calls[1].arguments[0], `${ceviDbService.baseUrl}/api/event_participations?filter[person_id]=p_6&fields[event_participations]=active,event,status,result,certificate_issued&page[size]=100&page[number]=1&stats[total]=count`);
  await request('/api/user/qualifications', { cookie });
  assert.equal(remote.mock.calls[2].arguments[0], `${ceviDbService.baseUrl}/api/qualifications?filter[person_id]=p_6&fields[qualifications]=finish_at,qualification_kind&page[size]=100&page[number]=1&stats[total]=count`);
  // Personendaten einer Live-Session kommen aus der Cevi-DB
  assert.equal(history.headers.get('x-datenquelle'), 'cevi-db');
  assert.equal((await request('/api/auth/me', { cookie })).headers.get('x-datenquelle'), 'cevi-db');

  for (const [upstream, expected] of [[401, 401], [500, 502]]) {
    reply = () => new Response('Fehler', { status: upstream });
    const res = await request('/api/courses', { cookie });
    assert.equal(res.status, expected, `Cevi-DB ${upstream}`);
    assert.match((await res.json()).error, /Cevi-DB Abruf fehlgeschlagen/);
  }
});

test('Service-Token: Kurse kommen live per X-Token, auch im Vorbereitungsmodus, Seite für Seite und dem Baum zugeordnet (#11)', async (t) => {
  setFor(t, ceviDbService, { serviceToken: 'svc_test', coursesCache: undefined });
  const event = (id, kind, dates = []) => ({
    id: String(id),
    type: 'courses',
    attributes: { name: `Anlass ${id}`, location: 'Flaach', application_closing_at: '2000-01-31', maximum_participants: 20, participant_count: 15, group_ids: [3] },
    relationships: { kind: { data: { type: 'event_kinds', id: kind } }, dates: { data: dates.map(id => ({ type: 'event_dates', id })) } }
  });
  // Seite 1 ist voll (100 Anlässe GLK 1), Seite 2 bringt einen Anlass mit unbekannter Kursart und ohne Termine
  const pages = [
    {
      data: [event(1, '1', ['b', 'a']), ...Array.from({ length: 99 }, (_, i) => event(i + 2, '1'))],
      included: [
        { type: 'event_kinds', id: '1', attributes: { label: 'Gruppenleiter/-innen-Kurs 1', short_name: 'GLK 1' } },
        // Termine verkehrt herum: der früheste zählt als Kursbeginn, der späteste als Kursende
        { type: 'event_dates', id: 'b', attributes: { start_at: '2099-10-14T08:00:00+02:00', finish_at: '2099-10-17T16:00:00+02:00' } },
        { type: 'event_dates', id: 'a', attributes: { start_at: '2099-10-12T08:00:00+02:00', finish_at: '2099-10-12T18:00:00+02:00' } }
      ]
    },
    { data: [event(101, '9')], included: [{ type: 'event_kinds', id: '9', attributes: { label: 'Kochkurs', short_name: 'KOCH' } }] }
  ];
  const pageOf = url => Number(/page\[number\]=(\d+)/.exec(url)[1]);
  const remote = t.mock.method(globalThis, 'fetch', async url => Response.json(pages[pageOf(url) - 1]));

  const res = await request('/api/courses');
  assert.equal(res.status, 200);
  const courses = await res.json();

  assert.deepEqual(remote.mock.calls.map(call => pageOf(call.arguments[0])), [1, 2]);
  for (const { arguments: [url, init] } of remote.mock.calls) {
    assert.match(url, /\/api\/events\?filter\[type\]=Event::Course&/);
    assert.equal(init.headers['X-Token'], 'svc_test');
    assert.equal(init.headers.Authorization, undefined);
  }
  assert.equal(courses.length, 101);
  assert.deepEqual(courses[0], {
    id: '1',
    course_node_id: 'glk1',
    title: 'Anlass 1',
    code: 'GLK 1',
    category: COURSE_NODES.glk1.category,
    organizer: '',
    location: 'Flaach',
    start_date: '2099-10-12',
    end_date: '2099-10-17',
    registration_deadline: '2000-01-31',
    status: 'Anmeldeschluss vorbei',
    description: '',
    free_places: 5,
    registration_url: `${ceviDbService.baseUrl}/groups/3/events/1`
  });
  // Unbekannte Kursart: im Kursangebot, aber keinem Kurs im Baum zugeordnet
  assert.equal(courses[100].course_node_id, null);
  assert.equal(courses[100].category, 'Kochkurs');
});

test('Kursart-Titel: nur mit Service-Token von /api/event_kinds, ohne Leerzeichen am Ende', async (t) => {
  const remote = t.mock.method(globalThis, 'fetch', async () => Response.json({
    data: [{ type: 'event_kinds', id: '80', attributes: { label: 'J+S-Leiter*innenkurs LS/T ' } }]
  }));
  assert.equal((await ceviDbService.getKindLabels()).size, 0);
  assert.equal(remote.mock.callCount(), 0);

  setFor(t, ceviDbService, { serviceToken: 'svc_test', membersCache: undefined });
  assert.deepEqual(await ceviDbService.getKindLabels(), new Map([[80, 'J+S-Leiter*innenkurs LS/T']]));
  const [url, init] = remote.mock.calls[0].arguments;
  assert.match(url, /\/api\/event_kinds\?fields\[event_kinds\]=label&/);
  assert.equal(init.headers['X-Token'], 'svc_test');
});

test('API: X-Datenquelle nennt pro Antwort die Herkunft der Daten für die API-Output-Seite', async (t) => {
  const sourceOf = async path => (await request(path)).headers.get('x-datenquelle');
  for (const [path, source] of Object.entries({
    '/api/auth/me': 'testdaten',
    '/api/system/status': 'kurstracker',
    '/api/health': 'kurstracker',
    '/api/system/logs': 'kurstracker',
    '/api/courses': 'testdaten',
    '/api/user/history': 'testdaten',
    '/api/user/qualifications': 'testdaten',
    '/api/tree/structure': 'kurstracker',
    '/api/tree/regions': 'kurstracker',
    '/api/tree/evaluation': 'testdaten',
    '/api/tree/path/glk1': 'testdaten',
    '/api/planner/overview': 'testdaten'
  })) {
    assert.equal(await sourceOf(path), source, path);
  }

  // Mit Service-Token kommen Kurse und lokal die Mitglieder live; fällt die Cevi-DB aus, nennt auch der 502 sie
  setFor(t, ceviDbService, { serviceToken: 'svc_test', membersCache: undefined, coursesCache: undefined });
  setFor(t, envConfig.app, { isLocal: true });
  setFor(t, envConfig.server, { host: 'localhost' });
  t.mock.method(globalThis, 'fetch', async () => new Response('Fehler', { status: 500 }));
  for (const path of ['/api/courses', '/api/planner/overview']) {
    const res = await request(path);
    assert.equal(res.status, 502, path);
    assert.equal(res.headers.get('x-datenquelle'), 'cevi-db', path);
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
  assert.equal(logSafe('a\r\nFAKE-LOGZEILE\x1b[31m\x00b'), 'aFAKE-LOGZEILE[31mb');
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

test('API: grosse Antworten kommen komprimiert (#135)', async () => {
  const res = await httpFetch(`${baseUrl}/js/planner.js`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-encoding'), 'gzip');
});
