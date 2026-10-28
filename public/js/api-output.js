/**
 * Cevi Kurstracker - API-Output (nur zur Entwicklung)
 * Zeigt, was die Kurstracker-API ans Frontend liefert: welche Felder live ankommen und welche leer bleiben.
 * Pro Endpunkt eine Karte mit der Antwort als Tabelle, umschaltbar auf einen JSON-Baum
 */

import { esc } from './utils.js';
import { rawFetch } from './fetch-guard.js';
import { getSelectedTargetCourseId, getSelectedRegion } from './tree.js';

// Alle GET-Aufrufe, mit denen das Frontend seine Daten lädt
const ENDPOINTS = [
  '/api/auth/me',
  '/api/system/status',
  '/api/courses',
  '/api/user/history',
  '/api/user/qualifications',
  '/api/tree/structure',
  '/api/tree/evaluation',
  '/api/planner/overview'
];

// Herkunft der Daten aus dem Header X-Datenquelle (src/app.js); 401, 403 und Netzwerkfehler bleiben ohne Tag
const SOURCES = {
  'cevi-db': ['Cevi-DB live', 'badge-success'],
  testdaten: ['Testdaten (Mock)', 'badge-warning'],
  kurstracker: ['Kurstracker', '']
};

// Letzte gezeichnete Antwort pro Karte
const results = new WeakMap();
let latestLoad = 0;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const countLabel = value => Array.isArray(value) ? plural(value.length, 'Eintrag', 'Einträge') : plural(Object.keys(value).length, 'Feld', 'Felder');
const cardFor = url => document.querySelector(`#apiOutputList > details[data-url="${CSS.escape(url)}"]`);

function cardHtml(url) {
  return `
    <details class="card api-card" data-url="${esc(url)}">
      <summary><strong>GET ${esc(url)}</strong> <span class="api-source"></span> · <span class="api-meta text-muted is-loading">lädt …</span></summary>
      <div class="api-switch" role="group" aria-label="Darstellung">
        <button type="button" class="btn btn-sm btn-outline" value="table" aria-pressed="true" onclick="setApiView(this)">Tabelle</button>
        <button type="button" class="btn btn-sm btn-outline" value="json" aria-pressed="false" onclick="setApiView(this)">JSON-Baum</button>
      </div>
      <div class="api-view" role="region" aria-label="Antwort von GET ${esc(url)}" tabindex="0"></div>
    </details>
  `;
}

// Ersetzt alle Klassen: is-loading (Ladeanimation #91) fällt mit der Antwort weg
function setMeta(card, text, className) {
  const meta = card.querySelector('.api-meta');
  meta.textContent = text;
  meta.className = `api-meta ${className}`;
}

function setSource(card, source) {
  const tag = card.querySelector('.api-source');
  const [label, variant] = SOURCES[source] || [''];
  tag.textContent = label;
  tag.className = label ? `api-source badge ${variant}` : 'api-source';
}

async function fetchResult(url) {
  const started = performance.now();
  try {
    const res = await rawFetch(url); // Fehlerstatus soll hier sichtbar bleiben, nicht auf die Fehlerseite führen
    const text = await res.text();
    const result = { ok: res.ok, status: res.status, source: res.headers.get('X-Datenquelle'), text, isJson: true, bytes: new Blob([text]).size, ms: Math.round(performance.now() - started) };
    try {
      result.data = JSON.parse(text);
    } catch {
      result.isJson = false;
    }
    return result;
  } catch (err) {
    return { ok: false, status: 'Netzwerkfehler', text: err.message, isJson: false };
  }
}

function metaText(result) {
  const parts = [result.status];
  if (result.isJson && result.data !== null && typeof result.data === 'object') parts.push(countLabel(result.data));
  if (result.bytes !== undefined) parts.push(result.bytes < 1024 ? `${result.bytes} B` : `${(result.bytes / 1024).toFixed(1)} KB`, `${result.ms} ms`);
  return parts.join(' · ');
}

// Leere Werte grau markieren: so fällt auf, welche Felder live nicht ankommen
function emptyLabel(value) {
  if (value === undefined) return '–'; // Feld fehlt in dieser Zeile
  if (value === null) return 'null';
  if (value === '') return 'leer';
  if (typeof value === 'object' && !Object.keys(value).length) return countLabel(value);
  return '';
}

function primitive(value) {
  const text = String(value);
  // Lange Texte brechen um, statt die Tabelle in die Breite zu ziehen
  return `<span class="api-${typeof value}${text.length > 40 ? ' api-long' : ''}">${esc(text)}</span>`;
}

// shortcut: verschachtelte Ebenen werden auch zugeklappt gleich gezeichnet; erst bei sehr grossen Live-Antworten beim Aufklappen zeichnen
function cell(value, key, open) {
  const empty = emptyLabel(value);
  if (empty) return `<span class="api-empty">${empty}</span>`;
  if (typeof value !== 'object') return primitive(value);
  // Listen einfacher Werte (Rollen, Kurskürzel) stehen auf einer Zeile
  if (Array.isArray(value) && !value.some(item => item !== null && typeof item === 'object')) return value.map(item => cell(item, key, open)).join(', ');
  return `<details data-key="${esc(key)}"${open.has(key) ? ' open' : ''}><summary>${countLabel(value)}</summary>${table(value, key, open)}</details>`;
}

