import { test, expect, openApp } from './fixtures.js';
import { layoutRegionalCoords, pickStartCourseId } from '../public/js/tree-map.js';

// Das Mock-Profil gilt als Region Zürich: der Baum zeigt deren Kurse mit eigenen IDs
const REGION = 'zuerich';
const ID = {
  voku: 'zuerich_voku_2026', heku: 'zuerich_heku_m_2027', glk1: 'zuerich_glk1_f_2027', glk2: 'zuerich_glk2_2027',
  glk3: 'zuerich_glk3_fa_2027'
};

const fetchStructure = async request => (await (await request.get(`/api/tree/structure?region=${REGION}`)).json()).nodes;
const zoomPercent = async page => parseInt(await page.locator('#treeZoomLabel').textContent(), 10);
// Tatsächlicher Massstab der Karte: gerenderte Breite eines Knotens durch seine Layout-Breite
const renderedScale = page => page.locator(`#nodeCard-${ID.voku}`).evaluate(el => el.getBoundingClientRect().width / el.offsetWidth);
const ids = locator => locator.evaluateAll(els => els.map(el => el.id).sort());
const edges = locator => locator.evaluateAll(paths => [...new Set(paths.map(p => p.dataset.edge))].sort());

// Kurs der Startansicht, Regel wie in tree.js: erster bereiter Kurs in Kartenreihenfolge, sonst zuletzt absolvierter
async function startCourse(request) {
  const { evaluation } = await (await request.get(`/api/tree/evaluation?region=${REGION}`)).json();
  const nodes = await fetchStructure(request);
  layoutRegionalCoords(Object.keys(nodes), nodes); // dieselbe Anordnung wie im Browser, damit die Reihenfolge stimmt
  return pickStartCourseId(nodes, evaluation.nodes);
}

// Knoten, die nicht ganz im sichtbaren Ausschnitt der Karte liegen
const outsideMap = page => page.locator('.tree-node-card').evaluateAll(cards => {
  const map = document.getElementById('treeMapViewport').getBoundingClientRect();
  return cards.filter(card => {
    const r = card.getBoundingClientRect();
    return r.left < map.left || r.top < map.top || r.right > map.right || r.bottom > map.bottom;
  }).map(card => card.id);
});

// Leere Fläche zwischen Kartenrand und äusserstem Kurs, je Achse: [links, rechts] und [oben, unten]
const emptyBesideCourses = page => page.locator('.tree-node-card').evaluateAll(cards => {
  const map = document.getElementById('treeMapViewport').getBoundingClientRect();
  const rects = cards.map(card => card.getBoundingClientRect());
  const first = side => Math.min(...rects.map(r => r[side]));
  const last = side => Math.max(...rects.map(r => r[side]));
  return [[first('left') - map.left, map.right - last('right')], [first('top') - map.top, map.bottom - last('bottom')]]
    .map(pair => pair.map(px => Math.max(0, px)));
});

// Mit der Maus von einem Punkt im Kurs aus um dx / dy ziehen
async function dragFrom(page, box, dx, dy) {
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 20 + dx, box.y + 20 + dy, { steps: 4 });
  await page.mouse.up();
}

