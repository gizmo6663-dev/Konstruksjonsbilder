// Tegning av mønsteret på lerret.

import { gridSpanX, cellOriginX, cellIndex } from './pattern.js';
import { contrastTextColor } from './color.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} pattern
 * @param {object} opts
 *   cell        – rutebredde i piksler
 *   style       – 'bead' | 'stud' | 'plus' | 'flat'
 *   grid        – tegn rutenettlinjer
 *   major       – tykkere linje hver N-te rute (0 = av)
 *   background  – bakgrunnsfarge, null = gjennomsiktig
 *   symbols     – Map fra palettindeks til symbol, tegnes oppå brikkene
 *   dim         – Set med ruteindekser som skal tones ned (byggemodus)
 *   highlightRow– rad som markeres
 */
export function drawPattern(ctx, pattern, opts = {}) {
  const cell = opts.cell || 12;
  const cellH = cell / (pattern.cellAspect || 1);
  const style = opts.style || 'flat';
  const w = gridSpanX(pattern) * cell;
  const h = pattern.gridH * cellH;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }

  const drawSymbols = opts.symbols && cell >= 11;
  if (drawSymbols) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(Math.min(cell, cellH) * 0.56)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  }

  for (let y = 0; y < pattern.gridH; y++) {
    for (let x = 0; x < pattern.gridW; x++) {
      const idx = cellIndex(pattern, x, y);
      const pi = pattern.indices[idx];
      if (pi < 0) continue;
      const color = pattern.colors[pi];
      const px = cellOriginX(pattern, x, y) * cell;
      const py = y * cellH;

      const dimmed = opts.dim && opts.dim.has(idx);
      ctx.globalAlpha = dimmed ? 0.25 : 1;
      drawCell(ctx, style, px, py, cell, cellH, color.hex);

      if (drawSymbols) {
        const sym = opts.symbols.get(pi);
        if (sym) {
          ctx.fillStyle = contrastTextColor(color.hex);
          ctx.globalAlpha = dimmed ? 0.2 : 0.85;
          ctx.fillText(sym, px + cell / 2, py + cellH / 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  if (opts.grid && cell >= 4) drawGrid(ctx, pattern, cell, cellH, opts);

  if (opts.highlightRow != null && opts.highlightRow >= 0) {
    const y = opts.highlightRow;
    const shift = pattern.grid === 'offset' && y % 2 === 1 ? cell * 0.5 : 0;
    ctx.strokeStyle = '#ff3d71';
    ctx.lineWidth = Math.max(2, cell * 0.12);
    ctx.strokeRect(shift + ctx.lineWidth / 2, y * cellH + ctx.lineWidth / 2,
      pattern.gridW * cell - ctx.lineWidth, cellH - ctx.lineWidth);
  }
  ctx.restore();
}

function drawCell(ctx, style, x, y, w, h, hex) {
  ctx.fillStyle = hex;
  switch (style) {
    case 'bead': {
      const r = Math.min(w, h) / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2);
      if (r > 5) {
        // Hullet i perla, tegnet som motsatt sirkel i samme bane.
        ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2, true);
      }
      ctx.fill('evenodd');
      break;
    }
    case 'stud': {
      ctx.fillRect(x, y, w + 0.3, h + 0.3);
      const r = Math.min(w, h) * 0.3;
      if (r > 1.6) {
        ctx.save();
        ctx.globalAlpha *= 0.28;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha *= 0.9;
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.lineWidth = Math.max(0.6, w * 0.03);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'plus': {
      // Brikkene griper inn i radene over og under. Vi tegner derfor plusset
      // høyere enn selve ruta, men aldri høyere enn det er bredt.
      const ph = Math.min(h * 2, w);
      const y0 = y + (h - ph) / 2;
      const t = 0.3; // halv armbredde som andel av brikka
      const x0 = x;
      const a = w * (0.5 - t), b = w * (0.5 + t);
      const c = ph * (0.5 - t), d = ph * (0.5 + t);
      ctx.beginPath();
      ctx.moveTo(x0 + a, y0);
      ctx.lineTo(x0 + b, y0);
      ctx.lineTo(x0 + b, y0 + c);
      ctx.lineTo(x0 + w, y0 + c);
      ctx.lineTo(x0 + w, y0 + d);
      ctx.lineTo(x0 + b, y0 + d);
      ctx.lineTo(x0 + b, y0 + ph);
      ctx.lineTo(x0 + a, y0 + ph);
      ctx.lineTo(x0 + a, y0 + d);
      ctx.lineTo(x0, y0 + d);
      ctx.lineTo(x0, y0 + c);
      ctx.lineTo(x0 + a, y0 + c);
      ctx.closePath();
      ctx.fill();
      // Tynt omriss gjør at hver enkelt brikke skiller seg fra naboene,
      // også der to like farger ligger inntil hverandre.
      const stroke = Math.min(w, ph) * 0.06;
      if (stroke > 0.35) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,.72)';
        ctx.lineWidth = stroke;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'brick': {
      // Sett forfra: flat klossforside med skjøt mot raden under.
      ctx.fillRect(x, y, w + 0.3, h + 0.3);
      const seam = Math.max(0.6, h * 0.1);
      if (h > 3) {
        ctx.save();
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y + h - seam, w + 0.3, seam);
        ctx.globalAlpha *= 0.55;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, w + 0.3, Math.max(0.5, h * 0.07));
        ctx.restore();
      }
      if (w > 4) {
        ctx.save();
        ctx.globalAlpha *= 0.18;
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w - Math.max(0.5, w * 0.05), y, Math.max(0.5, w * 0.05), h);
        ctx.restore();
      }
      break;
    }
    default:
      ctx.fillRect(x, y, w + 0.3, h + 0.3);
  }
}

function drawGrid(ctx, pattern, cell, cellH, opts) {
  const major = opts.major || 0;
  const span = gridSpanX(pattern) * cell;
  const height = pattern.gridH * cellH;
  ctx.lineWidth = 1;

  if (pattern.grid === 'offset') {
    // Forskjøvet rutenett: bare radlinjer gir mening på tvers.
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    for (let y = 0; y <= pattern.gridH; y++) {
      ctx.moveTo(0, y * cellH + 0.5);
      ctx.lineTo(span, y * cellH + 0.5);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    for (let x = 0; x <= pattern.gridW; x++) {
      if (major && x % major === 0) continue;
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, height);
    }
    for (let y = 0; y <= pattern.gridH; y++) {
      if (major && y % major === 0) continue;
      ctx.moveTo(0, y * cellH + 0.5);
      ctx.lineTo(span, y * cellH + 0.5);
    }
    ctx.stroke();

    if (major) {
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= pattern.gridW; x += major) {
        ctx.moveTo(x * cell + 0.5, 0);
        ctx.lineTo(x * cell + 0.5, height);
      }
      for (let y = 0; y <= pattern.gridH; y += major) {
        ctx.moveTo(0, y * cellH + 0.5);
        ctx.lineTo(span, y * cellH + 0.5);
      }
      ctx.stroke();
    }
  }
}

