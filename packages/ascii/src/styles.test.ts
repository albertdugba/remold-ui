import { describe, expect, it } from "vitest";
import { DEFAULT_RAMP, glyphLayout } from "./glyphs";
import { bayer, flickerSeed, frameCells, frameText, hash, isAsciiStyle, type Sample } from "./styles";

const ramp = [...DEFAULT_RAMP];
const empty: Sample = { hit: false, lit: 0, edgeAngle: 0, edgeStrength: 0 };
const lit = (value: number, edge: Partial<Sample> = {}): Sample => ({ hit: true, lit: value, edgeAngle: 0, edgeStrength: 0, ...edge });

const textOf = (style: Parameters<typeof frameText>[0]["style"], cells: Sample[][], extra: Partial<Parameters<typeof frameText>[0]> = {}) =>
  frameText({
    style,
    columns: cells[0]?.length ?? 0,
    rows: cells.length,
    read: (x, y) => cells[cells.length - 1 - y]?.[x] ?? empty,
    seconds: 0,
    invert: false,
    ramp,
    floor: 0,
    ...extra,
  });

describe("bayer", () => {
  it("spreads sixteen thresholds evenly between 0 and 1", () => {
    const thresholds = Array.from({ length: 16 }, (_, index) => bayer(index % 4, Math.floor(index / 4))).sort((a, b) => a - b);
    expect(thresholds[0]).toBeCloseTo(1 / 32);
    expect(thresholds[15]).toBeCloseTo(31 / 32);
    expect(new Set(thresholds).size).toBe(16);
  });
});

describe("hash", () => {
  it("gives the same unsigned value for the same input and differs between cells", () => {
    expect(hash(3, 4, 5)).toBe(hash(3, 4, 5));
    expect(hash(3, 4, 5)).not.toBe(hash(4, 3, 5));
    expect(hash(0xffffffff, 1, 1)).toBeGreaterThanOrEqual(0);
  });
});

describe("flickerSeed", () => {
  it("holds still when time does", () => {
    expect(flickerSeed(2, 9, 0)).toBe(flickerSeed(2, 9, 0));
  });

  it("changes about once and a half a second", () => {
    expect(flickerSeed(2, 9, 10) - flickerSeed(2, 9, 0)).toBeGreaterThanOrEqual(13);
  });
});

describe("frameText", () => {
  it("draws the faintest character for the darkest surface and the densest for the brightest", () => {
    expect(textOf("ascii", [[lit(0), lit(1)]])).toBe(".@");
  });

  it("draws side-on surfaces as lines along the edge", () => {
    expect(textOf("ascii", [[lit(0.5, { edgeStrength: 1, edgeAngle: 0.5 }), lit(0.5, { edgeStrength: 1, edgeAngle: 0 })]])).toBe("|-");
  });

  it("trims empty rows and the shared indent", () => {
    expect(textOf("ascii", [[empty, empty], [empty, lit(1)], [empty, empty]])).toBe("@");
  });

  it("leaves tones below the floor empty", () => {
    expect(textOf("ascii", [[lit(1), lit(0.05), lit(1)]], { floor: 0.1 })).toBe("@ @");
  });

  it("inverts tones for ink on a light ground", () => {
    expect(textOf("ascii", [[lit(1)]], { invert: true })).toBe(".");
  });

  it("writes binary as zeros and ones", () => {
    expect(textOf("binary", [[lit(1), lit(1), lit(1)]])).toMatch(/^[01]{3}$/);
  });

  it("uses digits for the brightest mixed cells and leaves the darkest empty", () => {
    expect(textOf("mixed", [[lit(1), lit(0), lit(1)]])).toMatch(/^\d \d$/);
  });

  it("packs eight samples into one Braille character", () => {
    const column = [lit(1), lit(1)];
    expect(textOf("braille", [column, column, column, column])).toBe("⣿");
  });

  it("writes blocks as the average shade of a cell's halves", () => {
    expect(textOf("blocks", [[lit(1)], [lit(1)]])).toBe("█");
  });
});

describe("glyphLayout", () => {
  it("places edges, digits and the mixed characters after the ramp", () => {
    const layout = glyphLayout("ab");
    expect(layout.characters.slice(0, 2)).toEqual(["a", "b"]);
    expect(layout.characters[layout.edges]).toBe("-");
    expect(layout.characters[layout.digits]).toBe("0");
    expect(layout.characters[layout.mixed]).toBe(".");
  });

  it("counts characters, not code units", () => {
    expect(glyphLayout("░▒▓█").ramp).toHaveLength(4);
  });

  it("refuses an empty ramp", () => {
    expect(() => glyphLayout("")).toThrow(RangeError);
  });
});

describe("isAsciiStyle", () => {
  it("knows the styles", () => {
    expect(isAsciiStyle("braille")).toBe(true);
    expect(isAsciiStyle("toString")).toBe(false);
  });
});

describe("frameCells", () => {
  const options = (cells: Sample[][]) => ({
    style: "ascii" as const,
    columns: cells[0]?.length ?? 0,
    rows: cells.length,
    read: (x: number, y: number) => cells[cells.length - 1 - y]?.[x] ?? empty,
    seconds: 0,
    invert: false,
    ramp,
    floor: 0,
  });

  it("lists characters from the top row down, keeping empty cells", () => {
    const grid = frameCells(options([[lit(1), empty], [empty, lit(0)]]));
    expect(grid.characters).toEqual(["@", " ", " ", "."]);
  });

  it("keeps how lit each cell is and zero where nothing shows", () => {
    const grid = frameCells(options([[lit(0.5), empty]]));
    expect(grid.lit[0]).toBeCloseTo(0.5);
    expect(grid.lit[1]).toBe(0);
  });

  it("keeps the source colour, white when there is none", () => {
    const grid = frameCells(options([[{ ...lit(1), tint: [10, 20, 30] }, lit(1)]]));
    expect([...grid.tints]).toEqual([10, 20, 30, 255, 255, 255]);
  });

  it("averages a Braille cell's samples", () => {
    const column = [lit(0.2), lit(1)];
    const grid = frameCells({ ...options([column, column, column, column]), style: "braille", columns: 1, rows: 1 });
    expect(grid.lit[0]).toBeCloseTo(0.6);
  });
});
