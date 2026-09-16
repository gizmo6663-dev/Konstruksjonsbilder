// Applikasjonen: kobler sammen innstillinger, bildebehandling og visning.

import { MATERIALS, getMaterial, resolveMaterial } from './materials.js';
import { PALETTES, flattenPalette, defaultEnabledGroups } from './palettes.js';
import { decodeImage, rasterize } from './imageops.js';
import { DITHER_MODES, countColors } from './quantize.js';
import { buildPattern } from './pattern.js';
import { drawPattern, renderToCanvas, renderRawCanvas, patternPixelSize } from './render.js';
import { buildPrintSheets, estimateSheets, cellSizeOptions } from './printsheet.js';
import { BuildMode } from './buildmode.js';
import { contrastTextColor } from './color.js';

const SETTINGS_KEY = 'konstruksjonsbilder:innstillinger:v1';
const $ = (sel) => document.querySelector(sel);

// Startverdiene kommer fra materialet selv, så det er ett sted å endre dem.
const START = resolveMaterial('perler');

const state = {
  materialId: START.id,
  variants: {},
  gridW: START.presets[0].w,
  gridH: START.presets[0].h,
  // Størrelsesvalget er et tak motivet legges inn i, ikke en fast bredde.
  box: { w: START.presets[0].w, h: START.presets[0].h },
  presetIndex: 0,
  lockRatio: true,
  fit: 'cover',
  posX: 0.5,
  posY: 0.5,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  dither: 'none',
  bgTolerance: 0,
  pitch: { ...START.pitch },
  maxColors: 0,
  enabledGroups: {},
  offColors: new Set(),
  customColors: null,
  view: 'pattern',
  showGrid: false,
  showSymbols: false,
  // Naturlig størrelse er forvalget: da kan brettet legges rett oppå arket.
  print: { title: '', cellSize: 'natural', color: true, symbols: true, overlap: true },
};

let raster = null;
let imageAspect = 1;
let imageName = '';
let pattern = null;
let recomputeTimer = null;

const buildMode = new BuildMode($('#build-root'));
buildMode.onClose = () => buildMode.close();

/* ── Palett ─────────────────────────────────────────────────────────── */

/** Materialet slik det faktisk er satt opp nå: byggemåte + brukerens brikkemål. */
function currentMaterial() {
  return resolveMaterial(state.materialId, state.variants[state.materialId], state.pitch);
}

function cellAspect() {
  return state.pitch.w / state.pitch.h;
}

function currentPaletteId() {
  return getMaterial(state.materialId).palette;
}

function groupsFor(paletteId) {
  if (!state.enabledGroups[paletteId]) {
    state.enabledGroups[paletteId] = defaultEnabledGroups(paletteId);
  }
  return state.enabledGroups[paletteId];
}

function paletteColors() {
  const id = currentPaletteId();
  if (PALETTES[id].editable) {
    if (!state.customColors) {
      state.customColors = flattenPalette(id).map((c, i) => ({ ...c, key: `egen:${i}:${c.hex}` }));
    }
    return state.customColors;
  }
  const on = groupsFor(id);
  return flattenPalette(id).filter((c) => on.includes(c.group));
}

function activeColors() {
  return paletteColors().filter((c) => !state.offColors.has(c.key));
}

/* ── Oppbygging av mønster ──────────────────────────────────────────── */

function scheduleRecompute() {
  clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(recompute, 60);
}

function recompute() {
  if (!raster) return;
  const mat = currentMaterial();
  let colors = activeColors();
  if (colors.length === 0) {
    toast('Velg minst én farge.');
    return;
  }

  const base = {
    gridW: state.gridW,
    gridH: state.gridH,
    grid: mat.grid,
    rowShift: mat.rowShift || 0,
    unitCols: mat.unitCols || 0,
    pieceUnits: mat.pieceUnits || null,
    cellAspect: cellAspect(),
    fit: state.fit,
    posX: state.posX,
    posY: state.posY,
    brightness: state.brightness / 100,
    contrast: 1 + state.contrast / 100,
    saturation: 1 + state.saturation / 100,
    dither: state.dither,
    ditherAmount: 1,
    backgroundTolerance: state.bgTolerance / 100,
  };

  // Begrenset fargeantall: kjør en runde uten dithering for å finne hvilke
  // farger som faktisk bærer motivet, og bygg så på nytt med bare de.
  if (state.maxColors > 0 && colors.length > state.maxColors) {
    const probe = buildPattern(raster, { ...base, colors, dither: 'none' });
    const keep = countColors(probe.indices, colors).slice(0, state.maxColors).map((e) => e.color);
    if (keep.length) colors = keep;
  }

  pattern = buildPattern(raster, { ...base, colors });
  renderPreview();
  renderStats();
  renderLegend();
  saveSettings();
}

