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

describe("pointCloud with scatter", () => {
  /** Step until `test` holds, or fail after a few seconds of frames. */
  const until = (cloud: ReturnType<typeof pointCloud>, test: () => boolean) => {
    for (let n = 0; !test(); n++) {
      if (n > 600) throw new Error("never happened");
      cloud.step(1 / 60);
    }
  };

  it("spreads out first, then lands exactly on the new shape", () => {
    const cloud = pointCloud(row(20));
    cloud.to(row(20, 100), { scatter: { seed: 1 } });
    expect(cloud.settled).toBe(false);
    // A little way in, the points are spread around rather than marching in a line.
    for (let n = 0; n < 15; n++) cloud.step(1 / 60);
    const ys = read(cloud).map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20);
    settle(cloud);
    expect(read(cloud)).toEqual(row(20, 100).map((p) => ({ ...p, size: 1 })));
  });

  it("glitters while spread: sizes vary, and every point is back to full size at the end", () => {
    const cloud = pointCloud(row(30));
    cloud.to(row(30, 60), { scatter: { seed: 2 } });
    for (let n = 0; n < 20; n++) cloud.step(1 / 60);
    const sizes = new Set(read(cloud).map((p) => p.size.toFixed(2)));
    expect(sizes.size).toBeGreaterThan(5);
    settle(cloud);
    expect(read(cloud).every((p) => p.size === 1)).toBe(true);
  });

  it("holds before gathering, and sets points off at different times", () => {
    const cloud = pointCloud(row(10));
    cloud.to(row(10, 80), { scatter: { seed: 3, hold: 0.5, stagger: 0.3 } });
    // Before the hold is up, nothing is heading for the new shape yet.
    for (let n = 0; n < 24; n++) cloud.step(1 / 60);
    expect(cloud.settled).toBe(false);
    settle(cloud);
    expect(read(cloud).map((p) => p.y)).toEqual(Array(10).fill(80));
  });

  it("keeps pairing from the shape it's heading for when interrupted mid-scatter", () => {
    const cloud = pointCloud(row(3));
    cloud.to(row(3, 50), { scatter: { seed: 4 } });
    for (let n = 0; n < 10; n++) cloud.step(1 / 60);
    expect(cloud.heading()).toEqual(row(3, 50));
    const { pairs } = cloud.to(row(3, 50, 11));
    expect(pairs).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    settle(cloud);
    expect(read(cloud)).toEqual(row(3, 50, 11).map((p) => ({ ...p, size: 1 })));
  });

  it("brings new points in from the cloud and fades spare ones out in it", () => {
    const cloud = pointCloud(row(2));
    cloud.to(row(6, 40), { scatter: { seed: 5 } });
    until(cloud, () => cloud.settled);
    expect(cloud.length).toBe(6);
    expect(read(cloud)).toEqual(row(6, 40).map((p) => ({ ...p, size: 1 })));

    cloud.to(row(2, 0), { scatter: { seed: 6 } });
    settle(cloud);
    expect(cloud.length).toBe(2);
  });

  it("spreads the same way for the same seed", () => {
    const run = () => {
      const cloud = pointCloud(row(12));
      cloud.to(row(12, 30), { scatter: { seed: 7 } });
      for (let n = 0; n < 12; n++) cloud.step(1 / 60);
      return read(cloud);
    };
    expect(run()).toEqual(run());
  });

  it("jumps straight there when instant, scatter or not", () => {
    const cloud = pointCloud(row(4));
    cloud.to(row(4, 20), { instant: true, scatter: true });
    expect(cloud.settled).toBe(true);
    expect(read(cloud)).toEqual(row(4, 20).map((p) => ({ ...p, size: 1 })));
  });

  it("rejects bad scatter settings", () => {
    const cloud = pointCloud(row(2));
    expect(() => cloud.to(row(2), { scatter: { spread: 0 } })).toThrow(/spread/);
    expect(() => cloud.to(row(2), { scatter: { hold: -1 } })).toThrow(/hold/);
    expect(() => cloud.to(row(2), { scatter: { stagger: Number.NaN } })).toThrow(/stagger/);
    expect(() => cloud.to(row(2), { scatter: { seed: Number.POSITIVE_INFINITY } })).toThrow(/seed/);
  });
});
