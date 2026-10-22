import { describe, expect, it } from "vitest";
import { springToCss } from "./css";
import { deceleration, project, rubberband, velocityTracker } from "./gesture";
import { isSettled, springCoefficients, springs, stepSpring, type SpringConfig, type SpringState } from "./spring";
import { value } from "./value";

/** Run a spring from 0 to 1 for `seconds` at `fps`, returning every frame's value. */
function simulate(config: SpringConfig = springs.smooth, seconds = 1, fps = 60): number[] {
  const coefficients = springCoefficients(config);
  const state: SpringState = { value: 0, velocity: 0 };
  const frames: number[] = [];
  for (let i = 0; i < seconds * fps; i++) {
    stepSpring({ state, target: 1, spring: coefficients, dt: 1 / fps });
    frames.push(state.value);
  }
  return frames;
}

describe("springCoefficients", () => {
  it("turns duration and bounce into stiffness and damping", () => {
    const { stiffness, damping } = springCoefficients({ duration: 0.5, bounce: 0 });
    expect(stiffness).toBeCloseTo((4 * Math.PI) ** 2);
    // bounce 0 is critical damping: damping = 2√stiffness.
    expect(damping).toBeCloseTo(2 * Math.sqrt(stiffness));
  });
  it("rejects values that can't make a spring", () => {
    expect(() => springCoefficients({ duration: 0, bounce: 0 })).toThrow(RangeError);
    expect(() => springCoefficients({ duration: 0.5, bounce: 1 })).toThrow(RangeError);
    expect(() => springCoefficients({ duration: 0.5, bounce: -1 })).toThrow(RangeError);
    expect(() => springCoefficients({ duration: Number.NaN, bounce: 0 })).toThrow(RangeError);
  });
});

describe("stepSpring", () => {
  it("smooth: nearly there after its duration, and never overshoots", () => {
    const frames = simulate(springs.smooth);
    expect(frames[29]).toBeGreaterThan(0.98);
    expect(Math.max(...frames)).toBeLessThanOrEqual(1 + 1e-9);
  });
  it("bouncy: overshoots, then comes back", () => {
    // bounce 0.3 is a damping ratio of 0.7, which overshoots by about 4.6%.
    const frames = simulate(springs.bouncy);
    expect(Math.max(...frames)).toBeGreaterThan(1.03);
    expect(frames[frames.length - 1]).toBeCloseTo(1, 2);
  });
  it("negative bounce settles more slowly", () => {
    expect(simulate({ duration: 0.5, bounce: -0.5 })[29]).toBeLessThan(simulate(springs.smooth)[29]!);
  });
  it("stays stable for very stiff and very damped springs", () => {
    // A fixed 1/240 s substep used to blow these up to NaN.
    for (const config of [
      { duration: 0.005, bounce: 0 },
      { duration: 0.02, bounce: 0.9 },
    ]) {
      const frames = simulate(config, 2);
      expect(frames.every(Number.isFinite), JSON.stringify(config)).toBe(true);
      expect(frames.at(-1), JSON.stringify(config)).toBeCloseTo(1, 6);
    }
    // Bounce near -1 is so overdamped it creeps: it should crawl steadily towards 1, never wobble.
    const creeping = simulate({ duration: 0.5, bounce: -0.999 }, 2);
    expect(creeping.every((v, i) => Number.isFinite(v) && v <= 1 && v >= (creeping[i - 1] ?? 0))).toBe(true);
    expect(creeping.at(-1)).toBeGreaterThan(0);
  });
  it("moves the same at 30, 60 and 120 frames a second", () => {
    const at = (fps: number) => simulate(springs.bouncy, 0.5, fps).at(-1)!;
    expect(at(30)).toBeCloseTo(at(120), 9);
    expect(at(60)).toBeCloseTo(at(120), 9);
  });
});

describe("isSettled", () => {
  it("needs to be both close and slow", () => {
    expect(isSettled({ value: 0.999, velocity: 0 }, 1, 0.01)).toBe(true);
    expect(isSettled({ value: 0.999, velocity: 5 }, 1, 0.01)).toBe(false);
    expect(isSettled({ value: 0.9, velocity: 0 }, 1, 0.01)).toBe(false);
  });
});

