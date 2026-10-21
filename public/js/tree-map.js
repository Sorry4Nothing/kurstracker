/**
 * Cevi Kurstracker - Ausbildungsbaum 2D Map Engine
 * Pan / Drag, Zoom, dynamische SVG Bézier-Kurven und Koordinaten-Layout
 */

export const COURSE_MAP_COORDS = {
  // Grundausbildung Backbone (durchgehende Reihe bei y = 250)
  voku: { x: 60, y: 250 },
  heku: { x: 330, y: 250 },
  glk1: { x: 600, y: 250 },
  glk2: { x: 870, y: 250 },
  glk3: { x: 1140, y: 250 },

  // Oberer Ast: Scharleitung & Fuehrung (ab GLK 3)
  slk: { x: 1440, y: 70 },
  al_seminar: { x: 1740, y: 70 },

  // Mittlerer Ast: J+S Kader & Lagerleitung (ab GLK 3)
  mf_lst: { x: 1440, y: 250 },
  llm: { x: 1740, y: 250 },
  experte: { x: 2040, y: 250 },
  js_coach: { x: 1740, y: 390 },

  // Unterer Ast: Sicherheit & Spezialisierung
  pionier: { x: 870, y: 530 },
  slrg_pool: { x: 1140, y: 530 },
  sec_wasser: { x: 1440, y: 530 },
  sec_berg: { x: 1440, y: 670 },
  sec_winter: { x: 1740, y: 670 }
};

export const mapTransform = {
  x: -250,
  y: 0,
  zoom: 0.88,
  isPanning: false,
  pointerId: null,
  startX: 0,
  startY: 0
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const CANVAS_WIDTH = 2360;
const CANVAS_HEIGHT = 840;

// Kurs, auf den die Startansicht zentriert (setzt tree.js ueber setupInteractiveMap)
let startCourseId = 'voku';

export function setupInteractiveMap(courseId = 'voku') {
  const viewport = document.getElementById('treeMapViewport');
  const canvas = document.getElementById('treeMapCanvas');
  const container = document.getElementById('treeCanvasWrapper');
  startCourseId = courseId;
  if (!viewport || !canvas || window._mapEventsInitialized) return;
  window._mapEventsInitialized = true;

  resetMapTransform();

  // Ziehen mit Maus, Finger oder Stift verschiebt die Karte, auch auf einem Kurs. Erst ab 4 px Bewegung (Finger und
  // Stift 15 px: so weit darf ein Tipp wandern), damit Klick und Tipp den Kurs auswaehlen; Pointer Capture erst dann,
  // sonst trifft der Klick den Kurs nicht mehr
  viewport.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    mapTransform.pointerId = e.pointerId;
    mapTransform.isPanning = false;
    mapTransform.startX = e.clientX - mapTransform.x;
    mapTransform.startY = e.clientY - mapTransform.y;
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== mapTransform.pointerId) return;
    // Loslassen nicht mitbekommen (z.B. ueber einem Kontextmenue): Ziehen beenden
    if (!e.buttons) return endDrag(e);
    const x = e.clientX - mapTransform.startX;
    const y = e.clientY - mapTransform.startY;
    if (!mapTransform.isPanning) {
      if (Math.hypot(x - mapTransform.x, y - mapTransform.y) <= (e.pointerType === 'mouse' ? 4 : 15)) return;
      mapTransform.isPanning = true;
      viewport.setPointerCapture(e.pointerId);
      container?.classList.add('is-panning');
    }
    mapTransform.x = x;
    mapTransform.y = y;
    applyMapTransform();
  });

  const endDrag = (e) => {
    if (e.pointerId !== mapTransform.pointerId) return;
    mapTransform.pointerId = null;
    container?.classList.remove('is-panning');
    // Der Klick nach dem Loslassen gehoert noch zum Ziehen (siehe unten), erst danach zuruecksetzen
    setTimeout(() => { mapTransform.isPanning = false; });
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Ein Finger verschiebt nur die Karte: sonst erkennt der Browser dazu eine Wischgeste, die den naechsten Tipp
  // verschluckt. Zwei Finger zoomen weiter die Seite
  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && e.cancelable) e.preventDefault();
  }, { passive: false });

  // Ein Ziehen waehlt den Kurs nicht aus, auf dem es begonnen hat; andere Klicks laufen weiter (Menues schliessen)
  viewport.addEventListener('click', (e) => {
    if (mapTransform.isPanning && e.target.closest('.tree-node-card')) e.stopPropagation();
  }, true);

  // Tastatur: einen fokussierten Kurs ausserhalb des Ausschnitts ganz ins Bild schieben. Der Browser wuerde
  // sonst den Viewport scrollen, das geht nur nach rechts und unten und am Verschieben vorbei
  viewport.addEventListener('focusin', (e) => {
    if (!e.target.matches('.tree-node-card:focus-visible')) return;
    viewport.scrollTo(0, 0);
    const view = viewport.getBoundingClientRect();
    const card = e.target.getBoundingClientRect();
    const shift = (start, end, min, max) => Math.max(min + 24 - start, 0) + Math.min(max - 24 - end, 0);
    mapTransform.x += shift(card.left, card.right, view.left, view.right);
    mapTransform.y += shift(card.top, card.bottom, view.top, view.bottom);
    applyMapTransform();
  });

  // Mausrad Zoom (fluessig zentriert auf Cursor)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoomAround(mapTransform.zoom * (e.deltaY < 0 ? 1.08 : 0.92), e.clientX - rect.left, e.clientY - rect.top, rect);
  }, { passive: false });
}

