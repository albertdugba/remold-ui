import { describe, expect, it } from "vitest";
import { iso, projector } from "../camera";
import { caption, extrude, inkLines, outlineArea, parseColor, shapeRings, walls } from "./index";
import { roundedRect } from "../geometry";

const view = projector(iso(), { width: 800, height: 800 });
const STAR = "M50 0L61 38H100L69 60L80 100L50 76L20 100L31 60L0 38H39Z";
const RING = "M0 50a50 50 0 1 0 100 0a50 50 0 1 0-100 0ZM30 50a20 20 0 1 0 40 0a20 20 0 1 0-40 0Z";

describe("shapeRings", () => {
  it("stretches a path to fill the footprint", () => {
    const { outer, holes } = shapeRings({ path: STAR }, { x: 100, y: 200, width: 300, depth: 150 });
    const xs = outer.map((p) => p.x);
    const ys = outer.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(100);
    expect(Math.max(...xs)).toBeCloseTo(400);
    expect(Math.min(...ys)).toBeCloseTo(200);
    expect(Math.max(...ys)).toBeCloseTo(350);
    expect(holes).toEqual([]);
  });

  it("treats outlines inside the body as holes, whichever order they come in", () => {
    const { outer, holes } = shapeRings({ path: RING }, { x: 0, y: 0, width: 100, depth: 100 });
    expect(holes).toHaveLength(1);
    expect(Math.abs(outlineArea(outer))).toBeGreaterThan(Math.abs(outlineArea(holes[0]!)));
  });

  it("explains a path with nothing to extrude", () => {
    expect(() => extrude({ shape: { path: "M0 0" } })).toThrow(/no closed shape/);
  });
});

describe("walls", () => {
  const square = roundedRect({ x: -100, y: -100, width: 200, depth: 200, radius: 0 });
  const centre = view.depth(0, 0);

  it("shows only the walls facing the viewer, far to near", () => {
    const shown = walls({ outline: square, z0: 0, z1: 40, view });
    // An isometric view of a box shows two of its four sides.
    expect(shown).toHaveLength(2);
    for (const w of shown) expect(w.depth).toBeGreaterThan(centre);
    expect(shown[0]!.depth).toBeLessThanOrEqual(shown[1]!.depth);
  });

  it("gives the same walls whichever way the outline runs", () => {
    const reversed = [...square].reverse();
    const a = walls({ outline: square, z0: 0, z1: 40, view }).map((w) => Math.round(w.depth));
    const b = walls({ outline: reversed, z0: 0, z1: 40, view }).map((w) => Math.round(w.depth));
    expect(b).toEqual(a);
  });

  it("shows the far walls of a hole, facing into it", () => {
    const shown = walls({ outline: square, z0: 0, z1: 40, view, inward: true });
    expect(shown).toHaveLength(2);
    for (const w of shown) expect(w.depth).toBeLessThan(centre);
  });

  it("lights one side and shades the other", () => {
    const lights = walls({ outline: square, z0: 0, z1: 40, view })
      .map((w) => w.light)
      .sort((a, b) => a - b);
    expect(lights[0]!).toBeLessThan(0);
    expect(lights[1]!).toBeGreaterThan(0);
  });

  it("shows the walls inside a star's points too, not just its outer hull", () => {
    const { outer } = shapeRings({ path: STAR }, { x: -200, y: -200, width: 400, depth: 400 });
    // A convex hull would show at most about half of the hull's edges; the star's ten sides
    // include inward-facing notches, several of which face the viewer.
    expect(walls({ outline: outer, z0: 0, z1: 30, view }).length).toBeGreaterThanOrEqual(4);
  });

  it("draws nothing for a flat shape", () => {
    expect(walls({ outline: square, z0: 10, z1: 10, view })).toEqual([]);
  });
});

