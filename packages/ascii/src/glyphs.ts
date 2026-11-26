/**
 * The characters a frame draws with, pre-drawn in one strip at the screen's pixel size so the glyph
 * shader copies texels instead of drawing text. The strip holds the ramp, then the edge characters,
 * the digits and the mixed style's characters, in that order.
 */

export const DEFAULT_RAMP = ".:-=+*#%@";
/** Indexed by an edge's direction in quarter turns of 45°: flat, rising, upright, falling. */
export const EDGES = "-/|\\";
export const DIGITS = "0123456789";
/** The mixed style's characters, faint to dense, in bands of 2, 3 and 3. Digits are its densest band. */
export const MIXED = ".:-=+*#@";
export const MIXED_BANDS = [2, 3, 3] as const;

export const DEFAULT_FONT = '"SF Mono", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';
const MONOSPACE_ADVANCE = 0.6;

export interface GlyphLayout {
  characters: readonly string[];
  ramp: readonly string[];
  /** Where each run starts in `characters`. */
  edges: number;
  digits: number;
  mixed: number;
}

export function glyphLayout(ramp: string = DEFAULT_RAMP): GlyphLayout {
  const rampCharacters = [...ramp];

  if (rampCharacters.length === 0) throw new RangeError("ascii: the character ramp needs at least one character");

  const characters = [...rampCharacters, ...EDGES, ...DIGITS, ...MIXED];

  return {
    characters,
    ramp: rampCharacters,
    edges: rampCharacters.length,
    digits: rampCharacters.length + EDGES.length,
    mixed: rampCharacters.length + EDGES.length + DIGITS.length,
  };
}

export interface GlyphAtlas {
  canvas: HTMLCanvasElement;
  /** One cell, in device pixels. */
  cellWidth: number;
  cellHeight: number;
}

export function glyphAtlas({ characters, size, pixelRatio, font = DEFAULT_FONT }: { characters: readonly string[]; size: number; pixelRatio: number; font?: string }): GlyphAtlas {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) throw new Error("ascii: no 2D canvas to draw the characters into");

  const fontString = `${size * pixelRatio}px ${font}`;
  context.font = fontString;
  const advance = context.measureText("M").width || size * pixelRatio * MONOSPACE_ADVANCE;
  const cellWidth = Math.max(1, Math.round(advance));
  const cellHeight = Math.max(1, Math.round(size * pixelRatio));

  canvas.width = cellWidth * characters.length;
  canvas.height = cellHeight;
  context.font = fontString;
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  characters.forEach((character, index) => {
    context.fillText(character, (index + 0.5) * cellWidth, cellHeight / 2);
  });

  return { canvas, cellWidth, cellHeight };
}