// Zeilen einer Tabelle: eine Liste von Objekten, oder ein Objekt aus gleich gebauten Objekten (Kurse nach Kürzel)
function rowsOf(value) {
  const entries = Object.entries(value);
  if (!entries.every(([, item]) => isObject(item))) return null;
  if (Array.isArray(value)) return entries;
  const [first, ...rest] = entries.map(([, item]) => Object.keys(item));
  const shared = first.filter(field => rest.every(fields => fields.includes(field)));
  return rest.length && shared.length * 2 >= first.length ? entries : null;
}

// Eine Liste als Tabelle (eine Zeile pro Eintrag, eine Spalte pro Feld), sonst Feld/Wert-Liste
function table(value, key, open) {
  if (emptyLabel(value) || typeof value !== 'object') return cell(value, key, open);
  const rows = rowsOf(value);
  if (!rows) {
    return `<table class="data-table api-table"><tbody>${Object.entries(value).map(([field, item]) =>
      `<tr><th scope="row">${esc(field)}</th><td>${cell(item, `${key}.${field}`, open)}</td></tr>`).join('')}</tbody></table>`;
  }
  const fields = [...new Set(rows.flatMap(([, row]) => Object.keys(row)))];
  return `<table class="data-table api-table">
    <thead><tr><th scope="col">${Array.isArray(value) ? '#' : 'Schlüssel'}</th>${fields.map(field => `<th scope="col">${esc(field)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([name, row]) => `<tr><th scope="row">${esc(name)}</th>${fields.map(field =>
      `<td>${cell(row[field], `${key}.${name}.${field}`, open)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function jsonValue(value) {
  if (value === null) return '<span class="api-empty">null</span>';
  if (typeof value === 'object') return `<span class="api-empty">${Array.isArray(value) ? '[]' : '{}'}</span>`;
  return `<span class="api-${typeof value}">${esc(typeof value === 'string' ? JSON.stringify(value) : String(value))}</span>`;
}

// JSON-Baum wie im Browser: jede Ebene einzeln aufklappbar
function jsonTree(value, key, open) {
  return `<ul class="api-json">${Object.entries(value).map(([field, item]) => {
    const label = `<span class="api-key">${esc(field)}</span>: `;
    const path = `${key}.${field}`;
    if (emptyLabel(item) || typeof item !== 'object') return `<li>${label}${jsonValue(item)}</li>`;
    const [start, end] = Array.isArray(item) ? ['[', ']'] : ['{', '}'];
    return `<li><details data-key="${esc(path)}"${open.has(path) ? ' open' : ''}><summary>${label}<span class="api-empty">${start} ${countLabel(item)} ${end}</span></summary>${jsonTree(item, path, open)}</details></li>`;
  }).join('')}</ul>`;
}

// Zeichnet die Antwort einer Karte neu; Aufgeklapptes und der Fokus bleiben, wo sie waren
function renderView(card) {
  const result = results.get(card);
  if (!result) return;
  const view = card.querySelector('.api-view');
  const open = new Set([...view.querySelectorAll('details[open]')].map(details => details.dataset.key));
  const focused = view.contains(document.activeElement) && document.activeElement.closest('details')?.dataset.key;

  const { data } = result;
  if (!result.isJson) view.innerHTML = `<pre>${esc(result.text)}</pre>`;
  else if (card.dataset.view !== 'json') view.innerHTML = table(data, '', open);
  else view.innerHTML = emptyLabel(data) || typeof data !== 'object' ? jsonValue(data) : jsonTree(data, '', open);

  if (focused) view.querySelector(`details[data-key="${CSS.escape(focused)}"] > summary`)?.focus();
}

export function setApiView(button) {
  const card = button.closest('details');
  card.dataset.view = button.value;
  card.querySelectorAll('.api-switch button').forEach(other => other.setAttribute('aria-pressed', other === button));
  renderView(card);
}

export async function loadApiOutput() {
  const list = document.getElementById('apiOutputList');
  if (!list) return;

  // Den Pfad lädt der Baum erst, wenn ein Zielkurs gewählt ist
  const target = getSelectedTargetCourseId();
  // Die Baum-Aufrufe brauchen dieselbe Region wie der Baum, sonst sucht der Server nur im Standardbaum
  const region = getSelectedRegion();
  const query = region ? `?region=${encodeURIComponent(region)}` : '';
  const urls = [...ENDPOINTS.map(url => url.startsWith('/api/tree/') ? url + query : url), ...(target ? [`/api/tree/path/${target}${query}`] : [])];

  // Die Karten bleiben über jedes Neuladen stehen, samt Aufgeklapptem; nur der Pfad wechselt mit dem Zielkurs
  list.querySelectorAll(':scope > details').forEach(card => urls.includes(card.dataset.url) || card.remove());
  urls.filter(url => !cardFor(url)).forEach(url => list.insertAdjacentHTML('beforeend', cardHtml(url)));

  // Nur das jüngste Laden zeichnet: eine langsame ältere Antwort überschreibt keine neuere
  const load = ++latestLoad;
  await Promise.all(urls.map(async url => {
    setMeta(cardFor(url), 'lädt …', 'text-muted is-loading');
    const result = await fetchResult(url);
    if (load !== latestLoad) return;

    const card = cardFor(url);
    setMeta(card, metaText(result), result.ok ? 'text-muted' : 'text-danger');
    setSource(card, result.source);
    // Gleiche Antwort wie zuletzt: nichts neu zeichnen
    if (results.get(card)?.text === result.text) return;
    results.set(card, result);
    renderView(card);
  }));
}
