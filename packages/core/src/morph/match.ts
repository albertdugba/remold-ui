/**
 * Shape matching: decide which piece of shape A becomes which piece of shape B, and line
 * the pieces up so every point has a partner.
 *
 * For each pair of subpaths:
 *   1. pair them up by position and size (unpaired pieces shrink away or grow in),
 *   2. make them run the same way round,
 *   3. subdivide the one with fewer segments until the counts match,
 *   4. for closed loops, rotate the start point so points travel the least distance.
 */
import type { Point } from "../interpolate";
import { pointAt, type Cubic, type Subpath } from "../path/normalize";
import { bounds, centroid, signedArea } from "../path/measure";
import { subdivide } from "../path/subdivide";
import { hungarian } from "../match/hungarian";

export interface MatchOptions {
  /**
   * How subpaths are paired. `"auto"` (default) pairs by position and size, so the order they
   * were drawn in doesn't matter. `"order"` pairs the first with the first, and so on.
   */
  pairing?: "auto" | "order";
  /**
   * What an unpaired subpath turns into. `"collapse"` (default) shrinks it to a point at its
   * own centre, which suits filled shapes. `"merge"` shrinks it onto the nearest point of the
   * other shape's outline, so a stroke disappears into a line that is already drawn.
   */
  padding?: "collapse" | "merge";
  /** Make paired subpaths run the same way round (default true). */
  orient?: boolean;
  /** Rotate closed loops to the start point that travels least (default true). */
  rotate?: boolean;
}

/** Two lists of subpaths of equal length, where each pair has the same number of segments. */
export interface MatchedShapes {
  from: Subpath[];
  to: Subpath[];
}

/** The same outline, drawn from the other end. */
export function reverseSubpath(subpath: Subpath): Subpath {
  const segments = subpath.segments
    .slice()
    .reverse()
    .map((c): Cubic => ({ p0: c.p3, p1: c.p2, p2: c.p1, p3: c.p0 }));
  return { segments, closed: subpath.closed };
}

/** A closed loop started from segment `k` instead of segment 0. */
function rotateStart(subpath: Subpath, k: number): Subpath {
  if (k === 0) return subpath;
  const { segments } = subpath;
  return { segments: segments.slice(k).concat(segments.slice(0, k)), closed: subpath.closed };
}

/** The start offset for loop `b` that minimises the summed squared distance between anchors. */
function bestRotation(a: Subpath, b: Subpath): number {
  const n = a.segments.length;
  let best = 0;
  let bestCost = Infinity;
  for (let k = 0; k < n; k++) {
    let cost = 0;
    for (let i = 0; i < n && cost < bestCost; i++) {
      const p = a.segments[i]!.p0;
      const q = b.segments[(i + k) % n]!.p0;
      cost += (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = k;
    }
  }
  return best;
}

/** A subpath shaped like `like` but shrunk to the single point `at`. */
function pointLike(like: Subpath, at: Point): Subpath {
  return {
    segments: like.segments.map(() => ({ p0: at, p1: at, p2: at, p3: at })),
    closed: like.closed,
  };
}

/** The point on any of `outlines` closest to `target`, sampled finely enough for padding. */
function nearestOnOutline(outlines: readonly Subpath[], target: Point): Point {
  let best: Point = target;
  let bestDistance = Infinity;
  for (const subpath of outlines) {
    for (const c of subpath.segments) {
      for (let k = 0; k <= 8; k++) {
        const p = pointAt(c, k / 8);
        const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = p;
        }
      }
    }
  }
  return best;
}

type Pair = [Subpath | null, Subpath | null];

/**
 * Pair subpaths for the lowest total cost (Hungarian algorithm), where the cost of a pair is
 * centre distance plus half the difference in size. When one shape has more subpaths, the
 * extras are left unpaired.
 */
function pairSubpaths(a: readonly Subpath[], b: readonly Subpath[], mode: "auto" | "order"): Pair[] {
  if (mode === "order") {
    return Array.from({ length: Math.max(a.length, b.length) }, (_, i): Pair => [a[i] ?? null, b[i] ?? null]);
  }
  const describe = (s: Subpath) => {
    const box = bounds([s]);
    return { center: centroid(s), size: box ? Math.hypot(box.width, box.height) : 0 };
  };
  const fa = a.map(describe);
  const fb = b.map(describe);
  const cost = fa.map((p) => fb.map((q) => Math.hypot(p.center.x - q.center.x, p.center.y - q.center.y) + 0.5 * Math.abs(p.size - q.size)));

  const partner = hungarian(cost);
  const usedB = new Set(partner.filter((j) => j >= 0));
  const pairs: Pair[] = a.map((s, i): Pair => (partner[i]! >= 0 ? [s, b[partner[i]!]!] : [s, null]));
  b.forEach((s, j) => {
    if (!usedB.has(j)) pairs.push([null, s]);
  });
  return pairs;
}

/** Run `b` in whichever direction best follows `a`. */
function orient(a: Subpath, b: Subpath): Subpath {
  if (a.closed && b.closed) {
    const areaA = signedArea(a);
    const areaB = signedArea(b);
    // A shape with no area (a collapsed point, a flat line) has no winding to match.
    const flat = Math.abs(areaA) < 1e-9 || Math.abs(areaB) < 1e-9;
    return !flat && Math.sign(areaA) !== Math.sign(areaB) ? reverseSubpath(b) : b;
  }
  // Open paths: keep the ends close together.
  const aStart = a.segments[0]!.p0,
    aEnd = a.segments[a.segments.length - 1]!.p3;
  const bStart = b.segments[0]!.p0,
    bEnd = b.segments[b.segments.length - 1]!.p3;
  const same = Math.hypot(aStart.x - bStart.x, aStart.y - bStart.y) + Math.hypot(aEnd.x - bEnd.x, aEnd.y - bEnd.y);
  const flipped = Math.hypot(aStart.x - bEnd.x, aStart.y - bEnd.y) + Math.hypot(aEnd.x - bStart.x, aEnd.y - bStart.y);
  return flipped < same - 1e-9 ? reverseSubpath(b) : b;
}

/**
 * Match two shapes so they can be interpolated point for point.
 * Throws if either shape has nothing drawn.
 */
export function matchShapes(a: readonly Subpath[], b: readonly Subpath[], options: MatchOptions = {}): MatchedShapes {
  const shapeA = a.filter((s) => s.segments.length > 0);
  const shapeB = b.filter((s) => s.segments.length > 0);
  if (shapeA.length === 0 || shapeB.length === 0) {
    throw new Error("matchShapes: both shapes need at least one segment");
  }
  const { pairing = "auto", padding = "collapse", orient: doOrient = true, rotate = true } = options;

  const from: Subpath[] = [];
  const to: Subpath[] = [];
  for (const [pa, pb] of pairSubpaths(shapeA, shapeB, pairing)) {
    // Every pair has at least one side.
    const real = (pa ?? pb)!;
    const pad = (pool: Subpath[]) => pointLike(real, padding === "merge" ? nearestOnOutline(pool, centroid(real)) : centroid(real));
    let sa = pa ?? pad(shapeA);
    let sb = pb ?? pad(shapeB);

    if (doOrient) sb = orient(sa, sb);

    const count = Math.max(sa.segments.length, sb.segments.length);
    sa = subdivide(sa, count);
    sb = subdivide(sb, count);

    const closed = sa.closed && sb.closed;
    if (closed && rotate) sb = rotateStart(sb, bestRotation(sa, sb));

    from.push({ segments: sa.segments, closed });
    to.push({ segments: sb.segments, closed });
  }
  return { from, to };
}
