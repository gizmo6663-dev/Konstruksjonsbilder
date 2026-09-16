// Byggemodus: gå gjennom mønsteret rad for rad og hak av det du har lagt.

import { drawPattern, patternPixelSize } from './render.js';
import { cellIndex, patternSignature } from './pattern.js';
import { contrastTextColor } from './color.js';

const STORAGE_PREFIX = 'konstruksjonsbilder:fremdrift:';

export class BuildMode {
  constructor(root) {
    this.root = root;
    this.pattern = null;
    this.done = new Set();
    this.row = 0;
    this.zoom = 1;
    this.key = '';
    this.style = 'flat';
    // En vegg bygges nedenfra og opp; en flat mosaikk legges ovenfra og ned.
    this.bottomUp = false;
    this._bindDom();
  }

  _bindDom() {
    this.root.innerHTML = `
      <div class="bm">
        <header class="bm__bar">
          <button class="btn btn--ghost" data-act="close">← Tilbake</button>
          <div class="bm__progress">
            <div class="bm__bar-track"><div class="bm__bar-fill"></div></div>
            <span class="bm__count"></span>
          </div>
          <div class="bm__zoom">
            <button class="btn btn--icon" data-act="zoom-out" title="Zoom ut">−</button>
            <button class="btn btn--icon" data-act="zoom-fit" title="Tilpass">⤢</button>
            <button class="btn btn--icon" data-act="zoom-in" title="Zoom inn">+</button>
          </div>
        </header>
        <div class="bm__body">
          <div class="bm__stage"><canvas class="bm__canvas"></canvas></div>
          <aside class="bm__side">
            <div class="bm__rownav">
              <button class="btn btn--icon" data-act="prev" title="Forrige rad">▲</button>
              <div class="bm__rowlabel"><strong></strong><span></span></div>
              <button class="btn btn--icon" data-act="next" title="Neste rad">▼</button>
            </div>
            <ol class="bm__runs"></ol>
            <div class="bm__actions">
              <button class="btn btn--ghost btn--sm" data-act="direction"></button>
              <button class="btn btn--primary" data-act="row-done">Rad ferdig – neste</button>
              <button class="btn btn--ghost" data-act="row-undo">Angre raden</button>
              <button class="btn btn--ghost btn--danger" data-act="reset">Nullstill alt</button>
            </div>
            <p class="bm__hint">Klikk på en rute for å hake den av. Piltastene ↑ ↓ bytter rad, mellomrom merker raden ferdig og går videre i byggeretningen.</p>
          </aside>
        </div>
      </div>`;

    this.canvas = this.root.querySelector('.bm__canvas');
    this.stage = this.root.querySelector('.bm__stage');
    this.runsEl = this.root.querySelector('.bm__runs');
    this.rowLabel = this.root.querySelector('.bm__rowlabel');
    this.fill = this.root.querySelector('.bm__bar-fill');
    this.countEl = this.root.querySelector('.bm__count');

    this.root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const actions = {
        close: () => this.onClose && this.onClose(),
        prev: () => this.setRow(this.row - 1),
        next: () => this.setRow(this.row + 1),
        'row-done': () => this.markRow(true, true),
        'row-undo': () => this.markRow(false, false),
        reset: () => this.reset(),
        'zoom-in': () => this.setZoom(this.zoom * 1.3),
        'zoom-out': () => this.setZoom(this.zoom / 1.3),
        'zoom-fit': () => this.fitZoom(),
        direction: () => { this.bottomUp = !this.bottomUp; this.render(); },
      };
      actions[act]?.();
    });

    this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));

    this._onKey = (e) => {
      if (this.root.hidden) return;
      if (e.key === 'ArrowDown') { this.setRow(this.row + 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { this.setRow(this.row - 1); e.preventDefault(); }
      else if (e.key === ' ') { this.markRow(true, true); e.preventDefault(); }
      else if (e.key === 'Escape') this.onClose && this.onClose();
    };
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', () => this.render());
  }

  open(pattern, opts = {}) {
    const newKey = STORAGE_PREFIX + patternSignature(pattern);
    this.pattern = pattern;
    this.style = opts.style || 'flat';
    if (newKey !== this.key) {
      this.key = newKey;
      this.done = this._load();
      this.row = this._firstUnfinishedRow();
    }
    this.bottomUp = !!opts.buildFromBottom;
    this.root.hidden = false;
    document.body.classList.add('is-building');
    requestAnimationFrame(() => this.fitZoom());
  }

  close() {
    this.root.hidden = true;
    document.body.classList.remove('is-building');
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  _save() {
    try {
      localStorage.setItem(this.key, JSON.stringify([...this.done]));
    } catch {
      // Full eller avslått lagring – fremdriften lever da bare ut økta.
    }
  }

  /** Første rad som mangler brikker, sett i den rekkefølgen man bygger. */
  _firstUnfinishedRow() {
    const p = this.pattern;
    for (let n = 0; n < p.gridH; n++) {
      const y = this.bottomUp ? p.gridH - 1 - n : n;
      for (let x = 0; x < p.gridW; x++) {
        const i = cellIndex(p, x, y);
        if (p.indices[i] >= 0 && !this.done.has(i)) return y;
      }
    }
    return this.bottomUp ? p.gridH - 1 : 0;
  }

  setRow(y) {
    const max = this.pattern.gridH - 1;
    this.row = Math.max(0, Math.min(max, y));
    this.render();
    this._scrollRowIntoView();
  }

  markRow(done, advance) {
    const p = this.pattern;
    for (let x = 0; x < p.gridW; x++) {
      const i = cellIndex(p, x, this.row);
      if (p.indices[i] < 0) continue;
      done ? this.done.add(i) : this.done.delete(i);
    }
    this._save();
    if (advance) {
      const next = this.row + (this.bottomUp ? -1 : 1);
      if (next >= 0 && next < p.gridH) this.row = next;
    }
    this.render();
    this._scrollRowIntoView();
  }

  reset() {
    if (!confirm('Nullstille all fremdrift for dette mønsteret?')) return;
    this.done.clear();
    this.row = this.bottomUp ? this.pattern.gridH - 1 : 0;
    this._save();
    this.render();
  }

  setZoom(z) {
    this.zoom = Math.max(0.15, Math.min(14, z));
    this.render();
  }

  fitZoom() {
    if (!this.pattern) return;
    const avail = this.stage.clientWidth - 24;
    const { width } = patternPixelSize(this.pattern, 1);
    this.setZoom(Math.max(0.5, avail / Math.max(1, width)));
  }

  _cellPx() {
    return Math.max(2, this.zoom);
  }

  _onCanvasClick(e) {
    const p = this.pattern;
    if (!p) return;
    const rect = this.canvas.getBoundingClientRect();
    const cell = this._cellPx();
    const cellH = cell / (p.cellAspect || 1);
    const px = ((e.clientX - rect.left) / rect.width) * this.canvas.width / this._dpr;
    const py = ((e.clientY - rect.top) / rect.height) * this.canvas.height / this._dpr;
    const y = Math.floor(py / cellH);
    if (y < 0 || y >= p.gridH) return;
    const shift = p.grid === 'offset' && y % 2 === 1 ? cell * 0.5 : 0;
    const x = Math.floor((px - shift) / cell);
    if (x < 0 || x >= p.gridW) return;
    const i = cellIndex(p, x, y);
    if (p.indices[i] < 0) return;
    this.done.has(i) ? this.done.delete(i) : this.done.add(i);
    this.row = y;
    this._save();
    this.render();
  }

  _scrollRowIntoView() {
    const cellH = this._cellPx() / (this.pattern.cellAspect || 1);
    const target = this.row * cellH - this.stage.clientHeight / 2;
    this.stage.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }

  render() {
    const p = this.pattern;
    if (!p || this.root.hidden) return;
    const cell = this._cellPx();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this._dpr = dpr;
    const { width, height } = patternPixelSize(p, cell);

    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPattern(ctx, p, {
      cell,
      style: this.style,
      grid: true,
      major: 5,
      background: '#ffffff',
      symbols: p.symbols,
      dim: this.done,
      highlightRow: this.row,
    });

    this._renderRuns();
    this._renderProgress();
    this.root.querySelector('[data-act="direction"]').textContent = this.bottomUp
      ? 'Bygger nedenfra og opp ↑'
      : 'Bygger ovenfra og ned ↓';
  }

  _renderProgress() {
    const total = this.pattern.total;
    const done = this.done.size;
    const pct = total ? Math.round((done / total) * 100) : 0;
    this.fill.style.width = pct + '%';
    this.countEl.textContent = `${done} / ${total} lagt (${pct} %)`;
  }

  _renderRuns() {
    const p = this.pattern;
    const y = this.row;
    this.rowLabel.querySelector('strong').textContent = `Rad ${y + 1}`;
    this.rowLabel.querySelector('span').textContent = `av ${p.gridH}`;

    // Slå sammen like farger ved siden av hverandre – slik teller man når man bygger.
    const runs = [];
    for (let x = 0; x < p.gridW; x++) {
      const pi = p.indices[cellIndex(p, x, y)];
      const last = runs[runs.length - 1];
      if (last && last.pi === pi) last.n++;
      else runs.push({ pi, n: 1, from: x });
    }

    this.runsEl.innerHTML = '';
    if (p.grid === 'offset' && y % 2 === 1) {
      const note = document.createElement('li');
      note.className = 'bm__run bm__run--note';
      note.textContent = 'Denne raden er forskjøvet en halv brikke mot høyre.';
      this.runsEl.appendChild(note);
    }
    for (const run of runs) {
      const li = document.createElement('li');
      li.className = 'bm__run';
      if (run.pi < 0) {
        li.classList.add('bm__run--empty');
        li.innerHTML = `<span class="bm__swatch bm__swatch--empty"></span>
          <span class="bm__runtext">${run.n} × tom</span>`;
      } else {
        const c = p.colors[run.pi];
        li.innerHTML = `<span class="bm__swatch" style="background:${c.hex};color:${contrastTextColor(c.hex)}">${p.symbols.get(run.pi)}</span>
          <span class="bm__runtext"><strong>${run.n} ×</strong> ${escapeHtml(c.name)}${c.code ? ` <em>(${escapeHtml(c.code)})</em>` : ''}</span>`;
      }
      li.title = `Kolonne ${run.from + 1}–${run.from + run.n}`;
      this.runsEl.appendChild(li);
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
