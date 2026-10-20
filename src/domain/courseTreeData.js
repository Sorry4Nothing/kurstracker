/**
 * CEVI REGION ZUERICH & JUGEND+SPORT AUSBILDUNGSBAUM
 *
 * Basierend auf dem offiziellen Kursreglement von Cevi Region Zuerich:
 * https://ceviregionzuerich.ch/kurse
 *
 * Enthaelt:
 * - Level 0: Jungschar Grundstufe (Voku ab 12, Heku ab 13, GLK 1 ab 14, GLK 2 ab 15)
 * - Level 1: Leiterstufe (GLK 3 / J+S Leiterkurs ab 17)
 * - Level 2: Weiterbildung, Stufenleitung & Sicherheit (SLK, MF, SLRG, Pioniertechnik, Sicherheit Berg/Wasser/Winter)
 * - Level 3: Kaderstufe (Lagerleiter LLM, Abteilungsleiter AL, J+S Coach)
 * - Level 4: Expertenstufe (J+S Experte Lagersport/Trekking)
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
    title: 'Helferkurs (Heku) / Romerlager',
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
    title: 'Gruppenleiterkurs 1 (GLK 1)',
    shortTitle: 'GLK 1',
    level: 0,
    category: 'Jungschar',
    minAge: 14,
    recommendedAge: 14,
    description: 'Erste Stufe der Gruppenleiterausbildung. Methodik fur Gruppenstunden, Gruppenpsychologie, Programmgestaltung und Leitungsstile.',
    prerequisites: ['heku'],
    recommendedPrerequisites: ['voku', 'heku'],
    requiredQualifications: [],
    grantsQualifications: ['cevi_gruppenleiter_1'],
    treePosition: { col: 0, row: 2 }
  },

  glk2: {
    id: 'glk2',
    code: 'GLK 2',
    org: 'Cevi',
    title: 'Gruppenleiterkurs 2 (GLK 2)',
    shortTitle: 'GLK 2',
    level: 0,
    category: 'Jungschar',
    minAge: 15,
    recommendedAge: 15,
    description: 'Vertiefung der Gruppenleitung vor dem J+S-Alter. Mehrtagige Unternehmungen, Biwak, Kartenkunde, Orientierung und Dynamik.',
    prerequisites: ['glk1'],
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
    title: 'Gruppenleiterkurs 3 (GLK 3 / J+S Leiterkurs)',
    shortTitle: 'GLK 3 (J+S Leiter)',
    level: 1,
    category: 'Jugend+Sport',
    minAge: 17,
    recommendedAge: 17,
    description: 'Offizieller J+S-Leiterkurs Lagersport/Trekking Jugendsport (zusammen mit Sportamt Kanton Zuerich). Befahigt zur selbststandigen Leitung von Lagern und Sportprogrammen.',
    prerequisites: ['glk2'],
    recommendedPrerequisites: ['glk1', 'glk2'],
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
    title: 'Stufenleitenden-Kurs (SLK)',
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
    title: 'Modul Fortbildung Lagersport/Trekking (MF)',
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
    code: 'Pionier',
    org: 'Cevi',
    title: 'Pioniertechnik Kurs',
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
    title: 'J+S Sicherheitsmodul Berg',
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
    title: 'J+S Sicherheitsmodul Wasser',
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
    title: 'J+S Sicherheitsmodul Winter',
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
    title: 'Lagerleiter-Modul (LLM)',
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
    code: 'AL',
    org: 'Cevi',
    title: 'Abteilungsleiter-Seminar (AL-Seminar)',
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
    title: 'J+S Coach Kurs',
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
    title: 'J+S Expertenkurs Lagersport/Trekking',
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
 * Kanten / Verbindungen im Baum (Abhangigkeiten gemass Cevi Region Zuerich)
 */
