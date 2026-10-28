// Wer im Stufenleiter-Planer welche Gruppen sieht (#108). Rollen werden am Rollentyp der Cevi-DB erkannt, nicht am Anzeigenamen.

// Gruppentypen, die als Stufe zählen. Im Fröschli besuchen die Kinder keine Kurse: dort zählen nur Leitende
// (Froeschlileiter, Froeschlihauptleiter), und die schlägt allein die Abteilungsleitung vor (canEditGroup)
export const FROESCHLI = 'Group::Froeschli';
export const STUFE_TYPES = ['Group::Stufe', FROESCHLI];
const isFroeschliLeiter = group => (group.roleTypes || []).some(type => /leiter$/i.test(type));
export const ABTEILUNGSLEITUNG = 'Group::Jungschar::Abteilungsleiter';
export const STUFENLEITUNG = ['Group::Stufe::Stufenleiter'];

// shortcut: Rollen als Text (Testdaten, Demo-Profil) öffnen den Planer wie bisher für alle Gruppen; echte Logins liefern Rollenobjekte
const LEGACY_ROLES = ['abteilungsleiter', 'stufenleiter'];
const legacyRoleAllowed = (role, allowedRoles = LEGACY_ROLES) =>
  // Wortweise vergleichen statt Substring: "Stufenleiterin" zählt, "Ex-Abteilungsleiter-Kurs" als Teilwort nicht
  String(role).toLowerCase().replace(/[*:]/g, '').split(/[^a-zäöüéèà]+/).some(word =>
    allowedRoles.some(allowed => word === allowed || word === `${allowed}in`)
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

/** NOLK (Nationaler Ortsgruppenleitenden-Kurs) ist Abteilungsleitungs-Sache - AL sieht auch, was SL sieht. */
export function isAbteilungsleitung(scope) {
  return !!scope && (scope.all || scope.departments.size > 0);
}

/** SLK (Stufenleiter*innen-Kurs) braucht mindestens Stufenleitung, AL eingeschlossen. */
export function isStufenleitung(scope) {
  return !!scope && (scope.all || scope.departments.size > 0 || scope.groups.size > 0);
}

const FROESCHLI_LEITUNG = ['Group::Froeschli::Froeschlileiter', 'Group::Froeschli::Froeschlihauptleiter'];

/** Froesch-Up richtet sich an Leitende im Froeschli (Rollenobjekte der Cevi-DB, Textrollen wie im Demo-Profil). */
export function isFroeschliLeitung(user) {
  return (user?.roles || []).some(role => (typeof role === 'string'
    ? /fr(ö|oe)schli(haupt)?leiter/i.test(role)
    : FROESCHLI_LEITUNG.includes(role?.role_class)));
}

/**
 * Nur die Mitglieder und Gruppen, die der Scope zeigt. Mitglieder ohne sichtbare Gruppe fallen weg,
 * und jede Person trägt nur die sichtbaren Gruppen (Mitgliedschaften in anderen Abteilungen bleiben verborgen).
 */
export function visibleTo(scope, members) {
  if (!scope) return [];
  // Region, Schweiz oder aufgelöste Vereine sind keine Stufen und gehören nie in den Planer
  const isStufe = group => STUFE_TYPES.includes(group.type) && (group.type !== FROESCHLI || isFroeschliLeiter(group));
  if (scope.all) {
    // Wer nur in Nicht-Stufen (Region, Fröschli-Kinder) steckt, fällt weg; Mitglieder ganz ohne Gruppen (Demo, lokal) bleiben
    return members
      .map(member => ({ ...member, groups: (member.groups || []).filter(isStufe) }))
      .filter((member, i) => member.groups.length || !(members[i].groups || []).length);
  }
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

/**
 * Abteilungen, deren Cevi-DB-Zugang die Person verwalten darf (#129): nur die der eigenen Abteilungsleiter-Rolle.
 * Rollen als Text (Demo-Profil) gelten für die Abteilungen, in denen die Gruppen des Profils Abteilungsleiter nennen.
 * @param {{ roles?: Array<string|object> }} user Userinfo der Cevi-DB
 * @returns {Array<{ id: string, name: string }>}
 */
export function leadDepartments(user) {
  const roles = user?.roles || [];
  const departments = new Map();
  for (const role of roles) {
    if (typeof role !== 'object' || role === null || role.group_id == null || role.role_class !== ABTEILUNGSLEITUNG) continue;
    const id = String(role.group_id);
    departments.set(id, { id, name: String(role.group_name || `Abteilung ${id}`) });
  }
  if (!departments.size && roles.some(role => typeof role === 'string' && legacyRoleAllowed(role, ['abteilungsleiter']))) {
    // Demo-Profil: Abteilung aus den Gruppen des Profils, wie sie live aus den Rollen käme
    for (const group of user.groups || []) {
      if (String(group.role).toLowerCase() === 'abteilungsleiter') departments.set(String(group.id), { id: String(group.id), name: String(group.name) });
    }
  }
  return [...departments.values()];
}

/** Vorschläge einer Stufe bearbeiten (#131): die Stufenleitung dieser Stufe, im Fröschli nur die Abteilungsleitung (scope.all = Demo-/Testrollen) */
export const canEditGroup = (scope, group) => Boolean(scope) && (scope.all === true || scope.groups.has(group.id)
  || (group.type === FROESCHLI && scope.departments.has(group.departmentId)));

/** Abgegebene Vorschläge zurückgeben (#131): nur die Abteilungsleitung der Abteilung */
export const canReopenGroup = (scope, group) => Boolean(scope) && (scope.all === true || scope.departments.has(group.departmentId));
