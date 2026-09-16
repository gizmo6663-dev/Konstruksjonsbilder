// Fargerom-konverteringer og fargematching.
//
// Vi jobber i tre rom:
//   - sRGB float (0..1): der brukerjusteringer og feilspredning (dithering) skjer.
//   - lineært lys:       der nedskalering/gjennomsnitt skjer, slik at kanter ikke blir for mørke.
//   - OKLab:             der vi måler hvor lik to farger ser ut for øyet.

const SRGB_TO_LINEAR_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR_LUT[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function srgbByteToLinear(v) {
  return SRGB_TO_LINEAR_LUT[v];
}

export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Lineært sRGB -> OKLab. Inn 0..1, ut {L, a, b}. */
export function linearToOklab(r, g, b, out) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const res = out || { L: 0, a: 0, b: 0 };
  res.L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  res.a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  res.b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  return res;
}

export function srgbFloatToOklab(r, g, b, out) {
  return linearToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b), out);
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r, g, b) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}

/** Relativ luminans i sRGB-domenet – brukes for å velge lesbar tekstfarge oppå en brikke. */
export function perceivedLightness(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v) => srgbByteToLinear(v);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastTextColor(hex) {
  return perceivedLightness(hex) > 0.28 ? '#111111' : '#ffffff';
}

/**
 * Bygger et oppslagsverk for rask fargematching.
 * @param {Array<{hex:string}>} colors
 */
export function buildMatcher(colors) {
  const n = colors.length;
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const Bl = new Float32Array(n);
  const tmp = { L: 0, a: 0, b: 0 };
  for (let i = 0; i < n; i++) {
    const { r, g, b } = hexToRgb(colors[i].hex);
    const rf = r / 255, gf = g / 255, bf = b / 255;
    R[i] = rf; G[i] = gf; Bl[i] = bf;
    srgbFloatToOklab(rf, gf, bf, tmp);
    L[i] = tmp.L; A[i] = tmp.a; B[i] = tmp.b;
  }
  const lab = { L: 0, a: 0, b: 0 };

  return {
    count: n,
    colors,
    /** Nærmeste palettfarge til en sRGB-float-farge. Returnerer indeks i `colors`. */
    nearest(r, g, b) {
      if (n === 0) return -1;
      srgbFloatToOklab(r, g, b, lab);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < n; i++) {
        const dL = lab.L - L[i];
        const da = lab.a - A[i];
        const db = lab.b - B[i];
        const d = dL * dL + da * da + db * db;
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    },
    /** sRGB-float for en palettindeks – brukes til feilberegning under dithering. */
    srgbOf(i, out) {
      out[0] = R[i]; out[1] = G[i]; out[2] = Bl[i];
      return out;
    },
  };
}
