import { describe, expect, it } from "vitest";
import { hungarian } from "./hungarian";
import { approximate, matchPoints, type Point3, type PointMatches } from "./points";

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const d2 = (p: Point3, q: Point3) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + ((p.z ?? 0) - (q.z ?? 0)) ** 2;
const total = (a: Point3[], b: Point3[], pairs: [number, number][]) => pairs.reduce((sum, [i, j]) => sum + d2(a[i]!, b[j]!), 0);

/** Every index used once, leftovers listed exactly once, pairs sorted. */
function expectValid(result: PointMatches, n: number, m: number) {
  const usedA = new Set(result.pairs.map(([i]) => i));
  const usedB = new Set(result.pairs.map(([, j]) => j));
  expect(usedA.size).toBe(result.pairs.length);
  expect(usedB.size).toBe(result.pairs.length);
  for (const [i, j] of result.pairs) {
    expect(i >= 0 && i < n && j >= 0 && j < m).toBe(true);
  }
  expect(result.pairs.map(([i]) => i)).toEqual([...usedA].sort((p, q) => p - q));
  expect(result.leaving.length + result.pairs.length).toBe(n);
  expect(result.arriving.length + result.pairs.length).toBe(m);
  for (const i of result.leaving) expect(usedA.has(i)).toBe(false);
  for (const j of result.arriving) expect(usedB.has(j)).toBe(false);
}

