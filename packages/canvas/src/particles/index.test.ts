// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { particles } from "./index";

/** A 2D context that records the dots drawn in the last frame (happy-dom has no canvas). */
function fakeContext() {
  const frame: { arcs: { x: number; y: number; r: number }[]; rects: number; fills: unknown[] } = { arcs: [], rects: 0, fills: [] };
  const context = {
    fillStyle: "" as unknown,
    setTransform() {},
    clearRect() {
      frame.arcs = [];
      frame.rects = 0;
    },
    beginPath() {},
    moveTo() {},
    arc(x: number, y: number, r: number) {
      frame.arcs.push({ x, y, r });
    },
    rect() {
      frame.rects++;
    },
    fill() {
      frame.fills.push(context.fillStyle);
    },
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  return { frame, context };
}

let drawing: ReturnType<typeof fakeContext>;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => drawing.context) as unknown as HTMLCanvasElement["getContext"];
});

function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = { add: (cb) => (callbacks.add(cb), () => callbacks.delete(cb)) };
  const step = () => {
    for (const cb of [...callbacks]) if (!cb(1 / 60)) callbacks.delete(cb);
  };
  return {
    loop,
    step,
    get running() {
      return callbacks.size > 0;
    },
    run: (seconds = 4) => {
      for (let t = 0; t < seconds && callbacks.size; t += 1 / 60) step();
    },
  };
}

let canvas: HTMLCanvasElement;
let frames: ReturnType<typeof manualLoop>;
beforeEach(() => {
  drawing = fakeContext();
  document.body.replaceChildren();
  canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "clientWidth", { value: 400, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: 200, configurable: true });
  canvas.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, toJSON() {} }) as DOMRect;
  document.body.append(canvas);
  frames = manualLoop();
});

const row = (n: number, y = 0) => Array.from({ length: n }, (_, i) => ({ x: i * 10, y }));

