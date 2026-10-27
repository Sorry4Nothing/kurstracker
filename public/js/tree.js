/**
 * Cevi Kurstracker - Ausbildungsbaum Logik & Zielkurs-Inspektor
 * Knoten-Rendering, Pfadberechnung, Onboarding-Checkliste und Interaktionen
 */

import { COURSE_MAP_COORDS, mapTransform, setupInteractiveMap, renderTreeSvgLines, layoutRegionalCoords, setCanvasSize, resetMapTransform } from './tree-map.js';
import { esc } from './utils.js';
import { fetchCourses, upcomingDates, courseMetaHtml } from './courses.js';

let treeStructure = null;
let currentTreeEvaluation = null;
let selectedTargetCourseId = null;
let selectedRegion = '';

// Freies Verschieben der Kurskarten (nur Vorschau, nicht der echte Pflichtpfad): Position pro
// Region im Browser gemerkt, damit ein Reload die eigene Anordnung behaelt
function dragStorageKey(region) {
  return `kurstracker.tree.dragPositions.${region || 'default'}`;
}
function loadDragPositions(region) {
  try {
    return JSON.parse(localStorage.getItem(dragStorageKey(region))) || {};
  } catch {
    return {};
  }
}
function saveDragPosition(region, nodeId, coord) {
  try {
    const all = loadDragPositions(region);
    all[nodeId] = coord;
    localStorage.setItem(dragStorageKey(region), JSON.stringify(all));
  } catch {
    // Privater Modus o.ae.: Verschieben bleibt dann nur bis zum Reload erhalten
  }
}

export function getTreeStructure() {
  return treeStructure;
}

export function getSelectedTargetCourseId() {
  return selectedTargetCourseId;
}

// Temporaere Vorschau: Pfad einer anderen Region laden, ohne Status/Evaluation neu zu holen
// (die bleibt auf der eigenen Person, nur die Baumstruktur/Beschriftung wechselt)
async function applyRegion(regionKey) {
  selectedRegion = regionKey;
  const structRes = await fetch(`/api/tree/structure?region=${encodeURIComponent(regionKey)}`);
  treeStructure = await structRes.json();
  const extent = layoutRegionalCoords(Object.keys(treeStructure.nodes), treeStructure.nodes);
  if (extent) setCanvasSize(extent.width, extent.height); // sonst schneidet die feste 2360x840-Leinwand Karten/Linien ab
  const dragged = loadDragPositions(regionKey);
  Object.entries(dragged).forEach(([id, coord]) => {
    if (treeStructure.nodes[id]) COURSE_MAP_COORDS[id] = coord;
  });
  renderTree();
  resetMapTransform(); // neu einpassen, die Leinwand kann jetzt groesser sein als beim letzten Zoom
}

async function setupRegionSwitcher() {
  const group = document.getElementById('treeRegionGroup');
  const select = document.getElementById('treeRegionSelect');
  if (!group || !select) return;
  try {
    const res = await fetch('/api/tree/regions');
    const { regions } = await res.json();
    if (!regions?.length) return;
    select.innerHTML = regions.map(r => `<option value="${esc(r.key)}">${esc(r.label)}</option>`).join('');
    const initialRegion = selectedRegion || regions[0].key;
    select.value = initialRegion;
    group.style.display = '';
    select.addEventListener('change', () => applyRegion(select.value));
    await applyRegion(initialRegion); // Dropdown zeigt sonst eine Region, laedt aber noch den Standardbaum
  } catch (err) {
    console.error('Regionen fuer Baum-Vorschau nicht geladen:', err);
  }
}

export async function loadCourseTree() {
  const container = document.getElementById('treeLevelsContainer');
  if (!container) return;

  try {
    const [structRes, evalRes] = await Promise.all([
      fetch('/api/tree/structure'),
      fetch('/api/tree/evaluation')
    ]);

    treeStructure = await structRes.json();
    currentTreeEvaluation = await evalRes.json();

    renderTree();
    setupInteractiveMap(pickStartCourse());
    setupNodeDrag();
    setupRegionSwitcher();
  } catch (err) {
    console.error('Fehler beim Laden des Kursbaums:', err);
    container.innerHTML = `<div class="loading-placeholder text-danger">Fehler beim Laden des Kursbaums: ${esc(err.message)}</div>`;
  }
}

