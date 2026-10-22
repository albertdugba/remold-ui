/**
 * Measurements of subpaths: winding, centre and bounds.
 *
 * These are estimates from points sampled along the outline. They are used to decide how
 * shapes pair up and which way they run, where speed matters more than exactness.
 */
import type { Point } from "../interpolate";
import { pointAt, type Subpath } from "./normalize";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Points along the outline: `perSegment` evenly spaced in t on every segment, plus the end. */
export function samplePoints(subpath: Subpath, perSegment = 4): Point[] {
  const points: Point[] = [];
  for (const c of subpath.segments) {
    for (let k = 0; k < perSegment; k++) points.push(pointAt(c, k / perSegment));
  }
  const last = subpath.segments[subpath.segments.length - 1];
  if (last && !subpath.closed) points.push(last.p3);
  return points;
}

/**
 * Signed area enclosed by the outline (shoelace formula). Positive means the outline runs
 * clockwise on screen, where y points down; negative means anticlockwise.
 */
export function signedArea(subpath: Subpath): number {
  const points = samplePoints(subpath);
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

/** The average of the sampled outline points: a cheap centre for comparing positions. */
export function centroid(subpath: Subpath): Point {
  const points = samplePoints(subpath);
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0,
    y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/**
 * A box around every point and handle. The curve always lies inside its handles, so this
 * never cuts the shape off, though it can be larger than the drawn shape. `null` when empty.
 */
export function bounds(subpaths: readonly Subpath[]): Bounds | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const subpath of subpaths) {
    for (const c of subpath.segments) {
      for (const p of [c.p0, c.p1, c.p2, c.p3]) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
