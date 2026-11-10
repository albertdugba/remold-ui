import { describe, expect, it } from "vitest";
import { attractor, compose, curve, ellipsoid, fromPath, fromPixels, helix, oval, revolve, sphere, spiral, torus } from "./shapes";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("shapes", () => {
  it("gives exactly the points asked for, the same ones for the same seed", () => {
    const shape = spiral();
    expect(shape.points(500)).toHaveLength(500);
    expect(shape.points(0)).toEqual([]);
    expect(shape.points(50, { seed: 3 })).toEqual(shape.points(50, { seed: 3 }));
    expect(shape.points(50, { seed: 3 })).not.toEqual(shape.points(50, { seed: 4 }));
  });

  it("builds with y up and hands points over with y down, for the screen", () => {
    const [top] = curve({ through: [[0, 1, 0], [0, 1, 0]] }).points(1);
    expect(top).toMatchObject({ x: 0, y: -1, z: 0 });
  });

  it("puts sphere points on the surface, or inside with solid", () => {
    for (const { x, y, z } of sphere({ radius: 2 }).points(200)) expect(close(Math.hypot(x, y, z), 2)).toBe(true);
    for (const { x, y, z } of sphere({ radius: 2, solid: true }).points(200)) expect(Math.hypot(x, y, z)).toBeLessThanOrEqual(2 + 1e-9);
  });

  it("stretches an ellipsoid by its radii", () => {
    for (const { x, y, z } of ellipsoid({ radii: [3, 1, 2] }).points(200)) {
      expect(close((x / 3) ** 2 + y ** 2 + (z / 2) ** 2, 1)).toBe(true);
    }
  });

  it("keeps an oval flat, inside its radii", () => {
    for (const { x, y, z } of oval({ radii: [2, 1] }).points(200)) {
      expect(z).toBe(0);
      expect((x / 2) ** 2 + y ** 2).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("passes a curve through its ends", () => {
    const points = curve({ through: [[0, 0, 0], [1, 2, 0], [2, 0, 1]] }).points(2000);
    const nearest = (to: number[]) => Math.min(...points.map(({ x, y, z }) => Math.hypot(x - to[0]!, -y - to[1]!, z - to[2]!)));
    expect(nearest([0, 0, 0])).toBeLessThan(0.05);
    expect(nearest([1, 2, 0])).toBeLessThan(0.05);
    expect(nearest([2, 0, 1])).toBeLessThan(0.05);
  });

  it("orders a helix top to bottom and a spiral from the core out", () => {
    const strands = helix({ rungs: 0 }).points(100);
    for (const { y, order } of strands) expect(close(y, (order! - 0.5) * 1.75)).toBe(true);
    for (const { x, z, order } of spiral({ core: 0 }).points(100)) expect(order!).toBeCloseTo(Math.hypot(x, z), 0);
  });

  it("traces the Lorenz attractor in path order, about radius 1", () => {
    const points = attractor("lorenz").points(300);
    expect(points[0]!.order).toBe(0);
    expect(points.at(-1)!.order).toBe(1);
    expect(points.every(({ x, y, z }) => Math.hypot(x, y, z) < 1.8)).toBe(true);
  });

  it("moves, scales, turns and mirrors", () => {
    const one = curve({ through: [[1, 0, 0], [1, 0, 0]] });
    expect(one.at([0, 2, 0]).points(1)[0]).toMatchObject({ x: 1, y: -2, z: 0 });
    expect(one.scale([3, 1, 1]).points(1)[0]).toMatchObject({ x: 3 });
    const turned = one.rotate({ z: 90 }).points(1)[0]!;
    expect(close(turned.x, 0) && close(turned.y, -1)).toBe(true);
    expect(one.mirror("x").points(2).map(({ x }) => x)).toEqual([1, -1]);
  });

  it("colours with one tone, a rule, or stripes", () => {
    expect(sphere().tone("gold").points(3).every(({ tone }) => tone === "gold")).toBe(true);
    const ruled = helix().tone(({ group }) => (group === 2 ? "rung" : "strand")).points(200);
    expect(new Set(ruled.map(({ tone }) => tone))).toEqual(new Set(["rung", "strand"]));
    const banded = curve({ through: [[0, 0, 0], [0.99, 0, 0]] })
      .stripes({ every: 0.5, tones: ["a", "b"] })
      .points(200);
    for (const { x, tone } of banded) expect(tone).toBe(x < 0.5 ? "a" : "b");
  });

  it("composes parts by share, in exact counts, ordered along the longest side", () => {
    const shape = compose([
      { share: 1, shape: sphere({ radius: 0.1 }).at([-2, 0, 0]).tone("left") },
      { share: 3, shape: sphere({ radius: 0.1 }).at([2, 0, 0]).tone("right") },
    ]);
    const points = shape.points(101);
    expect(points).toHaveLength(101);
    const left = points.filter(({ tone }) => tone === "left");
    expect(left.length).toBe(25);
    expect(left.every(({ order }) => order! < 0.1)).toBe(true);
    expect(points.filter(({ tone }) => tone === "right").every(({ order }) => order! > 0.9)).toBe(true);
  });

  it("lays a torus flat round the y axis, its points a tube's width from the ring", () => {
    for (const { x, y, z } of torus({ radius: 1, tube: 0.25 }).points(200)) {
      expect(close(Math.hypot(Math.hypot(x, z) - 1, y), 0.25)).toBe(true);
    }
  });

  it("warps each point to wherever the rule says, seeing its place along the shape", () => {
    const grown = sphere().warp(({ x, y, z }) => [x * 2, y * 2, z * 2]).points(50);
    for (const { x, y, z } of grown) expect(close(Math.hypot(x, y, z), 2)).toBe(true);
    const seen: number[] = [];
    helix({ rungs: 0 }).warp(({ x, y, z, along }) => (seen.push(along), [x, y, z])).points(10);
    expect(seen.every((along) => along >= 0 && along <= 1)).toBe(true);
    expect(() => sphere().warp(() => [Number.NaN, 0, 0]).points(1)).toThrow(RangeError);
  });

  it("knows roughly how much surface each shape has", () => {
    expect(sphere({ radius: 1 }).area).toBeCloseTo(4 * Math.PI, 5);
    expect(sphere().scale(2).area).toBeCloseTo(16 * Math.PI, 5);
    expect(oval({ radii: [2, 1] }).area).toBeCloseTo(2 * Math.PI, 5);
    expect(sphere().mirror("x").area).toBeCloseTo(8 * Math.PI, 5);
    expect(revolve({ profile: [[1, -1], [1, 1]] }).area).toBeCloseTo(4 * Math.PI, 1);
  });

  it("shares a composition's dots by area unless told otherwise, so density is even", () => {
    const points = compose([
      { shape: sphere({ radius: 2 }).at([-3, 0, 0]).tone("big") },
      { shape: sphere({ radius: 1 }).at([3, 0, 0]).tone("small") },
    ]).points(500);
    expect(points.filter(({ tone }) => tone === "big")).toHaveLength(400);
  });

  it("repeats a shape round an axis and along a step, sharing the dots", () => {
    const petal = curve({ through: [[1, 0, 0], [1, 0, 0]] });
    const ring = petal.repeat({ copies: 4, around: "y" }).points(8);
    expect(ring).toHaveLength(8);
    const places = new Set(ring.map(({ x, z }) => `${Math.round(x)},${Math.round(z)}`));
    expect(places).toEqual(new Set(["1,0", "0,-1", "-1,0", "0,1"]));
    const stack = petal.repeat({ copies: 3, step: [0, 1, 0] }).points(3);
    expect(stack.map(({ y }) => -y)).toEqual([0, 1, 2]);
    expect(() => petal.repeat({ copies: 2 })).toThrow(RangeError);
  });

  it("revolves a profile into a round surface, wider parts at their radius", () => {
    const cup = revolve({ profile: [[0.5, -1], [1, 1]] }).points(400);
    for (const { x, y, z } of cup) {
      const height = -y;
      expect(Math.hypot(x, z)).toBeCloseTo(0.75 + height * 0.25, 1);
    }
  });

  it("makes an SVG path solid: two faces depth apart, joined round the edge, fitted to radius 1", () => {
    const square = fromPath("M0 0H10V10H0Z", { depth: 0.4 }).points(600);
    expect(square).toHaveLength(600);
    expect(square.every(({ x, y }) => Math.abs(x) <= 1 + 1e-9 && Math.abs(y) <= 1 + 1e-9)).toBe(true);
    expect(square.every(({ z }) => Math.abs(z) <= 0.2 + 1e-9)).toBe(true);
    expect(square.some(({ z }) => close(z, 0.2))).toBe(true);
    expect(square.some(({ z }) => close(z, -0.2))).toBe(true);
    expect(() => fromPath("M0 0", {})).toThrow(RangeError);
  });

  it("turns an image into a relief in its own colours, finding them for you", () => {
    // 40 × 20: a dark red left half and a light blue right half, with a see-through border.
    const [width, height] = [40, 20];
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const at = (y * width + x) * 4;
        const inside = x >= 2 && x < 38 && y >= 2 && y < 18;
        data.set(x < 20 ? [150, 20, 20, inside ? 255 : 0] : [170, 210, 255, inside ? 255 : 0], at);
      }
    }
    const photo = fromPixels({ width, height, data }, { colors: 2, depth: 0.4 });
    expect(Object.values(photo.palette)).toEqual(["#961414", "#aad2ff"]);
    const points = photo.points(300);
    expect(points).toHaveLength(300);
    expect(points.every(({ x, y }) => Math.abs(x) <= 1.05 && Math.abs(y) <= 1.05)).toBe(true);
    for (const { x, z, tone } of points) {
      expect(tone).toBe(x < 0 ? "color1" : "color2");
      // Lighter pixels stand out further.
      expect(z).toBeCloseTo(x < 0 ? -0.4 * (0.5 - 0.0908) : 0.4 * (0.7948 - 0.5), 1);
    }
  });

  it("rounds an image into a dome with bulge", () => {
    const [width, height] = [21, 21];
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const dome = fromPixels({ width, height, data }, { depth: 0, bulge: 0.5 }).points(400);
    const middle = dome.reduce((best, point) => (Math.hypot(point.x, point.y) < Math.hypot(best.x, best.y) ? point : best));
    const corner = dome.reduce((best, point) => (Math.hypot(point.x, point.y) > Math.hypot(best.x, best.y) ? point : best));
    expect(middle.z).toBeGreaterThan(0.45);
    expect(corner.z).toBeLessThan(0.1);
  });

  it("refuses pixels that aren't RGBA for every pixel", () => {
    expect(() => fromPixels({ width: 2, height: 2, data: [0, 0, 0] })).toThrow(RangeError);
    expect(() => fromPixels({ width: 1, height: 1, data: [0, 0, 0, 255] }, { colors: 0 })).toThrow(RangeError);
  });

  it("refuses sizes and counts that make no sense", () => {
    expect(() => sphere({ radius: 0 })).toThrow(RangeError);
    expect(() => oval({ radii: [1, -1] })).toThrow(RangeError);
    expect(() => curve({ through: [[0, 0, 0]] })).toThrow(RangeError);
    expect(() => spiral({ arms: 0 })).toThrow(RangeError);
    expect(() => compose([])).toThrow(RangeError);
    expect(() => sphere().points(1.5)).toThrow(RangeError);
    expect(() => sphere().stripes({ every: 0, tones: ["a"] })).toThrow(RangeError);
  });
});
