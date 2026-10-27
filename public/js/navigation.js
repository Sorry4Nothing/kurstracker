/**
 * Cevi Kurstracker - Navigation & View-Switching
 * Volle Bildschirm-Umschaltung zwischen Ausbildungsbaum, Mein Profil und Stufenleiter-Planer
 */

import { renderTreeSvgLines, resetMapTransform } from './tree-map.js';
import { getTreeStructure, getSelectedTargetCourseId } from './tree.js';
import { loadApiOutput } from './api-output.js';

export function switchTab(tabId) {
  // Navigation Buttons & Cards
  const navTree = document.getElementById('tabTree');
  const navPlanner = document.getElementById('tabPlanner');
  const navApi = document.getElementById('tabApiOutput');
  const navUserCard = document.getElementById('userNavActions');

  // Panels
  const panelTree = document.getElementById('panel-tree');
  const panelProfile = document.getElementById('panel-profile');
  const panelPlanner = document.getElementById('panel-planner');
  const panelApi = document.getElementById('panel-api');

  // Topbar Titles
  const pageTitle = document.getElementById('topbarPageTitle');
  const pageSubtitle = document.getElementById('topbarPageSubtitle');

  // Alles zuruecksetzen
  [navTree, navPlanner, navApi].forEach(btn => btn?.classList.remove('active'));
  navUserCard?.classList.remove('active');
  [panelTree, panelProfile, panelPlanner, panelApi].forEach(panel => panel?.classList.remove('active'));

  if (tabId === 'tree') {
    navTree?.classList.add('active');
    panelTree?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Ausbildungsbaum';
    if (pageSubtitle) pageSubtitle.textContent = 'Interaktive Pfadplanung & Voraussetzungen';
  } else if (tabId === 'profile') {
    navUserCard?.classList.add('active');
    panelProfile?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Mein Profil & Qualifikationen';
    if (pageSubtitle) pageSubtitle.textContent = 'Cevi-DB Hitobito Stammdaten, J+S Anerkennungen & Meilensteine';
  } else if (tabId === 'planner') {
    navPlanner?.classList.add('active');
    panelPlanner?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Stufenleiter-Planer';
    if (pageSubtitle) pageSubtitle.textContent = 'Ausbildungsreife der Abteilung Flaach / Winti & Kursplanung';
  } else if (tabId === 'api') {
    navApi?.classList.add('active');
    panelApi?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'API-Output';
    if (pageSubtitle) pageSubtitle.textContent = 'Nur zur Entwicklung: Live-Antworten der Kurstracker-API, so wie sie im Frontend ankommen';
    // Bei jedem Öffnen frisch laden, damit die Seite den aktuellen Stand zeigt
    loadApiOutput();
  }

  // Schliesse Mobile Sidebar beim Navigieren
  const sidebar = document.getElementById('appSidebar');
  if (sidebar && window.innerWidth <= 1024) {
    sidebar.classList.remove('open');
  }

  if (tabId === 'tree') {
    setTimeout(() => {
      renderTreeSvgLines(getTreeStructure(), getSelectedTargetCourseId());
      resetMapTransform();
    }, 60);
  }
}

export function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}
