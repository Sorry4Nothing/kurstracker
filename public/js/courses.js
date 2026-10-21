/**
 * Cevi Kurstracker - Offizielles Kursangebot
 * Kursdaten-Laden, Suche und Filterung nach Kategorien
 */

import { esc, formatEuropeanDate, formatEuropeanDateRange } from './utils.js';

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
    container.innerHTML = `<div class="loading-placeholder text-danger">Fehler beim Laden des Kursangebots: ${esc(err.message)}</div>`;
  }
}

export function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  const list = Array.isArray(courses) ? courses : (courses?.courses || []);

  // Kursdaten kommen im Live-Betrieb aus der Cevi-DB (fremde Eingaben): alles escapen
  const html = list.map(c => `
    <div class="card">
      <div class="card-top">
        <span class="card-category">${esc(c.category)}</span>
        <span class="badge ${String(c.status || '').includes('Offen') ? 'badge-success' : 'badge-warning'}">${esc(c.status)}</span>
      </div>
      <h3 class="card-title">${esc(c.title)}</h3>
      <p class="card-subtitle">${esc(c.description)}</p>
      <div class="meta-list">
        <div class="meta-item">
          <span>Veranstalter:</span>
          <strong>${esc(c.organizer)}</strong>
        </div>
        <div class="meta-item">
          <span>Kursort:</span>
          <strong>${esc(c.location)}</strong>
        </div>
        <div class="meta-item">
          <span>Kursdatum:</span>
          <strong>${esc(formatEuropeanDateRange(c.start_date, c.end_date))}</strong>
        </div>
        <div class="meta-item">
          <span>Anmeldeschluss:</span>
          <strong style="color: var(--cevi-gold);">${esc(formatEuropeanDate(c.registration_deadline))}</strong>
        </div>
      </div>
    </div>
  `).join('');

  // Ohne Treffer (Suche, Kategorie) einen Hinweis statt einer leeren Liste
  if (container) container.innerHTML = html || '<p class="empty-text">Keine passenden Kurse gefunden.</p>';
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
