import type { Point } from "../interpolate";

export interface FitOptions {
  padding?: number;
  mode?: "contain" | "none";
  from?: { x?: number; y?: number; width: number; height: number };
}

export interface ClusterOptions {
  x: number;
  y: number;
  radius?: number;
}

interface Frame {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEFAULT_RADIUS = 6;

function givenFrame(from: NonNullable<FitOptions["from"]>): Frame {
  const { x = 0, y = 0, width, height } = from;

  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
    throw new RangeError(`fitPoints: from must be a finite box with a size of 0 or more, got ${JSON.stringify(from)}`);
  }

  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

const boundsOf = (points: readonly Point[]): Frame =>
  points.reduce(
    (frame, point) => ({
      minX: Math.min(frame.minX, point.x),
      minY: Math.min(frame.minY, point.y),
      maxX: Math.max(frame.maxX, point.x),
      maxY: Math.max(frame.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

function scaleFor(frame: Frame, box: { width: number; height: number }, padding: number, mode: FitOptions["mode"]): number {
  const width = frame.maxX - frame.minX;
  const height = frame.maxY - frame.minY;
  const room = { width: Math.max(0, box.width - 2 * padding), height: Math.max(0, box.height - 2 * padding) };
  const fit = Math.min(width > 0 ? room.width / width : Infinity, height > 0 ? room.height / height : Infinity);

  return mode === "none" || !Number.isFinite(fit) ? 1 : fit;
}

export function fitPoints<T extends Point>(
  points: readonly T[],
  box: { x: number; y: number; width: number; height: number },
  options: FitOptions = {},
): T[] {
  if (points.length === 0) return [];

  const frame = options.from ? givenFrame(options.from) : boundsOf(points);
  const scale = scaleFor(frame, box, options.padding ?? 0, options.mode ?? "contain");
  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;
  const middleX = (frame.minX + frame.maxX) / 2;
  const middleY = (frame.minY + frame.maxY) / 2;

  return points.map((point) => ({ ...point, x: centreX + (point.x - middleX) * scale, y: centreY + (point.y - middleY) * scale }));
}

export function clusterPoints<T extends Point>(points: readonly T[], options: ClusterOptions): T[] {
  const radius = options.radius ?? DEFAULT_RADIUS;

  if (![options.x, options.y, radius].every(Number.isFinite) || radius < 0) {
    throw new RangeError(`clusterPoints: x, y and radius must be finite, and radius 0 or more, got ${JSON.stringify(options)}`);
  }

  return points.map((point, index) => {
    const distance = radius * Math.sqrt((index + 0.5) / points.length);

    return { ...point, x: options.x + Math.cos(index * GOLDEN_ANGLE) * distance, y: options.y + Math.sin(index * GOLDEN_ANGLE) * distance };
  });
}
