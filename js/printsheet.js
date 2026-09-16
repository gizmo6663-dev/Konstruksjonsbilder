// Bygger utskriftsvennlige A4-sider: oversikt med fargeliste + rutenett delt
// over flere sider. Brukes både til «Skriv ut» og til «Lagre som PDF» i
// nettleserens utskriftsdialog.

import { cellIndex, rowShiftOf, gridSpanX } from './pattern.js';
import { contrastTextColor } from './color.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// A4 i millimeter, med 10 mm marg.
const PAGE = { w: 210, h: 297, margin: 10 };
const CONTENT_W = PAGE.w - PAGE.margin * 2;
const CONTENT_H = PAGE.h - PAGE.margin * 2;
const HEADER_H = 11;
const FOOTER_H = 7;
const LABEL = 6.5; // plass til rad-/kolonnenummer

/**
 * Rutestørrelser å velge mellom på papir. Den første er naturlig størrelse:
 * da er hver rute like stor som brikken, og man kan legge perlebrettet rett
 * oppå utskriften og sette perlene i pinnene.
 */
export function cellSizeOptions(pitch) {
  const opts = [
    {
      value: 'natural',
      name: `Naturlig størrelse – ${fmt(pitch.w)} × ${fmt(pitch.h)} mm per brikke`,
      trueScale: true,
    },
    { value: 'auto', name: 'Automatisk – færrest mulig sider' },
  ];
  for (const mm of [5, 7, 9, 12]) {
    if (Math.abs(mm - pitch.w) < 0.05) continue; // allerede dekket av naturlig størrelse
    opts.push({ value: String(mm), name: `${mm} mm per rute` });
  }
  return opts;
}

/** 'natural' = like stor som brikken, 'auto' = så stor som får plass. */
function resolveCellMm(pattern, opts) {
  if (opts.cellSize === 'natural') return opts.pitch ? opts.pitch.w : autoCellMm(pattern);
  if (opts.cellSize === 'auto' || !opts.cellSize) return autoCellMm(pattern);
  const v = Number(opts.cellSize);
  return v > 0 ? v : autoCellMm(pattern);
}

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

function page(cls = '') {
  const div = document.createElement('div');
  div.className = 'print-page ' + cls;
  return div;
}

