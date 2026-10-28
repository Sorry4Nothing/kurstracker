import { COURSE_NODES, COURSE_NODES_BY_REGION, withGenderTitles } from './courseTreeData.js';

// Qualifikations-Herkunft uber alle Baeume hinweg (Standardbaum + jede Region): manche
// Qualifikationen (z.B. SLRG-Module) werden nur in einer einzelnen Region vergeben - eine Engine,
// die nur auf der eigenen Region rechnet, faende den vergebenden Kurs sonst nicht und zeigte den
// rohen Key an, ohne Hinweis, wie man an die Qualifikation kommt.
const GLOBAL_QUAL_GRANTERS = (() => {
  const map = {};
  const scan = (nodes) => Object.values(nodes).forEach(n => (n.grantsQualifications || []).forEach(q => {
    if (!map[q]) map[q] = { id: n.id, title: n.title };
  }));
  scan(COURSE_NODES);
  Object.values(COURSE_NODES_BY_REGION).forEach(scan);
  return map;
})();

// Kurzbezeichnungen aus Altdaten und Tests auf die Baum-IDs abbilden
const COURSE_ALIASES = { glk: 'glk3', hlk: 'heku', mf: 'mf_lst' };

// Eine empfohlene Vorstufe wird nur bis so viele Jahre uber ihrem recommendedAge
// vorgeschlagen; danach ist man herausgewachsen (z.B. Voku fur Erwachsene)
const RECOMMENDED_AGE_TOLERANCE_YEARS = 1;

/**
 * CourseTreeEngine - Berechnungslogik fur den Cevi & J+S Ausbildungsbaum
 * Unterstutzt Cevi Region Zuerich Reglement & J+S Lagersport/Trekking
 */
export class CourseTreeEngine {
  constructor(nodes = COURSE_NODES) {
    this.nodes = nodes;
  }

  /**
   * Engine mit Kurstiteln in der Form fur `gender` aus der Cevi-DB
   * @param {string} [gender] - 'm' oder 'w', sonst neutrale Form
   * @returns {CourseTreeEngine}
   */
  forGender(gender) {
    return new CourseTreeEngine(withGenderTitles(this.nodes, gender));
  }

  /**
   * Bildet eine Kurs-ID (auch Aliase wie 'glk' und Kürzel der Cevi-DB wie 'GLK 1') auf die Baum-ID ab
   * @param {string} courseId
   * @returns {string}
   */
  resolveCourseId(courseId) {
    const id = String(courseId || '').toLowerCase().replace(/\s+/g, '');
    return COURSE_ALIASES[id] || id;
  }

  /**
   * Normalisiert ein Set von Kurs-IDs: Aliase auflosen und alle Pflicht-Vorganger
   * sowie empfohlenen Vorstufen erganzen. Eine spatere Stufe ersetzt die fruheren:
   * wer GLK 3 hat, fur den gelten GLK 2, GLK 1, Heku und Voku als erledigt, auch
   * wenn er sie ubersprungen hat.
   * @param {string[]|Set<string>} courses
   * @returns {Set<string>}
   */
  normalizeCourseSet(courses = []) {
    const set = new Set();
    const add = (id) => {
      if (!id || set.has(id)) return;
      set.add(id);
      (this.nodes[id]?.prerequisites || []).forEach(add);
      (this.nodes[id]?.recommendedPrerequisites || []).forEach(add);
    };
    Array.from(courses || []).forEach(c => add(this.resolveCourseId(c)));

    // Aliase spiegeln, damit Abfragen mit 'glk', 'hlk' oder 'mf' weiter funktionieren
    for (const [alias, id] of Object.entries(COURSE_ALIASES)) {
      if (set.has(id)) set.add(alias);
    }
    return set;
  }

  /**
   * Ein Kurs gilt auch als absolviert, wenn completedCourses ihn nicht listet, aber die Person
   * bereits alle Qualifikationen hat, die der Kurs vergibt (z.B. ein Brevet aus der Cevi-DB ohne
   * passenden Kurs-Teilnahme-Datensatz) - sonst widersprechen sich Kurs-Pfad und Qualifikations-
   * Checkliste: derselbe Kurs steht als "noch offen" und seine Qualifikation gleichzeitig als
   * "bestaetigt".
   * @param {string} id
   * @param {Set<string>} completed
   * @param {Set<string>} quals
   * @returns {boolean}
   */
  isEffectivelyCompleted(id, completed, quals) {
    if (completed.has(id)) return true;
    const grants = this.nodes[id]?.grantsQualifications || [];
    return grants.length > 0 && grants.every(q => quals.has(q));
  }

