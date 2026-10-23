import { describe, expect, it } from "vitest";
import { lerp, lerpPoint } from "./interpolate";

describe("lerp", () => {
  it("interpolates scalars at the endpoints and between them", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it("works for points too", () => {
    expect(lerpPoint({ x: 0, y: 0 }, { x: 100, y: 40 }, 0.25)).toEqual({ x: 25, y: 10 });
  });
});
