/**
 * Curve subdivision.
 *
 * Splitting a cubic never changes the shape it draws; it only adds points. Two shapes can
 * morph point for point only when they have the same number of segments, so the shorter
 * one is subdivided until the counts match.
 */
import { lerpPoint } from "../interpolate";
import type { Cubic, Subpath } from "./normalize";

/**
 * Split a cubic at `t` (de Casteljau). The two halves together trace exactly the original curve,
 * and they meet at `pointAt(c, t)`.
 */
export function splitCubic(c: Cubic, t = 0.5): [Cubic, Cubic] {
  const a = lerpPoint(c.p0, c.p1, t);
  const b = lerpPoint(c.p1, c.p2, t);
  const d = lerpPoint(c.p2, c.p3, t);
  const ab = lerpPoint(a, b, t);
  const bd = lerpPoint(b, d, t);
  const mid = lerpPoint(ab, bd, t);
  return [
    { p0: c.p0, p1: a, p2: ab, p3: mid },
    { p0: mid, p1: bd, p2: d, p3: c.p3 },
  ];
}

/** Length of the control polygon: a cheap upper bound on the curve's length, used for ranking. */
function hullLength(c: Cubic): number {
  return (
    Math.hypot(c.p1.x - c.p0.x, c.p1.y - c.p0.y) +
    Math.hypot(c.p2.x - c.p1.x, c.p2.y - c.p1.y) +
    Math.hypot(c.p3.x - c.p2.x, c.p3.y - c.p2.y)
  );
}

/**
 * Return a copy of `subpath` with exactly `count` segments, made by repeatedly halving the
 * longest segment (the earliest one on ties). The shape is unchanged and the input is not
 * modified. Never removes segments: a `count` at or below the current length returns a copy.
 */
export function subdivide(subpath: Subpath, count: number): Subpath {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`subdivide: count must be a whole number, got ${count}`);
  }
  const segments = subpath.segments.slice();
  if (segments.length === 0 && count > 0) {
    throw new RangeError("subdivide: cannot subdivide a subpath with no segments");
  }

  const lengths = segments.map(hullLength);
  while (segments.length < count) {
    let longest = 0;
    for (let i = 1; i < lengths.length; i++) {
      if (lengths[i]! > lengths[longest]!) longest = i;
    }
    const [left, right] = splitCubic(segments[longest]!);
    segments.splice(longest, 1, left, right);
    lengths.splice(longest, 1, hullLength(left), hullLength(right));
  }
  return { segments, closed: subpath.closed };
}
