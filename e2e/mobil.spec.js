import { test, expect, openApp, THEMES } from './fixtures.js';

const burger = page => page.getByRole('button', { name: 'Menü ein-/ausblenden' });

// Ansicht über den Drawer öffnen, wie auf dem Handy
const VIEWS = [
  ['Ausbildungsbaum', '#panel-tree', async () => {}],
  ['Stufenleiter-Planer', '#panel-planner', async page => {
    await burger(page).click();
    await page.getByRole('button', { name: 'Stufenleiter-Planer' }).click();
  }],
  ['Profil', '#panel-profile', async page => {
    await burger(page).click();
    await page.locator('#userNavActions').click();
  }]
];

async function expectFitsScreenWidth(page) {
  // Webfonts ändern Textbreiten, der Drawer gleitet 200 ms: erst messen, wenn beides fertig ist
  await page.evaluate(() => Promise.all([
    document.fonts.ready,
    ...document.getAnimations()
      .filter(a => a.effect?.getComputedTiming().endTime !== Infinity)
      .map(a => a.finished)
  ]).then(() => {}));
  const { scrollWidth, clientWidth, cutOff } = await page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    // html und body haben overflow-x: clip, dort scrollt nie etwas: Zu Breites wird stattdessen abgeschnitten.
    // Erlaubt ist Überstand nur in einem eigenen Scroll-/Clip-Container (Planer-Tabelle, Baumkarte).
    const heldByContainer = el => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== 'visible') return true;
      }
      return false;
    };
    const cutOff = [...document.body.querySelectorAll('*')]
      .filter(el => el.checkVisibility({ visibilityProperty: true }))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return (r.right > clientWidth + 0.5 || r.left < -0.5) && !heldByContainer(el);
      })
      .map(el => el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
    return { scrollWidth, clientWidth, cutOff };
  });
  expect(scrollWidth, 'Seite scrollt horizontal').toBeLessThanOrEqual(clientWidth);
  expect(cutOff, 'Elemente ragen über den Bildschirmrand und werden abgeschnitten').toEqual([]);
}

test.describe('Mobil 375 x 812', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const [theme, label] of THEMES) {
    for (const [view, panel, openView] of VIEWS) {
      test(`kein horizontales Scrollen und nichts abgeschnitten: ${label}, ${view}`, async ({ page }) => {
        await page.addInitScript(value => localStorage.setItem('cevi_theme', value), theme);
        await openApp(page);
        await openView(page);

        await expect(page.locator(panel)).toBeVisible();
        await expect(page.locator('#appSidebar')).toBeHidden();
        await expectFitsScreenWidth(page);
      });
    }
  }

  test('Datenschutzerklärung passt ohne horizontales Scrollen auf den Bildschirm', async ({ page }) => {
    await page.goto('/datenschutz.html');
    await expect(page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })).toBeVisible();
    await expectFitsScreenWidth(page);
  });

  test('Hamburger öffnet und schliesst die Sidebar', async ({ page }) => {
    await openApp(page);
    const sidebar = page.locator('#appSidebar');

    await expect(sidebar).toBeHidden();
    await burger(page).click();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ausbildungsbaum' })).toBeVisible();
    await expectFitsScreenWidth(page);

    await burger(page).click();
    await expect(sidebar).toBeHidden();
    await expect(page.locator('#panel-tree')).toBeVisible();
  });

  test('Theme lässt sich in der aufgeklappten Sidebar wechseln', async ({ page }) => {
    await openApp(page);

    await burger(page).click();
    await page.locator('#themeDropdownTrigger').click();
    await page.getByRole('option', { name: 'Lagerfeuer' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'campfire');
    await expect(page.locator('#themeDropdownLabel')).toHaveText('Lagerfeuer');
  });
});
