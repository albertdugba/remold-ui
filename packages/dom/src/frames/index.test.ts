import { describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "../accessibility";
import { createFrameLoop, type FrameScheduler } from "./index";

/** A fake clock: `advance(ms)` runs the pending frame as if that much time had passed. */
function fakeScheduler() {
  let time = 0;
  let pending: ((time: number) => void) | null = null;
  let requests = 0;
  const scheduler: FrameScheduler = {
    request(callback) {
      pending = callback;
      return ++requests;
    },
    cancel() {
      pending = null;
    },
    now: () => time,
  };
  return {
    scheduler,
    get waiting() {
      return pending !== null;
    },
    advance(ms: number) {
      time += ms;
      const run = pending;
      pending = null;
      run?.(time);
    },
  };
}

describe("createFrameLoop", () => {
  it("passes the real time between frames, in seconds", () => {
    const clock = fakeScheduler();
    const steps: number[] = [];
    createFrameLoop({ scheduler: clock.scheduler }).add((dt) => {
      steps.push(dt);
      return steps.length < 3;
    });
    clock.advance(16);
    clock.advance(8);
    clock.advance(25);
    expect(steps).toEqual([0.016, 0.008, 0.025]);
  });

  it("caps long stalls at maxDelta", () => {
    const clock = fakeScheduler();
    let seen = 0;
    createFrameLoop({ scheduler: clock.scheduler, maxDelta: 0.05 }).add((dt) => {
      seen = dt;
      return false;
    });
    clock.advance(5000);
    expect(seen).toBe(0.05);
  });

  it("stops a callback when it returns false, and sleeps when none are left", () => {
    const clock = fakeScheduler();
    let calls = 0;
    createFrameLoop({ scheduler: clock.scheduler }).add(() => ++calls < 2);
    clock.advance(16);
    clock.advance(16);
    expect(calls).toBe(2);
    expect(clock.waiting).toBe(false);
  });

  it("runs many callbacks on one shared frame", () => {
    const clock = fakeScheduler();
    const loop = createFrameLoop({ scheduler: clock.scheduler });
    const seen: string[] = [];
    loop.add(() => (seen.push("a"), false));
    loop.add(() => (seen.push("b"), false));
    clock.advance(16);
    expect(seen).toEqual(["a", "b"]);
  });

  it("returns a function that stops the callback early", () => {
    const clock = fakeScheduler();
    let calls = 0;
    const stop = createFrameLoop({ scheduler: clock.scheduler }).add(() => (calls++, true));
    clock.advance(16);
    stop();
    clock.advance(16);
    expect(calls).toBe(1);
    expect(clock.waiting).toBe(false);
  });

  it("keeps other animations running when one throws, and still reports the error", () => {
    const reported: (() => void)[] = [];
    vi.stubGlobal("queueMicrotask", (task: () => void) => reported.push(task));
    try {
      const clock = fakeScheduler();
      const loop = createFrameLoop({ scheduler: clock.scheduler });
      let calls = 0;
      loop.add(() => {
        throw new Error("broken animation");
      });
      loop.add(() => (calls++, true));
      clock.advance(16);
      clock.advance(16);
      expect(calls).toBe(2);
      expect(reported).toHaveLength(1);
      expect(reported[0]).toThrow("broken animation");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("prefersReducedMotion", () => {
  it("is false where there is no browser", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
