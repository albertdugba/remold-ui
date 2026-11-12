import type { Point } from "../interpolate";

export interface SampleOptions {
  /** How many points. The spacing is tuned to fit about this many. */
  count?: number;
  /** The gap between neighbouring points, in the shape's units. */
  spacing?: number;
  /** `"hex"` (default): staggered rows, the most even packing. */
  pattern?: "hex" | "grid";
  /** Nudge each point off the lattice by up to this share of the spacing (0 to 1), for a hand-made look. */
  jitter?: number;
  /** The seed for `jitter`: the same seed always gives the same points. */
  seed?: number;
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type RowSpans = (y: number, emit: (from: number, to: number) => void) => void;

export interface LatticeOptions {
  box: Box;
  area: number;
  options: SampleOptions;
  row: RowSpans;
  inside: (x: number, y: number) => boolean;
}

export const MAX_POINTS = 2_000_000;
export const DEFAULT_COUNT = 500;

const HEX_ROW_GAP = Math.sqrt(3) / 2;
const SPACING_TRIES = 60;
const COUNT_SLACK = 1.02;
const SMALLEST_SPACING_SHARE = 1e-4;
const JITTER_TRIES = 4;

export function checkSampleOptions({ count, spacing, jitter, pattern }: SampleOptions, name: string) {
  if (count !== undefined && (!Number.isInteger(count) || count < 0)) {
    throw new RangeError(`${name}: count must be a whole number, 0 or more, got ${count}`);
  }

  if (spacing !== undefined && !(spacing > 0 && Number.isFinite(spacing))) {
    throw new RangeError(`${name}: spacing must be a positive number, got ${spacing}`);
  }

  if (jitter !== undefined && !(jitter >= 0 && jitter <= 1)) {
    throw new RangeError(`${name}: jitter must be from 0 to 1, got ${jitter}`);
  }

  if (pattern !== undefined && pattern !== "hex" && pattern !== "grid") {
    throw new RangeError(`${name}: pattern must be "hex" or "grid", got ${pattern}`);
  }
}

export function mulberry32(seed: number) {
  let state = seed | 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);

    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const tooMany = (spacing: number | undefined) =>
  new RangeError(`sampling: spacing ${spacing} would make more than ${MAX_POINTS} points`);

function layRow(points: Point[], row: RowSpans, y: number, origin: number, spacing: number): boolean {
  let overflow = false;

  row(y, (from, to) => {
    if (overflow) return;

    for (let column = Math.ceil((from - origin) / spacing), x = origin + column * spacing; x < to; column++, x = origin + column * spacing) {
      points.push({ x, y });

      if (points.length > MAX_POINTS) {
        overflow = true;
        return;
      }
    }
  });

  return !overflow;
}

function layLattice(box: Box, spacing: number, hex: boolean, row: RowSpans): Point[] | null {
  const rowGap = spacing * (hex ? HEX_ROW_GAP : 1);
  const rows = Math.floor((box.maxY - box.minY) / rowGap) + 1;

  if (rows > MAX_POINTS) return null;

  const points: Point[] = [];

  for (let index = 0; index < rows; index++) {
    const y = box.minY + rowGap / 2 + index * rowGap;

    if (y > box.maxY) break;

    const shift = hex && index % 2 === 1 ? spacing / 2 : 0;

    if (!layRow(points, row, y, box.minX + shift + spacing / 2, spacing)) return null;
  }

  return points;
}

function nextSpacing(spacing: number, found: number, count: number): number {
  const ratio = found === 0 ? 0.5 : found === Infinity ? 2 : Math.sqrt(found / count);

  if (found < count) return spacing * Math.min(0.995, Math.max(0.5, ratio));

  return spacing * Math.max(1.002, Math.min(2, ratio));
}

interface Laid {
  points: Point[];
  spacing: number;
}

function searchSpacing(box: Box, area: number, count: number, hex: boolean, row: RowSpans): Laid | null {
  const smallest = Math.hypot(box.maxX - box.minX, box.maxY - box.minY) * SMALLEST_SPACING_SHARE;
  let spacing = Math.sqrt(area / (count * (hex ? HEX_ROW_GAP : 1)));
  let best: Laid | null = null;

  for (let tries = 0; tries < SPACING_TRIES; tries++) {
    const laid = layLattice(box, spacing, hex, row);
    const found = laid ? laid.length : Infinity;

    if (found === 0 && spacing < smallest) return null;

    if (laid && found >= count && (!best || found < best.points.length)) best = { points: laid, spacing };

    if (found >= count && found <= count * COUNT_SLACK + 1) break;

    spacing = nextSpacing(spacing, found, count);
  }

  if (!best) throw new RangeError(`sampling: couldn't fit ${count} points in this shape; ask for fewer or give a spacing`);

  return best;
}

const thinTo = (points: Point[], count: number) =>
  points.length === count ? points : Array.from({ length: count }, (_, index) => points[Math.floor((index * points.length) / count)]!);

function jittered(points: Point[], reach: number, seed: number, inside: LatticeOptions["inside"]): Point[] {
  const random = mulberry32(seed);

  return points.map((point) => {
    for (let attempt = 0; attempt < JITTER_TRIES; attempt++) {
      const x = point.x + (random() - 0.5) * reach;
      const y = point.y + (random() - 0.5) * reach;

      if (inside(x, y)) return { x, y };
    }

    return point;
  });
}

function latticeFor({ box, area, options, row }: LatticeOptions, hex: boolean): Laid | null {
  if (options.spacing !== undefined) {
    const points = layLattice(box, options.spacing, hex, row);

    if (!points) throw tooMany(options.spacing);

    return { points, spacing: options.spacing };
  }

  const count = options.count ?? DEFAULT_COUNT;

  if (count === 0 || !(area > 0)) return null;

  const best = searchSpacing(box, area, count, hex, row);

  return best && { points: thinTo(best.points, count), spacing: best.spacing };
}

export function sampleLattice(lattice: LatticeOptions): Point[] {
  const { options, inside } = lattice;
  const laid = latticeFor(lattice, (options.pattern ?? "hex") === "hex");

  if (!laid) return [];

  const jitter = options.jitter ?? 0;

  return jitter > 0 ? jittered(laid.points, jitter * laid.spacing, options.seed ?? 1, inside) : laid.points;
}
