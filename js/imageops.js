// Bildebehandling: last inn, beskjær, skaler ned til rutenett, og juster.

import { srgbByteToLinear, linearToSrgb } from './color.js';

const MAX_SOURCE_DIM = 2400;

/** Leser en File/Blob til et ImageBitmap (eller HTMLImageElement som reserve). */
export async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch (err) {
      // Faller gjennom til <img>-varianten, f.eks. for enkelte SVG-er.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Klarte ikke å lese bildefilen.'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Tegner kilden inn i et offscreen-lerret og henter ut pikslene i lineært lys.
 * Store bilder skaleres ned først – vi trenger uansett aldri mer enn noen tusen piksler.
 */
export function rasterize(source) {
  const sw = source.width || source.naturalWidth;
  const sh = source.height || source.naturalHeight;
  if (!sw || !sh) throw new Error('Bildet har ingen størrelse.');

  const scale = Math.min(1, MAX_SOURCE_DIM / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Lineært premultiplisert, slik at gjennomsnitt over halvtransparente kanter blir riktig.
  const lin = new Float32Array(w * h * 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 4) {
    const a = data[i + 3] / 255;
    lin[j] = srgbByteToLinear(data[i]) * a;
    lin[j + 1] = srgbByteToLinear(data[i + 1]) * a;
    lin[j + 2] = srgbByteToLinear(data[i + 2]) * a;
    lin[j + 3] = a;
  }
  return { width: w, height: h, linear: lin, canvas };
}

/**
 * Finner hvilket utsnitt av kildebildet som skal fylle mønsteret.
 * `fit: 'cover'` beskjærer, `fit: 'contain'` legger til tomme marger.
 * posX/posY er 0..1 og bestemmer hvor utsnittet plasseres.
 */
export function computeSourceRect(srcW, srcH, targetAspect, fit, posX = 0.5, posY = 0.5) {
  const srcAspect = srcW / srcH;
  let w, h;
  if (fit === 'contain' ? srcAspect > targetAspect : srcAspect < targetAspect) {
    w = srcW;
    h = srcW / targetAspect;
  } else {
    h = srcH;
    w = srcH * targetAspect;
  }
  const x = (srcW - w) * posX;
  const y = (srcH - h) * posY;
  return { x, y, w, h };
}

/**
 * Bokfilter-nedskalering fra kildebildet til rutenettet.
 *
 * Hver rute dekker et rektangel i kildebildet og får gjennomsnittet av det.
 * For forskjøvede rutenett (Plus-Plus) flyttes annenhver rad en halv rute.
 *
 * Returnerer sRGB-float i [0,1] pluss alfa per rute.
 */
export function sampleToGrid(raster, rect, gridW, gridH, offsetRows = false) {
  const { width: sw, height: sh, linear } = raster;
  const out = new Float32Array(gridW * gridH * 4);
  const cellW = rect.w / gridW;
  const cellH = rect.h / gridH;

  for (let gy = 0; gy < gridH; gy++) {
    const shift = offsetRows && gy % 2 === 1 ? cellW * 0.5 : 0;
    const fy0 = rect.y + gy * cellH;
    const fy1 = fy0 + cellH;
    const y0 = Math.max(0, Math.floor(fy0));
    const y1 = Math.min(sh, Math.ceil(fy1));

    for (let gx = 0; gx < gridW; gx++) {
      const fx0 = rect.x + gx * cellW + shift;
      const fx1 = fx0 + cellW;
      const x0 = Math.max(0, Math.floor(fx0));
      const x1 = Math.min(sw, Math.ceil(fx1));

      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      if (x1 > x0 && y1 > y0) {
        for (let y = y0; y < y1; y++) {
          // Delvis dekning langs kanten teller mindre.
          const wy = Math.min(y + 1, fy1) - Math.max(y, fy0);
          if (wy <= 0) continue;
          const row = y * sw;
          for (let x = x0; x < x1; x++) {
            const wx = Math.min(x + 1, fx1) - Math.max(x, fx0);
            if (wx <= 0) continue;
            const wgt = wx * wy;
            const i = (row + x) * 4;
            r += linear[i] * wgt;
            g += linear[i + 1] * wgt;
            b += linear[i + 2] * wgt;
            a += linear[i + 3] * wgt;
            wsum += wgt;
          }
        }
      }

      const o = (gy * gridW + gx) * 4;
      if (wsum > 0) {
        // Utsnitt som stikker utenfor bildet regnes som tomt, ikke som svart.
        const coverage = wsum / (cellW * cellH);
        const alpha = (a / wsum) * Math.min(1, coverage);
        if (a > 1e-6) {
          out[o] = linearToSrgb(r / a);
          out[o + 1] = linearToSrgb(g / a);
          out[o + 2] = linearToSrgb(b / a);
        }
        out[o + 3] = alpha;
      }
    }
  }
  return out;
}

/** Lysstyrke, kontrast og metning på ferdig nedskalerte ruter (sRGB-float, in-place). */
export function applyAdjustments(cells, { brightness = 0, contrast = 1, saturation = 1 }) {
  if (brightness === 0 && contrast === 1 && saturation === 1) return cells;
  for (let i = 0; i < cells.length; i += 4) {
    if (cells[i + 3] === 0) continue;
    let r = cells[i] + brightness;
    let g = cells[i + 1] + brightness;
    let b = cells[i + 2] + brightness;

    r = (r - 0.5) * contrast + 0.5;
    g = (g - 0.5) * contrast + 0.5;
    b = (b - 0.5) * contrast + 0.5;

    if (saturation !== 1) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum + (r - lum) * saturation;
      g = lum + (g - lum) * saturation;
      b = lum + (b - lum) * saturation;
    }

    cells[i] = r < 0 ? 0 : r > 1 ? 1 : r;
    cells[i + 1] = g < 0 ? 0 : g > 1 ? 1 : g;
    cells[i + 2] = b < 0 ? 0 : b > 1 ? 1 : b;
  }
  return cells;
}

/**
 * Markerer bakgrunnsruter som tomme.
 * Sammenligner mot fargen i hjørnene, slik at også ensfargede ikke-hvite
 * bakgrunner forsvinner. Toleranse 0 slår funksjonen av.
 */
export function removeBackground(cells, gridW, gridH, tolerance) {
  if (tolerance <= 0) return cells;
  const corners = [
    [0, 0],
    [gridW - 1, 0],
    [0, gridH - 1],
    [gridW - 1, gridH - 1],
  ];
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x, y] of corners) {
    const i = (y * gridW + x) * 4;
    if (cells[i + 3] < 0.5) continue;
    r += cells[i]; g += cells[i + 1]; b += cells[i + 2]; n++;
  }
  if (n === 0) return cells;
  r /= n; g /= n; b /= n;

  const tol2 = tolerance * tolerance * 3;
  for (let i = 0; i < cells.length; i += 4) {
    if (cells[i + 3] === 0) continue;
    const dr = cells[i] - r;
    const dg = cells[i + 1] - g;
    const db = cells[i + 2] - b;
    if (dr * dr + dg * dg + db * db <= tol2) cells[i + 3] = 0;
  }
  return cells;
}
