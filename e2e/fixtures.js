import { test as base, expect } from '@playwright/test';

export { expect };

// Theme-IDs und Anzeigenamen wie in public/js/theme.js
export const THEMES = [
  ['cevi-tools', 'Cevi Klassik'],
  ['alpine-light', 'Morgenrot'],
  ['midnight', 'Sternennacht'],
  ['campfire', 'Lagerfeuer']
];

// Jeder Test scheitert, wenn die Seite einen JS- oder Konsolenfehler wirft oder eine Anfrage scheitert
export const test = base.extend({
  problems: [async ({ page }, use) => {
    const problems = [];
    page.on('pageerror', err => problems.push(`JS-Fehler: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') problems.push(`Konsolenfehler: ${msg.text()}`);
    });
    page.on('requestfailed', req => {
      const error = req.failure()?.errorText;
      // ERR_ABORTED: offene Anfragen, die beim Neuladen abgebrochen werden
      if (error !== 'net::ERR_ABORTED') problems.push(`Anfrage fehlgeschlagen: ${req.url()} (${error})`);
    });
    page.on('response', res => {
      if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    await use(problems);
    expect(problems, 'Fehler im Browser').toEqual([]);
  }, { auto: true }]
});

// Lädt die App; erst wenn kein Lade-Platzhalter mehr steht, sind Baum, Planer, Profil und Kursangebot gerendert
export async function openApp(page) {
  await page.goto('/');
  await expect(page.locator('.loading-placeholder')).toHaveCount(0);
}
