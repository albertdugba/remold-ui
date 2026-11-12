import type { Point } from "../interpolate";
import { pointAt, toCubics, type Cubic, type Subpath } from "../path/normalize";
import { parsePath } from "../path/parse";
import { checkSampleOptions, DEFAULT_COUNT, MAX_POINTS, sampleLattice, type Box, type SampleOptions } from "./lattice";

export interface PathSampleOptions extends SampleOptions {
  mode?: "fill" | "outline";
  fillRule?: "nonzero" | "evenodd";
}

type FillRule = "nonzero" | "evenodd";

interface Outline {
  polygon: Point[];
  closed: boolean;
}

interface Run {
  corners: Point[];
  walked: number[];
  closed: boolean;
  length: number;
}

const EDGE_VALUES = 4;
const STRAIGHT = 1e-9;
const MIN_PIECES = 4;
const MAX_PIECES = 64;

const isInsideCount = (winding: number, rule: FillRule) => (rule === "evenodd" ? winding % 2 !== 0 : winding !== 0);

const crossesRow = (y0: number, y1: number, y: number) => (y0 <= y && y < y1) || (y1 <= y && y < y0);

const crossingX = (edges: readonly number[], edge: number, y: number) => {
  const [x0, y0, x1, y1] = [edges[edge]!, edges[edge + 1]!, edges[edge + 2]!, edges[edge + 3]!];

  return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
};

const direction = (edges: readonly number[], edge: number) => (edges[edge + 3]! > edges[edge + 1]! ? 1 : -1);

function piecesFor(curve: Cubic): number {
  const { p0, p1, p2, p3 } = curve;
  const hull = Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y) + Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y);

  if (hull - chord < STRAIGHT * (hull + 1)) return 1;

  return Math.min(MAX_PIECES, Math.max(MIN_PIECES, Math.ceil(Math.sqrt(hull) * 2)));
}

function flatten(subpath: Subpath): Point[] {
  const along = subpath.segments.flatMap((curve) => {
    const pieces = piecesFor(curve);

    return Array.from({ length: pieces }, (_, step) => pointAt(curve, step / pieces));
  });

  const last = subpath.segments.at(-1);
  const points = last ? [...along, last.p3] : along;
  const [first, end] = [points[0], points.at(-1)];
  const repeatsStart = points.length > 1 && first && end && first.x === end.x && first.y === end.y;

  return repeatsStart ? points.slice(0, -1) : points;
}

function shoelace(polygon: readonly Point[]): number {
  const twice = polygon.reduce((total, point, index) => {
    const next = polygon[(index + 1) % polygon.length]!;

    return total + point.x * next.y - next.x * point.y;
  }, 0);

  return twice / 2;
}

function edgesOf(polygons: readonly Point[][]): number[] {
  return polygons.flatMap((polygon) =>
    polygon.flatMap((point, index) => {
      const next = polygon[(index + 1) % polygon.length]!;

      return point.y !== next.y ? [point.x, point.y, next.x, next.y] : [];
    }),
  );
}

