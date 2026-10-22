import { describe, expect, it } from "vitest";
import { bounds } from "./measure";
import { toCubics } from "./normalize";
import { parsePath } from "./parse";
import { shapeToPath, shapesToPath } from "./shapes";

/** Where a path's outline actually goes, to check a shape covers the right box. */
const boxOf = (d: string) => bounds(toCubics(parsePath(d)))!;

describe("shapeToPath", () => {
  it("passes a path's data through", () => {
    expect(shapeToPath("path", { d: " M2 2L22 22 " })).toBe("M2 2L22 22");
  });

  it("draws a circle as two half arcs, clockwise from its right-hand point", () => {
    expect(shapeToPath("circle", { cx: 12, cy: 12, r: 10 })).toBe("M22 12A10 10 0 0 1 2 12A10 10 0 0 1 22 12Z");
    expect(boxOf(shapeToPath("circle", { cx: 12, cy: 12, r: 10 }))).toMatchObject({ x: 2, width: 20 });
  });

  it("reads attributes given as strings, with or without px", () => {
    expect(shapeToPath("circle", { cx: "12", cy: "12px", r: "4" })).toBe("M16 12A4 4 0 0 1 8 12A4 4 0 0 1 16 12Z");
  });

  it("draws an ellipse with its own two radii", () => {
    const box = boxOf(shapeToPath("ellipse", { cx: 12, cy: 12, rx: 10, ry: 4 }));
    expect(box.x).toBeCloseTo(2);
    expect(box.y + box.height).toBeCloseTo(16);
  });

  it("draws a plain rectangle with four straight sides", () => {
    expect(shapeToPath("rect", { x: 3, y: 4, width: 18, height: 16 })).toBe("M3 4H21V20H3Z");
  });

  it("rounds a rectangle's corners, using rx for ry when only one is given", () => {
    const d = shapeToPath("rect", { x: 2, y: 2, width: 20, height: 20, rx: 4 });
    expect(d).toBe("M6 2H18A4 4 0 0 1 22 6V18A4 4 0 0 1 18 22H6A4 4 0 0 1 2 18V6A4 4 0 0 1 6 2Z");
    expect(shapeToPath("rect", { x: 2, y: 2, width: 20, height: 20, ry: 4 })).toBe(d);
  });

  it("clamps corner radii to half the rectangle, so a pill stays a pill", () => {
    const box = boxOf(shapeToPath("rect", { x: 0, y: 0, width: 20, height: 8, rx: 99 }));
    expect(box).toMatchObject({ x: 0, width: 20 });
    expect(box.height).toBeCloseTo(8);
  });

  it("draws lines, polylines and closed polygons", () => {
    expect(shapeToPath("line", { x1: 4, y1: 4, x2: 20, y2: 20 })).toBe("M4 4L20 20");
    expect(shapeToPath("polyline", { points: "4,12 10,18 20,6" })).toBe("M4 12L10 18L20 6");
    expect(shapeToPath("polygon", { points: "12 2 22 22 2 22" })).toBe("M12 2L22 22L2 22Z");
  });

  it("ignores an odd number out in points, like the browser", () => {
    expect(shapeToPath("polyline", { points: "0 0 10 10 5" })).toBe("M0 0L10 10");
  });

  it("draws nothing for shapes with no size or too few points, and for non-shapes", () => {
    expect(shapeToPath("circle", { cx: 12, cy: 12 })).toBe("");
    expect(shapeToPath("rect", { width: 10 })).toBe("");
    expect(shapeToPath("polygon", { points: "1 1" })).toBe("");
    expect(shapeToPath("g", {})).toBe("");
    expect(shapeToPath("text", { x: 1 })).toBe("");
  });

  it("is case-blind about tags, as SVG in HTML can be", () => {
    expect(shapeToPath("CIRCLE", { r: 1 })).toBe("M1 0A1 1 0 0 1 -1 0A1 1 0 0 1 1 0Z");
  });

  it("explains values it can't resolve without a page", () => {
    expect(() => shapeToPath("rect", { width: "100%", height: 10 })).toThrow(/width="100%"/);
    expect(() => shapeToPath("polyline", { points: "1 2 x 4" })).toThrow(/points/);
  });
});

describe("shapesToPath", () => {
  it("joins an icon's shapes into one path, in drawing order", () => {
    // A magnifier: a circle and its handle.
    const d = shapesToPath([
      ["circle", { cx: 11, cy: 11, r: 8 }],
      ["path", { d: "m21 21-4.3-4.3" }],
    ]);
    // The handle's leading relative move is made absolute, so it stays at (21, 21) after the circle.
    expect(d).toBe("M19 11A8 8 0 0 1 3 11A8 8 0 0 1 19 11ZM21 21l-4.3-4.3");
    expect(boxOf(d)).toMatchObject({ x: 3, y: 3, width: 18, height: 18 });
    // It parses as two pieces.
    expect(toCubics(parsePath(d))).toHaveLength(2);
  });
});
