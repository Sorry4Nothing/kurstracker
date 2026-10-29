import { defineConfig, devices } from '@playwright/test';

// Browser-Tests (npm run test:e2e). Eigener Server auf Port 3100, damit ein laufender Dev-Server auf 3000 unberührt bleibt.
// IPv4-Literal statt localhost: mit HOST=localhost (.env.local) lauscht der Server unter Windows nur auf [::1];
// scheitert dort eine Verbindung, weicht Chromium auf 127.0.0.1 aus und meldet irreführend ERR_CONNECTION_REFUSED.
const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  // Lokal 1 Wiederholung: Windows meldet beim Verbinden vereinzelt net::ERR_ADDRESS_IN_USE (jeder Test öffnet einen
  // neuen Browser-Kontext, ~500 Verbindungen pro Lauf bleiben in TIME_WAIT). Playwright zählt solche Tests als «flaky».
  retries: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'node src/server.js',
    url: baseURL,
    reuseExistingServer: false,
    env: {
      HOST: '127.0.0.1',
      PORT: '3100',
      CEVI_DB_PREPARATION_MODE: 'true',
      // Testdaten statt Live-Kursen, auch wenn .env.local einen Service-Token hat
      CEVI_DB_SERVICE_TOKEN: '',
      // Keine echte Datenbank aus .env.local: Vorschläge liegen im Arbeitsspeicher des Testservers
      DATABASE_URL: '',
      RATE_LIMIT_PROPOSALS_MAX: '100000',
      // Alle Browser-Tests laufen von einer IP gegen einen Server: Rate Limits hier nicht greifen lassen
      RATE_LIMIT_AUTH_MAX: '100000',
      RATE_LIMIT_API_MAX: '100000'
    }
  }
});
