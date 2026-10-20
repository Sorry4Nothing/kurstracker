import crypto from 'crypto';
import { execFileSync } from 'child_process';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { envConfig, validateEnv } from './config/env.js';
import { ceviDbService } from './services/ceviDbService.js';
import { courseTreeEngine } from './domain/courseTreeEngine.js';
import { stufenleiterPlanningEngine } from './domain/stufenleiterPlanningEngine.js';
import { COURSE_NODES } from './domain/courseTreeData.js';

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

// Middlewares
app.use(express.json());
app.use(cookieParser(envConfig.auth.sessionSecret));

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

function getSession(req) {
  const sessionId = req.signedCookies?.cevi_session_id;
  const session = sessionId && activeSessions.get(sessionId);
  if (session && Date.now() - session.createdAt < SESSION_MAX_AGE_MS) {
    return session;
  }
  // Auto-login: Login pausieren / skippen - Standardmässig mit Siro's Profil arbeiten
  const defaultUser = ceviDbService.getMockUser();
  return {
    user: defaultUser,
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

  const sessionId = crypto.randomUUID();
  activeSessions.set(sessionId, {
    ...sessionData,
    createdAt: now
  });

  res.cookie('cevi_session_id', sessionId, { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_MS });

  return sessionId;
}

// Rollen mit Zugriff auf den Stufenleiter-Planer
const PLANNER_ROLES = ['abteilungsleiter', 'stufenleiter', 'kader', 'kursleiter', 'admin'];

function canUsePlanner(user) {
  const roles = (user?.roles || []).map(r => String(r).toLowerCase());
  return roles.some(r => PLANNER_ROLES.some(allowed => r.includes(allowed)));
}

function requirePlanner(req, res, next) {
  if (canUsePlanner(getSession(req).user)) {
    return next();
  }
  res.status(403).json({ error: 'Kein Zugriff auf den Stufenleiter-Planer' });
}

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------

// OAuth Login Initiation
app.get('/api/auth/login', (req, res) => {
  const state = crypto.randomUUID();
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
    console.error('[OAuth Callback Error]:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!state || state !== expectedState) {
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

    setSession(res, {
      user: userInfo,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      isMock: false
    });

    res.redirect('/?login=success');
  } catch (err) {
    console.error('[OAuth Callback Exception]:', err.message);
    res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
});

// Aktuell eingeloggter Benutzer (Login direkt übersprungen / aktiv)
app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  res.json({
    authenticated: true,
    user: session.user,
    isMock: session.isMock,
    canUsePlanner: canUsePlanner(session.user)
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
app.get('/api/courses', async (req, res) => {
  try {
    const session = getSession(req);
    const courses = await ceviDbService.getCourses(session.accessToken);
    res.json(courses);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Bisherige und angemeldete Kursteilnahmen (Kurshistorie)
app.get('/api/user/history', async (req, res) => {
  try {
    const session = getSession(req);
    const participations = await ceviDbService.getUserParticipations(
      session.accessToken,
      session.user.id || session.user.sub
    );
    res.json(participations);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Qualifikationen (J+S Lagersport/Trekking, Scharleiter, SLRG etc.)
app.get('/api/user/qualifications', async (req, res) => {
  try {
    const session = getSession(req);
    const qualifications = await ceviDbService.getUserQualifications(
      session.accessToken,
      session.user.id || session.user.sub
    );
    res.json(qualifications);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// AUSBIILUNGSBAUM & PATHFINDING API
// -----------------------------------------------------------------------------

// Liefert die vollständige Baumstruktur
app.get('/api/tree/structure', (req, res) => {
  res.json({
    nodes: COURSE_NODES
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

  const inProgress = participations
    .filter(p => p.status === 'in_progress' || p.status === 'registered' || p.result?.includes('Bevorstehend'))
    .map(p => (p.course_node_id || p.course_id || '').toLowerCase());

  return {
    id: user.id,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    ceviname: user.nickname || user.ceviname || '',
    birthdate: user.birthday,
    completedCourses: completed,
    inProgressCourses: inProgress,
    qualifications: qualifications.map(q => (q.key || q.id || '').toLowerCase())
  };
}

// Liefert die Bewertung des Ausbildungsbaums für den aktuellen Benutzer
app.get('/api/tree/evaluation', async (req, res) => {
  try {
    const person = await resolveActivePerson(req);
    const evaluation = courseTreeEngine.evaluatePersonInTree(person);
    res.json({
      person,
      evaluation
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Berechnet den Pfad zu einem Zielkurs via GET
app.get('/api/tree/path/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const person = await resolveActivePerson(req);
    const pathResult = courseTreeEngine.findPathToTarget(person, courseId);
    res.json(pathResult);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// STUFENLEITER & ABTEILUNGSPLANUNG API
// -----------------------------------------------------------------------------

const defaultDemoGroup = [
  {
    id: 'tn_1',
    name: 'Noah Keller',
    ceviname: 'Fuchs',
    birthdate: '2011-04-10', // 15 Jahre
    currentRole: 'Teilnehmer',
    completedCourses: []
  },
  {
    id: 'tn_2',
    name: 'Lea Meier',
    ceviname: 'Amsel',
    birthdate: '2009-09-12', // 17 Jahre
    currentRole: 'Hilfsleiterin',
    completedCourses: ['hlk'],
    qualifications: ['cevi_hilfsleiter']
  },
  {
    id: 'tn_3',
    name: 'Marc Brunner',
    ceviname: 'Milan',
    birthdate: '2007-01-20', // 19 Jahre
    currentRole: 'Gruppenleiter',
    completedCourses: ['hlk', 'glk'],
    qualifications: ['js_leiter_lst', 'cevi_gruppenleiter'],
    jsExpirationDate: '2026-11-30' // bald ablaufend
  },
  {
    id: 'tn_4',
    name: 'Sara Wyss',
    ceviname: 'Kolibri',
    birthdate: '2010-06-05', // 16 Jahre
    currentRole: 'Hilfsleiterin',
    completedCourses: ['hlk'],
    qualifications: ['cevi_hilfsleiter']
  },
  {
    id: 'tn_5',
    name: 'Luca Frei',
    ceviname: 'Biber',
    birthdate: '2005-03-18', // 21 Jahre
    currentRole: 'Scharleiter',
    completedCourses: ['hlk', 'glk', 'slk'],
    qualifications: ['js_leiter_lst', 'cevi_scharleiter']
  }
];

// Gesamtübersicht und Analyse für Stufenleiter
app.get('/api/planner/overview', requirePlanner, (req, res) => {
  try {
    const analysis = stufenleiterPlanningEngine.analyzeGroup(defaultDemoGroup);
    res.json({
      group: defaultDemoGroup,
      analysis,
      nominations: stufenleiterPlanningEngine.getAllNominations()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kursvorschlag für eine Person erfassen
app.post('/api/planner/propose', requirePlanner, (req, res) => {
  try {
    const { personId, targetCourseId, proposedSeason, notes, proposedBy } = req.body;
    const person = defaultDemoGroup.find(p => p.id === personId);
    if (!person) {
      return res.status(404).json({ error: 'Person nicht gefunden' });
    }
    if (typeof targetCourseId !== 'string' || !Object.hasOwn(COURSE_NODES, targetCourseId)) {
      return res.status(400).json({ error: 'Ungültiger Zielkurs' });
    }

    // Freitext begrenzen: Vorschläge liegen für alle sichtbar im Speicher
    const result = stufenleiterPlanningEngine.proposeCourse(
      person,
      {
        courseId: targetCourseId,
        season: String(proposedSeason || 'Herbst 2026').slice(0, 50),
        notes: String(notes || '').slice(0, 500),
        plannedBy: String(proposedBy || 'Stufenleitung').slice(0, 100)
      }
    );

    res.json({
      success: true,
      proposal: result.nomination,
      pathCheck: result.pathCheck
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System Status & Diagnose
app.get('/api/system/status', (req, res) => {
  const preparationMode = ceviDbService.isPreparationMode();
  res.json({
    status: 'online',
    version: releaseVersion,
    appEnv: envConfig.app.env,
    nodeEnv: envConfig.app.nodeEnv,
    preparationMode,
    ceviDbBaseUrl: envConfig.ceviDb.baseUrl,
    ceviDbStatus: {
      // Nur der konfigurierte Modus, eine echte Verbindungsprüfung gibt es noch nicht
      message: preparationMode ? 'Vorbereitungsmodus (Testdaten)' : 'Live-Modus'
    },
    configValidation: validateEnv(),
    timestamp: new Date().toISOString()
  });
});

// Unbekannte API-Routen: JSON-Fehler statt index.html
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API-Route nicht gefunden' });
});

// Statische Dateien aus public/ servieren
app.use(express.static(path.join(projectRoot, 'public')));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(projectRoot, 'public', 'index.html'));
});
