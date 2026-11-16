export interface Point {
  x: number;
  y: number;
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export function pathLength(points: readonly Point[]): number {
  return points.slice(1).reduce((total, point, index) => total + distance(points[index]!, point), 0);
}

export function pointAlong(points: readonly Point[], progress: number): Point {
  const first = points[0];

  if (!first) return { x: 0, y: 0 };

  let remaining = pathLength(points) * Math.max(0, Math.min(1, progress));

  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const step = distance(from, to);

    if (remaining <= step && step > 0) {
      const share = remaining / step;

      return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
    }

    remaining -= step;
  }

  return { ...points[points.length - 1]! };
}

export const easeInOut = (amount: number) => (amount < 0.5 ? 4 * amount ** 3 : 1 - (-2 * amount + 2) ** 3 / 2);

/** Out and back: 0 → 0.5 → 0 as `amount` goes 0 → 1, slowing at the turn. */
export const outAndBack = (amount: number) => 0.5 * Math.sin(Math.PI * Math.max(0, Math.min(1, amount)));
