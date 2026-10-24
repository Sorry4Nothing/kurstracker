/**
 * Cevi Kurstracker - Stufenleiter & Abteilungs-Planer
 * Ausbildungsreife-Uebersicht, Empfehlungen und Kursvorschlaege
 */

import { formatEuropeanDate, formatEuropeanDateRange, esc } from './utils.js';
import { fetchCourses, upcomingDates } from './courses.js';
import { getTreeStructure } from './tree.js';

// Wert als JS-String-Argument fuer ein onclick-Attribut
const jsArg = value => esc(JSON.stringify(String(value ?? '')));
const dateRange = course => formatEuropeanDateRange(course.start_date, course.end_date);
// Ohne Kursdaten bleibt der Planer nutzbar, nur ohne Termine
const loadCourses = () => fetchCourses().catch(() => []);

export async function loadPlannerData() {
  const tableBody = document.getElementById('plannerTableBody');
  const nominationsList = document.getElementById('nominationsList');
  if (!tableBody) return;

  try {
    const [res, courses] = await Promise.all([fetch('/api/planner/overview'), loadCourses()]);
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
        const nextDate = upcomingDates(courses, primaryRec.courseId)[0];
        recBadge = `
          <span class="recommendation-pill ${prioClass}">
            ${primaryRec.priority === 'DRINGEND' ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}${esc(primaryRec.courseTitle || primaryRec.title || 'Empfohlener Kurs')}
          </span>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.2rem;">${esc(primaryRec.reason)}</div>
          ${nextDate ? `
            <div style="font-size: 0.72rem; margin-top: 0.2rem;">
              Nächster Termin: ${esc(dateRange(nextDate))} ·
              <a href="${esc(nextDate.registration_url)}" target="_blank" rel="noopener noreferrer" aria-label="Anmelden (öffnet in neuem Tab)">Anmelden</a>
            </div>` : ''}
        `;
      }

      const completedBadges = (item.completedCourseCodes || []).length > 0
        ? item.completedCourseCodes.map(c => `<span class="badge badge-success" style="font-size: 0.68rem; margin-right: 0.2rem;">${esc(c)}</span>`).join('')
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
          <td><div class="role-badges">${(tn.currentRole || '').split(', ').filter(Boolean).map(role => `<span class="role-badge">${esc(role)}</span>`).join('')}</div></td>
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

// Element, das den Dialog geoeffnet hat: bekommt den Fokus beim Schliessen zurueck
let modalOpener = null;

// Saison aus einer echten Durchfuehrung des Zielkurses: die naechste vorausgewaehlt, die weiteren als Vorschlag (#11)
async function suggestSeasons(courseId) {
  const dates = upcomingDates(await loadCourses(), courseId);
  document.getElementById('modalSeasonOptions').innerHTML = dates
    .map(c => `<option value="${esc(dateRange(c))}" label="${esc(c.location)}"></option>`)
    .join('');
  document.getElementById('modalSeason').value = dates[0] ? dateRange(dates[0]) : '';
}

document.getElementById('modalCourseSelect')?.addEventListener('change', e => suggestSeasons(e.target.value));

export function openNominationModal(personId, personName, defaultCourseId) {
  const modal = document.getElementById('nominationModal');
  const personInput = document.getElementById('modalPersonId');
  const personNameInput = document.getElementById('modalPersonName');
  const courseSelect = document.getElementById('modalCourseSelect');

  if (personInput) personInput.value = personId;
  if (personNameInput) personNameInput.value = personName;
  // Titel wie im Baum, bei J+S und SLRG also aus der Cevi-DB. Kurse mit m/w-Formen behalten den neutralen Titel aus dem HTML
  const nodes = getTreeStructure()?.nodes;
  for (const option of courseSelect?.options || []) {
    const node = nodes?.[option.value];
    if (node && !node.titles) option.textContent = `${node.title} - ab ${node.minAge} J.`;
  }
  if (courseSelect && defaultCourseId) {
    courseSelect.value = defaultCourseId;
  }
  if (courseSelect) suggestSeasons(courseSelect.value);

  if (modal) {
    modalOpener = document.activeElement;
    modal.style.display = 'flex';
    // Hintergrund fuer Tab und Screenreader sperren, Fokus in den Dialog
    const layout = document.querySelector('.app-layout');
    if (layout) layout.inert = true;
    courseSelect?.focus();
  }
}

export function closeNominationModal() {
  const modal = document.getElementById('nominationModal');
  // app.js ruft das bei jedem Escape auf, auch wenn der Dialog geschlossen ist
  if (!modal || modal.style.display === 'none') return;
  modal.style.display = 'none';
  const layout = document.querySelector('.app-layout');
  if (layout) layout.inert = false;
  if (modalOpener?.isConnected) modalOpener.focus();
  modalOpener = null;
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
      // Die Tabelle wird neu gezeichnet: danach den Button derselben Zeile fokussieren
      const rowButtons = () => [...document.querySelectorAll('#plannerTableBody button')];
      const openerIndex = rowButtons().indexOf(modalOpener);
      closeNominationModal();
      await loadPlannerData();
      if (openerIndex >= 0) rowButtons()[openerIndex]?.focus();
    } else {
      const err = await res.json();
      alert(`Fehler beim Speichern: ${err.error}`);
    }
  } catch (err) {
    console.error('Fehler bei Nomination:', err);
    alert('Netzwerkfehler beim Speichern des Kursvorschlags.');
  }
}