function boxOf(polygons: readonly Point[][]): Box {
  return polygons.flat().reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      minY: Math.min(box.minY, point.y),
      maxX: Math.max(box.maxX, point.x),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function winding(edges: readonly number[], x: number, y: number, rule: FillRule): boolean {
  let total = 0;

  for (let edge = 0; edge < edges.length; edge += EDGE_VALUES) {
    if (crossesRow(edges[edge + 1]!, edges[edge + 3]!, y) && crossingX(edges, edge, y) > x) total += direction(edges, edge);
  }

  return isInsideCount(total, rule);
}

function rowCrossings(edges: readonly number[], y: number): [x: number, direction: number][] {
  const crossings: [number, number][] = [];

  for (let edge = 0; edge < edges.length; edge += EDGE_VALUES) {
    if (crossesRow(edges[edge + 1]!, edges[edge + 3]!, y)) crossings.push([crossingX(edges, edge, y), direction(edges, edge)]);
  }

  return crossings.sort((p, q) => p[0] - q[0]);
}

const pathRow = (edges: readonly number[], rule: FillRule) => (y: number, emit: (from: number, to: number) => void) => {
  const crossings = rowCrossings(edges, y);
  let total = 0;

  for (let index = 0; index < crossings.length - 1; index++) {
    total += crossings[index]![1];

    if (isInsideCount(total, rule)) emit(crossings[index]![0], crossings[index + 1]![0]);
  }
};

function toRun({ polygon, closed }: Outline): Run {
  const corners = closed ? [...polygon, polygon[0]!] : polygon;
  const walked = [0];

  for (let index = 1; index < corners.length; index++) {
    const [previous, corner] = [corners[index - 1]!, corners[index]!];

    walked.push(walked[index - 1]! + Math.hypot(corner.x - previous.x, corner.y - previous.y));
  }

  return { corners, walked, closed, length: walked.at(-1)! };
}

function shareByLength(runs: readonly Run[], count: number, total: number): number[] {
  const exact = runs.map((run) => (run.length / total) * count);
  const shares = exact.map(Math.floor);
  const spare = count - shares.reduce((sum, share) => sum + share, 0);
  const remainder = (index: number) => exact[index]! - shares[index]!;
  const byRemainder = exact.map((_, index) => index).sort((p, q) => remainder(q) - remainder(p) || p - q);

  for (const index of byRemainder.slice(0, spare)) shares[index]!++;

  return shares;
}

function positionAlong({ closed, length }: Run, step: number, count: number): number {
  if (closed) return (step * length) / count;

  return count === 1 ? length / 2 : (step * length) / (count - 1);
}

function pointsAlong(run: Run, count: number): Point[] {
  if (count === 0 || run.length === 0) return [];

  const { corners, walked } = run;
  let edge = 0;

  return Array.from({ length: count }, (_, step) => {
    const at = positionAlong(run, step, count);

    while (edge < corners.length - 2 && walked[edge + 1]! < at) edge++;

    const [start, end] = [corners[edge]!, corners[edge + 1]!];
    const span = walked[edge + 1]! - walked[edge]!;
    const t = span > 0 ? Math.min(1, Math.max(0, (at - walked[edge]!) / span)) : 0;

    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  });
}

function outlineCount(total: number, options: SampleOptions): number {
  const count = options.spacing !== undefined ? Math.max(1, Math.round(total / options.spacing)) : (options.count ?? DEFAULT_COUNT);

  if (count > MAX_POINTS) throw new RangeError(`sampling: spacing ${options.spacing} would make more than ${MAX_POINTS} points`);

  return count;
}

function alongOutlines(outlines: readonly Outline[], options: SampleOptions): Point[] {
  const runs = outlines.map(toRun);
  const total = runs.reduce((sum, run) => sum + run.length, 0);

  if (total === 0) return [];

  const shares = shareByLength(runs, outlineCount(total, options), total);

  return runs.flatMap((run, index) => pointsAlong(run, shares[index]!));
}

function fillShapes(outlines: readonly Outline[], rule: FillRule, options: SampleOptions): Point[] {
  const polygons = outlines.map((outline) => outline.polygon);
  const edges = edgesOf(polygons);

  if (edges.length === 0) return [];

  const box = boxOf(polygons);
  const enclosed = Math.abs(polygons.reduce((sum, polygon) => sum + shoelace(polygon), 0));
  const area = enclosed > 0 ? enclosed : (box.maxX - box.minX) * (box.maxY - box.minY);

  return sampleLattice({ box, area, options, row: pathRow(edges, rule), inside: (x, y) => winding(edges, x, y, rule) });
}

function checkPathOptions(mode: string, fillRule: string) {
  if (mode !== "fill" && mode !== "outline") throw new RangeError(`samplePath: mode must be "fill" or "outline", got ${mode}`);

  if (fillRule !== "nonzero" && fillRule !== "evenodd") {
    throw new RangeError(`samplePath: fillRule must be "nonzero" or "evenodd", got ${fillRule}`);
  }
}

export function samplePath(path: string | readonly Subpath[], options: PathSampleOptions = {}): Point[] {
  const subpaths = typeof path === "string" ? toCubics(parsePath(path)) : path;
  const mode = options.mode ?? "fill";
  const fillRule = options.fillRule ?? "nonzero";

  checkPathOptions(mode, fillRule);
  checkSampleOptions(options, "samplePath");

  const outlines = subpaths
    .map((subpath) => ({ polygon: flatten(subpath), closed: subpath.closed }))
    .filter((outline) => outline.polygon.length >= 2);

  return mode === "outline" ? alongOutlines(outlines, options) : fillShapes(outlines, fillRule, options);
}
