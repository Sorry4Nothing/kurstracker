/**
 * CEVI REGION ZUERICH & JUGEND+SPORT AUSBILDUNGSBAUM
 *
 * Basierend auf dem offiziellen Kursreglement von Cevi Region Zuerich:
 * https://ceviregionzuerich.ch/kurse
 *
 * Enthaelt:
 * - Level 0: Jungschar Grundstufe (Voku ab 12, Heku ab 13, GLK 1 ab 14, GLK 2 ab 15)
 * - Level 1: Leiterstufe (GLK 3 ab 17)
 * - Level 2: Weiterbildung, Stufenleitung & Sicherheit (SLK, MF, SLRG, Pioniertechnik, Sicherheit Berg/Wasser/Winter)
 * - Level 3: Kaderstufe (Lagerleiter LLM, Abteilungsleiter AL, J+S Coach)
 * - Level 4: Expertenstufe (J+S Experte Lagersport/Trekking)
 *
 * title: neutrale Form wie auf ceviregionzuerich.ch/kurse; titles.m / titles.w: Form fur
 * `gender` aus der Cevi-DB ('m' oder 'w'), siehe withGenderTitles.
 * kindId: Kursart der J+S- und SLRG-Kurse in der Cevi-DB (/api/event_kinds). Deren Titel ersetzt
 * beim Serverstart title und titles, siehe applyKindLabels; ohne Service-Token gilt title.
 * prerequisites: Pflicht-Vorgaenger, sperren den Kurs bis sie absolviert sind.
 * recommendedPrerequisites: direkte empfohlene Vorstufe, sperrt nicht. Voku, Heku,
 * GLK 1 und GLK 2 sind Vorbereitungen; die erste richtige Anerkennung ist GLK 3.
 * Wer einen Kurs hat, fur den gelten auch seine Vorstufen als erledigt (eine spatere
 * Stufe ersetzt die fruheren). Nur fur echte Vorstufen derselben Kette verwenden.
 */

