import { lerpPoint } from "../interpolate";
import type { Cubic, Subpath } from "./normalize";

export function splitCubic(curve: Cubic, t = 0.5): [Cubic, Cubic] {
  const first = lerpPoint(curve.p0, curve.p1, t);
  const middle = lerpPoint(curve.p1, curve.p2, t);
  const last = lerpPoint(curve.p2, curve.p3, t);
  const left = lerpPoint(first, middle, t);
  const right = lerpPoint(middle, last, t);
  const split = lerpPoint(left, right, t);

  return [
    { p0: curve.p0, p1: first, p2: left, p3: split },
    { p0: split, p1: right, p2: last, p3: curve.p3 },
  ];
}

const hullLength = ({ p0, p1, p2, p3 }: Cubic) =>
  Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y) + Math.hypot(p3.x - p2.x, p3.y - p2.y);

const indexOfLongest = (lengths: readonly number[]) =>
  lengths.reduce((longest, length, index) => (length > lengths[longest]! ? index : longest), 0);

export function subdivide(subpath: Subpath, count: number): Subpath {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`subdivide: count must be a whole number, got ${count}`);
  }

  if (subpath.segments.length === 0 && count > 0) {
    throw new RangeError("subdivide: cannot subdivide a subpath with no segments");
  }

  const segments = subpath.segments.slice();
  const lengths = segments.map(hullLength);

  while (segments.length < count) {
    const longest = indexOfLongest(lengths);
    const [left, right] = splitCubic(segments[longest]!);

    segments.splice(longest, 1, left, right);
    lengths.splice(longest, 1, hullLength(left), hullLength(right));
  }

  return { segments, closed: subpath.closed };
}
