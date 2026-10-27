/**
 * Cevi Kurstracker - Übersicht der Kursvorschläge (#131)
 * Nur für Abteilungsleitungen: die abgegebenen Vorschläge aller Stufen, nach Kurs geordnet.
 * Die Stufenleiste zeigt den Stand jeder Stufe und erlaubt «Zurückgeben» und «Bearbeiten».
 */

import { esc, showToast } from './utils.js';
import { courseTitle, showStufe, loadProposals } from './planner.js';
import { getTreeStructure } from './tree.js';
import { askReturn } from './confirm.js';

const dateTime = iso => new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
const LOADING = '<div class="loading-placeholder" role="status">Lade Kursvorschläge …</div>';

// Kurse in der Reihenfolge des Ausbildungsbaums, unbekannte zuletzt
function byCourse(submitted) {
  const order = Object.keys(getTreeStructure()?.nodes || {});
  const courses = new Map();
  for (const group of submitted) {
    for (const entry of group.entries) {
      if (!courses.has(entry.courseId)) courses.set(entry.courseId, []);
      courses.get(entry.courseId).push({ ...entry, stufe: group.name });
    }
  }
  const rank = id => order.includes(id) ? order.indexOf(id) : order.length;
  return [...courses].sort(([a], [b]) => rank(a) - rank(b));
}

function entryHtml(entry) {
  // Eine Person, die nicht mehr in der Stufe ist, bleibt sichtbar, damit der Eintrag nicht übersehen wird
  const who = entry.name
    ? `<strong>${esc(entry.ceviname || entry.name)}</strong> <span class="text-dim">${esc(entry.name)}</span>${entry.birthYear ? ` <span class="badge">Jg. ${entry.birthYear}</span>` : ''}`
    : '<em>Nicht mehr in der Stufe</em>';
  return `
    <li class="course-entry">
      <div class="course-entry-line">
        <span class="course-entry-who">${who}</span>
        <span class="badge badge-info">${esc(entry.stufe)}</span>
        ${entry.season ? `<span class="badge">${esc(entry.season)}</span>` : ''}
        ${entry.manual ? '<span class="badge badge-warning">Nicht vom System vorgeschlagen</span>' : ''}
      </div>
      ${entry.note ? `<div class="nomination-meta"><em>«${esc(entry.note)}»</em></div>` : ''}
    </li>`;
}

function courseHtml([courseId, entries]) {
  return `
    <section class="course-card" aria-label="${esc(courseTitle(courseId))}">
      <div class="course-card-head">
        <h4>${esc(courseTitle(courseId))}</h4>
        <span class="badge">${entries.length} ${entries.length === 1 ? 'Person' : 'Personen'}</span>
      </div>
      <ul class="course-entries">${entries.map(entryHtml).join('')}</ul>
    </section>`;
}

function stufeRowHtml(group) {
  const done = group.submitted;
  const adjusted = done && group.updatedAt > group.submittedAt ? ` · angepasst von ${esc(group.updatedBy)}` : '';
  const state = done
    ? `Abgegeben von ${esc(group.submittedBy)} am ${esc(dateTime(group.submittedAt))}${adjusted}`
    : 'Noch nicht abgegeben';
  const actions = done ? `
    <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-group="${esc(group.groupId)}"><i class="fa-solid fa-pen" aria-hidden="true"></i> Bearbeiten</button>
    <button type="button" class="btn btn-secondary btn-sm" data-action="reopen" data-group="${esc(group.groupId)}" data-name="${esc(group.name)}"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Zurückgeben</button>` : '';
  return `
    <li class="stufe-row">
      <span class="stufe-row-name">${esc(group.name)}</span>
      <span class="badge ${done ? 'badge-success' : ''}">${done ? 'Abgegeben' : 'Offen'}</span>
      <span class="nomination-meta stufe-row-meta">${state}</span>
      <span class="stufe-row-actions">${actions}</span>
    </li>`;
}

export async function loadProposalsOverview() {
  const list = document.getElementById('proposalsOverviewList');
  if (!list) return;
  list.innerHTML = LOADING;
  try {
    const response = await fetch('/api/proposals/final');
    if (!response.ok) throw new Error();
    const { submitted, pending } = await response.json();
    const groups = [...submitted.map(g => ({ ...g, submitted: true })), ...pending]
      .sort((a, b) => a.name.localeCompare(b.name, 'de-CH'));
    const courses = byCourse(submitted);
    list.innerHTML = `
      <section class="card" aria-label="Stand der Stufen">
        <div class="card-header-flex"><h3>Stufen</h3></div>
        <ul class="stufe-rows">${groups.map(stufeRowHtml).join('') || '<li class="empty-text">Keine Stufen sichtbar.</li>'}</ul>
      </section>
      ${courses.length
        ? `<div class="course-grid">${courses.map(courseHtml).join('')}</div>`
        : '<p class="empty-text">Noch keine Stufe hat ihre Vorschläge abgegeben.</p>'}`;
  } catch {
    list.innerHTML = '<p class="loading-placeholder text-danger">Die Vorschläge konnten nicht geladen werden.</p>';
  }
}

async function reopen(groupId, name, button) {
  const answer = await askReturn(name);
  if (!answer) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/planner/proposals/${encodeURIComponent(groupId)}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: answer.note })
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
    showToast(`Vorschläge «${name}» zurückgegeben`);
    await loadProposals();
  } catch (err) {
    showToast(`Zurückgeben fehlgeschlagen: ${err.message}`);
  }
  loadProposalsOverview();
}

document.getElementById('proposalsOverviewList')?.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, group, name } = button.dataset;
  if (action === 'reopen') reopen(group, name, button);
  else if (action === 'edit') {
    showStufe(group);
    window.switchTab('planner');
  }
});
