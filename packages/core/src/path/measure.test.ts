import { describe, expect, it } from "vitest";
import { reverseSubpath } from "../morph/match";
import { bounds, centroid, samplePoints, signedArea } from "./measure";
import { toCubics } from "./normalize";
import { parsePath } from "./parse";

const shape = (d: string) => toCubics(parsePath(d));
const square = shape("M0 0 H10 V10 H0 Z")[0]!;

describe("samplePoints", () => {
  it("takes evenly spaced points on each segment, and the end of an open path", () => {
    expect(samplePoints(square, 2)).toHaveLength(8);
    expect(samplePoints(shape("M0 0 L10 0")[0]!, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ]);
  });
});

describe("signedArea", () => {
  it("is positive for an outline running clockwise on screen", () => {
    expect(signedArea(square)).toBeCloseTo(100);
  });
  it("is negative when the same outline runs the other way", () => {
    expect(signedArea(reverseSubpath(square))).toBeCloseTo(-100);
  });
  it("is close to πr² for a circle made of arcs", () => {
    const circle = shape("M0 10 A10 10 0 0 1 20 10 A10 10 0 0 1 0 10 Z")[0]!;
    expect(signedArea(circle)).toBeGreaterThan(0.95 * Math.PI * 100);
  });
});

describe("centroid", () => {
  it("finds the middle of a symmetric shape", () => {
    const c = centroid(square);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });
});

describe("bounds", () => {
  it("covers every subpath", () => {
    expect(bounds(shape("M0 0 H10 V10 H0 Z M20 5 L30 25"))).toEqual({ x: 0, y: 0, width: 30, height: 25 });
  });
  it("includes the handles, so a curve is never cut off", () => {
    expect(bounds(shape("M0 0 C0 -10 10 -10 10 0"))).toEqual({ x: 0, y: -10, width: 10, height: 10 });
  });
  it("is null for nothing", () => {
    expect(bounds([])).toBeNull();
  });
});