describe("looks", () => {
  it("are passive when asked, and captions always are", () => {
    expect(extrude({ passive: true }).passive).toBe(true);
    expect(extrude().passive).toBeUndefined();
    expect(caption.passive).toBe(true);
  });

  it("use the given thickness by default", () => {
    expect(extrude({ height: 40 }).defaultHeight).toBe(40);
    expect(extrude().defaultHeight).toBe(16);
  });
});

describe("inkLines", () => {
  const square = roundedRect({ x: 0, y: 0, width: 100, depth: 100, radius: 0 });
  const rounded = roundedRect({ x: 0, y: 0, width: 100, depth: 100, radius: 20 });
  const uprights = (lines: ReturnType<typeof inkLines>) => lines.filter(([p, q]) => Math.abs(p.x - q.x) < 1e-6 && p.y !== q.y);

  it("inks the base of every wall you see, and three uprights on a box: both edges and the front corner", () => {
    const lines = inkLines({ outline: square, z0: 0, z1: 40, view });
    expect(lines.length - uprights(lines).length).toBe(walls({ outline: square, z0: 0, z1: 40, view }).length);
    expect(uprights(lines)).toHaveLength(3);
  });

  it("leaves rounded corners without uprights, apart from the two edges of the silhouette", () => {
    expect(uprights(inkLines({ outline: rounded, z0: 0, z1: 40, view }))).toHaveLength(2);
  });

  it("can leave the uprights out, for a line round the walls", () => {
    expect(uprights(inkLines({ outline: square, z0: 0, z1: 40, view, inward: false, uprights: false }))).toHaveLength(0);
  });

  it("draws nothing for something with no height", () => {
    expect(inkLines({ outline: square, z0: 10, z1: 10, view })).toEqual([]);
  });
});

describe("parseColor", () => {
  it("reads hex, short hex, rgb() and the palettes' bare triples", () => {
    expect(parseColor("#6d4aff")).toEqual([109, 74, 255]);
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
    expect(parseColor("109, 74, 255")).toEqual([109, 74, 255]);
  });
});

describe("extrude with ink and glass", () => {
  /** A context that records what was stroked and filled, and with which styles. */
  function recorder() {
    const calls: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, key) => {
        if (key in target) return target[key as string];
        if (key === "createLinearGradient") return () => ({ addColorStop() {} });
        return (..._: unknown[]) =>
          calls.push(
            String(key) +
              (key === "stroke" || key === "fill" ? `:${String(target.strokeStyle ?? "")}|${String(target.fillStyle ?? "")}` : ""),
          );
      },
      set: (target, key, value) => ((target[key as string] = value), true),
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }
  const state = (fill?: number) => ({
    box: { x: 0, y: 0, z: 0, width: 200, depth: 200, height: 120 },
    label: "",
    palette: { top: "#ffffff", sides: ["#e7e8ec", "#f3f4f6", "#ffffff"] as const, line: "17, 17, 20", glow: "109, 74, 255", text: "#111" },
    glow: 0,
    fill,
  });

  it("strokes in the ink colour when inked", () => {
    const { ctx, calls } = recorder();
    extrude({ ink: true }).draw({ ctx, view, pixelRatio: 1 }, state());
    expect(calls.some((c) => c.startsWith("stroke:rgb(17, 17, 20)"))).toBe(true);
  });

  it("shows what glass holds only when the layout fills it", () => {
    const fillColor = "#6d4aff";
    const draw = (fill?: number) => {
      const { ctx, calls } = recorder();
      extrude({ glass: true, ink: true, fillColor }).draw({ ctx, view, pixelRatio: 1 }, state(fill));
      // The contents are lit versions of the fill colour: violet, so blue is the largest channel.
      return calls.filter(
        (c) =>
          c.startsWith("fill:") &&
          /\|rgb\((\d+), (\d+), (\d+)\)$/.test(c) &&
          (() => {
            const [, r, , b] = /rgb\((\d+), (\d+), (\d+)\)$/.exec(c)!.map(Number);
            return b! - r! > 60;
          })(),
      ).length;
    };
    expect(draw(0)).toBe(0);
    expect(draw(0.5)).toBeGreaterThan(0);
  });
});
