// Technisches Log für die Abteilungsleitungen: fängt die Konsolenausgaben der App und jede API-Anfrage in einem Ringpuffer ab.
// shortcut: der Puffer liegt im Prozess-Speicher (nach Neustart leer, bei mehreren Prozessen je einer), für eine Aufbewahrung über Neustarts hinaus in die Datenbank schreiben (#29)

const MAX_ENTRIES = 1000;
const entries = [];
const startedAt = new Date();
const counters = { total: 0, ok: 0, clientError: 0, serverError: 0, durationSum: 0, durationMax: 0 };
let installed = false;

// Zeitreihen für die Diagramme: eine Minute pro Eintrag, die letzte Stunde
const WINDOW_MINUTES = 60;
const MAX_SAMPLES_PER_MINUTE = 500;
const MAX_ROUTES = 100;
const buckets = new Map(); // Minute (ms seit Epoche / 60000) -> { ok, clientError, serverError, durations }
const memory = new Map(); // Minute -> RSS in MB
const routes = new Map(); // Routenmuster -> { count, errors, durationSum, durationMax }

const minuteOf = ms => Math.floor(ms / 60000);

function prune(map, nowMinute) {
  for (const key of map.keys()) if (key <= nowMinute - WINDOW_MINUTES) map.delete(key);
}

function sampleMemory() {
  const minute = minuteOf(Date.now());
  memory.set(minute, Math.round(process.memoryUsage().rss / 1048576));
  prune(memory, minute);
}

const percentile = (sorted, p) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]) : 0);

// Die Präfixe der Konsolenzeilen sind historisch gewachsen: für den Filter zu wenigen Quellen zusammengefasst
const SOURCE_GROUPS = { CEVI: 'System', HTTP: 'System', ENV: 'System', MODE: 'System', Node: 'System', API: 'Cevi-DB', KURS: 'Cevi-DB', 'OAuth Callback': 'Anmeldung' };

function push(level, source, message) {
  entries.push({ time: new Date().toISOString(), level, source: SOURCE_GROUPS[source] ?? source, message });
  if (entries.length > MAX_ENTRIES) entries.shift();
}

// "[Sicherheit] 403 …" → Quelle "Sicherheit"; Zeilen ohne Präfix zählen als "System"
function split(line) {
  const match = /^\[([^\]]{1,40})\]\s*(.*)$/s.exec(line);
  return match ? [match[1], match[2]] : ['System', line];
}

// Ruft die Originale weiter auf: stdout und stderr bleiben für die Plattform unverändert
export function installConsoleCapture() {
  if (installed) return;
  installed = true;
  sampleMemory();
  setInterval(sampleMemory, 60000).unref();
  for (const [method, level] of [['log', 'info'], ['info', 'info'], ['warn', 'warn'], ['error', 'error']]) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      original(...args);
      const line = args.map(a => (typeof a === 'string' ? a : a?.stack || a?.message || String(a))).join(' ').replace(/[\r\n]+/g, ' ');
      // Banner-Zeilen beim Start und Node-Prozesswarnungen (z. B. von pg) gehören nicht als Fehler ins Log
      if (/^=+$/.test(line.trim())) return;
      const [source, message] = /^\(node:\d+\) \w*Warning/.test(line) ? ['Node', line.replace(/^\(node:\d+\)\s*/, '')] : split(line.trim());
      push(source === 'Node' ? 'warn' : level, source, message.slice(0, 600));
    };
  }
}

// Express-Middleware: eine Zeile pro API-Anfrage, ohne Query-String; actor ist die pseudonyme Personen-ID
export function requestLogger(actorOf) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0];
      // Uptime-Checks und die Log-Seite selbst würden den Puffer in Minuten füllen
      if (!path.startsWith('/api/') || path === '/api/health' || path === '/api/system/logs') return;
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      counters.total++;
      counters.durationSum += ms;
      counters.durationMax = Math.max(counters.durationMax, ms);
      const kind = res.statusCode >= 500 ? 'serverError' : res.statusCode >= 400 ? 'clientError' : 'ok';
      counters[kind]++;
      const minute = minuteOf(Date.now());
      const bucket = buckets.get(minute) ?? { ok: 0, clientError: 0, serverError: 0, durations: [] };
      bucket[kind]++;
      if (bucket.durations.length < MAX_SAMPLES_PER_MINUTE) bucket.durations.push(ms);
      buckets.set(minute, bucket);
      prune(buckets, minute);
      // Routenmuster statt Pfad: keine IDs im Log und eine begrenzte Zahl Schlüssel; nicht gefundene Pfade teilen sich einen
      const pattern = req.route ? req.baseUrl + req.route.path : '(nicht gefunden)';
      const route = routes.get(pattern) ?? (routes.size < MAX_ROUTES ? { count: 0, errors: 0, durationSum: 0, durationMax: 0 } : null);
      if (route) {
        route.count++;
        if (kind === 'serverError') route.errors++;
        route.durationSum += ms;
        route.durationMax = Math.max(route.durationMax, ms);
        routes.set(pattern, route);
      }
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      push(level, 'Anfrage', `${res.statusCode} ${req.method} ${path} ${Math.round(ms)} ms akteur=${actorOf(req)}`);
    });
    next();
  };
}

// Stacks verraten Pfade und Aufbau des Servers: an die Anzeige geht nur die Meldung bis zum ersten Stack-Frame
const withoutStack = message => message.split(/ at \S+ \(/)[0].trim();

export function snapshot(limit = 500) {
  sampleMemory();
  const nowMinute = minuteOf(Date.now());
  const series = [];
  const allDurations = [];
  for (let minute = nowMinute - WINDOW_MINUTES + 1; minute <= nowMinute; minute++) {
    const b = buckets.get(minute);
    const sorted = b ? [...b.durations].sort((x, y) => x - y) : [];
    allDurations.push(...sorted);
    series.push({
      time: new Date(minute * 60000).toISOString(),
      ok: b?.ok ?? 0,
      clientError: b?.clientError ?? 0,
      serverError: b?.serverError ?? 0,
      avgMs: sorted.length ? Math.round(sorted.reduce((a, d) => a + d, 0) / sorted.length) : null,
      p95Ms: sorted.length ? percentile(sorted, 0.95) : null,
      memoryMb: memory.get(minute) ?? null
    });
  }
  allDurations.sort((x, y) => x - y);
  return {
    series,
    p95Ms: percentile(allDurations, 0.95),
    routes: [...routes].map(([route, r]) => ({
      route,
      count: r.count,
      errors: r.errors,
      avgMs: Math.round(r.durationSum / r.count),
      maxMs: Math.round(r.durationMax)
    })).sort((a, b) => b.count - a.count).slice(0, 8),
    entries: entries.slice(-limit).reverse().map(e => ({ ...e, message: withoutStack(e.message) })),
    capacity: MAX_ENTRIES,
    requests: {
      total: counters.total,
      ok: counters.ok,
      clientError: counters.clientError,
      serverError: counters.serverError,
      avgMs: counters.total ? Math.round(counters.durationSum / counters.total) : 0,
      maxMs: Math.round(counters.durationMax)
    },
    process: {
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      node: process.version
    }
  };
}

// Nur für Tests
export function resetSystemLog() {
  entries.length = 0;
  buckets.clear();
  routes.clear();
  Object.assign(counters, { total: 0, ok: 0, clientError: 0, serverError: 0, durationSum: 0, durationMax: 0 });
}
