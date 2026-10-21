import { test, expect, openApp } from './fixtures.js';

const fetchOverview = async request => (await request.get('/api/planner/overview')).json();

test.describe('Stufenleiter-Planer', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Stufenleiter-Planer' }).click();
  });

  test('zeigt Gruppe, Kennzahlen und dringende Empfehlungen aus der Server-Analyse', async ({ page, request }) => {
    const { group, analysis } = await fetchOverview(request);
    const rows = page.locator('#plannerTableBody tr');

    await expect(rows).toHaveCount(group.length);
    for (const person of group) {
      await expect(rows.filter({ hasText: person.ceviname })).toHaveCount(1);
    }
    await expect(page.locator('#statPlannerTotal')).toHaveText(String(analysis.totalCount));
    await expect(page.locator('#statPlannerHlk')).toHaveText(String(analysis.summaryStats.readyForHlk));
    await expect(page.locator('#statPlannerGlk')).toHaveText(String(analysis.summaryStats.readyForGlk));
    await expect(page.locator('#statPlannerUrgent')).toHaveText(String(analysis.summaryStats.urgentRenewalCount));
    const urgent = analysis.analyzedParticipants.filter(p => p.recommendedCourses?.[0]?.priority === 'DRINGEND');
    await expect(rows.locator('.recommendation-pill.prio-urgent')).toHaveCount(urgent.length);
  });

  test('«Vorschlagen» öffnet den Dialog mit Person und Empfehlung, Abbrechen, X und Escape schliessen ihn', async ({ page, request }) => {
    const { analysis } = await fetchOverview(request);
    const { participant, recommendedCourses } = analysis.analyzedParticipants.find(p => p.recommendedCourses?.length);
    const modal = page.locator('#nominationModal');
    const opener = page.getByRole('row', { name: participant.ceviname }).getByRole('button', { name: 'Vorschlagen' });
    const layout = page.locator('.app-layout');

    await expect(modal).toBeHidden();
    for (const close of [
      () => page.getByRole('button', { name: 'Abbrechen' }).click(),
      () => page.getByRole('button', { name: 'Schliessen' }).click(),
      () => page.keyboard.press('Escape')
    ]) {
      await opener.click();
      await expect(page.getByRole('dialog', { name: 'Kurs vorschlagen' })).toBeVisible();
      await expect(modal).toHaveCSS('display', 'flex');
      await expect(page.getByLabel('Teilnehmer / Leiter')).toHaveValue(participant.ceviname);
      await expect(page.getByRole('combobox', { name: 'Zielkurs' })).toHaveValue(recommendedCourses[0].courseId);
      // Fokus springt in den Dialog, der Hintergrund ist für Tab und Screenreader gesperrt
      await expect(page.getByRole('combobox', { name: 'Zielkurs' })).toBeFocused();
      await expect(layout).toHaveJSProperty('inert', true);
      await close();
      await expect(modal).toBeHidden();
      // Fokus kehrt zum auslösenden Knopf zurück
      await expect(layout).toHaveJSProperty('inert', false);
      await expect(opener).toBeFocused();
    }
  });

  test('gespeicherter Vorschlag erscheint in der Liste der Kursvorschläge', async ({ page }) => {
    const badge = page.locator('#nominationsCountBadge');
    const cards = page.locator('#nominationsList .nomination-card');
    // Vorschläge liegen im Server-Speicher und bleiben für den ganzen Lauf; die eindeutige Notiz findet genau unseren.
    // Kein Vorher-Nachher-Zählen: ein neuer Vorschlag ersetzt den alten derselben Person, bei Wiederholung bliebe die Zahl gleich.
    const note = `Möchte Wasseraktivitäten leiten (${Date.now()})`;

    const row = page.locator('#plannerTableBody tr').first();
    const ceviname = await row.locator('strong').textContent();
    await row.getByRole('button', { name: 'Vorschlagen' }).click();
    await page.getByRole('combobox', { name: 'Zielkurs' }).selectOption('slrg_pool');
    await page.getByLabel('Bemerkungen').fill(note);
    await page.getByRole('button', { name: 'Vorschlag speichern' }).click();

    await expect(page.locator('#nominationModal')).toBeHidden();
    const ours = cards.filter({ hasText: note });
    await expect(ours).toHaveCount(1);
    await expect(ours).toContainText(ceviname);
    await expect(ours).toContainText('SLRG');
    await expect(badge).toHaveText(String(await cards.count()));
  });

  test('«Aktualisieren» lädt die Analyse neu, jede Kennzahl steht in ihrer Kachel', async ({ page }) => {
    // In der Demo-Gruppe sind Heku, GLK und dringend je 1: nur verschiedene Werte zeigen, ob eine Kachel die falsche Kennzahl liest
    await page.route('**/api/planner/overview', async route => {
      const response = await route.fetch();
      const data = await response.json();
      const summaryStats = { readyForHlk: 11, readyForGlk: 12, readyForSlk: 13, urgentRenewalCount: 14 };
      await route.fulfill({ response, json: { ...data, analysis: { ...data.analysis, totalCount: 10, summaryStats } } });
    });
    await page.getByRole('button', { name: 'Aktualisieren' }).click();

    await expect(page.locator('#statPlannerTotal')).toHaveText('10');
    await expect(page.locator('#statPlannerHlk')).toHaveText('11');
    await expect(page.locator('#statPlannerGlk')).toHaveText('12');
    await expect(page.locator('#statPlannerUrgent')).toHaveText('14');
  });
});
