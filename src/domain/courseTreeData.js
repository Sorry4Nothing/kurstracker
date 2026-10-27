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

export const COURSE_NODES_BY_REGION = {"zuerich":{"zuerich_voku_2026":{"id":"zuerich_voku_2026","code":"VOKU","org":"Cevi Region Zürich","title":"VOKU","category":"Ausbildung","minAge":12,"recommendedAge":12,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_heku_m_2027":{"id":"zuerich_heku_m_2027","code":"HEKU","org":"Cevi Region Zürich","title":"HEKU","category":"Ausbildung","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["zuerich_voku_2026"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_glk1_f_2027":{"id":"zuerich_glk1_f_2027","code":"GLK1","org":"Cevi Region Zürich","title":"GLK1","category":"Ausbildung","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["zuerich_heku_m_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_glk2_2027":{"id":"zuerich_glk2_2027","code":"GLK2","org":"Cevi Region Zürich","title":"GLK2","category":"Ausbildung","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk1_f_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_level_up_2027":{"id":"zuerich_level_up_2027","code":"Level Up","org":"Cevi Region Zürich","title":"Level Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_frosch_up_2027":{"id":"zuerich_frosch_up_2027","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_nolk_2027":{"id":"zuerich_nolk_2027","code":"NOLK","org":"Cevi Schweiz","title":"NOLK","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_level_up_2027_medientraining_krisentrain":{"id":"zuerich_level_up_2027_medientraining_krisentrain","code":"Level Up - Medientraining / Krisentraining / Rechtliche Verantwortung","org":"Cevi Region Zürich","title":"Level Up - Medientraining / Krisentraining / Rechtliche Verantwortung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_level_up_2027_lagermedizin":{"id":"zuerich_level_up_2027_lagermedizin","code":"Level Up - Lagermedizin","org":"Cevi Region Zürich","title":"Level Up - Lagermedizin","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_j_s_expert_innenkurs_2027":{"id":"zuerich_j_s_expert_innenkurs_2027","code":"Expert","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["zuerich_llm_2027","zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"zuerich_j_s_coachkurs_2027":{"id":"zuerich_j_s_coachkurs_2027","code":"Coach","org":"Cevi Schweiz","title":"J+S-Coachkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["zuerich_llm_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"zuerich_glk3_fa_2027":{"id":"zuerich_glk3_fa_2027","code":"GLK3","org":"Cevi Region Zürich, Cevi Ostschweiz","title":"GLK3 Fa","category":"J+S-Zertifizierung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk2_2027"],"requiredQualifications":[],"grantsQualifications":["js_leiter_lst"]},"zuerich_j_s_coachtreffen_2027":{"id":"zuerich_j_s_coachtreffen_2027","code":"ZH50-27","org":"Cevi Region Zürich","title":"J+S-Coachtreffen","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["zuerich_j_s_coachkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"zuerich_modul_fortbildung_expert_in_module_de_pe":{"id":"zuerich_modul_fortbildung_expert_in_module_de_pe","code":"CH208298","org":"Externe Kurse","title":"Modul Fortbildung Expert*in","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"zuerich_modul_fortbildung_expert_in_slrg_module":{"id":"zuerich_modul_fortbildung_expert_in_slrg_module","code":"CH215067","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"zuerich_modul_fortbildung_expert_in_slrg_wk_modu":{"id":"zuerich_modul_fortbildung_expert_in_slrg_wk_modu","code":"CH215068","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_j_s_expert_innenkurs_2027","zuerich_modul_fortbildung_expert_in_slrg_module"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"zuerich_modul_fortbildung_expert_in_im_sicherhei":{"id":"zuerich_modul_fortbildung_expert_in_im_sicherhei","code":"CH215071","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_j_s_expert_innenkurs_2027","zuerich_js_modul_sibe_berg_2026"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"zuerich_modul_fortbildung_expert_in_im_sicherhei_2":{"id":"zuerich_modul_fortbildung_expert_in_im_sicherhei_2","code":"CH215066","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_j_s_expert_innenkurs_2027","zuerich_sibe_wasser_modul"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"zuerich_modul_fortbildung_expert_in_im_sicherhei_3":{"id":"zuerich_modul_fortbildung_expert_in_im_sicherhei_3","code":"CH215060","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_j_s_expert_innenkurs_2027","zuerich_pbs_j_s_modul_im_sicherheitsbereich_wint","zuerich_j_s_modul_im_sicherheitsbereich_winter_2"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"zuerich_slk_2027":{"id":"zuerich_slk_2027","code":"ZH61-27","org":"Cevi Region Zürich","title":"SLK","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":[]},"zuerich_al_semi_2027":{"id":"zuerich_al_semi_2027","code":"ZH59-27","org":"Cevi Region Zürich","title":"AL-Semi","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"zuerich_j_s_modul_kulturelle_vielfalt_inklusion":{"id":"zuerich_j_s_modul_kulturelle_vielfalt_inklusion","code":"CH82-26","org":"Cevi Schweiz","title":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"zuerich_pioniertechnik_modul_2027":{"id":"zuerich_pioniertechnik_modul_2027","code":"ZH60-27","org":"Cevi Region Zürich","title":"Pioniertechnik-Modul","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"zuerich_llm_2027":{"id":"zuerich_llm_2027","code":"ZH55-27","org":"Cevi Region Zürich","title":"LLM","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"zuerich_j_s_modul_weiterbildung_2027":{"id":"zuerich_j_s_modul_weiterbildung_2027","code":"CH81-27","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["zuerich_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"zuerich_pbs_j_s_modul_im_sicherheitsbereich_wint":{"id":"zuerich_pbs_j_s_modul_im_sicherheitsbereich_wint","code":"BS552-27","org":"Externe Kurse","title":"PBS: J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"zuerich_j_s_modul_im_sicherheitsbereich_winter_2":{"id":"zuerich_j_s_modul_im_sicherheitsbereich_winter_2","code":"CH87-27","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"zuerich_js_modul_sibe_berg_2026":{"id":"zuerich_js_modul_sibe_berg_2026","code":"CH86-26","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"zuerich_sibe_wasser_modul":{"id":"zuerich_sibe_wasser_modul","code":"SiBe Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["zuerich_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"winterthur-schaffhausen":{"winterthur-schaffhausen_m_elku":{"id":"winterthur-schaffhausen_m_elku","code":"ELKU","org":"Cevi Region Winterthur-Schaffhausen","title":"ELKU","category":"Ausbildung","minAge":11,"recommendedAge":11,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_nothilfe_kurs":{"id":"winterthur-schaffhausen_nothilfe_kurs","code":"Nothilfe-Kurs","org":"Cevi Region Winterthur-Schaffhausen","title":"Nothilfe-Kurs","category":"Ausbildung","minAge":12,"recommendedAge":12,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_m_elku"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_m_heku":{"id":"winterthur-schaffhausen_m_heku","code":"HeKu","org":"Cevi Region Winterthur-Schaffhausen","title":"HeKu","category":"Ausbildung","minAge":12,"recommendedAge":12,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_nothilfe_kurs"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_m_glk_1":{"id":"winterthur-schaffhausen_m_glk_1","code":"GLK 1","org":"Cevi Region Winterthur-Schaffhausen","title":"GLK 1","category":"Ausbildung","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_m_heku"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_m_glk_2":{"id":"winterthur-schaffhausen_m_glk_2","code":"GLK 2","org":"Cevi Region Winterthur-Schaffhausen","title":"GLK 2","category":"Ausbildung","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_m_glk_1"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_frosch_up_2027":{"id":"winterthur-schaffhausen_frosch_up_2027","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_glk_3"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_kuche_semi":{"id":"winterthur-schaffhausen_kuche_semi","code":"KüChe-Semi","org":"Cevi Region Winterthur-Schaffhausen","title":"KüChe-Semi","category":"Optionale Sonderkurse","minAge":16,"recommendedAge":16,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_glk_3"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_nolk_2027":{"id":"winterthur-schaffhausen_nolk_2027","code":"NOLK","org":"Cevi Schweiz","title":"NOLK","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_glk_3"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_seil_semi":{"id":"winterthur-schaffhausen_seil_semi","code":"Seil-Semi","org":"Cevi Region Winterthur-Schaffhausen","title":"Seil-Semi","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_glk_3"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_j_s_expert_innenkurs_2027":{"id":"winterthur-schaffhausen_j_s_expert_innenkurs_2027","code":"Expert","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["winterthur-schaffhausen_llk","winterthur-schaffhausen_glk_3"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"winterthur-schaffhausen_j_s_coachkurs_2027":{"id":"winterthur-schaffhausen_j_s_coachkurs_2027","code":"Coach","org":"Cevi Schweiz","title":"J+S-Coachkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["winterthur-schaffhausen_llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"winterthur-schaffhausen_glk_3":{"id":"winterthur-schaffhausen_glk_3","code":"WS15-26","org":"Cevi Region Winterthur-Schaffhausen","title":"GLK 3","category":"J+S-Zertifizierung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_m_glk_2"],"requiredQualifications":[],"grantsQualifications":["js_leiter_lst"]},"winterthur-schaffhausen_modul_fortbildung_expert_in_module_de_pe":{"id":"winterthur-schaffhausen_modul_fortbildung_expert_in_module_de_pe","code":"CH208298","org":"Externe Kurse","title":"Modul Fortbildung Expert*in","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"winterthur-schaffhausen_modul_fortbildung_expert_in_slrg_module":{"id":"winterthur-schaffhausen_modul_fortbildung_expert_in_slrg_module","code":"CH215067","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_j_s_expert_innenkurs_2027","winterthur-schaffhausen_mf_wasser_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"winterthur-schaffhausen_modul_fortbildung_expert_in_slrg_wk_modu":{"id":"winterthur-schaffhausen_modul_fortbildung_expert_in_slrg_wk_modu","code":"CH215068","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_j_s_expert_innenkurs_2027","winterthur-schaffhausen_modul_fortbildung_expert_in_slrg_module"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"winterthur-schaffhausen_modul_fortbildung_expert_in_im_sicherhei":{"id":"winterthur-schaffhausen_modul_fortbildung_expert_in_im_sicherhei","code":"CH215071","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_j_s_expert_innenkurs_2027","winterthur-schaffhausen_js_modul_sibe_berg_2026"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"winterthur-schaffhausen_modul_fortbildung_expert_in_im_sicherhei_2":{"id":"winterthur-schaffhausen_modul_fortbildung_expert_in_im_sicherhei_2","code":"CH215066","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_j_s_expert_innenkurs_2027","winterthur-schaffhausen_sibe_wasser_modul"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"winterthur-schaffhausen_modul_fortbildung_expert_in_im_sicherhei_3":{"id":"winterthur-schaffhausen_modul_fortbildung_expert_in_im_sicherhei_3","code":"CH215060","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_j_s_expert_innenkurs_2027","winterthur-schaffhausen_pbs_j_s_modul_im_sicherheitsbereich_wint","winterthur-schaffhausen_j_s_modul_im_sicherheitsbereich_winter_2"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"winterthur-schaffhausen_j_s_modul_kulturelle_vielfalt_inklusion":{"id":"winterthur-schaffhausen_j_s_modul_kulturelle_vielfalt_inklusion","code":"CH82-26","org":"Cevi Schweiz","title":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["winterthur-schaffhausen_glk_3","winterthur-schaffhausen_llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"winterthur-schaffhausen_mf_spiel_und_spass_2027":{"id":"winterthur-schaffhausen_mf_spiel_und_spass_2027","code":"WS11-26","org":"Cevi Region Winterthur-Schaffhausen","title":"MF Spiel und Spass","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["winterthur-schaffhausen_glk_3","winterthur-schaffhausen_llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"winterthur-schaffhausen_llk":{"id":"winterthur-schaffhausen_llk","code":"LLK","org":"Cevi Region Winterthur-Schaffhausen","title":"J+S-Modul Lagerleiter*in LS/T","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":["winterthur-schaffhausen_glk_3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_lagerleiter","js_leiter_lst_kinder"]},"winterthur-schaffhausen_j_s_modul_weiterbildung_2027":{"id":"winterthur-schaffhausen_j_s_modul_weiterbildung_2027","code":"CH81-27","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["winterthur-schaffhausen_glk_3"],"requiredQualifications":[],"grantsQualifications":[]},"winterthur-schaffhausen_mf_wasser_2027":{"id":"winterthur-schaffhausen_mf_wasser_2027","code":"WS17-27","org":"Cevi Region Winterthur-Schaffhausen","title":"MF Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_glk_3","winterthur-schaffhausen_llk"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":["slrg_basis_pool","slrg_modul_see"]},"winterthur-schaffhausen_pbs_j_s_modul_im_sicherheitsbereich_wint":{"id":"winterthur-schaffhausen_pbs_j_s_modul_im_sicherheitsbereich_wint","code":"BS552-27","org":"Externe Kurse","title":"PBS: J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["winterthur-schaffhausen_glk_3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"winterthur-schaffhausen_j_s_modul_im_sicherheitsbereich_winter_2":{"id":"winterthur-schaffhausen_j_s_modul_im_sicherheitsbereich_winter_2","code":"CH87-27","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["winterthur-schaffhausen_glk_3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"winterthur-schaffhausen_js_modul_sibe_berg_2026":{"id":"winterthur-schaffhausen_js_modul_sibe_berg_2026","code":"CH86-26","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["winterthur-schaffhausen_glk_3"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"winterthur-schaffhausen_sibe_wasser_modul":{"id":"winterthur-schaffhausen_sibe_wasser_modul","code":"SiBe Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["winterthur-schaffhausen_mf_wasser_2027","winterthur-schaffhausen_glk_3"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"bern":{"bern_j_s_leiter_innen_kurs_lk":{"id":"bern_j_s_leiter_innen_kurs_lk","code":"BE20-27","org":"Cevi Region Bern","title":"J+S-Leiter*innen Kurs (LK)","category":"Ausbildung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"bern_potenzial_13":{"id":"bern_potenzial_13","code":"Potenzial 13","org":"Cevi Region Bern","title":"Potenzial 13","category":"Optionale Sonderkurse","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_frosch_up_2027":{"id":"bern_frosch_up_2027","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_grundkurs_gk":{"id":"bern_grundkurs_gk","code":"GK","org":"Cevi Region Bern","title":"Grundkurs","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_iku_film_foto":{"id":"bern_iku_film_foto","code":"IKU Film & Foto","org":"Cevi Region Bern","title":"IKU Film & Foto","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_iku_erste_hilfe_im_jungschi_alltag":{"id":"bern_iku_erste_hilfe_im_jungschi_alltag","code":"IKU Erste Hilfe","org":"Cevi Region Bern","title":"IKU Erste Hilfe im Jungschi-Alltag","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_gruppenleitendenkurs_glk":{"id":"bern_gruppenleitendenkurs_glk","code":"GLK","org":"Cevi Region Bern","title":"Gruppenleitendenkurs","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_nolk_2027":{"id":"bern_nolk_2027","code":"NOLK","org":"Cevi Schweiz","title":"NOLK","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_j_s_expert_innenkurs_2027":{"id":"bern_j_s_expert_innenkurs_2027","code":"Expert","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["bern_j_s_lagerleiter_innen_modul_llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"bern_j_s_coachkurs_2027":{"id":"bern_j_s_coachkurs_2027","code":"Coach","org":"Cevi Schweiz","title":"J+S-Coachkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["bern_j_s_lagerleiter_innen_modul_llm"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"bern_j_s_mf_coach":{"id":"bern_j_s_mf_coach","code":"BE22-27","org":"Cevi Region Bern","title":"J+S MF Coach","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["bern_j_s_coachkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"bern_modul_fortbildung_expert_in_module_de_pe":{"id":"bern_modul_fortbildung_expert_in_module_de_pe","code":"CH208298","org":"Externe Kurse","title":"Modul Fortbildung Expert*in","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["bern_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"bern_modul_fortbildung_expert_in_slrg_module":{"id":"bern_modul_fortbildung_expert_in_slrg_module","code":"CH215067","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["bern_j_s_expert_innenkurs_2027","bern_slrg_modul_see_wk_see"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"bern_modul_fortbildung_expert_in_slrg_wk_modu":{"id":"bern_modul_fortbildung_expert_in_slrg_wk_modu","code":"CH215068","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["bern_j_s_expert_innenkurs_2027","bern_modul_fortbildung_expert_in_slrg_module"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"bern_modul_fortbildung_expert_in_im_sicherhei":{"id":"bern_modul_fortbildung_expert_in_im_sicherhei","code":"CH215071","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["bern_j_s_expert_innenkurs_2027","bern_js_modul_sibe_berg_2026"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"bern_modul_fortbildung_expert_in_im_sicherhei_2":{"id":"bern_modul_fortbildung_expert_in_im_sicherhei_2","code":"CH215066","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["bern_j_s_expert_innenkurs_2027","bern_sibe_wasser_modul"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"bern_modul_fortbildung_expert_in_im_sicherhei_3":{"id":"bern_modul_fortbildung_expert_in_im_sicherhei_3","code":"CH215060","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["bern_j_s_expert_innenkurs_2027","bern_pbs_j_s_modul_im_sicherheitsbereich_wint","bern_j_s_modul_im_sicherheitsbereich_winter_2"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"bern_outdoortech_sarasani_und_seiltechnikkurs":{"id":"bern_outdoortech_sarasani_und_seiltechnikkurs","code":"OT-25-27","org":"Cevi Region Bern, Externe Kurse","title":"Outdoortech Sarasani und Seiltechnikkurs","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"bern_j_s_modul_kulturelle_vielfalt_inklusion":{"id":"bern_j_s_modul_kulturelle_vielfalt_inklusion","code":"CH82-26","org":"Cevi Schweiz","title":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"bern_j_s_lagerleiter_innen_modul_llm":{"id":"bern_j_s_lagerleiter_innen_modul_llm","code":"BE23-27","org":"Cevi Region Bern","title":"J+S Lagerleiter*innen Modul (LLM)","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"bern_j_s_modul_weiterbildung_2027":{"id":"bern_j_s_modul_weiterbildung_2027","code":"CH81-27","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_j_s_modul_umwelt_und_natur":{"id":"bern_j_s_modul_umwelt_und_natur","code":"BE13-27","org":"Cevi Region Bern","title":"J+S Modul 'Umwelt und Natur'","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_j_s_modul_berg_winter":{"id":"bern_j_s_modul_berg_winter","code":"BE11-27","org":"Cevi Region Bern","title":"J+S Modul 'Berg/Winter'","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":[]},"bern_pbs_j_s_modul_im_sicherheitsbereich_wint":{"id":"bern_pbs_j_s_modul_im_sicherheitsbereich_wint","code":"BS552-27","org":"Externe Kurse","title":"PBS: J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"bern_j_s_modul_im_sicherheitsbereich_winter_2":{"id":"bern_j_s_modul_im_sicherheitsbereich_winter_2","code":"CH87-27","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"bern_slrg_brevet_basis_pool":{"id":"bern_slrg_brevet_basis_pool","code":"BE31-27","org":"Cevi Region Bern","title":"SLRG Brevet Basis Pool","category":"Sicherheit","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":[],"grantsQualifications":["slrg_basis_pool"]},"bern_slrg_modul_see_wk_see":{"id":"bern_slrg_modul_see_wk_see","code":"BE34-27","org":"Cevi Region Bern","title":"SLRG Modul See & WK See","category":"Sicherheit","minAge":16,"recommendedAge":16,"prerequisites":["bern_slrg_brevet_basis_pool"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_basis_pool","slrg_plus_pool"],"grantsQualifications":["slrg_modul_see"]},"bern_js_modul_sibe_berg_2026":{"id":"bern_js_modul_sibe_berg_2026","code":"CH86-26","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["bern_j_s_leiter_innen_kurs_lk"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"bern_sibe_wasser_modul":{"id":"bern_sibe_wasser_modul","code":"SiBe Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["bern_slrg_modul_see_wk_see"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"ostschweiz":{"ostschweiz_j_s_leiter_innenkurs_2027":{"id":"ostschweiz_j_s_leiter_innenkurs_2027","code":"OS2027-4","org":"Cevi Ostschweiz","title":"J+S Leiter*innenkurs","category":"Ausbildung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_grundkurs_2027":{"id":"ostschweiz_grundkurs_2027","code":"Grundkurs","org":"Cevi Ostschweiz","title":"Grundkurs","category":"Optionale Sonderkurse","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_nau_hau_2027":{"id":"ostschweiz_nau_hau_2027","code":"Nau Hau","org":"Cevi Ostschweiz","title":"Nau Hau","category":"Optionale Sonderkurse","minAge":13,"recommendedAge":13,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_impulsprogramm_2026":{"id":"ostschweiz_impulsprogramm_2026","code":"Impulsprogramm","org":"Cevi Ostschweiz","title":"Impulsprogramm","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_frosch_up_2027":{"id":"ostschweiz_frosch_up_2027","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_leiter_innentraining_2027":{"id":"ostschweiz_leiter_innentraining_2027","code":"Leiter*innentraining","org":"Cevi Ostschweiz","title":"Leiter*innentraining","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_gruppenleiter_innenkurs_2027":{"id":"ostschweiz_gruppenleiter_innenkurs_2027","code":"Gruppenleiter*innenkurs","org":"Cevi Ostschweiz","title":"Gruppenleiter*innenkurs","category":"Optionale Sonderkurse","minAge":16,"recommendedAge":16,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_nolk_2027":{"id":"ostschweiz_nolk_2027","code":"NOLK","org":"Cevi Schweiz","title":"NOLK","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_seilbahnausbildung_2027":{"id":"ostschweiz_seilbahnausbildung_2027","code":"Seilbahnausbildung","org":"Cevi Ostschweiz","title":"Seilbahnausbildung","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_voila_tg_weiterbildungsabend":{"id":"ostschweiz_voila_tg_weiterbildungsabend","code":"Voilà TG Weiterbildungsabend","org":"Cevi Ostschweiz","title":"Voilà TG Weiterbildungsabend","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_j_s_expert_innenkurs_2027":{"id":"ostschweiz_j_s_expert_innenkurs_2027","code":"Expert","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["ostschweiz_j_s_modul_lager_hauptleiten_2027","ostschweiz_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"ostschweiz_j_s_coachkurs_2027":{"id":"ostschweiz_j_s_coachkurs_2027","code":"Coach","org":"Cevi Schweiz","title":"J+S-Coachkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["ostschweiz_j_s_modul_lager_hauptleiten_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"ostschweiz_glk3_fa_2027":{"id":"ostschweiz_glk3_fa_2027","code":"GLK3","org":"Cevi Region Zürich, Cevi Ostschweiz","title":"GLK3 Fa","category":"J+S-Zertifizierung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_j_s_leiter_innenkurs_2027"],"requiredQualifications":[],"grantsQualifications":["js_leiter_lst"]},"ostschweiz_modul_fortbildung_expert_in_module_de_pe":{"id":"ostschweiz_modul_fortbildung_expert_in_module_de_pe","code":"CH208298","org":"Externe Kurse","title":"Modul Fortbildung Expert*in","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"ostschweiz_j_s_mf_coach_2027":{"id":"ostschweiz_j_s_mf_coach_2027","code":"OS2027-5","org":"Cevi Ostschweiz","title":"J+S MF Coach","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["ostschweiz_j_s_coachkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"ostschweiz_modul_fortbildung_expert_in_slrg_module":{"id":"ostschweiz_modul_fortbildung_expert_in_slrg_module","code":"CH215067","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"ostschweiz_modul_fortbildung_expert_in_slrg_wk_modu":{"id":"ostschweiz_modul_fortbildung_expert_in_slrg_wk_modu","code":"CH215068","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_j_s_expert_innenkurs_2027","ostschweiz_modul_fortbildung_expert_in_slrg_module"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"ostschweiz_modul_fortbildung_expert_in_im_sicherhei":{"id":"ostschweiz_modul_fortbildung_expert_in_im_sicherhei","code":"CH215071","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_j_s_expert_innenkurs_2027","ostschweiz_js_modul_sibe_berg_2026"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"ostschweiz_modul_fortbildung_expert_in_im_sicherhei_2":{"id":"ostschweiz_modul_fortbildung_expert_in_im_sicherhei_2","code":"CH215066","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_j_s_expert_innenkurs_2027","ostschweiz_sibe_wasser_modul"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"ostschweiz_modul_fortbildung_expert_in_im_sicherhei_3":{"id":"ostschweiz_modul_fortbildung_expert_in_im_sicherhei_3","code":"CH215060","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_j_s_expert_innenkurs_2027","ostschweiz_pbs_j_s_modul_im_sicherheitsbereich_wint","ostschweiz_j_s_modul_im_sicherheitsbereich_winter_2"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"ostschweiz_j_s_modul_kulturelle_vielfalt_inklusion":{"id":"ostschweiz_j_s_modul_kulturelle_vielfalt_inklusion","code":"CH82-26","org":"Cevi Schweiz","title":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":["ostschweiz_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"ostschweiz_j_s_modul_lager_hauptleiten_2027":{"id":"ostschweiz_j_s_modul_lager_hauptleiten_2027","code":"OS2027-3","org":"Cevi Ostschweiz","title":"J+S Modul Lager hauptleiten","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"ostschweiz_j_s_modul_weiterbildung_2027":{"id":"ostschweiz_j_s_modul_weiterbildung_2027","code":"CH81-27","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["ostschweiz_glk3_fa_2027"],"requiredQualifications":[],"grantsQualifications":[]},"ostschweiz_pbs_j_s_modul_im_sicherheitsbereich_wint":{"id":"ostschweiz_pbs_j_s_modul_im_sicherheitsbereich_wint","code":"BS552-27","org":"Externe Kurse","title":"PBS: J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["ostschweiz_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"ostschweiz_j_s_modul_im_sicherheitsbereich_winter_2":{"id":"ostschweiz_j_s_modul_im_sicherheitsbereich_winter_2","code":"CH87-27","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["ostschweiz_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"ostschweiz_js_modul_sibe_berg_2026":{"id":"ostschweiz_js_modul_sibe_berg_2026","code":"CH86-26","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":["ostschweiz_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"ostschweiz_sibe_wasser_modul":{"id":"ostschweiz_sibe_wasser_modul","code":"SiBe Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["ostschweiz_glk3_fa_2027"],"recommendedPrerequisites":[],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}},"agsoluzg":{"agsoluzg_gruppenleiterkurs_glk_3_13_2027":{"id":"agsoluzg_gruppenleiterkurs_glk_3_13_2027","code":"AG40-27","org":"Cevi Regionalverband AGSOLUZG","title":"Gruppenleiterkurs GLK (3.13)","category":"Ausbildung","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":[],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_frosch_up_2027":{"id":"agsoluzg_frosch_up_2027","code":"Frösch-Up","org":"Cevi Schweiz","title":"Frösch-Up","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_gku_grundlagenkurs_a_1_13_2027":{"id":"agsoluzg_gku_grundlagenkurs_a_1_13_2027","code":"GKU A","org":"Cevi Regionalverband AGSOLUZG","title":"Grundlagenkurs A","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_grundlagenkurs_gku_b_1_27_2027":{"id":"agsoluzg_grundlagenkurs_gku_b_1_27_2027","code":"GKB","org":"Cevi Regionalverband AGSOLUZG","title":"Grundlagenkurs B","category":"Optionale Sonderkurse","minAge":14,"recommendedAge":14,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_modul_sanitat_2_31_2027":{"id":"agsoluzg_modul_sanitat_2_31_2027","code":"Modul Sanität","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Sanität","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_modul_pionier_2_32_2027":{"id":"agsoluzg_modul_pionier_2_32_2027","code":"Modul Pionier","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Pionier","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_modul_programmplanung_und_rollenspiel_2":{"id":"agsoluzg_modul_programmplanung_und_rollenspiel_2","code":"Modul Programmplanung und Rollenspiel","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Programmplanung und Rollenspiel","category":"Optionale Sonderkurse","minAge":15,"recommendedAge":15,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_nolk_2027":{"id":"agsoluzg_nolk_2027","code":"NOLK","org":"Cevi Schweiz","title":"NOLK","category":"Optionale Sonderkurse","minAge":17,"recommendedAge":17,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_j_s_expert_innenkurs_2027":{"id":"agsoluzg_j_s_expert_innenkurs_2027","code":"Expert","org":"Cevi Schweiz","title":"J+S-Expert*innenkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["agsoluzg_lagerleitermodul_llm_4_14_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter","js_leiter_lst"],"grantsQualifications":["js_experte_lst"]},"agsoluzg_j_s_coachkurs_2027":{"id":"agsoluzg_j_s_coachkurs_2027","code":"Coach","org":"Cevi Schweiz","title":"J+S-Coachkurs","category":"J+S-Module","minAge":20,"recommendedAge":20,"prerequisites":["agsoluzg_lagerleitermodul_llm_4_14_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_lagerleiter"],"grantsQualifications":["js_coach"]},"agsoluzg_modul_fortbildung_fur_j_s_coaches_2027":{"id":"agsoluzg_modul_fortbildung_fur_j_s_coaches_2027","code":"AG42-27","org":"Cevi Regionalverband AGSOLUZG","title":"Modul Fortbildung für J+S-Coaches","category":"Auffrischung","minAge":21,"recommendedAge":21,"prerequisites":["agsoluzg_j_s_coachkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_coach"],"grantsQualifications":[]},"agsoluzg_modul_fortbildung_expert_in_module_de_pe":{"id":"agsoluzg_modul_fortbildung_expert_in_module_de_pe","code":"CH208298","org":"Externe Kurse","title":"Modul Fortbildung Expert*in","category":"Auffrischung","minAge":0,"recommendedAge":0,"prerequisites":["agsoluzg_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst"],"grantsQualifications":[]},"agsoluzg_modul_fortbildung_expert_in_slrg_module":{"id":"agsoluzg_modul_fortbildung_expert_in_slrg_module","code":"CH215067","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["agsoluzg_j_s_expert_innenkurs_2027"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_plus_pool","slrg_bls_aed","slrg_modul_see"],"grantsQualifications":["slrg_experte_pool","slrg_experte_see"]},"agsoluzg_modul_fortbildung_expert_in_slrg_wk_modu":{"id":"agsoluzg_modul_fortbildung_expert_in_slrg_wk_modu","code":"CH215068","org":"Externe Kurse","title":"Modul Fortbildung Expert*in - SLRG WK","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["agsoluzg_j_s_expert_innenkurs_2027","agsoluzg_modul_fortbildung_expert_in_slrg_module"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","slrg_bls_aed","slrg_experte_pool","slrg_experte_see"],"grantsQualifications":[]},"agsoluzg_modul_fortbildung_expert_in_im_sicherhei":{"id":"agsoluzg_modul_fortbildung_expert_in_im_sicherhei","code":"CH215071","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Berg","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["agsoluzg_j_s_expert_innenkurs_2027","agsoluzg_js_modul_sibe_berg_2026"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_berg"],"grantsQualifications":["js_experte_sec_berg"]},"agsoluzg_modul_fortbildung_expert_in_im_sicherhei_2":{"id":"agsoluzg_modul_fortbildung_expert_in_im_sicherhei_2","code":"CH215066","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["agsoluzg_j_s_expert_innenkurs_2027","agsoluzg_sibe_wasser_modul"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_wasser"],"grantsQualifications":["js_experte_sec_wasser"]},"agsoluzg_modul_fortbildung_expert_in_im_sicherhei_3":{"id":"agsoluzg_modul_fortbildung_expert_in_im_sicherhei_3","code":"CH215060","org":"Externe Kurse","title":"Modul Fortbildung Expert*in im Sicherheitsbereich Winter","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":["agsoluzg_j_s_expert_innenkurs_2027","agsoluzg_pbs_j_s_modul_im_sicherheitsbereich_wint","agsoluzg_j_s_modul_im_sicherheitsbereich_winter_2"],"recommendedPrerequisites":[],"requiredQualifications":["js_experte_lst","js_sec_winter"],"grantsQualifications":["js_experte_sec_winter"]},"agsoluzg_j_s_modul_kulturelle_vielfalt_inklusion":{"id":"agsoluzg_j_s_modul_kulturelle_vielfalt_inklusion","code":"CH82-26","org":"Cevi Schweiz","title":"J+S-Modul kulturelle Vielfalt & Inklusion im Jugendverband","category":"Auffrischung","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":["js_leiter_lst","js_leiter_lst_kinder"],"grantsQualifications":[]},"agsoluzg_lagerleitermodul_llm_4_14_2027":{"id":"agsoluzg_lagerleitermodul_llm_4_14_2027","code":"AG43-27","org":"Cevi Regionalverband AGSOLUZG","title":"Lagerleitermodul LLM  (4.14)","category":"J+S-Module","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":["js_lagerleiter"]},"agsoluzg_j_s_modul_weiterbildung_2027":{"id":"agsoluzg_j_s_modul_weiterbildung_2027","code":"CH81-27","org":"Cevi Schweiz","title":"J+S-Modul Weiterbildung","category":"Optionale Sonderkurse","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":[],"grantsQualifications":[]},"agsoluzg_pbs_j_s_modul_im_sicherheitsbereich_wint":{"id":"agsoluzg_pbs_j_s_modul_im_sicherheitsbereich_wint","code":"BS552-27","org":"Externe Kurse","title":"PBS: J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"agsoluzg_j_s_modul_im_sicherheitsbereich_winter_2":{"id":"agsoluzg_j_s_modul_im_sicherheitsbereich_winter_2","code":"CH87-27","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Winter","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_winter"]},"agsoluzg_js_modul_sibe_berg_2026":{"id":"agsoluzg_js_modul_sibe_berg_2026","code":"CH86-26","org":"Cevi Schweiz","title":"J+S-Modul im Sicherheitsbereich Berg","category":"Sicherheit","minAge":18,"recommendedAge":18,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":["js_leiter_lst"],"grantsQualifications":["js_sec_berg"]},"agsoluzg_sibe_wasser_modul":{"id":"agsoluzg_sibe_wasser_modul","code":"SiBe Wasser","org":"Pfadi/Cevi/Jubla (extern, wassermodul.ch)","title":"J+S-Sicherheitsmodul Wasser","category":"Sicherheit","minAge":0,"recommendedAge":0,"prerequisites":[],"recommendedPrerequisites":["agsoluzg_gruppenleiterkurs_glk_3_13_2027"],"requiredQualifications":["slrg_modul_see","slrg_plus_pool","js_leiter_lst"],"grantsQualifications":["js_sec_wasser","slrg_modul_fluss"]}}};
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
