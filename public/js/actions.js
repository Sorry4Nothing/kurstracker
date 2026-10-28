/**
 * Cevi Kurstracker - Aktionen per data-Attribut statt Inline-Handler (#171)
 * Die CSP erlaubt keine Inline-Skripte mehr, also auch keine onclick-Attribute. Elemente tragen stattdessen
 * ein data-click-, data-input- oder data-submit-Attribut mit dem Aktionsnamen und optional data-args (JSON-Liste). Ein Listener auf dem
 * Dokument ruft die registrierte Aktion auf; nur registrierte Namen laufen (kein Aufruf beliebiger window-Funktionen).
 * Jede Aktion bekommt zuerst { event, element }, danach die Argumente.
 */

const registry = new Map();

export function registerActions(actions) {
  for (const [name, action] of Object.entries(actions)) registry.set(name, action);
}

for (const type of ['click', 'input', 'submit']) {
  document.addEventListener(type, (event) => {
    const element = event.target instanceof Element ? event.target.closest(`[data-${type}]`) : null;
    const action = element && registry.get(element.dataset[type]);
    if (!action) return;
    let args = [];
    try {
      args = JSON.parse(element.dataset.args ?? '[]');
    } catch {
      return;
    }
    action({ event, element }, ...args);
  });
}
