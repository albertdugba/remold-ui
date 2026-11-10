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

  it("fits a shared frame rather than each shape's bounds", () => {
    // A 100 × 50 frame in a 400 × 200 canvas: four times bigger, so (10, 50) lands at (40, 200).
    particles(canvas, { points: [{ x: 10, y: 50 }, { x: 10, y: 40 }], fit: { width: 100, height: 50 }, padding: 0, loop: frames.loop });
    expect(drawing.frame.arcs.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 40, y: 200 },
      { x: 40, y: 160 },
    ]);
  });

  it("rejects a frame without a size", () => {
    expect(() => particles(canvas, { fit: { width: 0, height: 10 }, loop: frames.loop })).toThrow(/frame/);
  });

  it("resolves settled() at once when still, and only once a change has played out", async () => {
    const dots = particles(canvas, { points: row(5), loop: frames.loop, fit: "none" });
    await dots.settled();
    dots.to(row(5, 40), { pairing: "index" });
    let done = false;
    void dots.settled().then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    frames.run();
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it("paints var(--name) palette colours from the canvas's styles, and again when the theme changes", async () => {
    canvas.style.setProperty("--dot", "#123456");
    particles(canvas, { points: row(3), palette: ["var(--dot)"], loop: frames.loop });
    expect(drawing.frame.fills.at(-1)).toBe("#123456");
    canvas.style.setProperty("--dot", "#abcdef");
    document.documentElement.classList.toggle("dark");
    await new Promise((resolve) => setTimeout(resolve));
    expect(drawing.frame.fills.at(-1)).toBe("#abcdef");
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

describe("particles with a camera", () => {
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => ({ x: x * 10, y: y * 10, z: z * 10 }))));

  it("draws nearer points bigger than farther ones", () => {
    particles(canvas, {
      points: [
        { x: 0, y: 0, z: 20 },
        { x: 0, y: 0, z: -20 },
      ],
      camera: { spin: 0, tilt: 0 },
      loop: frames.loop,
    });
    const [near, far] = drawing.frame.arcs;
    expect(near!.r).toBeGreaterThan(2.5);
    expect(far!.r).toBeLessThan(2.5);
  });

  it("keeps a contained shape inside the canvas at every angle", () => {
    particles(canvas, { points: corners, camera: { spin: 0.5, tilt: 35, distance: 2 }, padding: 0, loop: frames.loop });
    for (let n = 0; n < 120; n++) {
      frames.step();
      for (const { x, y } of drawing.frame.arcs) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(400);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(200);
      }
    }
  });

  it("turns while it spins, and keeps drawing", () => {
    particles(canvas, { points: corners, camera: { spin: 0.25 }, loop: frames.loop });
    const before = drawing.frame.arcs.map(({ x }) => x);
    frames.step();
    frames.step();
    expect(drawing.frame.arcs.map(({ x }) => x)).not.toEqual(before);
    expect(frames.running).toBe(true);
  });

  it("holds still with reduced motion", () => {
    particles(canvas, { points: corners, camera: { spin: 0.25 }, reducedMotion: "always", loop: frames.loop });
    expect(frames.running).toBe(false);
  });

  it("settles once the shape stops, even while the camera turns", async () => {
    const dots = particles(canvas, { points: corners, camera: { spin: 0.25 }, loop: frames.loop });
    dots.to(corners.map((point) => ({ ...point, z: -point.z })), { pairing: "index" });
    let done = false;
    void dots.settled().then(() => (done = true));
    frames.run(4);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(frames.running).toBe(true);
  });

  it("refuses a camera with a frame fit, or too close", () => {
    expect(() => particles(canvas, { camera: {}, fit: { width: 10, height: 10 } })).toThrow(RangeError);
    expect(() => particles(canvas, { camera: { distance: 1 } })).toThrow(RangeError);
    expect(() => particles(canvas, { camera: { spin: Number.NaN } })).toThrow(RangeError);
  });

  it("refuses an unknown blend", () => {
    expect(() => particles(canvas, { blend: "screen" as "add" })).toThrow(RangeError);
  });
});