  /**
   * Kurs, der eine Qualifikation vergibt (z.B. "js_sec_wasser" -> der Kurs "J+S-Modul
   * Sicherheitsbereich Wasser"): zeigt, wie man an die Qualifikation kommt. Erst im eigenen
   * Baum gesucht, sonst ueber alle Regionen; ohne Treffer null, nie erfunden.
   * @param {string} qualKey
   * @returns {{id: string, title: string}|null}
   */
  qualGranter(qualKey) {
    const local = Object.values(this.nodes).find(n => (n.grantsQualifications || []).includes(qualKey));
    if (local) return { id: local.id, title: local.title };
    return GLOBAL_QUAL_GRANTERS[qualKey] || null;
  }

  /**
   * Lesbarer Name einer Qualifikation, siehe {@link qualGranter}. Ohne Treffer der rohe Key.
   * @param {string} qualKey
   * @returns {string}
   */
  qualLabel(qualKey) {
    return this.qualGranter(qualKey)?.title || qualKey;
  }

  /**
   * Normalisiert Qualifikationen (Strings oder Objekte mit id/key) zu einem Set von IDs
   * @param {Array<string|object>} qualifications
   * @returns {Set<string>}
   */
  normalizeQualifications(qualifications = []) {
    return new Set((qualifications || []).map(q => {
      const str = typeof q === 'string' ? q : (q?.id || q?.key || '');
      return str.toLowerCase().trim();
    }));
  }

  /**
   * Berechnet das Alter nach Jahrgang (Kalenderjahr), so wie Cevi/J+S die
   * Mindestalter-Angaben auf cevi.db selbst auswerten ("13 Jahre (Jahrgang)"):
   * massgebend ist nur das Geburtsjahr, nicht der exakte Geburtstag. Wer im
   * laufenden Kalenderjahr das Mindestalter erreicht, ist schon zugelassen.
   * @param {string|Date} birthdate
   * @param {Date} [referenceDate]
   * @returns {number|null} null, wenn das Geburtsdatum fehlt oder ungultig ist
   */
  calculateAge(birthdate, referenceDate = new Date()) {
    const birth = this.parseBirthdate(birthdate);
    return birth ? referenceDate.getFullYear() - birth.getFullYear() : null;
  }

  /**
   * Tatsächliches Alter an einem Stichtag (Monat und Tag zählen), für die Anzeige.
   * Zulassung und Planung rechnen dagegen mit calculateAge (Jahrgang).
   * @param {string|Date} birthdate
   * @param {Date} [referenceDate]
   * @returns {number|null} null, wenn das Geburtsdatum fehlt oder ungultig ist
   */
  calculateExactAge(birthdate, referenceDate = new Date()) {
    const birth = this.parseBirthdate(birthdate);
    if (!birth) return null;
    const birthdayPassed = referenceDate.getMonth() > birth.getMonth()
      || (referenceDate.getMonth() === birth.getMonth() && referenceDate.getDate() >= birth.getDate());
    return referenceDate.getFullYear() - birth.getFullYear() - (birthdayPassed ? 0 : 1);
  }

  parseBirthdate(birthdate) {
    if (!birthdate) return null;
    let birth;
    if (typeof birthdate === 'string' && /^\d{2}\.\d{2}\.\d{4}/.test(birthdate.trim())) {
      const parts = birthdate.trim().split('.');
      birth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      birth = new Date(birthdate);
    }
    return isNaN(birth.getTime()) ? null : birth;
  }

  /**
   * Pruft das Mindestalter; ohne bekanntes Alter gilt es als nicht erfullt
   * @returns {boolean}
   */
  meetsMinAge(personAge, minAge) {
    return !minAge || (personAge !== null && personAge >= minAge);
  }

