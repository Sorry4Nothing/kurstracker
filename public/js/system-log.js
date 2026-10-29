/**
 * Cevi Kurstracker - Systemlog (nur Abteilungsleitungen)
 * Zustand des Servers auf einen Blick: Gesamturteil, Kennzahlen mit Verlauf, Diagramme der letzten Stunde
 * (Anfragen, Antwortzeit, Speicher), häufigste Endpunkte und das filterbare Ereignislog.
 * Diagramme sind Inline-SVG ohne Bibliothek (die CSP erlaubt nur eigene Skripte); Farben kommen aus den Theme-Tokens.
 */

import { esc } from './utils.js';
import { rawFetch } from './fetch-guard.js';

const REFRESH_MS = 10000;
const PAGE = 100;
const CHART_H = 190;
const PAD = { l: 62, r: 14, t: 10, b: 24 };

const COLOR = {
  ok: 'var(--blue-solid)',
  clientError: 'var(--warn-ink)',
  serverError: 'var(--red-solid)',
  avgMs: 'var(--teal-solid)',
  p95Ms: 'var(--blue-solid)',
  memoryMb: 'var(--teal-solid)'
};
const LEVELS = { error: ['Fehler', 'badge-danger'], warn: ['Warnung', 'badge-warning'], info: ['Info', 'badge-info'] };
const DATABASE = { ok: ['erreichbar', 'badge-success'], fehler: ['nicht erreichbar', 'badge-danger'], 'nicht konfiguriert': ['nicht konfiguriert', 'badge-warning'] };

let data = null;
let filter = { level: 'all', source: 'all', text: '' };
let shown = PAGE;
let timer = null;
const openTables = new Set();

const clock = iso => new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
const clockSec = iso => new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const day = iso => new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
const num = n => Number(n).toLocaleString('de-CH');
const sum = (list, key) => list.reduce((a, s) => a + (s[key] ?? 0), 0);

function uptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d} T ${h} Std` : h ? `${h} Std ${m} Min` : `${m} Min`;
}

// Achsenende auf eine gerade Zahl (2, 4, 6, 8, 10, 20, …), damit die Mitte der Achse eine ganze Zahl bleibt
function niceMax(value) {
  const m = Math.max(value, 2);
  const p = 10 ** Math.floor(Math.log10(m));
  return [1, 2, 4, 6, 8, 10].map(c => c * p).find(c => c >= m);
}

// -----------------------------------------------------------------------------
// Diagramme (SVG)
// -----------------------------------------------------------------------------

let chartId = 0;

// Raster wie bei Bklit: gestrichelte Linien, die an den Enden ausblenden; das Fadenkreuz blendet oben und unten aus
function frame(width, max, unit, series) {
  const id = `slc${++chartId}`;
  const plotW = width - PAD.l - PAD.r;
  const plotH = CHART_H - PAD.t - PAD.b;
  const y = v => PAD.t + plotH - (v / max) * plotH;
  const x0 = PAD.l;
  const x1 = width - PAD.r;
  const defs = `<defs>
    <linearGradient id="${id}-f" gradientUnits="userSpaceOnUse" x1="${x0}" x2="${x1}" y1="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".08" stop-color="#fff"/><stop offset=".92" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${CHART_H}"><rect x="${x0}" y="0" width="${plotW}" height="${CHART_H}" fill="url(#${id}-f)"/></mask>
    <linearGradient id="${id}-c" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" style="stop-color:var(--text-muted);stop-opacity:0"/><stop offset=".5" style="stop-color:var(--text-muted)"/><stop offset="1" style="stop-color:var(--text-muted);stop-opacity:0"/>
    </linearGradient>
  </defs>`;
  const lines = [0, max / 2, max].map(v => `<line class="syslog-grid" x1="${x0}" x2="${x1}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
  const labels = [0, max / 2, max].map(v => `<text class="syslog-axis" x="${x0 - 8}" y="${y(v) + 4}" text-anchor="end">${num(v)}${unit}</text>`).join('');
  const step = plotW < 360 ? 20 : 10; // schmale Diagramme: seltener beschriften, sonst laufen die Zeiten ineinander
  const ticks = series.map((s, i) => ((series.length - 1 - i) % step === 0
    ? `<text class="syslog-axis" x="${x0 + (i + 0.5) * (plotW / series.length)}" y="${CHART_H - 6}" text-anchor="${i === series.length - 1 ? 'end' : 'middle'}">${clock(s.time)}</text>`
    : '')).join('');
  return { id, plotW, plotH, y, slot: plotW / series.length, head: defs, grid: `<g mask="url(#${id}-m)">${lines}</g>${labels}${ticks}` };
}

