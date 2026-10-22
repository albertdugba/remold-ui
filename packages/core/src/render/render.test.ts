import { describe, expect, it } from "vitest";
import type { SubpathLayout } from "../morph/morph";
import { drawPath, type PathSink } from "./canvas";
import { toPathData } from "./svg";

// One closed subpath with one segment, then one open subpath with one segment.
const layout: SubpathLayout[] = [
  { offset: 0, segments: 1, closed: true },
  { offset: 8, segments: 1, closed: false },
];
const buffer = Float32Array.of(0, 0, 1, 2, 3, 4, 5, 6, 10, 10, 11, 11, 12, 12, 13.456, 14);

describe("toPathData", () => {
  it("writes M, one C per segment, and Z for closed subpaths", () => {
    expect(toPathData(buffer, layout)).toBe("M0 0C1 2 3 4 5 6ZM10 10C11 11 12 12 13.46 14");
  });
  it("rounds to the precision you ask for", () => {
    expect(toPathData(buffer, layout, 0)).toBe("M0 0C1 2 3 4 5 6ZM10 10C11 11 12 12 13 14");
  });
  it("never writes negative zero", () => {
    expect(toPathData(Float32Array.of(-0.001, 0, 0, 0, 0, 0, 0, 0), [{ offset: 0, segments: 1, closed: false }])).toBe("M0 0C0 0 0 0 0 0");
  });
});

describe("drawPath", () => {
  it("replays the buffer into any canvas-like sink", () => {
    const calls: string[] = [];
    const sink: PathSink = {
      moveTo: (x, y) => calls.push(`moveTo ${x} ${y}`),
      bezierCurveTo: (...args) => calls.push(`bezierCurveTo ${args.join(" ")}`),
      closePath: () => calls.push("closePath"),
    };
    drawPath(Float32Array.of(0, 0, 1, 2, 3, 4, 5, 6), [layout[0]!], sink);
    expect(calls).toEqual(["moveTo 0 0", "bezierCurveTo 1 2 3 4 5 6", "closePath"]);
  });
});
