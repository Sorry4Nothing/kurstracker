/**
 * Cevi Kurstracker - System & Environment Status
 * Konfiguration, Git-Version, Cevi-DB Verbindung und Footer-Monitoring
 */

import { formatEuropeanDate } from './utils.js';

let currentConfig = null;

export async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    currentConfig = await res.json();

    const envBadge = document.getElementById('envBadge');
    const envLabel = document.getElementById('envLabel');
    const dbStatusText = document.getElementById('dbStatusText');
    const footerEnvText = document.getElementById('footerEnvText');

    if (envBadge) {
      envBadge.className = `env-pill env-${currentConfig.appEnv}`;
    }
    
    let envNameDisplay = currentConfig.appEnv.toUpperCase();
    if (currentConfig.isLocal) {
      envNameDisplay = currentConfig.isMock ? 'LOCAL (MOCK)' : 'LOCAL';
    } else if (currentConfig.isDevelopment) {
      envNameDisplay = 'DEV SERVER';
    } else if (currentConfig.isProduction) {
      envNameDisplay = 'LIVE / PROD';
    }

    if (envLabel) envLabel.textContent = envNameDisplay;
    if (footerEnvText) footerEnvText.textContent = `${currentConfig.appEnv} (${currentConfig.nodeEnv})`;

    if (dbStatusText) {
      dbStatusText.textContent = currentConfig.isPreparationMode
        ? 'Cevi-DB: In Vorbereitung'
        : (currentConfig.isMock ? 'Cevi-DB: Bereit' : 'Cevi-DB: Live');
    }

  } catch (err) {
    console.error('Fehler beim Laden der Konfiguration:', err);
  }
}

export async function loadSystemFooterStatus() {
  try {
    const res = await fetch('/api/system/status');
    const data = await res.json();

    const gitEl = document.getElementById('footerGit');
    if (gitEl && data.git) {
      gitEl.textContent = `${data.git.branch} (${data.git.commit})`;
    }

    const envEl = document.getElementById('footerEnv');
    if (envEl && data.appEnv) {
      envEl.textContent = `Umgebung: ${data.appEnv.toUpperCase()}`;
    }

    const dbEl = document.getElementById('footerDbStatus');
    if (dbEl && data.ceviDbStatus) {
      const isOk = data.ceviDbStatus.connected && !data.ceviDbStatus.hasError;
      const lastCheckEuropean = data.ceviDbStatus.lastCheck ? formatEuropeanDate(data.ceviDbStatus.lastCheck, true) : '';
      dbEl.innerHTML = `
        <i class="fa-solid fa-circle-check ${isOk ? 'text-success' : 'text-danger'}" aria-hidden="true"></i>
        <span>Cevi-DB: ${isOk ? 'Verbunden (' + data.ceviDbStatus.message + ' • 0 Fehler' + (lastCheckEuropean ? ' • ' + lastCheckEuropean : '') + ')' : 'Verbindungsfehler'}</span>
      `;
    }
  } catch (err) {
    console.warn('Systemstatus konnte nicht geladen werden:', err);
  }
}
