import crypto from 'crypto';
import fs from 'fs';
import { execFileSync } from 'child_process';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { envConfig, validateEnv } from './config/env.js';
import { ceviDbService } from './services/ceviDbService.js';
import { courseTreeEngine, CourseTreeEngine } from './domain/courseTreeEngine.js';
import { stufenleiterPlanningEngine } from './domain/stufenleiterPlanningEngine.js';
import { COURSE_NODES, COURSE_NODES_BY_REGION, REGIONS, withGenderTitles, toRegionCourseIds, standardCourseId } from './domain/courseTreeData.js';
import { plannerScope, visibleTo, groupsOf, isAbteilungsleitung, isStufenleitung, isFroeschliLeitung, leadDepartments, canEditGroup, canReopenGroup } from './domain/plannerAccess.js';
import { normalizeEntries, MAX_NOTE, STATUS_OPEN, STATUS_SUBMITTED } from './domain/proposals.js';
import { credentialStore } from './services/credentialStore.js';
import { proposalStore } from './services/proposalStore.js';
import { query as databaseQuery } from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

// Release-Version = neuester Git-Tag. Ohne Tag (noch kein Release) oder ohne Git gibt es keine Version.
function readReleaseVersion() {
  try {
    const tag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
    return tag || null;
  } catch {
    return null;
  }
}
const releaseVersion = readReleaseVersion();

export const app = express();

// Hinter einem Reverse Proxy die echte Client-IP und das Protokoll aus X-Forwarded-* übernehmen (nur wenn konfiguriert)
if (envConfig.server.trustProxy) {
  const hops = envConfig.server.trustProxy;
  app.set('trust proxy', /^\d+$/.test(hops) ? Number(hops) : hops);
}

// Nur HTTPS: In Produktion hinter einem Proxy jede HTTP-Anfrage auf die HTTPS-Adresse aus APP_URL umleiten.
// Ziel ist APP_URL, nie der Host-Header der Anfrage, damit niemand die Umleitung auf eine fremde Seite lenken kann.
// Ohne TRUST_PROXY wäre req.secure hinter einem TLS-Proxy immer false und die Umleitung liefe im Kreis.
if (envConfig.app.isProduction && envConfig.server.trustProxy && envConfig.server.url.startsWith('https://')) {
  // Origin + Pfad statt new URL(pfad, basis): ein Pfad wie "//fremd.example" würde sonst zum fremden Host
  const httpsOrigin = new URL(envConfig.server.url).origin;
  app.use((req, res, next) => {
    if (req.secure) return next();
    res.redirect(308, httpsOrigin + req.originalUrl);
  });
}

// Eine Zeile, ein Eintrag: Zeilenumbrüche und Steuerzeichen aus Nutzereingaben dürfen keine Log-Zeilen fälschen
export function logSafe(value) {
  // Entfernen statt durch Leerzeichen ersetzen, ohne `+`: nur so erkennt CodeQL (js/log-injection) die Bereinigung
  return String(value ?? '').replace(/[\r\n\u0000-\u001f\u007f]/g, '').slice(0, 300);
}

// Fehler mit gesetztem err.status (eigene Service-Fehler wie 401/502) geben ihre kuratierte Meldung weiter;
// alles ohne Status ist unerwartet und bleibt intern (kein err.message, kein Stack an den Client)
function sendError(res, err, context) {
  if (!Number.isInteger(err?.status)) {
    console.error(logSafe(`[${context}] ${err?.stack || err?.message || err}`));
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
  res.status(err.status).json({ error: String(err.message || 'Anfrage fehlgeschlagen').slice(0, 300) });
}

// Security-Header für alle Antworten (Seiten, Statics und API)
// Inline-Handler (onclick) und style="" im HTML brauchen 'unsafe-inline'; externe Quellen bleiben auf Fonts/Icons begrenzt
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  `img-src 'self' data: ${new URL(envConfig.ceviDb.baseUrl).origin}`,
  // Stylesheet-Hosts auch für fetch: Werkzeuge wie axe lesen das CSSOM per fetch nach; Daten fliessen nur an 'self'
  "connect-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (envConfig.app.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Middlewares
// Kein BREACH-Risiko: Antworten tragen keine Tokens (CSRF-Schutz läuft über Origin, requireSameOrigin)
app.use(compression());
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser(envConfig.auth.sessionSecret));

// CSRF-Schutz: Schreibende API-Aufrufe nur von der eigenen Seite (Browser senden Origin bei POST immer mit).
// Clients ohne Origin/Referer (curl, Tests) tragen keine fremden Cookies und bleiben erlaubt.
function requireSameOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const source = req.headers.origin ?? req.headers.referer;
  if (!source) return next();
  try {
    if (new URL(source).host === req.headers.host) return next();
  } catch {
    // unlesbarer Origin/Referer zählt als fremd
  }
  res.status(403).json({ error: 'Anfrage von fremder Herkunft abgelehnt' });
}

// Rate Limits pro IP (hinter einem Reverse Proxy zusätzlich app.set('trust proxy', 1) setzen, sonst zählt die Proxy-IP).
// Grosszügig bemessen: in einem Lager-WLAN teilen sich viele Leitende eine IP. Passwörter laufen über die Cevi-DB,
// hier geht es um Missbrauch der Token-Tauschs und um Last, nicht um Passwort-Raten.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX || 100),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' })
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_MAX || 3000),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' })
});

