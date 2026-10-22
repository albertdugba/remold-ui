/**
 * Linear interpolation, the smallest idea in the whole engine.
 *
 * "Lerp" means linear interpolation: finding a value part of the way between two others.
 * t is how far along we are: 0 means "at the start", 1 means "at the end", 0.5 means "halfway".
 *
 *   lerp(10, 20, 0)   → 10
 *   lerp(10, 20, 0.5) → 15
 *   lerp(10, 20, 1)   → 20
 *
 * Every animation frame the engine ever draws is this, done to thousands of numbers at once.
 */
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