export function applyMapTransform() {
  const canvas = document.getElementById('treeMapCanvas');
  const zoomLabel = document.getElementById('treeZoomLabel');
  if (canvas) {
    canvas.style.transform = `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.zoom})`;
    canvas.style.setProperty('--map-zoom', mapTransform.zoom);
  }
  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(mapTransform.zoom * 100)}%`;
  }
}

export function zoomMap(delta) {
  const viewport = document.getElementById('treeMapViewport');
  const rect = viewport ? viewport.getBoundingClientRect() : { width: 1000, height: 600 };
  zoomAround(mapTransform.zoom + delta, rect.width / 2, rect.height / 2, rect);
}

// Zoomt um einen Punkt im Viewport, hoechstens auf 160 %. Die untere Grenze ist der Zoom, bei dem die ganze
// Flaeche hineinpasst, aber nie mehr als 45 %; dort steht die Flaeche in der Mitte (Uebersicht ueber den Baum)
function zoomAround(zoom, pointX, pointY, rect) {
  const minZoom = Math.min(0.45, fitZoom(rect));
  if (zoom <= minZoom) {
    centerCanvas(minZoom, rect);
    return;
  }
  const newZoom = Math.min(zoom, 1.6);
  mapTransform.x = pointX - (pointX - mapTransform.x) * (newZoom / mapTransform.zoom);
  mapTransform.y = pointY - (pointY - mapTransform.y) * (newZoom / mapTransform.zoom);
  mapTransform.zoom = newZoom;
  applyMapTransform();
}

// Startansicht: 100 %, zentriert auf den Kurs, an dem die Person steht. Ragen die Kurse ueber den Viewport
// hinaus, bleibt neben dem aeussersten Kurs hoechstens 24 px leere Flaeche; passen sie hinein, stehen sie in der Mitte.
export function resetMapTransform() {
  const viewport = document.getElementById('treeMapViewport');
  const rect = viewport ? viewport.getBoundingClientRect() : { width: 1000, height: 600 };
  const course = COURSE_MAP_COORDS[startCourseId];
  const xs = Object.values(COURSE_MAP_COORDS).map(c => c.x);
  const ys = Object.values(COURSE_MAP_COORDS).map(c => c.y);
  // offset zentriert den Kurs; first/last: Rand der aeussersten Kurse auf der Flaeche
  const place = (offset, view, first, last) => (last - first <= view
    ? (view - first - last) / 2
    : Math.min(Math.max(offset, view - last - 24), 24 - first));
  viewport?.scrollTo(0, 0);
  mapTransform.zoom = 1.0;
  mapTransform.x = place(rect.width / 2 - course.x - NODE_WIDTH / 2, rect.width, Math.min(...xs), Math.max(...xs) + NODE_WIDTH);
  mapTransform.y = place(rect.height / 2 - course.y - NODE_HEIGHT / 2, rect.height, Math.min(...ys), Math.max(...ys) + NODE_HEIGHT);
  applyMapTransform();
}

// Zoom, bei dem die ganze Flaeche mit 20 px Rand in den Viewport passt
function fitZoom(rect) {
  return Math.min((rect.width - 40) / CANVAS_WIDTH, (rect.height - 40) / CANVAS_HEIGHT);
}

// Auch einen Scroll des Viewports aufheben, den der Browser selbst setzt (z.B. beim Suchen auf der Seite)
function centerCanvas(zoom, rect) {
  document.getElementById('treeMapViewport')?.scrollTo(0, 0);
  mapTransform.zoom = zoom;
  mapTransform.x = (rect.width - CANVAS_WIDTH * zoom) / 2;
  mapTransform.y = (rect.height - CANVAS_HEIGHT * zoom) / 2;
  applyMapTransform();
}

/**
 * Zeichnet fliessende SVG Cubic Bézier-Kurven zwischen Kurs-Knoten
 */
export function renderTreeSvgLines(treeStructure, selectedTargetCourseId = null, routeIds = null) {
  const svg = document.getElementById('treeSvgLines');
  if (!svg || !treeStructure || !treeStructure.nodes) return;

  const paths = [];

  // Pflicht-Vorgaenger als durchgezogene, empfohlene Vorstufen als gestrichelte Linie
  const edgesOf = (node) => [
    ...(node.prerequisites || []).map(preId => ({ preId, isRecommended: false })),
    ...(node.recommendedPrerequisites || []).map(preId => ({ preId, isRecommended: true }))
  ];

  // Berechnung aktiver Pfad fuer Hervorhebung (inklusive empfohlener Vorstufen).
  // routeIds (aus der Pfadberechnung) beschraenkt die Route auf diese Kurse.
  const activePathEdges = new Set();
  if (selectedTargetCourseId) {
    const collectPath = (targetId) => {
      const target = treeStructure.nodes[targetId];
      if (!target) return;
      edgesOf(target).forEach(({ preId }) => {
        if (routeIds && !routeIds.has(preId)) return;
        if (activePathEdges.has(`${preId}->${targetId}`)) return;
        activePathEdges.add(`${preId}->${targetId}`);
        collectPath(preId);
      });
    };
    collectPath(selectedTargetCourseId);
  }

  // Alias-Eintraege (glk, hlk, mf) tragen dieselbe ID wie ihr Kurs: jede Kante nur einmal zeichnen
  const drawnEdges = new Set();

  Object.values(treeStructure.nodes).forEach(targetNode => {
    const targetCoord = COURSE_MAP_COORDS[targetNode.id];
    if (!targetCoord) return;

    edgesOf(targetNode).forEach(({ preId, isRecommended }) => {
      const srcCoord = COURSE_MAP_COORDS[preId];
      const edgeKey = `${preId}->${targetNode.id}`;
      if (!srcCoord || drawnEdges.has(edgeKey)) return;
      drawnEdges.add(edgeKey);

      const isPathActive = activePathEdges.has(`${preId}->${targetNode.id}`);

      // Start: Rechte Kante des Vorgaenger-Knotens
      const x1 = srcCoord.x + NODE_WIDTH;
      const y1 = srcCoord.y + (NODE_HEIGHT / 2);

      // Ende: Linke Kante des Ziel-Knotens
      const x2 = targetCoord.x;
      const y2 = targetCoord.y + (NODE_HEIGHT / 2);

      // Kubische Bézier-Kontrollpunkte
      const deltaX = Math.max(Math.abs(x2 - x1) * 0.55, 40);
      const cp1x = x1 + deltaX;
      const cp1y = y1;
      const cp2x = x2 - deltaX;
      const cp2y = y2;

      const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

      paths.push(`
        <path d="${d}" 
              class="tree-path-line ${isRecommended ? 'is-recommended' : ''} ${isPathActive ? 'active-path' : ''}"
              data-edge="${preId}->${targetNode.id}" />
      `);
    });
  });

  svg.innerHTML = paths.join('');
}