/* ── Visning ────────────────────────────────────────────────────────── */

function renderPreview() {
  if (!pattern) return;
  const mat = currentMaterial();
  const stage = $('#stage');
  const figPattern = $('#fig-pattern');
  const figOriginal = $('#fig-original');

  $('#stage-empty').hidden = true;
  $('#stage-canvases').hidden = false;
  $('#actions').hidden = false;
  $('#stats').hidden = false;
  $('#legend-card').hidden = false;

  figOriginal.hidden = state.view === 'pattern';
  figPattern.hidden = state.view === 'original';

  const avail = Math.max(200, stage.clientWidth - 48);
  const split = state.view === 'split';
  const budget = split ? (avail - 16) / 2 : avail;

  if (!figPattern.hidden) {
    const { width } = patternPixelSize(pattern, 1);
    const cell = clamp(Math.floor(budget / width), 2, maxCell(32));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = patternPixelSize(pattern, cell);
    const canvas = $('#canvas-pattern');
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = size.width + 'px';
    canvas.style.height = size.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPattern(ctx, pattern, {
      cell,
      style: mat.style,
      grid: state.showGrid,
      major: 5,
      background: '#ffffff',
      symbols: state.showSymbols ? pattern.symbols : null,
    });
    $('#pattern-caption').textContent =
      `${pattern.gridW} × ${pattern.gridH} ${mat.unitPlural} · ${pattern.used.length} farger`;
  }

  if (!figOriginal.hidden) drawOriginal(budget);
}

