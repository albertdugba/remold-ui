import { describe, expect, it } from "vitest";
import { flowKeys, matchByFlow, withNumericTones } from "./tones";

describe("tones", () => {
  it("turns names into places along the palette, and leaves numbers alone", () => {
    const points = withNumericTones(
      [
        { x: 0, y: 0, tone: "a" },
        { x: 0, y: 0, tone: "c" },
        { x: 0, y: 0, tone: 0.3 },
      ],
      { a: "#000", b: "#111", c: "#222" },
    );
    expect(points.map(({ tone }) => tone)).toEqual([0, 1, 0.3]);
  });
});

describe("flow", () => {
  it("uses each point's order when they all have one, else the longest side", () => {
    expect(flowKeys([{ x: 5, y: 0, order: 0.9 }, { x: 0, y: 0, order: 0.1 }])).toEqual([0.9, 0.1]);
    expect(flowKeys([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 2, y: 5 }])).toEqual([0, 1, 0.5]);
  });

  it("pairs by rank, and spreads a smaller shape evenly over a larger one", () => {
    expect(matchByFlow([0.5, 0, 1], [1, 0.5, 0]).pairs).toEqual([
      [0, 1],
      [1, 2],
      [2, 0],
    ]);
    const fewer = matchByFlow([0, 1], [0, 0.25, 0.5, 0.75]);
    expect(fewer.pairs).toEqual([
      [0, 1],
      [1, 3],
    ]);
    expect(fewer.arriving).toEqual([0, 2]);
    const more = matchByFlow([0, 0.25, 0.5, 0.75], [0, 1]);
    expect(more.leaving).toEqual([0, 2]);
  });
});
