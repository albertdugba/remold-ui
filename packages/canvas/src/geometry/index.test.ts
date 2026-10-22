import { describe, expect, it } from "vitest";
import { fitCamera, flat, iso, projector } from "../camera";
import { backingSize } from "../canvas-size";
import { convexHull, ellipse, paintOrder, pointInPolygon, roundedRect, silhouette } from "./index";

const viewport = { width: 800, height: 800 };

describe("backingSize", () => {
  it("stores more pixels on sharper screens, capped at 2×", () => {
    expect(backingSize(300, 150, 1)).toEqual({ pixelRatio: 1, width: 300, height: 150 });
    expect(backingSize(300, 150, 2)).toEqual({ pixelRatio: 2, width: 600, height: 300 });
    expect(backingSize(300, 150, 3)).toEqual({ pixelRatio: 2, width: 600, height: 300 });
    expect(backingSize(300, 150, 3, 3).width).toBe(900);
  });
  it("never goes below one pixel or one-to-one", () => {
    expect(backingSize(0, 0, 0.5)).toEqual({ pixelRatio: 1, width: 1, height: 1 });
  });
});

describe("projector", () => {
  it("top-down at zoom 1 maps world units 1:1 on an 800px canvas, origin below centre", () => {
    const v = projector(flat(), viewport);
    expect(v.scale).toBe(1);
    expect(v.project(0, 0)).toEqual({ x: 400, y: 432 });
    expect(v.project(100, 50)).toEqual({ x: 500, y: 482 });
  });
  it("raises things on screen as z goes up, once tilted", () => {
    const v = projector(iso(), viewport);
    expect(v.project(0, 0, 100).y).toBeLessThan(v.project(0, 0, 0).y);
    // Straight down, height is invisible.
    expect(projector(flat(), viewport).project(0, 0, 100).y).toBe(432);
  });
  it("plane(z) is the same mapping as project at that height", () => {
    const v = projector(iso({ yaw: 30, pitch: 50, zoom: 1.3, centerX: 20, centerY: -10 }), viewport);
    const [a, b, c, d, e, f] = v.plane(40);
    const x = 70;
    const y = -25;
    const p = v.project(x, y, 40);
    expect(a * x + c * y + e).toBeCloseTo(p.x, 9);
    expect(b * x + d * y + f).toBeCloseTo(p.y, 9);
  });
  it("depth grows towards the viewer", () => {
    const v = projector(iso(), viewport);
    expect(v.depth(0, 100)).toBeGreaterThan(v.depth(0, 0));
  });
});

describe("fitCamera", () => {
  it("fits the boxes and centres them on the canvas", () => {
    const boxes = [{ x: 0, y: 0, width: 1000, depth: 200 }];
    const camera = fitCamera(boxes, viewport, 0.1);
    const v = projector(camera, viewport);
    const left = v.project(0, 100);
    const right = v.project(1000, 100);
    expect(right.x - left.x).toBeCloseTo(640);
    expect((left.y + right.y) / 2).toBeCloseTo(400);
  });
});

describe("outlines", () => {
  it("rounded rectangles stay inside their box", () => {
    const points = roundedRect({ x: 0, y: 0, width: 100, depth: 50, radius: 10 });
    expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(0);
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(50);
    expect(roundedRect({ x: 0, y: 0, width: 10, depth: 10, radius: 0 })).toHaveLength(4);
  });
  it("ellipses fill their box", () => {
    const points = ellipse({ x: 0, y: 0, width: 100, depth: 40 });
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(100);
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(0);
  });
});

describe("convexHull and pointInPolygon", () => {
  it("wraps the outermost points", () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 5, y: 5 });
  });
  it("knows inside from outside", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
});

describe("silhouette", () => {
  it("covers the sides of a tall shape, so pointing at a tower's side hits it", () => {
    const v = projector(iso(), viewport);
    const outline = roundedRect({ x: -20, y: -20, width: 40, depth: 40, radius: 0 });
    const side = v.project(20, 20, 50); // halfway up the front corner
    expect(pointInPolygon(side, silhouette({ outline, z0: 0, z1: 0, view: v }))).toBe(false);
    expect(pointInPolygon(side, silhouette({ outline, z0: 0, z1: 100, view: v }))).toBe(true);
  });
});

describe("paintOrder", () => {
  it("draws lower things first, then farther before nearer", () => {
    const v = projector(iso(), viewport);
    const item = (id: string, z: number, y: number) => ({ id, x: 0, y, z, width: 10, depth: 10 });
    const order = paintOrder([item("near", 0, 100), item("high", 50, -100), item("far", 0, -100)], v).map((i) => i.id);
    expect(order).toEqual(["far", "near", "high"]);
  });
});
