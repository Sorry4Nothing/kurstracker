import { courseTreeEngine } from './courseTreeEngine.js';
import { COURSE_NODES } from './courseTreeData.js';

function formatEuropeanDate(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return str;
}

/**
 * StufenleiterPlanningEngine - Planungstool für Stufenleiter & Abteilungsleitende
 *
 * Ermöglicht das Analysieren, Planen und Vorschlagen von Kursteilnahmen
 * für alle Teilnehmenden (TNs) und Leitenden einer Stufe oder Abteilung.
 */
export class StufenleiterPlanningEngine {
  constructor(treeEngine = courseTreeEngine) {
    this.treeEngine = treeEngine;
    // Lokaler Speicher für Kursvorschläge/Planungen
    this.nominations = new Map();
  }

  /**
   * Analysiert eine Gruppe von Teilnehmenden / Leitenden
   * @param {Array<object>} participants - Liste von TN-Objekten
   * @returns {object} Analysebericht mit Empfehlungen und Handlungsbedarf
   */
  analyzeGroup(participants = []) {
    const analyzed = participants.map(tn => this.analyzeParticipant(tn));

    // Gruppierung nach Kurs-Kandidaten (Wer kommt für welchen Kurs in Frage?)
    const candidatesByCourse = {};

    analyzed.forEach(item => {
      item.recommendedCourses.forEach(rec => {
        if (!candidatesByCourse[rec.courseId]) {
          candidatesByCourse[rec.courseId] = [];
        }
        candidatesByCourse[rec.courseId].push({
          participantId: item.participant.id,
          name: item.participant.name,
          ceviname: item.participant.ceviname,
          age: item.age,
          priority: rec.priority,
          reason: rec.reason
        });
      });
    });

    // Leitende mit dringendem Fortbildungsbedarf (J+S-Verfall)
    const urgentRenewals = analyzed.filter(item => item.hasExpiringJsLeiter);

    return {
      totalCount: participants.length,
      analyzedParticipants: analyzed,
      candidatesByCourse,
      urgentRenewals,
      summaryStats: {
        readyForHlk: candidatesByCourse.heku?.length || 0,
        readyForGlk: candidatesByCourse.glk3?.length || 0,
        readyForSlk: candidatesByCourse.slk?.length || 0,
        urgentRenewalCount: urgentRenewals.length
      }
    };
  }

