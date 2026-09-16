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
 * `rowShift` forskyver hver rad sidelengs, som andel av rutebredden, slik at
 * prøvepunktene treffer der brikkene faktisk havner. `boxes` lar en brikke
 * hente farge fra sitt eget fotavtrykk i stedet for hele ruta.
 * `edgeStrength` trekker fram tynne konturer som ellers drukner i snittet.
 *
 * Returnerer sRGB-float i [0,1] pluss alfa per rute.
 */
export function sampleToGrid(raster, rect, gridW, gridH, opts = {}) {
  const { rowShift = 0, spanX = gridW, boxes = null, edgeStrength = 0 } = opts;
  const { width: sw, height: sh, linear } = raster;
  const out = new Float32Array(gridW * gridH * 4);
  const cellW = rect.w / spanX;
  const cellH = rect.h / gridH;

  // Områdene fargen hentes fra, i kildepiksler, regnet fra rutas hjørne.
  // Uten liste er det ruta selv.
  const areas = boxes
    ? boxes.map((b) => ({ x: b.x * cellW, y: b.y * cellW, w: b.w * cellW, h: b.h * cellW }))
    : [{ x: 0, y: 0, w: cellW, h: cellH }];
  const areaSum = areas.reduce((t, a) => t + a.w * a.h, 0);

  // Gjenbrukes per rute for å slippe å regne ut de samme rektanglene to ganger.
  const spans = [];

  for (let gy = 0; gy < gridH; gy++) {
    const shift = rowShift ? ((gy * rowShift) % 1) * cellW : 0;
    const originY = rect.y + gy * cellH;

    for (let gx = 0; gx < gridW; gx++) {
      const originX = rect.x + gx * cellW + shift;

      spans.length = 0;
      for (const area of areas) {
        const fx0 = originX + area.x;
        const fy0 = originY + area.y;
        const fx1 = fx0 + area.w;
        const fy1 = fy0 + area.h;
        const x0 = Math.max(0, Math.floor(fx0));
        const x1 = Math.min(sw, Math.ceil(fx1));
        const y0 = Math.max(0, Math.floor(fy0));
        const y1 = Math.min(sh, Math.ceil(fy1));
        if (x1 > x0 && y1 > y0) spans.push([fx0, fy0, fx1, fy1, x0, y0, x1, y1]);
      }

      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (const [fx0, fy0, fx1, fy1, x0, y0, x1, y1] of spans) {
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
      if (wsum <= 0) continue;

      let cr = r / Math.max(a, 1e-6);
      let cg = g / Math.max(a, 1e-6);
      let cb = b / Math.max(a, 1e-6);

      if (edgeStrength > 0 && a > 1e-6) {
        const mix = minorityColor(linear, sw, spans, wsum, lum(cr, cg, cb));
        if (mix) {
          const k = edgeStrength * Math.min(1, mix.frac / MINORITY_FULL);
          cr += (mix.r - cr) * k;
          cg += (mix.g - cg) * k;
          cb += (mix.b - cb) * k;
        }
      }

      if (a > 1e-6) {
        out[o] = linearToSrgb(cr);
        out[o + 1] = linearToSrgb(cg);
        out[o + 2] = linearToSrgb(cb);
      }
      // Utsnitt som stikker utenfor bildet regnes som tomt, ikke som svart.
      out[o + 3] = (a / wsum) * Math.min(1, wsum / areaSum);
    }
  }
  return out;
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// En rute der minst denne andelen skiller seg ut, trekkes helt over på
// minoritetsfargen ved full kantstyrke.
const MINORITY_FULL = 0.35;

/**
 * Finner en tydelig minoritet i ruta – typisk en svart kontur som ellers
 * drukner i gjennomsnittet når bildet krympes.
 *
 * En strek som dekker en tredjedel av ruta flytter gjennomsnittet bare en
 * tredjedel av veien mot svart, og blir borte når fargen skal rundes av til
 * nærmeste brikke. Her regnes både de mørke og de lyse pikslene ut for seg,
 * og den gruppa som skiller seg mest ut returneres.
 */
function minorityColor(linear, sw, spans, wsum, meanLum) {
  const dark = { r: 0, g: 0, b: 0, w: 0 };
  const light = { r: 0, g: 0, b: 0, w: 0 };
  const darkLimit = meanLum * 0.5;
  const lightLimit = meanLum + (1 - meanLum) * 0.5;

  for (const [fx0, fy0, fx1, fy1, x0, y0, x1, y1] of spans) {
    for (let y = y0; y < y1; y++) {
      const wy = Math.min(y + 1, fy1) - Math.max(y, fy0);
      if (wy <= 0) continue;
      const row = y * sw;
      for (let x = x0; x < x1; x++) {
        const wx = Math.min(x + 1, fx1) - Math.max(x, fx0);
        if (wx <= 0) continue;
        const i = (row + x) * 4;
        const al = linear[i + 3];
        if (al < 0.5) continue;
        const pr = linear[i] / al, pg = linear[i + 1] / al, pb = linear[i + 2] / al;
        const l = lum(pr, pg, pb);
        const bucket = l < darkLimit ? dark : l > lightLimit ? light : null;
        if (!bucket) continue;
        const wgt = wx * wy;
        bucket.r += pr * wgt;
        bucket.g += pg * wgt;
        bucket.b += pb * wgt;
        bucket.w += wgt;
      }
    }
  }

  const pick = dark.w >= light.w ? dark : light;
  if (pick.w <= 0) return null;
  return {
    r: pick.r / pick.w,
    g: pick.g / pick.w,
    b: pick.b / pick.w,
    frac: pick.w / wsum,
  };
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
