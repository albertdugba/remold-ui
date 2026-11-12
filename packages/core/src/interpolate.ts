export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Point {
  x: number;
  y: number;
}

export function lerpPoint(p: Point, q: Point, t: number): Point {
  return { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) };
}
