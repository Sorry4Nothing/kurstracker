/**
 * Cevi Kurstracker - Stufenleiter & Abteilungs-Planer
 * Ausbildungsreife-Uebersicht, Empfehlungen und Kursvorschlaege
 */

import { formatEuropeanDate, formatEuropeanDateRange, esc, showToast, errorText, responseError, clickAction } from './utils.js';
import { fetchCourses, upcomingDates } from './courses.js';
import { getStandardStructure } from './tree.js';
import { enhanceSelect, refreshSelect } from './select.js';
import { confirmDialog, askReturn } from './confirm.js';

// Wert als JS-String-Argument fuer ein onclick-Attribut
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

const groupName = groupId => overview?.groups?.find(g => g.id === groupId)?.name || 'Stufe';

/** Öffnet den Planer bei dieser Stufe (Kursvorschläge → «Bearbeiten») */
export function showStufe(groupId) {
  selectedStufe = groupId;
  renderPlanner();
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
  if (!tableBody || !overview) return;
  const { analysis } = overview;
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
          ${primaryRec.priority === 'DRINGEND' ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}${esc(primaryRec.badge || primaryRec.code || primaryRec.courseTitle || primaryRec.title || 'Empfohlener Kurs')}
        </span>
        <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.2rem;">${esc(primaryRec.reason)}</div>
      `;
    }

    const completedBadges = (item.completedCourseCodes || []).length > 0
      ? `<div class="role-badges">${item.completedCourseCodes.map(c => `<span class="role-badge qual-badge">${esc(c)}</span>`).join('')}</div>`
      : '<span class="text-dim">Keine</span>';

    // Nur Stufen, die die Person bearbeiten darf: die Abteilungsleitung liest Vorschläge, schreibt aber keine
    const group = editableGroupOf(tn);
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
        <td>${group ? suggestButtonHtml(tn, primaryRec, group) : ''}</td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="${columns}" class="loading-placeholder">Keine Personen in dieser Stufe.</td></tr>`;

  renderProposals(groups);
}

// -----------------------------------------------------------------------------
// Kursvorschläge je Stufe (#131): lokal bearbeiten, zwischenspeichern, abgeben
// -----------------------------------------------------------------------------

// Server-Stand je Stufe plus `dirty`, solange lokale Änderungen noch nicht gespeichert sind
let proposals = {};
let proposalsError = '';
// Name der angemeldeten Person; der Server setzt ihn beim Speichern als Vorschlagenden ein
let proposer = '';

const STATUS_LABELS = { offen: 'Offen', entwurf: 'Entwurf', abgegeben: 'Abgegeben' };
const personOf = id => overview?.group?.find(p => p.id === id);
const membersOf = groupId => (overview?.group || []).filter(p => (p.groups || []).some(g => g.id === groupId));
const isSystemCandidate = (personId, courseId) =>
  Boolean(overview?.analysis?.candidatesByCourse?.[courseId]?.some(c => c.participantId === personId));

export function courseTitle(courseId, gender) {
  const node = getStandardStructure()?.nodes?.[courseId];
  return node?.titles?.[gender] || node?.title || courseId;
}

// Kürzel wie im Kurs-Dropdown des Dialogs («Heku», «SiBe Berg»), sonst das aus dem Baum
const courseCode = courseId =>
  document.querySelector(`#modalCourseSelect option[value="${CSS.escape(courseId)}"]`)?.dataset.code
  || getStandardStructure()?.nodes?.[courseId]?.code || courseId;

// Eine Empfehlung des Systems wird ohne Dialog übernommen; ohne Empfehlung braucht der Vorschlag eine Begründung im Dialog
function suggestButtonHtml(person, rec, group) {
  if (!rec) {
    return `<button class="btn btn-secondary btn-sm" ${clickAction('openNominationModal', person.id, person.ceviname, 'voku', group.id)}><i class="fa-solid fa-plus"></i> Vorschlagen</button>`;
  }
  const done = proposals[group.id]?.entries.some(x => x.personId === person.id && x.courseId === rec.courseId);
  return `<button type="button" class="btn btn-secondary btn-sm${done ? ' is-done' : ''}" data-action="suggest" data-person="${esc(person.id)}" data-course="${esc(rec.courseId)}" data-group="${esc(group.id)}"${done ? ' aria-disabled="true"' : ''}>
    <i class="fa-solid ${done ? 'fa-check' : 'fa-plus'}" aria-hidden="true"></i> ${done ? 'Vorgeschlagen' : 'Vorschlagen'}
  </button>`;
}

