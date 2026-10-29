/**
 * Cevi Kurstracker - Navigation & View-Switching
 * Volle Bildschirm-Umschaltung zwischen Ausbildungsbaum, Mein Profil und Stufenleiter-Planer
 */

import { renderTreeSvgLines, resetMapTransform } from './tree-map.js';
import { getTreeStructure, getSelectedTargetCourseId } from './tree.js';
import { loadApiOutput } from './api-output.js';
import { plannerSubtitle } from './planner.js';
import { loadSettings } from './settings.js';
import { loadProposalsOverview } from './proposals-overview.js';
import { startSystemLogRefresh, stopSystemLogRefresh } from './system-log.js';

export function switchTab(tabId) {
  // Navigation Buttons & Cards
  const navTree = document.getElementById('tabTree');
  const navPlanner = document.getElementById('tabPlanner');
  const navApi = document.getElementById('tabApiOutput');
  const navSettings = document.getElementById('tabSettings');
  const navProposals = document.getElementById('tabProposals');
  const navSystemLog = document.getElementById('tabSystemLog');
  const navUserCard = document.getElementById('userNavActions');

  // Panels
  const panelTree = document.getElementById('panel-tree');
  const panelProfile = document.getElementById('panel-profile');
  const panelPlanner = document.getElementById('panel-planner');
  const panelApi = document.getElementById('panel-api');
  const panelSettings = document.getElementById('panel-settings');
  const panelProposals = document.getElementById('panel-proposals');
  const panelSystemLog = document.getElementById('panel-systemlog');

  // Topbar Titles
  const pageTitle = document.getElementById('topbarPageTitle');
  const pageSubtitle = document.getElementById('topbarPageSubtitle');

  // Alles zuruecksetzen
  [navTree, navPlanner, navApi, navSettings, navProposals, navSystemLog].forEach(btn => btn?.classList.remove('active'));
  navUserCard?.classList.remove('active');
  [panelTree, panelProfile, panelPlanner, panelApi, panelSettings, panelProposals, panelSystemLog].forEach(panel => panel?.classList.remove('active'));
  // Die Aktualisierung des Systemlogs läuft nur, solange sein Tab offen ist
  stopSystemLogRefresh();

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
    if (pageSubtitle) pageSubtitle.textContent = plannerSubtitle();
  } else if (tabId === 'proposals') {
    navProposals?.classList.add('active');
    panelProposals?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Kursvorschläge';
    if (pageSubtitle) pageSubtitle.textContent = 'Die abgegebenen Vorschläge aller Stufen';
    // Bei jedem Öffnen frisch laden, damit neue Abgaben erscheinen
    loadProposalsOverview();
  } else if (tabId === 'settings') {
    navSettings?.classList.add('active');
    panelSettings?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Umgebungseinstellungen';
    if (pageSubtitle) pageSubtitle.textContent = 'Cevi-DB-Zugang der Abteilung';
    // Bei jedem Öffnen frisch laden, damit der Status stimmt
    loadSettings();
  } else if (tabId === 'systemlog') {
    navSystemLog?.classList.add('active');
    panelSystemLog?.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Systemlog';
    if (pageSubtitle) pageSubtitle.textContent = 'Zustand des Servers, API-Anfragen und technische Ereignisse';
    startSystemLogRefresh();
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
