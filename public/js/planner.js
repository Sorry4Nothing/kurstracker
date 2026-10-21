/**
 * Cevi Kurstracker - Stufenleiter & Abteilungs-Planer
 * Ausbildungsreife-Uebersicht, Empfehlungen und Kursvorschlaege
 */

import { formatEuropeanDate, esc } from './utils.js';

// Wert als JS-String-Argument fuer ein onclick-Attribut
const jsArg = value => esc(JSON.stringify(String(value ?? '')));

export async function loadPlannerData() {
  const tableBody = document.getElementById('plannerTableBody');
  const nominationsList = document.getElementById('nominationsList');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/planner/overview');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { analysis, nominations } = await res.json();
    const readiness = analysis.analyzedParticipants;

    // KPI-Zahlen aus der Server-Analyse
    const statTotal = document.getElementById('statPlannerTotal');
    const statHlk = document.getElementById('statPlannerHlk');
    const statGlk = document.getElementById('statPlannerGlk');
    const statUrgent = document.getElementById('statPlannerUrgent');

    if (statTotal) statTotal.textContent = analysis.totalCount;
    if (statHlk) statHlk.textContent = analysis.summaryStats.readyForHlk;
    if (statGlk) statGlk.textContent = analysis.summaryStats.readyForGlk;
    if (statUrgent) statUrgent.textContent = analysis.summaryStats.urgentRenewalCount;

    // Tabelle befuellen
    tableBody.innerHTML = readiness.map(item => {
      const tn = item.participant;
      const recs = item.recommendedCourses || [];
      const primaryRec = recs[0];

      let recBadge = '<span class="text-dim">Keine Empfehlung</span>';
      if (primaryRec) {
        const prioClass = primaryRec.priority === 'DRINGEND' ? 'prio-urgent' : 'prio-high';
        recBadge = `
          <span class="recommendation-pill ${prioClass}">
            ${primaryRec.priority === 'DRINGEND' ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}${esc(primaryRec.courseTitle || primaryRec.title || 'Empfohlener Kurs')}
          </span>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.2rem;">${esc(primaryRec.reason)}</div>
        `;
      }

      const completedBadges = (tn.completedCourses || []).length > 0
        ? tn.completedCourses.map(c => `<span class="badge badge-success" style="font-size: 0.68rem; margin-right: 0.2rem;">${esc(c.toUpperCase())}</span>`).join('')
        : '<span class="text-dim">Keine</span>';

      return `
        <tr>
          <td>
            <strong>${esc(tn.ceviname)}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${esc(tn.name)}</div>
          </td>
          <td>
            ${item.age ?? '–'} J.
            ${tn.birthdate ? `<div style="font-size: 0.7rem; color: var(--text-dim);">${esc(formatEuropeanDate(tn.birthdate))}</div>` : ''}
          </td>
          <td><span class="role-badge">${esc(tn.currentRole)}</span></td>
          <td>${completedBadges}</td>
          <td>${recBadge}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="openNominationModal(${jsArg(tn.id)}, ${jsArg(tn.ceviname)}, ${jsArg(primaryRec?.courseId || 'voku')})">
              <i class="fa-solid fa-plus"></i> Vorschlagen
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Nominations List
    const badge = document.getElementById('nominationsCountBadge');
    if (badge) badge.textContent = nominations.length;

    if (nominations.length === 0) {
      nominationsList.innerHTML = `<p class="empty-text">Noch keine Kursvorschlaege erfasst. Klicke bei einem Teilnehmer auf «Vorschlagen».</p>`;
    } else {
      nominationsList.innerHTML = nominations.map(nom => `
        <div class="nomination-card">
          <div class="nomination-card-header">
            <span>${esc(nom.ceviname)} • ${esc(nom.courseTitle)}</span>
            <span class="badge badge-success" style="font-size: 0.7rem;">${esc(nom.season)}</span>
          </div>
          <div class="nomination-meta">
            ${nom.notes ? `<em>«${esc(nom.notes)}»</em><br>` : ''}
            Erfasst durch: ${esc(nom.plannedBy)} • Status: ${esc(nom.status)}
          </div>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Fehler beim Laden der Planungsdaten:', err);
    tableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Fehler: ${esc(err.message)}</td></tr>`;
  }
}

export function openNominationModal(personId, personName, defaultCourseId) {
  const modal = document.getElementById('nominationModal');
  const personInput = document.getElementById('modalPersonId');
  const personNameInput = document.getElementById('modalPersonName');
  const courseSelect = document.getElementById('modalCourseSelect');

  if (personInput) personInput.value = personId;
  if (personNameInput) personNameInput.value = personName;
  if (courseSelect && defaultCourseId) {
    courseSelect.value = defaultCourseId;
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

export function closeNominationModal() {
  const modal = document.getElementById('nominationModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

export async function submitNomination(e) {
  if (e && e.preventDefault) e.preventDefault();

  const personId = document.getElementById('modalPersonId')?.value;
  const courseId = document.getElementById('modalCourseSelect')?.value;
  const season = document.getElementById('modalSeason')?.value || 'Herbst 2026';
  const notes = document.getElementById('modalNotes')?.value || '';

  try {
    const res = await fetch('/api/planner/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, targetCourseId: courseId, proposedSeason: season, notes })
    });

    if (res.ok) {
      closeNominationModal();
      await loadPlannerData();
    } else {
      const err = await res.json();
      alert(`Fehler beim Speichern: ${err.error}`);
    }
  } catch (err) {
    console.error('Fehler bei Nomination:', err);
    alert('Netzwerkfehler beim Speichern des Kursvorschlags.');
  }
}