  /**
   * Bewertet den Zustand aller Baum-Knoten fur eine Person
   * @param {object} person
   * @param {string[]} [person.completedCourses] - IDs der absolvierten Kurse (z.B. ['voku', 'heku', 'glk1', 'glk2', 'glk3'])
   * @param {string[]} [person.qualifications] - IDs der vorhandenen Qualifikationen (z.B. ['js_leiter_lst'])
   * @param {string|Date} [person.birthdate] - Geburtsdatum
   * @returns {object} Tree State mit Status pro Knoten
   */
  evaluatePersonInTree(person = {}) {
    const completed = this.normalizeCourseSet(person.completedCourses || []);
    const quals = this.normalizeQualifications(person.qualifications);
    const personAge = this.calculateAge(person.birthdate);

    const evaluatedNodes = {};
    const availableNextCourses = [];

    // Eindeutige Knoten iterieren (ohne Alias-Duplikate)
    const uniqueNodeEntries = Object.entries(this.nodes).filter(([id, node]) => node.id === id);

    for (const [id, node] of uniqueNodeEntries) {
      const isCompleted = completed.has(id);

      // Voraussetzungen prufen
      const missingPrereqs = (node.prerequisites || []).filter(req => !completed.has(req));
      const missingQuals = (node.requiredQualifications || []).filter(req => !quals.has(req));
      const ageMet = this.meetsMinAge(personAge, node.minAge);

      let status = 'LOCKED';
      const blockers = [];

      if (isCompleted) {
        status = 'COMPLETED';
      } else {
        if (!ageMet) {
          blockers.push(personAge === null
            ? `Geburtsdatum fehlt (Mindestalter ${node.minAge} Jahre nicht prufbar)`
            : `Mindestalter nicht erreicht (benotigt: ${node.minAge} Jahre, aktuell: ${personAge} Jahre)`);
        }
        if (missingPrereqs.length > 0) {
          const titles = missingPrereqs.map(p => this.nodes[p]?.title || p).join(', ');
          blockers.push(`Fehlende Vorgangerkurse: ${titles}`);
        }
        if (missingQuals.length > 0) {
          blockers.push(`Fehlende Qualifikationen: ${missingQuals.map(q => this.qualLabel(q)).join(', ')}`);
        }

        if (blockers.length === 0) {
          status = 'AVAILABLE';
          availableNextCourses.push({
            id: node.id,
            title: node.title,
            category: node.category,
            recommendedAge: node.recommendedAge
          });
        }
      }

      evaluatedNodes[id] = {
        ...node,
        status,
        isCompleted,
        isAvailable: status === 'AVAILABLE',
        isLocked: status === 'LOCKED',
        blockers,
        missingPrerequisites: missingPrereqs,
        missingQualifications: missingQuals
      };
    }

    // Aliase auch in evaluatedNodes spiegeln
    for (const [alias, id] of Object.entries(COURSE_ALIASES)) {
      if (evaluatedNodes[id] && !evaluatedNodes[alias]) {
        evaluatedNodes[alias] = { ...evaluatedNodes[id], id: alias };
      }
    }

    return {
      personAge,
      availableNextCourses,
      nodes: evaluatedNodes,
      completedCourseIds: Array.from(completed)
    };
  }