function drawOriginal(budget) {
  const canvas = $('#canvas-original');
  const scale = Math.min(1, budget / raster.width);
  const w = Math.max(1, Math.round(raster.width * scale));
  const h = Math.max(1, Math.round(raster.height * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(raster.canvas, 0, 0, w, h);

  // Marker hvilket utsnitt som faktisk brukes.
  if (pattern?.sourceRect) {
    const r = pattern.sourceRect;
    ctx.save();
    ctx.strokeStyle = '#ff3d71';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    ctx.restore();
  }
}

/**
 * Taket for rutestørrelsen, uttrykt slik at selve brikka blir like stor
 * uansett materiale. For Plus-Plus er ruta 9 enheter bred mens brikka bare
 * er 5, så ruta må være tilsvarende større for at brikka skal bli synlig.
 */
function maxCell(perPiece) {
  if (!pattern || !pattern.pieceUnits || !pattern.unitCols) return perPiece;
  return Math.round(perPiece * (pattern.unitCols / pattern.pieceUnits.w));
}

function renderStats() {
  const mat = currentMaterial();
  const cmW = ((pattern.spanX || pattern.gridW) * state.pitch.w) / 10;
  const cmH = (pattern.gridH * state.pitch.h) / 10;
  const parts = [
    `<span>Rutenett: <b>${pattern.gridW} × ${pattern.gridH}</b></span>`,
    `<span>${cap(mat.unitPlural)}: <b>${pattern.total.toLocaleString('nb-NO')}</b></span>`,
    `<span>Farger: <b>${pattern.used.length}</b></span>`,
    `<span>Ferdig mål: <b>ca. ${num(cmW)} × ${num(cmH)} cm</b></span>`,
  ];
  if (pattern.empty > 0) parts.push(`<span>Tomme ruter: <b>${pattern.empty}</b></span>`);
  $('#stats').innerHTML = parts.join('');
}

function renderLegend() {
  const max = pattern.used[0]?.count || 1;
  const rows = pattern.used.map((entry) => {
    const c = entry.color;
    const sym = pattern.symbols.get(entry.index);
    return `<tr>
      <td><span class="l-sym" style="background:${c.hex};color:${contrastTextColor(c.hex)}">${esc(sym)}</span></td>
      <td>${esc(c.name)}</td>
      <td class="muted">${esc(c.code || '')}</td>
      <td class="l-bar"><div style="width:${(entry.count / max) * 100}%"></div></td>
      <td class="l-count"><b>${entry.count.toLocaleString('nb-NO')}</b></td>
    </tr>`;
  });
  $('#legend').innerHTML = rows.join('');
}

/* ── Oppsett av grensesnitt ─────────────────────────────────────────── */

const ICONS = {
  bead: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e8543f"/><circle cx="12" cy="12" r="3.6" fill="var(--surface)"/></svg>',
  stud: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2" fill="#3a86ff"/><circle cx="12" cy="12" r="5" fill="#fff" opacity=".45"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#38b000"/></svg>',
  square: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="9" height="9" fill="#f2b705"/><rect x="13" y="2" width="9" height="9" fill="#e8543f"/><rect x="2" y="13" width="9" height="9" fill="#3a86ff"/><rect x="13" y="13" width="9" height="9" fill="#38b000"/></svg>',
};

function buildMaterialCards() {
  $('#materials').innerHTML = MATERIALS.map((m) => `
    <button type="button" class="material" role="radio" data-material="${m.id}" aria-checked="false">
      ${ICONS[m.icon]}<span>${esc(m.short)}</span>
    </button>`).join('');

  $('#materials').addEventListener('click', (e) => {
    const id = e.target.closest('[data-material]')?.dataset.material;
    if (id && id !== state.materialId) selectMaterial(id, true);
  });
}

function selectMaterial(id, resetSize) {
  state.materialId = id;
  const base = getMaterial(id);

  document.querySelectorAll('[data-material]').forEach((el) => {
    const on = el.dataset.material === id;
    el.classList.toggle('is-active', on);
    el.setAttribute('aria-checked', String(on));
  });

  $('#material-desc').textContent = base.description;
  $('#palette-note').textContent = PALETTES[base.palette].note;

  buildVariantUI(base);
  if (resetSize) resetToMaterialDefaults();
  refreshMaterialTexts();
  buildPresets(currentMaterial());
  buildPaletteUI();
  syncSizeInputs();
  scheduleRecompute();
}

/** Byggemåte-velgeren vises bare for materialer som faktisk har flere. */
function buildVariantUI(base) {
  const field = $('#variant-field');
  const sel = $('#variant');
  if (!base.variants) {
    field.hidden = true;
    $('#variant-hint').textContent = '';
    return;
  }
  field.hidden = false;
  sel.innerHTML = base.variants.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
  sel.value = state.variants[base.id] || base.variants[0].id;
  state.variants[base.id] = sel.value;
}

function resetToMaterialDefaults() {
  const mat = resolveMaterial(state.materialId, state.variants[state.materialId]);
  state.pitch = { ...mat.pitch };
  const preset = mat.presets[0];
  state.box = { w: preset.w, h: preset.h };
  state.presetIndex = 0;
  if (raster && state.lockRatio) fitWithin(preset.w, preset.h);
  else { state.gridW = preset.w; state.gridH = preset.h; }
}

function refreshMaterialTexts() {
  const mat = currentMaterial();
  $('#variant-hint').textContent = mat.variantName ? mat.hint : '';
  $('#tips-material').textContent = mat.variantShort
    ? `${mat.short} ${mat.variantShort}`
    : mat.name.toLowerCase();
  $('#tips').innerHTML = mat.tips.map((t) => `<li>${esc(t)}</li>`).join('');
  $('#unit-w').textContent = mat.unitPlural;
  $('#unit-h').textContent = mat.unitPlural;
  $('#pitch-note').textContent = mat.fixedShape
    ? 'Forholdet mellom bredde og høyde er gitt av materialet – endrer du bredden, følger høyden etter.'
    : 'Forholdet mellom bredde og høyde avgjør formen på hver rute. Mål en testflate på 4 × 4 brikker om du er usikker.';
}

function buildPresets(mat) {
  const sel = $('#preset');
  sel.innerHTML =
    '<option value="">Egendefinert</option>' +
    mat.presets.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('');
  sel.value = state.presetIndex == null ? '' : String(state.presetIndex);
}

function buildPaletteUI() {
  const id = currentPaletteId();
  const palette = PALETTES[id];
  const groupsEl = $('#palette-groups');
  const custom = !!palette.editable;

  groupsEl.hidden = custom;
  $('#custom-palette').hidden = !custom;

  if (!custom) {
    const on = groupsFor(id);
    groupsEl.innerHTML = palette.groups.map((g) => `
      <button type="button" class="pgroup ${on.includes(g.id) ? 'is-on' : ''}" data-group="${g.id}">
        <input type="checkbox" ${on.includes(g.id) ? 'checked' : ''} tabindex="-1" aria-hidden="true">
        ${esc(g.name)} <span class="muted">${g.colors.length}</span>
      </button>`).join('');
  }
  renderSwatches();
}

function renderSwatches() {
  const wrap = $('#swatches');
  const palette = PALETTES[currentPaletteId()];

  if (palette.editable) {
    const colors = paletteColors();
    wrap.innerHTML = colors.map((c, i) => `
      <div class="swatch-row" data-i="${i}">
        <input type="color" value="${c.hex}" data-edit="hex" aria-label="Fargeverdi">
        <input type="text" value="${esc(c.name)}" data-edit="name" aria-label="Fargenavn">
        <button type="button" class="btn btn--ghost btn--sm" data-edit="remove" title="Fjern">✕</button>
      </div>`).join('');
    return;
  }

  wrap.innerHTML = paletteColors().map((c) => `
    <button type="button" class="swatch ${state.offColors.has(c.key) ? 'is-off' : ''}"
      style="background:${c.hex}" data-key="${esc(c.key)}"
      title="${esc((c.code ? c.code + ' · ' : '') + c.name)}" aria-label="${esc(c.name)}"></button>`).join('');
}

function syncSizeInputs() {
  $('#grid-w').value = state.gridW;
  $('#grid-h').value = state.gridH;
  $('#pitch-w').value = round1(state.pitch.w);
  $('#pitch-h').value = round1(state.pitch.h);
  $('#lock-ratio').checked = state.lockRatio;
  $('#fit').value = state.fit;
  $('#position-controls').hidden = state.fit !== 'cover';
}

/**
 * Holder rutenettet i takt med bildets proporsjoner.
 *
 * Begge feltene kan styre: skriver du bredden, følger høyden etter, og
 * omvendt. For høye motiv er det høyden man vil låse – da får man et mindre
 * motiv, men det holder seg innenfor ett brett.
 *
 * @param {'w'|'h'} anchor hvilket felt brukeren nettopp satte
 */
function applyRatioLock(anchor = 'w') {
  $('#grid-h').disabled = false;
  if (!state.lockRatio || !raster) return;
  const a = cellAspect();
  if (anchor === 'h') {
    state.gridW = clamp(Math.round((state.gridH * imageAspect) / a), 4, 300);
    $('#grid-w').value = state.gridW;
  } else {
    state.gridH = clamp(Math.round((state.gridW * a) / imageAspect), 4, 300);
    $('#grid-h').value = state.gridH;
  }
}

/** Største rutenett som får plass innenfor maxW × maxH og holder proporsjonene. */
function fitWithin(maxW, maxH) {
  if (!raster) {
    state.gridW = maxW;
    state.gridH = maxH;
    return;
  }
  const a = cellAspect();
  let w = maxW;
  let h = Math.round((w * a) / imageAspect);
  if (h > maxH) {
    h = maxH;
    w = Math.round((h * imageAspect) / a);
  }
  state.gridW = clamp(w, 4, 300);
  state.gridH = clamp(h, 4, 300);
}

/* ── Hendelser ──────────────────────────────────────────────────────── */

function wireEvents() {
  // Bildevalg
  const dz = $('#dropzone');
  const input = $('#file-input');
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => input.files[0] && loadFile(input.files[0]));

  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-over'); }));
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });
  window.addEventListener('paste', (e) => {
    const file = [...(e.clipboardData?.files || [])][0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });

  $('#btn-example').addEventListener('click', loadExample);

  // Størrelse
  $('#variant').addEventListener('change', (e) => {
    state.variants[state.materialId] = e.target.value;
    resetToMaterialDefaults();
    refreshMaterialTexts();
    buildPresets(currentMaterial());
    syncSizeInputs();
    scheduleRecompute();
  });

  $('#preset').addEventListener('change', (e) => {
    const i = e.target.value;
    if (i === '') return;
    const p = currentMaterial().presets[Number(i)];
    // Med låste proporsjoner er størrelsen et tak: motivet legges inn i det,
    // slik at et høyt bilde krymper i bredden i stedet for å vokse ut av brettet.
    state.box = { w: p.w, h: p.h };
    state.presetIndex = Number(i);
    if (state.lockRatio) fitWithin(p.w, p.h);
    else { state.gridW = p.w; state.gridH = p.h; }
    syncSizeInputs();
    scheduleRecompute();
  });

  $('#grid-w').addEventListener('input', (e) => {
    state.gridW = clamp(parseInt(e.target.value, 10) || 4, 4, 300);
    applyRatioLock('w');
    state.presetIndex = null;
    $('#preset').value = '';
    scheduleRecompute();
  });
  $('#grid-h').addEventListener('input', (e) => {
    state.gridH = clamp(parseInt(e.target.value, 10) || 4, 4, 300);
    applyRatioLock('h');
    state.presetIndex = null;
    $('#preset').value = '';
    scheduleRecompute();
  });
  $('#lock-ratio').addEventListener('change', (e) => {
    state.lockRatio = e.target.checked;
    if (state.lockRatio && state.box) { fitWithin(state.box.w, state.box.h); syncSizeInputs(); }
    scheduleRecompute();
  });
  $('#fit').addEventListener('change', (e) => {
    state.fit = e.target.value;
    $('#position-controls').hidden = state.fit !== 'cover';
    scheduleRecompute();
  });

  slider('#pos-x', '#out-posx', (v) => { state.posX = v / 100; return posLabel(v); });
  slider('#pos-y', '#out-posy', (v) => { state.posY = v / 100; return posLabel(v); });

  $('#pitch-w').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!(v > 0)) return;
    // Har materialet en gitt form, følger høyden bredden i samme forhold.
    if (currentMaterial().fixedShape) {
      state.pitch.h = round1(state.pitch.h * (v / state.pitch.w));
      $('#pitch-h').value = state.pitch.h;
    }
    state.pitch.w = v;
    onPitchChanged();
  });
  $('#pitch-h').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!(v > 0)) return;
    state.pitch.h = v;
    onPitchChanged();
  });

  // Justering
  const ditherSel = $('#dither');
  ditherSel.innerHTML = DITHER_MODES.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  ditherSel.addEventListener('change', (e) => {
    state.dither = e.target.value;
    updateDitherHint();
    scheduleRecompute();
  });

  slider('#brightness', '#out-brightness', (v) => { state.brightness = v; return signed(v); });
  slider('#contrast', '#out-contrast', (v) => { state.contrast = v; return signed(v); });
  slider('#saturation', '#out-saturation', (v) => { state.saturation = v; return signed(v); });
  slider('#bg-tolerance', '#out-bg', (v) => {
    state.bgTolerance = v;
    return v === 0 ? 'av' : String(v);
  });

  $('#btn-reset-adjust').addEventListener('click', () => {
    Object.assign(state, { brightness: 0, contrast: 0, saturation: 0, bgTolerance: 0, maxColors: 0 });
    for (const [id, out] of [['#brightness', '#out-brightness'], ['#contrast', '#out-contrast'],
      ['#saturation', '#out-saturation'], ['#bg-tolerance', '#out-bg']]) {
      $(id).value = 0;
      $(out).textContent = id === '#bg-tolerance' ? 'av' : '0';
    }
    updateLimitLabel();
    scheduleRecompute();
  });

  // Palett
  $('#palette-groups').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-group]');
    if (!btn) return;
    e.preventDefault();
    const id = currentPaletteId();
    const on = groupsFor(id);
    const g = btn.dataset.group;
    state.enabledGroups[id] = on.includes(g) ? on.filter((x) => x !== g) : [...on, g];
    buildPaletteUI();
    scheduleRecompute();
  });

  $('#swatches').addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (sw) {
      const key = sw.dataset.key;
      state.offColors.has(key) ? state.offColors.delete(key) : state.offColors.add(key);
      sw.classList.toggle('is-off');
      scheduleRecompute();
      return;
    }
    if (e.target.dataset.edit === 'remove') {
      const i = Number(e.target.closest('[data-i]').dataset.i);
      state.customColors.splice(i, 1);
      renderSwatches();
      scheduleRecompute();
    }
  });

  $('#swatches').addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]');
    if (!row) return;
    const c = state.customColors[Number(row.dataset.i)];
    if (e.target.dataset.edit === 'hex') { c.hex = e.target.value; c.key = `egen:${row.dataset.i}:${c.hex}`; }
    if (e.target.dataset.edit === 'name') c.name = e.target.value;
    scheduleRecompute();
  });

  $('#btn-add-color').addEventListener('click', () => {
    const i = state.customColors.length;
    state.customColors.push({ code: String(i + 1), name: 'Ny farge', hex: '#888888', group: 'egne', key: `egen:${i}:#888888` });
    renderSwatches();
    scheduleRecompute();
  });

  $('#btn-all-colors').addEventListener('click', () => {
    const id = currentPaletteId();
    state.enabledGroups[id] = PALETTES[id].groups.map((g) => g.id);
    state.offColors.clear();
    buildPaletteUI();
    scheduleRecompute();
  });

  $('#btn-limit-colors').addEventListener('click', () => {
    const available = activeColors().length;
    const answer = prompt(
      `Hvor mange farger vil du bruke på det meste?\nSkriv 0 for å bruke alle ${available} valgte farger.`,
      String(state.maxColors || available)
    );
    if (answer === null) return;
    state.maxColors = clamp(parseInt(answer, 10) || 0, 0, 200);
    updateLimitLabel();
    scheduleRecompute();
  });

  // Visning
  document.querySelectorAll('.viewtab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.view = tab.dataset.view;
      document.querySelectorAll('.viewtab').forEach((t) => t.classList.toggle('is-active', t === tab));
      renderPreview();
      saveSettings();
    });
  });
  $('#show-grid').addEventListener('change', (e) => { state.showGrid = e.target.checked; renderPreview(); saveSettings(); });
  $('#show-symbols').addEventListener('change', (e) => { state.showSymbols = e.target.checked; renderPreview(); saveSettings(); });

  // Handlinger
  $('#btn-build').addEventListener('click', () => {
    if (!pattern) return;
    const mat = currentMaterial();
    buildMode.open(pattern, { style: mat.style, buildFromBottom: !!mat.buildFromBottom });
  });

  const menu = $('#download-menu');
  $('#btn-download').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.addEventListener('click', (e) => {
    const kind = e.target.dataset.dl;
    if (kind) download(kind);
  });

  wirePrintDialog();
  window.addEventListener('resize', debounce(renderPreview, 150));
}