export const TREE_EDGES = [
  // Grundstufe Einstieg
  { from: 'voku', to: 'heku', type: 'recommended', label: 'Empfohlener Pfad' },
  { from: 'heku', to: 'glk1', type: 'required', label: 'Voraussetzung Heku' },
  { from: 'glk1', to: 'glk2', type: 'required', label: 'Voraussetzung GLK 1' },
  { from: 'glk2', to: 'glk3', type: 'required', label: 'Voraussetzung GLK 2 (ab 17 J.)' },

  // Weiterbildung & Stufenleitung ab GLK 3
  { from: 'glk3', to: 'slk', type: 'required', label: 'Stufenleiter ab 17 J.' },
  { from: 'glk3', to: 'mf_lst', type: 'required', label: 'Alle 2 Jahre' },
  { from: 'glk1', to: 'pionier', type: 'recommended', label: 'Ab GLK 1 (15 J.)' },

  // Sicherheitsbereiche
  { from: 'glk3', to: 'sec_berg', type: 'required', label: 'Voraussetzung GLK 3' },
  { from: 'glk3', to: 'sec_wasser', type: 'required', label: 'Voraussetzung GLK 3' },
  { from: 'slrg_pool', to: 'sec_wasser', type: 'required', label: 'Zusatzanforderung SLRG' },
  { from: 'glk3', to: 'sec_winter', type: 'required', label: 'Voraussetzung GLK 3' },

  // Kaderstufe
  { from: 'glk3', to: 'llm', type: 'required', label: 'GLK 3 + Lagererfahrung' },
  { from: 'glk3', to: 'al_seminar', type: 'required', label: 'GLK 3 + Abteilungserfahrung' },
  { from: 'glk3', to: 'js_coach', type: 'required', label: 'GLK 3 + Ab 20 J.' },

  // Expertenstufe
  { from: 'llm', to: 'experte', type: 'required', label: 'LLM + Empfehlung' }
];

export const QUALIFICATIONS_CATALOG = {
  cevi_vorkurs: { id: 'cevi_vorkurs', title: 'Cevi Vorkurs Zertifikat', type: 'Cevi' },
  cevi_helfer: { id: 'cevi_helfer', title: 'Cevi Helfer / Hilfsleiter', type: 'Cevi' },
  cevi_gruppenleiter_1: { id: 'cevi_gruppenleiter_1', title: 'Cevi Gruppenleiter 1', type: 'Cevi' },
  cevi_gruppenleiter_2: { id: 'cevi_gruppenleiter_2', title: 'Cevi Gruppenleiter 2', type: 'Cevi' },
  cevi_gruppenleiter_3: { id: 'cevi_gruppenleiter_3', title: 'Cevi Gruppenleiter 3', type: 'Cevi' },
  js_leiter_lst: { id: 'js_leiter_lst', title: 'J+S Leiter Lagersport/Trekking Jugendsport', type: 'J+S', validityYears: 2 },
  cevi_stufenleiter: { id: 'cevi_stufenleiter', title: 'Cevi Stufenleiter', type: 'Cevi' },
  cevi_abteilungsleiter: { id: 'cevi_abteilungsleiter', title: 'Cevi Abteilungsleiter / Scharleiter', type: 'Cevi' },
  js_lagerleiter: { id: 'js_lagerleiter', title: 'J+S Lagerleiter Lagersport/Trekking', type: 'J+S' },
  slrg_basis_pool: { id: 'slrg_basis_pool', title: 'SLRG Brevet Basis Pool', type: 'SLRG', validityYears: 4 },
  cevi_pionier: { id: 'cevi_pionier', title: 'Cevi Pioniertechnik Zertifikat', type: 'Cevi' },
  js_sec_berg: { id: 'js_sec_berg', title: 'J+S Sicherheitsbereich Berg (T3/T4)', type: 'J+S' },
  js_sec_wasser: { id: 'js_sec_wasser', title: 'J+S Sicherheitsbereich Wasser', type: 'J+S' },
  js_sec_winter: { id: 'js_sec_winter', title: 'J+S Sicherheitsbereich Winter', type: 'J+S' },
  js_coach: { id: 'js_coach', title: 'J+S Coach', type: 'J+S' },
  js_experte_lst: { id: 'js_experte_lst', title: 'J+S Experte Lagersport/Trekking', type: 'J+S' }
};
