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

// Namen der Abteilungen aus der Cevi-DB, gesetzt beim Laden des Planers
let plannerDepartments = [];
export const plannerSubtitle = () =>
  `Ausbildungsplaner der Abteilung ${plannerDepartments.join(', ') || '…'}`;

// Letzte Server-Antwort, Auswahl und Sortierung: Filter und Sortieren zeichnen neu, ohne den Server zu fragen
let overview = null;
let selectedStufe = 'all';
let sort = { key: null, dir: 'asc' };

const byText = (a, b) => String(a).localeCompare(String(b), 'de');
const stufenOf = item => (item.participant.groups || []).map(g => g.name).sort(byText).join(', ');
const sorters = {
  name: (a, b) => byText(a.participant.ceviname, b.participant.ceviname),
  age: (a, b) => (a.age ?? Infinity) - (b.age ?? Infinity),
  stufe: (a, b) => byText(stufenOf(a), stufenOf(b))
};

function stufeLabel(groups) {
  return groups.find(g => g.id === selectedStufe)?.name || 'Alle Stufen';
}

// Eigenes Dropdown wie beim Kurs-Filter; nur sichtbar, wenn die Person mehr als eine Stufe sieht
function renderStufeDropdown(groups) {
  const dropdown = document.getElementById('plannerStufeDropdown');
  const menu = document.getElementById('plannerStufeMenu');
  if (!dropdown || !menu) return;
  dropdown.hidden = groups.length < 2;
  const options = [{ id: 'all', name: 'Alle Stufen' }, ...groups];
  menu.innerHTML = options.map(g => `
    <div class="custom-dropdown-item${g.id === selectedStufe ? ' active' : ''}" data-value="${esc(g.id)}" role="option" aria-selected="${g.id === selectedStufe}" tabindex="0">
      <i class="fa-solid fa-check check-icon" aria-hidden="true"></i>
      <span>${esc(g.name)}</span>
    </div>`).join('');
  document.getElementById('plannerStufeLabel').textContent = stufeLabel(groups);
}

function chooseStufe(id) {
  selectedStufe = id;
  const trigger = document.getElementById('plannerStufeTrigger');
  document.getElementById('plannerStufeDropdown')?.classList.remove('open');
  trigger?.setAttribute('aria-expanded', 'false');
  renderPlanner();
  trigger?.focus();
}

function setSort(key) {
  sort = { key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' };
  renderPlanner();
}

function renderPlanner() {
  const tableBody = document.getElementById('plannerTableBody');
  const nominationsList = document.getElementById('nominationsList');
  if (!tableBody || !overview) return;
  const { analysis, nominations } = overview;
  const groups = [...(overview.groups || [])].sort((a, b) => byText(a.name, b.name));
  // Eine Stufe, die es nicht mehr gibt (z. B. nach einem Rollenwechsel), fällt auf «Alle» zurück
  if (selectedStufe !== 'all' && !groups.some(g => g.id === selectedStufe)) selectedStufe = 'all';

  let readiness = analysis.analyzedParticipants.filter(item =>
    selectedStufe === 'all' || (item.participant.groups || []).some(g => g.id === selectedStufe)
  );

  // Mit mehreren Stufen unter «Alle» sagt eine Spalte, wer wohin gehört; bei einer gewählten Stufe wäre sie überflüssig
  const showStufe = selectedStufe === 'all' && groups.length > 1;
  if (!showStufe && sort.key === 'stufe') sort = { key: null, dir: 'asc' };
  if (sort.key) readiness = [...readiness].sort((a, b) => sorters[sort.key](a, b) * (sort.dir === 'asc' ? 1 : -1));
  const columns = showStufe ? 7 : 6;
  document.getElementById('plannerStufeHead')?.toggleAttribute('hidden', !showStufe);
  document.querySelectorAll('#panel-planner [data-sort]').forEach(button => {
    const state = sort.key === button.dataset.sort ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    button.closest('th').setAttribute('aria-sort', state);
  });

  renderStufeDropdown(groups);
  const title = document.getElementById('plannerGroupTitle');
  if (title) {
    title.textContent = groups.length === 1 ? `Stufe: ${groups[0].name}`
      : selectedStufe === 'all' ? 'Alle Stufen' : `Stufe: ${stufeLabel(groups)}`;
  }

  // KPI-Zahlen: unter «Alle» direkt aus der Server-Analyse, bei gewählter Stufe nur für deren Personen
  const shown = new Set(readiness.map(item => item.participant.id));
  const candidates = courseId => (analysis.candidatesByCourse?.[courseId] || []).filter(c => shown.has(c.participantId)).length;
  const stats = selectedStufe === 'all'
    ? {
        statPlannerTotal: analysis.totalCount,
        statPlannerHlk: analysis.summaryStats.readyForHlk,
        statPlannerGlk: analysis.summaryStats.readyForGlk,
        statPlannerUrgent: analysis.summaryStats.urgentRenewalCount
      }
    : {
        statPlannerTotal: readiness.length,
        statPlannerHlk: candidates('heku'),
        statPlannerGlk: candidates('glk3'),
        statPlannerUrgent: readiness.filter(item => item.hasExpiringJsLeiter).length
      };
  for (const [id, value] of Object.entries(stats)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  tableBody.innerHTML = readiness.length ? readiness.map(item => {
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
        ${showStufe ? `<td class="stufe-cell">${esc(stufenOf(item)) || '<span class="text-dim">–</span>'}</td>` : ''}
        <td>
          <div class="role-badges">${(tn.currentRole || '').split(', ').filter(Boolean).map(role => `<span class="role-badge">${esc(role)}</span>`).join('')}</div>
        </td>
        <td>${completedBadges}</td>
        <td>${recBadge}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openNominationModal(${jsArg(tn.id)}, ${jsArg(tn.ceviname)}, ${jsArg(primaryRec?.courseId || 'voku')})">
            <i class="fa-solid fa-plus"></i> Vorschlagen
          </button>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="${columns}" class="loading-placeholder">Keine Personen in dieser Stufe.</td></tr>`;

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
}

// Menü und Spaltenköpfe werden bei jedem Zeichnen neu gefüllt: Ereignisse daher am festen Container
document.getElementById('plannerStufeTrigger')?.addEventListener('click', e => {
  e.stopPropagation();
  const dropdown = document.getElementById('plannerStufeDropdown');
  const wasOpen = dropdown.classList.contains('open');
  document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
  dropdown.classList.toggle('open', !wasOpen);
  e.currentTarget.setAttribute('aria-expanded', String(!wasOpen));
});
document.getElementById('plannerStufeMenu')?.addEventListener('click', e => {
  const item = e.target.closest('[data-value]');
  if (!item) return;
  e.stopPropagation();
  chooseStufe(item.dataset.value);
});
document.querySelector('#panel-planner thead')?.addEventListener('click', e => {
  const button = e.target.closest('[data-sort]');
  if (button) setSort(button.dataset.sort);
});

export async function loadPlannerData() {
  const tableBody = document.getElementById('plannerTableBody');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/planner/overview');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    overview = await res.json();
    document.getElementById('plannerMockHint')?.toggleAttribute('hidden', !overview.realDataViaMockLogin);
    plannerDepartments = overview.departments || [];
    const subtitle = document.getElementById('topbarPageSubtitle');
    if (subtitle && document.getElementById('panel-planner')?.classList.contains('active')) subtitle.textContent = plannerSubtitle();
    renderPlanner();
  } catch (err) {
    console.error('Fehler beim Laden der Planungsdaten:', err);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-danger">Fehler: ${esc(err.message)}</td></tr>`;
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
