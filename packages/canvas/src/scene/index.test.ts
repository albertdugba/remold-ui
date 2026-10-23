// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { scene, type SceneOptions } from "./index";

/** A 2D context that records calls instead of drawing (happy-dom has no canvas). */
function fakeContext() {
  const calls: string[] = [];
  const gradient = { addColorStop() {} };
  const target: Record<string, unknown> = {};
  return {
    calls,
    context: new Proxy(target, {
      get(t, key: string) {
        if (key in t) return t[key];
        if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
        return (...args: unknown[]) => {
          calls.push(key === "fillText" ? `fillText ${String(args[0])}` : key);
        };
      },
      set(t, key: string, v) {
        t[key] = v;
        return true;
      },
    }),
  };
}

let drawing: ReturnType<typeof fakeContext>;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => drawing.context) as unknown as HTMLCanvasElement["getContext"];
  Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, toJSON() {} } as DOMRect);
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
    run: (seconds = 3) => {
      for (let t = 0; t < seconds && callbacks.size; t += 1 / 60) step();
    },
  };
}

const options = (extra: Partial<SceneOptions> = {}): SceneOptions => ({
  label: "Packages",
  objects: {
    core: { look: "plate", label: "core", description: "Pure maths." },
    react: { look: "chip", label: "react" },
    floor: { look: "grid" },
  },
  layouts: {
    stacked: {
      caption: "One stack.",
      camera: { yaw: 45, pitch: 60 },
      objects: {
        core: { x: -150, y: -150, width: 300, depth: 300 },
        react: { x: -40, y: 220, width: 80, depth: 80 },
        floor: { x: -400, y: -400, width: 800, depth: 800 },
      },
    },
    diagram: {
      camera: "fit",
      objects: { core: { x: 300, y: 0, width: 300, depth: 200 }, react: { x: 0, y: 0, width: 90, depth: 56 } },
    },
  },
  links: [{ from: "react", to: "core", layouts: ["diagram"] }],
  ...extra,
});

let canvas: HTMLCanvasElement;
beforeEach(() => {
  drawing = fakeContext();
  document.body.replaceChildren();
  canvas = document.createElement("canvas");
  document.body.append(canvas);
});

describe("scene fill", () => {
  it("springs each object's fill level between layouts and hands it to the look", () => {
    const seen: number[] = [];
    const jar = {
      defaultHeight: 50,
      outline: (b: { x: number; y: number; width: number; depth: number }) => [
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
        { x: b.x + b.width, y: b.y + b.depth },
      ],
      draw: (_: unknown, st: { fill?: number }) => void seen.push(st.fill ?? -1),
    };
    const frames = manualLoop();
    const s = scene(canvas, {
      label: "Jar",
      loop: frames.loop,
      reducedMotion: "never",
      objects: { jar: { look: jar } },
      layouts: {
        empty: { objects: { jar: { x: 0, y: 0, width: 100, depth: 100 } } },
        full: { objects: { jar: { x: 0, y: 0, width: 100, depth: 100, fill: 0.8 } } },
      },
    });
    expect(seen.at(-1)).toBe(0);
    s.to("full");
    frames.step();
    const mid = seen.at(-1)!;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.8);
    frames.run();
    expect(seen.at(-1)).toBeCloseTo(0.8, 2);
  });
});

