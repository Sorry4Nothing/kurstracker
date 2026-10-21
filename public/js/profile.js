/**
 * Cevi Kurstracker - Mein Profil & Qualifikationen Cockpit
 * Hitobito Stammdaten, Anerkennungen, Kurshistorie und Subtab-Navigation
 */

import { esc, formatEuropeanDate } from './utils.js';

export async function loadUserProfile() {
  await Promise.all([
    loadUserQualifications(),
    loadUserHistory()
  ]);
}

export async function loadUserQualifications() {
  const container = document.getElementById('qualsContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/user/qualifications');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const quals = await res.json();
    renderQualifications(quals);
  } catch (err) {
    console.error('Fehler beim Laden der Qualifikationen:', err);
    container.innerHTML = `<div class="loading-placeholder text-danger">Fehler beim Laden der Qualifikationen: ${esc(err.message)}</div>`;
  }
}

export function renderQualifications(quals) {
  const container = document.getElementById('qualsContainer');
  const list = Array.isArray(quals) ? quals : (quals?.qualifications || []);

  const html = list.map(q => {
    let badgeClass = 'badge-success';
    const status = q.status || 'Gültig';
    if (status.includes('Fortbildung') || status.includes('In Ausbildung')) badgeClass = 'badge-warning';
    if (status.includes('Verfallen') || status.includes('Gesperrt')) badgeClass = 'badge-danger';

    const category = q.type || q.category || 'Jugend+Sport';
    const issuer = q.issuer || 'BASPO / Cevi Schweiz';
    const validUntil = q.valid_until ? (q.valid_until === 'Unbefristet' ? 'Unbefristet' : formatEuropeanDate(q.valid_until)) : 'Unbefristet';

    // Qualifikationen kommen im Live-Betrieb aus der Cevi-DB (fremde Eingaben): alles escapen
    return `
      <div class="card qual-card">
        <div class="card-top">
          <span class="card-category">${esc(category)}</span>
          <span class="badge ${badgeClass}">${esc(status)}</span>
        </div>
        <h3 class="card-title">${esc(q.title)}</h3>
        ${q.sub_title ? `<p class="card-subtitle text-dim" style="font-size: 0.8rem; margin-bottom: 0.4rem;">${esc(q.sub_title)}</p>` : ''}
        <p class="card-subtitle">Ausgestellt von: ${esc(issuer)}</p>
        <div class="meta-list">
          <div class="meta-item">
            <span>Gültig bis:</span>
            <strong>${esc(validUntil)}</strong>
          </div>
          ${q.renewal_recommended ? `
          <div class="meta-item text-accent">
            <span>Empfehlung:</span>
            <strong>${esc(q.renewal_recommended)}</strong>
          </div>` : ''}
          <div class="meta-item">
            <span>Cevi-DB / BASPO:</span>
            <strong class="text-success"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Bestätigt</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (container) container.innerHTML = html;
}

export async function loadUserHistory() {
  const container = document.getElementById('historyContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/user/history');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const history = await res.json();
    renderHistory(history);
  } catch (err) {
    console.error('Fehler beim Laden der Historie:', err);
    container.innerHTML = `<div class="loading-placeholder text-danger">Fehler beim Laden der Historie: ${esc(err.message)}</div>`;
  }
}

export function renderHistory(history) {
  const container = document.getElementById('historyContainer');
  const list = Array.isArray(history) ? history : (history?.participations || history?.history || []);

  const html = list.map(h => {
    const courseTitle = h.course_title || h.course_name || 'Cevi Kurs';
    const dateFormatted = h.date ? formatEuropeanDate(h.date) : (h.year ? formatEuropeanDate(h.year) : '');
    const role = h.role || 'Teilnehmer';
    const organizer = h.organizer || (h.category ? `${h.category} Kurs` : 'Cevi Region Zürich');
    const result = h.result || 'Erfolgreich bestanden';

    // Kurshistorie inkl. Notizen kommt im Live-Betrieb aus der Cevi-DB (fremde Eingaben): alles escapen
    return `
      <div class="timeline-item">
        <div class="timeline-header">
          <span class="timeline-year">${esc(dateFormatted)}</span>
          <span class="badge badge-success"><i class="fa-solid fa-check" aria-hidden="true"></i> ${esc(result)}</span>
        </div>
        <h4>${esc(courseTitle)}</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
          ${esc(role)} • ${esc(organizer)}
        </p>
        ${h.notes ? `<p style="color: var(--text-dim); font-size: 0.78rem; margin-top: 0.3rem; font-style: italic;">${esc(h.notes)}</p>` : ''}
      </div>
    `;
  }).join('');

  if (container) container.innerHTML = html;
}
