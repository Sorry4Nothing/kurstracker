/**
 * Cevi Kurstracker - Ausbildungsbaum Logik & Zielkurs-Inspektor
 * Knoten-Rendering, Pfadberechnung, Onboarding-Checkliste und Interaktionen
 */

import { COURSE_MAP_COORDS, MAP_TRACK_ZONES, setupInteractiveMap, renderTreeSvgLines, fitMapToScreen } from './tree-map.js';

let treeStructure = null;
let currentTreeEvaluation = null;
let selectedTargetCourseId = null;

export function getTreeStructure() {
  return treeStructure;
}

export function getCurrentTreeEvaluation() {
  return currentTreeEvaluation;
}

export function getSelectedTargetCourseId() {
  return selectedTargetCourseId;
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
    setupInteractiveMap();
  } catch (err) {
    console.error('Fehler beim Laden des Kursbaums:', err);
    container.innerHTML = `<div class="loading-placeholder text-danger">Fehler beim Laden des Kursbaums: ${err.message}</div>`;
  }
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

  // Track Badges
  const trackBadgesHtml = MAP_TRACK_ZONES.map(z => `
    <div class="tree-map-track-badge" style="left: ${z.x}px; top: ${z.y}px;">
      <i class="fa-solid ${z.icon}"></i>
      <span>${z.label}</span>
    </div>
  `).join('');

  // Node Cards (Absolute Koordinaten-Positionierung)
  const cardsHtml = nodes.map(node => {
    const coord = COURSE_MAP_COORDS[node.id] || { x: 100, y: 100 };
    const state = nodeStates[node.id] || { status: 'LOCKED' };
    const statusLower = (state.status || 'locked').toLowerCase();

    let statusLabel = 'Gesperrt';
    if (statusLower === 'completed') statusLabel = '<i class="fa-solid fa-check"></i> Absolviert';
    else if (statusLower === 'in_progress') statusLabel = '<i class="fa-solid fa-hourglass-half"></i> Angemeldet';
    else if (statusLower === 'available') statusLabel = '<i class="fa-solid fa-lock-open"></i> Bereit';

    const isSelected = selectedTargetCourseId === node.id;
    const org = node.org || (node.category === 'Jugend+Sport' || node.category === 'Expertenbildung' ? 'J+S' : (node.id === 'slrg_pool' ? 'SLRG' : 'Cevi'));
    const orgClass = org.toLowerCase().replace('+', '').replace(/[^a-z0-9]/g, '');

    return `
      <div class="tree-node-card status-${statusLower} ${isSelected ? 'is-selected' : ''}" 
           id="nodeCard-${node.id}"
           style="left: ${coord.x}px; top: ${coord.y}px;"
           onclick="selectTargetCourse('${node.id}')"
           tabindex="0"
           role="button"
           aria-label="Kurs ${node.title} (${org} ${node.code})">
        <div class="node-header">
          <div class="node-header-left">
            <span class="node-org-pill org-${orgClass}">${org}</span>
            <span class="node-code">${node.code || node.id.toUpperCase()}</span>
          </div>
          <span class="node-status-pill status-${statusLower}">${statusLabel}</span>
        </div>
        <div class="node-title">${node.title}</div>
        <div class="node-meta">
          <span>${node.category}</span>
          <span>${node.js_type ? node.js_type : ''}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = trackBadgesHtml + cardsHtml;

  // Render SVG Verbindungen
  setTimeout(() => {
    renderTreeSvgLines(treeStructure, selectedTargetCourseId);
  }, 40);
}

export async function selectTargetCourse(courseId) {
  selectedTargetCourseId = courseId;

  // Visuelle Selektion aktualisieren
  document.querySelectorAll('.tree-node-card').forEach(c => c.classList.remove('is-selected', 'is-path-highlight'));
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
    }

    // Vorgelagerte Kursknoten hervorheben
    if (pathResult.path) {
      pathResult.path.forEach(step => {
        const stepCard = document.getElementById(`nodeCard-${step.id}`);
        if (stepCard && step.id !== courseId) {
          stepCard.classList.add('is-path-highlight');
        }
      });
    }
  } catch (err) {
    console.error('Fehler bei Pfadberechnung:', err);
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

  const org = targetNode.org || (targetNode.category === 'Jugend+Sport' || targetNode.category === 'Expertenbildung' ? 'J+S' : (targetNode.id === 'slrg_pool' ? 'SLRG' : 'Cevi'));
  const orgClass = org.toLowerCase().replace('+', '').replace(/[^a-z0-9]/g, '');

  titleEl.innerHTML = `<span class="node-org-pill org-${orgClass}" style="vertical-align: middle; margin-right: 0.4rem;">${org}</span> <span>${targetNode.title}</span>${targetNode.code ? ` <span style="font-size: 0.85em; opacity: 0.7; font-weight: normal;">(${targetNode.code})</span>` : ''}`;
  catEl.textContent = `Kategorie: ${targetNode.category}${targetNode.js_type ? ` • ${targetNode.js_type}` : ''}`;

  summaryBox.textContent = summary;
  summaryBox.className = `path-summary-box ${isDirectlyEligible ? 'eligible' : ''}`;

  // Kokonut Pro Onboarding Checklist Logik
  const checkItems = [];

  // Schritt 1: Alterspruefung
  checkItems.push({
    title: `Mindestalter (${targetNode.minAge} Jahre)`,
    desc: ageCheck.isFulfilled 
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

  // Berechnung Fortschrittsring
  const fulfilledCount = checkItems.filter(c => c.isFulfilled).length;
  const totalCount = checkItems.length;
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

  checkItems.forEach((item, idx) => {
    checksHtml += `
      <div class="check-item ${item.isFulfilled ? 'check-fulfilled' : 'check-unfulfilled'}">
        <div class="check-step-badge">${item.isFulfilled ? '<i class="fa-solid fa-check"></i>' : idx + 1}</div>
        <div class="check-text-content">
          <div class="check-title">${item.title}</div>
          <div class="check-desc">${item.desc}</div>
        </div>
      </div>
    `;
  });

  checksContainer.innerHTML = checksHtml;
  actionsContainer.style.display = 'block';

  // Continue Learning Card synchronisieren
  updateContinueLearningCard(targetNode, pathResult);
}

export function updateContinueLearningCard(targetNode, pathResult) {
  const clTitle = document.getElementById('clTitle');
  const clDesc = document.getElementById('clDesc');
  const clNextCourseName = document.getElementById('clNextCourseName');
  const clMilestoneBadge = document.getElementById('clMilestoneBadge');
  const clProgressBarFill = document.getElementById('clProgressBarFill');

  if (!clTitle) return;

  clMilestoneBadge.textContent = `Zielkurs: ${targetNode.title}`;
  clNextCourseName.textContent = `${targetNode.title}${targetNode.code ? ` (${targetNode.code})` : ''}`;
  clTitle.textContent = pathResult.isDirectlyEligible
    ? `Bereit fuer ${targetNode.title}!`
    : `Naechster Meilenstein: ${targetNode.title}`;
  clDesc.textContent = pathResult.summary;

  if (clProgressBarFill) {
    const pct = pathResult.isDirectlyEligible ? 100 : Math.max(25, 100 - (pathResult.missingCourses.length * 30));
    clProgressBarFill.style.width = `${pct}%`;
  }
}

export function onPlanTargetCourse() {
  if (!selectedTargetCourseId) return;
  // Weiterleitung zur Planung
  window.switchTab('planner');
}
