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
  startX: 0,
  startY: 0
};

export function setupInteractiveMap() {
  const viewport = document.getElementById('treeMapViewport');
  const canvas = document.getElementById('treeMapCanvas');
  const container = document.getElementById('treeCanvasWrapper');
  if (!viewport || !canvas || window._mapEventsInitialized) return;
  window._mapEventsInitialized = true;

  // Initiale Zentrierung
  fitMapToScreen();

  // Mouse Drag zum Bewegen im Raum (Pan)
  viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('.tree-node-card')) return;
    mapTransform.isPanning = true;
    mapTransform.startX = e.clientX - mapTransform.x;
    mapTransform.startY = e.clientY - mapTransform.y;
    container?.classList.add('is-panning');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!mapTransform.isPanning) return;
    mapTransform.x = e.clientX - mapTransform.startX;
    mapTransform.y = e.clientY - mapTransform.startY;
    applyMapTransform();
  });

  window.addEventListener('mouseup', () => {
    if (mapTransform.isPanning) {
      mapTransform.isPanning = false;
      container?.classList.remove('is-panning');
    }
  });

  // Mausrad Zoom (fluessig zentriert auf Cursor)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(mapTransform.zoom * zoomFactor, 0.45), 1.6);
    
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    mapTransform.x = mouseX - (mouseX - mapTransform.x) * (newZoom / mapTransform.zoom);
    mapTransform.y = mouseY - (mouseY - mapTransform.y) * (newZoom / mapTransform.zoom);
    mapTransform.zoom = newZoom;

    applyMapTransform();
  }, { passive: false });
}

export function applyMapTransform() {
  const canvas = document.getElementById('treeMapCanvas');
  const zoomLabel = document.getElementById('treeZoomLabel');
  if (canvas) {
    canvas.style.transform = `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.zoom})`;
  }
  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(mapTransform.zoom * 100)}%`;
  }
}

export function zoomMap(delta) {
  const newZoom = Math.min(Math.max(mapTransform.zoom + delta, 0.45), 1.6);
  const viewport = document.getElementById('treeMapViewport');
  const rect = viewport ? viewport.getBoundingClientRect() : { width: 1000, height: 600 };
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  mapTransform.x = centerX - (centerX - mapTransform.x) * (newZoom / mapTransform.zoom);
  mapTransform.y = centerY - (centerY - mapTransform.y) * (newZoom / mapTransform.zoom);
  mapTransform.zoom = newZoom;
  applyMapTransform();
}

export function resetMapTransform() {
  const viewport = document.getElementById('treeMapViewport');
  const rect = viewport ? viewport.getBoundingClientRect() : { width: 1000, height: 600 };
  mapTransform.zoom = 1.0;
  mapTransform.x = (rect.width / 2) - 1250;
  mapTransform.y = (rect.height / 2) - 300;
  applyMapTransform();
}

export function fitMapToScreen() {
  const viewport = document.getElementById('treeMapViewport');
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const canvasWidth = 2360;
  const canvasHeight = 840;

  const scaleX = (rect.width - 40) / canvasWidth;
  const scaleY = (rect.height - 40) / canvasHeight;
  const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.45), 1.0);

  mapTransform.zoom = fitZoom;
  mapTransform.x = Math.max(10, (rect.width - (canvasWidth * fitZoom)) / 2);
  mapTransform.y = Math.max(10, (rect.height - (canvasHeight * fitZoom)) / 2);
  applyMapTransform();
}

/**
 * Zeichnet fliessende SVG Cubic Bézier-Kurven zwischen Kurs-Knoten
 */
export function renderTreeSvgLines(treeStructure, selectedTargetCourseId = null, routeIds = null) {
  const svg = document.getElementById('treeSvgLines');
  if (!svg || !treeStructure || !treeStructure.nodes) return;

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 80;

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
