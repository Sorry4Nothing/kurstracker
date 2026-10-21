// Statische Prüfungen des Design-Systems und der Frontend-Verdrahtung (ohne Browser).
// Regeln: Kopfkommentar von public/css/variables.css und die JS-Verträge in den CSS-Dateien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const read = file => readFileSync(file, 'utf8');
const listJs = dir => readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.js')).map(f => join(dir, f));
const rel = file => relative(PUBLIC, file).split(sep).join('/');

// Windows ignoriert Gross-/Kleinschreibung, der Linux-Server nicht: jedes Pfadsegment exakt prüfen
function existsExact(file) {
  let dir = ROOT;
  for (const part of relative(ROOT, file).split(sep)) {
    if (!readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

// Regeln mit Selektor, umgebenden At-Rules und Deklarationen; Kommentare entfernt, Strings bleiben ganz.
// shortcut: Klammern werden nicht gezählt, ein ungequotetes url(data:…;…) würde zerschnitten; dann Klammertiefe mitführen.
function parseCss(css) {
  const rules = [];
  const open = [];
  let buf = '';
  let quote = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === '{') {
      const rule = { selector: buf.trim().replace(/\s+/g, ' '), parents: open.map(r => r.selector), decls: [] };
      rules.push(rule);
      open.push(rule);
      buf = '';
    } else if (ch === ';' || ch === '}') {
      const text = buf.trim();
      const colon = text.indexOf(':');
      if (open.length && colon > 0) {
        open.at(-1).decls.push({ prop: text.slice(0, colon).trim(), value: text.slice(colon + 1).trim().replace(/\s+/g, ' ') });
      }
      if (ch === '}') open.pop();
      buf = '';
    } else {
      buf += ch;
    }
  }
  return rules;
}

const CSS_DIR = join(PUBLIC, 'css');
const cssFiles = readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));
const rules = cssFiles.flatMap(file => parseCss(read(join(CSS_DIR, file))).map(rule => ({ ...rule, file })));

const html = read(join(PUBLIC, 'index.html'));
const jsFiles = [join(PUBLIC, 'app.js'), ...listJs(join(PUBLIC, 'js'))];
const frontend = [{ name: 'index.html', text: html }, ...jsFiles.map(file => ({ name: rel(file), text: read(file) }))];

// Alle Deklarationen: CSS-Dateien plus style="" in index.html und in den JS-Templates
const declarations = [
  ...rules.flatMap(r => r.decls.map(d => ({ ...d, file: r.file, selector: r.selector }))),
  ...frontend.flatMap(({ name, text }) => [...text.matchAll(/\sstyle="([^"]*)"/g)]
    .flatMap(m => m[1].split(';').filter(s => s.includes(':')))
    .map(s => ({ prop: s.slice(0, s.indexOf(':')).trim(), value: s.slice(s.indexOf(':') + 1).trim(), file: name, selector: 'style=""' })))
];
const show = d => `${d.file} ${d.selector} { ${d.prop}: ${d.value} }`;