// Stufe, in die ein Vorschlag für diese Person gehört: die gewählte, sonst die erste, die die Person bearbeiten darf
// shortcut: sitzt eine Person in zwei bearbeitbaren Stufen, zählt die gewählte oder erste; bei Bedarf eine Stufenwahl im Dialog
function editableGroupOf(person) {
  const editable = (person.groups || []).filter(g => proposals[g.id]?.canEdit);
  return editable.find(g => g.id === selectedStufe) || editable[0];
}

const dateTime = iso => new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });

function proposalGroupHtml(group) {
  const state = proposals[group.id];
  const entries = state.entries;
  const items = entries.map((entry, index) => {
    const person = personOf(entry.personId);
    // Eine Person, die nicht mehr in der Stufe ist, bleibt sichtbar, damit die Abteilungsleitung den Eintrag nicht übersieht
    const who = person ? esc(person.ceviname || person.name) : '<em>Nicht mehr in der Stufe</em>';
    return `
      <div class="nomination-card">
        <div class="nomination-card-header">
          <span>${who} • <span title="${esc(courseTitle(entry.courseId, person?.gender))}">${esc(courseCode(entry.courseId))}</span></span>
          ${entry.season ? `<span class="badge">${esc(entry.season)}</span>` : ''}
          ${entry.manual ? '<span class="badge badge-warning">Nicht vom System vorgeschlagen</span>' : ''}
        </div>
        ${entry.note ? `<div class="nomination-meta"><em>«${esc(entry.note)}»</em></div>` : ''}
        ${entry.proposedBy ? `<div class="nomination-meta">Vorgeschlagen von ${esc(entry.proposedBy)}</div>` : ''}
        ${state.canEdit ? `<div><button type="button" class="btn btn-secondary btn-sm" data-action="remove" data-group="${esc(group.id)}" data-index="${index}" aria-label="Vorschlag für ${esc(person?.ceviname || 'Person')} entfernen"><i class="fa-solid fa-xmark" aria-hidden="true"></i> <span>Entfernen</span></button></div>` : ''}
      </div>`;
  }).join('');

  const adjusting = state.status === 'abgegeben';
  const buttons = (state.canEdit ? [
    ['add', 'fa-plus', 'Person hinzufügen', 'btn-secondary'],
    adjusting ? ['save', 'fa-floppy-disk', 'Änderungen speichern', 'btn-primary']
      : ['save', 'fa-floppy-disk', 'Zwischenspeichern', 'btn-secondary'],
    ...adjusting ? [] : [['submit', 'fa-paper-plane', 'Abgeben', 'btn-primary']]
  ] : []).concat(state.canReopen ? [['reopen', 'fa-rotate-left', 'Zurückgeben', 'btn-secondary']] : [])
    .map(([action, icon, label, style]) =>
      `<button type="button" class="btn ${style} btn-sm" data-action="${action}" data-group="${esc(group.id)}"><i class="fa-solid ${icon}" aria-hidden="true"></i> ${label}</button>`)
    .join('');

  const meta = state.status === 'abgegeben' && state.submittedAt
    ? `Abgegeben von ${esc(state.submittedBy)} am ${esc(dateTime(state.submittedAt))}`
    : state.updatedAt ? `Gespeichert von ${esc(state.updatedBy)} am ${esc(dateTime(state.updatedAt))}` : '';
  // Die Abteilungsleitung hat nach der Abgabe angepasst
  const adjusted = adjusting && state.updatedAt > state.submittedAt
    ? `Angepasst von ${esc(state.updatedBy)} am ${esc(dateTime(state.updatedAt))}` : '';

  return `
    <section class="proposal-group" aria-label="Vorschläge ${esc(group.name)}">
      <div class="card-header-flex">
        <h4>${esc(group.name)}</h4>
        <span class="badge ${state.status === 'abgegeben' ? 'badge-success' : 'badge-info'}">${STATUS_LABELS[state.status] || esc(state.status)}</span>
        ${state.dirty ? '<span class="badge badge-warning">Nicht gespeichert</span>' : ''}
      </div>
      ${items || '<p class="empty-text">Noch keine Vorschläge für diese Stufe.</p>'}
      ${state.returnNote ? `<div class="proposal-return-note" role="note"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> <span>Zurückgegeben mit Bemerkung: «${esc(state.returnNote)}»</span></div>` : ''}
      ${meta ? `<div class="nomination-meta proposal-meta">${meta}</div>` : ''}
      ${adjusted ? `<div class="nomination-meta proposal-meta">${adjusted}</div>` : ''}
      ${buttons ? `<div class="proposal-actions">${buttons}</div>` : ''}
    </section>`;
}

