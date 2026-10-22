import { describe, expect, it } from "vitest";
import { toCubics, type Subpath } from "../path/normalize";
import { centroid, signedArea } from "../path/measure";
import { parsePath } from "../path/parse";
import { matchShapes, reverseSubpath } from "./match";

const shape = (d: string) => toCubics(parsePath(d));
const starts = (s: Subpath) => s.segments.map((c) => c.p0);

describe("reverseSubpath", () => {
  it("draws the same outline from the other end", () => {
    const [line] = shape("M0 0 C1 1 2 1 3 0 L6 0");
    const reversed = reverseSubpath(line!);
    expect(reversed.segments[0]).toEqual({ p0: { x: 6, y: 0 }, p1: { x: 5, y: 0 }, p2: { x: 4, y: 0 }, p3: { x: 3, y: 0 } });
    expect(reversed.segments[1]).toEqual({ p0: { x: 3, y: 0 }, p1: { x: 2, y: 1 }, p2: { x: 1, y: 1 }, p3: { x: 0, y: 0 } });
  });
});

describe("matchShapes", () => {
  it("gives every pair the same number of segments", () => {
    const { from, to } = matchShapes(shape("M0 0 L10 0 L5 10 Z"), shape("M0 0 H10 V10 H0 Z"));
    expect(from).toHaveLength(1);
    expect(from[0]!.segments).toHaveLength(4);
    expect(to[0]!.segments).toHaveLength(4);
  });

  it("pairs subpaths by position, whatever order they were drawn in", () => {
    const a = shape("M0 0 H10 V10 H0 Z M100 0 H110 V10 H100 Z");
    const b = shape("M100 50 H110 V60 H100 Z M0 50 H10 V60 H0 Z");
    const { from, to } = matchShapes(a, b);
    expect(centroid(from[0]!).x).toBeCloseTo(5);
    expect(centroid(to[0]!).x).toBeCloseTo(5);
    expect(centroid(to[1]!).x).toBeCloseTo(105);
  });

  it("pairs for the best total, not the best first pick", () => {
    // Greedy would pair the middle square with the nearer of the two, stranding the other far
    // away. The best total pairs each side with its own neighbour.
    const a = shape("M0 0 H10 V10 H0 Z M30 0 H40 V10 H30 Z");
    const b = shape("M18 0 H28 V10 H18 Z M48 0 H58 V10 H48 Z");
    const { from, to } = matchShapes(a, b);
    expect(centroid(from[0]!).x).toBeCloseTo(5);
    expect(centroid(to[0]!).x).toBeCloseTo(23);
    expect(centroid(to[1]!).x).toBeCloseTo(53);
  });

  it('pairs in drawing order with pairing: "order"', () => {
    const a = shape("M0 0 H10 V10 H0 Z M100 0 H110 V10 H100 Z");
    const b = shape("M100 50 H110 V60 H100 Z M0 50 H10 V60 H0 Z");
    const { to } = matchShapes(a, b, { pairing: "order" });
    expect(centroid(to[0]!).x).toBeCloseTo(105);
  });

  it("makes closed loops run the same way round", () => {
    const clockwise = shape("M0 0 H10 V10 H0 Z");
    const anticlockwise = shape("M0 0 V10 H10 V0 Z");
    const { from, to } = matchShapes(clockwise, anticlockwise);
    expect(Math.sign(signedArea(to[0]!))).toBe(Math.sign(signedArea(from[0]!)));
  });

  it("runs open paths so their ends stay close", () => {
    const { to } = matchShapes(shape("M0 0 L10 0"), shape("M10 5 L0 5"));
    expect(to[0]!.segments[0]!.p0).toEqual({ x: 0, y: 5 });
  });

  it("rotates a closed loop so each corner goes to the nearest corner", () => {
    // The same square, but drawn starting from the bottom-right corner.
    const { from, to } = matchShapes(shape("M0 0 H10 V10 H0 Z"), shape("M10 10 H0 V0 H10 Z"));
    expect(starts(to[0]!)).toEqual(starts(from[0]!));
  });

  it("can leave direction and start alone", () => {
    const b = shape("M10 10 H0 V0 H10 Z");
    const { to } = matchShapes(shape("M0 0 V10 H10 V0 Z"), b, { orient: false, rotate: false });
    expect(starts(to[0]!)).toEqual(starts(b[0]!));
  });

  it("grows an unpaired subpath from a point at its own centre", () => {
    const { from, to } = matchShapes(shape("M0 0 H10 V10 H0 Z"), shape("M0 0 H10 V10 H0 Z M50 50 H60 V60 H50 Z"));
    expect(from).toHaveLength(2);
    for (const c of from[1]!.segments) expect(c.p0).toEqual(centroid(to[1]!));
  });

  it('with padding: "merge", shrinks an unpaired subpath onto the other outline', () => {
    const { to } = matchShapes(shape("M0 0 L10 0 M0 3 L10 3"), shape("M0 0 L10 0"), { padding: "merge", pairing: "order" });
    const p = to[1]!.segments[0]!.p0;
    expect(p.y).toBe(0);
    expect(p.x).toBeCloseTo(5);
  });

  it("refuses shapes with nothing drawn", () => {
    expect(() => matchShapes([], shape("M0 0 L1 1"))).toThrow(/at least one segment/);
  });
});
