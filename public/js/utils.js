/**
 * Cevi Kurstracker - Utility Functions
 * Hilfsfunktionen fuer Formatierung, Debouncing und Datumslogik (Schweizer / Europaeisches Format)
 */

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
