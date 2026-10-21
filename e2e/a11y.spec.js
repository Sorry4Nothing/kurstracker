import AxeBuilder from '@axe-core/playwright';
import { test, expect, openApp, THEMES } from './fixtures.js';

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
// Nur diese Stufen lassen den Test scheitern; leichtere Verstösse stehen im Anhang «axe» des Reports
const BLOCKING = ['serious', 'critical'];

const showView = view => page => page.evaluate(id => window.switchTab(id), view);

// Die drei Ansichten, ausgehend von der frisch geladenen App (Baum)
const VIEWS = [
  ['Ausbildungsbaum', async () => {}],
  ['Stufenleiter-Planer', showView('planner')],
  ['Profil', showView('profile')]
];

// Eigene Seite ausserhalb der App, im gespeicherten Theme
const PRIVACY = ['Datenschutzerklärung', async page => {
  await page.goto('/datenschutz.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })).toBeVisible();
}];

const SCENARIOS = [
  ...VIEWS,
  ['Theme-Menü offen', async page => {
    await page.locator('#themeDropdownTrigger').click();
    await expect(page.locator('#themeDropdownMenu')).toBeVisible();
  }],
  ['Kategorie-Menü im Profil offen', async page => {
    await showView('profile')(page);
    await page.locator('#categoryDropdownTrigger').click();
    await expect(page.locator('#categoryDropdownMenu')).toBeVisible();
  }],
  ['Dialog «Kurs vorschlagen» offen', async page => {
    await showView('planner')(page);
    await page.getByRole('button', { name: 'Vorschlagen' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Kurs vorschlagen' })).toBeVisible();
  }],
  ['Kurs im Baum gewählt', async page => {
    await page.getByRole('button', { name: /Gruppenleiterkurs 3/ }).click();
    await expect(page.locator('#inspectorTitle')).toContainText('Gruppenleiterkurs 3');
  }],
  ['Profil mit Foto', async page => {
    // Der Mock-Benutzer hat kein Foto (picture_url null): ohne Foto bleiben beide <img> verborgen und ungeprüft
    await page.route('/api/auth/me', async route => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({ response, json: { ...body, user: { ...body.user, picture_url: '/apple-touch-icon.png' } } });
    });
    await openApp(page);
    await showView('profile')(page);
    await expect(page.locator('#navUserPhoto')).toBeVisible();
    await expect(page.locator('#profileHeroPhoto')).toBeVisible();
  }],
  PRIVACY
];

async function openAppInTheme(page, theme) {
  await page.addInitScript(value => localStorage.setItem('cevi_theme', value), theme);
  await openApp(page);
}

async function expectNoSeriousViolations(page, scenario) {
  // Menüs und Drawer blenden 200 ms ein: halb durchsichtig ergäben sie falsche Kontraste
  await page.evaluate(() => Promise.all([
    document.fonts.ready,
    ...document.getAnimations()
      .filter(a => a.effect?.getComputedTiming().endTime !== Infinity)
      .map(a => a.finished.catch(() => {}))
  ]).then(() => {}));
  const { violations, incomplete } = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze();
  // Doppelte IDs hinter aria-labelledby & Co. meldet axe nur «zur Prüfung» (reviewOnFail); hier sind sie immer ein Fehler
  const findings = [...violations, ...incomplete.filter(v => v.id === 'duplicate-id-aria')];
  await test.info().attach(`axe: ${scenario}`, { body: JSON.stringify(findings, null, 2), contentType: 'application/json' });

  const blocking = findings
    .filter(v => BLOCKING.includes(v.impact))
    .map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
  expect(blocking, `Schwere WCAG-2.1-AA-Verstösse in «${scenario}»`).toEqual([]);
}

function scanEach(themes, scenarios, size) {
  for (const [theme, label] of themes) {
    for (const [name, prepare] of scenarios) {
      test(`keine schweren WCAG-2.1-AA-Verstösse: ${label}, ${name}`, async ({ page }) => {
        await openAppInTheme(page, theme);
        await prepare(page);
        await expectNoSeriousViolations(page, `${label}, ${name}, ${size}`);
      });
    }
  }
}

test.describe('Barrierefreiheit Desktop 1440 x 900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  scanEach(THEMES, SCENARIOS, '1440 x 900');
});

test.describe('Barrierefreiheit Mobil 375 x 812', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // Standard-Theme und ein dunkles Theme. Die Ansichten im Handy-Layout (eigenes CSS) mit eingeklappter Sidebar:
  // aufgeklappt deckt sie den Inhalt fast ganz ab
  scanEach(THEMES.filter(([id]) => ['cevi-tools', 'midnight'].includes(id)), [
    ...VIEWS,
    ['Sidebar aufgeklappt', async page => {
      await page.getByRole('button', { name: 'Menü ein-/ausblenden' }).click();
      await expect(page.locator('#appSidebar')).toBeVisible();
    }],
    PRIVACY
  ], '375 x 812');
});
