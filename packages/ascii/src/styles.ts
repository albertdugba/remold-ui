/**
 * The ways a lit surface becomes characters. Each style samples the surface `split` times per
 * character cell: once for plain characters, twice down for blocks and halftone, eight times for
 * Braille. The glyph shader draws them; `frameText` makes the same choices on the CPU so a frame
 * can be copied as text.
 */
import { DIGITS, EDGES, MIXED, MIXED_BANDS } from "./glyphs";

export const STYLES = {
  ascii: { id: 0, label: "ASCII", split: [1, 1] },
  binary: { id: 1, label: "Binary", split: [1, 1] },
  mixed: { id: 2, label: "Mixed", split: [1, 1] },
  blocks: { id: 3, label: "Blocks", split: [1, 2] },
  braille: { id: 4, label: "Braille", split: [2, 4] },
  halftone: { id: 5, label: "Halftone", split: [1, 2] },
  dither: { id: 6, label: "Dither", split: [2, 3] },
} as const;

export type AsciiStyle = keyof typeof STYLES;

export const isAsciiStyle = (value: string): value is AsciiStyle => Object.hasOwn(STYLES, value);

/** How often a flickering digit changes, per second. */
export const FLICKER_RATE = 1.4;
/** How side-on a surface must be before the ASCII style draws it as an edge. */
export const EDGE_THRESHOLD = 0.82;
/** Below this tone the mixed style leaves a cell empty, so shadow falls back to the ground. */
export const MIXED_EMPTY = 0.16;
/** Below this tone, plus a little dither, binary leaves a cell empty. */
export const BINARY_EMPTY = 0.18;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** An ordered-dither threshold, so neighbouring samples break a smooth tone into texture. */
export const bayer = (x: number, y: number) => ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) + 0.5) / 16;

/** The glyph shader's integer hash, so copied text matches the screen. */
export function hash(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801 | 0) ^ Math.imul(z, 2654435761 | 0)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822519 | 0) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917 | 0) >>> 0;
  h ^= h >>> 16;

  return h >>> 0;
}

/** Each cell changes its digit at its own moment, so the field shimmers rather than blinks. */
export const flickerSeed = (column: number, row: number, seconds: number) => Math.floor(seconds * FLICKER_RATE + (hash(column, row, 7) % 997) / 997);

