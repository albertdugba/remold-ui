// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { painter, type PainterFrame } from "./index";

/** A 2D context that records the transform and clears (happy-dom has no canvas). */
function fakeContext() {
  const calls: string[] = [];
  return {
    calls,
    context: {
      setTransform: (a: number) => calls.push(`scale ${a}`),
      clearRect: (_x: number, _y: number, w: number, h: number) => calls.push(`clear ${w}x${h}`),
    },
  };
}

let drawing: ReturnType<typeof fakeContext>;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => drawing.context) as unknown as HTMLCanvasElement["getContext"];
});

function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = { add: (cb) => (callbacks.add(cb), () => callbacks.delete(cb)) };
  return {
    loop,
    get running() {
      return callbacks.size > 0;
    },
    step: () => {
      for (const cb of [...callbacks]) if (!cb(1 / 60)) callbacks.delete(cb);
    },
    run(seconds = 4) {
      for (let t = 0; t < seconds && callbacks.size; t += 1 / 60) this.step();
    },
  };
}

let canvas: HTMLCanvasElement;
let clock: ReturnType<typeof manualLoop>;
beforeEach(() => {
  drawing = fakeContext();
  canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 300, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 150, configurable: true });
  canvas.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, toJSON() {} }) as DOMRect;
  document.body.replaceChildren(canvas);
  clock = manualLoop();
});

describe("painter", () => {
  it("draws once at the start, cleared, in CSS pixels, with the starting values", () => {
    const frames: PainterFrame<{ r: number }>[] = [];
    painter(canvas, { values: { r: 10 }, loop: clock.loop, draw: (_, frame) => frames.push({ ...frame, values: { ...frame.values } }) });
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ width: 300, height: 150, values: { r: 10 }, time: 0, dt: 0 });
    expect(drawing.calls).toEqual(["scale 1", "clear 300x150"]);
    expect(clock.running).toBe(false);
  });

  it("springs values to new targets, drawing until they settle, then sleeps", () => {
    const seen: number[] = [];
    const p = painter(canvas, { values: { r: 0 }, loop: clock.loop, draw: (_, { values }) => seen.push(values.r) });
    p.to({ r: 100 });
    expect(clock.running).toBe(true);
    clock.run();
    expect(clock.running).toBe(false);
    expect(p.values.r).toBeCloseTo(100, 2);
    const middle = seen.slice(2, -1);
    expect(middle.some((r) => r > 0 && r < 100)).toBe(true);
  });

  it("keeps drawing every frame when continuous, with time moving on", () => {
    const times: number[] = [];
    painter(canvas, { continuous: true, loop: clock.loop, draw: (_, { time }) => times.push(time) });
    clock.step();
    clock.step();
    expect(clock.running).toBe(true);
    expect(times[2]).toBeCloseTo(2 / 60, 5);
  });

  it("starts a value it hasn't seen at its target", () => {
    const p = painter(canvas, { loop: clock.loop, draw: () => {} });
    p.to({ glow: 0.5 });
    expect(p.values.glow).toBe(0.5);
    expect(clock.running).toBe(false);
  });

  it("jumps values with set", () => {
    const p = painter(canvas, { values: { r: 0 }, loop: clock.loop, draw: () => {} });
    p.set({ r: 40 });
    expect(p.values.r).toBe(40);
    expect(clock.running).toBe(false);
  });

  it("holds still for reduced motion: no loop, values jump, still is set", () => {
    const draw = vi.fn();
    const p = painter(canvas, { values: { r: 0 }, continuous: true, reducedMotion: "always", loop: clock.loop, draw });
    expect(clock.running).toBe(false);
    p.to({ r: 50 });
    expect(p.values.r).toBe(50);
    expect(clock.running).toBe(false);
    expect(draw.mock.lastCall?.[1]).toMatchObject({ still: true, time: 0 });
  });

  it("skips clearing when clear is false", () => {
    painter(canvas, { clear: false, loop: clock.loop, draw: () => {} });
    expect(drawing.calls).toEqual(["scale 1"]);
  });

  it("redraws on request, and stops after destroy", () => {
    const draw = vi.fn();
    const p = painter(canvas, { values: { r: 0 }, loop: clock.loop, draw });
    p.redraw();
    expect(draw).toHaveBeenCalledTimes(2);
    p.destroy();
    p.redraw();
    p.to({ r: 1 });
    expect(draw).toHaveBeenCalledTimes(2);
    expect(clock.running).toBe(false);
  });

  it("names the canvas for screen readers when given a label", () => {
    const p = painter(canvas, { label: "Voice: listening", loop: clock.loop, draw: () => {} });
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe("Voice: listening");
    p.label(undefined);
    expect(canvas.hasAttribute("aria-label")).toBe(false);
    expect(canvas.hasAttribute("role")).toBe(false);
  });

  it("gives each name its own spring, and carries a handed-over velocity", () => {
    const p = painter(canvas, {
      values: { fast: 0, slow: 0 },
      spring: { fast: { duration: 0.2, bounce: 0 }, slow: { duration: 2, bounce: 0 } },
      loop: clock.loop,
      draw: () => {},
    });
    p.to({ fast: 100, slow: 100 });
    for (let i = 0; i < 20; i++) clock.step();
    expect(p.values.fast).toBeGreaterThan(p.values.slow + 30);

    const q = painter(canvas, { values: { x: 0 }, loop: clock.loop, draw: () => {} });
    q.to({ x: 0 }, { velocity: { x: 500 } });
    clock.step();
    clock.step();
    expect(q.values.x).toBeGreaterThan(5);
  });

  it("explains bad input", () => {
    expect(() => painter(canvas, {} as never)).toThrow(/draw must be a function/);
    expect(() => painter(canvas, { values: { r: Number.NaN }, draw: () => {} })).toThrow(/"r" must be a finite number/);
    expect(() => painter(canvas, { precision: 0, draw: () => {} })).toThrow(/precision must be positive/);
  });
});
