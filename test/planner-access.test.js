import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plannerScope, visibleTo, groupsOf, isAbteilungsleitung, isStufenleitung, isFroeschliLeitung, canEditGroup } from '../src/domain/plannerAccess.js';

const role = (role_class, group_id) => ({ role_class, group_id });
const stufe = (id, departmentId = '1') => ({ id, name: `Stufe ${id}`, type: 'Group::Stufe', departmentId, departmentName: 'JS Stäfa-Hombrechtikon' });
const members = [
  { id: 'a', groups: [stufe('10')] },
  { id: 'b', groups: [stufe('11')] },
  { id: 'c', groups: [stufe('10'), stufe('20', '2')] }
];

test('Planner-Zugriff: Rollen ohne Planer-Recht und Teilnehmende bekommen keinen Scope (#108)', () => {
  assert.equal(plannerScope(null), null);
  assert.equal(plannerScope({ roles: [] }), null);
  for (const cls of ['Group::Gruppe::Gruppenleiter', 'Group::Froeschli::Froeschlileiter', 'Group::Froeschli::Froeschlihauptleiter', 'Group::Jungschar::Coach', 'Group::Stufe::Teilnehmer']) {
    assert.equal(plannerScope({ roles: [role(cls, 10)] }), null, cls);
  }
});

test('Planner-Zugriff: Stufenleitung sieht nur die eigene Stufe (#108)', () => {
  const scope = plannerScope({ roles: [role('Group::Stufe::Stufenleiter', 10)] });
  assert.deepEqual(visibleTo(scope, members).map(m => m.id), ['a', 'c']);
  assert.deepEqual(visibleTo(scope, members).find(m => m.id === 'c').groups.map(g => g.id), ['10']);
});

test('Planner-Zugriff: Abteilungsleitung sieht alle Stufen ihrer Abteilung, nicht fremde (#108)', () => {
  const scope = plannerScope({ roles: [role('Group::Jungschar::Abteilungsleiter', '1'), role('Group::Stufe::Stufenleiter', 10)] });
  const visible = visibleTo(scope, members);
  assert.deepEqual(visible.map(m => m.id), ['a', 'b', 'c']);
  assert.deepEqual(visible.find(m => m.id === 'c').groups.map(g => g.id), ['10']);
});

test('Planner-Zugriff: NOLK braucht Abteilungsleitung, SLK reicht Stufenleitung - AL sieht beides', () => {
  assert.equal(isAbteilungsleitung(null), false);
  assert.equal(isStufenleitung(null), false);

  const slScope = plannerScope({ roles: [role('Group::Stufe::Stufenleiter', 10)] });
  assert.equal(isAbteilungsleitung(slScope), false);
  assert.equal(isStufenleitung(slScope), true);

  const alScope = plannerScope({ roles: [role('Group::Jungschar::Abteilungsleiter', '1')] });
  assert.equal(isAbteilungsleitung(alScope), true);
  assert.equal(isStufenleitung(alScope), true);
});

test('Planner-Zugriff: Frösch-Up sehen nur Fröschli-Leitende', () => {
  assert.equal(isFroeschliLeitung(null), false);
  assert.equal(isFroeschliLeitung({ roles: [role('Group::Froeschli::Froeschlileiter', 30)] }), true);
  assert.equal(isFroeschliLeitung({ roles: [role('Group::Froeschli::Froeschlihauptleiter', 30)] }), true);
  assert.equal(isFroeschliLeitung({ roles: ['Fröschlileiterin'] }), true);
  for (const cls of ['Group::Froeschli::Teilnehmer', 'Group::Stufe::Stufenleiter', 'Group::Jungschar::Abteilungsleiter']) {
    assert.equal(isFroeschliLeitung({ roles: [role(cls, 30)] }), false, cls);
  }
  assert.equal(isFroeschliLeitung({ roles: ['Abteilungsleiter', 'Kursleiter'] }), false);
});

test('Planner-Zugriff: ohne Scope bleibt die Liste leer, Gruppen und Abteilungen kommen aus den sichtbaren Mitgliedern (#106)', () => {
  assert.deepEqual(visibleTo(null, members), []);
  const { groups, departments } = groupsOf(members);
  assert.deepEqual(groups.map(g => g.id).sort(), ['10', '11', '20']);
  assert.deepEqual(departments, ['JS Stäfa-Hombrechtikon']);
});

test('Planner-Zugriff: Region, Schweiz und Vereine zählen nie als Stufe, auch nicht bei vollem Zugriff', () => {
  const region = { id: '99', name: 'Region Zürich', type: 'Group::Region', departmentId: '99', departmentName: 'Region Zürich' };
  const people = [{ id: 'a', groups: [stufe('10'), region] }, { id: 'b', groups: [region] }];
  const visible = visibleTo({ all: true }, people);
  assert.deepEqual(visible.map(m => m.groups.map(g => g.id)), [['10']]);
  assert.deepEqual(groupsOf(visible).departments, ['JS Stäfa-Hombrechtikon']);
});

test('Planner-Zugriff: Fröschli zeigt nur Leitende, vorgeschlagen werden sie allein von der Abteilungsleitung (#131)', () => {
  const froeschli = roleTypes => ({ id: '30', name: 'Fröschli', type: 'Group::Froeschli', departmentId: '1', roleTypes });
  const people = [
    { id: 'kind', groups: [froeschli(['Group::Froeschli::Teilnehmer'])] },
    { id: 'leiter', groups: [froeschli(['Group::Froeschli::Froeschlileiter'])] },
    { id: 'haupt', groups: [froeschli(['Group::Froeschli::Froeschlihauptleiter'])] }
  ];
  const lead = plannerScope({ roles: [role('Group::Jungschar::Abteilungsleiter', '1')] });
  assert.deepEqual(visibleTo(lead, people).map(m => m.id), ['leiter', 'haupt']);
  assert.deepEqual(visibleTo({ all: true }, people).map(m => m.id), ['leiter', 'haupt']);

  const stufenleitung = plannerScope({ roles: [role('Group::Stufe::Stufenleiter', 10)] });
  assert.deepEqual(visibleTo(stufenleitung, people), []);
  assert.equal(canEditGroup(lead, people[1].groups[0]), true);
  assert.equal(canEditGroup(stufenleitung, people[1].groups[0]), false);
  assert.equal(canEditGroup(lead, stufe('10')), false, 'normale Stufen schlägt die Stufenleitung vor');
});
