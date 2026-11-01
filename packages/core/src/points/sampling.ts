/**
 * Turning shapes into points.
 *
 * Lay a sheet of evenly spaced pins over a shape and keep the pins that land inside: that's a
 * filled shape made of dots. The pins sit on a lattice (staggered rows by default, the way
 * oranges stack), so every dot has the same gap to its neighbours. Ask for a `count` and the
 * spacing is tuned until exactly that many fit.
 */
import type { Point } from "../interpolate";
import { pointAt, toCubics, type Subpath } from "../path/normalize";
import { parsePath } from "../path/parse";

export interface SampleOptions {
  /**
   * How many points. The spacing is tuned to fit about this many, then the extra few are thinned
   * out evenly, so you get exactly this many. Give either `count` or `spacing`; default 500.
   */
  count?: number;
  /** The gap between neighbouring points, in the shape's units. Overrides `count`. */
  spacing?: number;
  /** `"hex"` (default): staggered rows, the most even packing. `"grid"`: plain rows and columns. */
  pattern?: "hex" | "grid";
  /** Nudge each point off the lattice by up to this share of the spacing (0 to 1), for a hand-made look. Default 0. */
  jitter?: number;
  /** The seed for `jitter`: the same seed always gives the same points. Default 1. */
  seed?: number;
}

export interface PathSampleOptions extends SampleOptions {
  /** `"fill"` (default) covers the inside; `"outline"` spaces points evenly along the edges. */
  mode?: "fill" | "outline";
  /** Which parts count as inside when outlines overlap, as in SVG. Default `"nonzero"`. */
  fillRule?: "nonzero" | "evenodd";
}

export interface Mask {
  width: number;
  height: number;
  /**
   * One value per pixel, row by row, or four (red, green, blue, alpha, as in `ImageData`), in
   * which case alpha is used. 0–255, or 0–1 for `Float32Array` and `Float64Array`.
   */
  data: ArrayLike<number>;
}

export interface MaskSampleOptions extends SampleOptions {
  /** Pixels at or above this count as inside. Default: half way (128, or 0.5 for float data). */
  threshold?: number;
}

/** The most lattice points a sampler will lay out, so a tiny spacing can't exhaust memory. */
const MAX_POINTS = 2_000_000;

/**
 * Points evenly spread over an SVG path: inside it (`mode: "fill"`) or along its edges
 * (`mode: "outline"`). Takes path data (`"M0 0 L10 0 …"`) or subpaths from `toCubics`.
 * Coordinates come back in the path's own units. A shape with no inside gives no fill points.
 */
export function samplePath(path: string | readonly Subpath[], options: PathSampleOptions = {}): Point[] {
  const subpaths = typeof path === "string" ? toCubics(parsePath(path)) : path;
  const mode = options.mode ?? "fill";

  if (mode !== "fill" && mode !== "outline") throw new RangeError(`samplePath: mode must be "fill" or "outline", got ${mode}`);
  const fillRule = options.fillRule ?? "nonzero";
  if (fillRule !== "nonzero" && fillRule !== "evenodd") {
    throw new RangeError(`samplePath: fillRule must be "nonzero" or "evenodd", got ${fillRule}`);
  }
  checkOptions(options, "samplePath");
  const shapes = subpaths.map((s) => ({ polygon: flatten(s), closed: s.closed })).filter((s) => s.polygon.length >= 2);
  if (mode === "outline") return alongOutlines(shapes, options);
  const polygons = shapes.map((s) => s.polygon);

  // Every edge, closing each outline as SVG does when it fills.
  const edges: number[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i]!;
      const q = polygon[(i + 1) % polygon.length]!;
      if (p.y !== q.y) edges.push(p.x, p.y, q.x, q.y);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (edges.length === 0) return [];
  // A first guess at the area, to start the spacing search near the answer. Loops winding
  // opposite ways can cancel out, so fall back to the bounding box.
  const enclosed = Math.abs(polygons.reduce((sum, polygon) => sum + shoelace(polygon), 0));
  const area = enclosed > 0 ? enclosed : (maxX - minX) * (maxY - minY);
  const inside = (x: number, y: number) => winding({ edges, x, y, rule: fillRule });

  return sampleLattice({
    box: { minX, minY, maxX, maxY },
    area,
    options,
    row: (y, emit) => {
      // Where this row crosses the outline, and which way: walk along it, keeping count.
      const crossings: [x: number, dir: number][] = [];
      for (let e = 0; e < edges.length; e += 4) {
        const y0 = edges[e + 1]!,
          y1 = edges[e + 3]!;
        // Half-open, so a row through a corner counts it once.
        if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
          const x0 = edges[e]!,
            x1 = edges[e + 2]!;
          crossings.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
        }
      }
      crossings.sort((p, q) => p[0] - q[0]);
      let w = 0;
      for (let c = 0; c < crossings.length - 1; c++) {
        w += crossings[c]![1];
        if (fillRule === "evenodd" ? w % 2 !== 0 : w !== 0) emit(crossings[c]![0], crossings[c + 1]![0]);
      }
    },
    inside,
  });
}