/** Brikkemålene styrer både ferdigmål og rutenettets form. */
function onPitchChanged() {
  applyRatioLock();
  if (pattern) renderStats();
  scheduleRecompute();
}

function slider(id, outId, handler) {
  const el = $(id);
  const out = $(outId);
  el.addEventListener('input', () => {
    out.textContent = handler(Number(el.value));
    scheduleRecompute();
  });
}

function updateDitherHint() {
  $('#dither-hint').textContent = DITHER_MODES.find((d) => d.id === state.dither)?.hint || '';
}

function updateLimitLabel() {
  $('#btn-limit-colors').textContent =
    state.maxColors > 0 ? `Maks ${state.maxColors} farger – endre` : 'Begrens antall farger…';
}

/* ── Filhåndtering ──────────────────────────────────────────────────── */

async function loadFile(file) {
  try {
    const source = await decodeImage(file);
    raster = rasterize(source);
    imageAspect = raster.width / raster.height;
    imageName = file.name?.replace(/\.[^.]+$/, '') || 'Byggemal';
    $('#image-info').textContent = `${raster.width} × ${raster.height} px`;
    $('#dropzone').querySelector('.dropzone__title').textContent = file.name || 'Bilde lastet';
    if (!state.print.title) $('#print-title').placeholder = imageName;
    // Nytt bilde legges inn i den valgte størrelsen i stedet for å vokse ut av den.
    if (state.lockRatio && state.box) fitWithin(state.box.w, state.box.h);
    else applyRatioLock('w');
    syncSizeInputs();
    recompute();
  } catch (err) {
    toast(err.message || 'Klarte ikke å lese bildet.');
  }
}

