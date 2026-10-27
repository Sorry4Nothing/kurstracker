/**
 * Cevi Kurstracker - Ausbildungsbaum Logik & Zielkurs-Inspektor
 * Knoten-Rendering, Pfadberechnung, Onboarding-Checkliste und Interaktionen
 */

import { COURSE_MAP_COORDS, setupInteractiveMap, renderTreeSvgLines, layoutRegionalCoords } from './tree-map.js';
import { esc } from './utils.js';
import { fetchCourses, upcomingDates, courseMetaHtml } from './courses.js';

let treeStructure = null;
let currentTreeEvaluation = null;
let selectedTargetCourseId = null;
let selectedRegion = '';

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
  layoutRegionalCoords(Object.keys(treeStructure.nodes), treeStructure.nodes);
  renderTree();
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

  // Node Cards (Absolute Koordinaten-Positionierung)
  const cardsHtml = nodes.map(node => {
    const coord = COURSE_MAP_COORDS[node.id] || { x: 100, y: 100 };
    const state = nodeStates[node.id] || { status: 'LOCKED' };
    const statusLower = (state.status || 'locked').toLowerCase();

    let statusLabel = 'Gesperrt';
    if (statusLower === 'completed') statusLabel = '<i class="fa-solid fa-check" aria-hidden="true"></i> Absolviert';
    else if (statusLower === 'in_progress') statusLabel = '<i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> Angemeldet';
    else if (statusLower === 'available') statusLabel = '<i class="fa-solid fa-lock-open" aria-hidden="true"></i> Bereit';

    const isSelected = selectedTargetCourseId === node.id;
    const org = node.org;
    const orgClass = org.toLowerCase().replace('+', '').replace(/[^a-z0-9]/g, '');

    // Kein aria-label: der Name kommt aus dem sichtbaren Text (Organisation, Code, Status, Titel), WCAG 2.5.3
    return `
      <div class="tree-node-card status-${statusLower} ${isSelected ? 'is-selected' : ''}" 
           id="nodeCard-${node.id}"
           style="left: ${coord.x}px; top: ${coord.y}px;"
           onclick="selectTargetCourse('${node.id}')"
           tabindex="0"
           role="button"
           aria-current="${isSelected}">
        <div class="node-header">
          <div class="node-header-left">
            <span class="node-org-pill org-${orgClass}">${org}</span>
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
  }).join('');

  container.innerHTML = cardsHtml;

  // Render SVG Verbindungen
  setTimeout(() => {
    renderTreeSvgLines(treeStructure, selectedTargetCourseId);
  }, 40);
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
    const res = await fetch(`/api/tree/path/${courseId}`);
    const pathResult = await res.json();

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
  const { isDirectlyEligible, missingCourses, ageCheck, summary } = pathResult;
  const qualificationChecks = pathResult.targetQualCheck || pathResult.qualificationChecks || [];

  const titleEl = document.getElementById('inspectorTitle');
  const catEl = document.getElementById('inspectorCategory');
  const summaryBox = document.getElementById('inspectorPathSummary');
  const checksContainer = document.getElementById('inspectorChecks');
  const actionsContainer = document.getElementById('inspectorActions');

  const org = targetNode.org;
  const orgClass = org.toLowerCase().replace('+', '').replace(/[^a-z0-9]/g, '');

  titleEl.innerHTML = `<span class="node-org-pill org-${orgClass}" style="vertical-align: middle; margin-right: 0.4rem;">${org}</span> <span>${esc(targetNode.title)}</span>${targetNode.code ? ` <span style="font-size: 0.85em; opacity: 0.7; font-weight: normal;">(${targetNode.code})</span>` : ''}`;
  catEl.textContent = `Kategorie: ${targetNode.category}${targetNode.js_type ? ` • ${targetNode.js_type}` : ''}`;

  summaryBox.textContent = summary;
  summaryBox.className = `path-summary-box ${isDirectlyEligible ? 'eligible' : ''}`;

  // Kokonut Pro Onboarding Checklist Logik
  const checkItems = [];

  // Schritt 1: Alterspruefung
  checkItems.push({
    title: `Mindestalter (${targetNode.minAge} Jahre)`,
    desc: ageCheck.actual === null
      ? 'Geburtsdatum fehlt in der Cevi-DB, Alter nicht pruefbar.'
      : ageCheck.isFulfilled
        ? `Erfuellt! Du bist aktuell ${ageCheck.actual} Jahre alt.`
        : `Fehlt noch: Du bist ${ageCheck.actual} Jahre alt (benoetigt: ${targetNode.minAge}).`,
    isFulfilled: ageCheck.isFulfilled
  });

  // Schritt 2: Vorbereitende Cevi-Kurse
  if (targetNode.prerequisites && targetNode.prerequisites.length > 0) {
    const isFulfilled = missingCourses.length === 0;
    const missingNames = missingCourses.map(m => m.title).join(', ');
    checkItems.push({
      title: 'Ausbildungsstufen & Kurse',
      desc: isFulfilled
        ? 'Alle vorherigen Kursstufen erfolgreich abgeschlossen.'
        : `Noch zu absolvieren: ${missingNames}.`,
      isFulfilled: isFulfilled
    });
  }

  // Schritt 3: Qualifikationen / Brevets
  if (qualificationChecks && qualificationChecks.length > 0) {
    qualificationChecks.forEach(q => {
      checkItems.push({
        title: `Zertifikat: ${q.id.toUpperCase()}`,
        desc: q.isFulfilled
          ? 'Qualifikation in der Cevi-DB bestaetigt.'
          : 'Anerkennung fehlt noch im Profil.',
        isFulfilled: q.isFulfilled
      });
    });
  }

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
      <div class="check-item ${item.isFulfilled ? 'check-fulfilled' : 'check-unfulfilled'}${item.isOptional ? ' check-optional' : ''}">
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
