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
    shortTitle: 'Vorkurs',
    level: 0,
    category: 'Jungschar',
    minAge: 12,
    recommendedAge: 12,
    description: 'Erste Einblicke in die Leitertatigkeit im Cevi fur 12- bis 13-Jahrige. Spiele anleiten, Gruppenstunden unterstutzen und Pioniertechnik-Grundlagen.',
    prerequisites: [],
    requiredQualifications: [],
    grantsQualifications: ['cevi_vorkurs'],
    treePosition: { col: 0, row: 0 }
  },

  heku: {
    id: 'heku',
    code: 'Heku',
    org: 'Cevi',
    title: 'Helfer/-innen-Kurs (Heku)',
    titles: { m: 'Helferkurs (Heku)', w: 'Helferinnenkurs (Heku)' },
    shortTitle: 'Helferkurs (Heku)',
    level: 0,
    category: 'Jungschar',
    minAge: 13,
    recommendedAge: 13,
    description: 'Vorbereitung auf die Rolle als Gruppenhelfer/in. Vertiefung von Geländespielen, Leitervorbild, Erste Hilfe und Zusammenleben in der Gruppe.',
    prerequisites: [],
    recommendedPrerequisites: ['voku'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_helfer'],
    treePosition: { col: 0, row: 1 }
  },

  glk1: {
    id: 'glk1',
    code: 'GLK 1',
    org: 'Cevi',
    title: 'Gruppenleiter/-innen-Kurs 1 (GLK 1)',
    titles: { m: 'Gruppenleiterkurs 1 (GLK 1)', w: 'Gruppenleiterinnenkurs 1 (GLK 1)' },
    shortTitle: 'GLK 1',
    level: 0,
    category: 'Jungschar',
    minAge: 14,
    recommendedAge: 14,
    description: 'Erste Stufe der Gruppenleiterausbildung. Methodik fur Gruppenstunden, Gruppenpsychologie, Programmgestaltung und Leitungsstile.',
    prerequisites: [],
    recommendedPrerequisites: ['heku'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_gruppenleiter_1'],
    treePosition: { col: 0, row: 2 }
  },

  glk2: {
    id: 'glk2',
    code: 'GLK 2',
    org: 'Cevi',
    title: 'Gruppenleiter/-innen-Kurs 2 (GLK 2)',
    titles: { m: 'Gruppenleiterkurs 2 (GLK 2)', w: 'Gruppenleiterinnenkurs 2 (GLK 2)' },
    shortTitle: 'GLK 2',
    level: 0,
    category: 'Jungschar',
    minAge: 15,
    recommendedAge: 15,
    description: 'Vertiefung der Gruppenleitung vor dem J+S-Alter. Mehrtagige Unternehmungen, Biwak, Kartenkunde, Orientierung und Dynamik.',
    prerequisites: [],
    recommendedPrerequisites: ['glk1'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_gruppenleiter_2'],
    treePosition: { col: 0, row: 3 }
  },

  // ---------------------------------------------------------------------------
  // LEVEL 1: LEITERSTUFE / J+S LEITERKURS (17+ Jahre)
  // ---------------------------------------------------------------------------
  glk3: {
    id: 'glk3',
    code: 'GLK 3',
    org: 'J+S',
    title: 'Gruppenleiter/-innen-Kurs 3 (GLK 3)',
    titles: { m: 'Gruppenleiterkurs 3 (GLK 3)', w: 'Gruppenleiterinnenkurs 3 (GLK 3)' },
    shortTitle: 'GLK 3 (J+S Leiter)',
    level: 1,
    category: 'Jugend+Sport',
    minAge: 17,
    recommendedAge: 17,
    description: 'Offizieller J+S-Leiterkurs Lagersport/Trekking Jugendsport (zusammen mit Sportamt Kanton Zuerich). Befahigt zur selbststandigen Leitung von Lagern und Sportprogrammen.',
    prerequisites: [],
    recommendedPrerequisites: ['glk2'],
    requiredQualifications: [],
    grantsQualifications: ['js_leiter_lst', 'cevi_gruppenleiter_3'],
    treePosition: { col: 1, row: 0 }
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
    shortTitle: 'Stufenleiter (SLK)',
    level: 2,
    category: 'Jungschar',
    minAge: 17,
    recommendedAge: 18,
    description: 'Befahigung zur Leitung einer Stufe (Froschli, Jungschar, Teens). Begleitung und Coaching junger Leitender, Elternarbeit und Jahresprogramm.',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['cevi_stufenleiter'],
    treePosition: { col: 2, row: 0 }
  },

  mf_lst: {
    id: 'mf_lst',
    code: 'MF',
    org: 'J+S',
    title: 'J+S-Modul Fortbildung (MF)',
    shortTitle: 'Modul Fortbildung (MF)',
    level: 2,
    category: 'Jugend+Sport',
    minAge: 18,
    recommendedAge: 18,
    description: '2-tagige Pflicht-Weiterbildung zur 2-jahrigen Verlangerung der offiziellen J+S-Leiteranerkennung Lagersport/Trekking.',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_leiter_lst_renewed'],
    treePosition: { col: 2, row: 1 }
  },

  slrg_pool: {
    id: 'slrg_pool',
    code: 'Pool',
    org: 'SLRG',
    title: 'SLRG Brevet Basis Pool + BLS-AED',
    shortTitle: 'SLRG Rettungsschwimmer',
    level: 2,
    category: 'Sicherheit',
    minAge: 14,
    recommendedAge: 16,
    description: 'Rettungsschwimmer-Grundausbildung der Schweizerischen Lebensrettungs-Gesellschaft fur Baden und Schwimmaktivitaten.',
    prerequisites: [],
    requiredQualifications: [],
    grantsQualifications: ['slrg_basis_pool'],
    treePosition: { col: 2, row: 2 }
  },

  pionier: {
    id: 'pionier',
    code: 'PiTech',
    org: 'Cevi',
    title: 'Pioniertechnik-Modul',
    shortTitle: 'Pioniertechnik',
    level: 2,
    category: 'Jungschar',
    minAge: 15,
    recommendedAge: 16,
    description: 'Spezialisierung fur Grossbauten, Holzturme, Seilbahnen, Seilbrucken und Materialkunde im Cevi.',
    prerequisites: ['glk1'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_pionier'],
    treePosition: { col: 2, row: 3 }
  },

  sec_berg: {
    id: 'sec_berg',
    code: 'Berg',
    org: 'J+S',
    title: 'J+S-Modul Sicherheitsbereich Berg',
    shortTitle: 'Sicherheit Berg (T3/T4)',
    level: 2,
    category: 'Sicherheit',
    minAge: 18,
    recommendedAge: 19,
    description: 'Sicherheitsbereich Berg fur anspruchsvolle Bergtouren, Passubergange und Biwaks im alpinen Gelande (T3/T4).',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_sec_berg'],
    treePosition: { col: 2, row: 4 }
  },

  sec_wasser: {
    id: 'sec_wasser',
    code: 'Wasser',
    org: 'J+S',
    title: 'J+S-Modul Sicherheitsbereich Wasser',
    shortTitle: 'Sicherheit Wasser',
    level: 2,
    category: 'Sicherheit',
    minAge: 18,
    recommendedAge: 19,
    description: 'Sicherheitsbereich Wasser fur Aktivitaten auf und im fliessenden oder stehenden Gewasser (Schlauchboot, Fluss).',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst', 'slrg_basis_pool'],
    grantsQualifications: ['js_sec_wasser'],
    treePosition: { col: 2, row: 5 }
  },

  sec_winter: {
    id: 'sec_winter',
    code: 'Winter',
    org: 'J+S',
    title: 'J+S-Modul Sicherheitsbereich Winter',
    shortTitle: 'Sicherheit Winter',
    level: 2,
    category: 'Sicherheit',
    minAge: 18,
    recommendedAge: 19,
    description: 'Sicherheitsbereich Winter fur Schneeschuhtouren, Iglu- und Winterlager abseits gesicherter Pisten.',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_sec_winter'],
    treePosition: { col: 2, row: 6 }
  },

  // ---------------------------------------------------------------------------
  // LEVEL 3: KADERSTUFE (18-20+ Jahre)
  // ---------------------------------------------------------------------------
  llm: {
    id: 'llm',
    code: 'LLM',
    org: 'J+S',
    title: 'Lagerleiter/-innen-Modul (LLM)',
    titles: { m: 'Lagerleitermodul (LLM)', w: 'Lagerleiterinnenmodul (LLM)' },
    shortTitle: 'Lagerleiter (LLM)',
    level: 3,
    category: 'Jugend+Sport',
    minAge: 19,
    recommendedAge: 19,
    description: 'J+S-Ausbildung zur Gesamtleitung von Lagern. Krisenmanagement, rechtliche Verantwortung, Budgetierung und J+S-Lagerabrechnung.',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    minExperienceYears: 1,
    grantsQualifications: ['js_lagerleiter'],
    treePosition: { col: 3, row: 0 }
  },

  al_seminar: {
    id: 'al_seminar',
    code: 'AL-Semi',
    org: 'Cevi',
    title: 'Abteilungsleiter/-innen-Seminar (AL-Semi)',
    titles: { m: 'Abteilungsleiterseminar (AL-Semi)', w: 'Abteilungsleiterinnenseminar (AL-Semi)' },
    shortTitle: 'Abteilungsleiter (AL)',
    level: 3,
    category: 'Kaderbildung',
    minAge: 18,
    recommendedAge: 19,
    description: 'Strategische Gesamtleitung einer Cevi-Abteilung (Schar). Vereinsrecht, Behordenkontakt, Finanzen, Krisenkommunikation und Teamfuhrung.',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['cevi_abteilungsleiter'],
    treePosition: { col: 3, row: 1 }
  },

  js_coach: {
    id: 'js_coach',
    code: 'Coach',
    org: 'J+S',
    title: 'J+S-Coachkurs',
    shortTitle: 'J+S Coach',
    level: 3,
    category: 'Jugend+Sport',
    minAge: 20,
    recommendedAge: 20,
    description: 'Beratung der Vereinsleitung, Schnittstelle zum kantonalen Sportamt/BASPO und administrative Begleitung der J+S-Lager in der NDS.',
    prerequisites: ['glk3'],
    requiredQualifications: ['js_leiter_lst'],
    grantsQualifications: ['js_coach'],
    treePosition: { col: 3, row: 2 }
  },

  // ---------------------------------------------------------------------------
  // LEVEL 4: EXPERTENBILDUNG (21+ Jahre)
  // ---------------------------------------------------------------------------
  experte: {
    id: 'experte',
    code: 'Experte',
    org: 'J+S',
    title: 'J+S-Expertenkurs',
    titles: { m: 'J+S-Expertenkurs', w: 'J+S-Expertinnenkurs' },
    shortTitle: 'J+S Experte',
    level: 4,
    category: 'Expertenbildung',
    minAge: 21,
    recommendedAge: 22,
    description: 'Ausbildung zum Experten zur Leitung und Durchfuhrung von kantonalen und Verbands-Leiterkursen (GLK 3, MF, LLM) im Auftrag des Kantons Zuerich und BASPO.',
    prerequisites: ['llm'],
    requiredQualifications: ['js_leiter_lst', 'js_lagerleiter'],
    grantsQualifications: ['js_experte_lst'],
    treePosition: { col: 4, row: 0 }
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
