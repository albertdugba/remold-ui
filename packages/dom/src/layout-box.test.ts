import { describe, expect, it } from "vitest";
import { normalizeLayoutBox } from "./layout-box";

describe("normalizeLayoutBox", () => {
  it("measures relative to the container in units of its width", () => {
    expect(normalizeLayoutBox({ x: 150, y: 120, width: 50, height: 25 }, { x: 100, y: 100, width: 500, height: 400 })).toEqual({
      x: 0.1,
      y: 0.04,
      width: 0.1,
      height: 0.05,
    });
  });

  it("uses one unit when the container has no width", () => {
    expect(normalizeLayoutBox({ x: 3, y: 4, width: 5, height: 6 }, { x: 1, y: 2, width: 0, height: 0 })).toEqual({
      x: 2,
      y: 2,
      width: 5,
      height: 6,
    });
  });
});