function renderProposals(groups = overview?.groups || []) {
  const list = document.getElementById('nominationsList');
  const badge = document.getElementById('nominationsCountBadge');
  const error = document.getElementById('proposalsError');
  if (!list) return;
  if (error) {
    error.textContent = proposalsError;
    error.hidden = !proposalsError;
  }
  const shown = groups.filter(g => proposals[g.id] && (selectedStufe === 'all' || g.id === selectedStufe));
  if (badge) badge.textContent = shown.reduce((sum, g) => sum + proposals[g.id].entries.length, 0);
  list.innerHTML = shown.length
    ? shown.map(proposalGroupHtml).join('')
    : '<p class="empty-text">Hier gibt es noch keine Kursvorschläge.</p>';
}

export async function loadProposals() {
  try {
    const res = await fetch('/api/planner/proposals');
    if (!res.ok) throw await responseError(res);
    const { groups, user } = await res.json();
    proposer = user;
    const next = {};
    for (const group of groups) {
      // Nicht gespeicherte lokale Änderungen überleben «Aktualisieren», solange die Stufe noch bearbeitbar ist
      const local = proposals[group.groupId];
      next[group.groupId] = local?.dirty && group.canEdit ? { ...group, entries: local.entries, dirty: true } : group;
    }
    proposals = next;
    proposalsError = '';
  } catch (err) {
    proposals = {};
    proposalsError = `Vorschläge konnten nicht geladen werden: ${errorText(err)}`;
  }
  renderProposals();
}

const TOASTS = { save: 'Änderungen gespeichert', submit: 'Vorschläge abgegeben', reopen: 'Vorschläge zurückgegeben' };
// Mindestdauer der Sperre, damit sie bei schnellen Antworten nicht nur aufblitzt
const MIN_BUSY_MS = 400;

// Solange ein Speichern läuft, ist die Liste ausgegraut und gesperrt (inert), mit Ladelogo darüber
let busy = false;
function setBusy(on) {
  busy = on;
  const list = document.getElementById('nominationsList');
  list.inert = on;
  list.classList.toggle('is-busy', on);
  list.setAttribute('aria-busy', String(on));
  list.querySelector('.proposals-busy')?.remove();
  if (on) list.insertAdjacentHTML('beforeend', '<div class="loading-placeholder proposals-busy" role="status">Speichert …</div>');
}

// action: save | submit | reopen; danach vom Server neu laden, damit Rechte und Status stimmen
async function sendProposals(groupId, action, note = '') {
  if (busy) return;
  const state = proposals[groupId];
  const path = `/api/planner/proposals/${encodeURIComponent(groupId)}`;
  // Abgegeben: die Abteilungsleitung speichert Anpassungen, die Stufe bleibt abgegeben
  const request = action === 'save' ? { url: state.status === 'abgegeben' ? `${path}/final` : path, method: 'PUT' }
    : action === 'submit' ? { url: `${path}/submit`, method: 'POST' }
    : { url: `${path}/reopen`, method: 'POST' };
  setBusy(true);
  const minimum = new Promise(resolve => setTimeout(resolve, MIN_BUSY_MS));
  try {
    const res = await fetch(request.url, {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reopen' ? { note } : { entries: state.entries.map(({ personId, courseId, season, note }) => ({ personId, courseId, season, note })) })
    });
    if (!res.ok) throw await responseError(res);
    state.dirty = false;
    await loadProposals();
    await minimum;
    setBusy(false);
    renderPlanner();
    // Die Liste wurde neu gezeichnet: der Fokus geht zum gleichen Knopf zurück, falls es ihn noch gibt
    document.querySelector(`#nominationsList [data-action="${action}"][data-group="${CSS.escape(groupId)}"]`)?.focus();
    showToast(TOASTS[action]);
  } catch (err) {
    await minimum;
    setBusy(false);
    // Der Status kann anderswo gewechselt haben (z. B. Zurückgeben unter «Kursvorschläge»): neu laden, damit die Knöpfe stimmen
    await loadProposals();
    proposalsError = `Speichern fehlgeschlagen: ${errorText(err)}`;
    renderProposals();
  }
}

