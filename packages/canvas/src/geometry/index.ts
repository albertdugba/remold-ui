/**
 * Shapes on screen: outlines, silhouettes, painting order and hit testing. Pure geometry, so it
 * runs and tests without a canvas.
 */
import type { Projector } from "../camera";

export interface ScreenPoint {
  x: number;
  y: number;
}

/** A box in the world: a footprint on the floor (x, y, width, depth) raised to z, standing height tall. */
export interface Box3 {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

/** The outline of a footprint on the floor, as points in world units, going round once. */
export type Outline = { x: number; y: number }[];

/** A rectangle with rounded corners, sampled into points (corners use `segments` each). */
export function roundedRect({
  x,
  y,
  width,
  depth,
  radius,
  segments = 4,
}: {
  x: number;
  y: number;
  width: number;
  depth: number;
  radius: number;
  segments?: number;
}): Outline {
  const r = Math.max(0, Math.min(radius, width / 2, depth / 2));
  if (r === 0)
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth },
      { x, y: y + depth },
    ];
  const corners: [number, number, number][] = [
    [x + width - r, y + r, -Math.PI / 2],
    [x + width - r, y + depth - r, 0],
    [x + r, y + depth - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  const points: Outline = [];
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= segments; k++) {
      const a = start + (k / segments) * (Math.PI / 2);
      points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  return points;
}

/** An ellipse inscribed in a footprint, sampled into points. */
export function ellipse({
  x,
  y,
  width,
  depth,
  segments = 32,
}: {
  x: number;
  y: number;
  width: number;
  depth: number;
  segments?: number;
}): Outline {
  const points: Outline = [];
  for (let k = 0; k < segments; k++) {
    const a = (k / segments) * Math.PI * 2;
    points.push({ x: x + width / 2 + (width / 2) * Math.cos(a), y: y + depth / 2 + (depth / 2) * Math.sin(a) });
  }
  return points;
}

/** Project an outline lying on the floor at height `z`. */
export function projectOutline(outline: Outline, z: number, view: Projector): ScreenPoint[] {
  return outline.map((p) => view.project(p.x, p.y, z));
}

/** The smallest convex shape around `points` (Andrew's monotone chain), anticlockwise. */
export function convexHull(points: readonly ScreenPoint[]): ScreenPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 2) return sorted;
  const cross = (o: ScreenPoint, a: ScreenPoint, b: ScreenPoint) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: ScreenPoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: ScreenPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/**
 * The on-screen silhouette of an outline extruded from z0 up to z1. For a convex outline this is
 * exactly the hull of its top and bottom faces, which is what the sides fill and what a pointer hits.
 */
export function silhouette({ outline, z0, z1, view }: { outline: Outline; z0: number; z1: number; view: Projector }): ScreenPoint[] {
  return convexHull([...projectOutline(outline, z0, view), ...projectOutline(outline, z1, view)]);
}

/** Whether a point is inside a polygon (even–odd rule). */
export function pointInPolygon(point: ScreenPoint, polygon: readonly ScreenPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export interface Paintable {
  /** The bottom of the object. */
  z: number;
  /** Its floor position, for depth. */
  x: number;
  y: number;
  width: number;
  depth: number;
  /** Drawn after everything at the same height (labels, small overlays). Default 0. */
  layer?: number;
}

/**
 * Painting order, far to near: lower things first (a shelf before what stands on it), then
 * things further from the viewer. Draw in this order and nearer objects cover farther ones.
 */
export function paintOrder<T extends Paintable>(items: readonly T[], view: Projector): T[] {
  const depth = (t: T) => view.depth(t.x + t.width / 2, t.y + t.depth / 2);
  return [...items].sort((a, b) => a.z - b.z || (a.layer ?? 0) - (b.layer ?? 0) || depth(a) - depth(b));
}