  /**
   * Analysiert einen einzelnen Teilnehmer / Leiter
   * @param {object} participant
   */
  analyzeParticipant(participant) {
    // Kurstitel in der Form fur das Geschlecht der jeweiligen Person
    const tree = this.treeEngine.forGender(participant.gender);
    // Vorschläge gelten fürs nächste Kursjahr: Alter (Jahrgang) und Gültigkeit der Anerkennung ab dem 1. Januar
    const now = new Date();
    const planYear = now.getFullYear() + 1;
    const planStart = new Date(planYear, 0, 1);
    const age = tree.calculateAge(participant.birthdate, planStart);
    const treeState = tree.evaluatePersonInTree(participant);
    const recommendedCourses = [];

    const completed = tree.normalizeCourseSet(participant.completedCourses || []);
    const registered = tree.normalizeCourseSet(participant.inProgressCourses || []);
    const jsQual = (participant.qualifications || []).find(q =>
      typeof q === 'object' ? q.id === 'js_leiter_lst' : q === 'js_leiter_lst'
    );
    const hasHlk = completed.has('heku');
    // Die J+S-Leiteranerkennung kommt aus dem GLK 3, auch wenn der Kurs selbst nicht in der Cevi-DB steht (#96)
    const hasGlk = completed.has('glk3') || Boolean(jsQual);
    const hasSlk = completed.has('slk');

    // 1. Empfehlung: Helferkurs (Heku)
    if (!hasHlk && !hasGlk && age >= tree.nodes.heku.minAge && age <= 16) {
      const courseTitle = tree.nodes.heku.title;
      recommendedCourses.push({
        courseId: 'heku',
        title: courseTitle,
        courseTitle: courseTitle,
        priority: age >= 15 ? 'HOCH' : 'NORMAL',
        reason: age >= 15
          ? `Ideales Einstiegsalter (${age} Jahre) für den ${courseTitle}.`
          : `Berechtigt für Heku (ab ${tree.nodes.heku.minAge} Jahren, Jahrgang).`
      });
    }

    // 2. Empfehlung: Gruppenleiterkurs 3 (GLK 3 / J+S Leiter)
    if (!hasGlk && age >= tree.nodes.glk3.minAge) {
      const courseTitle = tree.nodes.glk3.title;
      recommendedCourses.push({
        courseId: 'glk3',
        title: courseTitle,
        courseTitle: courseTitle,
        priority: age >= 18 ? 'SEHR HOCH' : 'HOCH',
        reason: age >= 18
          ? `Erreicht Volljährigkeit (${age} Jahre) - GLK für vollen J+S-Leiterstatus dringend empfohlen.`
          : `Berechtigt für GLK ${planYear} (17 Jahre, J+S-Einstieg).`
      });
    }

    // 3. Empfehlung: Scharleiterkurs (SLK)
    if (hasGlk && !hasSlk && age >= 18) {
      const leaderRole = (participant.currentRole || '').toLowerCase();
      const isLeader = leaderRole.includes('leiter') || leaderRole.includes('kader');
      if (isLeader) {
        const courseTitle = tree.nodes.slk.title;
        recommendedCourses.push({
          courseId: 'slk',
          title: courseTitle,
          courseTitle: courseTitle,
          priority: age >= 19 ? 'HOCH' : 'NORMAL',
          reason: `Hat GLK abgeschlossen. Bereit für Kader- und Scharleiterverantwortung.`
        });
      }
    }

    // 4. Prüfung: J+S Weiterbildung (Modul Fortbildung)
    let hasExpiringJsLeiter = false;
    if (hasGlk) {
      // Falls Gültigkeitsdatum hinterlegt ist
      const expirationDate = (typeof jsQual === 'object' && jsQual?.validUntil) ? jsQual.validUntil : participant.jsExpirationDate;
      if (expirationDate) {
        const validUntil = new Date(expirationDate);
        const monthsRemaining = (validUntil - planStart) / (1000 * 60 * 60 * 24 * 30.5);
        const courseTitle = tree.nodes.mf_lst.title;
        if (validUntil < now || monthsRemaining < 0) {
          hasExpiringJsLeiter = true;
          recommendedCourses.unshift({
            courseId: 'mf_lst',
            title: courseTitle,
            courseTitle: courseTitle,
            priority: 'DRINGEND',
            // Die Pille nennt den Zustand der Anerkennung, nicht den Kurs
            badge: validUntil < now ? 'J+S abgelaufen' : 'J+S läuft ab',
            // Noch gültig, aber vor Beginn des Kursjahres vorbei: nicht «abgelaufen» nennen
            reason: validUntil < now
              ? `J+S-Brevetierung ist am ${formatEuropeanDate(expirationDate)} abgelaufen.`
              : `J+S-Brevetierung verfällt am ${formatEuropeanDate(expirationDate)}, vor Beginn ${planYear}. Fortbildung nötig.`
          });
        } else if (monthsRemaining <= 12) {
          hasExpiringJsLeiter = true;
          recommendedCourses.unshift({
            courseId: 'mf_lst',
            title: courseTitle,
            courseTitle: courseTitle,
            priority: monthsRemaining <= 6 ? 'DRINGEND' : 'HOCH',
            badge: 'J+S läuft ab',
            reason: monthsRemaining <= 6
              ? `J+S-Status verfällt am ${formatEuropeanDate(expirationDate)}. Fortbildung nötig.`
              : `J+S-Status verfällt am ${formatEuropeanDate(expirationDate)}. Auffrischung nötig.`
          });
        }
      }
    }

    // Vorhandene Planung/Vorschlag abrufen
    const activeNomination = this.nominations.get(participant.id) || null;

    // Kürzel aus den Kursdaten (Alias 'hlk' wird «Heku»), unbekannte IDs bleiben stehen
    const completedCourseCodes = [...new Set(
      (participant.completedCourses || []).map(id => COURSE_NODES[id]?.code ?? id)
    )];

    return {
      participant,
      age,
      completedCourseCodes,
      availableNextCourses: treeState.availableNextCourses,
      // Für einen Kurs, für den die Person schon angemeldet ist, kein Vorschlag
      recommendedCourses: recommendedCourses
        .filter(rec => !registered.has(rec.courseId))
        .map(rec => ({ ...rec, code: COURSE_NODES[rec.courseId]?.code })),
      hasExpiringJsLeiter,
      activeNomination
    };
  }

  /**
   * Erstellt oder aktualisiert einen Kursvorschlag für einen Teilnehmer
   * @param {string} participantId
   * @param {object} nominationData
   * @param {string} nominationData.courseId - ID des Zielkurses
   * @param {string} [nominationData.season] - z.B. 'Herbst 2026'
   * @param {string} [nominationData.plannedBy] - Name des Stufenleiters
   * @param {string} [nominationData.status] - 'Vorgeschlagen' | 'Bestätigt' | 'Angemeldet'
   * @param {string} [nominationData.notes]
   * @returns {object} Das erstellte Vorschlags-Objekt mit Eignungsprüfung
   */
  proposeCourse(participant, nominationData) {
    const tree = this.treeEngine.forGender(participant.gender);
    const course = tree.nodes[nominationData.courseId];
    if (!course) {
      throw new Error(`Ungültiger Kurs: '${nominationData.courseId}'`);
    }

    // Eignungsprüfung durchführen
    const pathCheck = tree.findPathToTarget(participant, nominationData.courseId);

    const nomination = {
      id: 'nom_' + participant.id + '_' + nominationData.courseId,
      participantId: participant.id,
      participantName: participant.name,
      ceviname: participant.ceviname,
      courseId: course.id,
      courseTitle: course.title,
      season: nominationData.season || '2026',
      status: nominationData.status || 'Vorgeschlagen',
      plannedBy: nominationData.plannedBy || 'Stufenleiter',
      notes: nominationData.notes || '',
      isEligibleNow: pathCheck.isDirectlyEligible,
      missingPrerequisitesCount: pathCheck.missingCourses.length,
      createdAt: new Date().toISOString()
    };

    this.nominations.set(participant.id, nomination);
    return {
      nomination,
      pathCheck
    };
  }

  /**
   * Liefert alle aktuell gespeicherten Kurs-Planungen
   */
  getAllNominations() {
    return Array.from(this.nominations.values());
  }
}

export const stufenleiterPlanningEngine = new StufenleiterPlanningEngine();
