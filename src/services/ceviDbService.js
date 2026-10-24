import { envConfig } from '../config/env.js';
import { COURSE_NODES } from '../domain/courseTreeData.js';
import { courseTreeEngine } from '../domain/courseTreeEngine.js';

// Hitobito (Graphiti) liefert Listen seitenweise; eine kürzere Seite ist die letzte.
// Die Obergrenze schützt die Cevi-DB, falls sie page[number] einmal ignoriert.
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
// Testkurse sind erfunden: der Anmeldelink führt auf das echte Kursangebot
const DEMO_REGISTRATION_URL = 'https://ceviregionzuerich.ch/kurse';
// Kürzel der Kurse klein und ohne Leerzeichen («glk1», «al-semi»), so wie sie in den Anlassnamen stehen
const COURSE_CODES = new Map(Object.values(COURSE_NODES).map(node => [node.code.toLowerCase().replace(/\s+/g, ''), node.id]));
// Kurs im Baum, den eine Anerkennung belegt. Die Teilnahmen an Kursen von Cevi ZH und CH sieht der Service-Token nicht, die Anerkennungen schon.
// shortcut: J+S-Kursleiter*in, SLRG Modul See, Seilbahn, Spoiz und Mira haben keinen Kurs im Baum; ergänzen, sobald geklärt
const QUALIFICATION_COURSES = [
  [/j\+s-lagerleiter/i, 'llm'],
  [/j\+s-coach/i, 'js_coach'],
  [/j\+s-expert/i, 'experte'],
  [/sibe berg/i, 'sec_berg'],
  [/sibe wasser/i, 'sec_wasser'],
  [/sibe winter/i, 'sec_winter'],
  [/slrg brevet basis pool/i, 'slrg_pool']
];

/**
 * Cevi-DB (Hitobito) API & OAuth2 Service
 *
 * Basierend auf der offiziellen CeviWiki Dokumentation:
 * https://wiki.cevi.ch/index.php/Cevi.DB_API
 *
 * WICHTIG (Vorbereitungsmodus):
 * Die offizielle OAuth2-Applikation muss erst bei der Cevi.DB Steuergruppe
 * (cevidb@cevi.ch) eingerichtet werden. Bis dahin läuft dieser Service
 * standardmässig im "Vorbereitungsmodus (Simulation/Mock)", damit Kurstracker
 * ohne Unterbrüche entwickelt und getestet werden kann.
 *
 * Neben OAuth2 unterstützt die Cevi.DB auch Service-Tokens (API-Keys),
 * welche von Abteilungsleitern auf der Ortsgruppe erstellt werden können:
 * https://db.cevi.ch/groups/GRUPPENID/service_tokens (Header: X-Token)
 */
