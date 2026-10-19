/**
 * Cevi Kurstracker - Modular Application Entry Point
 * Orchestriert die modularen Komponenten: Themes, Auth, Tree-Map, Profil, Planer, Kurse & System
 */

import { formatEuropeanDate, formatEuropeanDateRange, debounce } from './js/utils.js';
import { initTheme, setAppTheme, closeAllDropdowns } from './js/theme.js';
import { checkAuth, initiateLogin, loginWithMock, logout } from './js/auth.js';
import { switchTab, toggleSidebar } from './js/navigation.js';
import { setupInteractiveMap, zoomMap, resetMapTransform, fitMapToScreen, renderTreeSvgLines } from './js/tree-map.js';
import { loadCourseTree, renderTree, selectTargetCourse, onPlanTargetCourse, getTreeStructure, getSelectedTargetCourseId } from './js/tree.js';
import { loadUserProfile, switchProfileSubtab } from './js/profile.js';
import { loadAllCourses, filterCourses } from './js/courses.js';
import { loadPlannerData, openNominationModal, closeNominationModal, submitNomination } from './js/planner.js';
import { loadConfig, loadSystemFooterStatus } from './js/system.js';

// Globale Bereitstellung fuer Inline-HTML-Events (onclick, onsubmit etc.)
window.formatEuropeanDate = formatEuropeanDate;
window.formatEuropeanDateRange = formatEuropeanDateRange;
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.setAppTheme = setAppTheme;
window.selectTargetCourse = selectTargetCourse;
window.onPlanTargetCourse = onPlanTargetCourse;
window.switchProfileSubtab = switchProfileSubtab;
window.zoomMap = zoomMap;
window.resetMapTransform = resetMapTransform;
window.fitMapToScreen = fitMapToScreen;
window.zoomTree = zoomMap;
window.resetTreeZoom = resetMapTransform;
window.filterCourses = filterCourses;
window.loadPlannerData = loadPlannerData;
window.openNominationModal = openNominationModal;
window.closeNominationModal = closeNominationModal;
window.submitNomination = submitNomination;
window.initiateLogin = initiateLogin;
window.loginWithMock = loginWithMock;
window.logout = logout;
window.loadSystemFooterStatus = loadSystemFooterStatus;

// Initialisierung bei DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadConfig();
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