export interface Sample {
  hit: boolean;
  /** How lit the surface is, 0 to 1. */
  lit: number;
  /** Which way an edge runs on screen, as a fraction of a half turn. */
  edgeAngle: number;
  /** How side-on the surface is, 0 facing you to 1 edge-on. */
  edgeStrength: number;
  /** The source's colour under the sample, r, g, b from 0 to 255. */
  tint?: readonly [number, number, number];
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const mixedBand = (band: number): string => {
  const start = MIXED_BANDS.slice(0, band).reduce((total, size) => total + size, 0);
  return MIXED.slice(start, start + (MIXED_BANDS[band] ?? 0));
};

function cellCharacter({ style, sample, tone, column, row, seconds, ramp }: { style: AsciiStyle; sample: Sample; tone: number; column: number; row: number; seconds: number; ramp: readonly string[] }): string | null {
  const seed = flickerSeed(column, row, seconds);

  switch (style) {
    case "ascii": {
      if (sample.edgeStrength > EDGE_THRESHOLD) return EDGES[Math.floor(sample.edgeAngle * 4 + 0.5) % 4] ?? null;
      const dithered = clampUnit(tone + (bayer(column, row) - 0.5) / ramp.length);
      return ramp[Math.round(dithered * (ramp.length - 1))] ?? null;
    }
    case "binary":
      if (tone + (bayer(column, row) - 0.5) * 0.5 < BINARY_EMPTY) return null;
      return String(hash(column, row, seed) & 1);
    case "mixed": {
      const dithered = clampUnit(tone + (bayer(column, row) - 0.5) * 0.25);
      if (dithered < MIXED_EMPTY) return null;
      const band = Math.min(3, Math.floor(dithered * 4));
      const pool = band < 3 ? mixedBand(band) : DIGITS;
      return pool[hash(column, row, seed) % pool.length] ?? null;
    }
    default:
      return null;
  }
}

const SHADES = " ░▒▓█";
const DOTS = " ·•●";
/** Braille dot bits by column and row from the top, per Unicode's numbering. */
const BRAILLE_DOTS = [
  [0, 0, 0x01],
  [0, 1, 0x02],
  [0, 2, 0x04],
  [1, 0, 0x08],
  [1, 1, 0x10],
  [1, 2, 0x20],
  [0, 3, 0x40],
  [1, 3, 0x80],
] as const;
const BRAILLE_BLANK = 0x2800;

export interface FrameTextOptions {
  style: AsciiStyle;
  /** The sample at a column and row of the sampled grid, counted from the bottom. */
  read: (x: number, y: number) => Sample;
  columns: number;
  rows: number;
  seconds: number;
  invert: boolean;
  ramp: readonly string[];
  /** Tones below this are left empty. */
  floor: number;
}

export interface AsciiCells {
  columns: number;
  rows: number;
  /** One per cell, the top row first; a space where nothing shows. */
  characters: string[];
  /** How lit each cell's surface is, 0 to 1; 0 where nothing shows. */
  lit: Float32Array;
  /** Each cell's source colour as r, g, b from 0 to 255, for full-colour media. */
  tints: Uint8Array;
}

/**
 * A frame as a grid of characters with how lit each one is and its source colour: what text,
 * terminal and SVG exports are made from. Blocks and halftone keep their average shade; Braille and
 * dither become Unicode Braille.
 */
export function frameCells({ style, read, columns, rows, seconds, invert, ramp, floor }: FrameTextOptions): AsciiCells {
  const [splitX, splitY] = STYLES[style].split;
  const toneOf = (sample: Sample) => (invert ? 1 - sample.lit : sample.lit);
  const shows = (sample: Sample) => sample.hit && toneOf(sample) >= floor;
  const characters: string[] = [];
  const lit = new Float32Array(columns * rows);
  const tints = new Uint8Array(columns * rows * 3);

  for (let row = rows - 1; row >= 0; row--) {
    for (let column = 0; column < columns; column++) {
      const cell = characters.length;
      const shown: Sample[] = [];
      let character = " ";

      if (splitX === 1 && splitY === 1) {
        const sample = read(column, row);
        if (shows(sample)) {
          shown.push(sample);
          character = cellCharacter({ style, sample, tone: toneOf(sample), column, row, seconds, ramp }) ?? " ";
        }
      } else if (style === "braille" || style === "dither") {
        let bits = 0;

        for (const [dx, fromTop, bit] of BRAILLE_DOTS) {
          if (fromTop >= splitY) continue;
          const x = column * splitX + dx;
          const y = row * splitY + (splitY - 1 - fromTop);
          const sample = read(x, y);
          const threshold = style === "braille" ? bayer(x, y) * 0.85 + 0.08 : bayer(x, y);
          if (!shows(sample)) continue;
          shown.push(sample);
          if (toneOf(sample) > threshold) bits |= bit;
        }

        if (bits !== 0) character = String.fromCharCode(BRAILLE_BLANK + bits);
      } else {
        let total = 0;

        for (let dy = 0; dy < splitY; dy++) {
          const sample = read(column, row * splitY + dy);
          if (!shows(sample)) continue;
          shown.push(sample);
          total += toneOf(sample);
        }

        const shades = style === "halftone" ? DOTS : SHADES;
        if (shown.length > 0) character = shades[Math.max(1, Math.round((total / splitY) * (shades.length - 1)))] ?? " ";
      }

      characters.push(character);
      if (character === " " || shown.length === 0) continue;

      lit[cell] = shown.reduce((total, sample) => total + sample.lit, 0) / shown.length;
      for (let channel = 0; channel < 3; channel++) {
        tints[cell * 3 + channel] = Math.round(shown.reduce((total, sample) => total + (sample.tint?.[channel] ?? 255), 0) / shown.length);
      }
    }
  }

  return { columns, rows, characters, lit, tints };
}

/** A frame as text, trimmed to the rows and columns that hold anything. */
export function frameText(options: FrameTextOptions): string {
  const { columns, rows, characters } = frameCells(options);
  const lines = Array.from({ length: rows }, (_, row) => characters.slice(row * columns, (row + 1) * columns).join("").trimEnd());

  while (lines[0] === "") lines.shift();
  while (lines.at(-1) === "") lines.pop();

  const filled = lines.filter(Boolean);
  const indent = filled.length === 0 ? 0 : Math.min(...filled.map((line) => line.length - line.trimStart().length));

  return lines.map((line) => line.slice(indent)).join("\n");
}