document.getElementById('nominationsList')?.addEventListener('click', async e => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const { action, group: groupId, index } = button.dataset;
  const state = proposals[groupId];
  if (!state) return;
  proposalsError = '';
  if (action === 'add') {
    openNominationModal('', '', 'voku', groupId);
  } else if (action === 'remove') {
    state.entries.splice(Number(index), 1);
    state.dirty = true;
    renderPlanner();
  } else if (['save', 'submit', 'reopen'].includes(action)) {
    if (action === 'submit' && !await confirmDialog({
      title: 'Vorschläge abgeben?',
      text: 'Danach kann nur noch die Abteilungsleitung sie zurückgeben.',
      confirmLabel: 'Abgeben',
      icon: 'fa-paper-plane'
    })) return;
    let note = '';
    if (action === 'reopen') {
      const answer = await askReturn(groupName(groupId));
      if (!answer) return;
      note = answer.note;
    }
    await sendProposals(groupId, action, note);
  }
});

// Menü und Spaltenköpfe werden bei jedem Zeichnen neu gefüllt: Ereignisse daher am festen Container
document.getElementById('plannerStufeTrigger')?.addEventListener('click', e => {
  e.stopPropagation();
  const dropdown = document.getElementById('plannerStufeDropdown');
  if (busy) return;
  const wasOpen = dropdown.classList.contains('open');
  document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
  dropdown.classList.toggle('open', !wasOpen);
  e.currentTarget.setAttribute('aria-expanded', String(!wasOpen));
});
document.getElementById('plannerStufeMenu')?.addEventListener('click', e => {
  const item = e.target.closest('[data-value]');
  if (!item) return;
  e.stopPropagation();
  if (!busy) chooseStufe(item.dataset.value);
});
document.getElementById('plannerTableBody')?.addEventListener('click', async e => {
  const button = e.target.closest('[data-action="suggest"]');
  if (!button || busy || button.getAttribute('aria-disabled') === 'true') return;
  const { person, course, group } = button.dataset;
  const season = String(await plannedYear(course));
  if (!addEntry(group, { personId: person, courseId: course, season, note: '' })) return;
  renderPlanner();
  document.querySelector(`[data-action="suggest"][data-person="${CSS.escape(person)}"]`)?.focus();
});
document.querySelector('#panel-planner thead')?.addEventListener('click', e => {
  const button = e.target.closest('[data-sort]');
  if (button) setSort(button.dataset.sort);
});

// fresh: «Aktualisieren» umgeht den Cache des Servers für die Cevi-DB-Daten
export async function loadPlannerData(fresh = false) {
  const tableBody = document.getElementById('plannerTableBody');
  if (!tableBody) return;

  try {
    const res = await fetch(fresh ? '/api/planner/overview?refresh=1' : '/api/planner/overview');
    if (!res.ok) throw await responseError(res);
    overview = await res.json();
    await loadProposals();
    document.getElementById('plannerMockHint')?.toggleAttribute('hidden', !overview.realDataViaMockLogin);
    plannerDepartments = overview.departments || [];
    const subtitle = document.getElementById('topbarPageSubtitle');
    if (subtitle && document.getElementById('panel-planner')?.classList.contains('active')) subtitle.textContent = plannerSubtitle();
    renderPlanner();
  } catch (err) {
    console.error('Fehler beim Laden der Planungsdaten:', err);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-danger">Fehler: ${esc(errorText(err))}</td></tr>`;
  }
}

// Element, das den Dialog geoeffnet hat: bekommt den Fokus beim Schliessen zurueck
let modalOpener = null;

// Geplant ist immer ein Jahr: das der nächsten echten Durchführung des Zielkurses, sonst das laufende (#11)
const THIS_YEAR = new Date().getFullYear();
const plannedYear = async courseId => {
  const next = upcomingDates(await loadCourses(), courseId)[0];
  return next ? Number(next.start_date.slice(0, 4)) : THIS_YEAR;
};

async function suggestYear(courseId) {
  const select = document.getElementById('modalSeason');
  select.value = String(await plannedYear(courseId));
  refreshSelect(select);
}

// Ohne Empfehlung des Systems braucht der Vorschlag eine Bemerkung; der Server prüft das nochmals (#131)
function updateManualHint() {
  const personId = document.getElementById('modalPersonId').value;
  const courseId = document.getElementById('modalCourseSelect').value;
  const manual = Boolean(personId) && !isSystemCandidate(personId, courseId);
  document.getElementById('modalNotes').required = manual;
  document.getElementById('modalManualHint').hidden = !manual;
}

document.getElementById('modalSeason')?.replaceChildren(...[0, 1, 2, 3].map(i => new Option(THIS_YEAR + i, THIS_YEAR + i)));
['modalPersonPick', 'modalCourseSelect', 'modalSeason'].forEach(id => enhanceSelect(document.getElementById(id)));