// «Baum verkleinern», bis sich die Anzeige nicht mehr ändert: dann zeigt die Karte die Übersicht
async function zoomOutFully(page) {
  const label = page.locator('#treeZoomLabel');
  let before;
  do {
    before = await label.textContent();
    await page.getByRole('button', { name: 'Baum verkleinern' }).click();
  } while (await label.textContent() !== before);
}

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

  test('Jugend+Sport-Kurse tragen unten rechts das runde J+S-Abzeichen, die übrigen keines', async ({ page }) => {
    const badge = id => page.locator(`#nodeCard-${id} .js-badge`);
    await expect(badge(ID.glk3)).toHaveCount(1);
    await expect(badge(ID.voku)).toHaveCount(0);
    await expect(badge(ID.glk2)).toHaveCount(0);
    await expect(badge('zuerich_level_up_2027')).toHaveCount(0);

    const [card, dot] = await Promise.all([page.locator(`#nodeCard-${ID.glk3}`).boundingBox(), badge(ID.glk3).boundingBox()]);
    expect(dot.width).toBe(dot.height);
    expect(dot.x + dot.width, 'rechts in der Karte').toBeLessThanOrEqual(card.x + card.width);
    expect(dot.y + dot.height, 'unten in der Karte').toBeLessThanOrEqual(card.y + card.height);
    expect(card.x + card.width - (dot.x + dot.width)).toBeLessThan(16);
    expect(card.y + card.height - (dot.y + dot.height)).toBeLessThan(16);
    await expect(page.locator('.legend-item .js-badge')).toHaveCount(1);
  });

  test('jeder Kurs zeigt den Status aus der Baumbewertung des Profils', async ({ page, request }) => {
    const { evaluation } = await (await request.get(`/api/tree/evaluation?region=${REGION}`)).json();
    const shown = Object.fromEntries(await page.locator('.tree-node-card').evaluateAll(cards =>
      cards.map(card => [card.id.replace('nodeCard-', ''), /\bstatus-(\w+)/.exec(card.className)?.[1]])));
    expect(shown).toEqual(Object.fromEntries(Object.keys(shown).map(id => [id, evaluation.nodes[id].status.toLowerCase()])));
    // Das Demo-Profil hat Kurse in allen drei Zuständen, sonst wäre der Vergleich schwach
    expect(new Set(Object.values(shown))).toEqual(new Set(['completed', 'available', 'locked']));
  });

  test('zeichnet jede Voraussetzung als Linie von Knotenkante zu Knotenkante', async ({ page, request }) => {
    const nodes = Object.values(await fetchStructure(request));
    const edgesFrom = key => [...new Set(nodes.flatMap(n => (n[key] || []).map(pre => `${pre}->${n.id}`)))].sort();
    const required = edgesFrom('prerequisites');
    const recommended = edgesFrom('recommendedPrerequisites');
    const lines = page.locator('#treeSvgLines path');
    await expect.poll(() => edges(lines)).toEqual([...required, ...recommended].sort());
    // Pflicht durchgezogen, empfohlene Vorstufe (Voku -> Heku -> GLK 1 -> GLK 2 -> GLK 3) gestrichelt
    expect(recommended).toContain(`${ID.glk2}->${ID.glk3}`);
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
    const path = await (await request.get(`/api/tree/path/${ID.glk3}?region=${REGION}`)).json();
    const highlighted = page.locator('.tree-node-card.is-path-highlight');
    const activeLines = page.locator('#treeSvgLines path.active-path');
    // Die Startansicht (100 %) zeigt nur einen Ausschnitt, die Übersicht alle Kurse
    await zoomOutFully(page);

    await page.getByRole('button', { name: /GLK 3/ }).click();
    await expect(page.locator('#inspectorTitle')).toContainText('Leiter*innenkurs');
    await expect(page.locator('#inspectorPathSummary')).toHaveText(path.summary);
    await expect(page.locator('#inspectorChecks .check-item').first()).toBeVisible();
    await expect(page.locator(`#nodeCard-${ID.glk3}`)).toHaveClass(/is-selected/);
    // Das Demo-Profil hat die empfohlenen Vorstufen absolviert, sie gehören zur Route
    await expect.poll(() => ids(highlighted)).toEqual([ID.glk1, ID.glk2, ID.heku, ID.voku].map(id => `nodeCard-${id}`).sort());
    await expect.poll(() => edges(activeLines)).toEqual([[ID.glk1, ID.glk2], [ID.glk2, ID.glk3], [ID.heku, ID.glk1], [ID.voku, ID.heku]].map(([a, b]) => `${a}->${b}`).sort());

    // Neuer Zielkurs: alte Auswahl und alter Pfad verschwinden
    const pionier = 'zuerich_pioniertechnik_modul_2027';
    await page.getByRole('button', { name: /Pioniertechnik-Mo/ }).click();
    await expect(page.locator('#inspectorTitle')).toContainText('Fortbildung Leiter*in');
    await expect(page.locator(`#nodeCard-${ID.glk3}`)).not.toHaveClass(/is-selected/);
    await expect(page.locator(`#nodeCard-${pionier}`)).toHaveClass(/is-selected/);
    await expect.poll(() => ids(highlighted)).toEqual([ID.glk1, ID.glk2, ID.glk3, ID.heku, ID.voku].map(id => `nodeCard-${id}`).sort());
    await expect.poll(() => edges(activeLines)).toEqual([[ID.glk1, ID.glk2], [ID.glk2, ID.glk3], [ID.glk3, pionier], [ID.heku, ID.glk1], [ID.voku, ID.heku]].map(([x, y]) => `${x}->${y}`).sort());
  });

  test('Kursdetail zeigt die nächsten Termine aus der Cevi-DB mit freien Plätzen und Anmeldelink', async ({ page, request }) => {
    // Testkurse haben feste Daten: die Uhr des Browsers vor ihre Termine stellen
    await page.clock.setFixedTime(new Date('2026-09-01T10:00:00'));
    await openApp(page);
    const glk3 = (await (await request.get('/api/courses')).json()).find(c => c.course_node_id === 'glk3');
    const dates = page.locator('#inspectorDates');
    await zoomOutFully(page);

    await page.getByRole('button', { name: /GLK 3/ }).click();
    await expect(dates).toContainText('10.10.2026 bis 17.10.2026');
    await expect(dates.locator('.meta-item', { hasText: 'Freie Plätze' })).toContainText(String(glk3.free_places));
    await expect(dates.getByRole('link', { name: /Zur Anmeldung in der Cevi-DB/ })).toHaveAttribute('href', glk3.registration_url);

    // Das Pioniertechnik-Modul der Testdaten liegt vor dem 1.9.2026
    await page.getByRole('button', { name: /Pioniertechnik-Mo/ }).click();
    await expect(dates).toHaveText('Keine kommenden Termine in der Cevi-DB.');
  });

  test('Enter auf einem fokussierten Kurs wählt ihn aus', async ({ page }) => {
    const node = page.getByRole('button', { name: /Vorkurs/ });

    await node.press('Enter');
    await expect(node).toBeFocused();
    await expect(node).toHaveClass(/is-selected/);
    await expect(page.locator('#inspectorTitle')).toContainText('Vorkurs');
  });

  test('Tab auf einen Kurs ausserhalb des Ausschnitts schiebt ihn ganz ins Bild', async ({ page }) => {
    // Voku ist der erste Kurs in der Tab-Reihenfolge und liegt links ausserhalb der Startansicht
    expect(await outsideMap(page)).toContain(`nodeCard-${ID.voku}`);
    await page.getByRole('button', { name: 'Zoom zurücksetzen' }).focus();
    await page.keyboard.press('Tab');

    await expect(page.locator(`#nodeCard-${ID.voku}`)).toBeFocused();
    expect(await outsideMap(page)).not.toContain(`nodeCard-${ID.voku}`);
  });

  test('Zoom-Knöpfe ändern Massstab und Anzeige: verkleinern bis zur Übersicht über den ganzen Baum, vergrössern bis 160 %', async ({ page }) => {
    const label = page.locator('#treeZoomLabel');
    const zoomIn = page.getByRole('button', { name: 'Baum vergrössern' });
    const start = await zoomPercent(page);

    await zoomIn.click();
    await expect(label).toHaveText(`${start + 15}%`);
    expect(await renderedScale(page)).toBeCloseTo((start + 15) / 100, 2);

    // Übersicht: jeder Kurs ganz im Bild, die Anzeige nennt den gerenderten Massstab (gerundet), höchstens 45 %
    await zoomOutFully(page);
    expect(await outsideMap(page)).toEqual([]);
    expect(Math.abs(await renderedScale(page) * 100 - await zoomPercent(page))).toBeLessThanOrEqual(0.5);
    expect(await zoomPercent(page)).toBeLessThanOrEqual(45);

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
    const node = page.locator(`#nodeCard-${ID.voku}`);
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

  test('Ziehen auf einem Kurs verschiebt die Karte, ohne ihn auszuwählen; Enter danach und ein Klick mit 3 px Bewegung wählen aus', async ({ page, request }) => {
    const node = page.locator(`#nodeCard-${await startCourse(request)}`);
    const title = page.locator('#inspectorTitle');
    const before = await node.boundingBox();

    await dragFrom(page, before, 60, -30);
    const after = await node.boundingBox();
    expect(after.x - before.x).toBeCloseTo(60, 0);
    expect(after.y - before.y).toBeCloseTo(-30, 0);
    await expect(node).not.toHaveClass(/is-selected/);
    await expect(title).toHaveText('Kurs auswählen');

    // Das Ziehen verschluckt nur seinen eigenen Klick
    await page.getByRole('button', { name: /Vorkurs/ }).press('Enter');
    await expect(title).toContainText('Vorkurs');

    const box = await node.boundingBox();
    await dragFrom(page, box, 3, 0);
    await expect(node).toHaveClass(/is-selected/);
    expect(await node.boundingBox(), 'Karte bleibt stehen').toEqual(box);
  });

  test('Ziehen wählt den Kurs auch dann nicht aus, wenn der Browser den Klick nicht auf die Karte umleitet', async ({ page, request }) => {
    // Ohne Pointer Capture landet der Klick nach dem Ziehen auf dem Kurs, wie in Browsern ohne Umleitung
    await page.addInitScript(() => { Element.prototype.setPointerCapture = () => {}; });
    await openApp(page);
    const node = page.locator(`#nodeCard-${await startCourse(request)}`);

    await dragFrom(page, await node.boundingBox(), 60, -30);
    await expect(node).not.toHaveClass(/is-selected/);
    await expect(page.locator('#inspectorTitle')).toHaveText('Kurs auswählen');
  });

  test('zurück im Baum zeigt die Karte wieder die Startansicht', async ({ page, request }) => {
    await zoomOutFully(page);
    await page.getByRole('button', { name: 'Profil & Cockpit' }).click();
    await expect(page.locator('#panel-profile')).toBeVisible();

    await page.getByRole('button', { name: 'Ausbildungsbaum' }).click();
    await expect(page.locator('#treeZoomLabel')).toHaveText('100%');
    expect(await outsideMap(page)).not.toContain(`nodeCard-${await startCourse(request)}`);
  });

  test('längere Inhalte scrollen im Inspektor, ein neuer Kurs steht wieder oben', async ({ page }) => {
    const inspector = page.locator('#treeInspector');
    const title = page.locator('#inspectorTitle');
    // Bei 1280 x 720 sind Wasser und Experte länger als der Inspektor
    await page.getByRole('button', { name: /Sicherheitsmodul Wasser/ }).press('Enter');
    await expect(title).toContainText('Wasser');

    const box = await inspector.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1000);
    await expect.poll(async () => {
      const last = await page.locator('#inspectorChecks .check-item').last().boundingBox();
      return last.y + last.height <= box.y + box.height;
    }, { message: 'letzter Punkt der Checkliste ins Bild gescrollt' }).toBe(true);

    await page.getByRole('button', { name: /Expert[*]innenkurs/ }).press('Enter');
    await expect(title).toContainText('Expert*innenkurs');
    expect(await inspector.evaluate(el => el.scrollTop)).toBe(0);
  });
});

