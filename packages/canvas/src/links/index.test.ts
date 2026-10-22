import { describe, expect, it } from "vitest";
import { routeOnFloor, sidePort, type FloorBox } from "./index";

const at = (x: number, y: number, z = 0, size = 100, height = 20): FloorBox => ({ x, y, z, width: size, depth: size, height });

describe("sidePort", () => {
  it("uses the side that faces the other object, at its base", () => {
    expect(sidePort(at(0, 0, 5), { x: 500, y: 40 })).toEqual({ x: 100, y: 50, z: 5, nx: 1, ny: 0 });
    expect(sidePort(at(0, 0), { x: 40, y: -500 })).toMatchObject({ x: 50, y: 0, nx: 0, ny: -1 });
  });
  it("uses the long side of a long, thin object", () => {
    const shelf: FloorBox = { x: 0, y: 0, z: 0, width: 400, depth: 40, height: 10 };
    // The target is further across than down, but only a little compared with the shelf's length.
    expect(sidePort(shelf, { x: 300, y: 200 })).toMatchObject({ nx: 0, ny: 1 });
  });
  it("honours a named port", () => {
    expect(sidePort(at(0, 0), { x: 500, y: 0 }, "front")).toMatchObject({ x: 50, y: 100, nx: 0, ny: 1 });
  });
});

describe("routeOnFloor", () => {
  it("curves out of one side and into the other at right angles", () => {
    const { points, riser } = routeOnFloor(at(0, 0), at(400, 200), {});
    expect(riser).toBe(false);
    const [p0, p1] = points;
    const [q1, q0] = points.slice(-2);
    expect(p0).toMatchObject({ x: 100, y: 50 });
    expect(q0).toMatchObject({ x: 400, y: 250 });
    // Leaving along +x and arriving along +x (into the target's left side).
    expect(Math.abs(p1!.y - p0!.y)).toBeLessThan(Math.abs(p1!.x - p0!.x));
    expect(Math.abs(q0!.y - q1!.y)).toBeLessThan(Math.abs(q0!.x - q1!.x));
  });

  it("runs orthogonal routes along the floor's axes", () => {
    const { points } = routeOnFloor(at(0, 0), at(400, 300), { route: "orthogonal" });
    for (let i = 1; i < points.length; i++) {
      const dx = Math.abs(points[i]!.x - points[i - 1]!.x);
      const dy = Math.abs(points[i]!.y - points[i - 1]!.y);
      // Straight runs are axis-aligned; only the short rounded corners move on both axes.
      if (dx > 20 && dy > 20) throw new Error(`diagonal run at ${i}`);
    }
  });

  it("joins stacked objects with a vertical riser from the lower top to the upper bottom", () => {
    const { points, riser } = routeOnFloor(at(0, 0, 0), at(10, 10, 80), {});
    expect(riser).toBe(true);
    expect(points[0]).toMatchObject({ z: 20 });
    expect(points[1]).toMatchObject({ z: 80 });
  });

  it("eases from one height to the other", () => {
    const { points } = routeOnFloor(at(0, 0, 0), at(400, 0, 60), {});
    expect(points[0]!.z).toBe(0);
    expect(points[points.length - 1]!.z).toBe(60);
    for (let i = 1; i < points.length; i++) expect(points[i]!.z).toBeGreaterThanOrEqual(points[i - 1]!.z);
  });
});
