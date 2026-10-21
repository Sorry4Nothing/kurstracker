import { test, expect, openApp } from './fixtures.js';

const fetchStructure = async request => (await (await request.get('/api/tree/structure')).json()).nodes;
const zoomPercent = async page => parseInt(await page.locator('#treeZoomLabel').textContent(), 10);
// Tatsächlicher Massstab der Karte: gerenderte Breite eines Knotens durch seine Layout-Breite
const renderedScale = page => page.locator('#nodeCard-voku').evaluate(el => el.getBoundingClientRect().width / el.offsetWidth);
const ids = locator => locator.evaluateAll(els => els.map(el => el.id).sort());
const edges = locator => locator.evaluateAll(paths => [...new Set(paths.map(p => p.dataset.edge))].sort());

test.describe('Ausbildungsbaum', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('zeigt jeden Kurs genau einmal als 220 x 80 px grossen Knoten ohne Überlappung', async ({ page, request }) => {
    const courseIds = [...new Set(Object.values(await fetchStructure(request)).map(n => n.id))];
    const cards = page.locator('.tree-node-card');
    await expect(cards).toHaveCount(courseIds.length);

    const boxes = await cards.evaluateAll(els => els.map(el => ({
      id: el.id, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight
    })));
    expect(boxes.map(b => b.id).sort()).toEqual(courseIds.map(id => `nodeCard-${id}`).sort());
    expect(boxes.filter(b => b.w !== 220 || b.h !== 80)).toEqual([]);
    const overlapping = boxes.flatMap((a, i) => boxes.slice(i + 1)
      .filter(b => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
      .map(b => `${a.id} / ${b.id}`));
    expect(overlapping).toEqual([]);
  });

  test('jeder Kurs zeigt den Status aus der Baumbewertung des Profils', async ({ page, request }) => {
    const { evaluation } = await (await request.get('/api/tree/evaluation')).json();
    const shown = Object.fromEntries(await page.locator('.tree-node-card').evaluateAll(cards =>
      cards.map(card => [card.id.replace('nodeCard-', ''), /\bstatus-(\w+)/.exec(card.className)?.[1]])));
    expect(shown).toEqual(Object.fromEntries(Object.keys(shown).map(id => [id, evaluation.nodes[id].status.toLowerCase()])));
    // Das Demo-Profil hat Kurse in allen vier Zuständen, sonst wäre der Vergleich schwach
    expect(new Set(Object.values(shown))).toEqual(new Set(['completed', 'in_progress', 'available', 'locked']));
  });

  test('zeichnet jede Voraussetzung als Linie von Knotenkante zu Knotenkante', async ({ page, request }) => {
    const nodes = Object.values(await fetchStructure(request));
    const edgesFrom = key => [...new Set(nodes.flatMap(n => (n[key] || []).map(pre => `${pre}->${n.id}`)))].sort();
    const required = edgesFrom('prerequisites');
    const recommended = edgesFrom('recommendedPrerequisites');
    const lines = page.locator('#treeSvgLines path');
    await expect.poll(() => edges(lines)).toEqual([...required, ...recommended].sort());
    // Pflicht durchgezogen, empfohlene Vorstufe (Voku -> Heku -> GLK 1 -> GLK 2 -> GLK 3) gestrichelt
    expect(recommended).toContain('glk2->glk3');
    await expect.poll(() => edges(page.locator('#treeSvgLines path.is-recommended'))).toEqual(recommended);

    // Bei 100 % ist ein Bildschirmpixel ein Kartenpixel, sonst verschwinden kleine Versätze unter der Toleranz
    await page.getByRole('button', { name: 'Zoom zurücksetzen' }).click();
    await expect(page.locator('#treeZoomLabel')).toHaveText('100%');
    // Linie beginnt rechts in der Mitte des Vorgängers und endet links in der Mitte des Ziels
    const detached = await lines.evaluateAll(paths => paths.filter(path => {
      const [from, to] = path.dataset.edge.split('->');
      const a = document.getElementById(`nodeCard-${from}`).getBoundingClientRect();
      const b = document.getElementById(`nodeCard-${to}`).getBoundingClientRect();
      const toScreen = point => new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
      const start = toScreen(path.getPointAtLength(0));
      const end = toScreen(path.getPointAtLength(path.getTotalLength()));
      const near = (p, x, y) => Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5;
      return !near(start, a.right, a.top + a.height / 2) || !near(end, b.left, b.top + b.height / 2);
    }).map(path => path.dataset.edge));
    expect(detached).toEqual([]);
  });

  test('zeichnet jede Verbindung nur einmal, auch mit den Alias-Einträgen glk, hlk und mf', async ({ page }) => {
    const lines = page.locator('#treeSvgLines path');
    await expect(lines.first()).toBeAttached();

    const all = await lines.evaluateAll(paths => paths.map(p => p.dataset.edge));
    expect(all.filter((edge, i) => all.indexOf(edge) !== i), 'doppelt gezeichnete Verbindungen').toEqual([]);
  });

  test('Klick auf einen Kurs füllt den Inspektor und hebt den Pfad dorthin hervor', async ({ page, request }) => {
    const path = await (await request.get('/api/tree/path/glk3')).json();
    const highlighted = page.locator('.tree-node-card.is-path-highlight');
    const activeLines = page.locator('#treeSvgLines path.active-path');

    await page.getByRole('button', { name: /Gruppenleiterkurs 3/ }).click();
    await expect(page.locator('#inspectorTitle')).toContainText('Gruppenleiterkurs 3');
    await expect(page.locator('#inspectorPathSummary')).toHaveText(path.summary);
    await expect(page.locator('#inspectorChecks .check-item').first()).toBeVisible();
    await expect(page.locator('#nodeCard-glk3')).toHaveClass(/is-selected/);
    // Das Demo-Profil hat die empfohlenen Vorstufen absolviert, sie gehören zur Route
    await expect.poll(() => ids(highlighted)).toEqual(['nodeCard-glk1', 'nodeCard-glk2', 'nodeCard-heku', 'nodeCard-voku']);
    await expect.poll(() => edges(activeLines)).toEqual(['glk1->glk2', 'glk2->glk3', 'heku->glk1', 'voku->heku']);

    // Neuer Zielkurs: alte Auswahl und alter Pfad verschwinden
    await page.getByRole('button', { name: /Pioniertechnik/ }).click();
    await expect(page.locator('#inspectorTitle')).toContainText('Pioniertechnik');
    await expect(page.locator('#nodeCard-glk3')).not.toHaveClass(/is-selected/);
    await expect(page.locator('#nodeCard-pionier')).toHaveClass(/is-selected/);
    await expect.poll(() => ids(highlighted)).toEqual(['nodeCard-glk1', 'nodeCard-heku', 'nodeCard-voku']);
    await expect.poll(() => edges(activeLines)).toEqual(['glk1->pionier', 'heku->glk1', 'voku->heku']);
  });

  test('Enter auf einem fokussierten Kurs wählt ihn aus', async ({ page }) => {
    const node = page.getByRole('button', { name: /Vorkurs/ });

    await node.press('Enter');
    await expect(node).toBeFocused();
    await expect(node).toHaveClass(/is-selected/);
    await expect(page.locator('#inspectorTitle')).toContainText('Vorkurs (Voku)');
  });

  test('Zoom-Knöpfe ändern Massstab und Anzeige, begrenzt auf 45 % bis 160 %', async ({ page }) => {
    const label = page.locator('#treeZoomLabel');
    const zoomIn = page.getByRole('button', { name: 'Baum vergrössern' });
    const zoomOut = page.getByRole('button', { name: 'Baum verkleinern' });
    const start = await zoomPercent(page);

    await zoomIn.click();
    await expect(label).toHaveText(`${start + 15}%`);
    expect(await renderedScale(page)).toBeCloseTo((start + 15) / 100, 2);

    for (let i = 0; i < 12; i++) await zoomOut.click();
    await expect(label).toHaveText('45%');
    expect(await renderedScale(page)).toBeCloseTo(0.45, 2);

    for (let i = 0; i < 12; i++) await zoomIn.click();
    await expect(label).toHaveText('160%');
    expect(await renderedScale(page)).toBeCloseTo(1.6, 2);

    await page.getByRole('button', { name: 'Zoom zurücksetzen' }).click();
    await expect(label).toHaveText('100%');
    expect(await renderedScale(page)).toBeCloseTo(1, 2);
  });

  test('Mausrad zoomt die Karte', async ({ page }) => {
    const start = await zoomPercent(page);

    await page.locator('#treeMapViewport').hover();
    await page.mouse.wheel(0, -100);
    await expect.poll(() => zoomPercent(page)).toBeGreaterThan(start);
    await expect.poll(() => renderedScale(page)).toBeCloseTo((await zoomPercent(page)) / 100, 2);
  });

  test('Ziehen auf der freien Fläche verschiebt die Karte', async ({ page }) => {
    const node = page.locator('#nodeCard-voku');
    const before = await node.boundingBox();
    const viewport = await page.locator('#treeMapViewport').boundingBox();

    // Ecke oben links ist frei: dort liegt kein Knoten
    await page.mouse.move(viewport.x + 5, viewport.y + 5);
    await page.mouse.down();
    await page.mouse.move(viewport.x + 125, viewport.y + 65, { steps: 4 });
    await page.mouse.up();

    const after = await node.boundingBox();
    expect(after.x - before.x).toBeCloseTo(120, 0);
    expect(after.y - before.y).toBeCloseTo(60, 0);
  });
});