/** Et lite eksempelmotiv tegnet i appen, så man kan prøve uten egen fil. */
async function loadExample() {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 480;
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, 480);
  sky.addColorStop(0, '#6fc3f7');
  sky.addColorStop(1, '#cdeafd');
  g.fillStyle = sky;
  g.fillRect(0, 0, 480, 480);

  g.fillStyle = '#6ac04a';
  g.beginPath();
  g.ellipse(240, 470, 260, 90, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#ffd93d';
  g.beginPath();
  g.arc(390, 92, 46, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#f5f1e6';
  g.beginPath();
  g.moveTo(240, 415);
  g.quadraticCurveTo(196, 415, 196, 330);
  g.lineTo(284, 330);
  g.quadraticCurveTo(284, 415, 240, 415);
  g.fill();

  g.fillStyle = '#e8453c';
  g.beginPath();
  g.ellipse(240, 320, 150, 112, 0, Math.PI, 0);
  g.fill();

  g.fillStyle = '#fff6ea';
  for (const [x, y, r] of [[186, 262, 26], [292, 274, 20], [240, 226, 15], [330, 312, 13], [152, 312, 11]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = '#2b2b2b';
  for (const x of [214, 266]) {
    g.beginPath();
    g.ellipse(x, 360, 7, 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#2b2b2b';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(240, 372, 20, 0.25 * Math.PI, 0.75 * Math.PI);
  g.stroke();

  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  await loadFile(new File([blob], 'eksempel-sopp.png', { type: 'image/png' }));
}

/* ── Nedlasting ─────────────────────────────────────────────────────── */

function download(kind) {
  if (!pattern) return;
  const mat = currentMaterial();
  const base = (state.print.title || imageName || 'byggemal').replace(/[^\w æøåÆØÅ-]+/g, '').trim() || 'byggemal';

  if (kind === 'list') {
    const lines = [
      `${base} – ${mat.name}`,
      `${pattern.gridW} × ${pattern.gridH} ruter, ${pattern.total} ${mat.unitPlural}, ${pattern.used.length} farger`,
      '',
      ...pattern.used.map((e) =>
        `${pattern.symbols.get(e.index)}\t${e.color.code || '-'}\t${e.color.name}\t${e.color.hex}\t${e.count} stk`),
    ];
    saveBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `${base}-fargeliste.txt`);
    return;
  }

  const canvas = kind === 'raw'
    ? renderRawCanvas(pattern, '#ffffff')
    : renderToCanvas(pattern, {
        cell: maxCell(20),
        style: mat.style,
        grid: state.showGrid,
        major: 5,
        background: '#ffffff',
        symbols: state.showSymbols ? pattern.symbols : null,
      });

  canvas.toBlob((blob) => saveBlob(blob, `${base}-${kind === 'raw' ? 'piksler' : 'monster'}.png`), 'image/png');
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Lagret ${filename}`);
}

/* ── Utskrift ───────────────────────────────────────────────────────── */

function wirePrintDialog() {
  const dialog = $('#print-dialog');
  const cellSel = $('#print-cell');

  const refresh = () => {
    if (!pattern) return;
    const opts = { cellSize: cellSel.value, overlap: $('#print-overlap').checked, pitch: state.pitch };
    const est = estimateSheets(pattern, opts);
    const trueScale = Math.abs(est.cellMm - state.pitch.w) < 0.05;
    const tiles = est.tilesX * est.tilesY;
    const sheets = tiles === 1
      ? '1 oversiktsside + 1 rutenettside'
      : `1 oversiktsside + ${tiles} rutenettsider (${est.tilesX} × ${est.tilesY})`;
    // Hvor stort selve rutenettet blir på papiret – skal stemme med brettet.
    const printW = (pattern.spanX || pattern.gridW) * est.cellMm / 10;
    const printH = (pattern.gridH * est.cellMm / pattern.cellAspect) / 10;
    const lines = [
      `${est.pages} A4-sider: ${sheets}, `
      + `${num(est.cellMm, 2)} × ${num(est.cellMm / pattern.cellAspect, 2)} mm per rute.`,
      `Mønsteret blir ${num(printW)} × ${num(printH)} cm på papiret.`,
    ];
    if (trueScale) {
      lines.push('Naturlig størrelse: brettet kan legges rett oppå arket. '
        + 'Slå av «Tilpass til side» / velg 100 % skala i utskriftsdialogen, '
        + 'og mål kontrollinjalen nederst på arket.');
    }
    $('#print-estimate').textContent = lines.join(' ');
  };

  ['change', 'input'].forEach((ev) => dialog.addEventListener(ev, refresh));

  $('#btn-print').addEventListener('click', () => {
    if (!pattern) return;
    // Valgene avhenger av brikkemålet, så de bygges når dialogen åpnes.
    const options = cellSizeOptions(state.pitch);
    cellSel.innerHTML = options.map((o) => `<option value="${o.value}">${esc(o.name)}</option>`).join('');
    cellSel.value = options.some((o) => o.value === state.print.cellSize)
      ? state.print.cellSize
      : options[0].value;

    $('#print-title').value = state.print.title || imageName;
    $('#print-color').checked = state.print.color;
    $('#print-symbols').checked = state.print.symbols;
    $('#print-overlap').checked = state.print.overlap;
    refresh();
    dialog.showModal();
  });

  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'print') return;
    state.print = {
      title: $('#print-title').value.trim(),
      cellSize: cellSel.value,
      color: $('#print-color').checked,
      symbols: $('#print-symbols').checked,
      overlap: $('#print-overlap').checked,
    };
    saveSettings();
    doPrint();
  });
}

function doPrint() {
  const mat = currentMaterial();
  const root = $('#print-root');
  root.innerHTML = '';
  toast('Bygger utskriftsmal …');

  // Gi nettleseren en runde til å vise varselet før vi bygger sidene.
  requestAnimationFrame(() => {
    const preview = renderToCanvas(pattern, {
      cell: maxCell(6),
      style: mat.style,
      grid: false,
      background: '#ffffff',
    });
    root.appendChild(buildPrintSheets(pattern, {
      title: state.print.title || imageName || 'Byggemal',
      materialName: mat.variantName ? `${mat.name} – ${mat.variantName}` : mat.name,
      unitPlural: mat.unitPlural,
      colorPrint: state.print.color,
      symbols: state.print.symbols,
      cellSize: state.print.cellSize,
      overlap: state.print.overlap,
      previewCanvas: preview,
      pitch: state.pitch,
    }));
    hideToast();
    setTimeout(() => window.print(), 80);
  });
}

/* ── Lagring av innstillinger ───────────────────────────────────────── */

function saveSettings() {
  try {
    const copy = { ...state, offColors: [...state.offColors] };
    delete copy.customColors;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...copy, customColors: state.customColors }));
  } catch { /* lagring er valgfritt */ }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved, {
      offColors: new Set(saved.offColors || []),
      variants: saved.variants || {},
      pitch: saved.pitch || state.pitch,
      print: { ...state.print, ...(saved.print || {}) },
    });
  } catch { /* ignorer ødelagte innstillinger */ }
}

function applySettingsToUI() {
  $('#brightness').value = state.brightness;
  $('#contrast').value = state.contrast;
  $('#saturation').value = state.saturation;
  $('#bg-tolerance').value = state.bgTolerance;
  $('#pos-x').value = state.posX * 100;
  $('#pos-y').value = state.posY * 100;
  $('#out-brightness').textContent = signed(state.brightness);
  $('#out-contrast').textContent = signed(state.contrast);
  $('#out-saturation').textContent = signed(state.saturation);
  $('#out-bg').textContent = state.bgTolerance === 0 ? 'av' : String(state.bgTolerance);
  $('#out-posx').textContent = posLabel(state.posX * 100);
  $('#out-posy').textContent = posLabel(state.posY * 100);
  $('#dither').value = state.dither;
  $('#show-grid').checked = state.showGrid;
  $('#show-symbols').checked = state.showSymbols;
  document.querySelectorAll('.viewtab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === state.view));
  updateDitherHint();
  updateLimitLabel();
}

/* ── Småting ────────────────────────────────────────────────────────── */

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 2600);
}
function hideToast() { $('#toast').hidden = true; }

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
const signed = (v) => (v > 0 ? '+' : '') + v;
const round1 = (v) => Math.round(v * 10) / 10;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const posLabel = (v) => (v < 20 ? 'venstre/topp' : v > 80 ? 'høyre/bunn' : v === 50 ? 'midt' : String(v) + ' %');

/* ── Oppstart ───────────────────────────────────────────────────────── */

loadSettings();
buildMaterialCards();
wireEvents();
applySettingsToUI();
selectMaterial(state.materialId, false);
