import { test, expect, openApp, THEMES } from './fixtures.js';

async function expectTheme(page, theme, label) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#themeDropdownLabel')).toHaveText(label);
  await expect(page.locator('#themeDropdownMenu .custom-dropdown-item.active')).toHaveAttribute('data-value', theme);
  expect(await page.evaluate(() => localStorage.getItem('cevi_theme'))).toBe(theme);
}

test.describe('Theme-Wahl in der Sidebar', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('per Maus: jedes Theme färbt das Kopfband um und die Wahl übersteht das Neuladen', async ({ page }) => {
    const trigger = page.locator('#themeDropdownTrigger');
    const menu = page.locator('#themeDropdownMenu');
    const bandColour = () => page.locator('.app-topbar').evaluate(el => getComputedStyle(el).backgroundColor);
    const colours = new Set([await bandColour()]);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'cevi-tools');
    for (const [theme, label] of THEMES.slice(1)) {
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('option', { name: label }).click();
      await expect(menu).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expectTheme(page, theme, label);
      colours.add(await bandColour());
    }
    // Vier verschiedene Farben: kein Theme-Block fällt stillschweigend auf die Standardwerte zurück
    expect(colours.size).toBe(THEMES.length);

    const [theme, label] = THEMES.at(-1);
    await page.reload();
    await expectTheme(page, theme, label);
  });

  test('per Tastatur: Enter öffnet, Tab wählt aus, Enter übernimmt, Escape schliesst', async ({ page }) => {
    const trigger = page.locator('#themeDropdownTrigger');
    const menu = page.locator('#themeDropdownMenu');

    await trigger.press('Enter');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('option', { name: 'Cevi Klassik' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('option', { name: 'Sternennacht' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expectTheme(page, 'midnight', 'Sternennacht');
    await expect(trigger).toBeFocused(); // Fokus geht nach der Auswahl nicht verloren

    // Pfeiltasten wechseln zwischen den Optionen, Escape gibt den Fokus zurück
    await trigger.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('option', { name: 'Cevi Klassik' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Sternennacht' })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('option', { name: 'Cevi Klassik' })).toBeFocused();
    await page.keyboard.press('ArrowUp'); // erste Option: bleibt stehen
    await expect(page.getByRole('option', { name: 'Cevi Klassik' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expectTheme(page, 'midnight', 'Sternennacht');

    await page.reload();
    await expectTheme(page, 'midnight', 'Sternennacht');
  });

  test('Klick ausserhalb schliesst das Menü, ohne das Theme zu wechseln', async ({ page }) => {
    const menu = page.locator('#themeDropdownMenu');

    await page.locator('#themeDropdownTrigger').click();
    await expect(menu).toBeVisible();
    await page.locator('#topbarPageTitle').click();
    await expect(menu).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'cevi-tools');
  });
});

test('unbekanntes gespeichertes Theme fällt auf Cevi Klassik zurück', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cevi_theme', 'gletscher'));
  await openApp(page);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cevi-tools');
  await expect(page.locator('#themeDropdownLabel')).toHaveText('Cevi Klassik');
});

test('gespeichertes Theme gilt schon vor dem Start der JS-Module, nichts blitzt im Standard auf', async ({ page }) => {
  // app.js zurückhalten: So sieht die Seite aus, bevor theme.js läuft
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/app.js*', async route => { await held; await route.continue(); });
  await page.addInitScript(() => localStorage.setItem('cevi_theme', 'midnight'));
  await page.goto('/', { waitUntil: 'commit' });

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
  const background = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  await expect.poll(background).not.toBe('rgba(0, 0, 0, 0)'); // Stylesheets geladen
  const before = await background();

  release();
  await expect(page.locator('#themeDropdownLabel')).toHaveText('Sternennacht');
  expect(await background()).toBe(before);
});

test('Fokusring auf dem Kopfband ist in jedem Theme sichtbar, weiss wie die Schrift im Band', async ({ page }) => {
  await openApp(page);
  for (const [theme, label] of THEMES) {
    await page.evaluate(t => localStorage.setItem('cevi_theme', t), theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.keyboard.press('Tab'); // Tastatur-Modus, damit :focus-visible greift
    const brand = page.locator('.brand-link');
    await brand.focus();
    await expect(brand).toBeFocused();
    const { style, ring, bandText } = await brand.evaluate(el => ({
      style: getComputedStyle(el).outlineStyle,
      ring: getComputedStyle(el).outlineColor,
      bandText: getComputedStyle(document.querySelector('.brand-title')).color
    }));
    expect(style, label).not.toBe('none');
    expect(ring, label).toBe(bandText);
  }
});