// Startansicht: 100 %, damit die Kursnamen lesbar sind, und der aktuelle Kurs der Person ohne Verschieben im Bild
for (const [width, height] of [[1440, 900], [375, 812]]) {
  test.describe(`Ausbildungsbaum ${width} x ${height}`, () => {
    test.use({ viewport: { width, height } });

    test('startet bei 100 % mit dem aktuellen Kurs der Person ganz im Bild', async ({ page, request }) => {
      await openApp(page);
      await expect(page.locator('#treeZoomLabel')).toHaveText('100%');
      expect(await renderedScale(page)).toBeCloseTo(1, 2);

      const course = `nodeCard-${await startCourse(request)}`;
      expect(await outsideMap(page)).not.toContain(course);
      const box = await page.locator(`#${course}`).boundingBox();
      expect(box.y + box.height, 'ohne Scrollen der Seite sichtbar').toBeLessThanOrEqual(height);

      // Kein leerer Streifen statt Kursen: am Rand höchstens 24 px Fläche neben dem äussersten Kurs,
      // ausser die Kurse passen hinein und stehen in der Mitte
      for (const [before, after] of await emptyBesideCourses(page)) {
        expect(Math.abs(before - after) <= 1 || Math.max(before, after) <= 24.5, `leer ${before} / ${after} px`).toBe(true);
      }
    });

    test('verkleinern zeigt die Übersicht mit jedem Kurs ganz im Bild', async ({ page }) => {
      await openApp(page);
      await zoomOutFully(page);
      expect(await outsideMap(page)).toEqual([]);
    });
  });
}