  /**
   * Berechnet den Pfad zu einem Wunsch-Zielkurs
   * Rekursiver Vorbedingungen-Graph mit Soll-Ist-Abgleich.
   * @param {object} person
   * @param {string} targetCourseId
   * @returns {object} Pfadanalyse mit erfullten und noch fehlenden Schritten
   */
  findPathToTarget(person = {}, targetCourseId) {
    const targetNode = this.nodes[this.resolveCourseId(targetCourseId)];
    if (!targetNode || !Object.hasOwn(this.nodes, targetNode.id)) {
      throw new Error(`Zielkurs '${targetCourseId}' existiert nicht im Ausbildungsbaum.`);
    }

    const completed = this.normalizeCourseSet(person.completedCourses || []);
    const quals = this.normalizeQualifications(person.qualifications);
    const personAge = this.calculateAge(person.birthdate);

    // Transitive Vorbedingungen in Kettenreihenfolge sammeln: Tiefensuche, Vorganger
    // vor Nachfolger. Erst nur Pflicht-Vorganger (sperren den Zielkurs), dann mit den
    // empfohlenen Vorstufen (sperren nicht) ohne die bereits gefundenen Pflichtkurse.
    const collect = (followRecommended, exclude) => {
      const order = [];
      const seen = new Set([targetNode.id]);
      const walk = (courseId) => {
        const node = this.nodes[courseId];
        if (!node) return;
        const next = [
          ...(node.prerequisites || []),
          ...(followRecommended ? (node.recommendedPrerequisites || []) : [])
        ];
        for (const id of next) {
          if (seen.has(id)) continue;
          seen.add(id);
          walk(id);
          if (!exclude.has(id) && this.nodes[id]) order.push(id);
        }
      };
      walk(targetNode.id);
      return order;
    };
    const requiredIds = collect(false, new Set());
    // Empfohlen bleibt, was absolviert ist oder noch zum Alter passt (ohne Geburtsdatum alles)
    const fitsAge = (id) => personAge === null ||
      personAge <= (this.nodes[id].recommendedAge ?? Infinity) + RECOMMENDED_AGE_TOLERANCE_YEARS;
    const recommendedIds = collect(true, new Set(requiredIds))
      .filter(id => this.isEffectivelyCompleted(id, completed, quals) || fitsAge(id));

    const toStep = (id, openStatus) => {
      const node = this.nodes[id];
      const done = this.isEffectivelyCompleted(id, completed, quals);
      return {
        id,
        title: node.title,
        category: node.category,
        isCompleted: done,
        status: done ? 'ERFULLT' : openStatus
      };
    };
    const pathSteps = requiredIds.map(id => toStep(id, 'NOCH ZU ABSOLVIEREN'));
    const recommendedSteps = recommendedIds.map(id => toStep(id, 'EMPFOHLEN'));

    // Fehlende Kurse auf dem Pfad: Pflicht sperrt, Empfehlung nur als Hinweis
    const missingCourses = pathSteps.filter(s => !s.isCompleted);
    const missingRecommended = recommendedSteps.filter(s => !s.isCompleted);

    // Voraussetzungen des Zielkurses selbst prufen
    const targetDirectPrereqs = (targetNode.prerequisites || []).map(id => ({
      id,
      title: this.nodes[id]?.title || id,
      isFulfilled: this.isEffectivelyCompleted(id, completed, quals)
    }));

    const targetQualCheck = (targetNode.requiredQualifications || []).map(q => {
      const granter = this.qualGranter(q);
      return {
        id: q,
        label: granter?.title || q,
        grantedByCourseId: granter?.id || null,
        isFulfilled: quals.has(q)
      };
    });

    const ageCheck = {
      required: targetNode.minAge || 0,
      actual: personAge,
      isFulfilled: this.meetsMinAge(personAge, targetNode.minAge)
    };

    const isDirectlyEligible = missingCourses.length === 0 &&
      targetQualCheck.every(q => q.isFulfilled) &&
      ageCheck.isFulfilled;

    return {
      target: {
        id: targetNode.id,
        title: targetNode.title,
        category: targetNode.category,
        minAge: targetNode.minAge
      },
      isDirectlyEligible,
      stepsRemainingCount: missingCourses.length,
      pathSteps,
      missingCourses,
      recommendedSteps,
      missingRecommended,
      targetDirectPrereqs,
      targetQualCheck,
      ageCheck,
      summary: this.generatePathSummary(targetNode, missingCourses, ageCheck, targetQualCheck, missingRecommended)
    };
  }

  /**
   * Generiert eine verstandliche Zusammenfassung des Pfads ohne Emojis
   */
  generatePathSummary(targetNode, missingCourses, ageCheck, qualChecks, missingRecommended = []) {
    const recommendation = missingRecommended.length > 0
      ? `Empfohlen vorher (keine Pflicht): ${missingRecommended.map(c => c.title).join(' -> ')}.`
      : '';

    if (missingCourses.length === 0 && ageCheck.isFulfilled && qualChecks.every(q => q.isFulfilled)) {
      const eligible = `Du erfullst alle Voraussetzungen fur den ${targetNode.title} und kannst dich direkt anmelden.`;
      return recommendation ? `${eligible} ${recommendation}` : eligible;
    }

    // Kurz halten: die genauen Titel/Namen stehen schon einzeln in der Checkliste darunter,
    // hier nur die Kernaussage - sonst wird daraus bei mehreren offenen Punkten ein Fliesstext-Block
    const messages = [];
    if (missingCourses.length > 0) {
      messages.push(`Noch ${missingCourses.length} Kurs${missingCourses.length === 1 ? '' : 'e'} offen.`);
    }
    if (!ageCheck.isFulfilled) {
      messages.push(ageCheck.actual === null
        ? `Geburtsdatum fehlt, Mindestalter (${targetNode.minAge} Jahre) nicht prufbar.`
        : `Mindestalter (${targetNode.minAge} Jahre) noch nicht erreicht (aktuell: ${ageCheck.actual} Jahre).`);
    }
    const missingQuals = qualChecks.filter(q => !q.isFulfilled);
    if (missingQuals.length > 0) {
      messages.push(`Noch ${missingQuals.length} Qualifikation${missingQuals.length === 1 ? '' : 'en'} offen.`);
    }
    if (recommendation) messages.push(recommendation);

    return messages.join(' ');
  }
}

export const courseTreeEngine = new CourseTreeEngine();
