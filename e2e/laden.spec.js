import { test, expect } from './fixtures.js';

// Ladeanimation (#91): vor dem Ladetext dreht ein Ring, bis die Daten da sind; Fehler und «Bewegung reduzieren» bleiben ruhig
test.describe('Ladeanimation', () => {
  // Hält die Baumdaten zurück, damit «Lade Ausbildungsbaum...» stehen bleibt
  async function openWhileLoading(page) {
    await page.route('**/api/tree/structure', () => {});
    await page.goto('/');
    const placeholder = page.locator('#treeLevelsContainer > .loading-placeholder');
    await expect(placeholder).toBeVisible();
    return placeholder;
  }
  // subtree: true, sonst fehlt die Animation des Rings auf ::before
  const animations = placeholder => placeholder.evaluate(el => el.getAnimations({ subtree: true }).map(a => a.animationName));

  test('vor dem Ladetext dreht ein Ring, eine Fehlermeldung bleibt ruhig', async ({ page }) => {
    const placeholder = await openWhileLoading(page);
    expect(await animations(placeholder)).toEqual(['loading-spin']);
    await placeholder.evaluate(el => el.classList.add('text-danger'));
    await expect.poll(() => animations(placeholder)).toEqual([]);
  });

  test('mit «Bewegung reduzieren» steht der Ring still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const placeholder = await openWhileLoading(page);
    await expect.poll(() => animations(placeholder)).toEqual([]);
  });

  test('Zoom und «Zoom zurücksetzen» schieben die Ladezeile nicht aus dem Kartenrahmen', async ({ page }) => {
    const placeholder = await openWhileLoading(page);
    // Vor den Baumdaten richteten beide die Karte nach den Kursen aus, die Zeile rutschte links oben hinaus
    await page.getByRole('button', { name: 'Zoom zurücksetzen' }).click();
    await page.getByRole('button', { name: 'Baum vergrössern' }).click();
    const [row, frame] = await Promise.all([placeholder.boundingBox(), page.locator('#treeMapViewport').boundingBox()]);
    expect(row.x).toBeGreaterThanOrEqual(frame.x);
    expect(row.y).toBeGreaterThanOrEqual(frame.y);
  });
});