/**
 * Points evenly spread over the filled pixels of a mask: text drawn to a canvas, an image's
 * alpha, a heat map. Coordinates come back in pixels, with (0, 0) the top-left corner.
 */
export function sampleMask(mask: Mask, options: MaskSampleOptions = {}): Point[] {
  const { width, height, data } = mask;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 0 || height < 0) {
    throw new RangeError(`sampleMask: width and height must be whole numbers, got ${width} × ${height}`);
  }
  checkOptions(options, "sampleMask");
  const pixels = width * height;
  if (pixels === 0) return [];
  const channels = data.length / pixels;
  if (channels !== 1 && channels !== 4) {
    throw new RangeError(`sampleMask: data needs ${pixels} values (one per pixel) or ${pixels * 4} (RGBA), got ${data.length}`);
  }
  const float = data instanceof Float32Array || data instanceof Float64Array;
  const threshold = options.threshold ?? (float ? 0.5 : 128);
  if (!Number.isFinite(threshold)) throw new RangeError(`sampleMask: threshold must be a finite number, got ${threshold}`);
  const offset = channels === 4 ? 3 : 0;
  const filled = (x: number, y: number) => {
    const px = Math.floor(x);
    const py = Math.floor(y);
    return px >= 0 && py >= 0 && px < width && py < height && data[(py * width + px) * channels + offset]! >= threshold;
  };

  let area = 0;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + offset]! < threshold) continue;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (area === 0) return [];

  return sampleLattice({
    box: { minX, minY, maxX: maxX + 1, maxY: maxY + 1 },
    area,
    options,
    row: (y, emit) => {
      // Runs of filled pixels along this row.
      const py = Math.floor(y);
      let start = -1;
      for (let x = minX; x <= maxX + 1; x++) {
        const on = x <= maxX && filled(x, py);
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          emit(start, x);
          start = -1;
        }
      }
    },
    inside: filled,
  });
}

export interface FitOptions {
  /** Space to leave around the points, in the box's units. Default 0. */
  padding?: number;
  /** `"contain"` (default) scales to fit inside, keeping proportions; `"none"` only centres. */
  mode?: "contain" | "none";
  /**
   * The frame the points are drawn in, fitted instead of the points' own bounds. Give one when
   * successive shapes share a frame (a chart's axes, a card), so a shape that grows or shrinks
   * moves within it rather than being rescaled to fill the box.
   */
  from?: { x?: number; y?: number; width: number; height: number };
}

/**
 * Scale and move `points` so they sit centred in `box`, keeping their proportions. Use it to
 * place sampled points (in a path's or a mask's units) onto a canvas.
 */
