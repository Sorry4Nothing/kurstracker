// Ersetzt ein <select> durch das Dropdown der Seite (.custom-dropdown). Das <select> bleibt als Wertspeicher
// im DOM: `.value` und das change-Ereignis funktionieren wie bisher. Nach Änderungen von aussen refreshSelect() rufen.
import { esc } from './utils.js';
import { closeAllDropdowns } from './theme.js';

// Kurs-Optionen tragen ein Kürzel: die Liste zeigt es mit dem Alter, der volle Titel steht im Tooltip
const optionHtml = o => o.dataset.code
  ? `<span class="option-code">${esc(o.dataset.code)}</span><span class="option-text" title="${esc(o.textContent)}">${esc(o.textContent.split(' - ').pop())}</span>`
  : `<span class="option-text">${esc(o.textContent)}</span>`;

const dropdownOf = select => select.nextElementSibling?.classList.contains('custom-dropdown') ? select.nextElementSibling : null;

export function refreshSelect(select) {
  const dropdown = dropdownOf(select);
  if (!dropdown) return;
  const options = [...select.options];
  dropdown.querySelector('.custom-dropdown-menu').innerHTML = options.map(o => `
    <div class="custom-dropdown-item${o.selected ? ' active' : ''}" data-value="${esc(o.value)}" role="option" aria-selected="${o.selected}" tabindex="0">
      <i class="fa-solid fa-check check-icon" aria-hidden="true"></i>
      ${optionHtml(o)}
    </div>`).join('');
  const current = select.selectedOptions[0];
  dropdown.querySelector('.dropdown-label').innerHTML = current ? optionHtml(current) : '';
  dropdown.classList.toggle('is-empty', options.length === 0);
}

export function enhanceSelect(select) {
  if (!select || dropdownOf(select)) return;
  const labelId = `${select.id}Trigger`;
  select.hidden = true;
  select.insertAdjacentHTML('afterend', `
    <div class="custom-dropdown form-dropdown">
      <button type="button" class="custom-dropdown-trigger" id="${labelId}" aria-haspopup="listbox" aria-expanded="false">
        <span class="dropdown-label"></span>
        <i class="fa-solid fa-chevron-down trigger-chevron" aria-hidden="true"></i>
      </button>
      <div class="custom-dropdown-menu" role="listbox"></div>
    </div>`);
  const dropdown = dropdownOf(select);
  const trigger = dropdown.querySelector('.custom-dropdown-trigger');
  // <label for> zeigt auf das versteckte <select>: der Auslöser übernimmt den Namen
  const label = document.querySelector(`label[for="${select.id}"]`);
  if (label) trigger.setAttribute('aria-labelledby', `${labelId} ${label.id ||= `${select.id}Label`}`);
  label?.addEventListener('click', () => trigger.focus());

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    dropdown.classList.toggle('open', !wasOpen);
    trigger.setAttribute('aria-expanded', String(!wasOpen));
    if (!wasOpen) dropdown.querySelector('.custom-dropdown-item.active, .custom-dropdown-item')?.focus();
  });
  dropdown.querySelector('.custom-dropdown-menu').addEventListener('click', e => {
    const item = e.target.closest('[data-value]');
    if (!item) return;
    e.stopPropagation();
    closeAllDropdowns();
    select.value = item.dataset.value;
    refreshSelect(select);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    trigger.focus();
  });
  refreshSelect(select);
}
