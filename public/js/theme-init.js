/**
 * Cevi Kurstracker - Farbschema vor dem ersten Zeichnen
 * Laeuft als klassisches Skript im <head>, bevor die Seite gezeichnet wird. Die JS-Module
 * (theme.js) starten erst nach dem Parsen, bis dahin blitzte das Standard-Theme auf (#55).
 * Eigene Datei statt Inline-Code, damit die Content-Security-Policy ohne 'unsafe-inline' auskommt (#43).
 */

try {
  const savedTheme = localStorage.getItem('cevi_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
} catch {
  // Kein Zugriff auf localStorage (z.B. gesperrte Website-Daten): Standard-Theme bleibt
}
