import { describe, expect, it } from "vitest";
import { parsePath } from "./parse";

describe("parsePath", () => {
  it("reads absolute moves and lines", () => {
    expect(parsePath("M10 20 L30 40")).toEqual([
      { type: "M", x: 10, y: 20 },
      { type: "L", x: 30, y: 40 },
    ]);
  });
  it("turns relative commands (lowercase) into absolute positions", () => {
    expect(parsePath("m10 20 l5 5")).toEqual([
      { type: "M", x: 10, y: 20 },
      { type: "L", x: 15, y: 25 },
    ]);
  });
  it("reads compact decimals and exponents", () => {
    expect(parsePath("M1e2-5L.5.5")).toEqual([
      { type: "M", x: 100, y: -5 },
      { type: "L", x: 0.5, y: 0.5 },
    ]);
  });
  it("treats extra pairs after M as lines (implicit lineto)", () => {
    expect(parsePath("M0 0 10 0 10 10")).toEqual([
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 10, y: 0 },
      { type: "L", x: 10, y: 10 },
    ]);
  });
  it("turns H and V into ordinary lines", () => {
    expect(parsePath("M0 0 H10 V5 h-2 v-1")).toEqual([
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 10, y: 0 },
      { type: "L", x: 10, y: 5 },
      { type: "L", x: 8, y: 5 },
      { type: "L", x: 8, y: 4 },
    ]);
  });
  it("Z closes the shape and puts the pen back where the shape started", () => {
    expect(parsePath("M1 1 L5 1 Z l2 0")).toEqual([
      { type: "M", x: 1, y: 1 },
      { type: "L", x: 5, y: 1 },
      { type: "Z" },
      { type: "L", x: 3, y: 1 },
    ]);
  });
  it("explains mistakes instead of guessing", () => {
    expect(() => parsePath("L10 10")).toThrow(/start with M/);
    expect(() => parsePath("M10")).toThrow(/number/);
  });
});

describe("parsePath: curves", () => {
  it("reads cubic curves, absolute and relative", () => {
    expect(parsePath("M10 10 C20 0 30 0 40 10 c10 -10 20 -10 30 0")).toEqual([
      { type: "M", x: 10, y: 10 },
      { type: "C", x1: 20, y1: 0, x2: 30, y2: 0, x: 40, y: 10 },
      { type: "C", x1: 50, y1: 0, x2: 60, y2: 0, x: 70, y: 10 },
    ]);
  });
  it("S mirrors the last handle through the pen", () => {
    expect(parsePath("M0 0 C0 10 10 10 10 0 S20 -10 20 0")).toEqual([
      { type: "M", x: 0, y: 0 },
      { type: "C", x1: 0, y1: 10, x2: 10, y2: 10, x: 10, y: 0 },
      { type: "C", x1: 10, y1: -10, x2: 20, y2: -10, x: 20, y: 0 },
    ]);
  });
  it("S with no curve before it puts its first handle on the pen", () => {
    expect(parsePath("M0 0 L10 0 S20 10 30 0")[2]).toEqual({
      type: "C",
      x1: 10,
      y1: 0,
      x2: 20,
      y2: 10,
      x: 30,
      y: 0,
    });
  });
  it("reads quadratic curves, and T mirrors the last quadratic handle", () => {
    expect(parsePath("M0 0 Q5 10 10 0 T20 0")).toEqual([
      { type: "M", x: 0, y: 0 },
      { type: "Q", x1: 5, y1: 10, x: 10, y: 0 },
      { type: "Q", x1: 15, y1: -10, x: 20, y: 0 },
    ]);
  });
  it("reads arcs: radii and rotation are never relative, the end point can be", () => {
    expect(parsePath("M10 10 a5 5 0 1 0 10 0")).toEqual([
      { type: "M", x: 10, y: 10 },
      { type: "A", rx: 5, ry: 5, rotation: 0, largeArc: true, sweep: false, x: 20, y: 10 },
    ]);
  });
  it("arc flags must be 0 or 1", () => {
    expect(() => parsePath("M0 0 A10 10 0 2 0 10 10")).toThrow(/flag/);
  });
  it("reads arc flags squashed together by minifiers", () => {
    expect(parsePath("M0 0a5 5 0 0110 10")).toEqual([
      { type: "M", x: 0, y: 0 },
      { type: "A", rx: 5, ry: 5, rotation: 0, largeArc: false, sweep: true, x: 10, y: 10 },
    ]);
  });
  it("reads repeated arcs, squashed flags included", () => {
    const arcs = parsePath("M0 0 A5 5 0 0 1 10 0 5 5 0 1010 0").slice(1);
    expect(arcs).toEqual([
      { type: "A", rx: 5, ry: 5, rotation: 0, largeArc: false, sweep: true, x: 10, y: 0 },
      { type: "A", rx: 5, ry: 5, rotation: 0, largeArc: true, sweep: false, x: 10, y: 0 },
    ]);
  });
});

describe("parsePath: the rest of the grammar", () => {
  it("reads nothing as no commands, and commas as spaces", () => {
    expect(parsePath("")).toEqual([]);
    expect(parsePath("M1,2,L3,4")).toEqual([
      { type: "M", x: 1, y: 2 },
      { type: "L", x: 3, y: 4 },
    ]);
  });
  it("treats pairs after a relative move as relative lines", () => {
    expect(parsePath("m5 5 1 0 0 1")).toEqual([
      { type: "M", x: 5, y: 5 },
      { type: "L", x: 6, y: 5 },
      { type: "L", x: 6, y: 6 },
    ]);
  });
  it("puts T's handle on the pen when no quadratic came before, and repeats curves", () => {
    expect(parsePath("M0 0 T10 0")[1]).toEqual({ type: "Q", x1: 0, y1: 0, x: 10, y: 0 });
    expect(parsePath("M0 0 c1 1 2 1 3 0 1 1 2 1 3 0").slice(1)).toEqual([
      { type: "C", x1: 1, y1: 1, x2: 2, y2: 1, x: 3, y: 0 },
      { type: "C", x1: 4, y1: 1, x2: 5, y2: 1, x: 6, y: 0 },
    ]);
  });
});

describe("parsePath: error messages", () => {
  it("point at the character where things went wrong", () => {
    expect(() => parsePath("M10 10 L20")).toThrow("expected a number at the end");
    expect(() => parsePath("M10 10 L20 L")).toThrow("expected a number at position 11");
    expect(() => parsePath("M0 0 Z 5")).toThrow("expected a command at position 7");
    expect(() => parsePath("M10 10 X5")).toThrow('unexpected "X" at position 7');
  });
});
