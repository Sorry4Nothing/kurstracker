import { envConfig } from '../config/env.js';

/**
 * Cevi-DB (Hitobito) API & OAuth2 Service
 *
 * Die Cevi-DB basiert auf der Open-Source-Plattform "Hitobito" (hitobito.ch).
 * Diese Schnittstelle stellt sowohl echte OAuth 2.0 / REST/JSON:API Aufrufe bereit,
 * als auch einen vollständigen Mock-Modus für lokale Entwicklung ohne Credentials.
 */
export class CeviDbService {
  constructor(config = envConfig.ceviDb) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes;
    this.useMock = config.useMock;
  }

  /**
   * Generiert die OAuth 2.0 Autorisierungs-URL für den Cevi-DB Login
   * @param {string} state - CSRF Token
   * @returns {string} Vollständige Redirect-URL zu db.cevi.ch
   */
  getAuthorizationUrl(state = 'cevi_auth_state') {
    if (this.useMock) {
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
    if (this.useMock || code === 'mock_auth_code_cevi') {
      return {
        access_token: 'mock_token_cevi_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: 'mock_refresh_token_cevi'
      };
    }

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
    if (this.useMock || accessToken?.startsWith('mock_token')) {
      return this.getMockUser();
    }

    const response = await fetch(`${this.baseUrl}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cevi-DB Userinfo Abruf fehlgeschlagen (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Ruft Kurs- und Weiterbildungsangebote ab (Events mit Event-Typ Kurs)
   * @param {string} [accessToken]
   * @param {object} [filters]
   * @returns {Promise<Array>}
   */
  async getCourses(accessToken, filters = {}) {
    if (this.useMock || !accessToken || accessToken.startsWith('mock_token')) {
      return this.getMockCourses();
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/events?filter[type]=Course`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.api+json, application/json'
        }
      });

      if (!response.ok) {
        console.warn(`[CeviDbService] Echte API lieferte ${response.status}, wechsle auf Kursdaten-Fallback`);
        return this.getMockCourses();
      }

      const data = await response.json();
      return data.data || data;
    } catch (err) {
      console.warn(`[CeviDbService] Fehler beim Kursabruf: ${err.message}. Verwende Fallback-Daten.`);
      return this.getMockCourses();
    }
  }

  /**
   * Ruft die Kursteilnahmen und den Ausbildungsstatus des Benutzers ab
   * @param {string} [accessToken]
   * @param {string} [personId]
   */
  async getUserParticipations(accessToken, personId) {
    if (this.useMock || !accessToken || accessToken.startsWith('mock_token')) {
      return this.getMockParticipations();
    }

    try {
      const url = personId
        ? `${this.baseUrl}/api/event_participations?filter[person_id]=${personId}`
        : `${this.baseUrl}/api/event_participations`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.api+json, application/json'
        }
      });

      if (!response.ok) {
        return this.getMockParticipations();
      }

      const data = await response.json();
      return data.data || data;
    } catch {
      return this.getMockParticipations();
    }
  }

  /**
   * Ruft die J+S und Cevi Qualifikationen des Benutzers ab
   * @param {string} [accessToken]
   * @param {string} [personId]
   */
  async getUserQualifications(accessToken, personId) {
    if (this.useMock || !accessToken || accessToken.startsWith('mock_token')) {
      return this.getMockQualifications();
    }

    try {
      const url = personId
        ? `${this.baseUrl}/api/qualifications?filter[person_id]=${personId}`
        : `${this.baseUrl}/api/qualifications`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.api+json, application/json'
        }
      });

      if (!response.ok) {
        return this.getMockQualifications();
      }

      const data = await response.json();
      return data.data || data;
    } catch {
      return this.getMockQualifications();
    }
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
        id: 'kurs-glk-2026-1',
        title: 'Gruppenleiterkurs (GLK)',
        code: 'CEVI-GLK-26-01',
        category: 'Grundausbildung',
        js_type: 'J+S Leiterkurs Lagersport/Trekking Jugendsport',
        organizer: 'Cevi Regionalverband ZH-SH-GL',
        location: 'Cevi-Zentrum Hasliberg, BE',
        start_date: '2026-10-10',
        end_date: '2026-10-17',
        registration_deadline: '2026-08-31',
        status: 'Offen für Anmeldung',
        target_group: 'Leiterinnen und Leiter ab 17 Jahren',
        description: 'Der GLK ist die fundierte Grundausbildung für Leitende im Cevi mit Erwerb der J+S Leiteranerkennung.'
      },
      {
        id: 'kurs-slk-2026-1',
        title: 'Scharleiterkurs (SLK)',
        code: 'CEVI-SLK-26-01',
        category: 'Kaderbildung',
        js_type: 'J+S Weiterbildung Lagersport/Trekking',
        organizer: 'Cevi Schweiz',
        location: 'Schloss Hünigen / Konolfingen, BE',
        start_date: '2026-11-01',
        end_date: '2026-11-06',
        registration_deadline: '2026-09-15',
        status: 'Offen für Anmeldung',
        target_group: 'Erfahrene Gruppenleitende und angehende Abteilungsleitende',
        description: 'Vorbereitung auf die Leitung einer ganzen Abteilung oder Schar, Krisenmanagement und Vereinsrecht.'
      },
      {
        id: 'kurs-sec-berg-2026',
        title: 'J+S Sicherheitsmodul Berg',
        code: 'JS-SEC-BERG-26',
        category: 'Sicherheit',
        js_type: 'Sicherheitsbereich Berg',
        organizer: 'Cevi Schweiz / J+S',
        location: 'Melchsee-Frutt, OW',
        start_date: '2026-07-04',
        end_date: '2026-07-06',
        registration_deadline: '2026-05-15',
        status: 'Ausgebucht (Warteliste)',
        target_group: 'Inhaber J+S Leiterkurs LS/T',
        description: 'Befähigung zur Durchführung von anspruchsvollen Bergtouren und Biwaks im T3/T4 Gelände.'
      },
      {
        id: 'kurs-fb-2026-herbst',
        title: 'Modul Fortbildung Lagersport/Trekking (MF)',
        code: 'JS-MF-26-02',
        category: 'Weiterbildung',
        js_type: 'J+S Modul Fortbildung (2 Jahre Verlängerung)',
        organizer: 'Cevi Regionalverband Winterthur-Schaffhausen',
        location: 'Pfadi- & Ceviheim Flaach, ZH',
        start_date: '2026-11-21',
        end_date: '2026-11-22',
        registration_deadline: '2026-10-15',
        status: 'Offen für Anmeldung',
        target_group: 'Alle aktiven J+S Leiter zur Pflicht-Verlängerung',
        description: 'Kompakte 2-tägige Weiterbildung zur Verlängerung der J+S Leiteranerkennung um 2 Jahre.'
      },
      {
        id: 'kurs-exp-2027',
        title: 'J+S Expertenkurs Lagersport/Trekking',
        code: 'JS-EXP-27-01',
        category: 'Expertenbildung',
        js_type: 'J+S Experte LS/T',
        organizer: 'BASPO Magglingen / Cevi Schweiz',
        location: 'Nationales Jugendsportzentrum Tenero, TI',
        start_date: '2027-03-15',
        end_date: '2027-03-21',
        registration_deadline: '2026-12-01',
        status: 'Voranmeldung möglich',
        target_group: 'Ausgewählte erfahrene Kursleiterinnen und Kursleiter',
        description: 'Ausbildung zum Experten zur Leitung von offiziellen J+S-Leiterkursen in den Verbänden.'
      }
    ];
  }

  getMockParticipations() {
    return [
      {
        id: 'part-001',
        course_id: 'kurs-hlk-2021',
        course_title: 'Hilfsleiterkurs (HLK)',
        category: 'Einstieg',
        year: 2021,
        date: '16.10.2021 - 22.10.2021',
        role: 'Teilnehmer',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        notes: 'Erste Cevi-Leiterausbildung absolviert'
      },
      {
        id: 'part-002',
        course_id: 'kurs-glk-2023',
        course_title: 'Gruppenleiterkurs (GLK / J+S Leiterkurs)',
        category: 'Grundausbildung',
        year: 2023,
        date: '08.04.2023 - 15.04.2023',
        role: 'Teilnehmer',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        js_recognized: true,
        notes: 'Erwerb J+S Anerkennung Lagersport/Trekking Jugendsport'
      },
      {
        id: 'part-003',
        course_id: 'kurs-slk-2024',
        course_title: 'Scharleiterkurs (SLK)',
        category: 'Kaderbildung',
        year: 2024,
        date: '14.10.2024 - 19.10.2024',
        role: 'Teilnehmer',
        result: 'Erfolgreich bestanden',
        certificate_issued: true,
        js_recognized: true,
        notes: 'Berechtigung zur Abteilungsleitung & Hauptleitung'
      },
      {
        id: 'part-004',
        course_id: 'kurs-sec-berg-2026',
        course_title: 'J+S Sicherheitsmodul Berg',
        category: 'Sicherheit',
        year: 2026,
        date: '04.07.2026 - 06.07.2026',
        role: 'Teilnehmer',
        result: 'Bestätigt / Bevorstehend',
        certificate_issued: false,
        js_recognized: false,
        notes: 'Kurs findet im kommenden Sommer statt'
      }
    ];
  }

  getMockQualifications() {
    return [
      {
        id: 'qual-js-lst-2023',
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
        title: 'Cevi Scharleiter / Abteilungsleiter',
        sub_title: 'Verbandsanerkennung',
        type: 'Cevi Schweiz',
        status: 'Aktiv',
        status_code: 'valid',
        valid_until: 'Unbefristet',
        days_remaining: null,
        renewal_needed: false,
        requirements_fulfilled: true
      },
      {
        id: 'qual-slrg-pool-2024',
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