app.use('/api', (req, res, next) => {
  // Personenbezogene JSON-Antworten gehören in keinen Proxy-/Browser-Cache
  res.setHeader('Cache-Control', 'no-store');
  next();
}, requireSameOrigin, apiLimiter);

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: envConfig.auth.cookieSecure,
  sameSite: 'lax',
  signed: true
};

// In-Memory Session Store
// shortcut: Sessions liegen im Prozess-Speicher (weg nach Neustart, nicht zwischen Prozessen geteilt), bei mehreren Prozessen auf einen gemeinsamen Store umstellen
const activeSessions = new Map();
const MAX_ACTIVE_SESSIONS = 5000;

function getSession(req) {
  const sessionId = req.signedCookies?.cevi_session_id;
  const session = sessionId && activeSessions.get(sessionId);
  if (session) {
    if (Date.now() - session.createdAt < SESSION_MAX_AGE_MS) return session;
    activeSessions.delete(sessionId);
  }
  // Nur der Vorbereitungsmodus arbeitet ohne Login mit dem Demo-Profil.
  // Im Live-Betrieb gibt es ohne gültige Session keinen Zugriff (null → 401 in requireAuth/requirePlanner).
  if (!ceviDbService.isPreparationMode()) return null;
  return {
    user: ceviDbService.getMockUser(),
    accessToken: 'mock_token_cevi_auto',
    isMock: true,
    isDefaultSession: true
  };
}

function setSession(res, sessionData) {
  const now = Date.now();
  // Abgelaufene Sessions entfernen, damit der Store nicht endlos wächst
  for (const [id, session] of activeSessions) {
    if (now - session.createdAt >= SESSION_MAX_AGE_MS) activeSessions.delete(id);
  }
  // Harte Obergrenze gegen Speicher-DoS: die ältesten Sessions weichen zuerst (Map hält Einfüge-Reihenfolge)
  while (activeSessions.size >= MAX_ACTIVE_SESSIONS) {
    activeSessions.delete(activeSessions.keys().next().value);
  }

  const sessionId = crypto.randomUUID();
  activeSessions.set(sessionId, {
    ...sessionData,
    createdAt: now
  });

  res.cookie('cevi_session_id', sessionId, { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_MS });

  return sessionId;
}

// Sicherheitsereignis ins Log (SR-52): Zeit setzt das Log, Akteur ist die Person-ID oder anonym, keine Secrets
function logSecurity(req, event, session) {
  console.warn(logSafe(`[Sicherheit] ${event} ${req.method} ${req.originalUrl.split('?')[0]} akteur=${session?.user?.id ?? 'anonym'}`));
}

function requireAuth(req, res, next) {
  if (getSession(req)) return next();
  logSecurity(req, '401 nicht angemeldet');
  res.status(401).json({ error: 'Nicht angemeldet' });
}

// OAuth-States sind serverseitig je einmal einlösbar: das signierte Cookie allein liesse sich beliebig oft wiederverwenden
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_STATES = 10000;
const pendingStates = new Map(); // state -> Ablaufzeit

function issueState() {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates) {
    if (expiresAt <= now) pendingStates.delete(state);
  }
  while (pendingStates.size >= MAX_PENDING_STATES) {
    pendingStates.delete(pendingStates.keys().next().value);
  }
  const state = crypto.randomUUID();
  pendingStates.set(state, now + STATE_TTL_MS);
  return state;
}

function consumeState(state) {
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);
  return expiresAt !== undefined && expiresAt > Date.now();
}

const canUsePlanner = user => plannerScope(user) !== null;