// Touch: ein Finger verschiebt die Karte, ein Tipp wählt aus, auch wenn der Finger dabei etwas wandert
test.describe('Ausbildungsbaum mit Touch 375 x 812', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('Wischen auf einem Kurs verschiebt die Karte statt der Seite, der Tipp danach wählt ihn aus', async ({ page, request }) => {
    await openApp(page);
    const node = page.locator(`#nodeCard-${await startCourse(request)}`);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

    // Zügig wischen, wie mit dem Daumen
    const before = await node.boundingBox();
    await touch('touchStart', before.x + 20, before.y + 20);
    for (let i = 1; i <= 8; i++) await touch('touchMove', before.x + 20 + i * 7.5, before.y + 20 - i * 3.75);
    await touch('touchEnd');
    const after = await node.boundingBox();
    expect(after.x - before.x).toBeCloseTo(60, 0);
    expect(after.y - before.y).toBeCloseTo(-30, 0);
    expect(await page.evaluate(() => window.scrollY), 'Seite scrollt nicht mit').toBe(0);
    await expect(node).not.toHaveClass(/is-selected/);

    // Gleich danach ein Tipp, bei dem der Finger 8 px wandert: wählt aus, die Karte bleibt stehen
    await touch('touchStart', after.x + 20, after.y + 20);
    await touch('touchMove', after.x + 28, after.y + 20);
    await touch('touchEnd');
    await expect(node).toHaveClass(/is-selected/);
    expect(await node.boundingBox(), 'Karte bleibt stehen').toEqual(after);
  });
});

