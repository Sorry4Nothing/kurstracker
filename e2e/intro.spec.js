import { test, expect } from './fixtures.js';

// Login-Intro (#90): spielt nur direkt nach dem Login, dorthin leitet der Server mit /?login=success um
test.describe('Login-Intro', () => {
  test('spielt nach dem Login und öffnet dann die App', async ({ page }) => {
    await page.goto('/?login=success');
    const intro = page.locator('.login-intro');
    await expect(intro).toBeVisible();
    // Ohne den Parameter spielt ein Neuladen das Intro nicht erneut
    await expect(page).not.toHaveURL(/login=/);
    await expect(intro).toHaveCount(0, { timeout: 8000 });
    await expect(page.locator('#tabTree')).toBeVisible();
  });

  test('lässt sich per Tastatur überspringen, Neuladen spielt es nicht erneut', async ({ page }) => {
    await page.goto('/?login=success');
    const skip = page.getByRole('button', { name: 'Intro überspringen' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    // Ohne Überspringen dauert das Intro rund 3 s
    await expect(page.locator('.login-intro')).toHaveCount(0, { timeout: 1500 });
    await expect(page.locator('#tabTree')).toBeVisible();

    await page.reload();
    await expect(page.locator('#tabTree')).toBeVisible();
    await expect(page.locator('.login-intro')).toHaveCount(0);
  });

  test('Escape bricht das Intro ab', async ({ page }) => {
    await page.goto('/?login=success');
    await expect(page.locator('.login-intro')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.login-intro')).toHaveCount(0, { timeout: 1500 });
  });

  test('mit «Bewegung reduzieren» öffnet die App ohne Intro', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?login=success');
    await expect(page.locator('#tabTree')).toBeVisible();
    await expect(page.locator('.login-intro')).toHaveCount(0);
  });
});