function requirePlanner(req, res, next) {
  const session = getSession(req);
  if (!session) {
    logSecurity(req, '401 nicht angemeldet');
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  if (canUsePlanner(session.user)) {
    res.locals.plannerScope = plannerScope(session.user);
    res.locals.mockLogin = Boolean(session.isMock);
    return next();
  }
  logSecurity(req, '403 kein Planer-Zugriff', session);
  res.status(403).json({ error: 'Kein Zugriff auf den Stufenleiter-Planer' });
}

// Herkunft der Daten, als Tag auf der API-Output-Seite: cevi-db (live), testdaten oder kurstracker (Daten der App selbst).
// Vor dem Abruf gesetzt, damit auch ein 502 die ausgefallene Quelle nennt
function setSource(res, source) {
  res.setHeader('X-Datenquelle', source);
}

// Profil, Kurshistorie und Qualifikationen der Session: live oder Testdaten, wie ceviDbService.usesMockData entscheidet
function setPersonSource(req, res) {
  setSource(res, ceviDbService.usesMockData(getSession(req).accessToken) ? 'testdaten' : 'cevi-db');
}

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------

// OAuth Login Initiation
app.use(['/api/auth/login', '/api/auth/mock-login', '/api/auth/callback', '/api/auth/logout'], authLimiter);

app.get('/api/auth/login', (req, res) => {
  const state = issueState();
  res.cookie('cevi_oauth_state', state, { ...COOKIE_OPTIONS, maxAge: 10 * 60 * 1000 });
  res.redirect(ceviDbService.getAuthorizationUrl(state));
});

// Direkter Mock-Login, nur im Vorbereitungsmodus (dort ist das Demo-Profil ohnehin aktiv)
if (ceviDbService.isPreparationMode()) {
  app.get('/api/auth/mock-login', (req, res) => {
    res.redirect('/?login=success');
  });
}

// OAuth 2.0 Callback von Cevi-DB (Hitobito)
app.get('/api/auth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const expectedState = req.signedCookies?.cevi_oauth_state;
  res.clearCookie('cevi_oauth_state');

  if (error) {
    // Werte stammen aus der URL: fürs Log entschärfen, an den Client nur ein fester Code statt fremdem Text
    console.error('[OAuth Callback] Anbieter-Fehler:', logSafe(error), logSafe(error_description));
    return res.redirect('/?error=provider_error');
  }

  // Reihenfolge wichtig: erst Cookie-Abgleich, dann einlösen, damit gefälschte Versuche einen echten State nicht verbrauchen
  if (!state || state !== expectedState || !consumeState(state)) {
    logSecurity(req, 'OAuth-Callback mit ungültigem state abgewiesen');
    return res.redirect('/?error=invalid_state');
  }

  if (!code) {
    return res.redirect('/?error=missing_code');
  }

  if (ceviDbService.isPreparationMode()) {
    return res.redirect('/?error=preparation_mode');
  }

  try {
    const tokenData = await ceviDbService.exchangeCodeForToken(code);
    const userInfo = await ceviDbService.getUserInfo(tokenData.access_token);

    // Eine mitgesendete alte Session endet mit dem neuen Login (SR-02)
    activeSessions.delete(req.signedCookies?.cevi_session_id);
    setSession(res, {
      user: userInfo,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      isMock: false
    });

    res.redirect('/?login=success');
  } catch (err) {
    // err.message kann Upstream-Antworten enthalten: bleibt im Log, nie in der URL
    console.error('[OAuth Callback] Abbruch:', logSafe(err.message));
    res.redirect('/?error=callback_failed');
  }
});

// Aktuell eingeloggter Benutzer; im Live-Betrieb ohne Session ehrlich "nicht angemeldet"
app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  if (!session) {
    setSource(res, 'kurstracker');
    return res.json({ authenticated: false });
  }
  setPersonSource(req, res);
  res.json({
    authenticated: true,
    user: session.user,
    isMock: session.isMock,
    canUsePlanner: canUsePlanner(session.user),
    canManageSettings: leadDepartments(session.user).length > 0,
    canReviewProposals: leadDepartments(session.user).length > 0
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.signedCookies?.cevi_session_id;
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  res.clearCookie('cevi_session_id');
  res.json({ success: true });
});

// Kurse abrufen (Cevi & J+S)
app.get('/api/courses', requireAuth, async (req, res) => {
  try {
    const session = getSession(req);
    setSource(res, ceviDbService.usesMockCourses(session.accessToken) ? 'testdaten' : 'cevi-db');
    const courses = await ceviDbService.getCourses(session.accessToken);
    res.json(courses);
  } catch (err) {
    sendError(res, err, 'Kurse');
  }
});

// Bisherige und angemeldete Kursteilnahmen (Kurshistorie)
app.get('/api/user/history', requireAuth, async (req, res) => {
  try {
    const session = getSession(req);
    setPersonSource(req, res);
    const participations = await ceviDbService.getUserParticipations(
      session.accessToken,
      session.user.id || session.user.sub
    );
    res.json(participations);
  } catch (err) {
    sendError(res, err, 'Kurshistorie');
  }
});

// Qualifikationen (J+S Lagersport/Trekking, Scharleiter, SLRG etc.)
app.get('/api/user/qualifications', requireAuth, async (req, res) => {
  try {
    const session = getSession(req);
    setPersonSource(req, res);
    const qualifications = await ceviDbService.getUserQualifications(
      session.accessToken,
      session.user.id || session.user.sub
    );
    res.json(qualifications);
  } catch (err) {
    sendError(res, err, 'Qualifikationen');
  }
});

// -----------------------------------------------------------------------------
// AUSBIILUNGSBAUM & PATHFINDING API
// -----------------------------------------------------------------------------

// Region der eingeloggten Person (user.region); ohne bekannte Region bleibt der Standardbaum.
// shortcut: nur das Mock-Profil traegt eine Region (Zuerich), echte Logins folgen aus primary_group/layer_group (#145)
const regionOf = user => (Object.hasOwn(COURSE_NODES_BY_REGION, user?.region) ? user.region : null);

// Engine pro Region nur einmal bauen, die Knoten aendern sich zur Laufzeit nicht
const regionEngines = new Map();
const engineFor = region => {
  if (!region) return courseTreeEngine;
  if (!regionEngines.has(region)) regionEngines.set(region, new CourseTreeEngine(COURSE_NODES_BY_REGION[region]));
  return regionEngines.get(region);
};