function svgPage() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${PAGE.w} ${PAGE.h}`);
  svg.setAttribute('width', `${PAGE.w}mm`);
  svg.setAttribute('height', `${PAGE.h}mm`);
  return svg;
}

/** Velger rutestørrelse som får hele mønsteret på én side hvis mulig. */
function autoCellMm(pattern) {
  const availW = CONTENT_W - LABEL;
  const availH = CONTENT_H - HEADER_H - FOOTER_H - LABEL;
  const spanX = gridSpanX(pattern);
  const aspect = pattern.cellAspect || 1;
  for (const mm of [12, 10, 9, 8, 7, 6, 5]) {
    if (spanX * mm <= availW && pattern.gridH * (mm / aspect) <= availH) return mm;
  }
  return 6;
}

/**
 * @param {object} pattern
 * @param {object} opts
 *   title, materialName, colorPrint, symbols, cellSize ('auto' | mm),
 *   previewCanvas, pitch {w,h}, overlap
 * @returns {DocumentFragment}
 */
export function buildPrintSheets(pattern, opts) {
  const frag = document.createDocumentFragment();
  const cellMm = resolveCellMm(pattern, opts);
  const cellHMm = cellMm / (pattern.cellAspect || 1);
  opts = { ...opts, trueScale: !!opts.pitch && Math.abs(cellMm - opts.pitch.w) < 0.05 };

  const availW = CONTENT_W - LABEL;
  const availH = CONTENT_H - HEADER_H - FOOTER_H - LABEL;
  const extra = gridSpanX(pattern) - pattern.gridW;
  const colsPerPage = Math.max(1, Math.floor(availW / cellMm - extra));
  const rowsPerPage = Math.max(1, Math.floor(availH / cellHMm));

  const overlap = opts.overlap ? 1 : 0;
  const stepX = Math.max(1, colsPerPage - overlap);
  const stepY = Math.max(1, rowsPerPage - overlap);
  const tilesX = Math.max(1, Math.ceil((pattern.gridW - overlap) / stepX));
  const tilesY = Math.max(1, Math.ceil((pattern.gridH - overlap) / stepY));
  const tileCount = tilesX * tilesY;

  frag.appendChild(buildOverviewPage(pattern, opts, { cellMm, tilesX, tilesY, tileCount }));

  let n = 0;
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      n++;
      const x0 = tx * stepX;
      const y0 = ty * stepY;
      const x1 = Math.min(pattern.gridW, x0 + colsPerPage);
      const y1 = Math.min(pattern.gridH, y0 + rowsPerPage);
      frag.appendChild(
        buildGridPage(pattern, opts, {
          x0, y0, x1, y1, cellMm, cellHMm,
          tx, ty, tilesX, tilesY, index: n, total: tileCount, overlap,
        })
      );
    }
  }
  return frag;
}

function buildOverviewPage(pattern, opts, info) {
  const p = page('print-page--overview');
  const svg = svgPage();
  const M = PAGE.margin;

  svg.appendChild(el('text', { x: M, y: M + 7, class: 'p-title' }, opts.title || 'Byggemal'));
  svg.appendChild(
    el('text', { x: M, y: M + 13.5, class: 'p-sub' },
      `${opts.materialName} · ${pattern.gridW} × ${pattern.gridH} ruter · ${pattern.total} ${opts.unitPlural}`)
  );

  let y = M + 20;

  // Forhåndsvisning av det ferdige motivet.
  if (opts.previewCanvas) {
    const maxW = 78;
    const maxH = 78;
    const cw = opts.previewCanvas.width;
    const ch = opts.previewCanvas.height;
    const s = Math.min(maxW / cw, maxH / ch);
    const w = cw * s;
    const h = ch * s;
    const img = el('image', { x: M, y, width: w, height: h, preserveAspectRatio: 'none' });
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', opts.previewCanvas.toDataURL('image/png'));
    img.setAttribute('href', opts.previewCanvas.toDataURL('image/png'));
    svg.appendChild(img);

    const facts = [];
    if (opts.pitch) {
      const cmW = ((pattern.spanX || pattern.gridW) * opts.pitch.w) / 10;
      const cmH = (pattern.gridH * opts.pitch.h) / 10;
      facts.push(`Ferdig størrelse: ca. ${fmt(cmW)} × ${fmt(cmH)} cm`);
    }
    facts.push(`Antall farger: ${pattern.used.length}`);
    if (pattern.empty > 0) facts.push(`Tomme ruter: ${pattern.empty}`);
    facts.push(`Mønsteret er delt på ${info.tileCount} ${info.tileCount === 1 ? 'side' : 'sider'} (${info.tilesX} × ${info.tilesY}).`);
    if (opts.trueScale) {
      facts.push('Malen er i naturlig størrelse: legg brettet rett oppå arket.');
      facts.push('Skriv ut uten skalering, og mål kontrollinjalen nederst.');
    }
    if (pattern.rowShift) {
      facts.push(`Hver rad er forskjøvet ${fmt(pattern.rowShift * 100)} % av en brikkebredde mot høyre.`);
    }

    facts.forEach((t, i) => {
      svg.appendChild(el('text', { x: M + w + 6, y: y + 5 + i * 5.2, class: 'p-fact' }, t));
    });
    y += Math.max(h, facts.length * 5.2) + 8;
  }

  svg.appendChild(el('text', { x: M, y, class: 'p-h2' }, 'Fargeliste'));
  y += 5;

  // Fargelisten settes i kolonner som fyller siden nedover.
  const rowH = 5.6;
  const colW = CONTENT_W / 2;
  const rowsAvail = Math.floor((PAGE.h - M - FOOTER_H - y) / rowH);
  pattern.used.forEach((entry, i) => {
    const col = Math.floor(i / rowsAvail);
    const row = i % rowsAvail;
    const cx = M + col * colW;
    const cy = y + row * rowH;
    if (cx + colW > PAGE.w - M + 1) return;

    svg.appendChild(el('rect', {
      x: cx, y: cy, width: 4.6, height: 4.6, rx: 0.8,
      fill: entry.color.hex, stroke: '#333', 'stroke-width': 0.2,
    }));
    svg.appendChild(el('text', {
      x: cx + 2.3, y: cy + 3.4, class: 'p-sym',
      fill: contrastTextColor(entry.color.hex),
    }, pattern.symbols.get(entry.index)));
    svg.appendChild(el('text', { x: cx + 6.5, y: cy + 3.4, class: 'p-legend' },
      `${entry.color.code ? entry.color.code + ' · ' : ''}${entry.color.name}`));
    svg.appendChild(el('text', { x: cx + colW - 4, y: cy + 3.4, class: 'p-legend p-count' },
      `${entry.count} stk`));
  });

  svg.appendChild(el('text', { x: M, y: PAGE.h - M, class: 'p-foot' }, 'Side 1 – oversikt'));
  p.appendChild(svg);
  return p;
}

function buildGridPage(pattern, opts, t) {
  const p = page();
  const svg = svgPage();
  const M = PAGE.margin;
  const { x0, y0, x1, y1, cellMm, cellHMm, overlap } = t;

  const cols = x1 - x0;
  const rows = y1 - y0;
  const extra = gridSpanX(pattern) - pattern.gridW;
  const gridW = (cols + extra) * cellMm;
  const gridH = rows * cellHMm;
  const ox = M + LABEL;
  const oy = M + HEADER_H + LABEL;

  const title = trunc(opts.title || 'Byggemal', 34);
  svg.appendChild(el('text', { x: M, y: M + 5, class: 'p-h2' },
    t.total > 1 ? `${title} – del ${t.index} av ${t.total}` : title));
  const sub = [`Kolonne ${x0 + 1}–${x1} · rad ${y0 + 1}–${y1}`];
  if (t.total > 1) sub.push(`rute ${t.tx + 1} av ${t.tilesX} bortover, ${t.ty + 1} av ${t.tilesY} nedover`);
  if (t.overlap && (x0 > 0 || y0 > 0)) sub.push('den blasse kanten overlapper forrige side');
  svg.appendChild(el('text', { x: M, y: M + 10, class: 'p-sub' }, sub.join(' · ')));

  // Minikart som viser hvor på motivet denne siden hører hjemme.
  if (t.total > 1) {
    const mw = 22;
    const mh = mw * (pattern.gridH / pattern.gridW);
    const mx = PAGE.w - M - mw;
    const my = M + 1;
    svg.appendChild(el('rect', { x: mx, y: my, width: mw, height: mh, fill: '#fff', stroke: '#999', 'stroke-width': 0.25 }));
    svg.appendChild(el('rect', {
      x: mx + (x0 / pattern.gridW) * mw,
      y: my + (y0 / pattern.gridH) * mh,
      width: (cols / pattern.gridW) * mw,
      height: (rows / pattern.gridH) * mh,
      fill: '#000', 'fill-opacity': 0.25, stroke: '#000', 'stroke-width': 0.35,
    }));
  }

  const showSymbols = opts.symbols !== false && Math.min(cellMm, cellHMm) >= 4;
  const fontSize = Math.min(cellMm, cellHMm) * 0.62;

  const cellsGroup = el('g', {});
  for (let y = y0; y < y1; y++) {
    const shift = rowShiftOf(pattern, y) * cellMm;
    for (let x = x0; x < x1; x++) {
      const pi = pattern.indices[cellIndex(pattern, x, y)];
      const px = ox + (x - x0) * cellMm + shift;
      const py = oy + (y - y0) * cellHMm;
      const inOverlap = overlap && ((x < x0 + overlap && x0 > 0) || (y < y0 + overlap && y0 > 0));

      if (pi < 0) {
        // Tom rute markeres med en diagonal strek så den ikke forveksles med hvit.
        cellsGroup.appendChild(el('line', {
          x1: px + cellMm * 0.25, y1: py + cellHMm * 0.25,
          x2: px + cellMm * 0.75, y2: py + cellHMm * 0.75,
          stroke: '#bbb', 'stroke-width': 0.25,
        }));
        continue;
      }
      const color = pattern.colors[pi];
      if (opts.colorPrint !== false) {
        cellsGroup.appendChild(el('rect', {
          x: px, y: py, width: cellMm, height: cellHMm,
          fill: color.hex, 'fill-opacity': inOverlap ? 0.35 : 1,
        }));
      }
      if (showSymbols) {
        cellsGroup.appendChild(el('text', {
          x: px + cellMm / 2, y: py + cellHMm / 2 + fontSize * 0.36,
          class: 'p-cell', 'font-size': fontSize,
          fill: opts.colorPrint !== false ? contrastTextColor(color.hex) : '#000',
          'fill-opacity': inOverlap ? 0.4 : 1,
        }, pattern.symbols.get(pi)));
      }
    }
  }
  svg.appendChild(cellsGroup);

  // Rutenett.
  const thin = el('path', { stroke: '#8a8a8a', 'stroke-width': 0.12, fill: 'none' });
  const thick = el('path', { stroke: '#111', 'stroke-width': 0.4, fill: 'none' });
  let dThin = '';
  let dThick = '';

  for (let y = y0; y <= y1; y++) {
    const py = oy + (y - y0) * cellHMm;
    const seg = `M${ox} ${py}H${ox + gridW}`;
    (y % 5 === 0 || y === y0 || y === y1 ? (dThick += seg) : (dThin += seg));
  }
  if (!pattern.rowShift) {
    for (let x = x0; x <= x1; x++) {
      const px = ox + (x - x0) * cellMm;
      const seg = `M${px} ${oy}V${oy + gridH}`;
      (x % 5 === 0 || x === x0 || x === x1 ? (dThick += seg) : (dThin += seg));
    }
  } else {
    // Forskjøvet rutenett: marker brikkeskiller per rad.
    for (let y = y0; y < y1; y++) {
      const shift = rowShiftOf(pattern, y) * cellMm;
      const py = oy + (y - y0) * cellHMm;
      for (let x = x0; x <= x1; x++) {
        const px = ox + (x - x0) * cellMm + shift;
        dThin += `M${px} ${py}v${cellHMm}`;
      }
    }
  }
  thin.setAttribute('d', dThin);
  thick.setAttribute('d', dThick);
  svg.appendChild(thin);
  svg.appendChild(thick);

  // Nummerering hver 5. rute.
  for (let x = x0; x < x1; x++) {
    if ((x + 1) % 5 !== 0 && x !== x0) continue;
    svg.appendChild(el('text', {
      x: ox + (x - x0 + 0.5) * cellMm, y: oy - 1.5, class: 'p-axis',
    }, String(x + 1)));
  }
  for (let y = y0; y < y1; y++) {
    if ((y + 1) % 5 !== 0 && y !== y0) continue;
    svg.appendChild(el('text', {
      x: ox - 1.5, y: oy + (y - y0 + 0.5) * cellHMm + 1.1, class: 'p-axis p-axis--row',
    }, String(y + 1)));
  }

  const scaleNote = opts.trueScale
    ? `naturlig størrelse – ${fmt(cellMm)} × ${fmt(cellHMm)} mm per rute`
    : `rutestørrelse ${fmt(cellMm)} × ${fmt(cellHMm)} mm`;
  svg.appendChild(el('text', { x: M, y: PAGE.h - M, class: 'p-foot' },
    `Side ${t.index + 1} av ${t.total + 1} · ${scaleNote}`));
  svg.appendChild(rulerGroup(PAGE.w - M - 50, PAGE.h - M - 2.5));

  p.appendChild(svg);
  return p;
}

/**
 * 50 mm kontrollinjal. Måler den ikke 5 cm på papiret, er utskriften skalert –
 * da stemmer heller ikke naturlig størrelse, og brettet passer ikke oppå.
 */
function rulerGroup(x, y) {
  const g = el('g', {});
  g.appendChild(el('path', {
    d: `M${x} ${y - 1.4}v2.8M${x} ${y}h50M${x + 50} ${y - 1.4}v2.8`
      + `M${x + 10} ${y - 0.9}v1.8M${x + 20} ${y - 0.9}v1.8M${x + 30} ${y - 0.9}v1.8M${x + 40} ${y - 0.9}v1.8`,
    stroke: '#111', 'stroke-width': 0.3, fill: 'none',
  }));
  g.appendChild(el('text', { x: x + 25, y: y - 2.4, class: 'p-axis' }, 'kontrollmål 50 mm'));
  return g;
}

function trunc(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function fmt(v) {
  return (Math.round(v * 10) / 10).toString().replace('.', ',');
}

/** Anslår hvor mange sider malen blir, uten å bygge dem. */
export function estimateSheets(pattern, opts = {}) {
  const cellMm = resolveCellMm(pattern, opts);
  const cellHMm = cellMm / (pattern.cellAspect || 1);
  const availW = CONTENT_W - LABEL;
  const availH = CONTENT_H - HEADER_H - FOOTER_H - LABEL;
  const extra = gridSpanX(pattern) - pattern.gridW;
  const colsPerPage = Math.max(1, Math.floor(availW / cellMm - extra));
  const rowsPerPage = Math.max(1, Math.floor(availH / cellHMm));
  const overlap = opts.overlap ? 1 : 0;
  const stepX = Math.max(1, colsPerPage - overlap);
  const stepY = Math.max(1, rowsPerPage - overlap);
  const tilesX = Math.max(1, Math.ceil((pattern.gridW - overlap) / stepX));
  const tilesY = Math.max(1, Math.ceil((pattern.gridH - overlap) / stepY));
  return { cellMm, tilesX, tilesY, pages: tilesX * tilesY + 1 };
}
