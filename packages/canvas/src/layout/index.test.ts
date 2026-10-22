import { describe, expect, it } from "vitest";
import { layout } from "./index";

describe("layout", () => {
  it("centres a square, and keeps extras", () => {
    expect(layout.square(10, 20, 100, { height: 8, opacity: 0.5 })).toEqual({
      x: -40,
      y: -30,
      z: 0,
      width: 100,
      depth: 100,
      height: 8,
      opacity: 0.5,
    });
  });

  it("spaces a ring evenly, starting at the top", () => {
    const boxes = layout.ring(["a", "b", "c", "d"], { radius: 100, size: 20 });
    const centre = (id: string) => [Math.round(boxes[id]!.x + 10), Math.round(boxes[id]!.y + 10)];
    expect(["a", "b", "c", "d"].map(centre)).toEqual([
      [0, -100],
      [100, 0],
      [0, 100],
      [-100, 0],
    ]);
  });

  it("lines a row up round its centre, along either axis", () => {
    const boxes = layout.row(["a", "b", "c"], { gap: 50, size: 10 });
    expect([boxes.a!.x, boxes.b!.x, boxes.c!.x]).toEqual([-55, -5, 45]);
    expect(layout.row(["a", "b"], { gap: 40, size: 10, axis: "y" }).b).toMatchObject({ x: -5, y: 15 });
  });

  it("stacks upwards from the first", () => {
    const boxes = layout.stack(["floor", "roof"], { gap: 30, size: 100, z: 5 });
    expect([boxes.floor!.z, boxes.roof!.z]).toEqual([5, 35]);
  });

  it("fills a grid row by row, centred", () => {
    const boxes = layout.grid(["a", "b", "c", "d"], { columns: 2, gap: 100, size: 20 });
    expect([boxes.a, boxes.d].map((b) => [b!.x + 10, b!.y + 10])).toEqual([
      [-50, -50],
      [50, 50],
    ]);
  });
});
