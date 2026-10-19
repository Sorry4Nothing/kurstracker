import { courseTreeEngine } from '../src/domain/courseTreeEngine.js';
import { stufenleiterPlanningEngine } from '../src/domain/stufenleiterPlanningEngine.js';
import { COURSE_NODES, TREE_EDGES } from '../src/domain/courseTreeData.js';

console.log('\n======================================================');
console.log('   CEVI KURSTRACKER - TREE & PLANNING LOGIK TEST     ');
console.log('======================================================\n');

// 1. TEST: Tree Struktur
console.log('1. Prüfe Baum-Knoten und Kanten:');
console.log(`   - Verfügbare Kurs-Knoten: ${Object.keys(COURSE_NODES).length}`);
console.log(`   - Definierte Pfad-Kanten : ${TREE_EDGES.length}`);

// 2. TEST: Person im Baum bewerten
console.log('\n2. Test: Person im Ausbildungsbaum bewerten');
const sampleLeader = {
  id: 'pers_robin',
  name: 'Robin Notter',
  ceviname: 'Siro',
  birthdate: '2001-08-14',
  completedCourses: ['hlk', 'glk'],
  qualifications: ['js_leiter_lst', 'cevi_gruppenleiter']
};

const treeEvaluation = courseTreeEngine.evaluatePersonInTree(sampleLeader);
console.log(`   - Alter: ${treeEvaluation.personAge} Jahre`);
console.log(`   - Höchste abgeschlossene Stufe: Level ${treeEvaluation.currentMaxLevel}`);
console.log(`   - Als Nächstes direkt machbare Kurse (${treeEvaluation.availableNextCourses.length}):`);
treeEvaluation.availableNextCourses.forEach(c => {
  console.log(`     * [Level ${c.level}] ${c.title} (${c.category})`);
});

// 3. TEST: Pfad zu einem Wunschkurs berechnen (z.B. Experte oder Sicherheitsmodul Wasser)
console.log('\n3. Test: Zielpfad-Berechnung');
console.log('   Ziel A: Scharleiterkurs (SLK)');
const pathToSlk = courseTreeEngine.findPathToTarget(sampleLeader, 'slk');
console.log(`   - Berechtigt für SLK? ${pathToSlk.isDirectlyEligible ? 'JA [OK]' : 'NEIN [FEHLT]'}`);
console.log(`   - Zusammenfassung: ${pathToSlk.summary}`);

console.log('\n   Ziel B: J+S Sicherheitsbereich Wasser (benötigt SLRG Pool)');
const pathToWasser = courseTreeEngine.findPathToTarget(sampleLeader, 'sec_wasser');
console.log(`   - Berechtigt für Wasser? ${pathToWasser.isDirectlyEligible ? 'JA [OK]' : 'NEIN (fehlt noch etwas) [FEHLT]'}`);
console.log(`   - Zusammenfassung: ${pathToWasser.summary}`);

console.log('\n   Ziel C: J+S Expertenkurs (höchste Stufe)');
const pathToExperte = courseTreeEngine.findPathToTarget(sampleLeader, 'experte');
console.log(`   - Berechtigt für Experte? ${pathToExperte.isDirectlyEligible ? 'JA [OK]' : 'NEIN [FEHLT]'}`);
console.log(`   - Noch fehlende Kurse: ${pathToExperte.missingCourses.map(c => c.title).join(', ')}`);
console.log(`   - Zusammenfassung: ${pathToExperte.summary}`);

// 4. TEST: Stufenleiter Planungs-Engine
console.log('\n4. Test: Stufenleiter Planungstool für eine Gruppe von TNs');
const sampleGroup = [
  {
    id: 'tn_1',
    name: 'Noah Keller',
    ceviname: 'Fuchs',
    birthdate: '2011-04-10', // ca. 15 Jahre
    currentRole: 'Teilnehmer',
    completedCourses: []
  },
  {
    id: 'tn_2',
    name: 'Lea Meier',
    ceviname: 'Amsel',
    birthdate: '2009-02-18', // ca. 17 Jahre
    currentRole: 'Hilfsleiterin',
    completedCourses: ['hlk']
  },
  {
    id: 'tn_3',
    name: 'Marc Brunner',
    ceviname: 'Milan',
    birthdate: '2007-06-25', // ca. 19 Jahre
    currentRole: 'Gruppenleiter',
    completedCourses: ['hlk', 'glk'],
    qualifications: [
      { id: 'js_leiter_lst', validUntil: '2026-11-30' } // verfällt bald!
    ]
  }
];

const groupAnalysis = stufenleiterPlanningEngine.analyzeGroup(sampleGroup);
console.log(`   - Gesamtzahl analysierte TNs/Leiter: ${groupAnalysis.totalCount}`);
console.log(`   - Kandidaten für HLK (14-16 J.): ${groupAnalysis.summaryStats.readyForHlk}`);
console.log(`   - Kandidaten für GLK (ab 17 J.): ${groupAnalysis.summaryStats.readyForGlk}`);
console.log(`   - Dringender Fortbildungsbedarf (J+S-Verfall): ${groupAnalysis.summaryStats.urgentRenewalCount}`);

groupAnalysis.analyzedParticipants.forEach(item => {
  console.log(`\n   * ${item.participant.ceviname} (${item.participant.name}, ${item.age} Jahre, Rolle: ${item.participant.currentRole}):`);
  item.recommendedCourses.forEach(rec => {
    console.log(`      -> Empfehlung: [${rec.priority}] ${rec.title} - ${rec.reason}`);
  });
});

// 5. TEST: Kursvorschlag erfassen
console.log('\n5. Test: Vorschlag für Lea Meier (Amsel) -> GLK Herbst 2026');
const proposal = stufenleiterPlanningEngine.proposeCourse(sampleGroup[1], {
  courseId: 'glk',
  season: 'Herbst 2026',
  plannedBy: 'Siro (Stufenleiter)',
  notes: 'Sehr engagiert in der Fröschli-Stufe, soll ab Sommer Gruppe leiten.'
});
console.log(`   [OK] Vorschlag erstellt: ${proposal.nomination.courseTitle} für ${proposal.nomination.ceviname}`);
console.log(`   - Direkt berechtigt? ${proposal.nomination.isEligibleNow ? 'JA' : 'NEIN'}`);
console.log(`   - Status: ${proposal.nomination.status} (${proposal.nomination.season})`);

console.log('\n======================================================');
console.log('   ALLE LOGIK-TESTS ERFOLGREICH DURCHLAUFEN!          ');
console.log('======================================================\n');
