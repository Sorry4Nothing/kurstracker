import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { envConfig, validateEnv } from './config/env.js';
import { ceviDbService } from './services/ceviDbService.js';

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
  if (!sessionId) return null;
  return activeSessions.get(sessionId) || null;
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

// Aktuell eingeloggter Benutzer
app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: session.user,
    isMock: session.isMock || false
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

// System Status & Diagnose
app.get('/api/system/status', (req, res) => {
  const validation = validateEnv();
  res.json({
    status: 'online',
    appEnv: envConfig.app.env,
    nodeEnv: envConfig.app.nodeEnv,
    useMock: envConfig.ceviDb.useMock,
    ceviDbBaseUrl: envConfig.ceviDb.baseUrl,
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
  console.log(`🌲  ${envConfig.app.name.toUpperCase()}`);
  console.log('======================================================');
  console.log(`🚀 Server läuft auf        : ${envConfig.server.url}`);
  console.log(`📍 Umgebung (APP_ENV)      : ${envConfig.app.env.toUpperCase()}`);
  console.log(`🏕️  Cevi-DB Schnittstelle  : ${envConfig.ceviDb.baseUrl}`);
  console.log(`📦 Cevi-DB Modus           : ${envConfig.ceviDb.useMock ? 'Mock / Testdaten' : 'Live Cevi-DB'}`);
  console.log('======================================================\n');
});
