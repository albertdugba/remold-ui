import { describe, expect, it } from "vitest";
import { toCubics } from "../path/normalize";
import { parsePath } from "../path/parse";
import { createMorph, lerpBuffers } from "./morph";

const square = "M0 0 H10 V10 H0 Z";
const wide = "M0 0 H20 V10 H0 Z";

describe("lerpBuffers", () => {
  it("lerps every number", () => {
    const out = new Float32Array(2);
    lerpBuffers({ from: Float32Array.of(0, 10), to: Float32Array.of(10, 30), progress: 0.5, output: out });
    expect([...out]).toEqual([5, 20]);
  });
});

describe("createMorph", () => {
  it("packs both shapes with one shared layout: 2 numbers to start, 6 per segment", () => {
    const morph = createMorph(square, wide);
    expect(morph.layout).toEqual([{ offset: 0, segments: 4, closed: true }]);
    expect(morph.from).toHaveLength(26);
    expect(morph.to).toHaveLength(26);
  });

  it("starts at A, ends at B, and is halfway at 0.5", () => {
    const morph = createMorph(square, wide);
    expect(morph.d(0)).toBe(createMorph(square, square).d(0));
    expect(morph.d(1)).toBe(createMorph(wide, wide).d(0));
    // The top-right corner moves from x = 10 to x = 20.
    expect(morph.at(0.5)[6]).toBeCloseTo(15);
  });

  it("goes past B when t > 1, so springs can overshoot", () => {
    expect(createMorph(square, wide).at(1.5)[6]).toBeCloseTo(25);
  });

  it("writes into a buffer you pass, and checks its size", () => {
    const morph = createMorph(square, wide);
    const out = new Float32Array(26);
    expect(morph.at(1, out)).toBe(out);
    expect(() => morph.at(1, new Float32Array(3))).toThrow(RangeError);
  });

  it("keeps the same commands for every t", () => {
    const morph = createMorph("M0 0 L10 0 L5 10 Z", "M0 0 H10 V10 H0 Z M20 0 H30 V10 H20 Z");
    const commands = (d: string) => d.replace(/[^MCZ]/g, "");
    expect(commands(morph.d(0))).toBe(commands(morph.d(0.37)));
    expect(commands(morph.d(0))).toBe(commands(morph.d(1)));
  });

  it("accepts subpaths as well as path data", () => {
    expect(createMorph(toCubics(parsePath(square)), wide).d(0.5)).toBe(createMorph(square, wide).d(0.5));
  });

  it("ignores empty subpaths", () => {
    const line = toCubics(parsePath("M0 0 L3 0"));
    expect(createMorph([{ segments: [], closed: false }, ...line], line).layout).toHaveLength(1);
  });
});