document.getElementById('modalCourseSelect')?.addEventListener('change', e => {
  suggestYear(e.target.value);
  updateManualHint();
});
document.getElementById('modalPersonPick')?.addEventListener('change', e => {
  document.getElementById('modalPersonId').value = e.target.value;
  updateManualHint();
});

/**
 * @param {string} personId leer: die Person wird im Dialog aus der Stufe gewählt («+» in der Vorschlagsliste)
 * @param {string} groupId Stufe, zu der der Vorschlag gehört
 */
export function openNominationModal(personId, personName, defaultCourseId, groupId) {
  if (busy) return;
  const modal = document.getElementById('nominationModal');
  const personInput = document.getElementById('modalPersonId');
  const personNameInput = document.getElementById('modalPersonName');
  const courseSelect = document.getElementById('modalCourseSelect');
  const pick = document.getElementById('modalPersonPick');

  document.getElementById('modalGroupId').value = groupId;
  const picking = !personId;
  document.getElementById('modalPersonNameGroup').hidden = picking;
  document.getElementById('modalPersonPickGroup').hidden = !picking;
  if (picking) {
    pick.innerHTML = membersOf(groupId)
      .sort((a, b) => byText(a.ceviname, b.ceviname))
      .map(p => `<option value="${esc(p.id)}">${esc(p.ceviname)} (${esc(p.name)})</option>`).join('');
    refreshSelect(pick);
  }
  if (personInput) personInput.value = picking ? pick.value : personId;
  if (personNameInput) personNameInput.textContent = personName;
  const avatar = document.getElementById('modalPersonAvatar');
  if (avatar) avatar.textContent = [...personName][0]?.toUpperCase() ?? '';
  document.getElementById('modalNotes').value = '';
  // Titel wie im Baum, bei J+S und SLRG also aus der Cevi-DB. Kurse mit m/w-Formen behalten den neutralen Titel aus dem HTML
  const nodes = getStandardStructure()?.nodes;
  for (const option of courseSelect?.options || []) {
    const node = nodes?.[option.value];
    if (node && !node.titles) option.textContent = `${node.title} - ab ${node.minAge} J.`;
  }
  if (courseSelect && defaultCourseId) {
    courseSelect.value = defaultCourseId;
  }
  if (courseSelect) {
    refreshSelect(courseSelect);
    suggestYear(courseSelect.value);
  }
  updateManualHint();

  if (modal) {
    modalOpener = document.activeElement;
    modal.style.display = 'flex';
    // Hintergrund fuer Tab und Screenreader sperren, Fokus in den Dialog
    const layout = document.querySelector('.app-layout');
    if (layout) layout.inert = true;
    document.getElementById((picking ? pick : courseSelect).id + 'Trigger')?.focus();
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

// Übernimmt einen Vorschlag in die Liste der Stufe; gespeichert wird erst mit «Zwischenspeichern» oder «Abgeben»
function addEntry(groupId, entry) {
  const state = proposals[groupId];
  if (!state?.canEdit) return false;
  entry.manual = !isSystemCandidate(entry.personId, entry.courseId);
  entry.proposedBy = proposer;
  // Derselbe Kurs für dieselbe Person ersetzt den früheren Eintrag
  const existing = state.entries.findIndex(x => x.personId === entry.personId && x.courseId === entry.courseId);
  if (existing >= 0) state.entries[existing] = entry; else state.entries.push(entry);
  state.dirty = true;
  proposalsError = '';
  return true;
}

export function submitNomination(e) {
  if (e && e.preventDefault) e.preventDefault();

  const value = id => document.getElementById(id)?.value ?? '';
  const groupId = value('modalGroupId');
  const added = addEntry(groupId, {
    personId: value('modalPersonId'),
    courseId: value('modalCourseSelect'),
    season: value('modalSeason').trim(),
    note: value('modalNotes').trim()
  });
  if (!added) return;

  const opener = modalOpener;
  const openerWasAdd = opener?.dataset?.action === 'add';
  closeNominationModal();
  renderPlanner();
  // Die Liste wurde neu gezeichnet: der Fokus geht zum «Person hinzufügen» der Stufe bzw. zum Knopf der Tabellenzeile zurück
  if (openerWasAdd) document.querySelector(`[data-action="add"][data-group="${CSS.escape(groupId)}"]`)?.focus();
  else if (opener?.isConnected) opener.focus();
}
