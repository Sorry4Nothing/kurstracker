/**
 * Cevi Kurstracker - Farbschema und Login-Intro vor dem ersten Zeichnen
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

// Login-Intro (#90): nur direkt nach dem Login und ohne «Bewegung reduzieren». intro-pending verdeckt die App,
// bis intro.js übernimmt. Ohne den Parameter in der Adresse spielt ein Neuladen das Intro nicht erneut.
if (new URLSearchParams(location.search).get('login') === 'success') {
  history.replaceState(null, '', location.pathname);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('intro-pending');
}