describe("particles setCamera", () => {
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => ({ x: x * 10, y: y * 10, z: z * 10 }))));

  it("stops and restarts the turning, carrying on from the same angle", () => {
    const dots = particles(canvas, { points: corners, camera: { spin: 0.25 }, loop: frames.loop });
    frames.step();
    dots.setCamera({ spin: 0 });
    const held = drawing.frame.arcs.map(({ x }) => x);
    frames.step();
    expect(frames.running).toBe(false);
    expect(drawing.frame.arcs.map(({ x }) => x)).toEqual(held);
    dots.setCamera({ spin: 0.25 });
    expect(frames.running).toBe(true);
  });

  it("needs a cloud made with a camera", () => {
    const dots = particles(canvas, { points: corners, loop: frames.loop });
    expect(() => dots.setCamera({ spin: 0 })).toThrow();
  });
});

describe("particles with named tones and flow", () => {
  it("colours points by name from a named palette", () => {
    particles(canvas, {
      points: [
        { x: 0, y: 0, tone: "sky" },
        { x: 10, y: 0, tone: "sun" },
      ],
      palette: { sky: "#0ea5e9", sun: "#fbbf24" },
      loop: frames.loop,
    });
    expect(drawing.frame.fills).toEqual(expect.arrayContaining(["#0ea5e9", "#fbbf24"]));
  });

  it("says which names a palette has when a point asks for another", () => {
    expect(() => particles(canvas, { points: [{ x: 0, y: 0, tone: "moon" }], palette: { sky: "#0ea5e9" } })).toThrow(/"sky"/);
    expect(() => particles(canvas, { points: [{ x: 0, y: 0, tone: "moon" }], palette: ["#000"] })).toThrow(RangeError);
  });

  it("flows each dot to the point at the same place along the next shape", () => {
    // A row left to right becomes a column ordered bottom to top: the leftmost dot (first along
    // the row) heads for the bottom (first along the column), the rightmost for the top.
    const dots = particles(canvas, { points: row(5), padding: 0, fit: "none", loop: frames.loop });
    dots.to(
      [40, 30, 20, 10, 0].map((y) => ({ x: 0, y, order: (40 - y) / 40 })),
      { pairing: "flow" },
    );
    frames.step();
    const [bottom, , , , top] = drawing.frame.arcs;
    expect(bottom!.x).toBeLessThan(5);
    expect(top!.x).toBeGreaterThan(35);
  });

  it("takes true for the default camera", () => {
    particles(canvas, { points: [{ x: 0, y: 0, z: 1 }], camera: true, loop: frames.loop });
    expect(frames.running).toBe(true);
  });
});

describe("particles setPalette", () => {
  it("swaps the colours, and later shapes can name the new ones", () => {
    const dots = particles(canvas, { points: [{ x: 0, y: 0 }], palette: ["#111111"], loop: frames.loop });
    dots.setPalette({ moss: "#4d7c0f", sand: "#fcd34d" });
    expect(drawing.frame.fills).toContain("#4d7c0f");
    dots.to([{ x: 0, y: 0, tone: "sand" }]);
    frames.run();
    expect(drawing.frame.fills.at(-1)).toBe("#fcd34d");
    expect(() => dots.setPalette([])).toThrow(RangeError);
  });
});

describe("particles with a swaying camera", () => {
  it("swings either side of its angle instead of turning all the way round", () => {
    const flat = [-1, 1].flatMap((x) => [-1, 1].map((y) => ({ x: x * 10, y: y * 10, z: 0 })));
    particles(canvas, { points: flat, camera: { spin: 0.5, sway: 20, tilt: 0 }, padding: 0, loop: frames.loop });
    const widths: number[] = [];
    for (let n = 0; n < 240; n++) {
      frames.step();
      const xs = drawing.frame.arcs.map(({ x }) => x);
      widths.push(Math.max(...xs) - Math.min(...xs));
    }
    // Never edge-on: at 20 degrees the square keeps most of its width.
    const widest = Math.max(...widths);
    expect(Math.min(...widths)).toBeGreaterThan(widest * 0.85);
  });
});