describe("scene colour, ghost and onDraw", () => {
  it("springs colour and ghost between layouts, and calls onDraw after each frame", () => {
    const seen: { color?: string; ghost?: number }[] = [];
    const slab = {
      defaultHeight: 20,
      outline: (b: { x: number; y: number; width: number; depth: number }) => [
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
        { x: b.x + b.width, y: b.y + b.depth },
      ],
      draw: (_: unknown, st: { color?: string; ghost?: number }) => void seen.push({ color: st.color, ghost: st.ghost }),
    };
    const frames = manualLoop();
    let drawn = 0;
    const s = scene(canvas, {
      loop: frames.loop,
      reducedMotion: "never",
      onDraw: () => drawn++,
      objects: { slab: { look: slab }, plain: { look: slab } },
      layouts: {
        a: { objects: { slab: { x: 0, y: 0, width: 100, depth: 100, color: "#ff0000" }, plain: { x: 200, y: 0, width: 100, depth: 100 } } },
        b: {
          objects: {
            slab: { x: 0, y: 0, width: 100, depth: 100, color: "#0000ff", ghost: 1 },
            plain: { x: 200, y: 0, width: 100, depth: 100 },
          },
        },
      },
    });
    const last = () => seen.filter((_, i) => i % 2 === 0).at(-1)!;
    expect(last()).toEqual({ color: "rgb(255, 0, 0)", ghost: 0 });
    // An object no layout colours lets its look choose.
    expect(seen.at(-1)!.color).toBeUndefined();
    const before = drawn;
    s.to("b");
    frames.step();
    expect(drawn).toBeGreaterThan(before);
    expect(last().color).not.toBe("rgb(255, 0, 0)");
    frames.run();
    expect(last()).toEqual({ color: "rgb(0, 0, 255)", ghost: 1 });
  });
});

describe("scene delays and arcs", () => {
  const recordingLook = (seen: { z: number; x: number }[]) => ({
    defaultHeight: 10,
    outline: (b: { x: number; y: number; width: number; depth: number }) => [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.depth },
    ],
    draw: (_: unknown, st: { box: { z: number; x: number } }) => void seen.push({ z: st.box.z, x: st.box.x }),
  });
  const box = (x: number, extra: Record<string, number> = {}) => ({ x, y: 0, width: 50, depth: 50, ...extra });

  it("waits out a layout's delay before an object sets off", () => {
    const seen: { z: number; x: number }[] = [];
    const frames = manualLoop();
    const s = scene(canvas, {
      loop: frames.loop,
      reducedMotion: "never",
      objects: { a: { look: recordingLook(seen) } },
      layouts: { here: { objects: { a: box(0) } }, there: { objects: { a: box(300, { delay: 0.5 }) } } },
    });
    s.to("there");
    for (let i = 0; i < 20; i++) frames.step(); // a third of a second
    expect(seen.at(-1)!.x).toBe(0);
    frames.run();
    expect(seen.at(-1)!.x).toBeCloseTo(300, 0);
  });

  it("rises along an arc on the way, and lands at its own height", () => {
    const seen: { z: number; x: number }[] = [];
    const frames = manualLoop();
    const s = scene(canvas, {
      loop: frames.loop,
      reducedMotion: "never",
      objects: { a: { look: recordingLook(seen) } },
      layouts: { here: { objects: { a: box(0) } }, there: { objects: { a: box(400, { arc: 80 }) } } },
    });
    s.to("there");
    frames.run();
    const highest = Math.max(...seen.map((p) => p.z));
    expect(highest).toBeGreaterThan(60);
    expect(seen.at(-1)!.z).toBeCloseTo(0, 0);
  });

  it("changes opacity only after its fadeDelay, while it moves at once", () => {
    const seen: { z: number; x: number }[] = [];
    const alphas: number[] = [];
    const look = {
      ...recordingLook(seen),
      draw: (c: { ctx: CanvasRenderingContext2D }, st: { box: { z: number; x: number } }) => {
        seen.push({ z: st.box.z, x: st.box.x });
        alphas.push(c.ctx.globalAlpha);
      },
    };
    const frames = manualLoop();
    const s = scene(canvas, {
      loop: frames.loop,
      reducedMotion: "never",
      objects: { a: { look } },
      layouts: { here: { objects: { a: box(0) } }, there: { objects: { a: box(300, { opacity: 0, fadeDelay: 0.5 }) } } },
    });
    s.to("there");
    for (let i = 0; i < 20; i++) frames.step();
    // A third of a second in: well on its way, and still fully visible.
    expect(seen.at(-1)!.x).toBeGreaterThan(100);
    expect(alphas.at(-1)).toBeCloseTo(1, 2);
    const drawnBefore = alphas.length;
    frames.run();
    // After the delay it fades: drawn fainter, then not at all.
    expect(Math.min(...alphas.slice(drawnBefore))).toBeLessThan(0.5);
  });

  it("goes straight there, with no wait or arc, under reduced motion", () => {
    const seen: { z: number; x: number }[] = [];
    const frames = manualLoop();
    const s = scene(canvas, {
      loop: frames.loop,
      reducedMotion: "always",
      objects: { a: { look: recordingLook(seen) } },
      layouts: { here: { objects: { a: box(0) } }, there: { objects: { a: box(400, { arc: 80, delay: 1 }) } } },
    });
    s.to("there");
    frames.step();
    expect(seen.at(-1)).toEqual({ x: 400, z: 0 });
  });
});

