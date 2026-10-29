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
    code: 'SLRG Pool',
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
    code: 'SiBe Berg',
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
    code: 'SiBe Wasser',
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
    code: 'SiBe Winter',
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
    code: 'J+S-Coach',
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
    code: 'J+S-Experte',
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
 * Regionen und ihre Kurse: 1:1 aus dem Kursablauf-Editor-Artefakt uebernommen (94 Kurse aus
 * cevi.db, Veranstalter-Filter "Alle Gruppen", Zeitraum 27.10.2026-27.10.2027, plus Voku/SiBe
 * Berg/SiBe Wasser manuell ergaenzt, 7 Gender-Dubletten zusammengelegt -> 85 Kurse, in 6 Kategorien
 * eingeteilt: Ausbildung, J+S-Zertifizierung, J+S-Module, Sicherheit, Auffrischung, Optionale
 * Sonderkurse). Cevi Schweiz, Externe Kurse und wassermodul.ch laufen in jeder Region mit
 * (national/regionsuebergreifend); alles andere nur in seiner eigenen Region (org-Feld), auch
 * Kurse mit mehreren Regionen im org-Feld (z.B. "Cevi Region Zürich, Cevi Ostschweiz").
 *
 * Kanten-Herkunft, zwei verschiedene Quellen:
 * - Ausbildung-Stufe (Voku/Heku/GLK1/GLK2-Aequivalente): die DB gibt hier nur ein Mindestalter,
 *   keinen Vorgaenger. recommendedPrerequisites ist deshalb nur nach Alter sortiert verkettet,
 *   keine bestaetigte Reihenfolge.
 * - Ab J+S-Zertifizierung (GLK 3 und alles danach): prerequisites kommt aus echten DB-Feldern
 *   ("Erforderliche Qualifikationen" matcht "Qualifiziert für" anderer Kurse derselben Region),
 *   also eine harte Sperre, keine Schaetzung. Ohne erkannte Qualifikation haengt der Kurs als
 *   empfohlene (nicht sperrende) Vorstufe hinter der letzten Ausbildung-Stufe.
 *
 * Nur fuer die Baum-Vorschau (COURSE_NODES_BY_REGION, /api/tree/structure?region=); COURSE_NODES
 * oben (Zuerich, handgepflegt) bleibt die Grundlage fuer Planer und echte Personen-Auswertung.
 */
export const REGIONS = [
  {
    "key": "zuerich",
    "label": "Cevi Region Zürich"
  },
  {
    "key": "winterthur-schaffhausen",
    "label": "Cevi Region Winterthur-Schaffhausen"
  },
  {
    "key": "bern",
    "label": "Cevi Region Bern"
  },
  {
    "key": "ostschweiz",
    "label": "Cevi Ostschweiz"
  },
  {
    "key": "agsoluzg",
    "label": "Cevi Regionalverband AGSOLUZG"
  }
];

