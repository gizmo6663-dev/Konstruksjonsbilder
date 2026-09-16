// Mønsteret: rutenettmodell, geometri og oppbygging fra bilde + innstillinger.

import { buildMatcher } from './color.js';
import { computeSourceRect, sampleToGrid, applyAdjustments, removeBackground } from './imageops.js';
import { quantize, countColors, assignSymbols } from './quantize.js';

// Rutenettet er et gitter: hver rad kan være forskjøvet sidelengs i forhold til
// raden over. `rowShift` er forskyvningen per rad, som andel av rutebredden.
// 0 gir rette kolonner; 0,5 gir murforband; 0,2 gir Plus-Plus sin fletting.
// Forskyvningen er kumulativ, slik at rad r står `r * rowShift` inn.

/** Hvor mye rad y er forskjøvet, i ruteenheter, alltid i [0, 1). */
export function rowShiftOf(pattern, y) {
  const s = pattern.rowShift || 0;
  if (!s) return 0;
  const v = (y * s) % 1;
  return v < 0 ? v + 1 : v;
}

/** Full bredde på rutenettet i ruteenheter – forskjøvede rader stikker utenfor. */
export function gridSpanX(pattern) {
  if (!pattern.rowShift || pattern.gridH < 2) return pattern.gridW;
  let max = 0;
  for (let y = 0; y < pattern.gridH; y++) max = Math.max(max, rowShiftOf(pattern, y));
  return pattern.gridW + max;
}

/** Venstre kant for en rute, i ruteenheter. */
export function cellOriginX(pattern, x, y) {
  return x + rowShiftOf(pattern, y);
}

export function cellIndex(pattern, x, y) {
  return y * pattern.gridW + x;
}

export function colorAt(pattern, x, y) {
  const i = pattern.indices[cellIndex(pattern, x, y)];
  return i < 0 ? null : pattern.colors[i];
}

/**
 * Bygger et komplett mønster.
 *
 * @param {object} raster   fra rasterize()
 * @param {object} settings alle brukervalg
 * @returns {object} mønster
 */
export function buildPattern(raster, settings) {
  const {
    gridW, gridH, grid, rowShift, cellAspect, colors,
    fit, posX, posY,
    brightness, contrast, saturation,
    dither, ditherAmount, backgroundTolerance,
  } = settings;

  // Forskjøvede rader stikker utenfor gridW, så utsnittet må dekke hele
  // spennet – ellers faller siste kolonne i de forskjøvede radene utenfor
  // bildet og blir tom.
  const spanX = gridSpanX({ gridW, gridH, rowShift });
  const targetAspect = (spanX * cellAspect) / gridH;
  const rect = computeSourceRect(raster.width, raster.height, targetAspect, fit, posX, posY);
  const cells = sampleToGrid(raster, rect, gridW, gridH, rowShift || 0, spanX);

  applyAdjustments(cells, { brightness, contrast, saturation });
  removeBackground(cells, gridW, gridH, backgroundTolerance);

  const matcher = buildMatcher(colors);
  const indices = quantize(cells, gridW, gridH, matcher, { dither, amount: ditherAmount });
  const used = countColors(indices, colors);
  const symbols = assignSymbols(used);

  const total = indices.reduce((sum, v) => (v < 0 ? sum : sum + 1), 0);

  return {
    gridW,
    gridH,
    grid,
    rowShift: rowShift || 0,
    cellAspect,
    indices,
    colors,
    used,
    symbols,
    total,
    empty: gridW * gridH - total,
    spanX,
    sourceCells: cells,
    sourceRect: rect,
  };
}

/** Kort, stabil nøkkel for å kjenne igjen det samme mønsteret mellom økter. */
export function patternSignature(pattern) {
  let h = 0x811c9dc5;
  const { indices } = pattern;
  for (let i = 0; i < indices.length; i++) {
    h ^= indices[i] + 2;
    h = Math.imul(h, 0x01000193);
  }
  return `${pattern.gridW}x${pattern.gridH}-${(h >>> 0).toString(36)}`;
}
