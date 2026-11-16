// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClock } from "./clock";
import { looks } from "../object-looks";
import { diagram, lineSkin, story, type DiagramOptions } from "./index";
import { outAndBack, pathLength, pointAlong } from "./path";

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
        if (key === "measureText") return (text: string) => ({ width: text.length * 7 });
        return (...args: unknown[]) => {
          calls.push(key === "fillText" ? `fillText ${String(args[0])}` : key);
        };
      },
      set(t, key: string, value) {
        t[key] = value;
        return true;
      },
    }),
  };
}

let drawing: ReturnType<typeof fakeContext>;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => drawing.context) as unknown as HTMLCanvasElement["getContext"];
  Element.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, toJSON() {} }) as DOMRect;
  globalThis.Path2D ??= class {
    addPath() {}
  } as unknown as typeof Path2D;
});

function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = { add: (callback) => (callbacks.add(callback), () => callbacks.delete(callback)) };
  const step = () => {
    for (const callback of [...callbacks]) if (!callback(1 / 60)) callbacks.delete(callback);
  };

  return {
    loop,
    get active() {
      return callbacks.size > 0;
    },
    run: async (seconds: number) => {
      for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
        step();
        await Promise.resolve();
      }
    },
  };
}

let canvas: HTMLCanvasElement;
let frames: ReturnType<typeof manualLoop>;

const options = (extra: Partial<DiagramOptions> = {}): DiagramOptions => ({
  label: "Webhook delivery",
  nodes: {
    app: { look: "browser", label: "Your app", at: [-300, 0] },
    queue: { look: "queue", label: "Queue", at: [0, 0], size: [160, 90] },
    hook: { look: "server", label: "customer.com", at: [300, 0] },
  },
  links: [
    ["app", "queue"],
    ["queue", "hook"],
  ],
  loop: frames.loop,
  reducedMotion: "never",
  ...extra,
});

const texts = () => drawing.calls.filter((call) => call.startsWith("fillText "));

beforeEach(() => {
  drawing = fakeContext();
  frames = manualLoop();
  document.body.replaceChildren();
  canvas = document.createElement("canvas");
  document.body.append(canvas);
});

describe("path", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("measures and walks a polyline", () => {
    expect(pathLength(line)).toBe(20);
    expect(pointAlong(line, 0.25)).toEqual({ x: 5, y: 0 });
    expect(pointAlong(line, 0.75)).toEqual({ x: 10, y: 5 });
    expect(pointAlong(line, 2)).toEqual({ x: 10, y: 10 });
    expect(pointAlong([], 0.5)).toEqual({ x: 0, y: 0 });
  });

  it("goes out and back", () => {
    expect(outAndBack(0)).toBe(0);
    expect(outAndBack(0.5)).toBe(0.5);
    expect(outAndBack(1)).toBeCloseTo(0);
  });
});

