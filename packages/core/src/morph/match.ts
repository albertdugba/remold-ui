import type { Point } from "../interpolate";
import { pointAt, type Cubic, type Subpath } from "../path/normalize";
import { bounds, centroid, signedArea } from "../path/measure";
import { subdivide } from "../path/subdivide";
import { hungarian } from "../match/hungarian";

export interface MatchOptions {
  /** How subpaths are paired. */
  pairing?: "auto" | "order";
  /** What an unpaired subpath turns into. */
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

type Pair = [Subpath | null, Subpath | null];

interface Settings {
  padding: "collapse" | "merge";
  orient: boolean;
  rotate: boolean;
}

const FLAT_AREA = 1e-9;
const FLIP_MARGIN = 1e-9;
const OUTLINE_SAMPLES = 8;
const SIZE_WEIGHT = 0.5;

const squared = (p: Point, q: Point) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

const gap = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);

/** The same outline, drawn from the other end. */
export function reverseSubpath(subpath: Subpath): Subpath {
  const segments = subpath.segments
    .slice()
    .reverse()
    .map((curve): Cubic => ({ p0: curve.p3, p1: curve.p2, p2: curve.p1, p3: curve.p0 }));

  return { segments, closed: subpath.closed };
}

function rotateStart(subpath: Subpath, offset: number): Subpath {
  if (offset === 0) return subpath;

  const { segments } = subpath;

  return { segments: [...segments.slice(offset), ...segments.slice(0, offset)], closed: subpath.closed };
}

function rotationCost(a: Subpath, b: Subpath, offset: number, ceiling: number): number {
  const count = a.segments.length;
  let cost = 0;

  for (let index = 0; index < count && cost < ceiling; index++) {
    cost += squared(a.segments[index]!.p0, b.segments[(index + offset) % count]!.p0);
  }

  return cost;
}

function bestRotation(a: Subpath, b: Subpath): number {
  let best = 0;
  let bestCost = Infinity;

  for (let offset = 0; offset < a.segments.length; offset++) {
    const cost = rotationCost(a, b, offset, bestCost);

    if (cost < bestCost) {
      bestCost = cost;
      best = offset;
    }
  }

  return best;
}

const pointLike = (like: Subpath, at: Point): Subpath => ({
  segments: like.segments.map(() => ({ p0: at, p1: at, p2: at, p3: at })),
  closed: like.closed,
});

const outlineSamples = (outlines: readonly Subpath[]) =>
  outlines.flatMap((subpath) =>
    subpath.segments.flatMap((curve) => Array.from({ length: OUTLINE_SAMPLES + 1 }, (_, step) => pointAt(curve, step / OUTLINE_SAMPLES))),
  );

function nearestOnOutline(outlines: readonly Subpath[], target: Point): Point {
  return outlineSamples(outlines).reduce(
    (best, point) => {
      const distance = squared(point, target);

      return distance < best.distance ? { point, distance } : best;
    },
    { point: target, distance: Infinity },
  ).point;
}

function describe(subpath: Subpath) {
  const box = bounds([subpath]);

  return { centre: centroid(subpath), size: box ? Math.hypot(box.width, box.height) : 0 };
}

function pairByPlace(a: readonly Subpath[], b: readonly Subpath[]): Pair[] {
  const fromShapes = a.map(describe);
  const toShapes = b.map(describe);
  const cost = fromShapes.map((p) => toShapes.map((q) => gap(p.centre, q.centre) + SIZE_WEIGHT * Math.abs(p.size - q.size)));
  const partner = hungarian(cost);
  const used = new Set(partner.filter((index) => index >= 0));

  const fromPairs = a.map((subpath, index): Pair => [subpath, partner[index]! >= 0 ? b[partner[index]!]! : null]);
  const arriving = b.filter((_, index) => !used.has(index)).map((subpath): Pair => [null, subpath]);

  return [...fromPairs, ...arriving];
}

function pairSubpaths(a: readonly Subpath[], b: readonly Subpath[], mode: "auto" | "order"): Pair[] {
  if (mode === "auto") return pairByPlace(a, b);

  return Array.from({ length: Math.max(a.length, b.length) }, (_, index): Pair => [a[index] ?? null, b[index] ?? null]);
}

function orientClosed(a: Subpath, b: Subpath): Subpath {
  const areaA = signedArea(a);
  const areaB = signedArea(b);
  const flat = Math.abs(areaA) < FLAT_AREA || Math.abs(areaB) < FLAT_AREA;

  return !flat && Math.sign(areaA) !== Math.sign(areaB) ? reverseSubpath(b) : b;
}

function orientOpen(a: Subpath, b: Subpath): Subpath {
  const [aStart, aEnd] = [a.segments[0]!.p0, a.segments.at(-1)!.p3];
  const [bStart, bEnd] = [b.segments[0]!.p0, b.segments.at(-1)!.p3];
  const same = gap(aStart, bStart) + gap(aEnd, bEnd);
  const flipped = gap(aStart, bEnd) + gap(aEnd, bStart);

  return flipped < same - FLIP_MARGIN ? reverseSubpath(b) : b;
}

const orient = (a: Subpath, b: Subpath) => (a.closed && b.closed ? orientClosed(a, b) : orientOpen(a, b));

function padFor(real: Subpath, pool: readonly Subpath[], padding: Settings["padding"]): Subpath {
  const centre = centroid(real);

  return pointLike(real, padding === "merge" ? nearestOnOutline(pool, centre) : centre);
}

function matchPair([from, to]: Pair, shapeA: readonly Subpath[], shapeB: readonly Subpath[], settings: Settings): MatchedShapes {
  const real = (from ?? to)!;
  const a = from ?? padFor(real, shapeA, settings.padding);
  const b = to ?? padFor(real, shapeB, settings.padding);
  const oriented = settings.orient ? orient(a, b) : b;

  const count = Math.max(a.segments.length, oriented.segments.length);
  const fromSubpath = subdivide(a, count);
  const toSubpath = subdivide(oriented, count);
  const closed = fromSubpath.closed && toSubpath.closed;
  const rotated = closed && settings.rotate ? rotateStart(toSubpath, bestRotation(fromSubpath, toSubpath)) : toSubpath;

  return {
    from: [{ segments: fromSubpath.segments, closed }],
    to: [{ segments: rotated.segments, closed }],
  };
}

/** Match two shapes so they can be interpolated point for point. */
export function matchShapes(a: readonly Subpath[], b: readonly Subpath[], options: MatchOptions = {}): MatchedShapes {
  const shapeA = a.filter((subpath) => subpath.segments.length > 0);
  const shapeB = b.filter((subpath) => subpath.segments.length > 0);

  if (shapeA.length === 0 || shapeB.length === 0) {
    throw new Error("matchShapes: both shapes need at least one segment");
  }

  const { pairing = "auto", padding = "collapse", orient = true, rotate = true } = options;
  const matched = pairSubpaths(shapeA, shapeB, pairing).map((pair) => matchPair(pair, shapeA, shapeB, { padding, orient, rotate }));

  return {
    from: matched.flatMap((pair) => pair.from),
    to: matched.flatMap((pair) => pair.to),
  };
}