// Liefert die Regionen mit eigenem Ausbildungspfad und die Region der eingeloggten Person (own, sonst null)
app.get('/api/tree/regions', (req, res) => {
  setSource(res, 'kurstracker');
  res.json({ regions: REGIONS, own: regionOf(getSession(req)?.user) });
});

// Liefert die vollständige Baumstruktur; ?region=<key> zeigt probeweise den Pfad dieser
// Region (siehe REGIONS/COURSE_NODES_BY_REGION in courseTreeData.js), sonst Zuerich/Standard
app.get('/api/tree/structure', (req, res) => {
  setSource(res, 'kurstracker');
  const nodes = COURSE_NODES_BY_REGION[req.query.region] || COURSE_NODES;
  const user = getSession(req)?.user;
  const scope = plannerScope(user);
  const canSeeNolk = isAbteilungsleitung(scope);
  const canSeeSlk = isStufenleitung(scope);
  const canSeeFroeschUp = isFroeschliLeitung(user);
  // NOLK (Abteilungsleitung), SLK (Stufenleitung) und Froesch-Up (Froeschli-Leitende) sind Funktionskurse, kein Teil
  // des allgemeinen Ausbildungswegs - nur zeigen, wer die entsprechende Rolle traegt
  const visibleNodes = Object.fromEntries(Object.entries(nodes).filter(([, n]) =>
    (n.code !== 'NOLK' || canSeeNolk) && (n.code !== 'SLK' || canSeeSlk) && (n.code !== 'Frösch-Up' || canSeeFroeschUp)
  ).map(([id, n]) => [id, nodes === COURSE_NODES ? n : { ...n, courseNodeId: standardCourseId(n) }]));
  res.json({
    nodes: withGenderTitles(visibleNodes, user?.gender)
  });
});

// Hilfsfunktion: Ermittelt das aktive Personen-Profil aus der Session
async function resolveActivePerson(req) {
  const session = getSession(req);
  const user = session.user;
  const personId = user.id || user.sub;
  const [participations, qualifications] = await Promise.all([
    ceviDbService.getUserParticipations(session.accessToken, personId),
    ceviDbService.getUserQualifications(session.accessToken, personId)
  ]);

  // shortcut: echte Hitobito-Teilnahmen tragen keine course_node_id; Mapping der Event-Typen auf Baum-IDs ergänzen, sobald das API-Format bekannt ist
  const completed = participations
    .filter(p => p.status === 'confirmed' || p.status === 'completed' || p.certificate_issued || p.result?.includes('bestanden'))
    .map(p => (p.course_node_id || p.course_id || '').toLowerCase());

  return {
    id: user.id,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    ceviname: user.nickname || user.ceviname || '',
    gender: user.gender,
    birthdate: user.birthday,
    completedCourses: completed,
    qualifications: qualifications.map(q => (q.key || q.id || '').toLowerCase())
  };
}

// Liefert die Bewertung des Ausbildungsbaums für den aktuellen Benutzer
app.get('/api/tree/evaluation', requireAuth, async (req, res) => {
  try {
    setPersonSource(req, res);
    const person = await resolveActivePerson(req);
    // Regionsbaeume haben eigene Kurs-IDs: die absolvierten Kurse der Person (Standard-IDs) werden per Kuerzel uebersetzt
    const region = Object.hasOwn(COURSE_NODES_BY_REGION, req.query.region) ? req.query.region : null;
    const forTree = region ? { ...person, completedCourses: toRegionCourseIds(person.completedCourses, COURSE_NODES_BY_REGION[region]) } : person;
    const evaluation = engineFor(region).forGender(person.gender).evaluatePersonInTree(forTree);
    res.json({
      person,
      evaluation
    });
  } catch (err) {
    sendError(res, err, 'Baumbewertung');
  }
});

// Berechnet den Pfad zu einem Zielkurs via GET. ?region= rechnet auf der Baum-Vorschau einer
// Region statt des Standardbaums (siehe /api/tree/structure) - die Kurs-IDs dort sind
// regionsspezifisch (z.B. "zuerich_glk3_fa_2027") und stehen nicht in COURSE_NODES.
app.get('/api/tree/path/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const region = req.query.region;
    const nodes = region && COURSE_NODES_BY_REGION[region] ? COURSE_NODES_BY_REGION[region] : COURSE_NODES;
    const engine = engineFor(nodes === COURSE_NODES ? null : region);
    // Unbekannter Zielkurs ist ein Client-Fehler (404), kein Serverfehler (Bug #53)
    const resolved = engine.resolveCourseId(courseId);
    if (!Object.hasOwn(nodes, resolved)) {
      return res.status(404).json({ error: `Zielkurs '${String(courseId).slice(0, 40)}' existiert nicht im Ausbildungsbaum.` });
    }
    setPersonSource(req, res);
    const person = await resolveActivePerson(req);
    const forTree = nodes === COURSE_NODES ? person : { ...person, completedCourses: toRegionCourseIds(person.completedCourses, nodes) };
    const pathResult = engine.forGender(person.gender).findPathToTarget(forTree, courseId);
    res.json(pathResult);
  } catch (err) {
    sendError(res, err, 'Pfadberechnung');
  }
});

// -----------------------------------------------------------------------------
// STUFENLEITER & ABTEILUNGSPLANUNG API
// -----------------------------------------------------------------------------

