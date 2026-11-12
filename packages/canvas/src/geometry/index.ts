import type { Projector } from "../camera";

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Box3 {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

export type Outline = { x: number; y: number }[];

export interface Paintable {
  z: number;
  x: number;
  y: number;
  width: number;
  depth: number;
  layer?: number;
}

interface FlatBox {
  x: number;
  y: number;
  width: number;
  depth: number;
}

const QUARTER_TURN = Math.PI / 2;

function cornerArc(cx: number, cy: number, radius: number, start: number, segments: number): Outline {
  return Array.from({ length: segments + 1 }, (_, step) => {
    const angle = start + (step / segments) * QUARTER_TURN;

    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

export function roundedRect({ x, y, width, depth, radius, segments = 4 }: FlatBox & { radius: number; segments?: number }): Outline {
  const r = Math.max(0, Math.min(radius, width / 2, depth / 2));

  if (r === 0) {
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth },
      { x, y: y + depth },
    ];
  }

  const corners: [number, number, number][] = [
    [x + width - r, y + r, -Math.PI / 2],
    [x + width - r, y + depth - r, 0],
    [x + r, y + depth - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];

  return corners.flatMap(([cx, cy, start]) => cornerArc(cx, cy, r, start, segments));
}

export function ellipse({ x, y, width, depth, segments = 32 }: FlatBox & { segments?: number }): Outline {
  return Array.from({ length: segments }, (_, step) => {
    const angle = (step / segments) * Math.PI * 2;

    return { x: x + width / 2 + (width / 2) * Math.cos(angle), y: y + depth / 2 + (depth / 2) * Math.sin(angle) };
  });
}

export function projectOutline(outline: Outline, z: number, view: Projector): ScreenPoint[] {
  return outline.map((point) => view.project(point.x, point.y, z));
}

const cross = (origin: ScreenPoint, a: ScreenPoint, b: ScreenPoint) =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

function halfHull(points: readonly ScreenPoint[]): ScreenPoint[] {
  const hull: ScreenPoint[] = [];

  for (const point of points) {
    while (hull.length >= 2 && cross(hull.at(-2)!, hull.at(-1)!, point) <= 0) hull.pop();

    hull.push(point);
  }

  return hull;
}

export function convexHull(points: readonly ScreenPoint[]): ScreenPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

  if (sorted.length <= 2) return sorted;

  const lower = halfHull(sorted);
  const upper = halfHull([...sorted].reverse());

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function silhouette({ outline, z0, z1, view }: { outline: Outline; z0: number; z1: number; view: Projector }): ScreenPoint[] {
  return convexHull([...projectOutline(outline, z0, view), ...projectOutline(outline, z1, view)]);
}

const crossesRay = (point: ScreenPoint, a: ScreenPoint, b: ScreenPoint) =>
  a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

export function pointInPolygon(point: ScreenPoint, polygon: readonly ScreenPoint[]): boolean {
  return polygon.reduce((inside, corner, index) => {
    const previous = polygon[(index + polygon.length - 1) % polygon.length]!;

    return crossesRay(point, corner, previous) ? !inside : inside;
  }, false);
}

export function paintOrder<T extends Paintable>(items: readonly T[], view: Projector): T[] {
  const depth = (item: T) => view.depth(item.x + item.width / 2, item.y + item.depth / 2);

  return [...items].sort((a, b) => a.z - b.z || (a.layer ?? 0) - (b.layer ?? 0) || depth(a) - depth(b));
}

export function extent(points: Iterable<{ x: number; y: number }>): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}
