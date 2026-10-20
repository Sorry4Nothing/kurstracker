/**
 * Cevi Kurstracker - Offizielles Kursangebot
 * Kursdaten-Laden, Suche und Filterung nach Kategorien
 */

import { formatEuropeanDate, formatEuropeanDateRange } from './utils.js';

let allCourses = [];

export async function loadAllCourses() {
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/courses');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allCourses = Array.isArray(data) ? data : (data.courses || []);
    renderCourses(allCourses);
  } catch (err) {
    console.error('Fehler beim Laden des Kursangebots:', err);
    container.innerHTML = `<div class="loading-placeholder text-danger">Fehler beim Laden des Kursangebots: ${err.message}</div>`;
  }
}

export function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  const list = Array.isArray(courses) ? courses : (courses?.courses || []);

  const html = list.map(c => `
    <div class="card">
      <div class="card-top">
        <span class="card-category">${c.category}</span>
        <span class="badge ${c.status.includes('Offen') ? 'badge-success' : 'badge-warning'}">${c.status}</span>
      </div>
      <h3 class="card-title">${c.title}</h3>
      <p class="card-subtitle">${c.description}</p>
      <div class="meta-list">
        <div class="meta-item">
          <span>Veranstalter:</span>
          <strong>${c.organizer}</strong>
        </div>
        <div class="meta-item">
          <span>Kursort:</span>
          <strong>${c.location}</strong>
        </div>
        <div class="meta-item">
          <span>Kursdatum:</span>
          <strong>${formatEuropeanDateRange(c.start_date, c.end_date)}</strong>
        </div>
        <div class="meta-item">
          <span>Anmeldeschluss:</span>
          <strong style="color: var(--cevi-gold);">${formatEuropeanDate(c.registration_deadline)}</strong>
        </div>
      </div>
    </div>
  `).join('');

  if (container) container.innerHTML = html;
}

export function filterCourses() {
  const search = document.getElementById('courseSearchInput')?.value.toLowerCase() || '';
  const category = document.getElementById('categoryDropdown')?.getAttribute('data-selected') || 'all';

  const filtered = allCourses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search) ||
                          c.description.toLowerCase().includes(search) ||
                          c.location.toLowerCase().includes(search) ||
                          c.code.toLowerCase().includes(search);
    const matchesCat = category === 'all' || c.category === category;
    return matchesSearch && matchesCat;
  });

  renderCourses(filtered);
}

// Event Listener fuer Kategorie-Aenderung
window.addEventListener('filter-courses', filterCourses);
