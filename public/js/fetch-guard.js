/**
 * Cevi Kurstracker - Fetch-Wächter (#24)
 * Schickt bei abgelaufener Sitzung (401) und beim Start bei ausgefallener Cevi-DB (502) auf die passende Fehlerseite,
 * statt dass jede Ansicht für sich "HTTP 401" meldet. Spätere 502 bleiben bei der Ansicht, die sie betrifft:
 * ein Fehler mitten in einer Eingabe soll sie nicht wegwerfen.
 */

// shortcut: "beim Start" heisst die ersten 15 s nach dem Laden der Seite, bei Bedarf durch einen Zustand der Ansicht ersetzen
const STARTUP_MS = 15000;
const loaded = performance.now();
let leaving = false;

export const rawFetch = window.fetch.bind(window);

window.fetch = async (input, init) => {
  const response = await rawFetch(input, init);
  const { pathname } = new URL(typeof input === 'string' ? input : input.url, location.href);
  // /api/auth/* meldet "nicht angemeldet" selbst als normale Antwort
  if (!leaving && pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const code = response.status === 401 ? 401 : (response.status === 502 && performance.now() - loaded < STARTUP_MS ? 502 : null);
    if (code) {
      leaving = true;
      location.assign(`/fehler/${code}`);
    }
  }
  return response;
};
