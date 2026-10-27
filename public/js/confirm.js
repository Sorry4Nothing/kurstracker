/**
 * Cevi Kurstracker - Bestätigungsdialog (ersetzt window.confirm)
 * confirmDialog() öffnet #confirmModal und liefert true (bestätigt) oder false (Abbrechen, Escape, Klick daneben).
 * Mit `note` zeigt der Dialog ein Textfeld und liefert bei Bestätigung { note } (leer = '') statt true.
 */

export function confirmDialog({ title, text, confirmLabel = 'Bestätigen', icon = 'fa-circle-question', note }) {
  const modal = document.getElementById('confirmModal');
  const layout = document.querySelector('.app-layout');
  const opener = document.activeElement;
  const [cancel, ok] = modal.querySelectorAll('.modal-actions button');

  modal.querySelector('#confirmTitle').textContent = title;
  modal.querySelector('#confirmText').textContent = text;
  modal.querySelector('.modal-icon i').className = `fa-solid ${icon}`;
  ok.textContent = confirmLabel;
  const noteGroup = modal.querySelector('#confirmNoteGroup');
  const noteField = modal.querySelector('#confirmNote');
  noteGroup.hidden = !note;
  noteField.value = '';
  if (note) {
    noteGroup.querySelector('label').textContent = note.label;
    noteField.placeholder = note.placeholder || '';
  }
  modal.style.display = 'flex';
  if (layout) layout.inert = true;
  // Fokus auf «Abbrechen»: ein versehentliches Enter löst nichts aus
  (note ? noteField : cancel).focus();

  return new Promise(resolve => {
    const finish = result => {
      modal.style.display = 'none';
      if (layout) layout.inert = false;
      document.removeEventListener('keydown', onKey, true);
      modal.removeEventListener('click', onClick);
      if (opener?.isConnected) opener.focus();
      resolve(result);
    };
    // capture + stopPropagation: das Escape-Handling der Seite (app.js) bekommt die Taste nicht
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      finish(false);
    };
    const onClick = e => {
      if (e.target === modal || e.target === cancel) finish(false);
      else if (e.target === ok) finish(note ? { note: noteField.value.trim() } : true);
    };
    document.addEventListener('keydown', onKey, true);
    modal.addEventListener('click', onClick);
  });
}

/** «Zurückgeben» einer abgegebenen Stufe: liefert { note } oder false (gemeinsam für Planer und Kursvorschläge) */
export const askReturn = stufeName => confirmDialog({
  title: `Vorschläge «${stufeName}» zurückgeben?`,
  text: 'Die Stufenleitung kann sie danach wieder bearbeiten und neu abgeben.',
  confirmLabel: 'Zurückgeben',
  icon: 'fa-rotate-left',
  note: { label: 'Bemerkung an die Stufe (optional)', placeholder: 'z.B. Bitte die Heku-Plätze nochmals prüfen.' }
});