const selectorsOf = rule => rule.selector.split(',').map(s => s.trim());
const subjectOf = selector => selector.split(/\s*[\s>+~]\s*/).pop();
const themeIdOf = selector => /^(?:html)?\[data-theme=["']?([\w-]+)["']?\]$/.exec(selector)?.[1];
const variablesTop = rules.filter(r => r.file === 'variables.css' && !r.parents.length);
const themeBlocks = new Map(variablesTop.flatMap(r => selectorsOf(r).map(themeIdOf).filter(Boolean).map(id => [id, r])));

const themeJs = read(join(PUBLIC, 'js', 'theme.js'));
const themeNames = Object.fromEntries(
  [...(/const THEME_NAMES = \{([\s\S]*?)\};/.exec(themeJs)?.[1] ?? '').matchAll(/["']?([\w-]+)["']?\s*:\s*["']([^"']+)["']/g)].map(m => [m[1], m[2]])
);

function innerHtmlById(id) {
  const at = html.indexOf(`id="${id}"`);
  assert.ok(at >= 0, `#${id} fehlt in index.html`);
  const tag = /<(\w+)[^<]*$/.exec(html.slice(0, at))[1];
  const tags = new RegExp(`<(/?)${tag}\\b`, 'g');
  tags.lastIndex = html.indexOf('>', at) + 1;
  for (let depth = 1, m; (m = tags.exec(html));) {
    depth += m[1] ? -1 : 1;
    if (!depth) return html.slice(html.indexOf('>', at) + 1, m.index);
  }
  assert.fail(`#${id} wird nicht geschlossen`);
}
const startTag = id => new RegExp(`<\\w+\\b[^>]*\\sid="${id}"[^>]*>`).exec(html)?.[0] ?? '';

// --- Farben, Verläufe, Effekte -------------------------------------------------------------

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|(?<![\w-])(?:aqua|black|blue|fuchsia|gr[ae]y|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow)(?![\w-])/i;
const withoutStrings = value => value.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""').replace(/url\([^)]*\)/gi, 'url()');

test('Farbliterale (Hex, rgb(), Farbnamen) stehen nur in variables.css', () => {
  const found = declarations.filter(d => d.file !== 'variables.css' && COLOUR_LITERAL.test(withoutStrings(d.value)));
  assert.deepEqual(found.map(show), []);
});

test('keine Verläufe ausser dem Punktraster der Baum-Leinwand', () => {
  const dotGrid = d => d.file === 'tree.css' && d.selector === '.tree-canvas-container' && d.value.startsWith('radial-gradient(');
  const found = declarations.filter(d => /gradient\(/i.test(d.value) && !dotGrid(d));
  assert.deepEqual(found.map(show), []);
});

test('kein backdrop-filter', () => {
  assert.deepEqual(declarations.filter(d => /(^|-)backdrop-filter$/i.test(d.prop)).map(show), []);
});

test('kein "transition: all", auch nicht in Transition-Tokens', () => {
  const found = declarations.filter(d => /(^|-)transition(-property)?$/i.test(d.prop) && /(?<![\w-])all(?![\w-])/i.test(d.value));
  assert.deepEqual(found.map(show), []);
});

// --- Tokens und Themes ----------------------------------------------------------------------

test('jede var(--token) ist definiert: global in variables.css, in CSS auch als lokale Komponenten-Variable', () => {
  const customProps = list => new Set(list.flatMap(r => r.decls).map(d => d.prop).filter(p => p.startsWith('--')));
  const tokens = customProps(rules.filter(r => r.file === 'variables.css'));
  const local = customProps(rules.filter(r => r.file !== 'variables.css'));
  const refs = text => [...text.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);
  const missing = [
    ...declarations.filter(d => d.file.endsWith('.css'))
      .flatMap(d => refs(d.value).filter(t => !tokens.has(t) && !local.has(t)).map(t => `${d.file} ${d.selector}: ${t}`)),
    // Inline-Styles können überall landen, dort zählen nur globale Tokens
    ...frontend.flatMap(({ name, text }) => refs(text).filter(t => !tokens.has(t)).map(t => `${name}: ${t}`))
  ];
  assert.deepEqual(missing, []);
});

test('alle vier Themes definieren denselben Token-Satz (inkl. color-scheme)', () => {
  assert.equal(themeBlocks.size, 4, 'vier [data-theme]-Blöcke in variables.css erwartet');
  const props = rule => [...new Set(rule.decls.map(d => d.prop))].sort();
  const [[baseId, base], ...others] = themeBlocks;
  for (const [id, rule] of others) {
    assert.deepEqual(props(rule), props(base), `Theme ${id} weicht von ${baseId} ab`);
  }
});

test('Theme-IDs stimmen in theme.js, im Theme-Menü und in variables.css überein', () => {
  const ids = Object.keys(themeNames).sort();
  assert.equal(ids.length, 4, 'THEME_NAMES in theme.js nicht gefunden');
  const items = [...innerHtmlById('themeDropdownMenu').matchAll(/<div\b[^>]*\bdata-value="([^"]+)"[^>]*>[\s\S]*?<span>([^<]*)<\/span>/g)]
    .map(([, id, label]) => ({ id, label }));
  assert.deepEqual(items.map(i => i.id).sort(), ids, 'data-value im Theme-Menü');
  assert.deepEqual([...themeBlocks.keys()].sort(), ids, '[data-theme]-Blöcke');
  for (const { id, label } of items) assert.equal(label, themeNames[id], `Menütext von ${id} vs. Label nach der Auswahl`);

  // Ohne gespeichertes Theme fällt theme.js auf das Theme zurück, das auch :root füllt
  const rootTheme = variablesTop.map(selectorsOf).find(s => s.includes(':root') && s.some(themeIdOf))?.map(themeIdOf).find(Boolean);
  assert.equal(/localStorage\.getItem\('cevi_theme'\)\s*\|\|\s*'([\w-]+)'/.exec(themeJs)?.[1], rootTheme,
    `theme.js soll cevi_theme lesen und auf ${rootTheme} zurückfallen`);
  assert.deepEqual([...themeJs.matchAll(/localStorage\.setItem\('([^']+)'/g)].map(m => m[1]), ['cevi_theme'],
    'gespeicherte Themes bleiben nur mit demselben Schlüssel erhalten');
});

function luminance(color) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
  assert.ok(hex, `${color} ist kein deckender Hex-Wert, Kontrast nicht berechenbar`);
  const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(full.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('WCAG-Kontrastformel: Schwarz auf Weiss 21:1, #767676 knapp über und #777777 knapp unter 4.5:1', () => {
  assert.equal(contrast('#000000', '#FFFFFF').toFixed(2), '21.00');
  assert.ok(contrast('#767676', '#FFFFFF') >= 4.5);
  assert.ok(contrast('#777777', '#FFFFFF') < 4.5);
});

// Werte wie im Browser am <html>: :root-Blöcke, dann der Theme-Block (gleiche Spezifität, Quellreihenfolge)
function themeTokens(theme) {
  const tokens = new Map();
  for (const rule of variablesTop) {
    const selectors = selectorsOf(rule);
    if (!selectors.includes(':root') && !selectors.some(s => themeIdOf(s) === theme)) continue;
    for (const d of rule.decls) if (d.prop.startsWith('--')) tokens.set(d.prop, d.value);
  }
  return tokens;
}

function resolveToken(tokens, name, seen = []) {
  assert.ok(tokens.has(name), `${name} ist nicht definiert`);
  assert.ok(!seen.includes(name), `Zirkelbezug: ${[...seen, name].join(' -> ')}`);
  return tokens.get(name).replace(/var\(\s*(--[\w-]+)[^)]*\)/g, (_, ref) => resolveToken(tokens, ref, [...seen, name]));
}

const SURFACES = ['--bg-main', '--bg-surface', '--bg-surface-elevated', '--bg-subtle', '--bg-hover', '--sidebar-bg', '--canvas-bg'];

for (const theme of themeBlocks.keys()) {
  test(`Kontrast ≥ 4.5:1 im Theme ${themeNames[theme] ?? theme} (${theme})`, () => {
    const tokens = themeTokens(theme);
    const inks = [...tokens.keys()].filter(t => t.endsWith('-ink'));
    // *-ink ist Text auf seiner Fläche (--x, --x-hover, --x-bg, --x-soft, --x-soft-hover) oder auf der Seite;
    // eine Fläche mit eigenem *-ink (z.B. --primary-soft) gehört diesem
    const ownFills = ink => ['', '-hover', '-bg', '-soft', '-soft-hover']
      .map(suffix => ink.slice(0, -'-ink'.length) + suffix)
      .filter(fill => tokens.has(fill) && (`${fill}-ink` === ink || !tokens.has(`${fill}-ink`)));
    const pageText = ['--text-main', '--text-muted', '--text-dim', '--primary-text', '--cevi-accent', ...inks.filter(t => t !== '--primary-ink')];
    const pairs = [
      ...pageText.flatMap(fg => SURFACES.map(bg => [fg, bg])),
      ...inks.flatMap(ink => ownFills(ink).map(fill => [ink, fill])),
      ['--on-brand', '--band-bg'], ['--on-brand', '--band-hover'], ['--on-brand', '--primary'], ['--on-brand', '--primary-hover'],
      ['--band-ink-muted', '--band-bg']
    ];
    const failures = pairs
      .map(([fg, bg]) => ({ fg, bg, ratio: contrast(resolveToken(tokens, fg), resolveToken(tokens, bg)) }))
      .filter(p => p.ratio < 4.5)
      .map(p => `${p.fg} auf ${p.bg}: ${p.ratio.toFixed(2)}:1`);
    assert.deepEqual(failures, []);
  });
}

// --- Verdrahtung: Dateien, Module, Markup ----------------------------------------------------

test('style.css importiert jede Datei aus public/css genau einmal, mit ?v= und Tokens zuerst', () => {
  const css = read(join(PUBLIC, 'style.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const imports = [...css.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/g)].map(m => m[1]);
  for (const href of imports) {
    assert.match(href, /\?v=\w+/, `${href} ohne Cache-Bust`);
    assert.ok(existsExact(join(PUBLIC, href.split('?')[0])), `${href} fehlt`);
  }
  const files = imports.map(href => basename(href.split('?')[0]));
  assert.deepEqual([...files].sort(), [...cssFiles].sort());
  // Utilities in variables.css verlieren gegen spätere Komponenten, Views überschreiben components.css
  assert.equal(files[0], 'variables.css');
  for (const view of ['tree.css', 'profile.css', 'planner.css']) {
    assert.ok(files.indexOf('components.css') < files.indexOf(view), `${view} muss nach components.css laden`);
  }
});

test('index.html: lokale src/href zeigen auf vorhandene Dateien, style.css und app.js mit ?v=', () => {
  const urls = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map(m => m[1])
    .filter(url => url && !/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(url));
  assert.ok(urls.length > 0);
  assert.deepEqual(urls.filter(url => !existsExact(join(PUBLIC, decodeURI(url.split(/[?#]/)[0])))), []);
  assert.match(html, /<link\b[^>]*\shref="style\.css\?v=\w+"/);
  assert.match(html, /<script\b[^>]*\ssrc="app\.js\?v=\w+"/);
});

function exportsOf(source) {
  const names = new Set();
  for (const m of source.matchAll(/\bexport\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s*([\w$]+)/g)) names.add(m[1]);
  for (const m of source.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) if (part.trim()) names.add(part.trim().split(/\s+as\s+/).pop());
  }
  if (/\bexport\s+default\b/.test(source)) names.add('default');
  return names;
}

function importsOf(source) {
  const found = [...source.matchAll(/\b(?:import|export)\s+(?:([^'";]*?)\s*from\s*)?['"](\.{1,2}\/[^'"]+)['"]/g)].map(([, clause = '', spec]) => {
    const names = /\{([^}]*)\}/.exec(clause)?.[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) ?? [];
    if (/^[\w$]+/.test(clause)) names.push('default');
    return { spec, names };
  });
  const dynamic = [...source.matchAll(/\bimport\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)].map(([, spec]) => ({ spec, names: [] }));
  return [...found, ...dynamic];
}

test('ES-Module im Frontend: relative Importe treffen vorhandene Dateien und exportierte Namen', () => {
  const problems = [];
  let checked = 0;
  for (const file of jsFiles) {
    for (const { spec, names } of importsOf(read(file))) {
      checked++;
      const target = resolve(dirname(file), spec.split(/[?#]/)[0]);
      if (!existsExact(target)) {
        problems.push(`${rel(file)}: ${spec} existiert nicht`);
        continue;
      }
      const exported = exportsOf(read(target));
      for (const name of names) if (!exported.has(name)) problems.push(`${rel(file)}: ${spec} exportiert ${name} nicht`);
    }
  }
  assert.ok(checked > 0, 'keine Importe gefunden');
  assert.deepEqual(problems, []);
});

test('Inline-Handler (onclick, oninput, onsubmit) rufen nur Funktionen, die app.js auf window legt', () => {
  const globals = new Set([...read(join(PUBLIC, 'app.js')).matchAll(/window\.([\w$]+)\s*=/g)].map(m => m[1]));
  const called = new Set();
  for (const { text } of frontend) {
    for (const [, code] of text.matchAll(/\son[a-z]+="([^"]*)"/g)) {
      for (const [, fn] of code.replace(/\$\{[^}]*\}/g, '0').matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) called.add(fn);
    }
  }
  assert.ok(called.size > 0, 'keine Inline-Handler gefunden');
  assert.deepEqual([...called].filter(fn => !globals.has(fn)), []);
});

function missingElementIds() {
  const ids = new Set(frontend.flatMap(({ text }) => [...text.matchAll(/\sid="([\w-]+)"/g)].map(m => m[1])));
  return jsFiles.flatMap(file => [...read(file).matchAll(/\b(?:getElementById|setText|setPhoto)\(\s*'([\w-]+)'|querySelector(?:All)?\(\s*'#([\w-]+)/g)]
    .map(m => m[1] ?? m[2])
    .filter(id => !ids.has(id))
    .map(id => `${rel(file)}: #${id}`));
}

test('JS greift nur auf Element-IDs zu, die es in index.html oder in den Templates gibt', () => {
  assert.deepEqual(missingElementIds(), []);
});

test('Tastatur: div-Buttons und Optionen (role="button"/"option") sind per Tab erreichbar', () => {
  const tags = frontend.flatMap(({ name, text }) => [...text.matchAll(/<(?!button\b)\w+\b[^>]*\srole="(?:button|option)"[^>]*>/g)]
    .map(m => ({ name, tag: m[0].replace(/\s+/g, ' ') })));
  assert.ok(tags.length > 0);
  assert.deepEqual(tags.filter(t => !/\stabindex="0"/.test(t.tag)).map(t => `${t.name}: ${t.tag}`), []);
});

test('Baumknoten-Karte hat genau die Grösse, auf der tree-map.js die Verbindungslinien zeichnet', () => {
  const treeMap = read(join(PUBLIC, 'js', 'tree-map.js'));
  const width = /NODE_WIDTH\s*=\s*(\d+)/.exec(treeMap)?.[1];
  const height = /NODE_HEIGHT\s*=\s*(\d+)/.exec(treeMap)?.[1];
  assert.deepEqual([width, height], ['220', '80']);
  // Jede Regel, deren Subjekt die Karte selbst ist, auch in @media und mit Zustandsklassen
  const card = rules.filter(r => selectorsOf(r).some(s => /\.tree-node-card(?![\w-])/.test(subjectOf(s)))).flatMap(r => r.decls);
  const size = card.filter(d => /^(?:min-|max-)?(?:width|height)$/.test(d.prop)).map(d => `${d.prop}: ${d.value}`).sort();
  assert.deepEqual(size, [`height: ${height}px`, `width: ${width}px`]);
  assert.ok(card.every(d => d.prop !== 'box-sizing' || d.value === 'border-box'), 'Rahmen und Innenabstand gehören in die Kartengrösse');
});

test('Kursvorschlag-Dialog: .modal-backdrop bleibt Flex-Container, planner.js zeigt ihn mit display flex', () => {
  const display = rules.filter(r => selectorsOf(r).some(s => /\.modal-backdrop(?![\w-])/.test(subjectOf(s))))
    .flatMap(r => r.decls).filter(d => d.prop === 'display').map(d => d.value);
  assert.deepEqual(display, ['flex']);
  assert.match(startTag('nominationModal'), /\sclass="[^"]*\bmodal-backdrop\b/);
  const inline = [...read(join(PUBLIC, 'js', 'planner.js')).matchAll(/\.style\.display\s*=\s*'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual([...new Set(inline)].sort(), ['flex', 'none']);
});

test('Footer-Version bleibt versteckt, bis system.js eine Version aus einem Git-Tag setzt', () => {
  assert.match(startTag('footerVersion'), /\shidden[\s>]/);
  assert.match(html, /id="footerVersionTag"><\/span>/);
  // [hidden] muss gegen display-Regeln der Komponenten gewinnen
  const hidden = rules.filter(r => r.selector === '[hidden]').flatMap(r => r.decls).find(d => d.prop === 'display');
  assert.equal(hidden?.value, 'none !important');
});

// --- Syntax --------------------------------------------------------------------------------

test('Syntax: node --check besteht für src/, scripts/, public/app.js und public/js/', async () => {
  const files = [...listJs(join(ROOT, 'src')), ...listJs(join(ROOT, 'scripts')), ...jsFiles];
  assert.ok(files.length > 10);
  // parallel: ein Node-Start kostet unter Windows mehrere hundert ms
  const runs = await Promise.allSettled(files.map(file => execFileAsync(process.execPath, ['--check', file])));
  const failures = runs.flatMap((run, i) => (run.status === 'rejected' ? [`${relative(ROOT, files[i])}: ${run.reason.stderr || run.reason.message}`] : []));
  assert.deepEqual(failures, []);
});