export class CeviDbService {
  constructor(config = envConfig.ceviDb) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes;
    this.serviceToken = config.serviceToken || '';
    this.preparationMode = config.preparationMode !== false;
  }

  /**
   * Prüft, ob der Service im Vorbereitungsmodus (Simulation) läuft
   * @returns {boolean}
   */
  isPreparationMode() {
    return this.preparationMode;
  }

  /**
   * Testdaten nur im Vorbereitungsmodus oder für die automatische Demo-Session (ohne echtes Token)
   * @param {string} [accessToken]
   * @returns {boolean}
   */
  usesMockData(accessToken) {
    return this.isPreparationMode() || !accessToken || accessToken.startsWith('mock_token');
  }

  /**
   * Kurse kommen mit Service-Token immer live, sonst wie die Personendaten (usesMockData)
   * @param {string} [accessToken]
   * @returns {boolean}
   */
  usesMockCourses(accessToken) {
    return !this.serviceToken && this.usesMockData(accessToken);
  }

  /**
   * Holt eine Liste von der Cevi-DB (JSON:API), Seite für Seite, und flacht `attributes` ab.
   * Mitgeladene Beziehungen (`include=`, auch verschachtelt wie `a.b`) hängen aufgelöst unter ihrem Namen am Eintrag.
   * Wirft bei Fehlern, damit nie Testdaten als echte Daten erscheinen.
   * @param {string} apiPath
   * @param {string} [accessToken] - ohne Token gilt der Service-Token (X-Token)
   * @returns {Promise<Array>}
   */
  async fetchList(apiPath, accessToken) {
    const list = [];
    const separator = apiPath.includes('?') ? '&' : '?';

    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await fetch(`${this.baseUrl}${apiPath}${separator}page[size]=${PAGE_SIZE}&page[number]=${page}`, {
        headers: this.getHeaders(accessToken)
      });

      if (!response.ok) {
        const error = new Error(`Cevi-DB Abruf fehlgeschlagen (${response.status}): ${apiPath}`);
        error.status = response.status === 401 ? 401 : 502;
        throw error;
      }

      const data = await response.json();
      const items = Array.isArray(data.data || data) ? (data.data || data) : [];
      const included = new Map((data.included || []).map(i => [`${i.type}:${i.id}`, { id: i.id, ...i.attributes }]));
      const resolve = ref => included.get(`${ref.type}:${ref.id}`);
      const link = (entry, item) => {
        for (const [name, relation] of Object.entries(item.relationships || {})) {
          if (Array.isArray(relation?.data)) entry[name] = relation.data.map(resolve).filter(Boolean);
          else if (relation?.data) entry[name] = resolve(relation.data);
        }
        return entry;
      };
      for (const item of data.included || []) link(included.get(`${item.type}:${item.id}`), item);

      for (const item of items) {
        list.push(item.attributes ? link({ id: item.id, ...item.attributes }, item) : item);
      }

      if (items.length < PAGE_SIZE) break;
    }
    return list;
  }

  /**
   * Liefert standardisierte JSON:API Header für Cevi.DB / Hitobito
   * @param {string} [token] - Optionales OAuth Bearer Token oder Service Token
   */
  getHeaders(token) {
    const headers = {
      'Accept': 'application/vnd.api+json, application/json',
      'Content-Type': 'application/vnd.api+json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (this.serviceToken) {
      // Gemäss CeviWiki: Header "X-Token" für Gruppen-Service-Tokens
      headers['X-Token'] = this.serviceToken;
    }

    return headers;
  }

  /**
   * Generiert die OAuth 2.0 Autorisierungs-URL für den Cevi-DB Login
   * @param {string} state - CSRF Token
   * @returns {string} Vollständige Redirect-URL zu db.cevi.ch oder lokaler Mock
   */
  getAuthorizationUrl(state = 'cevi_auth_state') {
    // Im Vorbereitungsmodus oder Mock-Modus wird auf den lokalen Sandbox-Login verwiesen,
    // um Fehlermeldungen wegen nicht registrierter OAuth-Clients auf db.cevi.ch zu verhindern!
    if (this.isPreparationMode()) {
      return `/api/auth/mock-login?state=${encodeURIComponent(state)}`;
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes,
      state: state
    });

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Tauscht den Authorization Code gegen ein Access Token ein
   * @param {string} code - Der von Cevi-DB empfangene Code
   * @returns {Promise<{ access_token: string, token_type: string, expires_in: number, refresh_token?: string }>}
   */
  async exchangeCodeForToken(code) {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cevi-DB Token Exchange fehlgeschlagen (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Ruft die Benutzerinformationen des angemeldeten Cevi-Mitglieds ab
   * @param {string} accessToken
   * @returns {Promise<object>}
   */
  async getUserInfo(accessToken) {
    const response = await fetch(`${this.baseUrl}/oauth/userinfo`, {
      headers: this.getHeaders(accessToken)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cevi-DB Userinfo Abruf fehlgeschlagen (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Ruft die laufenden und kommenden Kursanlässe ab (Event::Course) und ordnet sie den Kursen im Baum zu.
   * Kursdaten sind keine Personendaten: mit Service-Token (X-Token) kommen sie live,
   * auch im Vorbereitungsmodus und ohne OAuth-Login (#11).
   * @param {string} [accessToken]
   * @returns {Promise<Array>}
   */
  async getCourses(accessToken) {
    if (this.usesMockCourses(accessToken)) {
      return this.getMockCourses();
    }
    const today = new Date().toISOString().slice(0, 10);
    // shortcut: kein Cache, jeder Seitenaufruf fragt die Cevi-DB ab; bei vielen Nutzenden die Kursliste serverseitig zwischenspeichern
    const events = await this.fetchList(
      `/api/events?filter[type]=Event::Course&filter[after_or_on]=${today}&include=dates,kind`,
      this.serviceToken ? undefined : accessToken
    );
    return events.map(event => this.toCourse(event, today));
  }

  /**
   * Bildet einen Kursanlass der Cevi-DB auf die Felder der Testkurse ab.
   * Den Kurs im Baum bestimmt courseNodeIdFor.
   * @param {object} event - Eintrag aus fetchList mit `dates` und `kind`
   * @param {string} today - YYYY-MM-DD
   * @returns {object}
   */
  toCourse(event, today) {
    const dates = [...(event.dates || [])].sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    const last = dates.at(-1);
    const nodeId = this.courseNodeIdFor(event);
    const node = nodeId ? COURSE_NODES[nodeId] : null;
    const deadline = event.application_closing_at || '';

    return {
      id: String(event.id),
      course_node_id: node ? nodeId : null,
      title: event.name || '',
      code: event.number || event.kind?.short_name || '',
      category: node?.category || event.kind?.label || '',
      // Die Cevi-DB nennt nur Gruppen-IDs, keinen Namen; das Kursangebot blendet die leere Zeile aus
      organizer: '',
      location: event.location || dates[0]?.location || '',
      start_date: String(dates[0]?.start_at || '').slice(0, 10),
      end_date: String(last?.finish_at || last?.start_at || '').slice(0, 10),
      registration_deadline: deadline,
      status: deadline && deadline < today ? 'Anmeldeschluss vorbei' : 'Offen für Anmeldung',
      description: event.description || '',
      free_places: event.maximum_participants ? Math.max(0, event.maximum_participants - (event.participant_count || 0)) : null,
      // Anlassseite der Cevi-DB: angemeldete Mitglieder melden sich dort an
      registration_url: `${this.baseUrl}/groups/${event.group_ids?.[0]}/events/${event.id}`
    };
  }

  /**
   * Kurs im Baum zu einem Anlass: das Kürzel der Kursart, sonst ein Kürzel im Anlassnamen.
   * Live ist das Kürzel der Kursart fast immer leer; GLK1, HEKU, SLK usw. stehen nur im Namen («GLK3 Fb+Mb 2027»).
   * @param {object} event - Anlass aus fetchList, mit `kind`, falls mitgeladen
   * @returns {string|null} ID im Baum
   */
  courseNodeIdFor(event) {
    const words = String(event.name || '').toLowerCase().split(/[\s(),/]+/).filter(Boolean);
    // Wortpaare zuerst: «GLK 1» ist GLK 1, nicht das Alias «glk» (GLK 3)
    const candidates = [event.kind?.short_name, ...words.flatMap((word, i) => [word + (words[i + 1] || ''), word])];
    for (const candidate of candidates) {
      const code = String(candidate || '').toLowerCase().replace(/\s+/g, '');
      const id = COURSE_CODES.get(code) || courseTreeEngine.resolveCourseId(code);
      if (Object.hasOwn(COURSE_NODES, id)) return id;
    }
    return null;
  }

  /**
   * Titel der Kursarten nach ID, für die J+S- und SLRG-Kurse im Baum (applyKindLabels).
   * Der Server lädt sie beim Start, vor jedem Login: nur mit Service-Token, sonst bleibt die Liste leer.
   * @returns {Promise<Map<number, string>>}
   */
  async getKindLabels() {
    if (!this.serviceToken) return new Map();
    const kinds = await this.fetchList('/api/event_kinds?fields[event_kinds]=label');
    // Einzelne Titel enden in der Cevi-DB auf ein Leerzeichen
    return new Map(kinds.map(kind => [Number(kind.id), String(kind.label || '').trim()]));
  }

  /**
   * Mitglieder der Gruppe des Service-Tokens für den Stufenleiter-Planer (#26), in der Form der Demo-Gruppe.
   * Fragt nur ab, was der Planer zeigt: Name, Ceviname, Geschlecht, Geburtstag, Rollen, Kurse und Qualifikationen.
   * Adresse, E-Mail und Telefon bleiben in der Cevi-DB. Mitglied ist, wer eine laufende Rolle ausserhalb einer Externe-Gruppe hat.
   * @returns {Promise<Array>}
   */
  async getGroupMembers() {
    const today = new Date().toISOString().slice(0, 10);
    // shortcut: kein Cache, jeder Planer-Aufruf lädt die ganze Gruppe neu; zwischenspeichern mit #27
    // fields[...] nennt auch die Beziehungen, sonst fehlt die Verknüpfung zu den mitgeladenen Einträgen
    const people = await this.fetchList('/api/people?include=roles,qualifications.qualification_kind,event_participations.event.dates'
      + '&fields[people]=first_name,last_name,nickname,gender,birthday,roles,qualifications,event_participations'
      + '&fields[roles]=name,type,start_on,end_on&fields[qualifications]=finish_at,qualification_kind'
      + '&fields[event_participations]=active,event');

    return people.map(person => {
      // Rollen in Externe-Gruppen (Group::JungscharExterne::Externer, ::Goetti usw.) sind keine Mitgliedschaft (#96)
      const roles = (person.roles || []).filter(r => (!r.start_on || r.start_on <= today) && (!r.end_on || r.end_on >= today)
        && !String(r.type).includes('Externe::'));
      // Bestätigte Teilnahmen an Kursen: vorbei heisst besucht, sonst angemeldet
      const courses = { completed: new Set(), upcoming: new Set() };
      for (const { active, event } of person.event_participations || []) {
        const nodeId = active && event?.type === 'Event::Course' && this.courseNodeIdFor(event);
        if (!nodeId) continue;
        const lastDay = (event.dates || []).map(d => String(d.finish_at || d.start_at).slice(0, 10)).sort().at(-1);
        courses[lastDay < today ? 'completed' : 'upcoming'].add(nodeId);
      }
      // Neueste Anerkennung zuerst: der Planer prüft die erste J+S-Leiteranerkennung auf ihren Verfall
      // Nur LS/T (Lagersport/Trekking) kommt aus dem GLK 3, z. B. «J+S-Leiter/-in Jugend LS/T», nicht J+S-Kindersport
      const qualifications = (person.qualifications || [])
        .map(q => ({ label: q.qualification_kind?.label || '', validUntil: q.finish_at || null }))
        .sort((a, b) => (b.validUntil || '9999').localeCompare(a.validUntil || '9999'))
        .map(q => ({ id: /j\+s/i.test(q.label) && /leiter/i.test(q.label) && /ls\/t/i.test(q.label) ? 'js_leiter_lst' : q.label, ...q }));
      for (const { id, label } of qualifications) {
        if (id === 'js_leiter_lst') courses.completed.add('glk3');
        for (const [pattern, nodeId] of QUALIFICATION_COURSES) if (pattern.test(label)) courses.completed.add(nodeId);
      }

      return {
        id: person.id,
        name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
        ceviname: person.nickname || person.first_name || '',
        gender: person.gender,
        birthdate: person.birthday,
        currentRole: [...new Set(roles.map(r => r.name))].join(', '),
        completedCourses: [...courses.completed],
        inProgressCourses: [...courses.upcoming],
        qualifications
      };
    }).filter(member => member.currentRole);
  }

  /**
   * Ruft die Kursteilnahmen und den Ausbildungsstatus des Benutzers ab
   * @param {string} [accessToken]
   * @param {string} [personId]
   */
  async getUserParticipations(accessToken, personId) {
    if (this.usesMockData(accessToken)) {
      return this.getMockParticipations();
    }
    const filter = personId ? `?filter[person_id]=${encodeURIComponent(personId)}` : '';
    return this.fetchList(`/api/event_participations${filter}`, accessToken);
  }

  /**
   * Ruft die J+S und Cevi Qualifikationen des Benutzers ab
   * @param {string} [accessToken]
   * @param {string} [personId]
   */
  async getUserQualifications(accessToken, personId) {
    if (this.usesMockData(accessToken)) {
      return this.getMockQualifications();
    }
    const filter = personId ? `?filter[person_id]=${encodeURIComponent(personId)}` : '';
    return this.fetchList(`/api/qualifications${filter}`, accessToken);
  }

  // ===========================================================================
  // MOCK-DATEN FÜR LOKALE ENTWICKLUNG & TESTING
  // ===========================================================================

  getMockUser() {
    return {
      id: 'cevi_user_42819',
      sub: '42819',
      email: 'robin@cevi-muster.ch',
      first_name: 'Robin',
      last_name: 'Notter',
      nickname: 'Siro', // Ceviname / Pfadiname
      gender: 'm',
      birthday: '2001-08-14',
      picture_url: null, // Dynamisch aus Cevi-DB / Hitobito beziehbar
      groups: [
        { id: 104, name: 'Cevi Abteilung Zürcher Oberland', role: 'Abteilungsleiter' },
        { id: 202, name: 'Cevi Regionalverband AG-SO-LU-ZG', role: 'Kursleiter' },
        { id: 1, name: 'Cevi Schweiz', role: 'Mitglied' }
      ],
      roles: ['Abteilungsleiter', 'Kursleiter', 'J+S Leiter LS/T'],
      js_person_id: 'JS-882194-CH'
    };
  }

  getMockCourses() {
    return [
      {
        id: 'kurs-voku-2026',
        course_node_id: 'voku',
        title: 'Vorkurs (Voku)',
        code: 'CEVI-VOKU-26',
        category: 'Jungschar',
        js_type: 'Cevi Einstieg',
        organizer: 'Cevi Region Zürich',
        location: 'Flaach, ZH',
        start_date: '2026-09-19',
        end_date: '2026-09-20',
        registration_deadline: '2026-08-25',
        status: 'Offen für Anmeldung',
        target_group: 'Jugendliche von 12 bis 13 Jahren',
        description: 'Erste Einblicke in die Leitertätigkeit im Cevi. Spiele anleiten, Gruppenstunden unterstützen und Pioniertechnik-Grundlagen.'
      },
      {
        id: 'kurs-heku-2026',
        course_node_id: 'heku',
        title: 'Helfer/-innen-Kurs (Heku)',
        code: 'CEVI-HEKU-26',
        category: 'Jungschar',
        js_type: 'Cevi Hilfsleiter',
        organizer: 'Cevi Region Zürich',
        location: 'Cevi-Zentrum Hasliberg, BE',
        start_date: '2026-10-05',
        end_date: '2026-10-10',
        registration_deadline: '2026-08-31',
        status: 'Offen für Anmeldung',
        target_group: 'Teilnehmende ab 13 Jahren',
        description: 'Vorbereitung auf die Rolle als Gruppenhelfer/in. Vertiefung von Geländespielen, Leitervorbild, Erste Hilfe und Teamgeist.'
      },
      {
        id: 'kurs-glk1-2026',
        course_node_id: 'glk1',
        title: 'Gruppenleiter/-innen-Kurs 1 (GLK 1)',
        code: 'CEVI-GLK1-26',
        category: 'Jungschar',
        js_type: 'Cevi Gruppenleiter 1',
        organizer: 'Cevi Region Zürich',
        location: 'Kyburg, ZH',
        start_date: '2026-10-12',
        end_date: '2026-10-17',
        registration_deadline: '2026-08-31',
        status: 'Offen für Anmeldung',
        target_group: 'Angehende Gruppenleitende ab 14 Jahren',
        description: 'Erste Stufe der Gruppenleiterausbildung. Methodik für Gruppenstunden, Gruppenpsychologie, Programmgestaltung und Leitungsstile.'
      },
      {
        id: 'kurs-glk2-2026',
        course_node_id: 'glk2',
        title: 'Gruppenleiter/-innen-Kurs 2 (GLK 2)',
        code: 'CEVI-GLK2-26',
        category: 'Jungschar',
        js_type: 'Cevi Gruppenleiter 2',
        organizer: 'Cevi Region Zürich',
        location: 'Cevi-Zentrum Hasliberg, BE',
        start_date: '2026-04-18',
        end_date: '2026-04-25',
        registration_deadline: '2026-03-01',
        status: 'Offen für Anmeldung',
        target_group: 'Gruppenleitende ab 15 Jahren',
        description: 'Vertiefung der Gruppenleitung vor dem J+S-Alter. Mehrtägige Unternehmungen, Biwak, Kartenkunde, Orientierung und Gruppendynamik.'
      },
      {
        id: 'kurs-glk3-2026',
        course_node_id: 'glk3',
        title: 'Gruppenleiter/-innen-Kurs 3 (GLK 3)',
        code: 'CEVI-GLK3-26',
        category: 'Jugend+Sport',
        js_type: 'J+S Leiterkurs Lagersport/Trekking Jugendsport',
        organizer: 'Cevi Region Zürich (mit Sportamt Kanton Zürich)',
        location: 'Flaach / Winterthur, ZH',
        start_date: '2026-10-10',
        end_date: '2026-10-17',
        registration_deadline: '2026-08-31',
        free_places: 6,
        status: 'Offen für Anmeldung',
        target_group: 'Leiterinnen und Leiter ab 17 Jahren',
        description: 'Offizieller J+S-Leiterkurs Lagersport/Trekking Jugendsport. Befähigt zur selbstständigen Lagerleitung und Sportprogrammgestaltung.'
      },
      {
        id: 'kurs-slk-2026',
        course_node_id: 'slk',
        title: 'Stufenleiter/-innen-Kurs (SLK)',
        code: 'CEVI-SLK-26',
        category: 'Jungschar',
        js_type: 'Cevi Stufenleiter',
        organizer: 'Cevi Region Zürich',
        location: 'Konolfingen, BE',
        start_date: '2026-11-01',
        end_date: '2026-11-06',
        registration_deadline: '2026-09-15',
        status: 'Offen für Anmeldung',
        target_group: 'Stufenleitende und erfahrene Leiter ab 17 Jahren',
        description: 'Befähigung zur Leitung einer Stufe (Fröschli, Jungschar, Teens). Begleitung und Coaching junger Leitender, Elternarbeit und Jahresprogramm.'
      },
      {
        id: 'kurs-mf-2026',
        course_node_id: 'mf_lst',
        title: 'J+S-Modul Fortbildung (MF)',
        code: 'JS-MF-26-02',
        category: 'Jugend+Sport',
        js_type: 'J+S Modul Fortbildung (2 Jahre Verlängerung)',
        organizer: 'Cevi Region Zürich',
        location: 'Flaach, ZH',
        start_date: '2026-11-21',
        end_date: '2026-11-22',
        registration_deadline: '2026-10-15',
        status: 'Offen für Anmeldung',
        target_group: 'Alle aktiven J+S Leiter zur Pflicht-Verlängerung ab 18 Jahren',
        description: 'Kompakte 2-tägige Weiterbildung zur Verlängerung der J+S Leiteranerkennung um 2 Jahre.'
      },
      {
        id: 'kurs-llm-2026',
        course_node_id: 'llm',
        title: 'Lagerleiter/-innen-Modul (LLM)',
        code: 'JS-LLM-26',
        category: 'Jugend+Sport',
        js_type: 'J+S Lagerleiter Lagersport/Trekking',
        organizer: 'Cevi Schweiz / Sportamt Zürich',
        location: 'Hasliberg, BE',
        start_date: '2026-10-17',
        end_date: '2026-10-23',
        registration_deadline: '2026-08-31',
        status: 'Offen für Anmeldung',
        target_group: 'J+S Leiter mit Lagererfahrung ab 19 Jahren',
        description: 'J+S-Ausbildung zur Gesamtleitung von Lagern. Krisenmanagement, rechtliche Verantwortung, Budgetierung und Abrechnung.'
      },
      {
        id: 'kurs-al-2026',
        course_node_id: 'al_seminar',
        title: 'Abteilungsleiter/-innen-Seminar (AL-Semi)',
        code: 'CEVI-AL-26',
        category: 'Kaderbildung',
        js_type: 'Cevi Abteilungsleiter',
        organizer: 'Cevi Region Zürich',
        location: 'Zürich-City, ZH',
        start_date: '2026-11-14',
        end_date: '2026-11-15',
        registration_deadline: '2026-10-01',
        status: 'Offen für Anmeldung',
        target_group: 'Abteilungsleitende und Scharleiter ab 18 Jahren',
        description: 'Strategische Gesamtleitung einer Cevi-Abteilung (Schar). Vereinsrecht, Behördenkontakt, Finanzen und Teamführung.'
      },
      {
        id: 'kurs-pionier-2026',
        course_node_id: 'pionier',
        title: 'Pioniertechnik-Modul',
        code: 'CEVI-PIO-26',
        category: 'Jungschar',
        js_type: 'Cevi Spezialkurs',
        organizer: 'Cevi Region Zürich',
        location: 'Zürich-Albisgütli, ZH',
        start_date: '2026-06-13',
        end_date: '2026-06-14',
        registration_deadline: '2026-05-15',
        status: 'Offen für Anmeldung',
        target_group: 'Leiterinnen und Leiter ab 15 Jahren',
        description: 'Spezialisierung für Grossbauten, Holztürme, Seilbahnen, Seilbrücken und Materialkunde.'
      },
      {
        id: 'kurs-sec-berg-2026',
        course_node_id: 'sec_berg',
        title: 'J+S-Modul Sicherheitsbereich Berg',
        code: 'JS-SEC-BERG-26',
        category: 'Sicherheit',
        js_type: 'Sicherheitsbereich Berg (T3/T4)',
        organizer: 'Cevi Schweiz / J+S',
        location: 'Melchsee-Frutt, OW',
        start_date: '2026-07-04',
        end_date: '2026-07-06',
        registration_deadline: '2026-05-15',
        status: 'Ausgebucht (Warteliste)',
        target_group: 'Inhaber J+S Leiterkurs LS/T ab 18 Jahren',
        description: 'Befähigung zur Durchführung von anspruchsvollen Bergtouren und Biwaks im T3/T4 Gelände.'
      },
      {
        id: 'kurs-slrg-2026',
        course_node_id: 'slrg_pool',
        title: 'SLRG Brevet Basis Pool + BLS-AED',
        code: 'SLRG-POOL-26',
        category: 'Sicherheit',
        js_type: 'SLRG Rettungsschwimmer',
        organizer: 'SLRG Sektion Zürich',
        location: 'Hallenbad Oerlikon, ZH',
        start_date: '2026-05-30',
        end_date: '2026-05-31',
        registration_deadline: '2026-05-01',
        status: 'Offen für Anmeldung',
        target_group: 'Teilnehmende und Leitende ab 14 Jahren',
        description: 'Rettungsschwimmer-Grundausbildung und Herz-Lungen-Wiederbelebung.'
      },
      {
        id: 'kurs-exp-2027',
        course_node_id: 'experte',
        title: 'J+S-Expertenkurs',
        code: 'JS-EXP-27-01',
        category: 'Expertenbildung',
        js_type: 'J+S Experte LS/T',
        organizer: 'BASPO Magglingen / Cevi Schweiz',
        location: 'Nationales Jugendsportzentrum Tenero, TI',
        start_date: '2027-03-15',
        end_date: '2027-03-21',
        registration_deadline: '2026-12-01',
        status: 'Voranmeldung möglich',
        target_group: 'Erfahrene Kursleiterinnen und Kursleiter ab 21 Jahren',
        description: 'Ausbildung zum Experten zur Leitung von offiziellen J+S-Leiterkursen in den Verbänden.'
      }
    ].map(course => ({ free_places: null, registration_url: DEMO_REGISTRATION_URL, ...course }));
  }

  getMockParticipations() {
    return [
      {
        id: 'part-001',
        course_id: 'kurs-voku-2017',
        course_node_id: 'voku',
        course_title: 'Vorkurs (Voku)',
        category: 'Jungschar',
        year: 2017,
        date: '16.09.2017 - 17.09.2017',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Erste Cevi-Ausbildung in Flaach absolviert'
      },
      {
        id: 'part-002',
        course_id: 'kurs-heku-2018',
        course_node_id: 'heku',
        course_title: 'Helfer/-innen-Kurs (Heku)',
        category: 'Jungschar',
        year: 2018,
        date: '08.10.2018 - 13.10.2018',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Hilfsleiterausbildung auf dem Hasliberg'
      },
      {
        id: 'part-003',
        course_id: 'kurs-glk1-2019',
        course_node_id: 'glk1',
        course_title: 'Gruppenleiter/-innen-Kurs 1 (GLK 1)',
        category: 'Jungschar',
        year: 2019,
        date: '07.10.2019 - 12.10.2019',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Gruppenstunden-Methodik in Kyburg'
      },
      {
        id: 'part-004',
        course_id: 'kurs-glk2-2020',
        course_node_id: 'glk2',
        course_title: 'Gruppenleiter/-innen-Kurs 2 (GLK 2)',
        category: 'Jungschar',
        year: 2020,
        date: '18.04.2020 - 25.04.2020',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Mehrtägige Unternehmungen & Biwak'
      },
      {
        id: 'part-005',
        course_id: 'kurs-glk3-2022',
        course_node_id: 'glk3',
        course_title: 'Gruppenleiter/-innen-Kurs 3 (GLK 3)',
        category: 'Jugend+Sport',
        year: 2022,
        date: '08.10.2022 - 15.10.2022',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        js_recognized: true,
        notes: 'Erwerb offizielle J+S Anerkennung Lagersport/Trekking Jugendsport'
      },
      {
        id: 'part-006',
        course_id: 'kurs-slk-2024',
        course_node_id: 'slk',
        course_title: 'Stufenleiter/-innen-Kurs (SLK)',
        category: 'Jungschar',
        year: 2024,
        date: '14.10.2024 - 19.10.2024',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Berechtigung zur Stufenleitung & Coaching'
      },
      {
        id: 'part-007',
        course_id: 'kurs-slrg-2024',
        course_node_id: 'slrg_pool',
        course_title: 'SLRG Brevet Basis Pool + BLS-AED',
        category: 'Sicherheit',
        year: 2024,
        date: '25.05.2024 - 26.05.2024',
        role: 'Teilnehmer',
        status: 'completed',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Rettungsschwimmer & Wiederbelebung'
      },
      {
        id: 'part-008',
        course_id: 'kurs-sec-berg-2026',
        course_node_id: 'sec_berg',
        course_title: 'J+S-Modul Sicherheitsbereich Berg',
        category: 'Sicherheit',
        year: 2026,
        date: '04.07.2026 - 06.07.2026',
        role: 'Teilnehmer',
        status: 'in_progress',
        result: 'Bestätigt / Bevorstehend',
        certificate_issued: false,
        js_recognized: false,
        notes: 'Kurs findet im kommenden Sommer auf Melchsee-Frutt statt'
      }
    ];
  }

  getMockQualifications() {
    return [
      {
        id: 'qual-js-lst-2022',
        key: 'js_leiter_lst',
        title: 'J+S Leiter Lagersport/Trekking',
        sub_title: 'Zielgruppe Jugendsport (10-20 Jahre)',
        type: 'Jugend+Sport',
        issuer: 'Bundesamt für Sport (BASPO)',
        status: 'Gültig',
        status_code: 'valid',
        valid_until: '2026-12-31',
        days_remaining: 438,
        renewal_needed: false,
        renewal_recommended: 'Im Herbst 2026 Fortbildungsmodul besuchen',
        requirements_fulfilled: true
      },
      {
        id: 'qual-cevi-slk-2024',
        key: 'cevi_stufenleiter',
        title: 'Cevi Stufenleiter / Abteilungsleiter',
        sub_title: 'Verbandsanerkennung',
        type: 'Cevi Region Zürich',
        status: 'Aktiv',
        status_code: 'valid',
        valid_until: 'Unbefristet',
        days_remaining: null,
        renewal_needed: false,
        requirements_fulfilled: true
      },
      {
        id: 'qual-slrg-pool-2024',
        key: 'slrg_basis_pool',
        title: 'SLRG Brevet Basis Pool + BLS-AED',
        sub_title: 'Rettungsschwimmen & Erste Hilfe',
        type: 'SLRG Schweiz',
        status: 'Gültig',
        status_code: 'valid',
        valid_until: '2027-05-15',
        days_remaining: 938,
        renewal_needed: false,
        requirements_fulfilled: true
      },
      {
        id: 'qual-js-berg-pending',
        key: 'js_sec_berg',
        title: 'J+S Sicherheitsbereich Berg',
        sub_title: 'Zusatzqualifikation T3/T4',
        type: 'Jugend+Sport',
        status: 'In Ausbildung',
        status_code: 'pending',
        valid_until: 'Kursbesuch Juli 2026',
        days_remaining: null,
        renewal_needed: false,
        requirements_fulfilled: false
      }
    ];
  }
}

export const ceviDbService = new CeviDbService();
