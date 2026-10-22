import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_NODES, withGenderTitles } from '../src/domain/courseTreeData.js';
import { courseTreeEngine } from '../src/domain/courseTreeEngine.js';
import { StufenleiterPlanningEngine } from '../src/domain/stufenleiterPlanningEngine.js';
import { COURSE_MAP_COORDS } from '../public/js/tree-map.js';

// Kurs-IDs ohne die Aliase (glk, hlk, mf), die auf denselben Knoten zeigen
const CANONICAL_IDS = Object.keys(COURSE_NODES).filter(id => COURSE_NODES[id].id === id);
const ALL_QUALIFICATIONS = CANONICAL_IDS.flatMap(id => COURSE_NODES[id].grantsQualifications);

// Geburtsdatum für genau `years` Jahre; der Geburtstag liegt einen Monat zurück, damit weder Datum noch Zeitzone das Alter kippen
function birthdateForAge(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

// Datum in `months` Monaten (negativ: in der Vergangenheit) als YYYY-MM-DD
function inMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// Datenintegrität Ausbildungsbaum
// -----------------------------------------------------------------------------

test('Kursbaum: jeder Kurs hat die Felder, die Karte und Inspektor anzeigen', () => {
  for (const id of CANONICAL_IDS) {
    const node = COURSE_NODES[id];
    for (const key of ['org', 'code', 'title', 'category', 'description']) {
      assert.equal(typeof node[key], 'string', `${id}.${key}`);
    }
    assert.ok(Number.isInteger(node.level) && Number.isInteger(node.minAge), `${id}: level/minAge`);
    assert.ok(Array.isArray(node.prerequisites) && Array.isArray(node.requiredQualifications), `${id}: Listen`);
  }
});

test('Kursbaum: Vorgänger existieren und verlangen weder höhere Stufe noch höheres Mindestalter', () => {
  for (const id of CANONICAL_IDS) {
    const node = COURSE_NODES[id];
    for (const req of [...node.prerequisites, ...(node.recommendedPrerequisites || [])]) {
      assert.ok(CANONICAL_IDS.includes(req), `${id}: Vorgänger '${req}' existiert nicht`);
    }
    for (const req of node.prerequisites) {
      assert.ok(COURSE_NODES[req].level <= node.level, `${id}: Vorgänger ${req} liegt auf höherer Stufe`);
      assert.ok(COURSE_NODES[req].minAge <= node.minAge, `${id}: Vorgänger ${req} verlangt höheres Mindestalter`);
    }
  }
});

test('Kursbaum: Vorgängerketten sind zyklenfrei', () => {
  // findPathToTarget sammelt Vorgänger rekursiv ohne Besucht-Liste: ein Zyklus wäre eine Endlosrekursion
  const done = new Set();
  const visit = (id, chain) => {
    assert.ok(!chain.includes(id), `Zyklus: ${[...chain, id].join(' -> ')}`);
    if (done.has(id)) return;
    COURSE_NODES[id].prerequisites.forEach(req => visit(req, [...chain, id]));
    done.add(id);
  };
  CANONICAL_IDS.forEach(id => visit(id, []));
});

test('Kursbaum: jede verlangte Qualifikation wird von einem Kurs im Baum vergeben', () => {
  for (const id of CANONICAL_IDS) {
    for (const qual of COURSE_NODES[id].requiredQualifications) {
      assert.ok(ALL_QUALIFICATIONS.includes(qual), `${id} verlangt ${qual}, das kein Kurs vergibt`);
    }
  }
});

test('Kursbaum: J+S-Module und die Kaderstufe verlangen GLK 3 und die J+S-Leiteranerkennung', () => {
  const ancestors = id => COURSE_NODES[id].prerequisites.flatMap(req => [req, ...ancestors(req)]);
  const courses = CANONICAL_IDS.filter(id => id !== 'glk3' && (COURSE_NODES[id].org === 'J+S' || COURSE_NODES[id].level >= 3));
  assert.ok(courses.length > 0);
  for (const id of courses) {
    assert.ok(ancestors(id).includes('glk3'), `${id} verlangt GLK 3 nicht`);
    assert.ok(COURSE_NODES[id].requiredQualifications.includes('js_leiter_lst'), `${id} verlangt js_leiter_lst nicht`);
  }
});

test('Kursbaum: Aliase in den Daten und in der Engine zeigen auf denselben Kurs', () => {
  const aliases = Object.keys(COURSE_NODES).filter(key => !CANONICAL_IDS.includes(key));
  assert.ok(aliases.length > 0);
  for (const alias of aliases) {
    assert.equal(courseTreeEngine.resolveCourseId(alias), COURSE_NODES[alias].id, alias);
  }
});

test('Kurskarte: jeder Kurs hat eine Position auf der Leinwand, ohne Überlappung, Vorgänger links davon', () => {
  const CARD = { w: 220, h: 80 }; // .tree-node-card, auf dieser Geometrie zeichnet tree-map.js die Linien
  const CANVAS = { w: 2360, h: 840 }; // .tree-map-canvas
  assert.deepEqual(Object.keys(COURSE_MAP_COORDS).sort(), [...CANONICAL_IDS].sort());

  const entries = Object.entries(COURSE_MAP_COORDS);
  entries.forEach(([id, { x, y }], i) => {
    assert.ok(x >= 0 && y >= 0 && x + CARD.w <= CANVAS.w && y + CARD.h <= CANVAS.h, `${id} liegt ausserhalb der Leinwand`);
    for (const [other, pos] of entries.slice(i + 1)) {
      const overlaps = Math.abs(x - pos.x) < CARD.w && Math.abs(y - pos.y) < CARD.h;
      assert.ok(!overlaps, `${id} überlappt ${other}`);
    }
    // Linien laufen von der rechten Kante des Vorgängers zur linken Kante des Kurses
    for (const req of COURSE_NODES[id].prerequisites) {
      assert.ok(COURSE_MAP_COORDS[req].x + CARD.w < x, `${req} liegt nicht links von ${id}`);
    }
  });
});

// -----------------------------------------------------------------------------
// Altersregeln
// -----------------------------------------------------------------------------

test('Alter: zählt erst am Geburtstag hoch, für TT.MM.JJJJ, ISO-Datum und Date', () => {
  const day = (y, m, d) => new Date(y, m - 1, d);
  assert.equal(courseTreeEngine.calculateAge('14.08.2009', day(2026, 8, 13)), 16);
  assert.equal(courseTreeEngine.calculateAge('14.08.2009', day(2026, 8, 14)), 17);
  assert.equal(courseTreeEngine.calculateAge(day(2009, 8, 14), day(2026, 8, 13)), 16);
  assert.equal(courseTreeEngine.calculateAge(day(2009, 8, 14), day(2026, 8, 14)), 17);
  assert.equal(courseTreeEngine.calculateAge('2009-08-14', day(2026, 7, 14)), 16);
  assert.equal(courseTreeEngine.calculateAge('2009-08-14', day(2026, 9, 14)), 17);
  for (const invalid of [undefined, null, '', 'unbekannt']) {
    assert.equal(courseTreeEngine.calculateAge(invalid), null, String(invalid));
  }
});

test('Mindestalter: wie im Kursreglement, jeder Kurs wird genau ab seinem Mindestalter frei', () => {
  // Kursreglement im Kopf von courseTreeData.js: Voku ab 12, Heku ab 13, GLK 1 ab 14, GLK 2 ab 15, GLK 3 (J+S-Leiterkurs) ab 17
  assert.deepEqual(['voku', 'heku', 'glk1', 'glk2', 'glk3'].map(id => COURSE_NODES[id].minAge), [12, 13, 14, 15, 17]);
  for (const id of CANONICAL_IDS) {
    const { prerequisites, minAge } = COURSE_NODES[id];
    const person = age => ({ birthdate: birthdateForAge(age), completedCourses: prerequisites, qualifications: ALL_QUALIFICATIONS });

    const tooYoung = courseTreeEngine.evaluatePersonInTree(person(minAge - 1)).nodes[id];
    assert.equal(tooYoung.status, 'LOCKED', id);
    assert.deepEqual(tooYoung.blockers, [`Mindestalter nicht erreicht (benotigt: ${minAge} Jahre, aktuell: ${minAge - 1} Jahre)`], id);

    assert.equal(courseTreeEngine.evaluatePersonInTree(person(minAge)).nodes[id].status, 'AVAILABLE', id);
  }
});

// -----------------------------------------------------------------------------
// Statusableitung im Baum
// -----------------------------------------------------------------------------

test('Status: absolviert schlägt angemeldet, Angemeldetes zählt auch mit offenen Voraussetzungen', () => {
  const { nodes } = courseTreeEngine.evaluatePersonInTree({
    birthdate: birthdateForAge(16),
    completedCourses: ['heku'],
    inProgressCourses: ['HEKU', 'glk1', 'glk3']
  });
  assert.equal(nodes.heku.status, 'COMPLETED');
  assert.equal(nodes.glk1.status, 'IN_PROGRESS');
  assert.equal(nodes.glk3.status, 'IN_PROGRESS');
  // Angemeldet ist nicht absolviert: Pioniertechnik verlangt GLK 1 und bleibt gesperrt
  assert.equal(nodes.pionier.status, 'LOCKED');
  assert.deepEqual(nodes.pionier.missingPrerequisites, ['glk1']);
});

test('Status: empfohlene Vorstufen sind keine Pflicht, fehlende Pflichtkurse sperren', () => {
  const fourteen = courseTreeEngine.evaluatePersonInTree({ birthdate: birthdateForAge(14) }).nodes;
  for (const id of ['voku', 'heku', 'glk1']) {
    assert.equal(fourteen[id].status, 'AVAILABLE', id); // Voku und Heku sind nur empfohlen
  }
  const sixteen = courseTreeEngine.evaluatePersonInTree({ birthdate: birthdateForAge(16) }).nodes;
  assert.equal(sixteen.glk2.status, 'AVAILABLE'); // GLK 1 ist nur empfohlen
  assert.equal(sixteen.pionier.status, 'LOCKED'); // GLK 1 ist für Pioniertechnik Pflicht
  assert.match(sixteen.pionier.blockers.join(), /Fehlende Vorgangerkurse: Gruppenleiter\/-innen-Kurs 1/);
  assert.equal(courseTreeEngine.evaluatePersonInTree({ birthdate: birthdateForAge(17) }).nodes.glk3.status, 'AVAILABLE');
});

test('Status: fehlende Qualifikation sperrt trotz Vorkurs, Qualifikationen zählen auch als Objekt und in Grossschrift', () => {
  const base = { birthdate: birthdateForAge(25), completedCourses: ['glk3'] };
  const locked = courseTreeEngine.evaluatePersonInTree(base).nodes.slk;
  assert.equal(locked.status, 'LOCKED');
  assert.deepEqual(locked.missingQualifications, ['js_leiter_lst']);

  for (const qualifications of [['JS_LEITER_LST'], [{ id: 'js_leiter_lst' }], [{ key: 'js_leiter_lst' }]]) {
    const slk = courseTreeEngine.evaluatePersonInTree({ ...base, qualifications }).nodes.slk;
    assert.equal(slk.status, 'AVAILABLE', JSON.stringify(qualifications));
  }
});

test('Status: Aliase und Schreibweise werden aufgelöst, nächste Kurse ohne Alias-Duplikate', () => {
  const result = courseTreeEngine.evaluatePersonInTree({
    birthdate: birthdateForAge(25),
    completedCourses: [' GLK '],
    qualifications: ['js_leiter_lst']
  });
  assert.equal(result.nodes.glk3.status, 'COMPLETED');
  assert.equal(result.nodes.glk.status, 'COMPLETED');
  assert.equal(result.currentMaxLevel, 1);

  const nextIds = result.availableNextCourses.map(c => c.id);
  assert.ok(nextIds.includes('mf_lst'));
  assert.deepEqual([...nextIds].sort(), CANONICAL_IDS.filter(id => result.nodes[id].status === 'AVAILABLE').sort());

  assert.equal(courseTreeEngine.evaluatePersonInTree({}).currentMaxLevel, -1);
});

// -----------------------------------------------------------------------------
// Pfadsuche
// -----------------------------------------------------------------------------

test('Pfad: Ziele ohne, mit kurzer und mit langer Vorgängerkette', () => {
  const steps = target => courseTreeEngine
    .findPathToTarget({ birthdate: birthdateForAge(25) }, target)
    .pathSteps.map(s => s.id).sort();
  // Nur Pflicht-Vorgänger; Voku bis GLK 2 sind empfohlene Vorstufen (recommendedSteps)
  assert.deepEqual(steps('voku'), []);
  assert.deepEqual(steps('slrg_pool'), []);
  assert.deepEqual(steps('pionier'), ['glk1']);
  assert.deepEqual(steps('sec_winter'), ['glk3']);
  assert.deepEqual(steps('experte'), ['glk3', 'llm']);
});

test('Pfad: Sicherheit Wasser scheitert nur an der fehlenden SLRG-Qualifikation', () => {
  const result = courseTreeEngine.findPathToTarget(
    { birthdate: birthdateForAge(20), completedCourses: ['glk3'], qualifications: ['js_leiter_lst'] },
    'sec_wasser'
  );
  assert.equal(result.stepsRemainingCount, 0);
  assert.equal(result.isDirectlyEligible, false);
  assert.deepEqual(result.targetQualCheck, [
    { id: 'js_leiter_lst', isFulfilled: true },
    { id: 'slrg_basis_pool', isFulfilled: false }
  ]);
  assert.equal(result.summary, 'Fehlende Qualifikation: slrg_basis_pool.');
});

test('Pfad: mit 11 zu jung für den Vorkurs, mit 12 direkt anmeldbar', () => {
  const tooYoung = courseTreeEngine.findPathToTarget({ birthdate: birthdateForAge(11) }, 'voku');
  assert.deepEqual(tooYoung.ageCheck, { required: 12, actual: 11, isFulfilled: false });
  assert.equal(tooYoung.isDirectlyEligible, false);
  assert.match(tooYoung.summary, /Mindestalter \(12 Jahre\) noch nicht erreicht \(aktuell: 11 Jahre\)/);

  const ready = courseTreeEngine.findPathToTarget({ birthdate: birthdateForAge(12) }, 'voku');
  assert.equal(ready.isDirectlyEligible, true);
  assert.match(ready.summary, /kannst dich direkt anmelden/);
});

test('Pfad und Baum sind sich einig: direkt anmeldbar genau dann, wenn der Kurs im Baum bereit ist', () => {
  const personas = [
    {},
    { birthdate: birthdateForAge(13) },
    { birthdate: birthdateForAge(16), completedCourses: ['glk2'] },
    { birthdate: birthdateForAge(18), completedCourses: ['glk3'] },
    { birthdate: birthdateForAge(25), completedCourses: ['slk', 'slrg_pool'], qualifications: ['js_leiter_lst', 'slrg_basis_pool'] }
  ];
  for (const person of personas) {
    const { nodes } = courseTreeEngine.evaluatePersonInTree(person);
    for (const id of CANONICAL_IDS.filter(id => ['AVAILABLE', 'LOCKED'].includes(nodes[id].status))) {
      const { isDirectlyEligible } = courseTreeEngine.findPathToTarget(person, id);
      assert.equal(isDirectlyEligible, nodes[id].status === 'AVAILABLE', `${id} für ${JSON.stringify(person)}`);
    }
  }
});

test('Pfad: Kurse stehen in absolvierbarer Reihenfolge, jeder Vorgänger vor seinem Nachfolger', () => {
  // Ohne Geburtsdatum bleiben alle empfohlenen Vorstufen im Pfad, so wird die ganze Kette geprüft
  for (const target of ['glk3', 'experte']) {
    const result = courseTreeEngine.findPathToTarget({}, target);
    for (const list of [result.pathSteps, result.recommendedSteps]) {
      const steps = list.map(s => s.id);
      steps.forEach((id, i) => {
        const before = [...COURSE_NODES[id].prerequisites, ...(COURSE_NODES[id].recommendedPrerequisites || [])];
        for (const req of before.filter(r => steps.includes(r))) {
          assert.ok(steps.indexOf(req) < i, `${req} muss vor ${id} stehen: ${steps.join(' -> ')}`);
        }
      });
    }
    assert.deepEqual(result.recommendedSteps.map(s => s.id), ['voku', 'heku', 'glk1', 'glk2']);
  }
});

test('Pfad: unbekannte Ziele und Prototyp-Schlüssel werden abgewiesen, Aliase aufgelöst', () => {
  for (const id of ['gibt_es_nicht', 'constructor', '__proto__', 'toString', '']) {
    assert.throws(() => courseTreeEngine.findPathToTarget({}, id), /existiert nicht im Ausbildungsbaum/, id);
  }
  assert.equal(courseTreeEngine.findPathToTarget({}, 'MF').target.id, 'mf_lst');
});

// -----------------------------------------------------------------------------
// Stufenleiter-Planer
// -----------------------------------------------------------------------------

test('Planer: leere Gruppe ergibt eine leere Analyse', () => {
  const engine = new StufenleiterPlanningEngine();
  const empty = {
    totalCount: 0,
    analyzedParticipants: [],
    candidatesByCourse: {},
    urgentRenewals: [],
    summaryStats: { readyForHlk: 0, readyForGlk: 0, readyForSlk: 0, urgentRenewalCount: 0 }
  };
  assert.deepEqual(engine.analyzeGroup([]), empty);
  assert.deepEqual(engine.analyzeGroup(), empty);
});

test('Planer: ohne Geburtsdatum keine Altersempfehlung, J+S-Verfall wird trotzdem gemeldet', () => {
  const engine = new StufenleiterPlanningEngine();
  const { analyzedParticipants: [unknown, leader], summaryStats } = engine.analyzeGroup([
    { id: 'a', name: 'Ohne Datum', completedCourses: [] },
    { id: 'b', name: 'Leiterin ohne Datum', currentRole: 'Gruppenleiterin', completedCourses: ['glk3'], jsExpirationDate: inMonths(3) }
  ]);
  assert.equal(unknown.age, null);
  assert.deepEqual(unknown.recommendedCourses, []);
  assert.deepEqual(unknown.availableNextCourses, []);
  assert.deepEqual(leader.recommendedCourses.map(r => r.courseId), ['mf_lst']);
  assert.deepEqual(summaryStats, { readyForHlk: 0, readyForGlk: 0, readyForSlk: 0, urgentRenewalCount: 1 });
});

test('Planer: Heku von 14 bis 16 (ab 15 hohe Priorität), GLK 3 nach GLK 2 ab 17 (ab 18 sehr hoch)', () => {
  const engine = new StufenleiterPlanningEngine();
  const recs = (age, completedCourses = []) => engine
    .analyzeParticipant({ id: 'tn', birthdate: birthdateForAge(age), completedCourses })
    .recommendedCourses.map(r => `${r.courseId}:${r.priority}`);
  assert.deepEqual(recs(13), []);
  assert.deepEqual(recs(14), ['heku:NORMAL']);
  assert.deepEqual(recs(15), ['heku:HOCH']);
  assert.deepEqual(recs(16), ['heku:HOCH']);
  assert.ok(!recs(17).some(rec => rec.startsWith('heku:')), 'mit 17 keine Heku-Empfehlung mehr');
  assert.deepEqual(recs(16, ['heku']), []);
  assert.deepEqual(recs(17, ['glk2']), ['glk3:HOCH']);
  assert.deepEqual(recs(18, ['glk2']), ['glk3:SEHR HOCH']);
  assert.deepEqual(recs(18, ['glk3']), []);
});

test('Planer: abgeschlossene Kurse erscheinen mit dem Kürzel aus den Kursdaten, Aliase ohne Doppel', () => {
  const engine = new StufenleiterPlanningEngine();
  const codes = completedCourses => engine.analyzeParticipant({ id: 'tn', completedCourses }).completedCourseCodes;
  assert.deepEqual(codes(['heku', 'glk3', 'slk']), ['Heku', 'GLK 3', 'SLK']);
  assert.deepEqual(codes(['hlk', 'heku', 'glk', 'mf']), ['Heku', 'GLK 3', 'MF']);
  assert.deepEqual(codes(['unbekannt']), ['unbekannt']);
  assert.deepEqual(codes(undefined), []);
});

test('Planer: SLK nur für Leitende ab 18 mit GLK 3', () => {
  const engine = new StufenleiterPlanningEngine();
  const recs = (age, currentRole, completedCourses) => engine
    .analyzeParticipant({ id: 'tn', birthdate: birthdateForAge(age), currentRole, completedCourses })
    .recommendedCourses.map(r => `${r.courseId}:${r.priority}`);
  assert.deepEqual(recs(18, 'Gruppenleiterin', ['glk3']), ['slk:NORMAL']);
  assert.deepEqual(recs(19, 'Kader', ['glk3']), ['slk:HOCH']);
  assert.deepEqual(recs(19, 'Teilnehmer', ['glk3']), []);
  assert.deepEqual(recs(17, 'Gruppenleiter', ['glk3']), []);
  assert.deepEqual(recs(25, 'Scharleiter', ['slk']), []);
});

test('Planer: J+S-Verfall innert 12 Monaten stellt das Fortbildungsmodul zuoberst, dringend ab 6 Monaten Restlaufzeit', () => {
  const engine = new StufenleiterPlanningEngine();
  const leader = extra => engine.analyzeParticipant({
    id: 'tn', birthdate: birthdateForAge(19), currentRole: 'Gruppenleiter', completedCourses: ['glk3'], ...extra
  });

  // Je ein Monat neben den Schwellen 6 und 12 (die Engine rechnet mit 30.5 Tagen pro Monat)
  const soon = leader({ jsExpirationDate: inMonths(5) });
  assert.equal(soon.hasExpiringJsLeiter, true);
  assert.deepEqual(soon.recommendedCourses.map(r => `${r.courseId}:${r.priority}`), ['mf_lst:DRINGEND', 'slk:HOCH']);
  assert.equal(leader({ jsExpirationDate: inMonths(7) }).recommendedCourses[0].priority, 'HOCH');
  assert.equal(leader({ jsExpirationDate: inMonths(11) }).hasExpiringJsLeiter, true);
  assert.equal(leader({ jsExpirationDate: inMonths(13) }).hasExpiringJsLeiter, false);

  // Gültigkeit an der Qualifikation hat Vorrang vor jsExpirationDate
  const fromQual = leader({ jsExpirationDate: inMonths(24), qualifications: [{ id: 'js_leiter_lst', validUntil: inMonths(3) }] });
  assert.equal(fromQual.hasExpiringJsLeiter, true);

  // Ohne GLK 3 gibt es keine J+S-Anerkennung, die verfallen kann
  const noGlk = engine.analyzeParticipant({ id: 'x', birthdate: birthdateForAge(19), completedCourses: ['glk2'], jsExpirationDate: inMonths(3) });
  assert.equal(noGlk.hasExpiringJsLeiter, false);
});

test('Planer: abgelaufene J+S-Anerkennung wird nicht als «verfällt in -N Monaten» gemeldet', {
  todo: 'Bug #5: nach dem Ablaufdatum lautet der Grund "J+S Leiterstatus verfällt am ... (in ca. -10 Monaten)" (src/domain/stufenleiterPlanningEngine.js:149); die Demo-Person tn_3 (Ablauf 30.11.2026) zeigt das ab Dezember 2026'
}, () => {
  const engine = new StufenleiterPlanningEngine();
  const { recommendedCourses: [mf] } = engine.analyzeParticipant({
    id: 'tn', birthdate: birthdateForAge(25), completedCourses: ['glk3'], jsExpirationDate: inMonths(-10)
  });
  assert.equal(mf.courseId, 'mf_lst');
  assert.doesNotMatch(mf.reason, /in ca\. -\d+ Monaten/);
});

test('Planer: neuer Vorschlag ersetzt den alten derselben Person und erscheint in der Analyse', () => {
  const engine = new StufenleiterPlanningEngine();
  const lea = { id: 'tn', name: 'Lea', birthdate: birthdateForAge(17), completedCourses: ['heku'] };

  // GLK 1 und GLK 2 sind nur empfohlen: GLK 3 ist mit 17 direkt möglich
  assert.equal(engine.proposeCourse(lea, { courseId: 'glk3' }).nomination.isEligibleNow, true);
  const { nomination } = engine.proposeCourse(lea, { courseId: 'pionier' });
  assert.equal(nomination.isEligibleNow, false); // Pioniertechnik verlangt GLK 1
  assert.equal(nomination.missingPrerequisitesCount, 1);

  assert.deepEqual(engine.getAllNominations().map(n => n.courseId), ['pionier']);
  assert.equal(engine.analyzeParticipant(lea).activeNomination.courseId, 'pionier');
});

test('Planer: Vorschlag für unbekannten Kurs wirft und speichert nichts', () => {
  const engine = new StufenleiterPlanningEngine();
  for (const courseId of ['gibt_es_nicht', 'constructor']) {
    assert.throws(() => engine.proposeCourse({ id: 'tn' }, { courseId }), Error, courseId);
  }
  assert.deepEqual(engine.getAllNominations(), []);
});

test('Kurstitel folgen `gender` aus der Cevi-DB, ohne Angabe gilt die neutrale Website-Form', () => {
  const cases = [
    ['w', 'Gruppenleiterinnenkurs 1 (GLK 1)', 'Helferinnenkurs (Heku)'],
    ['m', 'Gruppenleiterkurs 1 (GLK 1)', 'Helferkurs (Heku)'],
    [undefined, 'Gruppenleiter/-innen-Kurs 1 (GLK 1)', 'Helfer/-innen-Kurs (Heku)']
  ];
  for (const [gender, glk1, heku] of cases) {
    assert.equal(withGenderTitles(COURSE_NODES, gender).glk1.title, glk1, gender);
    const tree = courseTreeEngine.forGender(gender);
    assert.equal(tree.evaluatePersonInTree({ birthdate: birthdateForAge(14) }).nodes.glk1.title, glk1, gender);
    assert.match(tree.findPathToTarget({}, 'glk2').summary, new RegExp(glk1.replace(/[()/+]/g, '\\$&')), gender);
    // Planer: das Geschlecht der jeweiligen Person
    const planner = new StufenleiterPlanningEngine();
    const person = { id: 'tn', gender, birthdate: birthdateForAge(15) };
    assert.equal(planner.analyzeParticipant(person).recommendedCourses[0].courseTitle, heku, gender);
    assert.equal(planner.proposeCourse(person, { courseId: 'glk1' }).nomination.courseTitle, glk1, gender);
  }
  // Unbekannte Werte fallen auf die neutrale Form zurück, die Kursdaten bleiben unverändert
  assert.equal(withGenderTitles(COURSE_NODES, 'constructor').glk1.title, 'Gruppenleiter/-innen-Kurs 1 (GLK 1)');
  assert.equal(COURSE_NODES.glk1.title, 'Gruppenleiter/-innen-Kurs 1 (GLK 1)');
  // Kurse ohne Personenbezeichnung haben nur die neutrale Form
  assert.equal(withGenderTitles(COURSE_NODES, 'w').js_coach.title, 'J+S-Coachkurs');
});
