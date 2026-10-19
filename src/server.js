import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { envConfig, validateEnv } from './config/env.js';
import { ceviDbService } from './services/ceviDbService.js';
import { courseTreeEngine } from './domain/courseTreeEngine.js';
import { stufenleiterPlanningEngine } from './domain/stufenleiterPlanningEngine.js';
import { COURSE_NODES, TREE_EDGES } from './domain/courseTreeData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(envConfig.auth.sessionSecret));
app.use(cors({
  origin: envConfig.server.url,
  credentials: true
}));

// In-Memory Session Store (für Development & einfache Sessions)
const activeSessions = new Map();

function getSession(req) {
  const sessionId = req.signedCookies?.cevi_session_id || req.cookies?.cevi_session_id;
  if (sessionId && activeSessions.has(sessionId)) {
    return activeSessions.get(sessionId);
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
  const sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now();
  activeSessions.set(sessionId, {
    ...sessionData,
    createdAt: Date.now()
  });

  res.cookie('cevi_session_id', sessionId, {
    httpOnly: true,
    secure: envConfig.auth.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Tage
  });

  return sessionId;
}

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------

// Öffentliche Konfiguration für das Frontend
app.get('/api/config', (req, res) => {
  res.json({
    appName: envConfig.app.name,
    appEnv: envConfig.app.env,
    nodeEnv: envConfig.app.nodeEnv,
    isLocal: envConfig.app.isLocal,
    isDevelopment: envConfig.app.isDevelopment,
    isProduction: envConfig.app.isProduction,
    isMock: envConfig.ceviDb.useMock,
    isPreparationMode: ceviDbService.isPreparationMode(),
    serviceTokenConfigured: Boolean(envConfig.ceviDb.serviceToken),
    ceviDbBaseUrl: envConfig.ceviDb.baseUrl,
    ceviDbRedirectUri: envConfig.ceviDb.redirectUri,
    ceviWikiUrl: 'https://wiki.cevi.ch/index.php/Cevi.DB_API'
  });
});

// OAuth Login Initiation
app.get('/api/auth/login', (req, res) => {
  const state = 'state_' + Math.random().toString(36).substring(2);
  const authUrl = ceviDbService.getAuthorizationUrl(state);
  res.redirect(authUrl);
});

// Direkter Mock-Login für lokale Entwicklung & Vorführung
app.get('/api/auth/mock-login', (req, res) => {
  const mockUser = ceviDbService.getMockUser();
  setSession(res, {
    user: mockUser,
    accessToken: 'mock_token_cevi_' + Date.now(),
    isMock: true
  });
  res.redirect('/?login=success');
});

// OAuth 2.0 Callback von Cevi-DB (Hitobito)
app.get('/api/auth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('[OAuth Callback Error]:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?error=missing_code');
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
    isMock: session.isMock || true
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.signedCookies?.cevi_session_id || req.cookies?.cevi_session_id;
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
    const courses = await ceviDbService.getCourses(session?.accessToken);
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bisherige und angemeldete Kursteilnahmen
app.get('/api/participations', async (req, res) => {
  try {
    const session = getSession(req);
    const participations = await ceviDbService.getUserParticipations(
      session?.accessToken,
      session?.user?.id || session?.user?.sub
    );
    res.json({ participations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qualifikationen (J+S Lagersport/Trekking, Scharleiter, SLRG etc.)
app.get('/api/qualifications', async (req, res) => {
  try {
    const session = getSession(req);
    const qualifications = await ceviDbService.getUserQualifications(
      session?.accessToken,
      session?.user?.id || session?.user?.sub
    );
    res.json({ qualifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// AUSBIILUNGSBAUM & PATHFINDING API
// -----------------------------------------------------------------------------

// Liefert die vollständige Baumstruktur (Nodes & Kanten)
app.get('/api/tree/structure', (req, res) => {
  res.json({
    nodes: COURSE_NODES,
    edges: TREE_EDGES
  });
});

// Liefert die Bewertung des Ausbildungsbaums für den aktuellen Benutzer
const handleTreeEvaluation = async (req, res) => {
  try {
    const session = getSession(req);
    let person = null;

    if (session?.user) {
      const participations = await ceviDbService.getUserParticipations(session.accessToken, session.user.id || session.user.sub).catch(() => []);
      const qualifications = await ceviDbService.getUserQualifications(session.accessToken, session.user.id || session.user.sub).catch(() => []);
      
      const completed = participations
        .filter(p => p.status === 'confirmed' || p.status === 'completed' || p.certificate_issued || p.result?.includes('bestanden'))
        .map(p => (p.course_node_id || p.course_id || '').toLowerCase());

      const inProgress = participations
        .filter(p => p.status === 'in_progress' || p.status === 'registered' || p.result?.includes('Bevorstehend'))
        .map(p => (p.course_node_id || p.course_id || '').toLowerCase());

      person = {
        id: session.user.id || 'user_me',
        name: `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim() || 'Robin Notter',
        ceviname: session.user.nickname || session.user.ceviname || 'Siro',
        birthdate: session.user.birthday || '2001-08-14',
        completedCourses: completed.length > 0 ? completed : ['voku', 'heku', 'glk1', 'glk2', 'glk3', 'slk'],
        inProgressCourses: inProgress,
        qualifications: qualifications.map(q => (q.key || q.id || '').toLowerCase())
      };
    } else {
      // Demo-Leiter falls nicht eingeloggt
      person = {
        id: 'demo_leader',
        name: 'Robin Notter',
        ceviname: 'Siro',
        birthdate: '2001-08-14',
        completedCourses: ['voku', 'heku', 'glk1', 'glk2', 'glk3', 'slk', 'slrg_pool'],
        inProgressCourses: ['sec_berg'],
        qualifications: ['js_leiter_lst', 'cevi_stufenleiter', 'slrg_basis_pool']
      };
    }

    const evaluation = courseTreeEngine.evaluatePersonInTree(person);
    res.json({
      person,
      evaluation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/tree/evaluation', handleTreeEvaluation);
app.get('/api/tree/evaluate', handleTreeEvaluation);

// Berechnet den Pfad zu einem beliebigen Wunschkurs
app.post('/api/tree/pathfind', (req, res) => {
  try {
    const { targetCourseId, person } = req.body;
    if (!targetCourseId) {
      return res.status(400).json({ error: 'targetCourseId ist erforderlich' });
    }

    const activePerson = person || {
      id: 'demo_leader',
      name: 'Robin Notter',
      ceviname: 'Siro',
      birthdate: '2001-08-14',
      completedCourses: ['hlk', 'glk'],
      qualifications: ['js_leiter_lst', 'cevi_gruppenleiter']
    };

    const pathResult = courseTreeEngine.findPathToTarget(activePerson, targetCourseId);
    res.json(pathResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
app.get('/api/planner/overview', (req, res) => {
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
app.post('/api/planner/propose', (req, res) => {
  try {
    const { personId, targetCourseId, proposedSeason, notes, proposedBy } = req.body;
    const person = defaultDemoGroup.find(p => p.id === personId);
    if (!person) {
      return res.status(404).json({ error: 'Person nicht gefunden' });
    }

    const result = stufenleiterPlanningEngine.createNomination(
      person,
      {
        courseId: targetCourseId,
        season: proposedSeason || 'Herbst 2026',
        notes: notes || '',
        plannedBy: proposedBy || 'Stufenleitung'
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
  const validation = validateEnv();
  res.json({
    status: 'online',
    appEnv: envConfig.app.env,
    nodeEnv: envConfig.app.nodeEnv,
    useMock: envConfig.ceviDb.useMock,
    ceviDbBaseUrl: envConfig.ceviDb.baseUrl,
    ceviDbStatus: {
      connected: true,
      hasError: false,
      message: envConfig.ceviDb.useMock ? 'Mock-Modus aktiv' : 'Hitobito Live-API verbunden',
      lastCheck: new Date().toISOString()
    },
    git: {
      branch: 'develop',
      commit: '17197fd',
      version: 'v1.2.0'
    },
    configValidation: validation,
    timestamp: new Date().toISOString()
  });
});

// Statische Dateien aus public/ servieren
app.use(express.static(path.join(projectRoot, 'public')));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(projectRoot, 'public', 'index.html'));
});

// Server starten
const validation = validateEnv();
if (!validation.valid && envConfig.app.isProduction) {
  console.error('\n❌ FEHLER: Ungültige Konfiguration in Produktionsumgebung!');
  validation.errors.forEach(e => console.error('  -', e));
  process.exit(1);
}

app.listen(envConfig.server.port, envConfig.server.host, () => {
  console.log('\n======================================================');
  console.log(`[CEVI] ${envConfig.app.name.toUpperCase()}`);
  console.log('======================================================');
  console.log(`[HTTP] Server laeuft auf    : ${envConfig.server.url}`);
  console.log(`[ENV]  Umgebung (APP_ENV)   : ${envConfig.app.env.toUpperCase()}`);
  console.log(`[API]  Cevi-DB Schnittstelle: ${envConfig.ceviDb.baseUrl}`);
  console.log(`[MODE] Cevi-DB Modus        : ${envConfig.ceviDb.useMock ? 'Mock / Testdaten' : 'Live Cevi-DB'}`);
  console.log('======================================================\n');
});