/** Størrelsen et mønster krever ved en gitt rutestørrelse. */
export function patternPixelSize(pattern, cell) {
  return {
    width: Math.round(gridSpanX(pattern) * cell),
    height: Math.round(pattern.gridH * (cell / (pattern.cellAspect || 1))),
  };
}

/** Tegner mønsteret til et nytt lerret – brukes til nedlasting. */
export function renderToCanvas(pattern, opts) {
  const cell = opts.cell;
  const { width, height } = patternPixelSize(pattern, cell);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  drawPattern(ctx, pattern, opts);
  return canvas;
}

/** Ett bildepunkt per brikke – nyttig som rå pikselgrafikk. */
export function renderRawCanvas(pattern, background) {
  const canvas = document.createElement('canvas');
  canvas.width = pattern.gridW;
  canvas.height = pattern.gridH;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(pattern.gridW, pattern.gridH);
  const bg = background ? hexBytes(background) : null;
  for (let i = 0; i < pattern.indices.length; i++) {
    const pi = pattern.indices[i];
    const o = i * 4;
    if (pi < 0) {
      if (bg) { img.data[o] = bg[0]; img.data[o + 1] = bg[1]; img.data[o + 2] = bg[2]; img.data[o + 3] = 255; }
      continue;
    }
    const [r, g, b] = hexBytes(pattern.colors[pi].hex);
    img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function hexBytes(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
