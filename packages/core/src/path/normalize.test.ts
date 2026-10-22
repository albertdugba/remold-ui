import { describe, expect, it } from "vitest";
import { parsePath } from "./parse";
import { arcToCubics, lineToCubic, pointAt, quadToCubic, toCubics, type Cubic } from "./normalize";

const near = (c: Cubic, t: number, x: number, y: number) => {
  const p = pointAt(c, t);
  expect(p.x).toBeCloseTo(x, 2);
  expect(p.y).toBeCloseTo(y, 2);
};

describe("pointAt", () => {
  it("starts at p0, ends at p3, and is pulled towards the handles in between", () => {
    const c = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 10 }, p2: { x: 10, y: 10 }, p3: { x: 10, y: 0 } };
    expect(pointAt(c, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAt(c, 1)).toEqual({ x: 10, y: 0 });
    expect(pointAt(c, 0.5)).toEqual({ x: 5, y: 7.5 });
  });
});

describe("lineToCubic", () => {
  it("puts the handles a third and two thirds of the way along", () => {
    expect(lineToCubic({ x: 0, y: 0 }, { x: 3, y: 6 })).toEqual({
      p0: { x: 0, y: 0 },
      p1: { x: 1, y: 2 },
      p2: { x: 2, y: 4 },
      p3: { x: 3, y: 6 },
    });
  });
  it("stays a straight line all the way", () => {
    const c = lineToCubic({ x: 0, y: 0 }, { x: 30, y: 60 });
    near(c, 0.25, 7.5, 15);
    near(c, 0.7, 21, 42);
  });
});

describe("quadToCubic", () => {
  it("moves each handle two thirds of the way towards the quadratic's handle", () => {
    expect(quadToCubic({ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 0 })).toEqual({
      p0: { x: 0, y: 0 },
      p1: { x: 2, y: 2 },
      p2: { x: 4, y: 2 },
      p3: { x: 6, y: 0 },
    });
  });
});

describe("arcToCubics", () => {
  const circle = { rx: 10, ry: 10, rotation: 0, largeArc: false, sweep: true };

  it("cuts a half circle into two quarter turns", () => {
    const segs = arcToCubics({ x: 0, y: 0 }, circle, { x: 20, y: 0 });
    expect(segs).toHaveLength(2);
    expect(segs[0]!.p0).toEqual({ x: 0, y: 0 });
    expect(segs[1]!.p3).toEqual({ x: 20, y: 0 });
    // sweep = 1 turns clockwise on screen (y goes down), so the top of the circle comes first.
    near(segs[0]!, 1, 10, -10);
  });
  it("stays on the circle in between", () => {
    for (const c of arcToCubics({ x: 0, y: 0 }, circle, { x: 20, y: 0 })) {
      const p = pointAt(c, 0.5);
      expect(Math.hypot(p.x - 10, p.y)).toBeCloseTo(10, 2);
    }
  });
  it("sweep = 0 goes the other way round", () => {
    const segs = arcToCubics({ x: 0, y: 0 }, { ...circle, sweep: false }, { x: 20, y: 0 });
    near(segs[0]!, 1, 10, 10);
  });
  it("grows a radius that is too small to reach", () => {
    const segs = arcToCubics({ x: 0, y: 0 }, { ...circle, rx: 1, ry: 1 }, { x: 20, y: 0 });
    expect(segs).toHaveLength(2);
    near(segs[0]!, 1, 10, -10);
  });
  it("treats a zero radius as a line and a zero-length arc as nothing", () => {
    expect(arcToCubics({ x: 0, y: 0 }, { ...circle, rx: 0 }, { x: 3, y: 6 })).toEqual([lineToCubic({ x: 0, y: 0 }, { x: 3, y: 6 })]);
    expect(arcToCubics({ x: 5, y: 5 }, circle, { x: 5, y: 5 })).toEqual([]);
  });
});

describe("toCubics", () => {
  it("turns every piece into a cubic that starts where the last one ended", () => {
    const [sub] = toCubics(parsePath("M0 0 L10 0 Q20 0 20 10 C20 20 10 20 10 20"));
    expect(sub!.segments).toHaveLength(3);
    expect(sub!.segments.map((c) => c.p0)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
  });
  it("Z adds the closing edge and marks the subpath closed", () => {
    const [sub] = toCubics(parsePath("M0 0 L10 0 L10 10 Z"));
    expect(sub!.closed).toBe(true);
    expect(sub!.segments).toHaveLength(3);
    expect(sub!.segments[2]!.p3).toEqual({ x: 0, y: 0 });
  });
  it("Z adds nothing when the pen is already home", () => {
    const [sub] = toCubics(parsePath("M0 0 L10 0 L0 0 Z"));
    expect(sub!.segments).toHaveLength(2);
    expect(sub!.closed).toBe(true);
  });
  it("Z ignores rounding error from relative coordinates", () => {
    // 0.1 + 0.1 - 0.1 is not exactly 0.1 in floating point.
    const [sub] = toCubics(parsePath("m0.1 0.2 l0.1 0 l0 0.1 l-0.1 -0.1 z"));
    expect(sub!.segments).toHaveLength(3);
  });
  it("drops subpaths with nothing drawn", () => {
    expect(toCubics(parsePath("M0 0 Z M5 5"))).toEqual([]);
  });
  it("each M starts a new subpath", () => {
    const subs = toCubics(parsePath("M0 0 L1 0 M5 5 L6 5 Z"));
    expect(subs).toHaveLength(2);
    expect(subs.map((s) => s.closed)).toEqual([false, true]);
  });
  it("draws a whole circle from two arcs", () => {
    const [sub] = toCubics(parsePath("M0 10 A10 10 0 0 1 20 10 A10 10 0 0 1 0 10 Z"));
    expect(sub!.segments).toHaveLength(4);
    expect(sub!.closed).toBe(true);
  });
});
