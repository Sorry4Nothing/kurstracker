/**
 * Cevi Kurstracker - System & Environment Status
 * Umgebung und Cevi-DB Modus im Footer
 */

import { esc } from './utils.js';

export async function loadSystemFooterStatus() {
  try {
    const res = await fetch('/api/system/status');
    const data = await res.json();

    const envEl = document.getElementById('footerEnv');
    if (envEl && data.appEnv) {
      envEl.textContent = `Umgebung: ${data.appEnv.toUpperCase()}`;
    }

    // API-Output ist ein Entwicklungswerkzeug: appEnv schickt der Server nur ausserhalb der Produktion
    const tabApi = document.getElementById('tabApiOutput');
    if (tabApi) tabApi.hidden = !data.appEnv;

    // Version nur anzeigen, wenn es ein Git-Release (Tag) gibt
    const versionEl = document.getElementById('footerVersion');
    const versionTagEl = document.getElementById('footerVersionTag');
    if (versionEl && versionTagEl && data.version) {
      versionTagEl.textContent = data.version;
      versionEl.hidden = false;
    }

    const dbEl = document.getElementById('footerDbStatus');
    if (dbEl && data.ceviDbStatus) {
      dbEl.innerHTML = `
        <i class="fa-solid fa-circle-info text-info" aria-hidden="true"></i>
        <span>Cevi-DB: ${esc(data.ceviDbStatus.message)}</span>
      `;
    }
  } catch (err) {
    console.warn('Systemstatus konnte nicht geladen werden:', err);
  }
}
