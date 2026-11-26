import type { ParticleAscii, ParticleFill } from "./types";

export const DEFAULT_ASCII_CHARACTERS = ".:-=+*#%@";
const DEFAULT_ASCII_SIZE = 12;
const DEFAULT_ASCII_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const MONOSPACE_ADVANCE = 0.6;
const HIDDEN_SCALE = 0.35;
const ATLAS_LIMIT = 32;

export interface AsciiConfiguration {
  characters: readonly string[];
  size: number;
  font: string;
}

export interface AsciiGrid {
  cellWidth: number;
  cellHeight: number;
  columns: number;
  rows: number;
}

/** A dot on screen, or null when it's too small to show. */
export type LocatePoint = (index: number) => { x: number; y: number; scale: number } | null;

export function asciiConfiguration(ascii: ParticleAscii | undefined): AsciiConfiguration {
  const characters = [...(ascii?.characters ?? DEFAULT_ASCII_CHARACTERS)];
  const size = ascii?.size ?? DEFAULT_ASCII_SIZE;

  if (characters.length === 0) throw new RangeError("particles: ascii.characters needs at least one character");

  if (!(size > 0)) throw new RangeError(`particles: ascii.size must be positive, got ${size}`);

  return { characters, size, font: ascii?.font ?? DEFAULT_ASCII_FONT };
}

/** The grid of character cells covering a canvas, `cellWidth` from the font's own advance. */
export function asciiGrid({ width, height, size, advance }: { width: number; height: number; size: number; advance: number }): AsciiGrid {
  const cellWidth = advance > 0 ? advance : size * MONOSPACE_ADVANCE;

  return { cellWidth, cellHeight: size, columns: Math.max(1, Math.ceil(width / cellWidth)), rows: Math.max(1, Math.ceil(height / size)) };
}

/** The character for a tone: 0 is the lightest, 1 the densest. */
export function characterIndex(tone: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(tone * (count - 1))));
}

/**
 * One dot per cell, so the result reads as text rather than letters piled on letters. Where several
 * dots land in one cell, the densest wins.
 */
export function claimCells({ count, locate, tone, grid }: { count: number; locate: LocatePoint; tone: (index: number) => number; grid: AsciiGrid }): Map<number, number> {
  const cells = new Map<number, number>();

  for (let index = 0; index < count; index++) {
    const point = locate(index);

    if (!point || point.scale < HIDDEN_SCALE) continue;

    const column = Math.floor(point.x / grid.cellWidth);
    const row = Math.floor(point.y / grid.cellHeight);

    if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) continue;

    const cell = row * grid.columns + column;
    const held = cells.get(cell);

    if (held === undefined || tone(index) > tone(held)) cells.set(cell, index);
  }

  return cells;
}

/**
 * Fills single empty cells between two claimed ones, across or down. Dots sampled at nearly the
 * cell's spacing leave whole rows or columns empty here and there; this closes them without
 * growing the shape's edges.
 */
export function closeGaps(cells: Map<number, number>, grid: AsciiGrid): Map<number, number> {
  const closed = new Map(cells);

  for (const [cell, index] of cells) {
    const column = cell % grid.columns;
    const below = cell + grid.columns;
    const right = cell + 1;

    if (!cells.has(below) && cells.has(below + grid.columns) && below + grid.columns < grid.columns * grid.rows) closed.set(below, index);

    if (column + 2 < grid.columns && !cells.has(right) && cells.has(right + 1)) closed.set(right, index);
  }

  return closed;
}

