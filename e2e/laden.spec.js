import { test, expect } from './fixtures.js';

// Ladeanimation (#91): der Ladetext pulsiert, bis die Daten da sind; Fehler und «Bewegung reduzieren» bleiben ruhig
test.describe('Ladeanimation', () => {
  // Hält die Baumdaten zurück, damit «Lade Ausbildungsbaum...» stehen bleibt
  async function openWhileLoading(page) {
    await page.route('**/api/tree/structure', () => {});
    await page.goto('/');
    const placeholder = page.locator('#treeLevelsContainer > .loading-placeholder');
    await expect(placeholder).toBeVisible();
    return placeholder;
  }
  const animations = placeholder => placeholder.evaluate(el => el.getAnimations().map(a => a.animationName));

  test('Ladetext pulsiert, eine Fehlermeldung bleibt ruhig', async ({ page }) => {
    const placeholder = await openWhileLoading(page);
    expect(await animations(placeholder)).toEqual(['loading-pulse']);
    await placeholder.evaluate(el => el.classList.add('text-danger'));
    await expect.poll(() => animations(placeholder)).toEqual([]);
  });

  test('mit «Bewegung reduzieren» steht der Ladetext still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const placeholder = await openWhileLoading(page);
    await expect.poll(() => animations(placeholder)).toEqual([]);
  });
});