// Demo-Abteilung mit zwei Stufen, damit Filter und Untertitel auch ohne Cevi-DB etwas zeigen
const demoDepartment = { departmentId: 'demo', departmentName: 'Demo-Abteilung' };
const demoStufen = {
  nord: [{ id: 'demo_nord', name: 'Stufe Nord', type: 'Group::Stufe', ...demoDepartment }],
  sued: [{ id: 'demo_sued', name: 'Stufe Süd', type: 'Group::Stufe', ...demoDepartment }]
};

const defaultDemoGroup = [
  {
    id: 'tn_1',
    groups: demoStufen.nord,
    name: 'Noah Keller',
    ceviname: 'Fuchs',
    gender: 'm',
    birthdate: '2011-04-10', // 15 Jahre
    currentRole: 'Teilnehmer',
    completedCourses: []
  },
  {
    id: 'tn_2',
    groups: demoStufen.nord,
    name: 'Lea Meier',
    ceviname: 'Amsel',
    gender: 'w',
    birthdate: '2009-09-12', // 17 Jahre
    currentRole: 'Hilfsleiterin',
    completedCourses: ['heku'],
    qualifications: ['cevi_hilfsleiter']
  },
  {
    id: 'tn_3',
    groups: demoStufen.sued,
    name: 'Marc Brunner',
    ceviname: 'Milan',
    gender: 'm',
    birthdate: '2007-01-20', // 19 Jahre
    currentRole: 'Gruppenleiter',
    completedCourses: ['heku', 'glk3'],
    qualifications: ['js_leiter_lst', 'cevi_gruppenleiter'],
    jsExpirationDate: '2026-11-30' // bald ablaufend
  },
  {
    id: 'tn_4',
    groups: demoStufen.nord,
    name: 'Sara Wyss',
    ceviname: 'Kolibri',
    gender: 'w',
    birthdate: '2010-06-05', // 16 Jahre
    currentRole: 'Hilfsleiterin',
    completedCourses: ['heku'],
    qualifications: ['cevi_hilfsleiter']
  },
  {
    id: 'tn_5',
    groups: demoStufen.sued,
    name: 'Luca Frei',
    ceviname: 'Biber',
    gender: 'm',
    birthdate: '2005-03-18', // 21 Jahre
    currentRole: 'Scharleiter',
    completedCourses: ['heku', 'glk3', 'slk'],
    qualifications: ['js_leiter_lst', 'cevi_scharleiter']
  }
];

// Echte Mitglieder lädt der Service-Token ohne Login (#26). Darum nur, wenn die App bloss auf diesem Rechner erreichbar ist:
// sonst sähe jede Besucherin Namen und Geburtsdaten der ganzen Gruppe.
// shortcut: ohne Login nur lokal, nach dem OAuth-Login (#4) auch Leitenden dieser Gruppe zeigen
function plannerGroup(fresh = false) {
  const localOnly = envConfig.app.isLocal && ['localhost', '127.0.0.1', '::1'].includes(envConfig.server.host);
  return ceviDbService.serviceToken && localOnly ? ceviDbService.getGroupMembers({ fresh }) : defaultDemoGroup;
}

// Gesamtübersicht und Analyse für Stufenleiter
app.get('/api/planner/overview', requirePlanner, async (req, res) => {
  try {
    // plannerGroup gibt die Demo-Gruppe direkt zurück, die echten Mitglieder als Promise
    // «Aktualisieren» schickt ?refresh=1 und umgeht den Cache der Cevi-DB-Daten (höchstens alle 10 s, siehe CeviDbService)
    const members = plannerGroup(req.query.refresh === '1');
    setSource(res, members === defaultDemoGroup ? 'testdaten' : 'cevi-db');
    // Nur was die Rolle der Person zeigt: fremde Stufen verlassen den Server nie (#108)
    const group = visibleTo(res.locals.plannerScope, await members);
    const analysis = stufenleiterPlanningEngine.analyzeGroup(group);
    res.json({
      group,
      ...groupsOf(group),
      // Echte Cevi-DB-Daten über den Mock-Login: gibt es nur lokal, bis der OAuth-Login steht (#4)
      realDataViaMockLogin: res.locals.mockLogin && members !== defaultDemoGroup,
      analysis,
      nominations: stufenleiterPlanningEngine.getAllNominations()
    });
  } catch (err) {
    sendError(res, err, 'Planer-Übersicht');
  }
});

