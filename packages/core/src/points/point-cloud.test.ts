import { describe, expect, it } from "vitest";
import type { Point } from "../interpolate";
import { matchPoints } from "../match/points";
import { pointCloud, STRIDE } from "./point-cloud";

/** The cloud's points as { x, y, size }. */
const read = (cloud: ReturnType<typeof pointCloud>) =>
  Array.from({ length: cloud.length }, (_, i) => ({
    x: cloud.data[i * STRIDE]!,
    y: cloud.data[i * STRIDE + 1]!,
    size: cloud.data[i * STRIDE + 2]!,
  }));
const tones = (cloud: ReturnType<typeof pointCloud>) => Array.from({ length: cloud.length }, (_, i) => cloud.data[i * STRIDE + 3]!);

function settle(cloud: ReturnType<typeof pointCloud>) {
  for (let n = 0; cloud.step(1 / 60); n++) if (n > 2000) throw new Error("never settled");
}

const row = (n: number, y = 0, gap = 10): Point[] => Array.from({ length: n }, (_, i) => ({ x: i * gap, y }));

describe("pointCloud", () => {
  it("starts at rest, full size", () => {
    const cloud = pointCloud(row(3));
    expect(cloud.length).toBe(3);
    expect(cloud.live).toBe(3);
    expect(cloud.settled).toBe(true);
    expect(read(cloud)).toEqual([0, 10, 20].map((x) => ({ x, y: 0, size: 1 })));
  });

  it("moves every point to its nearest new spot", () => {
    const cloud = pointCloud(row(3));
    const { pairs } = cloud.to(row(3, 50));
    expect(pairs).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    expect(cloud.settled).toBe(false);
    settle(cloud);
    expect(read(cloud)).toEqual([0, 10, 20].map((x) => ({ x, y: 50, size: 1 })));
  });

  it("shrinks spare points away, then forgets them", () => {
    const cloud = pointCloud(row(4));
    cloud.to(row(2));
    expect(cloud.live).toBe(2);
    expect(cloud.length).toBe(4);
    settle(cloud);
    expect(cloud.length).toBe(2);
    expect(read(cloud)).toEqual([
      { x: 0, y: 0, size: 1 },
      { x: 10, y: 0, size: 1 },
    ]);
  });

  it("grows new points in from just below where they land", () => {
    const cloud = pointCloud(row(1), { enter: { y: 20 } });
    cloud.to(row(2));
    expect(read(cloud)[1]).toEqual({ x: 10, y: 20, size: 0 });
    cloud.step(1 / 60);
    expect(read(cloud)[1]!.y).toBeLessThan(20);
    expect(read(cloud)[1]!.size).toBeGreaterThan(0);
    settle(cloud);
    expect(read(cloud)[1]).toEqual({ x: 10, y: 0, size: 1 });
  });

  it("keeps position and speed when interrupted", () => {
    const cloud = pointCloud([{ x: 0, y: 0 }]);
    cloud.to([{ x: 100, y: 0 }]);
    for (let i = 0; i < 8; i++) cloud.step(1 / 60);
    const before = read(cloud)[0]!;
    cloud.to([{ x: 100, y: 100 }]);
    expect(read(cloud)[0]).toEqual(before);
    cloud.step(1 / 60);
    // Still carried rightwards by its old speed.
    expect(read(cloud)[0]!.x).toBeGreaterThan(before.x);
  });

  it("pairs a quick second change with the shape it was heading for", () => {
    const cloud = pointCloud([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    // The points swap sides; stop them halfway, where they'd be closer to the wrong spots.
    cloud.to([
      { x: 100, y: 1 },
      { x: 0, y: 1 },
    ]);
    for (let i = 0; i < 20; i++) cloud.step(1 / 60);
    const { pairs } = cloud.to([
      { x: 100, y: 2 },
      { x: 0, y: 2 },
    ]);
    expect(pairs).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it("lets points that are already leaving finish, and never pairs them", () => {
    const cloud = pointCloud(row(3));
    cloud.to(row(1));
    cloud.step(1 / 60);
    cloud.to(row(2, 5));
    expect(cloud.live).toBe(2);
    // One kept point, one new, two still leaving.
    expect(cloud.length).toBe(4);
    settle(cloud);
    expect(cloud.length).toBe(2);
    expect(read(cloud).every((p) => p.size === 1 && p.y === 5)).toBe(true);
  });

  it("jumps straight there when instant", () => {
    const cloud = pointCloud(row(3));
    cloud.to(row(2, 40), { instant: true });
    expect(cloud.settled).toBe(true);
    expect(cloud.length).toBe(2);
    expect(read(cloud)).toEqual([0, 10].map((x) => ({ x, y: 40, size: 1 })));
  });

  it("goes to and from nothing", () => {
    const cloud = pointCloud();
    expect(cloud.length).toBe(0);
    cloud.to(row(2));
    settle(cloud);
    expect(cloud.length).toBe(2);
    cloud.to([]);
    settle(cloud);
    expect(cloud.length).toBe(0);
  });

  it("handles thousands of points", () => {
    const grid = (shift: number) => Array.from({ length: 4000 }, (_, i) => ({ x: (i % 80) * 5 + shift, y: Math.floor(i / 80) * 5 }));
    const cloud = pointCloud(grid(0));
    cloud.to(grid(30).slice(0, 3500));
    settle(cloud);
    expect(cloud.length).toBe(3500);
    expect(read(cloud).every((p) => p.size === 1)).toBe(true);
  });

  it("springs each point's tone along with it", () => {
    const cloud = pointCloud([
      { x: 0, y: 0, tone: 0 },
      { x: 10, y: 0, tone: 0 },
    ]);
    expect(tones(cloud)).toEqual([0, 0]);
    cloud.to([
      { x: 0, y: 0, tone: 1 },
      { x: 10, y: 0 },
    ]);
    cloud.step(1 / 60);
    expect(tones(cloud)[0]).toBeGreaterThan(0);
    expect(tones(cloud)[0]).toBeLessThan(1);
    settle(cloud);
    expect(tones(cloud)).toEqual([1, 0]);
  });

  it("brings new points in already in their tone, and lets leaving ones keep theirs", () => {
    // With a short reach, the point at 100 can't travel to (500, 500): it leaves, and a new one arrives.
    const cloud = pointCloud(
      [
        { x: 0, y: 0, tone: 0.3 },
        { x: 100, y: 0, tone: 0.7 },
      ],
      { match: { maxDistance: 20 } },
    );
    cloud.to([
      { x: 0, y: 0, tone: 0.3 },
      { x: 500, y: 500, tone: 0.9 },
    ]);
    // [kept, arriving, leaving]
    expect(tones(cloud)).toEqual([0.3, 0.9, 0.7]);
  });

  it("rejects a bad enter offset and bad points", () => {
    expect(() => pointCloud([{ x: 0, y: 0, tone: Number.NaN }])).toThrow(/tone/);
    expect(() => pointCloud().to([{ x: 0, y: 0, tone: Number.POSITIVE_INFINITY }])).toThrow(/tone/);
    expect(() => pointCloud([], { enter: { y: Number.NaN } })).toThrow(/enter/);
    expect(() => pointCloud().to([{ x: Number.NaN, y: 0 }])).toThrow(/finite/);
  });
});

describe("pointCloud with matches made elsewhere", () => {
  it("uses them, and gives the same result as pairing itself", () => {
    const a = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    const b = [
      { x: 21, y: 1 },
      { x: 1, y: 1 },
    ];
    const own = pointCloud(a);
    const theirs = pointCloud(a);
    const expected = own.to(b);
    const given = matchPoints(theirs.heading(), b);
    expect(theirs.to(b, { matches: given })).toBe(given);
    expect(given).toEqual(expected);
    for (let i = 0; i < 120; i++) {
      own.step(1 / 60);
      theirs.step(1 / 60);
    }
    expect(Array.from(theirs.data)).toEqual(Array.from(own.data));
  });

  it("rejects matches that don't fit", () => {
    const cloud = pointCloud([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(() => cloud.to([{ x: 0, y: 0 }], { matches: { pairs: [[0, 0]], leaving: [], arriving: [] } })).toThrow(/heading/);
    expect(() => cloud.to([{ x: 0, y: 0 }], { matches: { pairs: [[0, 3]], leaving: [1], arriving: [] } })).toThrow(/heading/);
  });
});
