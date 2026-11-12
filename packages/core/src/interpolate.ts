/** Linear interpolation, the smallest idea in the whole engine. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A point on a flat surface: x goes right, y goes down (the way screens count). */
export interface Point {
  x: number;
  y: number;
}

/** Halfway between two points is just halfway in x and halfway in y. */
export function lerpPoint(p: Point, q: Point, t: number): Point {
  return { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) };
}