// Kursvorschlag für eine Person erfassen
app.post('/api/planner/propose', requirePlanner, async (req, res) => {
  try {
    // Express 5 leaves req.body undefined when no JSON body was sent
    const { personId, targetCourseId, proposedSeason, notes } = req.body ?? {};
    const person = visibleTo(res.locals.plannerScope, await plannerGroup()).find(p => p.id === personId);
    if (!person) {
      return res.status(404).json({ error: 'Person nicht gefunden' });
    }
    if (typeof targetCourseId !== 'string' || !Object.hasOwn(COURSE_NODES, targetCourseId)) {
      return res.status(400).json({ error: 'Ungültiger Zielkurs' });
    }

    // Freitext begrenzen: Vorschläge liegen für alle sichtbar im Speicher
    const { user } = getSession(req);
    const result = stufenleiterPlanningEngine.proposeCourse(
      person,
      {
        courseId: targetCourseId,
        season: String(proposedSeason || 'Herbst 2026').slice(0, 50),
        notes: String(notes || '').slice(0, 500),
        // Wer erfasst, kommt aus der Session, nie aus dem Body (SR-13)
        plannedBy: [user.first_name, user.last_name].filter(Boolean).join(' ').slice(0, 100) || 'Stufenleitung'
      }
    );

    res.json({
      success: true,
      proposal: result.nomination,
      pathCheck: result.pathCheck
    });
  } catch (err) {
    sendError(res, err, 'Kursvorschlag');
  }
});

// -----------------------------------------------------------------------------
// KURSVORSCHLÄGE JE STUFE (#131): Entwurf speichern, abgeben, zurückgeben
// -----------------------------------------------------------------------------

const actorName = user => (user.nickname || [user.first_name, user.last_name].filter(Boolean).join(' ')).slice(0, 100) || String(user.id ?? 'unbekannt');

// Ohne Datenbank gehen Vorschläge beim Neustart verloren: auf dem Server lieber ablehnen als still verlieren
function requireProposalStorage(req, res, next) {
  if (databaseQuery || !envConfig.app.isProduction) return next();
  res.status(503).json({ error: 'Vorschläge sind auf diesem Server nicht eingerichtet' });
}

const proposalWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PROPOSALS_MAX || 120),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Zu viele Änderungen. Bitte später erneut versuchen.' })
});

// Stufen, die der Scope zeigt, samt ihren sichtbaren Mitgliedern; die Stufe kommt nur aus dem Scope, nie aus dem Body
async function visibleStufen(scope, res) {
  const members = visibleTo(scope, await plannerGroup());
  setSource(res, 'kurstracker');
  return { members, groups: groupsOf(members).groups };
}

app.get('/api/planner/proposals', requirePlanner, requireProposalStorage, async (req, res) => {
  try {
    const scope = res.locals.plannerScope;
    const { groups } = await visibleStufen(scope, res);
    const saved = await proposalStore.getMany(groups.map(group => group.id));
    res.json({
      user: actorName(getSession(req).user),
      groups: groups.map(group => {
        const row = saved.get(group.id);
        return {
          groupId: group.id,
          status: row?.status ?? STATUS_OPEN,
          entries: row?.entries ?? [],
          updatedBy: row?.updatedBy ?? null,
          updatedAt: row?.updatedAt ?? null,
          submittedBy: row?.submittedBy ?? null,
          submittedAt: row?.submittedAt ?? null,
          returnNote: row?.returnNote ?? null,
          // Abgegeben: nur die Abteilungsleitung passt an, die Stufe bleibt abgegeben (PUT …/final)
          canEdit: row?.status === STATUS_SUBMITTED ? canReopenGroup(scope, group) : canEditGroup(scope, group),
          canReopen: canReopenGroup(scope, group) && row?.status === STATUS_SUBMITTED
        };
      })
    });
  } catch (err) {
    sendError(res, err, 'Vorschläge laden');
  }
});

// Gemeinsame Prüfung der drei schreibenden Routen: Stufe sichtbar (sonst 404), Recht dafür (sonst 403)
function stufeAction(permission, handler) {
  return async (req, res) => {
    try {
      const scope = res.locals.plannerScope;
      const { members, groups } = await visibleStufen(scope, res);
      const group = groups.find(g => g.id === req.params.groupId);
      if (!group) return res.status(404).json({ error: 'Stufe nicht gefunden' });
      if (!permission(scope, group)) {
        logSecurity(req, `403 keine Berechtigung stufe=${group.id}`, getSession(req));
        return res.status(403).json({ error: 'Dafür fehlt die Berechtigung' });
      }
      const { user } = getSession(req);
      const saved = await handler({ req, group, members: members.filter(m => m.groups.some(g => g.id === group.id)), user: actorName(user) });
      if (!saved) return res.status(409).json({ error: 'Der Status dieser Stufe erlaubt das nicht (abgegeben oder noch kein Entwurf)' });
      res.json(saved);
    } catch (err) {
      sendError(res, err, 'Vorschläge speichern');
    }
  };
}

const returnNoteOf = note => {
  if (note != null && typeof note !== 'string') throw Object.assign(new Error('Ungültige Bemerkung'), { status: 400 });
  const trimmed = (note ?? '').trim();
  if (trimmed.length > MAX_NOTE) throw Object.assign(new Error(`Bemerkung höchstens ${MAX_NOTE} Zeichen`), { status: 400 });
  return trimmed || null;
};

const entriesOf = async ({ req, group, members, user }) => normalizeEntries(req.body?.entries, {
  members,
  candidatesByCourse: stufenleiterPlanningEngine.analyzeGroup(members).candidatesByCourse,
  previous: (await proposalStore.getMany([group.id])).get(group.id)?.entries,
  user
});