const topRounded = (x, y, w, h, r) => `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;

// Gestapelte Säulen pro Minute: normal / abgelehnt / Serverfehler. 2 px Luft zwischen den Segmenten, nur das oberste Segment ist oben gerundet.
// Beim Überfahren bleibt die Säule stehen, die anderen blenden aus (CSS)
function columnChart(series, width) {
  const max = niceMax(Math.max(...series.map(s => s.ok + s.clientError + s.serverError)));
  const f = frame(width, max, '', series);
  const barW = Math.min(24, Math.max(3, f.slot - 2));
  const parts = series.map((s, i) => {
    const x = PAD.l + i * f.slot + (f.slot - barW) / 2;
    let top = f.y(0);
    const segs = [['ok', s.ok], ['clientError', s.clientError], ['serverError', s.serverError]].filter(([, v]) => v > 0);
    const marks = segs.map(([key, v], k) => {
      const h = (v / max) * f.plotH;
      const gap = k > 0 ? 2 : 0;
      const y0 = top - h;
      top = y0;
      const hh = Math.max(h - gap, 1);
      const style = `fill:${COLOR[key]}`;
      return k === segs.length - 1
        ? `<path d="${topRounded(x, y0 + gap, barW, hh, Math.min(4, barW / 2, hh))}" style="${style}"/>`
        : `<rect x="${x}" y="${y0 + gap}" width="${barW}" height="${hh}" style="${style}"/>`;
    }).join('');
    const tip = `${clock(s.time)}\n${s.ok} normal\n${s.clientError} abgelehnt\n${s.serverError} Serverfehler`;
    return `<g class="syslog-slot"><g class="syslog-bars">${marks}</g><rect class="syslog-hit" x="${PAD.l + i * f.slot}" y="${PAD.t}" width="${f.slot}" height="${f.plotH}" data-tip="${esc(tip)}"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${CHART_H}" width="${width}" height="${CHART_H}" role="img" aria-label="Anfragen pro Minute, letzte Stunde">${f.head}${f.grid}${parts}</svg>`;
}

// Weiche Kurve durch alle Punkte ohne Überschwinger (monotone Kubik wie d3 curveMonotoneX)
function smooth(pts) {
  const n = pts.length;
  const at = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  if (n === 1) return `M${at(pts[0])}`;
  const sign = v => (v < 0 ? -1 : 1);
  const d = pts.slice(1).map((p, i) => [p.x - pts[i].x, p.y - pts[i].y]);
  const s = d.map(([dx, dy]) => (dx ? dy / dx : 0));
  const t = pts.map((_, i) => {
    if (i === 0 || i === n - 1) return 0;
    const p = (s[i - 1] * d[i][0] + s[i] * d[i - 1][0]) / (d[i - 1][0] + d[i][0]);
    return (sign(s[i - 1]) + sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p)) || 0;
  });
  t[0] = n === 2 ? s[0] : (3 * s[0] - t[1]) / 2;
  t[n - 1] = n === 2 ? s[0] : (3 * s[n - 2] - t[n - 2]) / 2;
  let path = `M${at(pts[0])}`;
  for (let i = 1; i < n; i++) {
    const dx = (pts[i].x - pts[i - 1].x) / 3;
    path += `C${(pts[i - 1].x + dx).toFixed(1)},${(pts[i - 1].y + dx * t[i - 1]).toFixed(1)} ${(pts[i].x - dx).toFixed(1)},${(pts[i].y - dx * t[i]).toFixed(1)} ${at(pts[i])}`;
  }
  return path;
}

