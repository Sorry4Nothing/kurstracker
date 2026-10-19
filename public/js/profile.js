/**
 * Cevi Kurstracker - Mein Profil & Qualifikationen Cockpit
 * Hitobito Stammdaten, Anerkennungen, Kurshistorie und Subtab-Navigation
 */

import { formatEuropeanDate } from './utils.js';

export async function loadUserProfile() {
  await Promise.all([
    loadUserQualifications(),
    loadUserHistory()
  ]);
}

export async function loadUserQualifications() {
  const container = document.getElementById('qualsContainer');
  const modalContainer = document.getElementById('modalQualsContainer');
  if (!container && !modalContainer) return;

  try {
    const res = await fetch('/api/user/qualifications');
    const quals = await res.json();
    renderQualifications(quals);
  } catch (err) {
    console.error('Fehler beim Laden der Qualifikationen:', err);
    if (container) container.innerHTML = `<div class="loading-placeholder text-danger">Fehler: ${err.message}</div>`;
  }
}

export function renderQualifications(quals) {
  const container = document.getElementById('qualsContainer');
  const modalContainer = document.getElementById('modalQualsContainer');

  const html = quals.map(q => {
    let badgeClass = 'badge-success';
    if (q.status.includes('Fortbildung')) badgeClass = 'badge-warning';
    if (q.status.includes('Verfallen') || q.status.includes('Gesperrt')) badgeClass = 'badge-danger';

    return `
      <div class="card">
        <div class="card-top">
          <span class="card-category">${q.category}</span>
          <span class="badge ${badgeClass}">${q.status}</span>
        </div>
        <h3 class="card-title">${q.title}</h3>
        <p class="card-subtitle">Ausgestellt von: ${q.issuer}</p>
        <div class="meta-list">
          <div class="meta-item">
            <span>Gueltig bis:</span>
            <strong>${formatEuropeanDate(q.valid_until)}</strong>
          </div>
          <div class="meta-item">
            <span>Fortbildungs-Frist:</span>
            <strong>${formatEuropeanDate(q.refresher_deadline)}</strong>
          </div>
          <div class="meta-item">
            <span>Cevi-DB Verifiziert:</span>
            <strong class="text-success"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Ja (Hitobito)</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (container) container.innerHTML = html;
  if (modalContainer) modalContainer.innerHTML = html;
}

export async function loadUserHistory() {
  const container = document.getElementById('historyContainer');
  const modalContainer = document.getElementById('modalHistoryContainer');
  if (!container && !modalContainer) return;

  try {
    const res = await fetch('/api/user/history');
    const history = await res.json();
    renderHistory(history);
  } catch (err) {
    console.error('Fehler beim Laden der Historie:', err);
    if (container) container.innerHTML = `<div class="loading-placeholder text-danger">Fehler: ${err.message}</div>`;
  }
}

export function renderHistory(history) {
  const container = document.getElementById('historyContainer');
  const modalContainer = document.getElementById('modalHistoryContainer');

  const html = history.map(h => `
    <div class="timeline-item">
      <div class="timeline-header">
        <span class="timeline-year">${formatEuropeanDate(h.year)}</span>
        <span class="badge badge-success"><i class="fa-solid fa-check" aria-hidden="true"></i> Bestanden</span>
      </div>
      <h4>${h.course_name}</h4>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
        ${h.role} • ${h.organizer}
      </p>
    </div>
  `).join('');

  if (container) container.innerHTML = html;
  if (modalContainer) modalContainer.innerHTML = html;
}

export function switchProfileSubtab(subtabId) {
  const subnavBtns = document.querySelectorAll('.profile-subnav-btn');
  const subpanels = document.querySelectorAll('.profile-subpanel');

  subnavBtns.forEach(b => b.classList.remove('active'));
  subpanels.forEach(p => p.classList.remove('active'));

  const btnMap = {
    quals: 'subtabBtnQuals',
    history: 'subtabBtnHistory',
    stammdaten: 'subtabBtnStammdaten',
    courses: 'subtabBtnCourses'
  };

  const panelMap = {
    quals: 'profileSubpanelQuals',
    history: 'profileSubpanelHistory',
    stammdaten: 'profileSubpanelStammdaten',
    courses: 'profileSubpanelCourses'
  };

  const activeBtn = document.getElementById(btnMap[subtabId]);
  const activePanel = document.getElementById(panelMap[subtabId]);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) activePanel.classList.add('active');
}