// Kurs, auf den die Karte beim Oeffnen zentriert: der erste angemeldete Kurs in Kartenreihenfolge,
// sonst der erste bereite, sonst der zuletzt absolvierte
function pickStartCourse() {
  const nodeStates = currentTreeEvaluation?.evaluation?.nodes || currentTreeEvaluation?.evaluation?.nodeStates || {};
  const ids = Object.keys(COURSE_MAP_COORDS);
  const withStatus = status => id => nodeStates[id]?.status === status;
  return ids.find(withStatus('IN_PROGRESS')) || ids.find(withStatus('AVAILABLE')) || ids.findLast(withStatus('COMPLETED')) || 'voku';
}

function nodeCardHtml(node, nodeStates) {
  const state = nodeStates[node.id] || { status: 'LOCKED' };
  const statusLower = (state.status || 'locked').toLowerCase();

  let statusLabel = 'Gesperrt';
  if (statusLower === 'completed') statusLabel = '<i class="fa-solid fa-check" aria-hidden="true"></i> Absolviert';
  else if (statusLower === 'in_progress') statusLabel = '<i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> Angemeldet';
  else if (statusLower === 'available') statusLabel = '<i class="fa-solid fa-lock-open" aria-hidden="true"></i> Bereit';

  const isSelected = selectedTargetCourseId === node.id;
  const coord = COURSE_MAP_COORDS[node.id] || { x: 100, y: 100 };
  const coordStyle = `left: ${coord.x}px; top: ${coord.y}px;`;

  // Kein aria-label: der Name kommt aus dem sichtbaren Text (Code, Status, Titel), WCAG 2.5.3
  const fullText = node.code && node.code !== node.title ? `${node.code} – ${node.title}` : node.title;
  return `
    <div class="tree-node-card status-${statusLower} ${isSelected ? 'is-selected' : ''}"
         id="nodeCard-${node.id}"
         style="${coordStyle}"
         onclick="selectTargetCourse('${node.id}')"
         tabindex="0"
         role="button"
         title="${esc(fullText)}"
         aria-current="${isSelected}">
      <div class="node-header">
        <div class="node-header-left">
          <span class="node-code">${node.code || node.id.toUpperCase()}</span>
        </div>
        <span class="node-status-pill status-${statusLower}">${statusLabel}</span>
      </div>
      <div class="node-title">${esc(node.title)}</div>
      <div class="node-meta">
        <span>${node.category}</span>
        <span>${node.js_type ? node.js_type : ''}</span>
      </div>
    </div>
  `;
}

export function renderTree() {
  const container = document.getElementById('treeLevelsContainer');
  if (!container || !treeStructure || !currentTreeEvaluation) return;

  const nodeStates = currentTreeEvaluation?.evaluation?.nodes || currentTreeEvaluation?.evaluation?.nodeStates || {};
  const seenNodeIds = new Set();
  const nodes = Object.values(treeStructure.nodes).filter(node => {
    if (seenNodeIds.has(node.id)) return false;
    seenNodeIds.add(node.id);
    return true;
  });

  // Eigenstaendige Zusatzkurse (kein Pflicht- oder empfohlener Vorgaenger) bekommen in
  // layoutRegionalCoords (tree-map.js) eine eigene Reihe ganz oben im selben Canvas, durch eine
  // groessere Luecke abgesetzt - sonst wirken sie wie ein Folgekurs von GLK 3
  container.innerHTML = nodes.map(node => nodeCardHtml(node, nodeStates)).join('');

  // Render SVG Verbindungen
  setTimeout(() => {
    renderTreeSvgLines(treeStructure, selectedTargetCourseId);
  }, 40);
}