export function fitPoints<T extends Point>(
  points: readonly T[],
  box: { x: number; y: number; width: number; height: number },
  options: FitOptions = {},
): T[] {
  const padding = options.padding ?? 0;
  const mode = options.mode ?? "contain";
  if (points.length === 0) return [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  if (options.from) {
    const { x = 0, y = 0, width, height } = options.from;
    if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
      throw new RangeError(`fitPoints: from must be a finite box with a size of 0 or more, got ${JSON.stringify(options.from)}`);
    }
    [minX, minY, maxX, maxY] = [x, y, x + width, y + height];
  } else {
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const room = { width: Math.max(0, box.width - 2 * padding), height: Math.max(0, box.height - 2 * padding) };
  const fit = Math.min(w > 0 ? room.width / w : Infinity, h > 0 ? room.height / h : Infinity);
  const scale = mode === "none" || !Number.isFinite(fit) ? 1 : fit;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Anything else on the points (a tone, an id) comes along unchanged.
  return points.map((p) => ({ ...p, x: cx + (p.x - (minX + maxX) / 2) * scale, y: cy + (p.y - (minY + maxY) / 2) * scale }));
}

/* Shared lattice */

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Lay a lattice over `box` and keep the points inside. `row(y, emit)` reports the inside spans
 * of the row at height `y`; `inside(x, y)` checks a single point (used after jitter).
 */
function sampleLattice({
  box,
  area,
  options,
  row,
  inside,
}: {
  box: Box;
  area: number;
  options: SampleOptions;
  row: (y: number, emit: (from: number, to: number) => void) => void;
  inside: (x: number, y: number) => boolean;
}): Point[] {
  const hex = (options.pattern ?? "hex") === "hex";
  // Each hex point owns a cell of spacing² · √3/2; each grid point, spacing².
  const cell = hex ? Math.sqrt(3) / 2 : 1;

  const lay = (spacing: number): Point[] | null => {
    const rowGap = spacing * cell;
    const rows = Math.floor((box.maxY - box.minY) / rowGap) + 1;
    if (rows > MAX_POINTS) return null;
    const out: Point[] = [];
    for (let r = 0; r < rows; r++) {
      // Rows sit half a gap in from the top edge, so the pattern looks centred in thin shapes.
      const y = box.minY + rowGap / 2 + r * rowGap;
      if (y > box.maxY) break;
      const shift = hex && r % 2 === 1 ? spacing / 2 : 0;
      let overflow = false;
      // Every span uses the same column positions, so the lattice stays one unbroken sheet.
      const origin = box.minX + shift + spacing / 2;
      row(y, (from, to) => {
        if (overflow) return;
        for (let k = Math.ceil((from - origin) / spacing), x = origin + k * spacing; x < to; k++, x = origin + k * spacing) {
          out.push({ x, y });
          if (out.length > MAX_POINTS) {
            overflow = true;
            return;
          }
        }
      });
      if (overflow) return null;
    }
    return out;
  };

  let points: Point[];
  if (options.spacing !== undefined) {
    const laid = lay(options.spacing);
    if (!laid) throw new RangeError(`sampling: spacing ${options.spacing} would make more than ${MAX_POINTS} points`);
    points = laid;
  } else {
    const count = options.count ?? 500;
    if (count === 0 || !(area > 0)) return [];
    // Start from the spacing that would tile the area exactly, then correct by how far off the
    // real count is (edges lose partial cells), until there are enough but only a few extra.
    let spacing = Math.sqrt(area / (count * cell));
    // Shapes with no inside (a lone line) find nothing at any spacing: stop well before the
    // spacing gets silly.
    const smallest = Math.hypot(box.maxX - box.minX, box.maxY - box.minY) * 1e-4;
    let best: { points: Point[]; spacing: number } | null = null;
    for (let tries = 0; tries < 60; tries++) {
      const laid = lay(spacing);
      const found = laid ? laid.length : Infinity;
      if (found === 0 && spacing < smallest) return [];
      if (laid && found >= count && (!best || found < best.points.length)) best = { points: laid, spacing };
      if (found >= count && found <= count * 1.02 + 1) break;
      // Too few: tighten. Too many (or too many to lay out): loosen.
      const ratio = found === 0 ? 0.5 : found === Infinity ? 2 : Math.sqrt(found / count);
      spacing *= found < count ? Math.min(0.995, Math.max(0.5, ratio)) : Math.max(1.002, Math.min(2, ratio));
    }
    if (!best) throw new RangeError(`sampling: couldn't fit ${count} points in this shape; ask for fewer or give a spacing`);
    const laid = best.points;
    // Thin out the few extra evenly, rather than trimming one edge.
    points = laid.length === count ? laid : Array.from({ length: count }, (_, i) => laid[Math.floor((i * laid.length) / count)]!);
    options = { ...options, spacing: best.spacing };
  }

  const jitter = options.jitter ?? 0;
  if (jitter > 0) {
    const random = mulberry32(options.seed ?? 1);
    const reach = jitter * options.spacing!;
    points = points.map((p) => {
      // A few tries to land inside; otherwise stay on the lattice.
      for (let t = 0; t < 4; t++) {
        const x = p.x + (random() - 0.5) * reach;
        const y = p.y + (random() - 0.5) * reach;
        if (inside(x, y)) return { x, y };
      }
      return p;
    });
  }
  return points;
}

/* Paths */

/** A closed polygon close to the subpath: each cubic cut into enough straight pieces. */
function flatten(subpath: Subpath): Point[] {
  const out: Point[] = [];
  for (const c of subpath.segments) {
    // The handles' polygon is never shorter than the curve: use it to pick how many pieces.
    const hull =
      Math.hypot(c.p1.x - c.p0.x, c.p1.y - c.p0.y) +
      Math.hypot(c.p2.x - c.p1.x, c.p2.y - c.p1.y) +
      Math.hypot(c.p3.x - c.p2.x, c.p3.y - c.p2.y);
    const chord = Math.hypot(c.p3.x - c.p0.x, c.p3.y - c.p0.y);
    // A straight line is one piece; curvier segments get more, up to 64.
    const pieces = hull - chord < 1e-9 * (hull + 1) ? 1 : Math.min(64, Math.max(4, Math.ceil(Math.sqrt(hull) * 2)));
    for (let k = 0; k < pieces; k++) out.push(pointAt(c, k / pieces));
  }
  const last = subpath.segments[subpath.segments.length - 1];
  if (last) out.push(last.p3);
  // Drop the closing point when it repeats the first.
  const first = out[0];
  const end = out[out.length - 1];
  if (out.length > 1 && first && end && first.x === end.x && first.y === end.y) out.pop();
  return out;
}

function shoelace(polygon: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!;
    const q = polygon[(i + 1) % polygon.length]!;
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

/** Whether (x, y) is inside, by counting how the outline winds round it. */
function winding({ edges, x, y, rule }: { edges: number[]; x: number; y: number; rule: "nonzero" | "evenodd" }): boolean {
  let w = 0;
  for (let e = 0; e < edges.length; e += 4) {
    const x0 = edges[e]!,
      y0 = edges[e + 1]!,
      x1 = edges[e + 2]!,
      y1 = edges[e + 3]!;
    if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
      if (x0 + ((y - y0) / (y1 - y0)) * (x1 - x0) > x) w += y1 > y0 ? 1 : -1;
    }
  }
  return rule === "evenodd" ? w % 2 !== 0 : w !== 0;
}

/** Points spaced evenly along every outline, shared between outlines by length. */
function alongOutlines(shapes: { polygon: Point[]; closed: boolean }[], options: SampleOptions): Point[] {
  // Each outline as a run of corners with the distance walked to reach each one. Closed
  // outlines walk back to their start; open ones stop at their last corner.
  const runs = shapes.map(({ polygon, closed }) => {
    const corners = closed ? [...polygon, polygon[0]!] : polygon;
    const walked = [0];
    for (let k = 1; k < corners.length; k++) {
      walked.push(walked[k - 1]! + Math.hypot(corners[k]!.x - corners[k - 1]!.x, corners[k]!.y - corners[k - 1]!.y));
    }
    return { corners, walked, closed, length: walked[walked.length - 1]! };
  });
  const total = runs.reduce((sum, r) => sum + r.length, 0);
  if (total === 0) return [];
  const count = options.spacing !== undefined ? Math.max(1, Math.round(total / options.spacing)) : options.count ?? 500;
  if (count > MAX_POINTS) throw new RangeError(`sampling: spacing ${options.spacing} would make more than ${MAX_POINTS} points`);

  // Share the points by length, giving the leftovers to the largest remainders.
  const exact = runs.map((r) => (r.length / total) * count);
  const shares = exact.map(Math.floor);
  const spare = count - shares.reduce((sum, n) => sum + n, 0);
  const byRemainder = exact.map((_, i) => i).sort((p, q) => exact[q]! - shares[q]! - (exact[p]! - shares[p]!) || p - q);
  for (let k = 0; k < spare; k++) shares[byRemainder[k]!]!++;

  const out: Point[] = [];
  runs.forEach(({ corners, walked, closed, length }, i) => {
    const n = shares[i]!;
    if (n === 0 || length === 0) return;
    let edge = 0;
    for (let k = 0; k < n; k++) {
      // Closed loops: evenly round with no seam. Open lines: from end to end (one point: the middle).
      const at = closed ? (k * length) / n : n === 1 ? length / 2 : (k * length) / (n - 1);
      while (edge < corners.length - 2 && walked[edge + 1]! < at) edge++;
      const p = corners[edge]!;
      const q = corners[edge + 1]!;
      const span = walked[edge + 1]! - walked[edge]!;
      const t = span > 0 ? Math.min(1, Math.max(0, (at - walked[edge]!) / span)) : 0;
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  });
  return out;
}

/* Helpers */

function checkOptions(options: SampleOptions, name: string) {
  const { count, spacing, jitter, pattern } = options;
  if (count !== undefined && (!Number.isInteger(count) || count < 0)) {
    throw new RangeError(`${name}: count must be a whole number, 0 or more, got ${count}`);
  }
  if (spacing !== undefined && !(spacing > 0 && Number.isFinite(spacing))) {
    throw new RangeError(`${name}: spacing must be a positive number, got ${spacing}`);
  }
  if (jitter !== undefined && !(jitter >= 0 && jitter <= 1)) throw new RangeError(`${name}: jitter must be from 0 to 1, got ${jitter}`);
  if (pattern !== undefined && pattern !== "hex" && pattern !== "grid") {
    throw new RangeError(`${name}: pattern must be "hex" or "grid", got ${pattern}`);
  }
}

/** A small seeded random generator (mulberry32). */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ClusterOptions {
  /** Where the heap sits. */
  x: number;
  y: number;
  /** How far the heap reaches from its middle, in the points' units. Default 6. */
  radius?: number;
}

/**
 * The same points gathered into a small, round heap at one spot: a bin, a cart, an inbox. The
 * heap is spread like a sunflower's seeds, so it's even at any count. Each point keeps everything
 * else it carries (a tone, an id) and its place in the list, so pairing by index sends every point
 * from the shape to the heap and back again.
 */
export function clusterPoints<T extends Point>(points: readonly T[], options: ClusterOptions): T[] {
  const radius = options.radius ?? 6;
  if (![options.x, options.y, radius].every(Number.isFinite) || radius < 0) {
    throw new RangeError(`clusterPoints: x, y and radius must be finite, and radius 0 or more, got ${JSON.stringify(options)}`);
  }
  const golden = Math.PI * (3 - Math.sqrt(5));
  return points.map((p, i) => {
    const r = radius * Math.sqrt((i + 0.5) / points.length);
    return { ...p, x: options.x + Math.cos(i * golden) * r, y: options.y + Math.sin(i * golden) * r };
  });
}
