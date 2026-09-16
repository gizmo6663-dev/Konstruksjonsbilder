// Kvantisering: fra frie farger til de brikkefargene man faktisk har.

/**
 * Feilspredningsmatriser. Hver oppføring er [dx, dy, vekt].
 * Floyd–Steinberg gir finest gradering; Atkinson sprer mindre av feilen og
 * gir renere flater, noe som ofte ser bedre ut med store brikker.
 */
const KERNELS = {
  floyd: { divisor: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  atkinson: { divisor: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
};

export const DITHER_MODES = [
  { id: 'none', name: 'Ingen', hint: 'Rene flater. Best for logoer, tegninger og piksel-motiv.' },
  { id: 'atkinson', name: 'Lett (Atkinson)', hint: 'Litt kornethet i overganger. Godt kompromiss for foto.' },
  { id: 'floyd', name: 'Full (Floyd–Steinberg)', hint: 'Mest detaljer i toneoverganger, men mer prikkete.' },
];

/**
 * @param {Float32Array} cells  sRGB-float + alfa, 4 verdier per rute
 * @param {number} gridW
 * @param {number} gridH
 * @param {object} matcher      fra buildMatcher()
 * @param {object} opts         { dither: 'none'|'atkinson'|'floyd', amount: 0..1 }
 * @returns {Int16Array}        palettindeks per rute, -1 for tom rute
 */
export function quantize(cells, gridW, gridH, matcher, { dither = 'none', amount = 1 } = {}) {
  const n = gridW * gridH;
  const result = new Int16Array(n).fill(-1);
  if (matcher.count === 0) return result;

  const kernel = KERNELS[dither];
  const buf = new Float32Array(cells); // arbeidskopi vi kan spre feil inn i
  const pal = [0, 0, 0];

  for (let y = 0; y < gridH; y++) {
    // Serpentinrekkefølge fjerner de diagonale stripene enkel feilspredning gir.
    const leftToRight = !kernel || y % 2 === 0;
    for (let k = 0; k < gridW; k++) {
      const x = leftToRight ? k : gridW - 1 - k;
      const idx = y * gridW + x;
      const o = idx * 4;
      if (cells[o + 3] < 0.5) continue;

      const r = clamp01(buf[o]);
      const g = clamp01(buf[o + 1]);
      const b = clamp01(buf[o + 2]);
      const pi = matcher.nearest(r, g, b);
      result[idx] = pi;

      if (!kernel) continue;
      matcher.srgbOf(pi, pal);
      const er = (r - pal[0]) * amount;
      const eg = (g - pal[1]) * amount;
      const eb = (b - pal[2]) * amount;
      if (er === 0 && eg === 0 && eb === 0) continue;

      for (const [dx, dy, w] of kernel.taps) {
        const nx = x + (leftToRight ? dx : -dx);
        const ny = y + dy;
        if (nx < 0 || nx >= gridW || ny >= gridH) continue;
        const no = (ny * gridW + nx) * 4;
        if (cells[no + 3] < 0.5) continue; // ikke søl feil ut i tomme ruter
        const f = w / kernel.divisor;
        buf[no] += er * f;
        buf[no + 1] += eg * f;
        buf[no + 2] += eb * f;
      }
    }
  }
  return result;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Teller brikker per farge, sortert med flest først. */
export function countColors(indices, colors) {
  const counts = new Map();
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (v < 0) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([index, count]) => ({ index, count, color: colors[index] }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
}

// Symbolene som brukes i svart/hvitt-utskrift. Valgt for å være lette å skille
// fra hverandre også i liten størrelse.
const SYMBOL_POOL =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz';

/** Gir hver brukt farge et kort symbol, mest brukte farge først. */
export function assignSymbols(used) {
  const map = new Map();
  used.forEach((entry, i) => {
    map.set(entry.index, i < SYMBOL_POOL.length ? SYMBOL_POOL[i] : '#' + (i + 1));
  });
  return map;
}