// Kurskarte frei verschieben (nur Vorschau): Pointer-Events auf dem Container, damit sie auch
// nach jedem renderTree() (innerHTML-Ersatz) noch funktionieren. Ein Ziehen waehlt den Kurs
// nicht aus - derselbe Trick wie beim Verschieben der ganzen Karte in tree-map.js
let dragState = null;
let dragJustHappened = false;

function setupNodeDrag() {
  const container = document.getElementById('treeLevelsContainer');
  if (!container || container._dragInitialized) return;
  container._dragInitialized = true;

  container.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const card = e.target.closest('.tree-node-card');
    if (!card || !COURSE_MAP_COORDS[card.id.replace('nodeCard-', '')]) return;
    e.stopPropagation(); // nicht gleichzeitig die ganze Karte verschieben (tree-map.js)
    const id = card.id.replace('nodeCard-', '');
    dragState = {
      id, card, pointerId: e.pointerId,
      startClientX: e.clientX, startClientY: e.clientY,
      origX: COURSE_MAP_COORDS[id].x, origY: COURSE_MAP_COORDS[id].y,
      moved: false
    };
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const dx = (e.clientX - dragState.startClientX) / mapTransform.zoom;
    const dy = (e.clientY - dragState.startClientY) / mapTransform.zoom;
    if (!dragState.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      dragState.moved = true;
      dragState.card.classList.add('is-dragging');
      dragState.card.setPointerCapture(dragState.pointerId);
    }
    const x = Math.max(0, dragState.origX + dx);
    const y = Math.max(0, dragState.origY + dy);
    COURSE_MAP_COORDS[dragState.id] = { x, y };
    dragState.card.style.left = `${x}px`;
    dragState.card.style.top = `${y}px`;
    renderTreeSvgLines(treeStructure, selectedTargetCourseId);
  });

  const endDrag = (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    dragState.card.classList.remove('is-dragging');
    if (dragState.moved) {
      saveDragPosition(selectedRegion, dragState.id, COURSE_MAP_COORDS[dragState.id]);
      dragJustHappened = true;
      setTimeout(() => { dragJustHappened = false; });
    }
    dragState = null;
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Der Klick nach dem Verschieben waehlt den Kurs nicht aus (Capture-Phase, wie beim
  // Verschieben der ganzen Karte in tree-map.js)
  container.addEventListener('click', (e) => {
    if (dragJustHappened && e.target.closest('.tree-node-card')) e.stopPropagation();
  }, true);
}

export async function selectTargetCourse(courseId) {
  selectedTargetCourseId = courseId;

  // Selektion aktualisieren, sichtbar und fuer Screenreader (aria-current)
  document.querySelectorAll('.tree-node-card').forEach(c => {
    c.classList.remove('is-selected', 'is-path-highlight');
    c.setAttribute('aria-current', c.id === `nodeCard-${courseId}`);
  });
  const card = document.getElementById(`nodeCard-${courseId}`);
  if (card) card.classList.add('is-selected');

  // SVG Pfade hervorheben
  renderTreeSvgLines(treeStructure, selectedTargetCourseId);

  // Pfadberechnung ueber Backend API
  try {
    const res = await fetch(`/api/tree/path/${courseId}${selectedRegion ? `?region=${encodeURIComponent(selectedRegion)}` : ''}`);
    const pathResult = await res.json();
    if (!res.ok) throw new Error(pathResult.error || 'Pfadberechnung fehlgeschlagen');

    const targetNode = treeStructure.nodes[courseId];
    if (targetNode) {
      updateTreeInspector(targetNode, pathResult);
      showUpcomingDates(courseId);
    }

    // Vorgelagerte Kursknoten hervorheben (Pflicht und empfohlene Vorstufen) und die
    // Route auf diese Kurse beschraenken: herausgewachsene Vorstufen bleiben grau
    if (pathResult.pathSteps) {
      const routeSteps = [...pathResult.pathSteps, ...(pathResult.recommendedSteps || [])];
      routeSteps.forEach(step => {
        const stepCard = document.getElementById(`nodeCard-${step.id}`);
        if (stepCard && step.id !== courseId) {
          stepCard.classList.add('is-path-highlight');
        }
      });
      renderTreeSvgLines(treeStructure, selectedTargetCourseId, new Set(routeSteps.map(s => s.id)));
    }
  } catch (err) {
    console.error('Fehler bei Pfadberechnung:', err);
  }
}

// Nächste Durchführungen des Kurses aus der Cevi-DB mit Anmeldelink (#11)
async function showUpcomingDates(courseId) {
  const container = document.getElementById('inspectorDates');
  try {
    const dates = upcomingDates(await fetchCourses(), courseId).slice(0, 3);
    if (courseId !== selectedTargetCourseId) return; // inzwischen ist ein anderer Kurs gewählt
    container.innerHTML = dates.map(courseMetaHtml).join('') || 'Keine kommenden Termine in der Cevi-DB.';
  } catch (err) {
    container.textContent = `Termine nicht abrufbar: ${err.message}`;
  }
}

export function updateTreeInspector(targetNode, pathResult) {
  const { isDirectlyEligible, ageCheck, summary } = pathResult;
  const pathSteps = pathResult.pathSteps || [];
  const qualificationChecks = pathResult.targetQualCheck || pathResult.qualificationChecks || [];

  const titleEl = document.getElementById('inspectorTitle');
  const catEl = document.getElementById('inspectorCategory');
  const summaryBox = document.getElementById('inspectorPathSummary');
  const checksContainer = document.getElementById('inspectorChecks');
  const actionsContainer = document.getElementById('inspectorActions');

  const org = targetNode.org;
  const orgClass = org.toLowerCase().replace('+', '').replace(/[^a-z0-9]/g, '');

  titleEl.innerHTML = `<span class="node-org-pill org-${orgClass}" style="vertical-align: middle; margin-right: 0.4rem;">${org}</span> <span>${esc(targetNode.title)}</span>${targetNode.code ? ` <span style="font-size: 0.85em; opacity: 0.7; font-weight: normal;">(${targetNode.code})</span>` : ''}`;
  catEl.style.display = 'none';

  // Kurzer Status-Satz hier, jedes einzelne Kurs/Qualifikation steht unten in der Checkliste -
  // nicht beides an zwei Orten in zwei verschiedenen Stilen zeigen
  summaryBox.className = `path-summary-box ${isDirectlyEligible ? 'eligible' : ''}`;
  summaryBox.textContent = summary;

  // Kokonut Pro Onboarding Checklist Logik
  const checkItems = [];

  // Schritt 1: Alterspruefung (nur wenn der Kurs ueberhaupt ein Mindestalter verlangt)
  if (targetNode.minAge) {
    checkItems.push({
      title: `Mindestalter (${targetNode.minAge} Jahre)`,
      desc: ageCheck.actual === null
        ? 'Geburtsdatum fehlt in der Cevi-DB, Alter nicht pruefbar.'
        : ageCheck.isFulfilled
          ? `Erfuellt! Du bist aktuell ${ageCheck.actual} Jahre alt.`
          : `Fehlt noch: Du bist ${ageCheck.actual} Jahre alt (benoetigt: ${targetNode.minAge}).`,
      isFulfilled: ageCheck.isFulfilled
    });
  }

  // Schritt 2: Vorbereitende Cevi-Kurse - eine Zeile pro Kurs auf dem Pfad (wie bei den
  // Qualifikationen unten), nicht mehr als eine Zeile mit allen Namen aufgezaehlt. Noch offene
  // Kurse sind anklickbar und springen dorthin, zeigen so den Pfad selbst
  pathSteps.forEach(step => {
    const stepInTree = treeStructure?.nodes[step.id];
    checkItems.push({
      title: step.title,
      desc: step.isCompleted ? 'Abgeschlossen.' : 'Noch zu absolvieren - anklicken fuer den Weg dahin.',
      isFulfilled: step.isCompleted,
      onClickCourseId: !step.isCompleted && stepInTree ? step.id : null
    });
  });

  // Schritt 3: Qualifikationen / Brevets - eine Zeile pro Qualifikation (wie eine eigene
  // Mini-Checkliste); fehlt eine und ist ihr vergebender Kurs im aktuellen Baum bekannt, ist die
  // Zeile anklickbar und springt dorthin - zeigt so den Weg dahin, auch rekursiv weiter.
  // Eine Qualifikation, deren vergebender Kurs schon oben als Kurs-Schritt steht, nicht nochmal
  // unter demselben Namen zeigen
  const coursePathTitles = new Set(pathSteps.map(s => s.title));
  qualificationChecks.filter(q => !coursePathTitles.has(q.label || q.id)).forEach(q => {
    const granterInTree = q.grantedByCourseId && treeStructure?.nodes[q.grantedByCourseId];
    checkItems.push({
      title: q.label || q.id,
      desc: q.isFulfilled
        ? 'Qualifikation in der Cevi-DB bestaetigt.'
        : granterInTree
          ? 'Noch nicht erreicht - anklicken fuer den Weg dahin.'
          : 'Anerkennung fehlt noch im Profil.',
      isFulfilled: q.isFulfilled,
      onClickCourseId: !q.isFulfilled && granterInTree ? q.grantedByCourseId : null
    });
  });

  // Zuletzt: empfohlene Vorstufen (z.B. Heku, GLK 1, GLK 2 vor GLK 3), nur ein Hinweis
  // ohne Schrittnummer, zaehlt nicht zum Fortschritt
  const recommendedSteps = pathResult.recommendedSteps || [];
  if (recommendedSteps.length > 0) {
    const missingRecommended = pathResult.missingRecommended || [];
    checkItems.push({
      title: 'Empfohlene Vorstufen',
      desc: missingRecommended.length === 0
        ? 'Alle empfohlenen Vorstufen absolviert.'
        : `Empfohlen, keine Pflicht: ${missingRecommended.map(m => m.title).join(', ')}.`,
      isFulfilled: missingRecommended.length === 0,
      isOptional: true
    });
  }

  // Berechnung Fortschrittsring (nur Pflicht-Voraussetzungen)
  const requiredItems = checkItems.filter(c => !c.isOptional);
  const fulfilledCount = requiredItems.filter(c => c.isFulfilled).length;
  const totalCount = requiredItems.length;
  const progressPct = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 100;
  const circumference = 56.55; // 2 * PI * 9
  const strokeOffset = circumference - (circumference * progressPct / 100);

  let checksHtml = `
    <div class="checklist-progress-header">
      <span style="font-size: 0.8rem; color: var(--text-muted);">Voraussetzungen:</span>
      <div class="progress-ring-badge">
        <svg class="progress-ring-svg" viewBox="0 0 24 24">
          <circle class="progress-ring-bg" cx="12" cy="12" r="9"/>
          <circle class="progress-ring-fill" cx="12" cy="12" r="9"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${strokeOffset}"/>
        </svg>
        <span>${fulfilledCount}/${totalCount} (${progressPct}%)</span>
      </div>
    </div>
  `;

  let stepNumber = 0;
  checkItems.forEach(item => {
    if (!item.isOptional) stepNumber += 1;
    const badge = item.isFulfilled
      ? '<i class="fa-solid fa-check"></i>'
      : item.isOptional ? '<i class="fa-regular fa-lightbulb" aria-hidden="true"></i>' : stepNumber;
    checksHtml += `
      <div class="check-item ${item.isFulfilled ? 'check-fulfilled' : 'check-unfulfilled'}${item.isOptional ? ' check-optional' : ''}${item.onClickCourseId ? ' check-clickable' : ''}"
           ${item.onClickCourseId ? `onclick="selectTargetCourse('${item.onClickCourseId}')" role="button" tabindex="0"` : ''}>
        <div class="check-step-badge">${badge}</div>
        <div class="check-text-content">
          <div class="check-title">${esc(item.title)}</div>
          <div class="check-desc">${esc(item.desc)}</div>
        </div>
      </div>
    `;
  });

  checksContainer.innerHTML = checksHtml;
  actionsContainer.style.display = 'block';
  // Ab 1201 px scrollt der Inspektor selbst: einen neuen Kurs von oben zeigen
  document.getElementById('treeInspector').scrollTop = 0;
}