app.put('/api/planner/proposals/:groupId', proposalWriteLimiter, requirePlanner, requireProposalStorage,
  stufeAction(canEditGroup, async ctx => proposalStore.saveDraft({
    groupId: ctx.group.id, departmentId: ctx.group.departmentId, entries: await entriesOf(ctx), user: ctx.user
  })));

// Abgeben speichert die mitgeschickten Einträge als letzten Stand und sperrt die Stufe
app.post('/api/planner/proposals/:groupId/submit', proposalWriteLimiter, requirePlanner, requireProposalStorage,
  stufeAction(canEditGroup, async ctx => {
    const base = { groupId: ctx.group.id, departmentId: ctx.group.departmentId, user: ctx.user };
    if (!await proposalStore.saveDraft({ ...base, entries: await entriesOf(ctx) })) return null;
    return proposalStore.submit(base);
  }));

// Die Abteilungsleitung passt abgegebene Vorschläge an, ohne die Stufe wieder zu öffnen
app.put('/api/planner/proposals/:groupId/final', proposalWriteLimiter, requirePlanner, requireProposalStorage,
  stufeAction(canReopenGroup, async ctx => proposalStore.saveFinal({
    groupId: ctx.group.id, entries: await entriesOf(ctx), user: ctx.user
  })));

// Die Bemerkung der Abteilungsleitung («bitte Heku-Plätze prüfen») sieht die Stufe beim Bearbeiten
app.post('/api/planner/proposals/:groupId/reopen', proposalWriteLimiter, requirePlanner, requireProposalStorage,
  stufeAction(canReopenGroup, ctx => proposalStore.reopen({ groupId: ctx.group.id, user: ctx.user, note: returnNoteOf(ctx.req.body?.note) })));

// Übersicht der abgegebenen Vorschläge für die Abteilungsleitung: nur finale Stände (abgegeben), je Stufe, mit Namen statt Personen-IDs.
// Stufen ohne Abgabe erscheinen nur als Name, damit die Leitung sieht, worauf sie noch wartet.
app.get('/api/proposals/final', requireDepartmentLead, requireProposalStorage, async (req, res) => {
  try {
    const scope = plannerScope(res.locals.session.user);
    const { members, groups } = await visibleStufen(scope, res);
    const saved = await proposalStore.getMany(groups.map(group => group.id));
    const submitted = [];
    const pending = [];
    for (const group of groups) {
      const row = saved.get(group.id);
      if (row?.status !== STATUS_SUBMITTED) { pending.push({ groupId: group.id, name: group.name }); continue; }
      submitted.push({
        groupId: group.id,
        name: group.name,
        departmentName: group.departmentName ?? null,
        submittedBy: row.submittedBy,
        submittedAt: row.submittedAt,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
        entries: row.entries.map(entry => {
          const person = members.find(member => member.id === entry.personId);
          // Eine Person, die nicht mehr in der Stufe ist, bleibt als Eintrag ohne Namen stehen
          return { ...entry, ceviname: person?.ceviname ?? null, name: person?.name ?? null, gender: person?.gender ?? null, birthYear: Number(String(person?.birthdate ?? '').slice(0, 4)) || null };
        })
      });
    }
    res.json({ submitted, pending });
  } catch (err) {
    sendError(res, err, 'Abgegebene Vorschläge');
  }
});

// -----------------------------------------------------------------------------
// UMGEBUNGSEINSTELLUNGEN: Cevi-DB-API-Key je Abteilung (#129)
// -----------------------------------------------------------------------------

// Nur Abteilungsleitungen, und nur für ihre eigene Abteilung. Der Key geht nie an den Browser zurück, nur Status und letzte 4 Zeichen.
function requireDepartmentLead(req, res, next) {
  const session = getSession(req);
  if (!session) {
    logSecurity(req, '401 nicht angemeldet');
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  const departments = leadDepartments(session.user);
  const { departmentId } = req.params;
  if (!departments.length || (departmentId !== undefined && !departments.some(d => d.id === departmentId))) {
    logSecurity(req, '403 keine Abteilungsleitung', session);
    return res.status(403).json({ error: 'Nur die Abteilungsleitung verwaltet den Cevi-DB-Zugang ihrer Abteilung' });
  }
  res.locals.departments = departments;
  res.locals.session = session;
  next();
}

function requireCredentialStore(req, res, next) {
  if (credentialStore.isConfigured()) return next();
  res.status(503).json({ error: 'Die Umgebungseinstellungen sind auf diesem Server nicht eingerichtet' });
}

// Jedes Speichern löst drei Abrufe bei der Cevi-DB aus: enger begrenzen als die übrige API
const settingsWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_SETTINGS_MAX || 30),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Zu viele Änderungen. Bitte später erneut versuchen.' })
});

app.get('/api/settings/cevi-db-key', requireDepartmentLead, async (req, res) => {
  try {
    setSource(res, 'kurstracker');
    const { departments } = res.locals;
    if (!credentialStore.isConfigured()) return res.json({ available: false, departments });
    res.json({
      available: true,
      departments: await Promise.all(departments.map(async d => ({ ...d, ...await credentialStore.status(d.id) })))
    });
  } catch (err) {
    sendError(res, err, 'Einstellungen');
  }
});