export const COURSE_NODES_BY_REGION = {"zuerich":{"voku":{"id":"voku","code":"VOKU","org":"Cevi Region Zürich","title":"Vorkurs","category":"Ausbildung","minAge":12,"recommendedAge":12,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"heku":{"id":"heku","code":"HEKU","org":"Cevi Region Zürich","title":"Helfer*innenkurs","category":"Ausbildung","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["voku"],"requiredQualifications":[],"grantsQualifications":[]},"glk1":{"id":"glk1","code":"GLK1","org":"Cevi Region Zürich","title":"Gruppenleiterkurs 1","category":"Ausbildung","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["heku"],"requiredQualifications":[],"grantsQualifications":[]},"glk2":{"id":"glk2","code":"GLK2","org":"Cevi Region Zürich","title":"Gruppenleiterkurs 2","category":"Ausbildung","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["glk1"],"requiredQualifications":[],"grantsQualifications":[]},"level_up":{"id":"level_up","code":"Level Up","org":"Cevi Region Zürich","title":"Level Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"frosch_up":{"id":"frosch_up","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"nolk":{"id":"nolk","code":"NOLK","org":"Cevi Schweiz","title":"Nationaler Ortsgruppenleitenden-Kurs","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"level_up_medientraining_krisentraining":{"id":"level_up_medientraining_krisentraining","code":"Level Up - Medientraining / Krisentraining / Rechtliche Verantwortung","org":"Cevi Region Zürich","title":"Level Up - Medientraining / Krisentraining / Rechtliche Verantwortung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"level_up_lagermedizin":{"id":"level_up_lagermedizin","code":"Level Up - Lagermedizin","org":"Cevi Region Zürich","title":"Level Up - Lagermedizin","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"experte":{"id":"experte","code":"J+S-Expert*innenkurs LS/T","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm","glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"js_coach":{"id":"js_coach","code":"J+S-Coachkurs LS/T","org":"Cevi Schweiz","title":"J+S-Coachkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"glk3":{"id":"glk3","code":"GLK 3","org":"Cevi Region Zürich, Cevi Ostschweiz","title":"J+S-Leiter*innenkurs LS/T Jugendliche","category":"J+S-Zertifizierung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["glk2"],"requiredQualifications":[],"grantsQualifications":["js_leiter_lst"]},"js_mf_coach":{"id":"js_mf_coach","code":"J+S-Coachtreffen","org":"Cevi Region Zürich","title":"J+S-Modul Fortbildung Coach LS/T","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["js_coach"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_ls_t":{"id":"js_modul_fortbildung_expert_in_ls_t","code":"J+S-Modul Fortbildung Expert*in LS/T","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in LS/T","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_slrg":{"id":"js_modul_fortbildung_expert_in_slrg","code":"J+S-Modul Fortbildung Expert*in SLRG","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"js_modul_fortbildung_expert_in_slrg_wk":{"id":"js_modul_fortbildung_expert_in_slrg_wk","code":"J+S-Modul Fortbildung Expert*in SLRG WK","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","js_modul_fortbildung_expert_in_slrg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"expert_sibe_berg":{"id":"expert_sibe_berg","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_berg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"expert_sibe_wasser":{"id":"expert_sibe_wasser","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"expert_sibe_winter":{"id":"expert_sibe_winter","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_winter"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"slk":{"id":"slk","code":"SLK","org":"Cevi Region Zürich","title":"J+S-Modul Fortbildung Leiter*in LS/T Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":[]},"al_seminar":{"id":"al_seminar","code":"AL-Semi","org":"Cevi Region Zürich","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"vielfalt_inklusion":{"id":"vielfalt_inklusion","code":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","org":"Cevi Schweiz","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"pionier":{"id":"pionier","code":"Pioniertechnik-Modul","org":"Cevi Region Zürich","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"llm":{"id":"llm","code":"LLM","org":"Cevi Region Zürich","title":"J+S-Modul Lager hauptleiten","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"mf_wasser":{"id":"mf_wasser","code":"MF Wasser","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Wasser LS/T","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":["slrg_basis_pool","slrg_modul_see"]},"js_modul_weiterbildung":{"id":"js_modul_weiterbildung","code":"J+S-Modul Weiterbildung","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"sec_winter":{"id":"sec_winter","code":"J+S-Modul im Sicherheitsbereich Winter","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"sec_berg":{"id":"sec_berg","code":"J+S-Modul im Sicherheitsbereich Berg","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"sec_wasser":{"id":"sec_wasser","code":"J+S-Sicherheitsmodul Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["mf_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"winterthur-schaffhausen":{"elku":{"id":"elku","code":"ELKU","org":"Cevi Region Winterthur-Schaffhausen","title":"ELKU","category":"Ausbildung","minAge":11,"recommendedAge":11,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"nothilfe_kurs":{"id":"nothilfe_kurs","code":"Nothilfe-Kurs","org":"Cevi Region Winterthur-Schaffhausen","title":"Nothilfe-Kurs","category":"Ausbildung","minAge":12,"recommendedAge":12,"prerequisites":[],"recommendedPrerequisites":["elku"],"requiredQualifications":[],"grantsQualifications":[]},"heku":{"id":"heku","code":"HeKu","org":"Cevi Region Winterthur-Schaffhausen","title":"Helfer*innenkurs","category":"Ausbildung","minAge":12,"recommendedAge":12,"prerequisites":[],"recommendedPrerequisites":["nothilfe_kurs"],"requiredQualifications":[],"grantsQualifications":[]},"glk1":{"id":"glk1","code":"GLK 1","org":"Cevi Region Winterthur-Schaffhausen","title":"Gruppenleiterkurs 1","category":"Ausbildung","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["heku"],"requiredQualifications":[],"grantsQualifications":[]},"glk2":{"id":"glk2","code":"GLK 2","org":"Cevi Region Winterthur-Schaffhausen","title":"Gruppenleiterkurs 2","category":"Ausbildung","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["glk1"],"requiredQualifications":[],"grantsQualifications":[]},"frosch_up":{"id":"frosch_up","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"kuche_semi":{"id":"kuche_semi","code":"KüChe-Semi","org":"Cevi Region Winterthur-Schaffhausen","title":"KüChe-Semi","category":"Optionale Sonderkurse","minAge":16,"recommendedAge":16,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"nolk":{"id":"nolk","code":"NOLK","org":"Cevi Schweiz","title":"Nationaler Ortsgruppenleitenden-Kurs","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"seil_semi":{"id":"seil_semi","code":"Seil-Semi","org":"Cevi Region Winterthur-Schaffhausen","title":"Seil-Semi","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"experte":{"id":"experte","code":"J+S-Expert*innenkurs LS/T","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llk","glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"js_coach":{"id":"js_coach","code":"J+S-Coachkurs LS/T","org":"Cevi Schweiz","title":"J+S-Coachkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"glk3":{"id":"glk3","code":"GLK 3","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Leiter*innenkurs LS/T Jugendliche","category":"J+S-Zertifizierung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["glk2"],"requiredQualifications":[],"grantsQualifications":["js_leiter_lst"]},"js_modul_fortbildung_expert_in_ls_t":{"id":"js_modul_fortbildung_expert_in_ls_t","code":"J+S-Modul Fortbildung Expert*in LS/T","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in LS/T","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_slrg":{"id":"js_modul_fortbildung_expert_in_slrg","code":"J+S-Modul Fortbildung Expert*in SLRG","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","mf_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"js_modul_fortbildung_expert_in_slrg_wk":{"id":"js_modul_fortbildung_expert_in_slrg_wk","code":"J+S-Modul Fortbildung Expert*in SLRG WK","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","js_modul_fortbildung_expert_in_slrg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"expert_sibe_berg":{"id":"expert_sibe_berg","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_berg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"expert_sibe_wasser":{"id":"expert_sibe_wasser","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"expert_sibe_winter":{"id":"expert_sibe_winter","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_winter"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"vielfalt_inklusion":{"id":"vielfalt_inklusion","code":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","org":"Cevi Schweiz","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3","llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"mf_spiel_und_spass":{"id":"mf_spiel_und_spass","code":"MF Spiel und Spass","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3","llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"llk":{"id":"llk","code":"LLK","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Lagerleiter*in LS/T","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_lagerleiter","js_leiter_lst_kinder"]},"js_modul_weiterbildung":{"id":"js_modul_weiterbildung","code":"J+S-Modul Weiterbildung","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"mf_wasser":{"id":"mf_wasser","code":"MF Wasser","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Wasser LS/T","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["glk3","llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":["slrg_basis_pool","slrg_modul_see"]},"sec_winter":{"id":"sec_winter","code":"J+S-Modul im Sicherheitsbereich Winter","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"sec_berg":{"id":"sec_berg","code":"J+S-Modul im Sicherheitsbereich Berg","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"sec_wasser":{"id":"sec_wasser","code":"J+S-Sicherheitsmodul Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["mf_wasser","glk3"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"bern":{"lk":{"id":"lk","code":"LK","org":"Cevi Region Bern","title":"J+S-Leiter*innenkurs LS/T","category":"Ausbildung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["gruppenleitendenkurs"],"requiredQualifications":[],"grantsQualifications":[]},"potenzial_13":{"id":"potenzial_13","code":"Potenzial 13","org":"Cevi Region Bern","title":"Potenzial 13","category":"Optionale Sonderkurse","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"frosch_up":{"id":"frosch_up","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"gk":{"id":"gk","code":"GK","org":"Cevi Region Bern","title":"Grundkurs ","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["potenzial_13"],"requiredQualifications":[],"grantsQualifications":[]},"iku_film_foto":{"id":"iku_film_foto","code":"IKU Film & Foto","org":"Cevi Region Bern","title":"IKU Film & Foto","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"iku_erste_hilfe":{"id":"iku_erste_hilfe","code":"IKU Erste Hilfe","org":"Cevi Region Bern","title":"IKU Erste Hilfe im Jungschi-Alltag","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"gruppenleitendenkurs":{"id":"gruppenleitendenkurs","code":"GLK","org":"Cevi Region Bern","title":"Gruppenleitendenkurs","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["gk"],"requiredQualifications":[],"grantsQualifications":[]},"nolk":{"id":"nolk","code":"NOLK","org":"Cevi Schweiz","title":"Nationaler Ortsgruppenleitenden-Kurs","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"experte":{"id":"experte","code":"J+S-Expert*innenkurs LS/T","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"js_coach":{"id":"js_coach","code":"J+S-Coachkurs LS/T","org":"Cevi Schweiz","title":"J+S-Coachkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"js_mf_coach":{"id":"js_mf_coach","code":"J+S MF Coach","org":"Cevi Region Bern","title":"J+S-Modul Fortbildung Coach LS/T","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["js_coach"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_ls_t":{"id":"js_modul_fortbildung_expert_in_ls_t","code":"J+S-Modul Fortbildung Expert*in LS/T","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in LS/T","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_slrg":{"id":"js_modul_fortbildung_expert_in_slrg","code":"J+S-Modul Fortbildung Expert*in SLRG","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","slrg_modul_see"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"js_modul_fortbildung_expert_in_slrg_wk":{"id":"js_modul_fortbildung_expert_in_slrg_wk","code":"J+S-Modul Fortbildung Expert*in SLRG WK","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","js_modul_fortbildung_expert_in_slrg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"expert_sibe_berg":{"id":"expert_sibe_berg","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_berg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"expert_sibe_wasser":{"id":"expert_sibe_wasser","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"expert_sibe_winter":{"id":"expert_sibe_winter","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_winter"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"outdoortech_sarasani_und_seiltechnikkurs":{"id":"outdoortech_sarasani_und_seiltechnikkurs","code":"Outdoortech Sarasani und Seiltechnikkurs","org":"Cevi Region Bern, Externe Kurse","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["lk"],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"vielfalt_inklusion":{"id":"vielfalt_inklusion","code":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","org":"Cevi Schweiz","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["lk"],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"llm":{"id":"llm","code":"LLM","org":"Cevi Region Bern","title":"J+S-Modul Lager hauptleiten","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":["lk"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"mf_wasser":{"id":"mf_wasser","code":"MF Wasser","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Wasser LS/T","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["lk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":["slrg_basis_pool","slrg_modul_see"]},"js_modul_weiterbildung":{"id":"js_modul_weiterbildung","code":"J+S-Modul Weiterbildung","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":["lk"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"umwelt_und_natur":{"id":"umwelt_und_natur","code":"Umwelt und Natur","org":"Cevi Region Bern","title":"J+S-Modul Natur und Umwelt","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"berg_winter":{"id":"berg_winter","code":"Berg/Winter","org":"Cevi Region Bern","title":"J+S-Modul Winter","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"sec_winter":{"id":"sec_winter","code":"J+S-Modul im Sicherheitsbereich Winter","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["lk"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"slrg_brevet_basis_pool":{"id":"slrg_brevet_basis_pool","code":"SLRG Brevet Basis Pool","org":"Cevi Region Bern","title":"SLRG Brevet Basis Pool","category":"Sicherheit","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["lk"],"requiredQualifications":[],"grantsQualifications":["slrg_basis_pool"]},"slrg_modul_see":{"id":"slrg_modul_see","code":"SLRG Modul See","org":"Cevi Region Bern","title":"SLRG Modul See","category":"Sicherheit","minAge":16,"recommendedAge":16,"prerequisites":["slrg_brevet_basis_pool"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_basis_pool","slrg_plus_pool"],"grantsQualifications":["slrg_modul_see"]},"sec_berg":{"id":"sec_berg","code":"J+S-Modul im Sicherheitsbereich Berg","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["lk"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"sec_wasser":{"id":"sec_wasser","code":"J+S-Sicherheitsmodul Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["mf_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"ostschweiz":{"js_leiter_innenkurs_ls_t":{"id":"js_leiter_innenkurs_ls_t","code":"J+S-Leiter*innenkurs LS/T","org":"Cevi Ostschweiz","title":"J+S-Leiter*innenkurs LS/T","category":"Ausbildung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["gruppenleiter_innenkurs"],"requiredQualifications":[],"grantsQualifications":[]},"grundkurs":{"id":"grundkurs","code":"Grundkurs","org":"Cevi Ostschweiz","title":"Grundkurs","category":"Optionale Sonderkurse","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"nh2":{"id":"nh2","code":"NH2","org":"Cevi Ostschweiz","title":"Nau Hau","category":"Optionale Sonderkurse","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"impulsprogramm":{"id":"impulsprogramm","code":"Impulsprogramm","org":"Cevi Ostschweiz","title":"Impulsprogramm","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"frosch_up":{"id":"frosch_up","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"leiter_innentraining":{"id":"leiter_innentraining","code":"Leiter*innentraining","org":"Cevi Ostschweiz","title":"Leiter*innentraining","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["grundkurs","nh2"],"requiredQualifications":[],"grantsQualifications":[]},"gruppenleiter_innenkurs":{"id":"gruppenleiter_innenkurs","code":"Gruppenleiter*innenkurs","org":"Cevi Ostschweiz","title":"Gruppenleiter*innenkurs","category":"Optionale Sonderkurse","minAge":16,"recommendedAge":16,"prerequisites":[],"recommendedPrerequisites":["leiter_innentraining"],"requiredQualifications":[],"grantsQualifications":[]},"nolk":{"id":"nolk","code":"NOLK","org":"Cevi Schweiz","title":"Nationaler Ortsgruppenleitenden-Kurs","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"seilbahnausbildung":{"id":"seilbahnausbildung","code":"Seilbahnausbildung","org":"Cevi Ostschweiz","title":"Seilbahnausbildung","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"voila_tg_weiterbildungsabend":{"id":"voila_tg_weiterbildungsabend","code":"Voilà TG Weiterbildungsabend","org":"Cevi Ostschweiz","title":"Voilà TG Weiterbildungsabend","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"experte":{"id":"experte","code":"J+S-Expert*innenkurs LS/T","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm","glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"js_coach":{"id":"js_coach","code":"J+S-Coachkurs LS/T","org":"Cevi Schweiz","title":"J+S-Coachkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"glk3":{"id":"glk3","code":"GLK 3","org":"Cevi Region Zürich, Cevi Ostschweiz","title":"J+S-Leiter*innenkurs LS/T Jugendliche","category":"J+S-Zertifizierung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["js_leiter_innenkurs_ls_t"],"requiredQualifications":[],"grantsQualifications":["js_leiter_lst"]},"js_modul_fortbildung_expert_in_ls_t":{"id":"js_modul_fortbildung_expert_in_ls_t","code":"J+S-Modul Fortbildung Expert*in LS/T","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in LS/T","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"js_mf_coach":{"id":"js_mf_coach","code":"J+S MF Coach","org":"Cevi Ostschweiz","title":"J+S-Modul Fortbildung Coach LS/T","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["js_coach"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_slrg":{"id":"js_modul_fortbildung_expert_in_slrg","code":"J+S-Modul Fortbildung Expert*in SLRG","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"js_modul_fortbildung_expert_in_slrg_wk":{"id":"js_modul_fortbildung_expert_in_slrg_wk","code":"J+S-Modul Fortbildung Expert*in SLRG WK","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","js_modul_fortbildung_expert_in_slrg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"expert_sibe_berg":{"id":"expert_sibe_berg","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_berg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"expert_sibe_wasser":{"id":"expert_sibe_wasser","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"expert_sibe_winter":{"id":"expert_sibe_winter","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_winter"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"vielfalt_inklusion":{"id":"vielfalt_inklusion","code":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","org":"Cevi Schweiz","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"llm":{"id":"llm","code":"LLM","org":"Cevi Ostschweiz","title":"J+S-Modul Lager hauptleiten","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"mf_wasser":{"id":"mf_wasser","code":"MF Wasser","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Wasser LS/T","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":["slrg_basis_pool","slrg_modul_see"]},"js_modul_weiterbildung":{"id":"js_modul_weiterbildung","code":"J+S-Modul Weiterbildung","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"sec_winter":{"id":"sec_winter","code":"J+S-Modul im Sicherheitsbereich Winter","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"sec_berg":{"id":"sec_berg","code":"J+S-Modul im Sicherheitsbereich Berg","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"sec_wasser":{"id":"sec_wasser","code":"J+S-Sicherheitsmodul Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["mf_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"agsoluzg":{"glk3":{"id":"glk3","code":"GLK 3","org":"Cevi Regionalverband AGSOLUZG","title":"J+S-Leiter*innenkurs LS/T","category":"Ausbildung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["modul_sanitat","pionier","modul_programmplanung_und_rollenspiel"],"requiredQualifications":[],"grantsQualifications":[]},"frosch_up":{"id":"frosch_up","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"gku_a":{"id":"gku_a","code":"GKU A","org":"Cevi Regionalverband AGSOLUZG","title":"Grundlagenkurs A ","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"gku_b":{"id":"gku_b","code":"GKU B","org":"Cevi Regionalverband AGSOLUZG","title":"Grundlagenkurs B","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"modul_sanitat":{"id":"modul_sanitat","code":"Modul Sanität","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Sanität","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["gku_a","gku_b"],"requiredQualifications":[],"grantsQualifications":[]},"pionier":{"id":"pionier","code":"Modul Pionier","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Pionier","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["gku_a","gku_b"],"requiredQualifications":[],"grantsQualifications":[]},"modul_programmplanung_und_rollenspiel":{"id":"modul_programmplanung_und_rollenspiel","code":"Modul Programmplanung und Rollenspiel","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Programmplanung und Rollenspiel","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["gku_a","gku_b"],"requiredQualifications":[],"grantsQualifications":[]},"nolk":{"id":"nolk","code":"NOLK","org":"Cevi Schweiz","title":"Nationaler Ortsgruppenleitenden-Kurs","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"experte":{"id":"experte","code":"J+S-Expert*innenkurs LS/T","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"js_coach":{"id":"js_coach","code":"J+S-Coachkurs LS/T","org":"Cevi Schweiz","title":"J+S-Coachkurs LS/T","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"js_mf_coach":{"id":"js_mf_coach","code":"Modul Fortbildung für J+S-Coaches","org":"Cevi Regionalverband AGSOLUZG","title":"J+S-Modul Fortbildung Coach LS/T","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["js_coach"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_ls_t":{"id":"js_modul_fortbildung_expert_in_ls_t","code":"J+S-Modul Fortbildung Expert*in LS/T","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in LS/T","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"js_modul_fortbildung_expert_in_slrg":{"id":"js_modul_fortbildung_expert_in_slrg","code":"J+S-Modul Fortbildung Expert*in SLRG","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"js_modul_fortbildung_expert_in_slrg_wk":{"id":"js_modul_fortbildung_expert_in_slrg_wk","code":"J+S-Modul Fortbildung Expert*in SLRG WK","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","js_modul_fortbildung_expert_in_slrg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"expert_sibe_berg":{"id":"expert_sibe_berg","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_berg"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"expert_sibe_wasser":{"id":"expert_sibe_wasser","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"expert_sibe_winter":{"id":"expert_sibe_winter","code":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","org":"Externe Kurse","title":"J+S-Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["experte","sec_winter"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"vielfalt_inklusion":{"id":"vielfalt_inklusion","code":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","org":"Cevi Schweiz","title":"J+S-Modul Fortbildung Leiter*in LS/T Kinder und Jugendliche","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["glk3"],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"llm":{"id":"llm","code":"LLM","org":"Cevi Regionalverband AGSOLUZG","title":"J+S-Modul Lager hauptleiten","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"mf_wasser":{"id":"mf_wasser","code":"MF Wasser","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Wasser LS/T","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":["slrg_basis_pool","slrg_modul_see"]},"js_modul_weiterbildung":{"id":"js_modul_weiterbildung","code":"J+S-Modul Weiterbildung","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":["glk3"],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"sec_winter":{"id":"sec_winter","code":"J+S-Modul im Sicherheitsbereich Winter","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["glk3"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"sec_berg":{"id":"sec_berg","code":"J+S-Modul im Sicherheitsbereich Berg","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["glk3"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"sec_wasser":{"id":"sec_wasser","code":"J+S-Sicherheitsmodul Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["mf_wasser"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}}};
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
