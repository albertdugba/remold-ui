import { describe, expect, it } from "vitest";
import type { Point } from "../interpolate";
import { fitPoints, sampleMask, samplePath } from "./sampling";

const SQUARE = "M0 0 H100 V100 H0 Z";
/** A circle of radius 50 round (50, 50), from two arcs. */
const CIRCLE = "M0 50 A50 50 0 1 1 100 50 A50 50 0 1 1 0 50 Z";

/** The smallest gap between any two points. */
function closest(points: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) best = Math.min(best, Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y));
  }
  return best;
}

const within = (p: Point, minX: number, minY: number, maxX: number, maxY: number) =>
  p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

describe("samplePath", () => {
  it("gives exactly the count asked for, all inside", () => {
    for (const count of [1, 7, 100, 999]) {
      const points = samplePath(SQUARE, { count });
      expect(points).toHaveLength(count);
      expect(points.every((p) => within(p, 0, 0, 100, 100))).toBe(true);
    }
  });

  it("lays a plain grid at a given spacing", () => {
    const points = samplePath(SQUARE, { spacing: 10, pattern: "grid" });
    expect(points).toHaveLength(100);
    expect(points[0]).toEqual({ x: 5, y: 5 });
    expect(points.at(-1)).toEqual({ x: 95, y: 95 });
  });

  it("keeps points evenly apart", () => {
    // Staggered rows at spacing s: every neighbour is exactly s away.
    const points = samplePath(SQUARE, { spacing: 10 });
    expect(closest(points)).toBeCloseTo(10, 6);
    // Asking for a count thins a few extras out, which never brings points closer.
    const counted = samplePath(CIRCLE, { count: 300 });
    const spacing = Math.sqrt((Math.PI * 50 * 50) / (300 * (Math.sqrt(3) / 2)));
    expect(closest(counted)).toBeGreaterThan(spacing * 0.85);
  });

  it("follows curves", () => {
    const points = samplePath(CIRCLE, { count: 500 });
    expect(points).toHaveLength(500);
    for (const p of points) expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThan(50.01);
    // And fills it: something near the middle and something near the rim.
    expect(points.some((p) => Math.hypot(p.x - 50, p.y - 50) < 5)).toBe(true);
    expect(points.some((p) => Math.hypot(p.x - 50, p.y - 50) > 45)).toBe(true);
  });

  it("respects holes and the fill rule", () => {
    const sameWay = `${SQUARE} M30 30 H70 V70 H30 Z`;
    const otherWay = `${SQUARE} M30 30 V70 H70 V30 Z`;
    const inHole = (p: Point) => within(p, 30, 30, 70, 70);
    // Even-odd: the inner square is a hole whichever way it runs.
    expect(samplePath(sameWay, { count: 400, fillRule: "evenodd" }).some(inHole)).toBe(false);
    // Nonzero: a hole only when it runs the other way.
    expect(samplePath(otherWay, { count: 400 }).some(inHole)).toBe(false);
    expect(samplePath(sameWay, { count: 400 }).some(inHole)).toBe(true);
  });

  it("fills shapes whose loops cancel out, like a figure eight", () => {
    // Two squares wound opposite ways have a total signed area of zero.
    const eight = "M0 0 H50 V50 H0 Z M60 0 V50 H110 V0 Z";
    const points = samplePath(eight, { count: 200 });
    expect(points).toHaveLength(200);
    expect(points.some((p) => p.x < 50)).toBe(true);
    expect(points.some((p) => p.x > 60)).toBe(true);
  });

  it("fills a self-crossing bowtie", () => {
    const points = samplePath("M0 0 L100 100 L100 0 L0 100 Z", { count: 120 });
    expect(points).toHaveLength(120);
    expect(points.some((p) => p.x < 40)).toBe(true);
    expect(points.some((p) => p.x > 60)).toBe(true);
  });

  it("fills open paths as if closed, as SVG does", () => {
    expect(samplePath("M0 0 H100 V100 H0", { count: 50 })).toHaveLength(50);
  });

  it("gives nothing for shapes with no inside", () => {
    expect(samplePath("", { count: 10 })).toEqual([]);
    expect(samplePath("M0 0 L100 100", { count: 10 })).toEqual([]);
    expect(samplePath(SQUARE, { count: 0 })).toEqual([]);
  });

  it("fits a count into very thin shapes", () => {
    const points = samplePath("M0 0 H1000 V2 H0 Z", { count: 50 });
    expect(points).toHaveLength(50);
    expect(points.every((p) => within(p, 0, 0, 1000, 2))).toBe(true);
  });

  it("jitters the same way for the same seed, and stays inside", () => {
    const a = samplePath(CIRCLE, { count: 200, jitter: 0.8, seed: 4 });
    const b = samplePath(CIRCLE, { count: 200, jitter: 0.8, seed: 4 });
    const c = samplePath(CIRCLE, { count: 200, jitter: 0.8, seed: 5 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(200);
    for (const p of a) expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThan(50.01);
  });

  describe("outline", () => {
    it("spaces points evenly round a closed shape", () => {
      const points = samplePath(SQUARE, { mode: "outline", count: 40 });
      expect(points).toHaveLength(40);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      for (let i = 0; i < points.length; i++) {
        const p = points[i]!;
        const q = points[(i + 1) % points.length]!;
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(10, 6);
        // Every point is on an edge.
        expect(Math.min(p.x, 100 - p.x, p.y, 100 - p.y)).toBeCloseTo(0, 6);
      }
    });

    it("runs an open line from end to end", () => {
      const points = samplePath("M0 0 H90", { mode: "outline", count: 10 });
      expect(points.map((p) => p.x)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
      expect(samplePath("M0 0 H90", { mode: "outline", count: 1 })).toEqual([{ x: 45, y: 0 }]);
    });

    it("shares points between outlines by length", () => {
      // 400 round the big square, 160 round the small one: 50 points split 5 : 2.
      const points = samplePath(`${SQUARE} M200 0 H240 V40 H200 Z`, { mode: "outline", count: 70 });
      expect(points.filter((p) => p.x <= 100)).toHaveLength(50);
      expect(points.filter((p) => p.x >= 200)).toHaveLength(20);
    });

    it("takes a spacing too", () => {
      expect(samplePath(SQUARE, { mode: "outline", spacing: 25 })).toHaveLength(16);
    });
  });

  it("rejects bad options with clear messages", () => {
    expect(() => samplePath(SQUARE, { count: -1 })).toThrow(/count/);
    expect(() => samplePath(SQUARE, { count: 1.5 })).toThrow(/count/);
    expect(() => samplePath(SQUARE, { spacing: 0 })).toThrow(/spacing/);
    expect(() => samplePath(SQUARE, { jitter: 2 })).toThrow(/jitter/);
    expect(() => samplePath(SQUARE, { pattern: "dots" as "hex" })).toThrow(/pattern/);
    expect(() => samplePath(SQUARE, { mode: "edge" as "fill" })).toThrow(/mode/);
    expect(() => samplePath(SQUARE, { fillRule: "odd" as "evenodd" })).toThrow(/fillRule/);
    expect(() => samplePath(SQUARE, { spacing: 0.01 })).toThrow(/more than/);
    expect(() => samplePath("M0 0 X", { count: 1 })).toThrow(/Invalid path data/);
  });
});

describe("sampleMask", () => {
  /** A width × height mask with a filled disc. */
  function disc(width: number, height: number, radius: number, channels: 1 | 4 = 1) {
    const data = new Uint8ClampedArray(width * height * channels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const on = Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2) < radius ? 255 : 0;
        data[(y * width + x) * channels + channels - 1] = on;
      }
    }
    return { width, height, data };
  }

  it("fills the filled pixels with exactly the count asked for", () => {
    const points = sampleMask(disc(100, 80, 30), { count: 250 });
    expect(points).toHaveLength(250);
    for (const p of points) expect(Math.hypot(p.x - 50, p.y - 40)).toBeLessThan(31.5);
    const spacing = Math.sqrt((Math.PI * 30 * 30) / (250 * (Math.sqrt(3) / 2)));
    expect(closest(points)).toBeGreaterThan(spacing * 0.85);
  });

  it("reads alpha from RGBA data, like ImageData", () => {
    expect(sampleMask(disc(60, 60, 20, 4), { count: 50 })).toEqual(sampleMask(disc(60, 60, 20, 1), { count: 50 }));
  });

  it("reads float data as 0 to 1, and takes a threshold", () => {
    const data = new Float32Array(10 * 10).fill(0.3);
    expect(sampleMask({ width: 10, height: 10, data }, { count: 5 })).toEqual([]);
    expect(sampleMask({ width: 10, height: 10, data }, { count: 5, threshold: 0.2 })).toHaveLength(5);
  });

  it("handles empty masks and rejects the wrong amount of data", () => {
    expect(sampleMask({ width: 0, height: 0, data: [] })).toEqual([]);
    expect(sampleMask({ width: 4, height: 4, data: new Uint8Array(16) })).toEqual([]);
    expect(() => sampleMask({ width: 4, height: 4, data: new Uint8Array(15) })).toThrow(/needs 16 values/);
    expect(() => sampleMask({ width: 1.5, height: 4, data: [] })).toThrow(/whole numbers/);
  });
});

describe("fitPoints", () => {
  it("scales points to fit a box, keeping proportions, centred", () => {
    const fitted = fitPoints(
      [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ],
      { x: 0, y: 0, width: 100, height: 100 },
    );
    expect(fitted).toEqual([
      { x: 0, y: 25 },
      { x: 100, y: 75 },
    ]);
  });

  it("leaves padding, and only centres with mode none", () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    expect(
      fitPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        box,
        { padding: 10 },
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 90 },
    ]);
    expect(
      fitPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        box,
        { mode: "none" },
      ),
    ).toEqual([
      { x: 45, y: 45 },
      { x: 55, y: 55 },
    ]);
  });

  it("centres a single point and handles none", () => {
    expect(fitPoints([{ x: 7, y: 7 }], { x: 0, y: 0, width: 20, height: 10 })).toEqual([{ x: 10, y: 5 }]);
    expect(fitPoints([], { x: 0, y: 0, width: 20, height: 10 })).toEqual([]);
  });
});