describe("value", () => {
  const run = (v: ReturnType<typeof value>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) v.step(1 / 60);
  };

  it("springs to its target and lands exactly on it", () => {
    const x = value(0);
    x.to(100);
    expect(x.settled).toBe(false);
    run(x, 2);
    expect(x.current).toBe(100);
    expect(x.velocity).toBe(0);
    expect(x.settled).toBe(true);
  });

  it("step reports whether it is still moving", () => {
    const x = value(0);
    expect(x.step(1 / 60)).toBe(false);
    x.to(10);
    expect(x.step(1 / 60)).toBe(true);
  });

  it("is interruptible: a new target keeps the current position and speed", () => {
    const x = value(0);
    x.to(100);
    run(x, 0.1);
    const { current, velocity } = x;
    expect(velocity).toBeGreaterThan(0);
    x.to(0);
    expect(x.current).toBe(current);
    expect(x.velocity).toBe(velocity);
    // Still moving forwards for a moment before turning round: no jump, no sudden stop.
    x.step(1 / 60);
    expect(x.current).toBeGreaterThan(current);
  });

  it("set jumps and stops (for reduced motion)", () => {
    const x = value(0);
    x.to(100);
    run(x, 0.1);
    x.set(100);
    expect(x.current).toBe(100);
    expect(x.velocity).toBe(0);
    expect(x.settled).toBe(true);
  });

  it("hold freezes it mid-flight; set then follows the finger", () => {
    const x = value(0);
    x.to(100);
    run(x, 0.1);
    x.hold();
    const frozen = x.current;
    run(x, 0.5);
    expect(x.current).toBe(frozen);
    expect(x.settled).toBe(false);
    x.set(42);
    expect(x.current).toBe(42);
    expect(x.target).toBe(100);
  });

  it("release hands the finger's speed to the spring", () => {
    const x = value(0);
    x.hold();
    x.set(50);
    x.release({ velocity: 2000, target: 0 });
    x.step(1 / 60);
    // Thrown away from the target, it carries on that way at first.
    expect(x.current).toBeGreaterThan(50);
    run(x, 2);
    expect(x.current).toBe(0);
  });

  it("to can start with a given velocity and use its own spring", () => {
    const x = value(0);
    x.to(0, { velocity: -500, spring: springs.bouncy });
    x.step(1 / 60);
    expect(x.current).toBeLessThan(0);
  });

  it("rejects a precision that could never be reached", () => {
    expect(() => value(0, { precision: 0 })).toThrow(RangeError);
  });
});

describe("springToCss", () => {
  it("samples the spring into a linear() easing that starts at 0 and ends at 1", () => {
    const { duration, easing } = springToCss(springs.smooth, 5);
    expect(easing).toMatch(/^linear\(0, [\d.]+, [\d.]+, [\d.]+, 1\)$/);
    expect(duration).toBeGreaterThan(400);
    expect(duration).toBeLessThan(1500);
  });
  it("overshoots past 1 for a bouncy spring", () => {
    const values = springToCss(springs.bouncy).easing.slice(7, -1).split(", ").map(Number);
    expect(Math.max(...values)).toBeGreaterThan(1);
  });
  it("rejects too few samples", () => {
    expect(() => springToCss(springs.smooth, 1)).toThrow(RangeError);
  });
});

describe("project", () => {
  it("is how far a flick coasts", () => {
    expect(project(1000)).toBeCloseTo(499);
    expect(project(1000, deceleration.fast)).toBeCloseTo(99);
    expect(project(-1000)).toBeCloseTo(-499);
    expect(project(0)).toBe(0);
  });
});

describe("rubberband", () => {
  it("moves about half as far at first", () => {
    expect(rubberband(1, 1000)).toBeCloseTo(0.55, 2);
  });
  it("resists more the further you pull, and never passes the dimension", () => {
    expect(rubberband(100, 400) / 100).toBeLessThan(rubberband(10, 400) / 10);
    expect(rubberband(1e9, 400)).toBeLessThan(400);
  });
  it("works in both directions", () => {
    expect(rubberband(-50, 400)).toBeCloseTo(-rubberband(50, 400));
    expect(rubberband(0, 400)).toBe(0);
  });
});

describe("velocityTracker", () => {
  it("measures speed in units per second", () => {
    const tracker = velocityTracker();
    tracker.add(0, 0);
    tracker.add(16, 8);
    tracker.add(32, 16);
    expect(tracker.velocity()).toBeCloseTo(500);
  });
  it("only counts the recent window", () => {
    const tracker = velocityTracker({ window: 100 });
    tracker.add(0, 0);
    tracker.add(500, 0); // a long pause
    tracker.add(550, 50);
    tracker.add(600, 100);
    expect(tracker.velocity()).toBeCloseTo(1000);
  });
  it("is 0 if the finger stopped before letting go", () => {
    const tracker = velocityTracker({ idle: 50 });
    tracker.add(0, 0);
    tracker.add(16, 10);
    expect(tracker.velocity(30)).toBeGreaterThan(0);
    expect(tracker.velocity(200)).toBe(0);
  });
  it("is 0 with fewer than two samples, and after reset", () => {
    const tracker = velocityTracker();
    expect(tracker.velocity()).toBe(0);
    tracker.add(0, 0);
    tracker.add(10, 10);
    tracker.reset();
    expect(tracker.velocity()).toBe(0);
  });
});