/** The cells as plain text: one line per row, trimmed to the rows and columns that hold anything. */
export function asciiText(cells: Map<number, number>, grid: AsciiGrid, characterOf: (index: number) => string): string {
  if (cells.size === 0) return "";

  const rows = new Map<number, Map<number, string>>();
  let firstColumn = grid.columns;

  for (const [cell, index] of cells) {
    const row = Math.floor(cell / grid.columns);
    const column = cell % grid.columns;

    firstColumn = Math.min(firstColumn, column);
    if (!rows.has(row)) rows.set(row, new Map());
    rows.get(row)!.set(column, characterOf(index));
  }

  const rowNumbers = [...rows.keys()];
  const lines: string[] = [];

  for (let row = Math.min(...rowNumbers); row <= Math.max(...rowNumbers); row++) {
    const columns = rows.get(row);
    const last = columns ? Math.max(...columns.keys()) : firstColumn - 1;
    let line = "";

    for (let column = firstColumn; column <= last; column++) line += columns?.get(column) ?? " ";

    lines.push(line);
  }

  return lines.join("\n");
}

interface Atlas {
  image: CanvasImageSource;
  pixelRatio: number;
}

/** Pre-drawn characters, one strip per colour, so each frame is a run of image copies. */
export function createAsciiAtlases(configuration: AsciiConfiguration) {
  const atlases = new Map<string, Atlas | null>();

  const build = (color: string, grid: AsciiGrid, pixelRatio: number): Atlas | null => {
    if (typeof document === "undefined") return null;

    const strip = document.createElement("canvas");
    const context = strip.getContext("2d");

    if (!context || typeof context.fillText !== "function") return null;

    strip.width = Math.ceil(configuration.characters.length * grid.cellWidth * pixelRatio);
    strip.height = Math.ceil(grid.cellHeight * pixelRatio);
    context.scale(pixelRatio, pixelRatio);
    context.font = `${configuration.size}px ${configuration.font}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    configuration.characters.forEach((character, index) => {
      context.fillText(character, (index + 0.5) * grid.cellWidth, grid.cellHeight / 2);
    });

    return { image: strip, pixelRatio };
  };

  return {
    get(color: string, grid: AsciiGrid, pixelRatio: number): Atlas | null {
      const key = `${color}|${grid.cellWidth}|${pixelRatio}`;

      if (!atlases.has(key)) {
        if (atlases.size >= ATLAS_LIMIT) atlases.clear();
        atlases.set(key, build(color, grid, pixelRatio));
      }

      return atlases.get(key)!;
    },
    clear: () => atlases.clear(),
  };
}

export function drawAscii({
  context,
  configuration,
  atlases,
  size,
  count,
  locate,
  tone,
  fillOf,
}: {
  context: CanvasRenderingContext2D;
  configuration: AsciiConfiguration;
  atlases: ReturnType<typeof createAsciiAtlases>;
  size: { width: number; height: number; pixelRatio: number };
  count: number;
  locate: LocatePoint;
  tone: (index: number) => number;
  fillOf: (index: number) => ParticleFill;
}): () => string {
  context.font = `${configuration.size}px ${configuration.font}`;

  const advance = (typeof context.measureText === "function" ? context.measureText("M")?.width : 0) ?? 0;
  const grid = asciiGrid({ width: size.width, height: size.height, size: configuration.size, advance });
  const cells = closeGaps(claimCells({ count, locate, tone, grid }), grid);
  const characters = configuration.characters.length;

  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const [cell, index] of cells) {
    const column = cell % grid.columns;
    const row = Math.floor(cell / grid.columns);
    const character = characterIndex(tone(index), characters);
    const fill = fillOf(index);
    const atlas = typeof fill === "string" ? atlases.get(fill, grid, size.pixelRatio) : null;
    const x = column * grid.cellWidth;
    const y = row * grid.cellHeight;

    if (atlas) {
      const sourceWidth = grid.cellWidth * atlas.pixelRatio;

      context.drawImage(atlas.image, character * sourceWidth, 0, sourceWidth, grid.cellHeight * atlas.pixelRatio, x, y, grid.cellWidth, grid.cellHeight);
      continue;
    }

    context.fillStyle = fill;
    context.fillText(configuration.characters[character]!, x + grid.cellWidth / 2, y + grid.cellHeight / 2);
  }

  return () => asciiText(cells, grid, (index) => configuration.characters[characterIndex(tone(index), characters)]!);
}
