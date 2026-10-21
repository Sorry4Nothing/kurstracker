import { test, expect, openApp } from './fixtures.js';

test.describe('Datenschutzerklärung', () => {
  test('ist im Footer jeder Ansicht verlinkt und führt zurück zur App', async ({ page }) => {
    await openApp(page);
    const link = page.locator('#appGlobalFooter').getByRole('link', { name: 'Datenschutz' });
    for (const view of ['planner', 'profile', 'tree']) {
      await page.evaluate(id => window.switchTab(id), view);
      await expect(link, view).toBeVisible();
    }

    await link.click();
    await expect(page).toHaveURL(/\/datenschutz\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Datenschutzerklärung');

    await page.getByRole('link', { name: 'Zurück zum Kurstracker' }).click();
    await expect(page.locator('#panel-tree')).toBeVisible();
  });

  test('erscheint im gespeicherten Farbschema', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cevi_theme', 'campfire'));
    await page.goto('/datenschutz.html');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'campfire');
  });
});
