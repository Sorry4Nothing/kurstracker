import { COURSE_NODES } from './courseTreeData.js';

// Kursvorschläge einer Stufe (#131): Prüfung der Einträge, bevor sie gespeichert werden.
// Alles stammt aus dem Browser und wird hier neu geprüft; «manuell» entscheidet allein der Server.

// Der JSON-Body ist auf 50 kb begrenzt: 60 Einträge mit voller Bemerkung passen sicher hinein
export const MAX_ENTRIES = 60;
export const MAX_NOTE = 500;
export const MAX_SEASON = 50;

export const STATUS_DRAFT = 'entwurf';
export const STATUS_OPEN = 'offen'; // noch nichts gespeichert, kommt nie aus der Datenbank
export const STATUS_SUBMITTED = 'abgegeben';

const invalid = message => Object.assign(new Error(message), { status: 400 });

/**
 * @param {unknown} raw Einträge aus dem Body
 * @param {{ members: Array<object>, candidatesByCourse: Record<string, Array<{participantId: string}>>, previous?: Array<object>, user: string }} context
 *   members: Personen der Stufe; candidatesByCourse: wer laut System für welchen Kurs vorgesehen ist (Analyse der Planer-Engine);
 *   previous: gespeicherte Einträge, deren Vorschlagende bleiben; user: wer einen neuen Eintrag vorschlägt
 * @returns {Array<{ personId: string, courseId: string, season: string, note: string, manual: boolean, proposedBy: string }>}
 */
export function normalizeEntries(raw, { members, candidatesByCourse, previous = [], user }) {
  if (!Array.isArray(raw)) throw invalid('Einträge fehlen');
  if (raw.length > MAX_ENTRIES) throw invalid(`Höchstens ${MAX_ENTRIES} Vorschläge je Stufe`);
  const byId = new Map(members.map(member => [member.id, member]));
  const seen = new Set();
  return raw.map(entry => {
    if (typeof entry !== 'object' || entry === null) throw invalid('Ungültiger Eintrag');
    const { personId, courseId } = entry;
    const person = typeof personId === 'string' ? byId.get(personId) : undefined;
    if (!person) throw invalid('Person nicht in dieser Stufe');
    if (typeof courseId !== 'string' || !Object.hasOwn(COURSE_NODES, courseId)) throw invalid('Ungültiger Zielkurs');
    const key = `${personId}|${courseId}`;
    if (seen.has(key)) throw invalid(`${person.ceviname || person.name} ist für diesen Kurs doppelt vorgeschlagen`);
    seen.add(key);
    for (const field of ['season', 'note']) {
      if (entry[field] != null && typeof entry[field] !== 'string') throw invalid('Ungültiger Eintrag');
    }
    const note = (entry.note ?? '').trim();
    const season = (entry.season ?? '').trim();
    if (note.length > MAX_NOTE) throw invalid(`Bemerkung höchstens ${MAX_NOTE} Zeichen`);
    if (season.length > MAX_SEASON) throw invalid(`Saison höchstens ${MAX_SEASON} Zeichen`);
    const manual = !candidatesByCourse[courseId]?.some(candidate => candidate.participantId === personId);
    if (manual && !note) {
      throw invalid(`Für ${person.ceviname || person.name} braucht es eine Bemerkung: das System schlägt diesen Kurs nicht vor`);
    }
    // Wer vorgeschlagen hat, bestimmt allein der Server: der frühere Eintrag, sonst die angemeldete Person
    const proposedBy = previous.find(old => old.personId === personId && old.courseId === courseId)?.proposedBy ?? user;
    return { personId, courseId, season, note, manual, proposedBy };
  });
}
