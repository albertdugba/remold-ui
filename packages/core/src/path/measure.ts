import type { Point } from "../interpolate";
import { pointAt, type Subpath } from "./normalize";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const steps = (count: number) => Array.from({ length: count }, (_, step) => step / count);

const cross = (p: Point, q: Point) => p.x * q.y - q.x * p.y;

const sum = (points: readonly Point[]): Point =>
  points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });

const EMPTY_BOX = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

const grow = (box: typeof EMPTY_BOX, point: Point) => ({
  minX: Math.min(box.minX, point.x),
  minY: Math.min(box.minY, point.y),
  maxX: Math.max(box.maxX, point.x),
  maxY: Math.max(box.maxY, point.y),
});

export function samplePoints(subpath: Subpath, perSegment = 4): Point[] {
  const along = subpath.segments.flatMap((segment) => steps(perSegment).map((t) => pointAt(segment, t)));
  const last = subpath.segments.at(-1);

  return last && !subpath.closed ? [...along, last.p3] : along;
}

/** Signed area enclosed by the outline (shoelace formula). */
export function signedArea(subpath: Subpath): number {
  const points = samplePoints(subpath);
  const twice = points.reduce((total, point, index) => total + cross(point, points[(index + 1) % points.length]!), 0);

  return twice / 2;
}

/** The average of the sampled outline points: a cheap centre for comparing positions. */
export function centroid(subpath: Subpath): Point {
  const points = samplePoints(subpath);

  if (points.length === 0) return { x: 0, y: 0 };

  const total = sum(points);

  return { x: total.x / points.length, y: total.y / points.length };
}

/** A box around every point and handle. */
export function bounds(subpaths: readonly Subpath[]): Bounds | null {
  const points = subpaths.flatMap((subpath) => subpath.segments.flatMap(({ p0, p1, p2, p3 }) => [p0, p1, p2, p3]));

  if (points.length === 0) return null;

  const { minX, minY, maxX, maxY } = points.reduce(grow, EMPTY_BOX);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
