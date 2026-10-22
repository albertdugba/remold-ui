import { describe, expect, it } from "vitest";
import { matchPoints } from "../match/points";
import { springs, type SpringConfig } from "./spring";
import { value } from "./value";
import { values } from "./values";

/** A small seeded random generator (mulberry32), so failures can be replayed. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Step until settled, returning how many steps it took. Fails instead of hanging. */
function run(batch: ReturnType<typeof values>, dt = 1 / 60, limit = 10_000): number {
  let n = 0;
  while (batch.step(dt)) if (++n > limit) throw new Error("never settled");
  return n;
}

describe("values", () => {
  it("starts at rest where it's told", () => {
    const batch = values([1, 2, 3]);
    expect([...batch.current]).toEqual([1, 2, 3]);
    expect([...batch.target]).toEqual([1, 2, 3]);
    expect([...batch.velocity]).toEqual([0, 0, 0]);
    expect(batch.settled).toBe(true);
    expect(batch.step(1 / 60)).toBe(false);
  });

  it("copies its input instead of keeping it", () => {
    const input = [0, 0];
    const batch = values(input);
    input[0] = 99;
    expect(batch.current[0]).toBe(0);
  });

  it("works with nothing in it", () => {
    const batch = values([]);
    expect(batch.length).toBe(0);
    expect(batch.settled).toBe(true);
    batch.toAll([]);
    expect(batch.step(1)).toBe(false);
  });

  it("moves every entry to its target and lands exactly on it", () => {
    const batch = values([0, 10, -5]);
    batch.toAll([100, 10.5, 0.25]);
    expect(batch.settled).toBe(false);
    run(batch);
    expect([...batch.current]).toEqual([100, 10.5, 0.25]);
    expect([...batch.velocity]).toEqual([0, 0, 0]);
    expect(batch.settled).toBe(true);
  });

  it("only simulates entries that are moving", () => {
    const batch = values([0, 0]);
    batch.to(0, 100);
    batch.step(1 / 60);
    expect(batch.current[0]).toBeGreaterThan(0);
    expect(batch.current[1]).toBe(0);
    expect(batch.isSettled(0)).toBe(false);
    expect(batch.isSettled(1)).toBe(true);
  });

  it("counts a move to where it already is as settled", () => {
    const batch = values([5]);
    batch.to(0, 5.001);
    expect(batch.settled).toBe(true);
  });

  it("matches value() exactly, step for step, under random use", () => {
    // The batch inlines the spring maths for speed, so check it against the reference
    // implementation bit for bit: random springs, frame times, retargets, kicks and jumps.
    for (let seed = 1; seed <= 25; seed++) {
      const rand = random(seed);
      const spring: SpringConfig = { duration: 0.1 + rand() * 1.5, bounce: rand() * 1.8 - 0.9 };
      const count = 1 + Math.floor(rand() * 12);
      const start = Array.from({ length: count }, () => (rand() - 0.5) * 2000);
      const batch = values(start, { spring, precision: 0.05 });
      const singles = start.map((s) => value(s, { spring, precision: 0.05 }));

      for (let frame = 0; frame < 400; frame++) {
        const i = Math.floor(rand() * count);
        const roll = rand();
        const to = (rand() - 0.5) * 2000;
        if (roll < 0.05) {
          batch.to(i, to);
          singles[i]!.to(to);
        } else if (roll < 0.07) {
          const kick = (rand() - 0.5) * 5000;
          batch.to(i, to, { velocity: kick });
          singles[i]!.to(to, { velocity: kick });
        } else if (roll < 0.08) {
          batch.set(i, to);
          singles[i]!.set(to);
        }
        // Uneven frame times, including long stalls and zero-length frames.
        const dt = rand() < 0.05 ? rand() * 0.5 : rand() < 0.05 ? 0 : 1 / (30 + rand() * 120);
        const anyMoving = batch.step(dt);
        for (const single of singles) single.step(dt);
        expect(anyMoving).toBe(singles.some((s) => !s.settled));
        singles.forEach((single, k) => {
          expect(batch.current[k]).toBe(single.current);
          expect(batch.velocity[k]).toBe(single.velocity);
          expect(batch.target[k]).toBe(single.target);
          expect(batch.isSettled(k)).toBe(single.settled);
        });
      }
    }
  });

  it("keeps its momentum when interrupted", () => {
    const batch = values([0]);
    batch.to(0, 100);
    for (let i = 0; i < 6; i++) batch.step(1 / 60);
    const before = { at: batch.current[0]!, speed: batch.velocity[0]! };
    expect(before.speed).toBeGreaterThan(0);
    batch.to(0, -100);
    expect(batch.current[0]).toBe(before.at);
    expect(batch.velocity[0]).toBe(before.speed);
    batch.step(1 / 60);
    // Still carried forward by its old speed for a moment, rather than snapping back.
    expect(batch.current[0]).toBeGreaterThan(before.at);
  });

  it("starts at a given velocity", () => {
    const batch = values([0]);
    batch.to(0, 0, { velocity: 500 });
    expect(batch.settled).toBe(false);
    batch.step(1 / 60);
    expect(batch.current[0]).toBeGreaterThan(0);
    run(batch);
    expect(batch.current[0]).toBe(0);
  });

  it("jumps and stops with set and setAll", () => {
    const batch = values([0, 0]);
    batch.toAll([100, 100]);
    batch.step(1 / 60);
    batch.set(0, 7);
    expect(batch.current[0]).toBe(7);
    expect(batch.velocity[0]).toBe(0);
    expect(batch.target[0]).toBe(7);
    expect(batch.isSettled(0)).toBe(true);
    expect(batch.settled).toBe(false);
    batch.setAll([1, 2]);
    expect([...batch.current]).toEqual([1, 2]);
    expect(batch.settled).toBe(true);
  });

  it("moves the same at 30, 60 and 120 frames a second", () => {
    const at = (fps: number) => {
      const batch = values([0], { spring: springs.bouncy });
      batch.to(0, 1);
      for (let i = 0; i < fps * 0.5; i++) batch.step(1 / fps);
      return batch.current[0]!;
    };
    expect(at(30)).toBeCloseTo(at(120), 9);
    expect(at(60)).toBeCloseTo(at(120), 9);
  });

  it("changes spring mid-flight without a jump", () => {
    const batch = values([0], { spring: springs.smooth });
    batch.to(0, 100);
    batch.step(1 / 60);
    const at = batch.current[0]!;
    const speed = batch.velocity[0]!;
    batch.setSpring(springs.bouncy);
    expect(batch.current[0]).toBe(at);
    expect(batch.velocity[0]).toBe(speed);
    const frames = [];
    while (batch.step(1 / 60)) frames.push(batch.current[0]!);
    expect(Math.max(...frames)).toBeGreaterThan(100);
    expect(batch.current[0]).toBe(100);
  });

  it("stays stable with very stiff or heavily damped springs", () => {
    const extremes: SpringConfig[] = [
      { duration: 0.001, bounce: 0 },
      { duration: 0.005, bounce: 0.9 },
      { duration: 0.02, bounce: 0 },
      { duration: 0.5, bounce: -0.999 },
      { duration: 0.5, bounce: 0.999 },
      { duration: 30, bounce: 0 },
    ];
    for (const spring of extremes) {
      const batch = values([0], { spring });
      batch.to(0, 100);
      run(batch, 1 / 60, 200_000);
      expect(batch.current[0], JSON.stringify(spring)).toBe(100);
    }
  });

  it("handles large coordinates", () => {
    const batch = values([1e7, -1e7]);
    batch.toAll([-1e7, 1e7]);
    run(batch);
    expect([...batch.current]).toEqual([-1e7, 1e7]);
  });

  it("survives a long stall in one step", () => {
    const batch = values([0]);
    batch.to(0, 100);
    expect(batch.step(10)).toBe(false);
    expect(batch.current[0]).toBe(100);
  });

  it("handles a big cloud", () => {
    const count = 100_000;
    const rand = random(7);
    const start = Float64Array.from({ length: count }, () => rand() * 1000);
    const batch = values(start, { spring: springs.snappy });
    batch.toAll(start.map((v) => v + 500));
    const steps = run(batch);
    expect(steps).toBeLessThan(120);
    for (let i = 0; i < count; i++) expect(batch.current[i]).toBe(start[i]! + 500);
  });

  describe("stride and remap", () => {
    it("needs a length that divides by the stride", () => {
      expect(() => values([1, 2, 3], { stride: 2 })).toThrow(/doesn't divide/);
      expect(values([1, 2, 3, 4], { stride: 2 }).length).toBe(4);
    });

    it("carries whole items across, with their motion", () => {
      // Three dots as [x, y].
      const batch = values([0, 0, 10, 10, 20, 20], { stride: 2 });
      batch.toAll([100, 100, 110, 110, 120, 120]);
      batch.step(1 / 60);
      const old = { current: [...batch.current], velocity: [...batch.velocity] };

      // New order: old dot 2, a brand new dot, old dot 0. Old dot 1 leaves.
      batch.remap([2, -1, 0], 50);
      expect(batch.length).toBe(6);
      expect([...batch.current]).toEqual([old.current[4], old.current[5], 50, 50, old.current[0], old.current[1]]);
      expect([...batch.velocity]).toEqual([old.velocity[4], old.velocity[5], 0, 0, old.velocity[0], old.velocity[1]]);
      expect([...batch.target]).toEqual([120, 120, 50, 50, 100, 100]);
      expect(batch.isSettled(2)).toBe(true);
      expect(batch.isSettled(0)).toBe(false);

      run(batch);
      expect([...batch.current]).toEqual([120, 120, 50, 50, 100, 100]);
    });

    it("places new items at per-entry fill values", () => {
      const batch = values([1, 2], { stride: 2 });
      batch.remap([-1, 0], [7, 8, 0, 0]);
      expect([...batch.current]).toEqual([7, 8, 1, 2]);
    });

    it("can grow, shrink and empty", () => {
      const batch = values([1, 2, 3]);
      batch.remap([0, 1, 2, -1, -1]);
      expect([...batch.current]).toEqual([1, 2, 3, 0, 0]);
      batch.remap([4]);
      expect([...batch.current]).toEqual([0]);
      batch.remap([]);
      expect(batch.length).toBe(0);
      expect(batch.settled).toBe(true);
    });

    it("keeps the settled count right across remaps", () => {
      const batch = values([0, 0, 0]);
      batch.toAll([10, 10, 10]);
      batch.remap([1]);
      expect(batch.settled).toBe(false);
      batch.remap([-1]);
      expect(batch.settled).toBe(true);
      expect(batch.step(1 / 60)).toBe(false);
    });

    it("morphs one cloud into another with matchPoints", () => {
      const from = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 80 },
      ];
      const to = [
        { x: 98, y: 5 },
        { x: 2, y: 3 },
      ];
      const batch = values(
        from.flatMap((p) => [p.x, p.y]),
        { stride: 2 },
      );
      const { pairs } = matchPoints(from, to);
      const sources = to.map((_, j) => pairs.find(([, b]) => b === j)?.[0] ?? -1);
      batch.remap(sources);
      batch.toAll(to.flatMap((p) => [p.x, p.y]));
      // Each new dot starts where its nearest old dot was.
      expect([...batch.current]).toEqual([100, 0, 0, 0]);
      run(batch);
      expect([...batch.current]).toEqual([98, 5, 2, 3]);
    });

    it("rejects bad sources and leaves the batch untouched", () => {
      const batch = values([1, 2, 3, 4], { stride: 2 });
      expect(() => batch.remap([2])).toThrow(/sources\[0\]/);
      expect(() => batch.remap([0.5])).toThrow(RangeError);
      expect(() => batch.remap([-2])).toThrow(RangeError);
      expect(() => batch.remap([0, 0])).toThrow(/appears twice/);
      expect(() => batch.remap([-1], [1])).toThrow(/fill needs 2/);
      expect(() => batch.remap([-1], [1, Number.NaN])).toThrow(/fill\[1\]/);
      expect(() => batch.remap([-1], Number.POSITIVE_INFINITY)).toThrow(/fill/);
      expect([...batch.current]).toEqual([1, 2, 3, 4]);
    });
  });

  describe("bad input", () => {
    it("rejects bad options", () => {
      expect(() => values([0], { precision: 0 })).toThrow(/precision/);
      expect(() => values([0], { precision: Number.NaN })).toThrow(/precision/);
      expect(() => values([0], { stride: 0 })).toThrow(/stride/);
      expect(() => values([0], { stride: 1.5 })).toThrow(/stride/);
      expect(() => values([0], { spring: { duration: 0, bounce: 0 } })).toThrow(/duration/);
      expect(() => values([0]).setSpring({ duration: 0.5, bounce: 1 })).toThrow(/bounce/);
    });

    it("rejects numbers that aren't finite", () => {
      expect(() => values([0, Number.NaN])).toThrow(/initial\[1\]/);
      const batch = values([0, 0]);
      expect(() => batch.to(0, Number.NaN)).toThrow(/target/);
      expect(() => batch.to(0, 1, { velocity: Number.POSITIVE_INFINITY })).toThrow(/velocity/);
      expect(() => batch.set(0, Number.NaN)).toThrow(/value/);
      expect(() => batch.toAll([1, Number.NaN])).toThrow(/targets\[1\]/);
      expect(() => batch.setAll([Number.NaN, 1])).toThrow(/values\[0\]/);
    });

    it("leaves everything untouched when a batch call fails", () => {
      const batch = values([0, 0]);
      expect(() => batch.toAll([5, Number.NaN])).toThrow();
      expect([...batch.target]).toEqual([0, 0]);
      expect(batch.settled).toBe(true);
      expect(() => batch.setAll([5, Number.NaN])).toThrow();
      expect([...batch.current]).toEqual([0, 0]);
    });

    it("rejects the wrong number of entries", () => {
      const batch = values([0, 0]);
      expect(() => batch.toAll([1])).toThrow(/targets needs 2 entries, got 1/);
      expect(() => batch.setAll([1, 2, 3])).toThrow(/values needs 2 entries, got 3/);
    });

    it("rejects indexes out of range", () => {
      const batch = values([0, 0]);
      for (const index of [-1, 2, 0.5, Number.NaN]) {
        expect(() => batch.to(index, 1)).toThrow(/index/);
        expect(() => batch.set(index, 1)).toThrow(/index/);
        expect(() => batch.isSettled(index)).toThrow(/index/);
      }
    });

    it("rejects frame times that would hang or corrupt it", () => {
      const batch = values([0]);
      batch.to(0, 1);
      for (const dt of [-1 / 60, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => batch.step(dt)).toThrow(/dt/);
      }
      expect(batch.step(0)).toBe(true);
      expect(batch.current[0]).toBe(0);
    });
  });
});
