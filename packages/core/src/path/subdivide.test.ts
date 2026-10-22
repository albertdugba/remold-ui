import { describe, expect, it } from "vitest";
import { lineToCubic, pointAt, toCubics, type Cubic } from "./normalize";
import { parsePath } from "./parse";
import { splitCubic, subdivide } from "./subdivide";

const arch: Cubic = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 10 }, p2: { x: 10, y: 10 }, p3: { x: 10, y: 0 } };

const expectNear = (p: { x: number; y: number }, q: { x: number; y: number }) => {
  expect(p.x).toBeCloseTo(q.x, 9);
  expect(p.y).toBeCloseTo(q.y, 9);
};

describe("splitCubic", () => {
  it("splits in the middle by default, meeting at the curve's midpoint", () => {
    const [left, right] = splitCubic(arch);
    expect(left).toEqual({ p0: { x: 0, y: 0 }, p1: { x: 0, y: 5 }, p2: { x: 2.5, y: 7.5 }, p3: { x: 5, y: 7.5 } });
    expect(right).toEqual({ p0: { x: 5, y: 7.5 }, p1: { x: 7.5, y: 7.5 }, p2: { x: 10, y: 5 }, p3: { x: 10, y: 0 } });
  });
  it("meets at pointAt(t) for any t", () => {
    const [left, right] = splitCubic(arch, 0.3);
    expect(left.p3).toEqual(right.p0);
    expectNear(left.p3, pointAt(arch, 0.3));
  });
  it("does not change the shape: each half retraces its part of the original", () => {
    const t = 0.3;
    const [left, right] = splitCubic(arch, t);
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      expectNear(pointAt(left, s), pointAt(arch, s * t));
      expectNear(pointAt(right, s), pointAt(arch, t + s * (1 - t)));
    }
  });
});

describe("subdivide", () => {
  const square = toCubics(parsePath("M0 0 H10 V10 H0 Z"))[0]!;

  it("adds segments until the count is reached", () => {
    expect(subdivide(square, 7).segments).toHaveLength(7);
  });
  it("keeps the segments joined end to end, and keeps closed", () => {
    const sub = subdivide(square, 9);
    sub.segments.slice(1).forEach((c, i) => expect(c.p0).toEqual(sub.segments[i]!.p3));
    expect(sub.closed).toBe(true);
  });
  it("halves the longest segment first", () => {
    const sub = { segments: [lineToCubic({ x: 0, y: 0 }, { x: 2, y: 0 }), lineToCubic({ x: 2, y: 0 }, { x: 10, y: 0 })], closed: false };
    expect(subdivide(sub, 3).segments.map((c) => c.p3.x)).toEqual([2, 6, 10]);
  });
  it("breaks ties by taking the earliest segment, so results are repeatable", () => {
    expect(subdivide(square, 5).segments[1]!.p0).toEqual({ x: 5, y: 0 });
  });
  it("does not modify its input", () => {
    subdivide(square, 8);
    expect(square.segments).toHaveLength(4);
  });
  it("never removes segments", () => {
    expect(subdivide(square, 2).segments).toHaveLength(4);
  });
  it("rejects counts that make no sense", () => {
    expect(() => subdivide(square, 2.5)).toThrow(RangeError);
    expect(() => subdivide(square, -1)).toThrow(RangeError);
    expect(() => subdivide({ segments: [], closed: false }, 3)).toThrow(/no segments/);
  });
});
