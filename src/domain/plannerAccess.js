// Wer im Stufenleiter-Planer welche Gruppen sieht (#108). Rollen werden am Rollentyp der Cevi-DB erkannt, nicht am Anzeigenamen.

// Gruppentypen, die als Stufe zählen (Fröschli ist eine normale Stufe)
export const STUFE_TYPES = ['Group::Stufe', 'Group::Froeschli'];
const ABTEILUNGSLEITUNG = 'Group::Jungschar::Abteilungsleiter';
const STUFENLEITUNG = ['Group::Stufe::Stufenleiter'];

// shortcut: Rollen als Text (Testdaten, Demo-Profil) öffnen den Planer wie bisher für alle Gruppen; echte Logins liefern Rollenobjekte
const LEGACY_ROLES = ['abteilungsleiter', 'stufenleiter'];
const legacyRoleAllowed = role =>
  // Wortweise vergleichen statt Substring: "Stufenleiterin" zählt, "Ex-Abteilungsleiter-Kurs" als Teilwort nicht
  String(role).toLowerCase().replace(/[*:]/g, '').split(/[^a-zäöüéèà]+/).some(word =>
    LEGACY_ROLES.some(allowed => word === allowed || word === `${allowed}in`)
  );

/**
 * Sichtbarkeit der eingeloggten Person: null (kein Planer), { all: true } oder
 * { departments, groups } mit den IDs der Abteilungen bzw. Stufen, die sie sehen darf.
 * Abteilungsleitung sieht alle Stufen ihrer Abteilung, Stufenleitung nur die eigene Stufe.
 * @param {{ roles?: Array<string|object> }} user Userinfo der Cevi-DB
 */
export function plannerScope(user) {
  const roles = user?.roles || [];
  if (roles.some(role => typeof role === 'string' && legacyRoleAllowed(role))) return { all: true };
  const scope = { departments: new Set(), groups: new Set() };
  for (const role of roles) {
    if (typeof role !== 'object' || role === null || role.group_id == null) continue;
    if (role.role_class === ABTEILUNGSLEITUNG) scope.departments.add(String(role.group_id));
    else if (STUFENLEITUNG.includes(role.role_class)) scope.groups.add(String(role.group_id));
  }
  return scope.departments.size || scope.groups.size ? scope : null;
}

/**
 * Nur die Mitglieder und Gruppen, die der Scope zeigt. Mitglieder ohne sichtbare Gruppe fallen weg,
 * und jede Person trägt nur die sichtbaren Gruppen (Mitgliedschaften in anderen Abteilungen bleiben verborgen).
 */
export function visibleTo(scope, members) {
  if (!scope) return [];
  // Region, Schweiz oder aufgelöste Vereine sind keine Stufen und gehören nie in den Planer
  const isStufe = group => STUFE_TYPES.includes(group.type);
  if (scope.all) return members.map(member => ({ ...member, groups: (member.groups || []).filter(isStufe) }));
  const allowed = group => isStufe(group) && (scope.groups.has(group.id) || scope.departments.has(group.departmentId));
  return members
    .map(member => ({ ...member, groups: (member.groups || []).filter(allowed) }))
    .filter(member => member.groups.length);
}

/** Eindeutige Gruppen und Abteilungen der sichtbaren Mitglieder, für Filter und Untertitel */
export function groupsOf(members) {
  const groups = new Map();
  for (const group of members.flatMap(member => member.groups || [])) groups.set(group.id, group);
  const list = [...groups.values()];
  return {
    groups: list.filter(group => STUFE_TYPES.includes(group.type)),
    departments: [...new Set(list.map(group => group.departmentName).filter(Boolean))]
  };
}
