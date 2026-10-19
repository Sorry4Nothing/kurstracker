import { COURSE_NODES, TREE_EDGES } from './courseTreeData.js';

/**
 * CourseTreeEngine - Berechnungslogik fur den Cevi & J+S Ausbildungsbaum
 * Unterstutzt Cevi Region Zuerich Reglement & J+S Lagersport/Trekking
 */
export class CourseTreeEngine {
  constructor(nodes = COURSE_NODES, edges = TREE_EDGES) {
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * Normalisiert und erweitert ein Set von Kurs-IDs (Aliase und Vorganger)
   * @param {string[]|Set<string>} courses
   * @returns {Set<string>}
   */
  normalizeCourseSet(courses = []) {
    const set = new Set(Array.from(courses || []).map(c => (c || '').toLowerCase().trim()));
    
    // Alias-Mappings
    if (set.has('glk')) {
      set.add('glk3');
      set.add('glk2');
      set.add('glk1');
      set.add('heku');
    }
    if (set.has('glk3')) {
      set.add('glk');
      set.add('glk2');
      set.add('glk1');
    }
    if (set.has('hlk')) {
      set.add('heku');
      set.add('voku');
    }
    if (set.has('heku')) {
      set.add('hlk');
    }
    if (set.has('mf')) {
      set.add('mf_lst');
    }
    if (set.has('mf_lst')) {
      set.add('mf');
    }

    return set;
  }

  /**
   * Berechnet das Alter in Jahren basierend auf Geburtsdatum
   * @param {string|Date} birthdate 
   * @param {Date} [referenceDate]
   * @returns {number}
   */
  calculateAge(birthdate, referenceDate = new Date()) {
    if (!birthdate) return 18;
    let birth;
    if (typeof birthdate === 'string' && /^\d{2}\.\d{2}\.\d{4}/.test(birthdate.trim())) {
      const parts = birthdate.trim().split('.');
      birth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      birth = new Date(birthdate);
    }
    if (isNaN(birth.getTime())) return 18;

    let age = referenceDate.getFullYear() - birth.getFullYear();
    const m = referenceDate.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Bewertet den Zustand aller Baum-Knoten fur eine Person
   * @param {object} person
   * @param {string[]} [person.completedCourses] - IDs der absolvierten Kurse (z.B. ['voku', 'heku', 'glk1', 'glk2', 'glk3'])
   * @param {string[]} [person.inProgressCourses] - IDs der angemeldeten/laufenden Kurse
   * @param {string[]} [person.qualifications] - IDs der vorhandenen Qualifikationen (z.B. ['js_leiter_lst'])
   * @param {string|Date} [person.birthdate] - Geburtsdatum
   * @returns {object} Tree State mit Status pro Knoten
   */
  evaluatePersonInTree(person = {}) {
    const completed = this.normalizeCourseSet(person.completedCourses || []);
    const inProgress = this.normalizeCourseSet(person.inProgressCourses || []);
    const quals = new Set((person.qualifications || []).map(q => {
      const str = typeof q === 'string' ? q : (q?.id || q?.key || '');
      return str.toLowerCase().trim();
    }));
    const personAge = this.calculateAge(person.birthdate);

    const evaluatedNodes = {};
    const availableNextCourses = [];

    // Eindeutige Knoten iterieren (ohne Alias-Duplikate)
    const uniqueNodeEntries = Object.entries(this.nodes).filter(([id, node]) => node.id === id);

    for (const [id, node] of uniqueNodeEntries) {
      const isCompleted = completed.has(id);
      const isInProgress = inProgress.has(id);

      // Voraussetzungen prufen
      const missingPrereqs = (node.prerequisites || []).filter(req => !completed.has(req));
      const missingQuals = (node.requiredQualifications || []).filter(req => !quals.has(req));
      const ageMet = personAge >= (node.minAge || 0);

      let status = 'LOCKED';
      const blockers = [];

      if (isCompleted) {
        status = 'COMPLETED';
      } else if (isInProgress) {
        status = 'IN_PROGRESS';
      } else {
        if (!ageMet) {
          blockers.push(`Mindestalter nicht erreicht (benotigt: ${node.minAge} Jahre, aktuell: ${personAge} Jahre)`);
        }
        if (missingPrereqs.length > 0) {
          const titles = missingPrereqs.map(p => this.nodes[p]?.title || p).join(', ');
          blockers.push(`Fehlende Vorgangerkurse: ${titles}`);
        }
        if (missingQuals.length > 0) {
          blockers.push(`Fehlende Qualifikationen: ${missingQuals.join(', ')}`);
        }

        if (blockers.length === 0) {
          status = 'AVAILABLE';
          availableNextCourses.push({
            id: node.id,
            title: node.title,
            category: node.category,
            level: node.level,
            recommendedAge: node.recommendedAge
          });
        }
      }

      evaluatedNodes[id] = {
        ...node,
        status,
        isCompleted,
        isInProgress,
        isAvailable: status === 'AVAILABLE',
        isLocked: status === 'LOCKED',
        blockers,
        missingPrerequisites: missingPrereqs,
        missingQualifications: missingQuals
      };
    }

    // Aliase auch in evaluatedNodes spiegeln
    if (evaluatedNodes.glk3 && !evaluatedNodes.glk) {
      evaluatedNodes.glk = { ...evaluatedNodes.glk3, id: 'glk' };
    }
    if (evaluatedNodes.heku && !evaluatedNodes.hlk) {
      evaluatedNodes.hlk = { ...evaluatedNodes.heku, id: 'hlk' };
    }
    if (evaluatedNodes.mf_lst && !evaluatedNodes.mf) {
      evaluatedNodes.mf = { ...evaluatedNodes.mf_lst, id: 'mf' };
    }

    // Aktuelle Ebene im Baum ermitteln (hochste abgeschlossene Ebene)
    const completedLevels = Object.values(evaluatedNodes)
      .filter(n => n.isCompleted)
      .map(n => n.level);
    const currentMaxLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : -1;

    return {
      personAge,
      currentMaxLevel,
      availableNextCourses,
      nodes: evaluatedNodes,
      completedCourseIds: Array.from(completed),
      inProgressCourseIds: Array.from(inProgress)
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
    let resolvedId = targetCourseId;
    if (targetCourseId === 'glk') resolvedId = 'glk3';
    if (targetCourseId === 'hlk') resolvedId = 'heku';
    if (targetCourseId === 'mf') resolvedId = 'mf_lst';

    const targetNode = this.nodes[resolvedId] || this.nodes[targetCourseId];
    if (!targetNode) {
      throw new Error(`Zielkurs '${targetCourseId}' existiert nicht im Ausbildungsbaum.`);
    }

    const completed = this.normalizeCourseSet(person.completedCourses || []);
    const quals = new Set((person.qualifications || []).map(q => {
      const str = typeof q === 'string' ? q : (q?.id || q?.key || '');
      return str.toLowerCase().trim();
    }));
    const personAge = this.calculateAge(person.birthdate);

    // Alle transitiven Vorbedingungen sammeln (Topological Reverse Search)
    const requiredCoursesSet = new Set();
    const collectPrereqs = (courseId) => {
      const node = this.nodes[courseId];
      if (!node) return;
      for (const req of (node.prerequisites || [])) {
        requiredCoursesSet.add(req);
        collectPrereqs(req);
      }
    };
    collectPrereqs(targetNode.id);

    // Reihenfolge nach Ausbildungsstufen (Level 0 -> Level 4)
    const orderedRequirements = Array.from(requiredCoursesSet)
      .map(id => this.nodes[id])
      .filter(Boolean)
      .sort((a, b) => a.level - b.level);

    // Schritte analysieren
    const pathSteps = orderedRequirements.map(reqNode => {
      const done = completed.has(reqNode.id);
      return {
        id: reqNode.id,
        title: reqNode.title,
        level: reqNode.level,
        category: reqNode.category,
        isCompleted: done,
        status: done ? 'ERFULLT' : 'NOCH ZU ABSOLVIEREN'
      };
    });

    // Fehlende Kurse auf dem Pfad
    const missingCourses = pathSteps.filter(s => !s.isCompleted);

    // Voraussetzungen des Zielkurses selbst prufen
    const targetDirectPrereqs = (targetNode.prerequisites || []).map(id => ({
      id,
      title: this.nodes[id]?.title || id,
      isFulfilled: completed.has(id)
    }));

    const targetQualCheck = (targetNode.requiredQualifications || []).map(q => ({
      id: q,
      isFulfilled: quals.has(q)
    }));

    const ageCheck = {
      required: targetNode.minAge || 0,
      actual: personAge,
      isFulfilled: personAge >= (targetNode.minAge || 0)
    };

    const isDirectlyEligible = missingCourses.length === 0 &&
      targetQualCheck.every(q => q.isFulfilled) &&
      ageCheck.isFulfilled;

    return {
      target: {
        id: targetNode.id,
        title: targetNode.title,
        category: targetNode.category,
        level: targetNode.level,
        minAge: targetNode.minAge,
        description: targetNode.description
      },
      isDirectlyEligible,
      stepsRemainingCount: missingCourses.length,
      pathSteps,
      missingCourses,
      targetDirectPrereqs,
      targetQualCheck,
      ageCheck,
      summary: this.generatePathSummary(targetNode, missingCourses, ageCheck, targetQualCheck)
    };
  }

  /**
   * Generiert eine verstandliche Zusammenfassung des Pfads ohne Emojis
   */
  generatePathSummary(targetNode, missingCourses, ageCheck, qualChecks) {
    if (missingCourses.length === 0 && ageCheck.isFulfilled && qualChecks.every(q => q.isFulfilled)) {
      return `Du erfullst alle Voraussetzungen fur den ${targetNode.title} und kannst dich direkt anmelden.`;
    }

    const messages = [];
    if (missingCourses.length > 0) {
      const titles = missingCourses.map(c => c.title).join(' -> ');
      messages.push(`Noch ${missingCourses.length} Kurs(e) notwendig: ${titles}`);
    }
    if (!ageCheck.isFulfilled) {
      messages.push(`Mindestalter (${targetNode.minAge} Jahre) noch nicht erreicht (aktuell: ${ageCheck.actual} Jahre).`);
    }
    const missingQuals = qualChecks.filter(q => !q.isFulfilled);
    if (missingQuals.length > 0) {
      messages.push(`Fehlende Qualifikation: ${missingQuals.map(q => q.id).join(', ')}.`);
    }

    return messages.join(' | ');
  }
}

export const courseTreeEngine = new CourseTreeEngine();
