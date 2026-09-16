// Mønsteret: rutenettmodell, geometri og oppbygging fra bilde + innstillinger.

import { buildMatcher } from './color.js';
import { computeSourceRect, sampleToGrid, applyAdjustments, removeBackground } from './imageops.js';
import { quantize, countColors, assignSymbols } from './quantize.js';

/** Full bredde på rutenettet i ruteenheter – forskjøvede rader stikker en halv rute ut. */
export function gridSpanX(pattern) {
  return pattern.grid === 'offset' && pattern.gridH > 1 ? pattern.gridW + 0.5 : pattern.gridW;
}

/** Venstre kant for en rute, i ruteenheter. */
export function cellOriginX(pattern, x, y) {
  return pattern.grid === 'offset' && y % 2 === 1 ? x + 0.5 : x;
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
    gridW, gridH, grid, cellAspect, colors,
    fit, posX, posY,
    brightness, contrast, saturation,
    dither, ditherAmount, backgroundTolerance,
  } = settings;

  const targetAspect = (gridW * cellAspect) / gridH;
  const rect = computeSourceRect(raster.width, raster.height, targetAspect, fit, posX, posY);
  const cells = sampleToGrid(raster, rect, gridW, gridH, grid === 'offset');

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
    cellAspect,
    indices,
    colors,
    used,
    symbols,
    total,
    empty: gridW * gridH - total,
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