// Ab 1201 px: Baumfläche und Inspektor nebeneinander, bis zur Fusszeile, ohne dass die Seite scrollt
for (const [width, height] of [[1440, 900], [1280, 720], [1920, 1080]]) {
  test.describe(`Ausbildungsbaum mit Inspektor ${width} x ${height}`, () => {
    test.use({ viewport: { width, height } });

    test('Baumfläche und Inspektor schliessen bündig ab, mit gleichen Abständen untereinander und zur Fusszeile', async ({ page }) => {
      await openApp(page);
      // Ein Kurs mit langer Checkliste: bei 720 px Höhe scrollt sie im Inspektor, der Inspektor wächst nicht
      await page.getByRole('button', { name: /Sicherheitsmodul Wasser/ }).press('Enter');
      await expect(page.locator('#inspectorTitle')).toContainText('Wasser');

      const [canvas, inspector, footer] = await Promise.all(
        ['#treeCanvasWrapper', '#treeInspector', '#appGlobalFooter'].map(selector => page.locator(selector).boundingBox()));
      expect(Math.abs(inspector.y - canvas.y), 'Oberkanten').toBeLessThanOrEqual(1);
      expect(Math.abs(inspector.y + inspector.height - (canvas.y + canvas.height)), 'Unterkanten').toBeLessThanOrEqual(1);
      expect(inspector.width).toBeGreaterThanOrEqual(340);
      expect(inspector.width).toBeLessThanOrEqual(440);
      const gap = inspector.x - (canvas.x + canvas.width);
      const toFooter = footer.y - (canvas.y + canvas.height);
      expect(Math.abs(gap - toFooter), `Abstand zum Inspektor ${gap} px, zur Fusszeile ${toFooter} px`).toBeLessThanOrEqual(1);

      const { scrollHeight, clientHeight } = await page.evaluate(() => {
        const { scrollHeight, clientHeight } = document.documentElement;
        return { scrollHeight, clientHeight };
      });
      expect(scrollHeight, 'Seite scrollt vertikal').toBeLessThanOrEqual(clientHeight);
    });
  });
}