describe("scene containers", () => {
  it("paints what rests inside a container between the container and its front walls", () => {
    const order: string[] = [];
    const flat = (b: { x: number; y: number; width: number; depth: number }) => [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.depth },
    ];
    const tray = { defaultHeight: 60, outline: flat, draw: () => void order.push("tray"), drawFront: () => void order.push("tray front") };
    const thing = (name: string) => ({ defaultHeight: 20, outline: flat, draw: () => void order.push(name) });
    scene(canvas, {
      loop: manualLoop().loop,
      objects: {
        tray: { look: tray },
        inside: { look: thing("inside") },
        beside: { look: thing("beside") },
        above: { look: thing("above") },
      },
      layouts: {
        only: {
          objects: {
            tray: { x: 0, y: 0, width: 200, depth: 200, height: 60 },
            // Resting on the tray's floor, so held by it.
            inside: { x: 60, y: 60, z: 10, width: 40, depth: 40 },
            // Outside its footprint, and well above its rim: both drawn on their own.
            beside: { x: 400, y: 400, width: 40, depth: 40 },
            above: { x: 60, y: 60, z: 200, width: 40, depth: 40 },
          },
        },
      },
    });
    const at = (name: string) => order.lastIndexOf(name);
    expect(at("tray")).toBeLessThan(at("inside"));
    expect(at("inside")).toBeLessThan(at("tray front"));
    // Only things inside bring the front pass on; it isn't drawn for things beside or above.
    expect(order.filter((x) => x === "tray front")).toHaveLength(1);
    expect(at("above")).toBeGreaterThan(at("tray front"));
  });
});

