import { test, expect, openApp } from './fixtures.js';
import { formatEuropeanDateRange } from '../public/js/utils.js';

const fetchOverview = async request => (await request.get('/api/planner/overview')).json();
const range = course => formatEuropeanDateRange(course.start_date, course.end_date);

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
    // Abgeschlossene Kurse mit Kürzel aus den Kursdaten, nie der Alias «HLK»
    for (const { participant, completedCourseCodes } of analysis.analyzedParticipants) {
      await expect(rows.filter({ hasText: participant.ceviname }).locator('.badge')).toHaveText(completedCourseCodes);
    }
    await expect(page.locator('#plannerTableBody')).not.toContainText('HLK');
  });

  test('Spaltenformat bleibt gleich, mit und ohne Spalte Stufe', async ({ page }) => {
    const row = page.locator('#plannerTableBody tr').first();
    const styles = () => row.locator('td').evaluateAll(cells => cells.map(c => getComputedStyle(c).textAlign));
    await expect(page.locator('#plannerStufeHead')).toBeVisible();
    const withStufe = await styles();
    // Nur die Aktion steht rechts (und das Alter); die Empfehlung davor bleibt linksbündig
    expect(withStufe.at(-1)).toBe('right');
    expect(withStufe.at(-2)).not.toBe('right');

    await page.locator('#plannerStufeTrigger').click();
    await page.getByRole('option').nth(1).click();
    await expect(page.locator('#plannerStufeHead')).toBeHidden();
    const withoutStufe = await styles();
    expect(withoutStufe.at(-1)).toBe('right');
    expect(withoutStufe.at(-2)).not.toBe('right');
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

  test('Zielkurse im Dialog tragen die Titel aus dem Baum, Kurse mit m/w-Formen den neutralen', async ({ page }) => {
    // Wie mit Service-Token: applyKindLabels setzt bei GLK 3 den Titel der Cevi-DB und entfernt die m/w-Formen
    await page.route('**/api/tree/structure', async route => {
      const response = await route.fetch();
      const { nodes } = await response.json();
      const { titles, ...glk3 } = nodes.glk3;
      await route.fulfill({ response, json: { nodes: { ...nodes, glk3: { ...glk3, title: 'J+S-Leiter*innenkurs LS/T' } } } });
    });
    await openApp(page);
    await page.getByRole('button', { name: 'Stufenleiter-Planer' }).click();
    await page.getByRole('button', { name: 'Vorschlagen' }).first().click();

    const option = id => page.locator(`#modalCourseSelect option[value="${id}"]`);
    await expect(option('glk3')).toHaveText('J+S-Leiter*innenkurs LS/T - ab 17 J.');
    // Die Testperson ist männlich: der Baum liefert für SLK «Stufenleiterkurs», der Dialog bleibt neutral
    await expect(option('slk')).toHaveText('Stufenleiter/-innen-Kurs (SLK) - ab 17 J.');
  });

  test('Vorschlagsdialog wählt die Saison aus einer echten Durchführung', async ({ page, request }) => {
    // Testkurse haben feste Daten: die Uhr des Browsers vor ihre Termine stellen
    await page.clock.setFixedTime(new Date('2026-09-01T10:00:00'));
    await openApp(page);
    await page.getByRole('button', { name: 'Stufenleiter-Planer' }).click();
    const courses = await (await request.get('/api/courses')).json();
    const upcoming = id => courses.find(c => c.course_node_id === id && c.start_date >= '2026-09-01');
    const { analysis } = await fetchOverview(request);
    const item = analysis.analyzedParticipants.find(i => upcoming(i.recommendedCourses?.[0]?.courseId));
    const next = upcoming(item.recommendedCourses[0].courseId);
    const row = page.getByRole('row', { name: item.participant.ceviname });

    // Der Dialog wählt die Saison aus dem nächsten Termin des Zielkurses; ohne kommenden Termin bleibt sie frei
    await row.getByRole('button', { name: 'Vorschlagen' }).click();
    const season = page.getByLabel('Geplante Saison');
    const options = page.locator('#modalSeasonOptions option');
    await expect(season).toHaveValue(range(next));
    await expect(options).toHaveCount(1);
    await page.getByRole('combobox', { name: 'Zielkurs' }).selectOption('glk2');
    await expect(season).toHaveValue('');
    await expect(options).toHaveCount(0);
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

  test('Stufen-Dropdown filtert die Tabelle, «Alle Stufen» zeigt zusätzlich die Spalte Stufe (#107)', async ({ page, request }) => {
    const { group, groups } = await fetchOverview(request);
    const rows = page.locator('#plannerTableBody tr');
    const trigger = page.locator('#plannerStufeTrigger');
    const stufeHead = page.getByRole('columnheader', { name: 'Stufe', exact: true });
    expect(groups.length).toBeGreaterThan(1);

    // Ausgangslage: alle Stufen, Spalte «Stufe» sagt, wer wohin gehört
    await expect(page.locator('#plannerGroupTitle')).toHaveText('Alle Stufen');
    await expect(trigger).toContainText('Alle Stufen');
    await expect(stufeHead).toBeVisible();
    await expect(rows).toHaveCount(group.length);

    for (const stufe of groups) {
      await trigger.click();
      await page.getByRole('option', { name: stufe.name, exact: true }).click();
      const members = group.filter(p => p.groups.some(g => g.id === stufe.id));
      await expect(page.locator('#plannerGroupTitle')).toHaveText(`Stufe: ${stufe.name}`);
      await expect(trigger).toBeFocused();
      await expect(rows).toHaveCount(members.length);
      await expect(page.locator('#statPlannerTotal')).toHaveText(String(members.length));
      await expect(stufeHead).toBeHidden();
    }

    await trigger.click();
    await page.getByRole('option', { name: 'Alle Stufen' }).click();
    await expect(rows).toHaveCount(group.length);
    await expect(stufeHead).toBeVisible();
  });

  test('Klick auf einen Spaltenkopf sortiert, ein zweiter Klick kehrt um', async ({ page, request }) => {
    const { analysis } = await fetchOverview(request);
    const names = analysis.analyzedParticipants.map(a => a.participant.ceviname).sort((a, b) => a.localeCompare(b, 'de'));
    const firstNames = () => page.locator('#plannerTableBody tr td:first-child strong').allTextContents();
    const nameHead = page.getByRole('columnheader', { name: 'Name / Ceviname' });

    await nameHead.getByRole('button').click();
    await expect(nameHead).toHaveAttribute('aria-sort', 'ascending');
    expect(await firstNames()).toEqual(names);
    await nameHead.getByRole('button').click();
    await expect(nameHead).toHaveAttribute('aria-sort', 'descending');
    expect(await firstNames()).toEqual([...names].reverse());
  });
});
