/**
 * Cevi Kurstracker - Theme & Dropdown System
 * Radix-artiges Dropup fuer Themes sowie Dropdowns fuer Filter
 */

const THEME_NAMES = {
  'cevi-tools': 'Cevi Klassik',
  'midnight': 'Sternennacht',
  'alpine-light': 'Morgenrot',
  'campfire': 'Lagerfeuer'
};

export function initTheme() {
  const savedTheme = localStorage.getItem('cevi_theme') || 'cevi-tools';
  setAppTheme(savedTheme, false);
  setupThemeDropdown();
  setupCategoryDropdown();
  setupGlobalClickDismiss();
}

export function setAppTheme(themeName, save = true) {
  if (!THEME_NAMES[themeName]) themeName = 'cevi-tools';

  document.documentElement.setAttribute('data-theme', themeName);
  if (save) {
    localStorage.setItem('cevi_theme', themeName);
  }

  const labelEl = document.getElementById('themeDropdownLabel');
  if (labelEl) {
    labelEl.textContent = THEME_NAMES[themeName];
  }

  const items = document.querySelectorAll('#themeDropdownMenu .custom-dropdown-item');
  items.forEach(item => {
    const selected = item.getAttribute('data-value') === themeName;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-selected', selected);
  });

  const trigger = document.getElementById('themeDropdownTrigger');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
}

export function setupThemeDropdown() {
  const dropdown = document.getElementById('themeDropdown');
  const trigger = document.getElementById('themeDropdownTrigger');
  const menu = document.getElementById('themeDropdownMenu');

  if (!dropdown || !trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      dropdown.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeValue = item.getAttribute('data-value');
      setAppTheme(themeValue);
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus(); // sonst landet der Fokus nach der Auswahl auf <body>
    });
  });
}

export function setupCategoryDropdown() {
  const dropdown = document.getElementById('categoryDropdown');
  const trigger = document.getElementById('categoryDropdownTrigger');
  const menu = document.getElementById('categoryDropdownMenu');

  if (!dropdown || !trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      dropdown.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const catValue = item.getAttribute('data-value');
      const catLabel = item.querySelector('span')?.textContent || 'Alle Kategorien';

      dropdown.setAttribute('data-selected', catValue);
      const labelSpan = document.getElementById('categoryDropdownLabel');
      if (labelSpan) labelSpan.textContent = catLabel;

      menu.querySelectorAll('.custom-dropdown-item').forEach(i => {
        i.classList.toggle('active', i === item);
        i.setAttribute('aria-selected', i === item);
      });

      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus(); // sonst landet der Fokus nach der Auswahl auf <body>

      // Dispatch Event fuer Kursfilterung
      window.dispatchEvent(new CustomEvent('filter-courses'));
    });
  });
}

export function closeAllDropdowns() {
  document.querySelectorAll('.custom-dropdown, .custom-dropup').forEach(d => {
    d.classList.remove('open');
    const trigger = d.querySelector('.custom-dropdown-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function setupGlobalClickDismiss() {
  document.addEventListener('click', () => {
    closeAllDropdowns();
  });

  // Tastatur: Enter/Leertaste loesen div-Buttons (Baumknoten) und
  // Dropdown-Eintraege aus, Pfeiltasten wechseln den Eintrag, Escape
  // schliesst offene Dropdowns und gibt den Fokus an den Ausloeser zurueck
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.target.closest?.('.custom-dropdown')?.querySelector('.custom-dropdown-trigger')?.focus();
      closeAllDropdowns();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const option = e.target.closest?.('[role="option"]');
      const next = option?.[e.key === 'ArrowDown' ? 'nextElementSibling' : 'previousElementSibling'];
      if (next?.matches('[role="option"]')) {
        e.preventDefault();
        next.focus();
      }
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target.closest?.('[role="button"]:not(button), [role="option"]');
    if (!target) return;
    e.preventDefault();
    target.click();
  });
}