describe("clock", () => {
  it("resolves timers as time passes, and not while paused", async () => {
    const clock = createClock();
    let done = false;

    void clock.after(1).then(() => (done = true));
    clock.pause();
    clock.advance(2);
    await Promise.resolve();
    expect(done).toBe(false);

    clock.resume();
    clock.advance(1);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it("rejects waiting timers with an AbortError when cancelled", async () => {
    const clock = createClock();
    const waiting = clock.after(5);

    clock.cancel();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    expect(clock.waiting).toBe(false);
  });
});

describe("diagram", () => {
  it("needs at least one node", () => {
    expect(() => diagram(canvas, options({ nodes: {} }))).toThrow(RangeError);
  });

  it("draws every node's label as readable text", () => {
    diagram(canvas, options());

    expect(texts()).toEqual(expect.arrayContaining(["fillText Your app", "fillText Queue", "fillText customer.com"]));
  });

  it("refuses to send between nodes that aren't linked, or that don't exist", () => {
    const flow = diagram(canvas, options());

    expect(() => flow.send("app", "hook")).toThrow(/no link between "app" and "hook"/);
    expect(() => flow.status("nope", "ok")).toThrow(/unknown node "nope"/);
  });

  it("sends a packet either way along a link and resolves when it arrives", async () => {
    const flow = diagram(canvas, options());
    let arrived = false;

    void flow.send("hook", "queue", { label: "invoice.paid", duration: 0.5 }).then(() => (arrived = true));
    await frames.run(0.3);
    expect(arrived).toBe(false);
    expect(texts()).toContain("fillText invoice.paid");

    await frames.run(0.4);
    expect(arrived).toBe(true);
  });

  it("counts down above a node, a second at a time", async () => {
    const flow = diagram(canvas, options());
    const done = flow.countdown("queue", 2, { format: (seconds) => `Retry in ${seconds}s` });

    await frames.run(0.1);
    expect(texts()).toContain("fillText Retry in 2s");

    await frames.run(1.1);
    expect(texts()).toContain("fillText Retry in 1s");

    await frames.run(1);
    await expect(done).resolves.toBeUndefined();
  });

  it("stops the clock while paused", async () => {
    const flow = diagram(canvas, options());
    let waited = false;

    void flow.wait(0.5).then(() => (waited = true));
    flow.pause();
    await frames.run(1);
    expect(waited).toBe(false);
    expect(flow.paused).toBe(true);

    flow.resume();
    await frames.run(0.6);
    expect(waited).toBe(true);
  });

  it("keeps animating while a node is failing, and settles once it recovers", async () => {
    const flow = diagram(canvas, options());

    flow.status("hook", "error");
    await frames.run(1);
    expect(frames.active).toBe(true);

    flow.status("hook", "ok");
    await frames.run(1);
    expect(frames.active).toBe(false);
  });

  it("cancels everything in flight on reset", async () => {
    const flow = diagram(canvas, options());
    const trip = flow.send("app", "queue");
    const wait = flow.wait(3);

    flow.status("queue", "error");
    flow.reset();

    await expect(trip).rejects.toMatchObject({ name: "AbortError" });
    await expect(wait).rejects.toMatchObject({ name: "AbortError" });
  });

  it("brings hidden nodes in and moves nodes through the scene", () => {
    const flow = diagram(canvas, options({ nodes: { ...options().nodes, backup: { label: "Backup", at: [300, 200], hidden: true } } }));

    expect(texts()).not.toContain("fillText Backup");

    flow.show("backup");
    flow.move("backup", [300, 260]);
    expect(flow.scene.layout).toBe("live");
  });
});

describe("stacks", () => {
  const stacked = () =>
    options({
      nodes: {
        ui: { label: "UI", at: [0, 0], size: 200, z: 28, labelSide: "right" },
        data: { label: "Database", at: [0, 0], size: 200, labelSide: "right" },
      },
      links: [],
    });

  it("lifts a node to a new height", async () => {
    const flow = diagram(canvas, stacked());

    expect(flow.scene.box("ui")!.z).toBeCloseTo(28);

    flow.lift("ui", 120);
    await frames.run(2);
    expect(flow.scene.box("ui")!.z).toBeCloseTo(120, 0);
  });

  it("moves a node on an arc that rises mid-flight and lands flat", async () => {
    const flow = diagram(canvas, stacked());
    let highest = 0;

    flow.move("ui", [400, 0], { arc: 150 });

    for (let step = 0; step < 90; step++) {
      await frames.run(1 / 60);
      highest = Math.max(highest, flow.scene.box("ui")!.z);
    }

    expect(highest).toBeGreaterThan(100);
    expect(flow.scene.box("ui")!.z).toBeCloseTo(28, 0);
  });

  it("labels stacked nodes off to the side, and highlights one at a time", () => {
    const flow = diagram(canvas, stacked());

    expect(texts()).toEqual(expect.arrayContaining(["fillText UI", "fillText Database"]));
    expect(() => flow.highlight("nope")).toThrow(/unknown node "nope"/);

    flow.highlight("ui");
    flow.highlight(null);
  });
});

describe("light", () => {
  it("fills many nodes at once, then settles, and refuses unknown ones", async () => {
    const flow = diagram(canvas, options());

    flow.light(["app", "queue"], "on");
    flow.light("hook", "error");
    await frames.run(0.1);
    expect(frames.active).toBe(true);
    expect(drawing.calls).toContain("fill");

    await frames.run(1);
    expect(frames.active).toBe(false);
    expect(() => flow.light(["app", "nope"], "on")).toThrow(/unknown node "nope"/);

    flow.light(["app", "queue", "hook"], null);
  });
});

describe("off screen", () => {
  it("stops its clock while scrolled out of view, and carries on when it's back", async () => {
    let report: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
    const original = globalThis.IntersectionObserver;

    globalThis.IntersectionObserver = class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        report = callback;
      }

      observe() {}

      disconnect() {}
    } as unknown as typeof IntersectionObserver;

    try {
      const flow = diagram(canvas, options());
      let waited = false;

      void flow.wait(0.5).then(() => (waited = true));
      report?.([{ isIntersecting: false }]);
      await frames.run(1);
      expect(waited).toBe(false);

      report?.([{ isIntersecting: true }]);
      await frames.run(0.6);
      expect(waited).toBe(true);
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });
});

describe("story", () => {
  it("plays a script once, and stops cleanly midway", async () => {
    const flow = diagram(canvas, options());
    const steps: string[] = [];
    const told = story(
      flow,
      async (target) => {
        steps.push("start");
        await target.send("app", "queue", { duration: 0.2 });
        steps.push("queued");
        await target.wait(5);
        steps.push("never");
      },
      { loop: false },
    );

    told.play();
    expect(told.playing).toBe(true);

    await frames.run(0.4);
    expect(steps).toEqual(["start", "queued"]);

    told.stop();
    await frames.run(0.1);
    expect(told.playing).toBe(false);
    expect(steps).toEqual(["start", "queued"]);
  });

  it("loops after a rest, and replay starts over", async () => {
    const flow = diagram(canvas, options());
    let runs = 0;
    const told = story(
      flow,
      async (target) => {
        runs += 1;
        await target.wait(0.2);
      },
      { gap: 0.2 },
    );

    told.play();
    await frames.run(0.9);
    expect(runs).toBeGreaterThanOrEqual(2);

    const before = runs;

    told.replay();
    await Promise.resolve();
    expect(runs).toBe(before + 1);
  });
});

describe("line skin", () => {
  it("redraws the built-in shapes as line art, once each, and leaves the rest alone", () => {
    const skin = lineSkin({ ink: "#ff6a00" });
    const custom = { ...looks.plate };

    expect(skin.look("server")).not.toBe(looks.server);
    expect(skin.look("server")).toBe(skin.look("server"));
    expect(skin.look("grid")).toBe(looks.grid);
    expect(skin.look(custom)).toBe(custom);
    expect(skin.style).toBe("line");
  });

  it("draws everything in one ink mixed into the paper, apart from failures", () => {
    const skin = lineSkin({ ink: "#ffffff", paper: "#000000", strength: 0.5 });

    expect(skin.palette.top).toBe("#000000");
    expect(skin.palette.line).toBe("128, 128, 128");
    expect(skin.colors.packet).toBe("255, 255, 255");
    expect(skin.colors.error).not.toBe(skin.colors.ok);
  });

  it("gives moving and live things one accent, while the drawing stays in the ink", () => {
    const skin = lineSkin({ ink: "#18181b", paper: "#ffffff", accent: "124, 92, 255" });

    expect(skin.colors.packet).toBe("124, 92, 255");
    expect(skin.colors.ok).toBe("124, 92, 255");
    expect(skin.colors.pending).toBe("124, 92, 255");
    expect(skin.palette.line).not.toBe("124, 92, 255");
  });

  it("wins over the diagram's own colours and still labels every node", () => {
    const flow = diagram(canvas, options({ skin: lineSkin(), colors: { label: "#123456" } }));

    expect(texts()).toEqual(expect.arrayContaining(["fillText Your app", "fillText customer.com"]));
    flow.destroy();
  });
});