describe("particles", () => {
  it("draws the first shape at once, fitted to the canvas", () => {
    particles(canvas, { points: row(5), loop: frames.loop, padding: 0 });
    expect(drawing.frame.arcs).toHaveLength(5);
    // A 40-wide row scaled into 400 × 200, centred: from 0 to 400, at mid height.
    expect(drawing.frame.arcs.map((a) => a.x)).toEqual([0, 100, 200, 300, 400]);
    expect(drawing.frame.arcs.every((a) => a.y === 100 && a.r === 2.5)).toBe(true);
  });

  it("leaves points where they are with fit none", () => {
    particles(canvas, { points: [{ x: 7, y: 9 }], fit: "none", loop: frames.loop });
    expect(drawing.frame.arcs[0]).toMatchObject({ x: 7, y: 9 });
  });

  it("morphs to a new shape, then stops the loop", () => {
    const dots = particles(canvas, { points: row(5), loop: frames.loop, fit: "none" });
    dots.to(row(3, 50));
    expect(dots.count).toBe(3);
    expect(frames.running).toBe(true);
    frames.step();
    // Mid-way: the three kept dots are moving, the two leaving ones still shrinking.
    expect(drawing.frame.arcs).toHaveLength(5);
    frames.run();
    expect(frames.running).toBe(false);
    expect(drawing.frame.arcs.map((a) => a.y)).toEqual([50, 50, 50]);
  });

  it("scatters into a cloud first with transition scatter, then lands on the new shape", () => {
    const dots = particles(canvas, { points: row(12), loop: frames.loop, fit: "none" });
    dots.to(row(12, 80), { transition: { type: "scatter", seed: 3 } });
    for (let n = 0; n < 15; n++) frames.step();
    // Spread out around both shapes, not sliding down in a line.
    const ys = drawing.frame.arcs.map((a) => a.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20);
    frames.run();
    expect(frames.running).toBe(false);
    expect(drawing.frame.arcs.map((a) => a.y)).toEqual(Array(12).fill(80));
  });

  it("goes straight there with reduced motion, even with transition scatter", () => {
    const dots = particles(canvas, { points: row(4), loop: frames.loop, fit: "none", reducedMotion: "always" });
    dots.to(row(4, 30), { transition: "scatter" });
    expect(frames.running).toBe(false);
    expect(drawing.frame.arcs.map((a) => a.y)).toEqual([30, 30, 30, 30]);
  });

  it("jumps with reduced motion", () => {
    const dots = particles(canvas, { points: row(5), loop: frames.loop, fit: "none", reducedMotion: "always" });
    dots.to(row(2, 30));
    expect(frames.running).toBe(false);
    expect(drawing.frame.arcs.map((a) => a.y)).toEqual([30, 30]);
  });

  it("leans away from the pointer, and settles back when it leaves", () => {
    particles(canvas, { points: [{ x: 100, y: 100 }], fit: "none", loop: frames.loop });
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 90, clientY: 100 }));
    frames.run(1);
    expect(drawing.frame.arcs[0]!.x).toBeGreaterThan(100);
    canvas.dispatchEvent(new PointerEvent("pointerleave"));
    frames.run();
    expect(drawing.frame.arcs[0]!.x).toBe(100);
    expect(frames.running).toBe(false);
  });

  it("can ignore the pointer", () => {
    particles(canvas, { points: [{ x: 100, y: 100 }], fit: "none", loop: frames.loop, pointer: false });
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 90, clientY: 100 }));
    expect(frames.running).toBe(false);
  });

  it("doesn't lean under reduced motion", () => {
    particles(canvas, { points: [{ x: 100, y: 100 }], fit: "none", loop: frames.loop, reducedMotion: "always" });
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 90, clientY: 100 }));
    frames.run(1);
    expect(drawing.frame.arcs[0]!.x).toBe(100);
  });

  it("draws squares, in one fill, with the given colour", () => {
    particles(canvas, { points: row(4), loop: frames.loop, shape: "square", color: "tomato" });
    expect(drawing.frame.rects).toBe(4);
    expect(drawing.frame.fills.at(-1)).toBe("tomato");
  });

  it("colours dots by tone from a palette, skipping unused colours", () => {
    const dots = particles(canvas, {
      points: [
        { x: 0, y: 0, tone: 0 },
        { x: 10, y: 0, tone: 1 },
        { x: 20, y: 0, tone: 1 },
      ],
      palette: ["red", "green", "blue"],
      loop: frames.loop,
    });
    expect(drawing.frame.fills).toEqual(["red", "blue"]);
    expect(drawing.frame.arcs).toHaveLength(3);
    // Recolouring springs the tone; it ends on the new colour.
    dots.to([
      { x: 0, y: 0, tone: 0.5 },
      { x: 10, y: 0, tone: 1 },
      { x: 20, y: 0, tone: 1 },
    ]);
    frames.run();
    expect(drawing.frame.arcs).toHaveLength(3);
    expect(drawing.frame.fills.slice(-2)).toEqual(["green", "blue"]);
    expect(() => particles(canvas, { palette: [] })).toThrow(/palette/);
  });

  it("makes a gradient colour once per size", () => {
    let made = 0;
    const dots = particles(canvas, {
      points: row(4),
      loop: frames.loop,
      color: (ctx, size) => {
        made++;
        const g = ctx.createLinearGradient(0, 0, size.width, 0);
        return g;
      },
    });
    dots.to(row(4, 10));
    frames.run();
    expect(made).toBe(1);
  });

  it("labels the canvas for screen readers, and updates the label", () => {
    const dots = particles(canvas, { points: row(2), loop: frames.loop, label: "Hello" });
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe("Hello");
    dots.to(row(3), { label: "World" });
    expect(canvas.getAttribute("aria-label")).toBe("World");
  });

  it("stops and lets go of the pointer when destroyed", () => {
    const dots = particles(canvas, { points: row(2), loop: frames.loop, fit: "none" });
    dots.to(row(2, 40));
    dots.destroy();
    frames.step();
    expect(frames.running).toBe(false);
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 5, clientY: 5 }));
    expect(frames.running).toBe(false);
    dots.to(row(3));
    expect(frames.running).toBe(false);
  });

  it("springs the dot size when a new shape asks for one", () => {
    const dots = particles(canvas, { points: row(2), loop: frames.loop, radius: 3 });
    dots.to(row(2), { radius: 1 });
    frames.step();
    const mid = drawing.frame.arcs[0]!.r;
    expect(mid).toBeLessThan(3);
    expect(mid).toBeGreaterThan(1);
    frames.run();
    expect(drawing.frame.arcs[0]!.r).toBe(1);
    expect(() => dots.to(row(2), { radius: -1 })).toThrow(/radius/);
  });

  it("pairs by position in the list with pairing index, and matches otherwise", () => {
    const backwards = row(3).reverse();
    // Matching: the same three places again, so every dot is already home and nothing moves.
    const matched = particles(canvas, { points: row(3), loop: frames.loop, fit: "none" });
    matched.to(backwards);
    frames.step();
    // Dots are drawn in the new list's order, but none of them moved.
    expect(drawing.frame.arcs.map((a) => a.x).sort((a, b) => a - b)).toEqual([0, 10, 20]);
    matched.destroy();
    frames.run();

    // Index: the first dot heads for the first new point, at the far end, so the ends cross.
    const indexed = particles(canvas, { points: row(3), loop: frames.loop, fit: "none" });
    indexed.to(backwards, { pairing: "index" });
    frames.step();
    // Mid-way, the two end dots have left their places to cross over.
    expect(drawing.frame.arcs.map((a) => a.x).sort((a, b) => a - b)).not.toEqual([0, 10, 20]);
    frames.run();
    expect(drawing.frame.arcs.map((a) => a.x)).toEqual([20, 10, 0]);

    // A different number of points can't be paired by index: it matches instead.
    indexed.to(row(2), { pairing: "index" });
    expect(indexed.count).toBe(2);
    expect(() => indexed.to(row(2), { pairing: "order" as "index" })).toThrow(/pairing/);
  });

  it("rejects bad options", () => {
    expect(() => particles(canvas, { radius: 0 })).toThrow(/radius/);
    expect(() => particles(canvas, { fit: "cover" as "contain" })).toThrow(/fit/);
    const dots = particles(canvas, { points: row(2), loop: frames.loop });
    expect(() => dots.to(row(2), { transition: "explode" as "scatter" })).toThrow(/transition/);
  });
});
