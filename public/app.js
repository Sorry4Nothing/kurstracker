/**
 * Cevi Kurstracker - Modular Application Entry Point
 * Orchestriert die modularen Komponenten: Themes, Auth, Tree-Map, Profil, Planer, Kurse & System
 */

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

// Globale Bereitstellung fuer Inline-HTML-Events (onclick, onsubmit etc.)
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

// Tastatur-Navigation (Escape zum Schliessen von Modals & Menues)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeNominationModal();
    closeAllDropdowns();
  }
});

// Responsive Re-Layout bei Fenster-Groessenaenderung
window.addEventListener('resize', debounce(() => {
  renderTreeSvgLines(getTreeStructure(), getSelectedTargetCourseId());
}, 150));
