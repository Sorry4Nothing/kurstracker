/**
 * Cevi Kurstracker - Offizielles Kursangebot
 * Kursdaten-Laden, Suche und Filterung nach Kategorien
 */

import { esc, formatEuropeanDate, formatEuropeanDateRange } from './utils.js';

let allCourses = [];
let coursesRequest = null;

// Kursanlässe einmal pro Seitenaufruf laden: Kursangebot, Baum und Planer teilen sie
export function fetchCourses() {
  coursesRequest ??= fetch('/api/courses')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => (Array.isArray(data) ? data : (data.courses || [])))
    .catch(err => {
      coursesRequest = null; // der nächste Aufruf versucht es neu
      throw err;
    });
  return coursesRequest;
}

// Kommende Durchführungen eines Kurses im Baum, die früheste zuerst
export function upcomingDates(courses, courseNodeId) {
  const today = new Date().toISOString().slice(0, 10);
  return courses
    .filter(c => c.course_node_id === courseNodeId && c.start_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

// Angaben einer Durchführung mit Anmeldelink; leere Angaben (z. B. Veranstalter aus der Cevi-DB) fallen weg
export function courseMetaHtml(c) {
  const row = (label, value, style = '') => (value === '' || value == null ? '' : `
    <div class="meta-item">
      <span>${label}:</span>
      <strong${style}>${esc(value)}</strong>
    </div>`);
  return `
    <div class="meta-list">
      ${row('Veranstalter', c.organizer)}
      ${row('Kursort', c.location)}
      ${row('Kursdatum', formatEuropeanDateRange(c.start_date, c.end_date))}
      ${row('Anmeldeschluss', formatEuropeanDate(c.registration_deadline), ' style="color: var(--cevi-gold);"')}
      ${row('Freie Plätze', c.free_places)}
      ${c.registration_url ? `
        <a class="btn btn-secondary btn-sm" href="${esc(c.registration_url)}" target="_blank" rel="noopener noreferrer" aria-label="Zur Anmeldung in der Cevi-DB (öffnet in neuem Tab)">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
          <span>Zur Anmeldung in der Cevi-DB</span>
        </a>` : ''}
    </div>`;
}

export async function loadAllCourses() {
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  try {
    allCourses = await fetchCourses();
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
      ${courseMetaHtml(c)}
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
