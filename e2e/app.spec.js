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

test('Logo-Motiv sitzt in jedem Theme mittig in seiner Kachel', async ({ page }) => {
  await page.goto('/');
  for (const [theme] of THEMES) {
    await page.evaluate(value => localStorage.setItem('cevi_theme', value), theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Mitte des gezeichneten Motivs gegen die Mitte der Kachel; eine viewBox-Einheit sind hier 0.18 px
    const [dx, dy] = await page.locator('.brand-logo-svg').evaluate(svg => {
      const plate = svg.getBoundingClientRect();
      const motif = svg.querySelector('g').getBoundingClientRect();
      return [motif.x + motif.width / 2 - (plate.x + plate.width / 2), motif.y + motif.height / 2 - (plate.y + plate.height / 2)];
    });
    expect(Math.abs(dx), `${theme}: waagrecht`).toBeLessThan(0.2);
    expect(Math.abs(dy), `${theme}: senkrecht`).toBeLessThan(0.2);
  }
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

  test('vier Bereiche scrollen je für sich, die Seite selbst steht auf dem Desktop still', async ({ page }) => {
    // 1280 x 720 ist die engste dieser Grössen: neben der Sidebar bleiben dem Profil 960px
    for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size);
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(overflow, `Seite scrollt bei ${size.width} x ${size.height}`).toBeLessThanOrEqual(0);
    }

    // Jeder Bereich hat genau eine Scrollfläche: per Tab erreichbar und nach seiner Überschrift benannt
    const names = ['Cevi-DB Stammdaten', 'J+S & Cevi Anerkennungen', 'Ausbildungs-Werdegang', 'Aktuelles Kursangebot (Cevi & J+S)'];
    await expect(page.locator('#panel-profile').getByRole('region')).toHaveCount(names.length);
    for (const name of names) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeInViewport({ ratio: 1 });
      const body = page.getByRole('region', { name, exact: true });
      await expect(body).toHaveAttribute('tabindex', '0');
      await body.focus();
      await expect(body).toBeFocused();
    }

    // Das Kursangebot ist länger als sein Feld und scrollt darin; Überschrift und Kopfzeile bleiben stehen
    const courses = page.getByRole('region', { name: 'Aktuelles Kursangebot (Cevi & J+S)' });
    expect(await courses.evaluate(el => [getComputedStyle(el).overflowY, getComputedStyle(el).overscrollBehaviorY, el.scrollHeight > el.clientHeight]))
      .toEqual(['auto', 'contain', true]);
    const fixed = [page.getByRole('heading', { name: 'Aktuelles Kursangebot (Cevi & J+S)' }), page.locator('.profile-page-hero')];
    const before = await Promise.all(fixed.map(el => el.boundingBox()));
    await courses.hover();
    await page.mouse.wheel(0, 600);
    await expect.poll(() => courses.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    expect(await Promise.all(fixed.map(el => el.boundingBox()))).toEqual(before);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('in niedrigen Fenstern und auf dem Handy scrollt die Seite, die Bereiche bleiben gross und scrollen in sich', async ({ page }) => {
    const courses = page.getByRole('region', { name: 'Aktuelles Kursangebot (Cevi & J+S)' });
    // 1280 x 600: zwei Spalten, aber zu niedrig, um das Fenster zu füllen (z. B. Full HD mit 150 % Skalierung)
    for (const size of [{ width: 1280, height: 600 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(size);
      const label = `${size.width} x ${size.height}`;
      expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), `Seite scrollt nicht bei ${label}`).toBe(true);
      // Am Ende des Felds scrollt das Mausrad die Seite weiter, statt im Feld hängen zu bleiben
      const [overflowY, overscroll, scrolls, share] = await courses.evaluate(el => [
        getComputedStyle(el).overflowY, getComputedStyle(el).overscrollBehaviorY, el.scrollHeight > el.clientHeight, el.clientHeight / innerHeight
      ]);
      expect([overflowY, overscroll, scrolls], label).toEqual(['auto', 'auto', true]);
      // Höchstens 60 % der Fensterhöhe, aber nicht zusammengedrückt
      expect(share, label).toBeGreaterThan(0.5);
      expect(share, label).toBeLessThanOrEqual(0.6);
    }
  });

  test('die vier Bereiche heben sich in allen Themes von der Seite ab, ihre Karten vom Feld', async ({ page }) => {
    for (const [theme, label] of THEMES) {
      // Wie setAppTheme in theme.js, ohne die gespeicherte Wahl zu ändern
      await page.evaluate(id => document.documentElement.setAttribute('data-theme', id), theme);
      const problems = await page.evaluate(() => {
        const style = el => getComputedStyle(el);
        // Deckend und anders als der Grund; ein fehlender Rahmen oder eine fehlende Fläche ist transparent
        const standsOut = (colour, ground) => colour.startsWith('rgb(') && colour !== ground;
        const pageBg = style(document.querySelector('.app-main')).backgroundColor;
        return [...document.querySelectorAll('#panel-profile .bento-card')].flatMap(panel => {
          const { borderTopStyle, borderTopWidth, borderTopColor, backgroundColor } = style(panel);
          const name = panel.querySelector('h3').textContent;
          return [
            borderTopStyle === 'solid' && parseFloat(borderTopWidth) >= 1 && standsOut(borderTopColor, pageBg) ? [] : `${name}: kein sichtbarer Rahmen`,
            standsOut(backgroundColor, pageBg) ? [] : `${name}: Fläche wie die Seite`,
            [...panel.querySelectorAll('.card')].every(card => standsOut(style(card).backgroundColor, backgroundColor)) ? [] : `${name}: Karte wie das Feld`
          ].flat();
        });
      });
      expect(problems, label).toEqual([]);
    }
  });
});