describe("matchPoints", () => {
  it("pairs each point with a nearby partner, minimising total travel", () => {
    // Greedy pairs the closest two first (10 → 9, cost 1), forcing 0 → 20 (cost 400): 401 in
    // total. The best total pairs 0 → 9 (81) and 10 → 20 (100): 181.
    const a = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const b = [
      { x: 9, y: 0 },
      { x: 20, y: 0 },
    ];
    expect(matchPoints(a, b).pairs).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it("works in 3D", () => {
    const a = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10 },
    ];
    const b = [
      { x: 0, y: 0, z: 11 },
      { x: 0, y: 0, z: 1 },
    ];
    expect(matchPoints(a, b).pairs).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("reports leftovers as leaving and arriving", () => {
    const result = matchPoints(
      [{ x: 0, y: 0 }],
      [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
    );
    expect(result).toEqual({ pairs: [[0, 0]], leaving: [], arriving: [1] });
  });

  it("drops pairs further apart than maxDistance", () => {
    const result = matchPoints([{ x: 0, y: 0 }], [{ x: 100, y: 0 }], { maxDistance: 10 });
    expect(result).toEqual({ pairs: [], leaving: [0], arriving: [0] });
  });

  it("keeps the pairs it can within maxDistance instead of stretching them all", () => {
    // Without the limit, the best total moves both points 10 (0 → 10, 10 → 20), and a limit of 5
    // would then drop both. Keeping the point at 10 where it is, and letting the others go, is better.
    const result = matchPoints(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 20, y: 0 },
      ],
      { maxDistance: 5 },
    );
    expect(result).toEqual({ pairs: [[1, 0]], leaving: [0], arriving: [1] });
  });

  it('pairs by index with by: "order"', () => {
    expect(
      matchPoints(
        [
          { x: 0, y: 0 },
          { x: 9, y: 9 },
        ],
        [{ x: 9, y: 9 }],
        { by: "order" },
      ).pairs,
    ).toEqual([[0, 0]]);
  });

  it("pairs a line of points that barely moves one to one, even when the cloud is large", () => {
    const cloud = (n: number, shift: number) => Array.from({ length: n }, (_, i) => ({ x: i + shift, y: 0 }));
    const result = matchPoints(cloud(600, 0), cloud(600, 0.1));
    expect(result.pairs).toHaveLength(600);
    expect(result.pairs.every(([i, j]) => i === j)).toBe(true);
  });

  it("handles empty clouds and rejects a bad limit", () => {
    expect(matchPoints([], [{ x: 0, y: 0 }])).toEqual({ pairs: [], leaving: [], arriving: [0] });
    expect(() => matchPoints([], [], { maxDistance: 0 })).toThrow(RangeError);
  });

  it("rejects coordinates that aren't finite numbers, and unknown options", () => {
    expect(() => matchPoints([{ x: 0, y: Number.NaN }], [])).toThrow(/a\[0\] must have finite coordinates/);
    expect(() =>
      matchPoints(
        [],
        [
          { x: 0, y: 0 },
          { x: 0, y: 0, z: Number.POSITIVE_INFINITY },
        ],
      ),
    ).toThrow(/b\[1\]/);
    expect(() => matchPoints([], [], { by: "closest" as "nearest" })).toThrow(/by must be/);
  });
});

describe("matchPoints on large clouds", () => {
  const r = random(3);
  const uniform = (n: number, width = 100, x = 0): Point3[] => Array.from({ length: n }, () => ({ x: x + r() * width, y: r() * width }));
  const grid = (n: number, spacing: number, x = 0): Point3[] => {
    const columns = Math.ceil(Math.sqrt(n));
    return Array.from({ length: n }, (_, i) => ({ x: x + (i % columns) * spacing, y: Math.floor(i / columns) * spacing }));
  };
  const ring = (n: number, radius: number): Point3[] =>
    Array.from({ length: n }, (_, i) => ({
      x: 50 + radius * Math.cos((i / n) * 2 * Math.PI),
      y: 50 + radius * Math.sin((i / n) * 2 * Math.PI),
    }));
  const space = (n: number): Point3[] => Array.from({ length: n }, () => ({ x: r() * 50, y: r() * 50, z: r() * 50 }));
  const jittered = uniform(400);

  // The fast matcher against the exact one, on clouds small enough to solve exactly. The limits
  // are a little above what it scores today, so a regression in quality fails loudly.
  const cases: [name: string, a: Point3[], b: Point3[], limit: number][] = [
    ["a cloud that wobbles", jittered, jittered.map((p) => ({ x: p.x + r() * 3, y: p.y + r() * 3 })), 1.01],
    ["a grid that slides", grid(400, 5), grid(400, 5, 30), 1.001],
    ["a grid that grows", grid(400, 5), grid(400, 8), 1.001],
    ["a ring that fills in", ring(400, 40), uniform(400), 1.03],
    ["two unrelated clouds", uniform(400), uniform(400), 1.08],
    ["a cloud that loses points", uniform(400), uniform(300), 1.03],
    ["a cloud that gains points", uniform(300), uniform(400), 1.03],
    ["clouds in 3D", space(400), space(400), 1.05],
  ];
  for (const [name, a, b, limit] of cases) {
    it(`lands within ${Math.round((limit - 1) * 1000) / 10}% of the best total: ${name}`, () => {
      const exact = hungarian(a.map((p) => b.map((q) => d2(p, q)))).flatMap((j, i): [number, number][] => (j >= 0 ? [[i, j]] : []));
      const fast = approximate(a, b);
      expect(fast).toHaveLength(Math.min(a.length, b.length));
      expect(total(a, b, fast) / total(a, b, exact)).toBeLessThanOrEqual(limit);
    });
  }

  it("returns a valid pairing for 10,000 points, the same every time", () => {
    const a = uniform(10_000, 1000);
    const b = uniform(9_000, 1000);
    const first = matchPoints(a, b);
    expectValid(first, a.length, b.length);
    expect(first.pairs).toHaveLength(9_000);
    expect(matchPoints(a, b)).toEqual(first);
  }, 15_000);

  it("stays quick when a tight crowd heads for a distant cloud", () => {
    // Everyone's nearest partners are the same few points: the case that used to stall.
    const a = uniform(5_000, 1);
    const b = uniform(5_000, 1000, 5000);
    const started = Date.now();
    const result = matchPoints(a, b);
    expectValid(result, a.length, b.length);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("copes with every point in the same place", () => {
    const same = Array.from({ length: 1_000 }, () => ({ x: 1, y: 1 }));
    const result = matchPoints(same, same);
    expectValid(result, 1_000, 1_000);
    expect(result.pairs).toHaveLength(1_000);
  });

  it("copes with points on a line, and with one point against many", () => {
    const line = Array.from({ length: 800 }, (_, i) => ({ x: i, y: 2 * i }));
    expectValid(matchPoints(line, [...line].reverse()), 800, 800);
    const one = matchPoints([{ x: 400, y: 800 }], uniform(300_000, 1000));
    expect(one.pairs).toHaveLength(1);
    expect(one.arriving).toHaveLength(299_999);
  });

  it("drops pairs beyond maxDistance", () => {
    const a = uniform(1_000, 100);
    const b = uniform(1_000, 100, 60);
    const result = matchPoints(a, b, { maxDistance: 20 });
    expectValid(result, a.length, b.length);
    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.pairs.length).toBeLessThan(1_000);
    for (const [i, j] of result.pairs) expect(d2(a[i]!, b[j]!)).toBeLessThanOrEqual(400);
  });
});
