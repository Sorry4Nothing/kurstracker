/**
 * Cevi Kurstracker - Utility Functions
 * Hilfsfunktionen fuer Formatierung, Debouncing und Datumslogik (Schweizer / Europaeisches Format)
 */

/**
 * Maskiert Text fuer die Ausgabe in innerHTML (auch in Attributen)
 */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Attribute für ein Element in einem Template, das beim Klick die Aktion `name` mit `args` ruft (siehe actions.js).
 * Ersetzt Inline-Handler, die die CSP nicht erlaubt.
 */
export function clickAction(name, ...args) {
  return `data-click="${esc(name)}"${args.length ? ` data-args="${esc(JSON.stringify(args))}"` : ''}`;
}

// Kurze Bestätigung unten in der Mitte; die Region steht fest in index.html, damit Screenreader sie ansagen
export function showToast(text) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> ';
  toast.append(text);
  region.replaceChildren(toast);
  setTimeout(() => toast.remove(), 3500);
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Formatiert Datumsangaben gemaess europaeischem Standard (DD.MM.YYYY bzw. DD.MM.YYYY, HH:mm Uhr)
 */
export function formatEuropeanDate(dateVal, includeTime = false) {
  if (!dateVal) return '';
  if (typeof dateVal === 'number') {
    return String(dateVal);
  }
  const str = String(dateVal).trim();
  if (/^\d{4}$/.test(str)) {
    return str;
  }
  if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
    return str;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      const formatted = `${parts[2]}.${parts[1]}.${parts[0]}`;
      if (includeTime && str.includes('T')) {
        const timePart = str.split('T')[1].substring(0, 5);
        return `${formatted}, ${timePart} Uhr`;
      }
      return formatted;
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      if (includeTime) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year}, ${hours}:${minutes} Uhr`;
      }
      return `${day}.${month}.${year}`;
    }
  } catch {
    // Ignorieren und Original zurueckgeben
  }
  return str;
}

export function formatEuropeanDateRange(startDate, endDate) {
  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return formatEuropeanDate(startDate);
  if (!startDate && endDate) return `Bis ${formatEuropeanDate(endDate)}`;
  return `${formatEuropeanDate(startDate)} bis ${formatEuropeanDate(endDate)}`;
}

const STATUS_MESSAGES = {
  401: 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.',
  403: 'Dafür fehlt dir die Berechtigung.',
  404: 'Das gibt es nicht (mehr).',
  429: 'Zu viele Anfragen. Bitte warte einen Moment.',
  502: 'Die Cevi-DB antwortet nicht. Bitte versuche es später erneut.',
  503: 'Der Kurstracker ist gerade nicht erreichbar. Bitte versuche es später erneut.'
};

/**
 * Fehler zu einer nicht erfolgreichen Antwort, mit einer Meldung, die Leitende verstehen.
 * Bei 4xx gilt die Meldung des Servers (z.B. «braucht es eine Bemerkung»), bei 5xx nie: sie nennt Pfade der Cevi-DB.
 * @param {Response} res
 * @returns {Promise<Error>}
 */
export async function responseError(res) {
  const body = res.status < 500 ? await res.json().catch(() => ({})) : {};
  return new Error(body.error || STATUS_MESSAGES[res.status] || `Der Server meldet einen Fehler (${res.status}). Bitte versuche es später erneut.`);
}

/**
 * Text für eine Fehlermeldung in der Ansicht: ein abgebrochener Abruf (TypeError von fetch) heisst «keine Verbindung»,
 * nicht «Failed to fetch».
 */
export function errorText(err) {
  return err instanceof TypeError ? 'Keine Verbindung zum Kurstracker. Bitte prüfe deine Internetverbindung.' : err.message;
}