const areaGradient = (id, color) => `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.4"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient>`;

// Weiche Linien (2 px) mit Verlauf darunter, Minuten ohne Messwert werden überbrückt. Beim Überfahren erscheinen Fadenkreuz und Punkte
function lineChart(series, lines, width, { unit = '', label }) {
  const values = lines.flatMap(l => series.map(s => s[l.key])).filter(v => v !== null);
  const max = niceMax(Math.max(0, ...values) * 1.15);
  const f = frame(width, max, unit, series);
  const base = f.y(0);
  const px = i => PAD.l + (i + 0.5) * f.slot;
  const drawn = lines.map((l, k) => {
    const pts = series.map((s, i) => (s[l.key] === null ? null : { x: px(i), y: f.y(s[l.key]) })).filter(Boolean);
    if (!pts.length) return { defs: '', body: '' };
    const gid = `${f.id}-a${k}`;
    const last = pts.at(-1);
    const curve = pts.length > 1
      ? `<path d="${smooth(pts)}L${last.x.toFixed(1)},${base}L${pts[0].x.toFixed(1)},${base}Z" style="fill:url(#${gid});stroke:none"/><path class="syslog-line" d="${smooth(pts)}" style="stroke:${COLOR[l.key]};fill:none"/>`
      : '';
    return { defs: areaGradient(gid, COLOR[l.key]), body: `${curve}<circle class="syslog-dot" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" style="fill:${COLOR[l.key]}"/>` };
  });
  const slots = series.map((s, i) => {
    const rows = lines.map(l => `${l.label}: ${s[l.key] === null ? 'keine Daten' : `${num(s[l.key])}${unit}`}`).join('\n');
    const dots = lines.filter(l => s[l.key] !== null).map(l => `<circle class="syslog-dot syslog-hdot" cx="${px(i).toFixed(1)}" cy="${f.y(s[l.key]).toFixed(1)}" r="4.5" style="fill:${COLOR[l.key]}"/>`).join('');
    return `<g class="syslog-slot"><rect class="syslog-cross" x="${(px(i) - 0.5).toFixed(1)}" y="${PAD.t}" width="1" height="${f.plotH}" style="fill:url(#${f.id}-c)"/>${dots}<rect class="syslog-hit" x="${PAD.l + i * f.slot}" y="${PAD.t}" width="${f.slot}" height="${f.plotH}" data-tip="${esc(`${clock(s.time)}\n${rows}`)}"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${CHART_H}" width="${width}" height="${CHART_H}" role="img" aria-label="${esc(label)}">${f.head}<defs>${drawn.map(d => d.defs).join('')}</defs>${f.grid}${drawn.map(d => d.body).join('')}${slots}</svg>`;
}

function sparkline(values, color) {
  const w = 104;
  const h = 36;
  const id = `slc${++chartId}`;
  const max = Math.max(...values.filter(v => v !== null), 1);
  const pts = values.map((v, i) => (v === null ? null : { x: 3 + (i / (values.length - 1)) * (w - 6), y: h - 4 - (v / max) * (h - 10) })).filter(Boolean);
  const last = pts.at(-1);
  const body = pts.length > 1
    ? `<path d="${smooth(pts)}L${last.x.toFixed(1)},${h}L${pts[0].x.toFixed(1)},${h}Z" style="fill:url(#${id});stroke:none"/><path class="syslog-line" d="${smooth(pts)}" style="stroke:${color};fill:none"/>`
    : '';
  return `<svg class="syslog-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><defs>${areaGradient(id, color)}</defs>${body}${last ? `<circle class="syslog-dot" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3" style="fill:${color}"/>` : ''}</svg>`;
}

// -----------------------------------------------------------------------------
// Abschnitte
// -----------------------------------------------------------------------------

function verdict() {
  const { system, entries, process: proc } = data;
  const cutoff = Date.now() - 15 * 60000;
  const recent = entries.filter(e => e.level === 'error' && new Date(e.time).getTime() >= cutoff).length;
  let kind = 'ok';
  let icon = 'fa-circle-check';
  let title = 'Alles in Ordnung';
  let text = 'Server und Datenbank antworten, in den letzten 15 Minuten gab es keine Fehler.';
  if (system.database === 'fehler') {
    kind = 'bad'; icon = 'fa-circle-xmark'; title = 'Datenbank nicht erreichbar';
    text = 'Die App läuft, kann aber keine Vorschläge und Einstellungen speichern oder laden.';
  } else if (recent) {
    kind = 'warn'; icon = 'fa-triangle-exclamation'; title = `${recent} ${recent === 1 ? 'Fehler' : 'Fehler'} in den letzten 15 Minuten`;
    text = 'Die App läuft. Details stehen unten in den Ereignissen (Stufe «Fehler»).';
  }
  return `
    <div class="syslog-verdict syslog-verdict-${kind}" role="status">
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      <div>
        <strong>${esc(title)}</strong>
        <span>${esc(text)}</span>
      </div>
      <span class="syslog-verdict-meta">Läuft seit ${esc(uptime(proc.uptimeSeconds))}<br>Stand ${esc(clockSec(data.timestamp))}</span>
    </div>`;
}

const kpi = (label, value, sub, spark) => `
  <div class="card syslog-kpi">
    <span class="syslog-kpi-label">${esc(label)}</span>
    <span class="syslog-kpi-value">${value}</span>
    <span class="syslog-kpi-sub">${sub}</span>
    ${spark}
  </div>`;

function kpis() {
  const { series, system, requests, p95Ms } = data;
  const total = sum(series, 'ok') + sum(series, 'clientError') + sum(series, 'serverError');
  const rejected = sum(series, 'clientError');
  const failed = sum(series, 'serverError');
  const rate = total ? Math.round(((rejected + failed) / total) * 1000) / 10 : 0;
  const perMinute = series.map(s => s.ok + s.clientError + s.serverError);
  const memory = series.map(s => s.memoryMb);
  return [
    kpi('Anfragen, letzte Stunde', num(total), `${num(requests.total)} seit dem Start`, sparkline(perMinute, COLOR.ok)),
    kpi('Fehlerquote', `${String(rate).replace('.', ',')} %`, `${num(rejected)} abgelehnt, ${num(failed)} Serverfehler`, sparkline(series.map(s => s.clientError + s.serverError), COLOR.serverError)),
    kpi('Antwortzeit (95 %)', `${num(p95Ms)} ms`, `Ø ${num(requests.avgMs)} ms, Maximum ${num(requests.maxMs)} ms`, sparkline(series.map(s => s.p95Ms), COLOR.p95Ms)),
    kpi('Arbeitsspeicher', `${num(data.process.memoryMb)} MB`, `${num(system.activeSessions)} aktive Sitzungen`, sparkline(memory, COLOR.memoryMb))
  ].join('');
}

const legend = items => `<ul class="syslog-legend">${items.map(([key, text]) => `<li><span class="syslog-swatch" style="background:${COLOR[key]}"></span>${esc(text)}</li>`).join('')}</ul>`;

function tableView(id, header, rows) {
  const body = rows.length
    ? rows.map(r => `<tr>${r.map((c, i) => `<${i ? 'td' : 'th scope="row"'}>${esc(c)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${header.length}" class="empty-text">Keine Daten in der letzten Stunde.</td></tr>`;
  return `
    <details class="syslog-table-view" data-table="${id}"${openTables.has(id) ? ' open' : ''}>
      <summary>Als Tabelle anzeigen</summary>
      <div class="table-responsive" role="region" aria-label="Tabelle: ${esc(id)}" tabindex="0">
        <table class="data-table"><thead><tr>${header.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
      </div>
    </details>`;
}

function chartCard(id, title, sub, legendHtml, tableHtml) {
  return `
    <section class="card syslog-chart" aria-labelledby="slc-${id}">
      <div class="syslog-chart-head">
        <div><h3 id="slc-${id}">${esc(title)}</h3><p class="text-muted">${esc(sub)}</p></div>
        ${legendHtml}
      </div>
      <div class="syslog-plot" data-plot="${id}"></div>
      ${tableHtml}
    </section>`;
}

function routesCard() {
  const { routes } = data;
  const max = Math.max(1, ...routes.map(r => r.count));
  const rows = routes.length ? routes.map(r => `
    <li data-tip="${esc(`${r.route}\n${r.count} Anfragen\nØ ${r.avgMs} ms, Maximum ${r.maxMs} ms\n${r.errors} Serverfehler`)}">
      <span class="syslog-route-name" title="${esc(r.route)}">${esc(r.route.replace(/^\/api/, ''))}</span>
      <span class="syslog-route-bar"><span style="width:${Math.max(2, (r.count / max) * 100)}%;background:${r.errors ? COLOR.serverError : COLOR.ok}"></span></span>
      <span class="syslog-route-count">${num(r.count)}</span>
      <span class="syslog-route-ms text-muted">${num(r.avgMs)} ms</span>
    </li>`).join('') : '<li class="empty-text">Noch keine Anfragen seit dem Start.</li>';
  return `
    <section class="card syslog-chart" aria-labelledby="slc-routes">
      <div class="syslog-chart-head"><div><h3 id="slc-routes">Häufigste Endpunkte</h3><p class="text-muted">Anzahl seit dem Start, Ø Antwortzeit rechts</p></div></div>
      <ul class="syslog-routes">${rows}</ul>
    </section>`;
}

// Ring wie bei Bklit: Bögen mit kleiner Lücke, in der Mitte der Anteil normaler Antworten; Hover blendet die übrigen Bögen aus
function ring(parts, total) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const shown = parts.filter(([, , v]) => v > 0);
  const gap = shown.length > 1 ? 4 : 0;
  let offset = 0;
  const arcs = shown.map(([key, t, v]) => {
    const len = (v / total) * C;
    const arc = `<circle class="syslog-arc" cx="70" cy="70" r="${R}" style="stroke:${COLOR[key]};stroke-dasharray:${Math.max(len - gap, 0.5).toFixed(1)} ${C.toFixed(1)};stroke-dashoffset:${(-offset).toFixed(1)}" data-tip="${esc(`${t}\n${num(v)} (${Math.round((v / total) * 100)} %)`)}"/>`;
    offset += len;
    return arc;
  }).join('');
  const okShare = total ? Math.round((parts[0][2] / total) * 100) : 0;
  return `
    <svg class="syslog-ring" viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="${esc(parts.map(([, t, v]) => `${t}: ${v}`).join(', '))}">
      <circle class="syslog-ring-track" cx="70" cy="70" r="${R}"/>
      <g transform="rotate(-90 70 70)">${arcs}</g>
      <text class="syslog-ring-value" x="70" y="72" text-anchor="middle">${total ? `${okShare} %` : '–'}</text>
      <text class="syslog-ring-label" x="70" y="90" text-anchor="middle">normal</text>
    </svg>`;
}

function mixCard() {
  const { requests } = data;
  const parts = [['ok', 'Normal', requests.ok], ['clientError', 'Abgelehnt (4xx)', requests.clientError], ['serverError', 'Serverfehler (5xx)', requests.serverError]];
  const total = Math.max(requests.total, 1);
  return `
    <section class="card syslog-chart" aria-labelledby="slc-mix">
      <div class="syslog-chart-head"><div><h3 id="slc-mix">Antworten seit dem Start</h3><p class="text-muted">${num(requests.total)} API-Anfragen</p></div></div>
      ${ring(parts, requests.total)}
      <ul class="syslog-mix">${parts.map(([key, t, v]) => `
        <li><span class="syslog-swatch" style="background:${COLOR[key]}"></span><span>${esc(t)}</span><strong>${num(v)}</strong><span class="text-muted">${Math.round((v / total) * 100)} %</span></li>`).join('')}
      </ul>
    </section>`;
}

function systemCard() {
  const { system, process: proc } = data;
  const [dbText, dbClass] = DATABASE[system.database] ?? [system.database, ''];
  const tile = (icon, label, value) => `
    <div class="syslog-sys-tile">
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      <div><dt>${esc(label)}</dt><dd>${value}</dd></div>
    </div>`;
  return `
    <section class="card syslog-chart" aria-labelledby="slc-system">
      <div class="syslog-chart-head"><div><h3 id="slc-system">System</h3><p class="text-muted">Umgebung und Verbindungen</p></div></div>
      <dl class="syslog-sys">
        ${tile('fa-database', 'Datenbank', `<span class="badge ${dbClass}">${esc(dbText)}</span>`)}
        ${tile('fa-plug', 'Cevi-DB', esc(system.preparationMode ? 'Testdaten (Vorbereitung)' : 'Live'))}
        ${tile('fa-server', 'Umgebung', esc(system.env.toUpperCase()))}
        ${tile('fa-tag', 'Version', esc(system.version ?? 'kein Release'))}
        ${tile('fa-microchip', 'Node.js', esc(proc.node))}
        ${tile('fa-power-off', 'Gestartet', `${esc(clockSec(proc.startedAt))} <span class="text-muted">${esc(day(proc.startedAt))}</span>`)}
      </dl>
    </section>`;
}

function chartsHtml() {
  const { series } = data;
  const active = series.filter(s => s.ok + s.clientError + s.serverError > 0);
  const tReq = tableView('Anfragen pro Minute', ['Zeit', 'Normal', 'Abgelehnt', 'Serverfehler'],
    active.map(s => [clock(s.time), s.ok, s.clientError, s.serverError]).reverse());
  const tTime = tableView('Antwortzeit', ['Zeit', 'Ø in ms', '95 % in ms'],
    series.filter(s => s.avgMs !== null).map(s => [clock(s.time), s.avgMs, s.p95Ms]).reverse());
  const tMem = tableView('Arbeitsspeicher', ['Zeit', 'MB'],
    series.filter(s => s.memoryMb !== null).map(s => [clock(s.time), s.memoryMb]).reverse());
  return `
    <div class="syslog-grid-2">
      ${chartCard('requests', 'Anfragen pro Minute', 'Letzte Stunde, nach Ergebnis', legend([['ok', 'Normal'], ['clientError', 'Abgelehnt'], ['serverError', 'Serverfehler']]), tReq)}
      ${chartCard('time', 'Antwortzeit', 'Letzte Stunde, pro Minute', legend([['avgMs', 'Durchschnitt'], ['p95Ms', '95 % der Anfragen']]), tTime)}
    </div>
    <div class="syslog-grid-3">
      ${chartCard('memory', 'Arbeitsspeicher', 'Letzte Stunde, in MB', '', tMem)}
      ${routesCard()}
      ${mixCard()}
    </div>
    ${systemCard()}`;
}

function drawPlots() {
  const { series } = data;
  for (const plot of document.querySelectorAll('#slCharts [data-plot]')) {
    const width = Math.max(260, Math.floor(plot.clientWidth));
    plot.innerHTML = {
      requests: () => columnChart(series, width),
      time: () => lineChart(series, [{ key: 'avgMs', label: 'Durchschnitt' }, { key: 'p95Ms', label: '95 %' }], width, { unit: ' ms', label: 'Antwortzeit pro Minute, letzte Stunde' }),
      memory: () => lineChart(series, [{ key: 'memoryMb', label: 'Arbeitsspeicher' }], width, { unit: ' MB', label: 'Arbeitsspeicher, letzte Stunde' })
    }[plot.dataset.plot]();
  }
}

// -----------------------------------------------------------------------------
// Ereignisse
// -----------------------------------------------------------------------------

const REQUEST_LINE = /^(\d{3}) (\w+) (\S+) (\d+) ms akteur=(.*)$/;

// Eine Zeile pro Ereignis: Zeit, Marke (HTTP-Status oder Stufe), Inhalt, Dauer, Akteur
function rowHtml(e) {
  const m = e.source === 'Anfrage' && REQUEST_LINE.exec(e.message);
  const time = `<time class="syslog-time" datetime="${esc(e.time)}">${esc(clockSec(e.time))}</time>`;
  if (!m) {
    return `<li class="syslog-row syslog-row-${e.level}">${time}
      <span class="badge ${LEVELS[e.level][1]} syslog-chip">${LEVELS[e.level][0]}</span>
      <span class="syslog-main"><span class="syslog-source">${esc(e.source)}</span>${esc(e.message)}</span></li>`;
  }
  const [, status, method, path, ms, actor] = m;
  const kind = status >= 500 ? 'bad' : status >= 400 ? 'warn' : 'ok';
  return `<li class="syslog-row syslog-row-${e.level}">${time}
    <span class="syslog-http syslog-http-${kind}">${status}</span>
    <span class="syslog-main"><span class="syslog-method">${esc(method)}</span><span class="syslog-path">${esc(path)}</span></span>
    <span class="syslog-ms">${esc(ms)} ms</span>
    <span class="syslog-actor">${esc(actor)}</span></li>`;
}

function matches(e) {
  if (filter.level !== 'all' && e.level !== filter.level) return false;
  if (filter.source !== 'all' && e.source !== filter.source) return false;
  return !filter.text || `${e.source} ${e.message}`.toLowerCase().includes(filter.text);
}

function renderEvents() {
  const { entries } = data;
  const counts = { all: entries.length, error: 0, warn: 0, info: 0 };
  entries.forEach(e => { counts[e.level]++; });
  document.getElementById('slLevels').innerHTML = ['all', 'error', 'warn', 'info'].map(l => `
    <button type="button" class="btn btn-sm btn-outline" data-level="${l}" aria-pressed="${l === filter.level}">${l === 'all' ? 'Alle' : LEVELS[l][0]} <span class="syslog-count">${counts[l]}</span></button>`).join('');

  const bySource = {};
  entries.forEach(e => { bySource[e.source] = (bySource[e.source] ?? 0) + 1; });
  if (filter.source !== 'all' && !bySource[filter.source]) filter.source = 'all';
  document.getElementById('slSources').innerHTML = ['all', ...Object.keys(bySource).sort()].map(s => `
    <button type="button" class="btn btn-sm btn-outline" data-source="${esc(s)}" aria-pressed="${s === filter.source}">${s === 'all' ? 'Alle' : esc(s)} <span class="syslog-count">${s === 'all' ? entries.length : bySource[s]}</span></button>`).join('');

  const list = entries.filter(matches);
  const today = day(new Date().toISOString());
  let lastDay = '';
  document.getElementById('slEvents').innerHTML = list.length ? list.slice(0, shown).map(e => {
    const d = day(e.time);
    const head = d === lastDay ? '' : `<li class="syslog-day">${d === today ? 'Heute' : esc(d)}</li>`;
    lastDay = d;
    return head + rowHtml(e);
  }).join('') : '<li class="empty-text">Keine Einträge für diese Auswahl.</li>';
  document.getElementById('slMore').hidden = list.length <= shown;
  document.getElementById('slMore').textContent = `Weitere ${Math.min(PAGE, list.length - shown)} anzeigen (${list.length - shown} übrig)`;
  document.getElementById('slEventNote').textContent = `${Math.min(shown, list.length)} von ${list.length} Einträgen. Der Server hält höchstens ${num(data.capacity)}, das Log beginnt nach einem Neustart von vorn.`;
}

// -----------------------------------------------------------------------------
// Aufbau, Laden, Ereignisse der Seite
// -----------------------------------------------------------------------------

function ensureSkeleton(root) {
  if (root.querySelector('#slCharts')) return;
  root.innerHTML = `
    <div id="slVerdict"></div>
    <div id="slKpis" class="syslog-kpis"></div>
    <div id="slCharts" class="syslog-charts"></div>
    <section class="card" aria-labelledby="slEventsTitle">
      <div class="syslog-chart-head">
        <div><h3 id="slEventsTitle">Ereignisse</h3><p class="text-muted" id="slEventNote"></p></div>
      </div>
      <div class="syslog-toolbar">
        <input type="search" id="slSearch" class="form-input" placeholder="Suchen, z. B. 403, planner, Fehler" aria-label="Ereignisse durchsuchen" autocomplete="off">
        <div class="syslog-filter" id="slLevels" role="group" aria-label="Stufe filtern"></div>
      </div>
      <div class="syslog-sources">
        <span class="syslog-sources-label" id="slSourcesLabel">Quelle</span>
        <div class="syslog-filter" id="slSources" role="group" aria-labelledby="slSourcesLabel"></div>
      </div>
      <ol class="syslog-log" id="slEvents" aria-label="Ereignisse" tabindex="0"></ol>
      <button type="button" class="btn btn-secondary syslog-more" id="slMore" hidden></button>
    </section>
    <div class="syslog-tip" id="slTip" role="tooltip" hidden></div>`;
}

function render() {
  const root = document.getElementById('systemLogContent');
  if (!root || !data) return;
  ensureSkeleton(root);
  document.getElementById('slVerdict').innerHTML = verdict();
  document.getElementById('slKpis').innerHTML = kpis();
  document.getElementById('slCharts').innerHTML = chartsHtml();
  drawPlots();
  renderEvents();
}

export async function loadSystemLog() {
  const root = document.getElementById('systemLogContent');
  if (!root) return;
  try {
    const res = await rawFetch('/api/system/logs');
    if (!res.ok) throw new Error(res.status === 403 ? 'Nur für Abteilungsleitungen.' : 'Das Log konnte nicht geladen werden.');
    data = await res.json();
    render();
  } catch (err) {
    if (!data) root.innerHTML = `<p class="empty-text">${esc(err.message)}</p>`;
  }
}

// Läuft nur, solange der Tab offen ist: navigation.js startet und stoppt die Aktualisierung
export function startSystemLogRefresh() {
  stopSystemLogRefresh();
  loadSystemLog();
  timer = setInterval(loadSystemLog, REFRESH_MS);
}

export function stopSystemLogRefresh() {
  clearInterval(timer);
  timer = null;
}

// Tooltip für alle Elemente mit data-tip: folgt der Maus, bleibt im sichtbaren Bereich der Seite
function showTip(target, event) {
  const tip = document.getElementById('slTip');
  if (!tip) return;
  tip.innerHTML = esc(target.dataset.tip).split('\n').map((line, i) => (i === 0 ? `<strong>${line}</strong>` : `<span>${line}</span>`)).join('');
  tip.hidden = false;
  const box = tip.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth };
  const x = Math.min(event.clientX - box.left + 14, box.width - tip.offsetWidth - 4);
  tip.style.left = `${Math.max(4, x)}px`;
  tip.style.top = `${event.clientY - box.top + 16}px`;
}

const hideTip = () => { const tip = document.getElementById('slTip'); if (tip) tip.hidden = true; };

document.addEventListener('mouseover', e => {
  const target = e.target.closest?.('#systemLogContent [data-tip]');
  if (target) showTip(target, e); else hideTip();
});
document.addEventListener('mousemove', e => {
  const target = e.target.closest?.('#systemLogContent [data-tip]');
  if (target) showTip(target, e);
});
document.addEventListener('click', e => {
  const level = e.target.closest?.('#systemLogContent [data-level]');
  if (level) { filter.level = level.dataset.level; shown = PAGE; renderEvents(); return; }
  const source = e.target.closest?.('#systemLogContent [data-source]');
  if (source) { filter.source = source.dataset.source; shown = PAGE; renderEvents(); return; }
  if (e.target.closest?.('#slMore')) { shown += PAGE; renderEvents(); }
});
document.addEventListener('input', e => {
  if (e.target.id !== 'slSearch') return;
  filter.text = e.target.value.trim().toLowerCase();
  shown = PAGE;
  renderEvents();
});
// toggle bubbelt nicht: im Capture-Modus abfangen, damit eine geöffnete Tabelle die Aktualisierung übersteht
document.addEventListener('toggle', e => {
  const id = e.target.dataset?.table;
  if (!id) return;
  if (e.target.open) openTables.add(id); else openTables.delete(id);
}, true);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (data && document.getElementById('slCharts')) drawPlots(); }, 150);
});
