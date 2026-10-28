import { test, expect, openApp } from './fixtures.js';

// Die Fehlerseiten antworten bewusst mit 401, 404 und 502: der Fixture-Check auf HTTP-Fehler gilt hier nicht
test.describe('Fehlerseiten', () => {
  test('unbekannte Adresse zeigt die 404-Seite und führt zurück zur App', async ({ page, problems }) => {
    const response = await page.goto('/gibt-es-nicht');
    expect(response.status()).toBe(404);
    problems.length = 0;
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seite nicht gefunden');

    await page.getByRole('link', { name: 'Zum Ausbildungsbaum' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#panel-tree')).toBeVisible();
  });

  test('abgelaufene Sitzung (401) führt auf die Anmelde-Seite, Neu anmelden bringt zurück in die App', async ({ page, problems }) => {
    // Die Sitzung läuft ab, während die App geladen wird
    await page.route('**/api/tree/regions', route => route.fulfill({ status: 401, json: { error: 'Nicht angemeldet' } }));
    await page.goto('/');
    await expect(page).toHaveURL(/\/fehler\/401$/);
    problems.length = 0;
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Du bist nicht angemeldet');

    await page.unroute('**/api/tree/regions');
    await page.getByRole('link', { name: 'Neu anmelden' }).click();
    await expect(page.locator('#panel-tree')).toBeVisible();
    await expect(page.locator('.loading-placeholder')).toHaveCount(0);
  });

  test('Cevi-DB fällt beim Start aus (502): Fehlerseite mit erneutem Versuch', async ({ page, problems }) => {
    await page.route('**/api/tree/regions', route => route.fulfill({ status: 502, json: { error: 'Die Cevi-DB antwortet nicht.' } }));
    await page.goto('/');
    await expect(page).toHaveURL(/\/fehler\/502$/);
    problems.length = 0;
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Die Cevi-DB antwortet nicht');

    await page.unroute('**/api/tree/regions');
    await page.getByRole('link', { name: 'Erneut versuchen' }).click();
    await expect(page.locator('#panel-tree')).toBeVisible();
  });

  test('die API-Ausgabe zeigt Fehlerstatus weiter an, statt auf die Fehlerseite zu springen', async ({ page, problems }) => {
    await openApp(page);
    await page.route('**/api/courses', route => route.fulfill({ status: 401, json: { error: 'Nicht angemeldet' } }));
    await page.evaluate(() => window.switchTab('api'));
    await expect(page.locator('#apiOutputList > details').filter({ hasText: 'GET /api/courses' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    problems.length = 0;
  });
});
