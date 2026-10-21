import { test, expect, openApp, THEMES } from './fixtures.js';

// Ersetzt Felder einer echten Server-Antwort, z. B. um den Fall ohne Git-Tag zu erzwingen
const patchJson = patch => async route => {
  const response = await route.fetch();
  await route.fulfill({ response, json: { ...(await response.json()), ...patch } });
};

for (const [theme, label] of THEMES) {
  test(`App lädt im Theme ${label} ohne Konsolenfehler und fehlgeschlagene Anfragen`, async ({ page, problems }) => {
    await page.addInitScript(value => localStorage.setItem('cevi_theme', value), theme);
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('#themeDropdownLabel')).toHaveText(label);
    await expect(page.locator('.loading-placeholder')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}

test.describe('Footer', () => {
  test('Version bleibt ohne Git-Tag (version null) verborgen', async ({ page }) => {
    await page.route('**/api/system/status', patchJson({ version: null, appEnv: 'development' }));
    await page.goto('/');

    // Umgebung gesetzt = Statusantwort verarbeitet, erst dann ist «verborgen» aussagekräftig
    await expect(page.locator('#footerEnv')).toHaveText('Umgebung: DEVELOPMENT');
    await expect(page.locator('#footerDbStatus')).toContainText('Vorbereitungsmodus');
    await expect(page.locator('#footerVersion')).toHaveCount(1);
    await expect(page.locator('#footerVersion')).toBeHidden();
  });

  test('zeigt den Git-Tag, wenn der Server eine Version meldet', async ({ page }) => {
    await page.route('**/api/system/status', patchJson({ version: 'v2.4.0' }));
    await page.goto('/');

    await expect(page.locator('#footerVersion')).toBeVisible();
    await expect(page.locator('#footerVersionTag')).toHaveText('v2.4.0');
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('alle drei Ansichten sind über die Sidebar und die Profilkarte erreichbar', async ({ page }) => {
    const title = page.locator('#topbarPageTitle');
    const navTree = page.getByRole('button', { name: 'Ausbildungsbaum' });
    const navPlanner = page.getByRole('button', { name: 'Stufenleiter-Planer' });
    const card = page.locator('#userNavActions');

    await expect(page.locator('#panel-tree')).toBeVisible();
    await expect(title).toHaveText('Ausbildungsbaum');
    // Desktop: Sidebar steht fest, der Hamburger ist nur im Drawer-Layout da
    await expect(page.getByRole('button', { name: 'Menü ein-/ausblenden' })).toBeHidden();

    await navPlanner.click();
    await expect(page.locator('#panel-planner')).toBeVisible();
    await expect(page.locator('#panel-tree')).toBeHidden();
    await expect(title).toHaveText('Stufenleiter-Planer');
    await expect(navPlanner).toHaveClass(/active/);
    await expect(navTree).not.toHaveClass(/active/);

    await card.click();
    await expect(page.locator('#panel-profile')).toBeVisible();
    await expect(page.locator('#panel-planner')).toBeHidden();
    await expect(title).toHaveText('Mein Profil & Qualifikationen');
    await expect(card).toHaveClass(/active/);
    await expect(navPlanner).not.toHaveClass(/active/);

    await navTree.click();
    await expect(page.locator('#panel-tree')).toBeVisible();
    await expect(page.locator('#panel-profile')).toBeHidden();
    await expect(navTree).toHaveClass(/active/);
    await expect(card).not.toHaveClass(/active/);
  });

  test('Knopf «Profil & Cockpit» öffnet das Profil per Leertaste und Enter', async ({ page }) => {
    // Die Karte ist nur Klickfläche für die Maus, auf der Tastatur bedient man ihren Knopf
    const card = page.locator('#userNavActions');
    const button = card.getByRole('button', { name: 'Profil & Cockpit' });

    await button.press('Space');
    await expect(page.locator('#panel-profile')).toBeVisible();
    await expect(card).toHaveClass(/active/);

    await page.getByRole('button', { name: 'Ausbildungsbaum' }).click();
    await expect(page.locator('#panel-tree')).toBeVisible();

    await button.press('Enter');
    await expect(page.locator('#panel-profile')).toBeVisible();
  });

  test('Knopf «Profil & Cockpit» in der Profilkarte öffnet das Profil', async ({ page }) => {
    await page.getByRole('button', { name: 'Profil & Cockpit' }).click();
    await expect(page.locator('#panel-profile')).toBeVisible();
    await expect(page.locator('#topbarPageTitle')).toHaveText('Mein Profil & Qualifikationen');
  });
});

test('Profilkarte zeigt den Benutzer aus /api/auth/me, Planer nur mit Planer-Rolle', async ({ page }) => {
  await page.route('**/api/auth/me', async route => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: { ...data, canUsePlanner: false, user: { ...data.user, first_name: 'Lena', last_name: 'Graf', nickname: 'Wiesel' } }
    });
  });
  await openApp(page);

  await expect(page.locator('#navUserRealname')).toHaveText('Lena Graf');
  await expect(page.locator('#navUserCeviname')).toHaveText('Wiesel');
  await expect(page.locator('#navUserInitials')).toHaveText('LG');
  await expect(page.locator('#profileHeroCeviname')).toHaveText('«Wiesel»');
  await expect(page.getByRole('button', { name: 'Stufenleiter-Planer' })).toBeHidden();
});

test.describe('Profil', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.locator('#userNavActions').click();
  });

  test('zeigt Anerkennungen, Werdegang und Kursangebot aus der API', async ({ page, request }) => {
    const [quals, history, courses] = await Promise.all(
      ['/api/user/qualifications', '/api/user/history', '/api/courses'].map(async url => (await request.get(url)).json())
    );

    // Titel in API-Reihenfolge: prüft Anzahl und Inhalt, z. B. dass der Werdegang course_title zeigt statt «Cevi Kurs»
    await expect(page.locator('#qualsContainer .qual-card .card-title')).toHaveText(quals.map(q => q.title));
    await expect(page.locator('#historyContainer .timeline-item h4')).toHaveText(history.map(h => h.course_title));
    await expect(page.locator('#coursesContainer > .card .card-title')).toHaveText(courses.map(c => c.title));
    await expect(page.locator('#coursesContainer')).not.toContainText('undefined');
  });

  test('Kurssuche und Kategoriefilter grenzen das Kursangebot ein', async ({ page, request }) => {
    const courses = await (await request.get('/api/courses')).json();
    const cards = page.locator('#coursesContainer > .card');
    const search = page.getByPlaceholder('Kurs suchen');
    const safety = courses.filter(c => c.category === 'Sicherheit');
    const target = safety[0];

    // Suche nach dem Kurscode, klein geschrieben: genau dieser Kurs bleibt übrig
    await search.fill(target.code.toLowerCase());
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(target.title);
    await search.fill('');
    await expect(cards).toHaveCount(courses.length);

    await page.locator('#categoryDropdownTrigger').click();
    await page.getByRole('option', { name: 'Sicherheit & SLRG' }).click();
    await expect(page.locator('#categoryDropdownLabel')).toHaveText('Sicherheit & SLRG');
    await expect(cards).toHaveCount(safety.length);
    await expect(cards.locator('.card-category')).toHaveText(safety.map(() => 'Sicherheit'));

    // Suche und Kategorie wirken zusammen
    const other = courses.find(c => c.category !== 'Sicherheit');
    await search.fill(other.code);
    await expect(cards).toHaveCount(0);

    await search.fill('');
    await page.locator('#categoryDropdownTrigger').click();
    await page.getByRole('option', { name: 'Alle Kategorien' }).click();
    await expect(cards).toHaveCount(courses.length);
  });
});
