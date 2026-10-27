/**
 * Cevi Kurstracker - Umgebungseinstellungen (#129)
 * Cevi-DB-API-Key der eigenen Abteilung hinterlegen und entfernen. Der Key geht nur zum Server,
 * zurück kommen Status und die letzten 4 Zeichen.
 */

import { esc, formatEuropeanDate } from './utils.js';

const ENDPOINT = '/api/settings/cevi-db-key';

function statusLine(department) {
  if (!department.configured) return 'Für diese Abteilung ist noch kein Key hinterlegt.';
  return `Hinterlegt am ${formatEuropeanDate(department.savedAt, true)} von ${esc(department.savedBy)}. Der Key endet auf «…${esc(department.last4)}».`;
}

function card(department, showName) {
  const id = esc(department.id);
  return `
    <div class="card" data-department="${id}">
      <div class="card-header-flex">
        <h3>Cevi-DB-Zugang</h3>
        <span class="badge ${department.configured ? 'badge-success' : 'badge-warning'}">${department.configured ? 'Key hinterlegt' : 'Kein Key'}</span>
      </div>
      ${showName ? `<p class="settings-status"><strong>${esc(department.name)}</strong></p>` : ''}
      <p class="settings-status">${statusLine(department)} <a href="https://db.cevi.ch/groups/${id}/service_tokens" target="_blank" rel="noopener noreferrer">API-Keys in der Cevi-DB öffnen</a></p>
      <form class="settings-form" autocomplete="off">
        <div class="form-group">
          <label for="settingsToken-${id}">${department.configured ? 'Key ersetzen' : 'API-Key'}</label>
          <input type="password" id="settingsToken-${id}" name="token" class="form-input" autocomplete="off" spellcheck="false" required>
        </div>
        <p class="settings-message" role="status"></p>
        <div class="settings-actions">
          <button type="submit" class="btn btn-primary">Prüfen und speichern</button>
          ${department.configured ? '<button type="button" class="btn btn-outline" data-action="remove">Key entfernen</button>' : ''}
        </div>
      </form>
    </div>`;
}

function render(list, data) {
  if (!data.available) {
    list.innerHTML = '<p class="empty-text">Die Umgebungseinstellungen sind auf diesem Server nicht eingerichtet (Datenbank und Schlüssel fehlen).</p>';
    return;
  }
  list.innerHTML = data.departments.map(d => card(d, data.departments.length > 1)).join('');
}

function say(cardEl, text, state) {
  const message = cardEl.querySelector('.settings-message');
  message.textContent = text;
  message.dataset.state = state;
}

async function call(method, departmentId, body) {
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(departmentId)}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Anfrage fehlgeschlagen');
  return data;
}

export async function loadSettings() {
  const list = document.getElementById('settingsList');
  if (!list) return;
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) throw new Error();
    render(list, await response.json());
  } catch {
    list.innerHTML = '<p class="loading-placeholder text-danger">Die Einstellungen konnten nicht geladen werden.</p>';
  }
}

// Ein Listener für alle Karten: Speichern und Entfernen
document.getElementById('settingsList')?.addEventListener('submit', async event => {
  event.preventDefault();
  const cardEl = event.target.closest('[data-department]');
  const input = event.target.elements.token;
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true;
  say(cardEl, 'Der Key wird bei der Cevi-DB geprüft …', 'info');
  try {
    await call('PUT', cardEl.dataset.department, { token: input.value });
    input.value = '';
    await loadSettings();
    say(document.querySelector(`[data-department="${CSS.escape(cardEl.dataset.department)}"]`), 'Key geprüft und gespeichert.', 'ok');
  } catch (err) {
    button.disabled = false;
    say(cardEl, err.message, 'error');
  }
});

document.getElementById('settingsList')?.addEventListener('click', async event => {
  if (event.target.closest('[data-action="remove"]') === null) return;
  const cardEl = event.target.closest('[data-department]');
  if (!window.confirm('Den Key dieser Abteilung wirklich entfernen? Der Kurstracker kann dann keine Daten mehr für sie laden.')) return;
  try {
    await call('DELETE', cardEl.dataset.department);
    await loadSettings();
  } catch (err) {
    say(cardEl, err.message, 'error');
  }
});
