import { describe, expect, it } from "vitest";
import { signedDistances } from "./distance-field";

const mask = (rows: string[]) => Uint8Array.from(rows.join("").split("").map((cell) => (cell === "#" ? 1 : 0)));

describe("signedDistances", () => {
  const rows = [".......", ".......", "..###..", "..###..", "..###..", ".......", "......."];
  const distances = signedDistances(mask(rows), 7, 7);
  const at = (column: number, row: number) => distances[row * 7 + column];

  it("is negative inside the shape and positive outside", () => {
    expect(at(3, 3)).toBeLessThan(0);
    expect(at(0, 0)).toBeGreaterThan(0);
  });

  it("measures from the nearest texel edge, half a texel from a neighbour's centre", () => {
    expect(at(1, 3)).toBeCloseTo(0.5);
    expect(at(2, 3)).toBeCloseTo(-0.5);
    expect(at(3, 3)).toBeCloseTo(-1.5);
  });

  it("is exact on diagonals", () => {
    expect(at(0, 0)).toBeCloseTo(Math.hypot(2, 2) - 0.5);
  });

  it("scales into world units", () => {
    expect(signedDistances(mask(rows), 7, 7, 0.25)[3 * 7 + 1]).toBeCloseTo(0.125);
  });
});
