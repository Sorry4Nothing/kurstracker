import { test, expect, openApp } from './fixtures.js';

const fetchOverview = async request => (await request.get('/api/planner/overview')).json();

// Eigene Dropdowns im Dialog: Auslöser öffnen, Eintrag nach Wert oder Text wählen
const menuItems = (page, selectId) => page.locator(`#${selectId} + .custom-dropdown .custom-dropdown-item`);
async function choose(page, selectId, value) {
  await page.locator(`#${selectId}Trigger`).click();
  await page.locator(`#${selectId} + .custom-dropdown [data-value="${value}"]`).click();
}
async function chooseByText(page, selectId, text) {
  await page.locator(`#${selectId}Trigger`).click();
  await menuItems(page, selectId).filter({ hasText: text }).click();
}
// Dialog über «Person hinzufügen» der ersten Stufe öffnen
async function openAddDialog(page) {
  await page.locator('#plannerStufeTrigger').click();
  await page.getByRole('option').nth(1).click();
  await page.locator('.proposal-group').getByRole('button', { name: 'Person hinzufügen' }).click();
}

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
      await expect(rows.filter({ hasText: participant.ceviname }).locator('.qual-badge')).toHaveText(completedCourseCodes);
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

  test('«Person hinzufügen» öffnet den Dialog, Abbrechen, X und Escape schliessen ihn', async ({ page }) => {
    const modal = page.locator('#nominationModal');
    const layout = page.locator('.app-layout');
    await page.locator('#plannerStufeTrigger').click();
    await page.getByRole('option').nth(1).click();
    const opener = page.locator('.proposal-group').getByRole('button', { name: 'Person hinzufügen' });

    await expect(modal).toBeHidden();
    for (const close of [
      () => page.getByRole('button', { name: 'Abbrechen' }).click(),
      () => page.getByRole('button', { name: 'Schliessen' }).click(),
      () => page.keyboard.press('Escape')
    ]) {
      await opener.click();
      await expect(page.getByRole('dialog', { name: 'Kurs vorschlagen' })).toBeVisible();
      await expect(modal).toHaveCSS('display', 'flex');
      // Fokus springt in den Dialog, der Hintergrund ist für Tab und Screenreader gesperrt
      await expect(page.locator('#modalPersonPickTrigger')).toBeFocused();
      await expect(layout).toHaveJSProperty('inert', true);
      await close();
      await expect(modal).toBeHidden();
      // Fokus kehrt zum auslösenden Knopf zurück
      await expect(layout).toHaveJSProperty('inert', false);
      await expect(opener).toBeFocused();
    }
  });

  test('Escape schliesst zuerst ein offenes Dropdown, erst dann den Dialog', async ({ page }) => {
    await openAddDialog(page);
    const dropdown = page.locator('#modalCourseSelect + .custom-dropdown');
    await page.locator('#modalCourseSelectTrigger').click();
    await expect(dropdown).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(dropdown).not.toHaveClass(/open/);
    await expect(page.locator('#nominationModal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#nominationModal')).toBeHidden();
  });

  test('«Vorschlagen» übernimmt die Empfehlung des Systems ohne Dialog', async ({ page, request }) => {
    const { analysis } = await fetchOverview(request);
    const { participant } = analysis.analyzedParticipants.find(p => p.recommendedCourses?.length);
    const row = page.getByRole('row', { name: participant.ceviname });

    await row.getByRole('button', { name: 'Vorschlagen' }).click();
    await expect(page.locator('#nominationModal')).toBeHidden();
    const done = row.getByRole('button', { name: 'Vorgeschlagen' });
    await expect(done).toHaveAttribute('aria-disabled', 'true');
    await expect(done).toBeFocused();
    await expect(page.locator('#nominationsList')).toContainText(participant.ceviname);
    await expect(page.locator('#nominationsList')).not.toContainText('Nicht vom System vorgeschlagen');
    await expect(page.locator('#nominationsList')).toContainText('Vorgeschlagen von Siro');
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
    await openAddDialog(page);

    const option = id => page.locator(`#modalCourseSelect option[value="${id}"]`);
    await expect(option('glk3')).toHaveText('J+S-Leiter*innenkurs LS/T - ab 17 J.');
    // Die Testperson ist männlich: der Baum liefert für SLK «Stufenleiterkurs», der Dialog bleibt neutral
    await expect(option('slk')).toHaveText('Stufenleiter/-innen-Kurs (SLK) - ab 17 J.');
  });

  test('Vorschlagsdialog wählt das Jahr aus einer echten Durchführung', async ({ page, request }) => {
    // Testkurse haben feste Daten: die Uhr des Browsers vor ihre Termine stellen
    await page.clock.setFixedTime(new Date('2026-09-01T10:00:00'));
    await openApp(page);
    await page.getByRole('button', { name: 'Stufenleiter-Planer' }).click();
    const courses = await (await request.get('/api/courses')).json();
    const next = courses
      .filter(c => c.course_node_id === 'glk3' && c.start_date >= '2026-09-01')
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    const year = page.locator('#modalSeason');

    // Der Dialog wählt das Jahr des nächsten Termins des Zielkurses; ohne kommenden Termin gilt das laufende Jahr
    await openAddDialog(page);
    await choose(page, 'modalCourseSelect', 'glk3');
    await expect(year).toHaveValue(next.start_date.slice(0, 4));
    await expect(year.locator('option')).toHaveCount(4);
    await choose(page, 'modalCourseSelect', 'glk2');
    await expect(year).toHaveValue('2026');
    await choose(page, 'modalSeason', '2027');
    await expect(year).toHaveValue('2027');
    await expect(page.locator('#modalSeasonTrigger')).toHaveText('2027');
  });

  test('Vorschlag landet in der Liste der Stufe, Zwischenspeichern und Abgeben sperren sie, Zurückgeben öffnet sie (#131)', async ({ page }) => {
    const cards = page.locator('#nominationsList .nomination-card');
    const note = `Möchte Wasseraktivitäten leiten (${Date.now()})`;
    // Eine Stufe wählen: der Test bleibt auf deren Block beschränkt
    await page.locator('#plannerStufeTrigger').click();
    await page.getByRole('option').nth(1).click();
    const block = page.locator('.proposal-group');
    await expect(block).toHaveCount(1);

    const ceviname = await page.locator('#plannerTableBody tr').first().locator('strong').textContent();
    await block.getByRole('button', { name: 'Person hinzufügen' }).click();
    await chooseByText(page, 'modalPersonPick', ceviname);
    await choose(page, 'modalCourseSelect', 'slrg_pool');
    await page.getByLabel('Bemerkungen').fill(note);
    await page.getByRole('button', { name: 'Vorschlag übernehmen' }).click();

    await expect(page.locator('#nominationModal')).toBeHidden();
    await expect(block).toContainText('Nicht gespeichert');
    const ours = cards.filter({ hasText: note });
    await expect(ours).toHaveCount(1);
    await expect(ours).toContainText(ceviname);
    await expect(ours).toContainText('SLRG');
    await expect(page.locator('#nominationsCountBadge')).toHaveText(String(await cards.count()));

    await block.getByRole('button', { name: 'Zwischenspeichern' }).click();
    // Während des Speicherns ist die Liste gesperrt und ausgegraut
    await expect(page.locator('#nominationsList')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('.proposals-busy')).toBeVisible();
    await expect(page.locator('#toastRegion')).toContainText('Änderungen gespeichert');
    await expect(block).toContainText('Entwurf');
    await expect(block).not.toContainText('Nicht gespeichert');
    await expect(ours).toHaveCount(1);

    // Abgeben fragt nach: Escape bricht ab, die Stufe bleibt bearbeitbar
    await block.getByRole('button', { name: 'Abgeben' }).click();
    await expect(page.getByRole('alertdialog', { name: 'Vorschläge abgeben?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(block).not.toContainText('Abgegeben von');
    await block.getByRole('button', { name: 'Abgeben' }).click();
    await page.getByRole('alertdialog', { name: 'Vorschläge abgeben?' }).getByRole('button', { name: 'Abgeben' }).click();
    await expect(block).toContainText('Abgegeben von');
    await expect(block.getByRole('button', { name: 'Abgeben' })).toHaveCount(0);
    // Das Demo-Profil ist auch Abteilungsleitung: sie darf abgegebene Stände weiter anpassen, die Stufenleitung allein nicht
    await expect(block.getByRole('button', { name: 'Zurückgeben' })).toBeVisible();

    // Die Abteilungsleitung (Demo-Profil) sieht den abgegebenen Stand auf der eigenen Seite
    await page.locator('#tabProposals').click();
    await expect(page.locator('#proposalsOverviewList')).toContainText(note);
    await page.locator('#tabPlanner').click();

    await block.getByRole('button', { name: 'Zurückgeben' }).click();
    await page.getByRole('alertdialog', { name: /zurückgeben\?/ }).getByRole('button', { name: 'Zurückgeben' }).click();
    await expect(block.getByRole('button', { name: 'Abgeben' })).toBeVisible();
    await expect(ours).toHaveCount(1);

    await page.locator('#tabProposals').click();
    await expect(page.locator('#proposalsOverviewList')).not.toContainText(note);
  });

  test('Zurückgeben unter «Kursvorschläge» öffnet die Stufe im Planer, ohne dass die Seite neu geladen wird (#131)', async ({ page }) => {
    await page.locator('#plannerStufeTrigger').click();
    await page.getByRole('option').nth(1).click();
    const block = page.locator('.proposal-group');
    await block.getByRole('button', { name: 'Abgeben' }).click();
    await page.getByRole('alertdialog', { name: 'Vorschläge abgeben?' }).getByRole('button', { name: 'Abgeben' }).click();
    await expect(block).toContainText('Abgegeben von');

    await page.locator('#tabProposals').click();
    await page.locator('#proposalsOverviewList').getByRole('button', { name: 'Zurückgeben' }).first().click();
    await page.getByRole('alertdialog', { name: /zurückgeben\?/ }).getByRole('button', { name: 'Zurückgeben' }).click();
    await expect(page.locator('#toastRegion')).toContainText('zurückgegeben');

    await page.locator('#tabPlanner').click();
    await expect(block.getByRole('button', { name: 'Abgeben' })).toBeVisible();
    await block.getByRole('button', { name: 'Zwischenspeichern' }).click();
    await expect(page.locator('#toastRegion')).toContainText('Änderungen gespeichert');
  });

  test('«Person hinzufügen» verlangt eine Bemerkung, wenn das System den Kurs für die Person nicht vorsieht (#131)', async ({ page }) => {
    await page.locator('#plannerStufeTrigger').click();
    await page.getByRole('option').nth(1).click();
    const block = page.locator('.proposal-group');
    // Der Server-Speicher gilt für den ganzen Lauf: frühere Tests können Einträge in der Stufe hinterlassen haben
    const before = await block.locator('.nomination-card').count();
    await block.getByRole('button', { name: 'Person hinzufügen' }).click();

    const dialog = page.getByRole('dialog', { name: 'Kurs vorschlagen' });
    await expect(page.locator('#modalPersonPickTrigger')).toBeFocused();
    // Der Experten-Kurs ist für niemanden aus der Demo-Gruppe vorgesehen
    await choose(page, 'modalCourseSelect', 'experte');
    await expect(dialog.getByText('Das System sieht diese Person für diesen Kurs nicht vor')).toBeVisible();
    await expect(dialog.getByLabel('Bemerkungen')).toHaveAttribute('required', '');
    await dialog.getByRole('button', { name: 'Vorschlag übernehmen' }).click();
    await expect(dialog).toBeVisible();
    await expect(block.locator('.nomination-card')).toHaveCount(before);

    await dialog.getByLabel('Bemerkungen').fill('Leitet bereits ein Lager');
    await dialog.getByRole('button', { name: 'Vorschlag übernehmen' }).click();
    await expect(dialog).toBeHidden();
    await expect(block.locator('.nomination-card')).toHaveCount(before + 1);
    await expect(block.locator('.nomination-card').filter({ hasText: 'Leitet bereits ein Lager' })).toContainText('Nicht vom System vorgeschlagen');
    await expect(block.getByRole('button', { name: 'Person hinzufügen' })).toBeFocused();
  });

  test('«Aktualisieren» lädt die Analyse neu, jede Kennzahl steht in ihrer Kachel', async ({ page }) => {
    // In der Demo-Gruppe sind Heku, GLK und dringend je 1: nur verschiedene Werte zeigen, ob eine Kachel die falsche Kennzahl liest
    await page.route(/\/api\/planner\/overview/, async route => {
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
