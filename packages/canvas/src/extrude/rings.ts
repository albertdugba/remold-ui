import { parsePath, pointAt, toCubics, type Subpath } from "@remold-ui/core";
import { ellipse, extent, roundedRect, type Box3, type Outline } from "../geometry";

export type ExtrudeShape = "rect" | "ellipse" | { path: string };

export interface Rings {
  outer: Outline;
  holes: Outline[];
}

type FlatBox = Pick<Box3, "x" | "y" | "width" | "depth">;

const STRAIGHT = 1e-3;
const CACHE_LIMIT = 256;
const SAMPLES_PER_SEGMENT = 6;
const UNIT_PATH_SCALE = 100;

const pathCache = new Map<string, Rings>();

export function outlineArea(outline: Outline): number {
  return outline.reduce((sum, point, index) => {
    const previous = outline[(index + outline.length - 1) % outline.length]!;

    return sum + (previous.x * point.y - point.x * previous.y);
  }, 0);
}

function inside(point: { x: number; y: number }, outline: Outline): boolean {
  return outline.reduce((hit, a, index) => {
    const b = outline[(index + outline.length - 1) % outline.length]!;
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

    return crosses ? !hit : hit;
  }, false);
}

function isStraight(curve: Subpath["segments"][number]): boolean {
  const dx = curve.p3.x - curve.p0.x;
  const dy = curve.p3.y - curve.p0.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = (point: { x: number; y: number }) => Math.abs((point.x - curve.p0.x) * dy - (point.y - curve.p0.y) * dx) / length;

  return offset(curve.p1) <= STRAIGHT && offset(curve.p2) <= STRAIGHT;
}

function sample(subpath: Subpath, perSegment: number): Outline {
  return subpath.segments.flatMap((curve) =>
    isStraight(curve) ? [curve.p0] : Array.from({ length: perSegment }, (_, step) => pointAt(curve, step / perSegment)),
  );
}

function normalised(outlines: Outline[]): Outline[] {
  const { minX, minY, maxX, maxY } = extent(outlines.flat());
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  return outlines.map((outline) => outline.map((point) => ({ x: (point.x - minX) / width, y: (point.y - minY) / height })));
}

export function unitRings(path: string): Rings {
  const cached = pathCache.get(path);

  if (cached) return cached;

  if (pathCache.size >= CACHE_LIMIT) pathCache.clear();

  const outlines = toCubics(parsePath(path))
    .map((subpath) => sample(subpath, SAMPLES_PER_SEGMENT))
    .filter((outline) => outline.length >= 3);

  if (outlines.length === 0) throw new Error(`extrude: the path has no closed shape to extrude: "${path.slice(0, 40)}"`);

  const unit = normalised(outlines).sort((a, b) => Math.abs(outlineArea(b)) - Math.abs(outlineArea(a)));
  const [outer, ...rest] = unit;
  const rings = { outer: outer!, holes: rest.filter((outline) => inside(outline[0]!, outer!)) };

  pathCache.set(path, rings);

  return rings;
}

const toPath = (rings: Rings, scale: number) =>
  [rings.outer, ...rings.holes]
    .map((outline) => `M${outline.map((point) => `${(point.x * scale).toFixed(2)} ${(point.y * scale).toFixed(2)}`).join("L")}Z`)
    .join("");

export function shapeRings(shape: ExtrudeShape, box: FlatBox, radius = 0.14): Rings {
  if (shape === "rect") {
    const corner = Math.min(box.width, box.depth) * radius;

    return { outer: roundedRect({ x: box.x, y: box.y, width: box.width, depth: box.depth, radius: corner, segments: 6 }), holes: [] };
  }

  if (shape === "ellipse") return { outer: ellipse({ x: box.x, y: box.y, width: box.width, depth: box.depth, segments: 48 }), holes: [] };

  const unit = unitRings(shape.path);
  const place = (outline: Outline) => outline.map((point) => ({ x: box.x + point.x * box.width, y: box.y + point.y * box.depth }));

  return { outer: place(unit.outer), holes: unit.holes.map(place) };
}

export function unitPath(shape: ExtrudeShape, radius = 0.14): string {
  if (shape === "rect" || shape === "ellipse") return toPath(shapeRings(shape, { x: 0, y: 0, width: 1, depth: 1 }, radius), UNIT_PATH_SCALE);

  return toPath(unitRings(shape.path), UNIT_PATH_SCALE);
}

export function insetRing(outline: Outline, box: FlatBox, fraction: number): Outline {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.depth / 2;
  const inset = Math.min(box.width, box.depth) * fraction;
  const scaleX = Math.max(0, (box.width - inset * 2) / box.width);
  const scaleY = Math.max(0, (box.depth - inset * 2) / box.depth);

  return outline.map((point) => ({ x: cx + (point.x - cx) * scaleX, y: cy + (point.y - cy) * scaleY }));
}
