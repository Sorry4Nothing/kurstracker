/**
 * Cevi Kurstracker - Modular Application Entry Point
 * Orchestriert die modularen Komponenten: Themes, Auth, Tree-Map, Profil, Planer, Kurse & System
 */

import './js/fetch-guard.js';
import { registerActions } from './js/actions.js';
import { debounce } from './js/utils.js';
import { initTheme, closeAllDropdowns } from './js/theme.js';
import { checkAuth } from './js/auth.js';
import { switchTab, toggleSidebar } from './js/navigation.js';
import { zoomMap, resetMapTransform, renderTreeSvgLines } from './js/tree-map.js';
import { loadCourseTree, selectTargetCourse, getTreeStructure, getSelectedTargetCourseId } from './js/tree.js';
import { loadUserProfile } from './js/profile.js';
import { loadAllCourses, filterCourses } from './js/courses.js';
import { loadPlannerData, openNominationModal, closeNominationModal, submitNomination } from './js/planner.js';
import { loadSystemFooterStatus } from './js/system.js';
import { loadApiOutput, setApiView } from './js/api-output.js';
import { loadSystemLog } from './js/system-log.js';

// Aktionen der data-click/data-input/data-submit-Attribute im HTML (statt Inline-Handler, siehe js/actions.js)
registerActions({
  switchTab: (_, tab) => switchTab(tab),
  toggleSidebar: () => toggleSidebar(),
  zoomMap: (_, delta) => zoomMap(delta),
  resetMapTransform: () => resetMapTransform(),
  filterCourses: () => filterCourses(),
  loadPlannerData: (_, fresh) => loadPlannerData(fresh),
  openNominationModal: (_, ...args) => openNominationModal(...args),
  closeNominationModal: () => closeNominationModal(),
  submitNomination: ({ event }) => submitNomination(event),
  loadApiOutput: () => loadApiOutput(),
  setApiView: ({ element }) => setApiView(element),
  selectTargetCourse: (_, courseId) => selectTargetCourse(courseId),
  loadSystemLog: () => loadSystemLog()
});

// Auf window bleiben die Funktionen für Tests und die Konsole erreichbar
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.selectTargetCourse = selectTargetCourse;
window.zoomMap = zoomMap;
window.resetMapTransform = resetMapTransform;
window.filterCourses = filterCourses;
window.loadPlannerData = loadPlannerData;
window.openNominationModal = openNominationModal;
window.closeNominationModal = closeNominationModal;
window.submitNomination = submitNomination;
window.loadApiOutput = loadApiOutput;
window.setApiView = setApiView;
window.loadSystemLog = loadSystemLog;

// Initialisierung bei DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await checkAuth();

  // Paralleles Laden der Anwendungsbereiche
  await Promise.all([
    loadCourseTree(),
    loadUserProfile(),
    loadAllCourses(),
    loadPlannerData(),
    loadSystemFooterStatus()
  ]);
});

// Login-Intro (#90): theme-init.js setzt intro-pending direkt nach dem Login; nur dann lädt der Intro-Code
if (document.documentElement.classList.contains('intro-pending')) {
  import('./js/intro.js')
    .then(({ playLoginIntro }) => playLoginIntro())
    .catch(() => document.documentElement.classList.remove('intro-pending'));
}

// Tastatur-Navigation (Escape zum Schliessen von Modals & Menues)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Ein offenes Dropdown im Dialog schliesst zuerst, der Dialog erst mit dem nächsten Escape (capture: vor theme.js, das offene Dropdowns schliesst)
    if (!document.querySelector('.custom-dropdown.open')) closeNominationModal();
    closeAllDropdowns();
  }
}, true);

// Responsive Re-Layout bei Fenster-Groessenaenderung
window.addEventListener('resize', debounce(() => {
  renderTreeSvgLines(getTreeStructure(), getSelectedTargetCourseId());
}, 150));