app.put('/api/settings/cevi-db-key/:departmentId', settingsWriteLimiter, requireDepartmentLead, requireCredentialStore, async (req, res) => {
  try {
    setSource(res, 'kurstracker');
    const token = req.body?.token;
    // Sichtbare ASCII-Zeichen ohne Leerraum: der Key wird als HTTP-Header gesendet, Steuerzeichen wären Header-Injektion
    if (typeof token !== 'string' || !/^[\x21-\x7e]{16,200}$/.test(token.trim())) {
      return res.status(400).json({ error: 'Der Key sieht ungültig aus. Bitte genau so einfügen, wie ihn die Cevi-DB anzeigt.' });
    }
    const department = res.locals.departments.find(d => d.id === req.params.departmentId);
    const { user } = res.locals.session;
    await ceviDbService.verifyServiceToken(token.trim());
    const status = await credentialStore.save({
      departmentId: department.id,
      departmentName: department.name,
      token: token.trim(),
      savedBy: [user.first_name, user.last_name].filter(Boolean).join(' ').slice(0, 100) || String(user.id ?? 'unbekannt')
    });
    logSecurity(req, `Cevi-DB-Key gespeichert abteilung=${department.id}`, res.locals.session);
    res.json({ id: department.id, name: department.name, ...status });
  } catch (err) {
    sendError(res, err, 'Einstellungen');
  }
});

app.delete('/api/settings/cevi-db-key/:departmentId', settingsWriteLimiter, requireDepartmentLead, requireCredentialStore, async (req, res) => {
  try {
    setSource(res, 'kurstracker');
    await credentialStore.remove(req.params.departmentId);
    logSecurity(req, `Cevi-DB-Key entfernt abteilung=${req.params.departmentId}`, res.locals.session);
    res.json({ configured: false });
  } catch (err) {
    sendError(res, err, 'Einstellungen');
  }
});

// System Status & Diagnose
app.get('/api/system/status', (req, res) => {
  const preparationMode = ceviDbService.isPreparationMode();
  setSource(res, 'kurstracker');
  const status = {
    status: 'online',
    version: releaseVersion,
    preparationMode,
    ceviDbStatus: {
      // Nur der konfigurierte Modus, eine echte Verbindungsprüfung gibt es noch nicht
      message: preparationMode ? 'Vorbereitungsmodus (Testdaten)' : 'Live-Modus'
    },
    timestamp: new Date().toISOString()
  };
  // Konfigurationsdiagnose (fehlende Secrets, Umgebung, interne URLs) ist Betriebswissen: nicht in Produktion ausliefern
  if (!envConfig.app.isProduction) {
    status.appEnv = envConfig.app.env;
    status.nodeEnv = envConfig.app.nodeEnv;
    status.ceviDbBaseUrl = envConfig.ceviDb.baseUrl;
    status.configValidation = validateEnv();
  }
  res.json(status);
});

// Unbekannte API-Routen: JSON-Fehler statt index.html
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API-Route nicht gefunden' });
});

// Statische Dateien aus public/ servieren
app.use(express.static(path.join(projectRoot, 'public')));

// Fehlerseiten (401, 404, 502): eine Vorlage, der Code wird im Server eingesetzt. Anmelden geht im
// Vorbereitungsmodus ueber den Mock-Login, sonst ueber die Cevi-DB.
const ERROR_PAGES = {
  401: 'Nicht angemeldet',
  404: 'Seite nicht gefunden',
  502: 'Die Cevi-DB antwortet nicht'
};
const errorTemplate = fs.readFileSync(path.join(projectRoot, 'src', 'views', 'fehler.html'), 'utf8');
function sendErrorPage(res, code) {
  const loginUrl = ceviDbService.isPreparationMode() ? '/api/auth/mock-login' : '/api/auth/login';
  // Nur den Abschnitt des Codes ausliefern, damit vor dem CSS nicht alle drei kurz sichtbar sind
  res.status(code).type('html').send(errorTemplate
    .replace(/ *<section class="error-hero" data-error="(\d+)"[\s\S]*?<\/section>\s*/g, (section, sectionCode) => (Number(sectionCode) === code ? section : ''))
    .replaceAll('{{CODE}}', String(code))
    .replaceAll('{{TITLE}}', ERROR_PAGES[code])
    .replaceAll('{{LOGIN_URL}}', loginUrl));
}

app.get('/fehler/:code', (req, res) => {
  const code = Number(req.params.code);
  sendErrorPage(res, Object.hasOwn(ERROR_PAGES, code) ? code : 404);
});

// Die App kennt nur die Startseite, keine eigenen Pfade im Browser: alles andere ist eine unbekannte Adresse
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'public', 'index.html'));
});
app.use((req, res) => sendErrorPage(res, 404));

// Letzte Instanz: auch Parser- und Routingfehler antworten als JSON, nie mit Stacktrace
// (Express' Default-Handler hängt an NODE_ENV und liefert sonst den Stack an den Client)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err?.status) ? err.status
    : Number.isInteger(err?.statusCode) ? err.statusCode
    : 500;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: 'Ungültige Anfrage' });
  }
  console.error(logSafe(`[Unbehandelter Fehler] ${err?.stack || err}`));
  res.status(500).json({ error: 'Interner Serverfehler' });
});
