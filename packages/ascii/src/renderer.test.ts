import { describe, expect, it } from "vitest";
import { rgb, rotationMatrix } from "./renderer";

describe("rgb", () => {
  it("reads long and short hex", () => {
    expect(rgb("#ff0000")).toEqual([1, 0, 0]);
    expect(rgb("#0f0")).toEqual([0, 1, 0]);
  });

  it("explains a colour it can't read", () => {
    expect(() => rgb("tomato")).toThrow(/hex/);
  });
});

describe("rotationMatrix", () => {
  it("is the identity with no turn", () => {
    expect([...rotationMatrix(0, 0)]).toEqual([1, 0, -0, 0, 1, 0, 0, -0, 1]);
  });

  it("turns the front toward the right for a positive yaw", () => {
    const matrix = rotationMatrix(Math.PI / 2, 0);
    expect(matrix[6]).toBeCloseTo(1);
  });
});