describe("scene", () => {
  it("draws the first layout straight away, labels included", () => {
    scene(canvas, options({ loop: manualLoop().loop }));
    expect(drawing.calls).toContain("fillText core");
    expect(drawing.calls).toContain("fillText react");
  });

  it("draws links with arrows and labels", () => {
    scene(
      canvas,
      options({
        loop: manualLoop().loop,
        links: [{ from: "react", to: "core", fromPort: "right", toPort: "left", route: "curve", arrow: "end", label: "request" }],
      }),
    );
    expect(drawing.calls).toContain("fillText request");
    // A curve is drawn as many short segments.
    expect(drawing.calls.filter((c) => c === "lineTo").length).toBeGreaterThan(20);
  });

  it("springs to another layout and lands there", () => {
    const frames = manualLoop();
    const s = scene(canvas, options({ loop: frames.loop, reducedMotion: "never" }));
    s.to("diagram");
    frames.step();
    expect(s.box("core")!.x).toBeGreaterThan(-150);
    expect(s.box("core")!.x).toBeLessThan(300);
    frames.run();
    expect(s.box("core")).toMatchObject({ x: 300, y: 0, width: 300, depth: 200 });
    expect(s.layout).toBe("diagram");
  });

  it("is interruptible: going back mid-flight keeps the momentum", () => {
    const frames = manualLoop();
    const s = scene(canvas, options({ loop: frames.loop, reducedMotion: "never" }));
    s.to("diagram");
    for (let i = 0; i < 8; i++) frames.step();
    const x = s.box("core")!.x;
    s.to("stacked");
    expect(s.box("core")!.x).toBe(x);
    frames.step();
    // Still heading towards the diagram for a moment, before turning back.
    expect(s.box("core")!.x).toBeGreaterThan(x);
  });

  it("jumps with reduced motion", () => {
    const s = scene(canvas, options({ loop: manualLoop().loop, reducedMotion: "always" }));
    s.to("diagram");
    expect(s.box("core")!.x).toBe(300);
  });

  it("rejects unknown layouts and objects", () => {
    const s = scene(canvas, options({ loop: manualLoop().loop }));
    expect(() => s.to("nope")).toThrow(RangeError);
    expect(() => s.focus("floor")).toThrow(RangeError);
    expect(() => scene(canvas, options({ links: [{ from: "x", to: "core" }] }))).toThrow(RangeError);
  });

  it("picks the object under a point and focuses it on tap", () => {
    const frames = manualLoop();
    const onFocusChange = vi.fn();
    const s = scene(canvas, options({ loop: frames.loop, onFocusChange }));
    const at = s.anchor("react")!;
    expect(s.pick(at.x, at.y)).toBe("react");
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: at.x, clientY: at.y }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: at.x, clientY: at.y }));
    expect(s.focused).toBe("react");
    expect(onFocusChange).toHaveBeenCalledWith("react");
  });

  it("reports focus changes the user makes, not ones made in code", () => {
    const onFocusChange = vi.fn();
    const s = scene(canvas, options({ loop: manualLoop().loop, onFocusChange }));
    s.focus("core");
    expect(onFocusChange).not.toHaveBeenCalled();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });

  it("lifts the focused object and dims the rest", () => {
    const frames = manualLoop();
    const s = scene(canvas, options({ loop: frames.loop, reducedMotion: "never" }));
    const before = s.box("core")!.z;
    s.focus("core");
    frames.run();
    expect(s.box("core")!.z).toBe(before + 26);
  });

  it("moves focus with the arrow keys and clears it with Escape", () => {
    const s = scene(canvas, options({ loop: manualLoop().loop }));
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(s.focused).not.toBeNull();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(s.focused).toBeNull();
  });

  it("describes the layout and the focused object for screen readers", () => {
    const s = scene(canvas, options({ loop: manualLoop().loop }));
    const description = document.getElementById(canvas.getAttribute("aria-describedby")!)!;
    expect(canvas.getAttribute("aria-label")).toBe("Packages");
    expect(description.textContent).toBe("stacked. One stack.");
    s.focus("core");
    expect(description.textContent).toBe("core: Pure maths.");
  });

  it("turns when dragged, and keeps turning after a flick", () => {
    const frames = manualLoop();
    const s = scene(canvas, options({ loop: frames.loop, reducedMotion: "never" }));
    const before = s.anchor("react")!;
    // Fixed timestamps, 16 ms apart: real ones depend on how busy the machine is, and a pause of
    // more than 50 ms before letting go rightly counts as no flick at all.
    const at = (type: string, clientX: number, time: number) => {
      const event = new PointerEvent(type, { clientX, clientY: 700 });
      Object.defineProperty(event, "timeStamp", { value: time });
      canvas.dispatchEvent(event);
    };
    at("pointerdown", 100, 0);
    for (let i = 1; i <= 5; i++) at("pointermove", 100 + i * 30, i * 16);
    const during = s.anchor("react")!;
    expect(during.x).not.toBeCloseTo(before.x);
    at("pointerup", 250, 96);
    frames.run();
    expect(s.anchor("react")!.x).not.toBeCloseTo(before.x);
  });

  it("morphs a point cloud keylessly", () => {
    const frames = manualLoop();
    const s = scene(
      canvas,
      options({ loop: frames.loop, reducedMotion: "never", objects: {}, links: [], layouts: { only: { objects: {} } } }),
    );
    const fills = () => {
      drawing.calls.length = 0;
      s.render();
      return drawing.calls.filter((c) => c === "fill").length;
    };
    s.points([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 80, y: 0 },
    ]);
    frames.run();
    // Each cube is two fills: its sides and its top.
    expect(fills()).toBe(6);
    s.points([
      { x: 0, y: 10 },
      { x: 40, y: 10 },
    ]);
    frames.run();
    expect(fills()).toBe(4);
  });

  it("cleans up after itself", () => {
    const s = scene(canvas, options({ loop: manualLoop().loop }));
    s.destroy();
    expect(canvas.hasAttribute("aria-describedby")).toBe(false);
    expect(document.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("shapes", () => {
  const STAR = "M50 0L61 38H100L69 60L80 100L50 76L20 100L31 60L0 38H39Z";
  const square = "M0 0H100V100H0Z";

  /** A look that records the outline it's asked to draw. */
  function recording() {
    const seen: (string | undefined)[] = [];
    const look = {
      defaultHeight: 10,
      path: square,
      outline: (b: { x: number; y: number; width: number; depth: number }) => [
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
        { x: b.x + b.width, y: b.y + b.depth },
      ],
      draw: (_: unknown, state: { shape?: string }) => void seen.push(state.shape),
    };
    return { look, seen };
  }

  it("morphs an object's outline from one layout's shape to the next", () => {
    drawing = fakeContext();
    const frames = manualLoop();
    const { look, seen } = recording();
    const s = scene(document.createElement("canvas"), {
      objects: { piece: { look } },
      layouts: {
        plain: { objects: { piece: { x: 0, y: 0, width: 100, depth: 100 } } },
        star: { objects: { piece: { x: 0, y: 0, width: 100, depth: 100, shape: STAR } } },
      },
      loop: frames.loop,
      reducedMotion: "never",
    });
    expect(seen.at(-1)).toBeUndefined();
    s.to("star");
    frames.step();
    frames.step();
    const midway = seen.at(-1);
    expect(midway).toBeTypeOf("string");
    frames.run(3);
    const settled = seen.at(-1)!;
    expect(settled).not.toBe(midway);
    // At rest it's the star: at least its ten edges, as the curves a morph is made of.
    expect(settled.match(/C/g)?.length ?? 0).toBeGreaterThanOrEqual(10);
    s.destroy();
  });

  it("jumps to the new shape with reduced motion", () => {
    drawing = fakeContext();
    const frames = manualLoop();
    const { look, seen } = recording();
    const s = scene(document.createElement("canvas"), {
      objects: { piece: { look } },
      layouts: {
        plain: { objects: { piece: { x: 0, y: 0, width: 100, depth: 100 } } },
        star: { objects: { piece: { x: 0, y: 0, width: 100, depth: 100, shape: STAR } } },
      },
      loop: frames.loop,
      reducedMotion: "always",
    });
    s.to("star");
    frames.step();
    const first = seen.at(-1);
    frames.run(1);
    expect(seen.at(-1)).toBe(first);
    s.destroy();
  });
});

describe("drawing cost", () => {
  it("stops redrawing solids once only the dots on flowing links move", () => {
    drawing = fakeContext();
    const frames = manualLoop();
    let draws = 0;
    const look = {
      defaultHeight: 10,
      outline: (b: { x: number; y: number; width: number; depth: number }) => [
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
        { x: b.x + b.width, y: b.y + b.depth },
      ],
      draw: () => void draws++,
    };
    const s = scene(document.createElement("canvas"), {
      objects: { a: { look }, b: { look } },
      layouts: { only: { objects: { a: { x: -200, y: 0, width: 80, depth: 80 }, b: { x: 200, y: 0, width: 80, depth: 80 } } } },
      links: [{ from: "a", to: "b", flow: true }],
      loop: frames.loop,
      reducedMotion: "never",
    });
    frames.run(2);
    const settled = draws;
    for (let i = 0; i < 60; i++) frames.step();
    // The dots kept moving for a second, but the two solids weren't drawn again.
    expect(draws).toBe(settled);
    // A change (hovering, a new layout) draws them again.
    s.focus("a");
    frames.step();
    expect(draws).toBeGreaterThan(settled);
    s.destroy();
  });
});