export const COURSE_NODES = {
  // ---------------------------------------------------------------------------
  // LEVEL 0: JUNGSCHAR EINSTIEG & GRUNDSTUFE (12-16 Jahre)
  // ---------------------------------------------------------------------------
  voku: {
    id: 'voku',
    code: 'Voku',
    org: 'Cevi',
    title: 'Vorkurs (Voku)',
    category: 'Jungschar',
    minAge: 12,
    recommendedAge: 12,
    prerequisites: [],
    requiredQualifications: [],
    grantsQualifications: ['cevi_vorkurs']
  },

  heku: {
    id: 'heku',
    code: 'Heku',
    org: 'Cevi',
    title: 'Helfer/-innen-Kurs (Heku)',
    titles: { m: 'Helferkurs (Heku)', w: 'Helferinnenkurs (Heku)' },
    category: 'Jungschar',
    minAge: 13,
    recommendedAge: 13,
    prerequisites: [],
    recommendedPrerequisites: ['voku'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_helfer']
  },

  glk1: {
    id: 'glk1',
    code: 'GLK 1',
    org: 'Cevi',
    title: 'Gruppenleiter/-innen-Kurs 1 (GLK 1)',
    titles: { m: 'Gruppenleiterkurs 1 (GLK 1)', w: 'Gruppenleiterinnenkurs 1 (GLK 1)' },
    category: 'Jungschar',
    minAge: 14,
    recommendedAge: 14,
    prerequisites: [],
    recommendedPrerequisites: ['heku'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_gruppenleiter_1']
  },

  glk2: {
    id: 'glk2',
    code: 'GLK 2',
    org: 'Cevi',
    title: 'Gruppenleiter/-innen-Kurs 2 (GLK 2)',
    titles: { m: 'Gruppenleiterkurs 2 (GLK 2)', w: 'Gruppenleiterinnenkurs 2 (GLK 2)' },
    category: 'Jungschar',
    minAge: 15,
    recommendedAge: 15,
    prerequisites: [],
    recommendedPrerequisites: ['glk1'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_gruppenleiter_2']
  },

  // ---------------------------------------------------------------------------
  // LEVEL 1: LEITERSTUFE / J+S LEITERKURS (17+ Jahre)
  // ---------------------------------------------------------------------------
  glk3: {
    id: 'glk3',
    code: 'GLK 3',
    org: 'J+S',
    kindId: 80,
    title: 'Gruppenleiter/-innen-Kurs 3 (GLK 3)',
    titles: { m: 'Gruppenleiterkurs 3 (GLK 3)', w: 'Gruppenleiterinnenkurs 3 (GLK 3)' },
    category: 'Jugend+Sport',
    minAge: 17,
    recommendedAge: 17,
    prerequisites: [],
    recommendedPrerequisites: ['glk2'],
    requiredQualifications: [],
    grantsQualifications: ['js_leiter_lst', 'cevi_gruppenleiter_3']
  },

  // ---------------------------------------------------------------------------
  // LEVEL 2: WEITERBILDUNG, STUFENLEITUNG & SICHERHEIT (17-18+ Jahre)
  // ---------------------------------------------------------------------------
  slk: {
    id: 'slk',
    code: 'SLK',
    org: 'Cevi',
    title: 'Stufenleiter/-innen-Kurs (SLK)',
    titles: { m: 'Stufenleiterkurs (SLK)', w: 'Stufenleiterinnenkurs (SLK)' },
    category: 'Jungschar',
    minAge: 17,
    recommendedAge: 18,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['cevi_stufenleiter']
  },

  mf_lst: {
    id: 'mf_lst',
    code: 'MF',
    org: 'J+S',
    kindId: 90,
    title: 'J+S-Modul Fortbildung (MF)',
    category: 'Jugend+Sport',
    minAge: 18,
    recommendedAge: 18,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_leiter_lst_renewed']
  },

  slrg_pool: {
    id: 'slrg_pool',
    code: 'Pool',
    org: 'SLRG',
    kindId: 45,
    title: 'SLRG Brevet Basis Pool + BLS-AED',
    category: 'Sicherheit',
    minAge: 14,
    recommendedAge: 16,
    prerequisites: [],
    requiredQualifications: [],
    grantsQualifications: ['slrg_basis_pool']
  },

  pionier: {
    id: 'pionier',
    code: 'PiTech',
    org: 'Cevi',
    title: 'Pioniertechnik-Modul',
    category: 'Jungschar',
    minAge: 15,
    recommendedAge: 16,
    prerequisites: ['glk1'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_pionier']
  },

  sec_berg: {
    id: 'sec_berg',
    code: 'Berg',
    org: 'J+S',
    kindId: 83,
    title: 'J+S-Modul Sicherheitsbereich Berg',
    category: 'Sicherheit',
    minAge: 18,
    recommendedAge: 19,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_sec_berg']
  },

  sec_wasser: {
    id: 'sec_wasser',
    code: 'Wasser',
    org: 'J+S',
    kindId: 79,
    title: 'J+S-Modul Sicherheitsbereich Wasser',
    category: 'Sicherheit',
    minAge: 18,
    recommendedAge: 19,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst', 'slrg_basis_pool'],
    grantsQualifications: ['js_sec_wasser']
  },

  sec_winter: {
    id: 'sec_winter',
    code: 'Winter',
    org: 'J+S',
    kindId: 82,
    title: 'J+S-Modul Sicherheitsbereich Winter',
    category: 'Sicherheit',
    minAge: 18,
    recommendedAge: 19,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_sec_winter']
  },

  // ---------------------------------------------------------------------------
  // LEVEL 3: KADERSTUFE (18-20+ Jahre)
  // ---------------------------------------------------------------------------
  llm: {
    id: 'llm',
    code: 'LLM',
    org: 'J+S',
    kindId: 81,
    title: 'Lagerleiter/-innen-Modul (LLM)',
    titles: { m: 'Lagerleitermodul (LLM)', w: 'Lagerleiterinnenmodul (LLM)' },
    category: 'Jugend+Sport',
    minAge: 19,
    recommendedAge: 19,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_lagerleiter']
  },

  al_seminar: {
    id: 'al_seminar',
    code: 'AL-Semi',
    org: 'Cevi',
    title: 'Abteilungsleiter/-innen-Seminar (AL-Semi)',
    titles: { m: 'Abteilungsleiterseminar (AL-Semi)', w: 'Abteilungsleiterinnenseminar (AL-Semi)' },
    category: 'Kaderbildung',
    minAge: 18,
    recommendedAge: 19,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['cevi_abteilungsleiter']
  },

  js_coach: {
    id: 'js_coach',
    code: 'Coach',
    org: 'J+S',
    kindId: 33,
    title: 'J+S-Coachkurs',
    category: 'Jugend+Sport',
    minAge: 20,
    recommendedAge: 20,
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_coach']
  },

  // ---------------------------------------------------------------------------
  // LEVEL 4: EXPERTENBILDUNG (21+ Jahre)
  // ---------------------------------------------------------------------------
  experte: {
    id: 'experte',
    code: 'Experte',
    org: 'J+S',
    kindId: 32,
    title: 'J+S-Expertenkurs',
    titles: { m: 'J+S-Expertenkurs', w: 'J+S-Expertinnenkurs' },
    category: 'Expertenbildung',
    minAge: 21,
    recommendedAge: 22,
    prerequisites: ['llm'],
    requiredQualifications: ['js_leiter_lst', 'js_lagerleiter'],
    grantsQualifications: ['js_experte_lst']
  }
};

// Aliase fur Abwartskompatibilitat mit bisherigen Tests und verkürzten Bezeichnungen
COURSE_NODES.glk = COURSE_NODES.glk3;
COURSE_NODES.hlk = COURSE_NODES.heku;
COURSE_NODES.mf = COURSE_NODES.mf_lst;

/**
 * Kursknoten mit dem Titel in der Form fur `gender` aus der Cevi-DB ('m' oder 'w').
 * Ohne Angabe bleibt die neutrale Form der Website.
 * @param {object} nodes
 * @param {string} [gender]
 * @returns {object}
 */
export function withGenderTitles(nodes, gender) {
  return Object.fromEntries(Object.entries(nodes).map(([key, node]) => {
    const title = (gender === 'm' || gender === 'w') && node.titles?.[gender];
    return [key, title ? { ...node, title } : node];
  }));
}

/**
 * Setzt bei den Kursen mit `kindId` den Titel der Kursart aus der Cevi-DB, im Wortlaut der Cevi-DB:
 * die m/w-Formen der Datei entfallen dort. Ändert die Knoten selbst, damit auch die Aliase ihn haben.
 * @param {Map<number, string>} labels - Titel nach Kursart-ID, siehe ceviDbService.getKindLabels
 * @param {object} [nodes]
 * @returns {number} Anzahl Kurse mit Titel aus der Cevi-DB
 */
export function applyKindLabels(labels, nodes = COURSE_NODES) {
  let count = 0;
  // Set: die Aliase (glk, hlk, mf) sind dieselben Knoten
  for (const node of new Set(Object.values(nodes))) {
    const label = labels.get(node.kindId);
    if (!label) continue;
    node.title = label;
    delete node.titles;
    count++;
  }
  return count;
}
