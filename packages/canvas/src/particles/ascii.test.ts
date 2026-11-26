// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { asciiConfiguration, asciiGrid, asciiText, characterIndex, claimCells, closeGaps, createAsciiAtlases, drawAscii, type LocatePoint } from "./ascii";
import { createConfiguration } from "./configuration";

const grid = asciiGrid({ width: 100, height: 40, size: 10, advance: 6 });

describe("asciiGrid", () => {
  it("covers the canvas in cells as wide as the font's advance", () => {
    expect(grid).toEqual({ cellWidth: 6, cellHeight: 10, columns: 17, rows: 4 });
  });

  it("falls back to a typical monospace advance when the font can't be measured", () => {
    expect(asciiGrid({ width: 60, height: 20, size: 10, advance: 0 }).cellWidth).toBe(6);
  });
});

describe("characterIndex", () => {
  it("runs from the lightest character at tone 0 to the densest at 1", () => {
    expect(characterIndex(0, 9)).toBe(0);
    expect(characterIndex(0.5, 9)).toBe(4);
    expect(characterIndex(1, 9)).toBe(8);
  });

  it("clamps tones outside 0 to 1", () => {
    expect(characterIndex(-1, 4)).toBe(0);
    expect(characterIndex(3, 4)).toBe(3);
  });
});

describe("claimCells", () => {
  const points = [
    { x: 1, y: 1, scale: 1, tone: 0.2 },
    { x: 4, y: 8, scale: 1, tone: 0.9 },
    { x: 13, y: 15, scale: 1, tone: 0.5 },
    { x: 20, y: 20, scale: 0.1, tone: 1 },
    { x: -3, y: 5, scale: 1, tone: 1 },
    { x: 500, y: 5, scale: 1, tone: 1 },
  ];
  const locate: LocatePoint = (index) => points[index]!;
  const tone = (index: number) => points[index]!.tone;

  it("keeps one dot per cell, the densest", () => {
    const cells = claimCells({ count: points.length, locate, tone, grid });

    expect([...cells]).toEqual([
      [0, 1],
      [19, 2],
    ]);
  });

  it("leaves out dots that are shrunk away or off the canvas", () => {
    const cells = claimCells({ count: points.length, locate, tone, grid });

    expect([...cells.values()]).not.toContain(3);
    expect([...cells.values()]).not.toContain(4);
    expect([...cells.values()]).not.toContain(5);
  });
});

describe("closeGaps", () => {
  const small = asciiGrid({ width: 50, height: 50, size: 10, advance: 10 });

  it("fills a lone empty row or column between claimed cells", () => {
    const cells = new Map([
      [0, 7],
      [10, 8],
      [2, 9],
    ]);

    expect([...closeGaps(cells, small)].sort((a, b) => a[0] - b[0])).toEqual([
      [0, 7],
      [1, 7],
      [2, 9],
      [5, 7],
      [10, 8],
    ]);
  });

  it("leaves wider gaps and the shape's outside alone", () => {
    const cells = new Map([
      [0, 1],
      [15, 2],
      [3, 3],
    ]);

    expect(closeGaps(cells, small).size).toBe(3);
  });
});

describe("asciiText", () => {
  const small = asciiGrid({ width: 50, height: 50, size: 10, advance: 10 });

  it("writes rows as lines, trimmed to what's drawn, with spaces for empty cells", () => {
    const cells = new Map([
      [6, 0],
      [8, 1],
      [12, 2],
    ]);

    expect(asciiText(cells, small, (index) => ["a", "b", "c"][index]!)).toBe("a b\n c");
  });

  it("is empty when nothing is drawn", () => {
    expect(asciiText(new Map(), small, () => "#")).toBe("");
  });
});

describe("asciiConfiguration", () => {
  it("splits characters by code point, so emoji and accents stay whole", () => {
    expect(asciiConfiguration({ characters: "é🙂#" }).characters).toEqual(["é", "🙂", "#"]);
  });

  it("rejects an empty character set and a size that isn't positive", () => {
    expect(() => asciiConfiguration({ characters: "" })).toThrow(RangeError);
    expect(() => asciiConfiguration({ size: 0 })).toThrow(RangeError);
  });

  it("is only built for the ascii shape", () => {
    expect(createConfiguration({ shape: "ascii" }).ascii?.characters.join("")).toBe(".:-=+*#%@");
    expect(createConfiguration({ shape: "circle" }).ascii).toBeNull();
  });

  it("rejects a shape it doesn't know", () => {
    expect(() => createConfiguration({ shape: "hexagon" as "circle" })).toThrow(/shape must be/);
  });
});

describe("drawAscii", () => {
  it("writes the character for each claimed cell at the cell's centre", () => {
    const written: { text: string; x: number; y: number; fill: unknown }[] = [];
    const context = {
      font: "",
      textAlign: "",
      textBaseline: "",
      fillStyle: "" as unknown,
      measureText: () => ({ width: 6 }),
      fillText(text: string, x: number, y: number) {
        written.push({ text, x, y, fill: context.fillStyle });
      },
      drawImage() {
        throw new Error("no atlas without a canvas");
      },
    } as unknown as CanvasRenderingContext2D;
    const configuration = asciiConfiguration({ characters: ".#", size: 10 });
    const points = [
      { x: 2, y: 2, scale: 1, tone: 0 },
      { x: 8, y: 2, scale: 1, tone: 1 },
    ];

    drawAscii({
      context,
      configuration,
      atlases: createAsciiAtlases(configuration),
      size: { width: 60, height: 20, pixelRatio: 1 },
      count: points.length,
      locate: (index) => points[index]!,
      tone: (index) => points[index]!.tone,
      fillOf: () => "tomato",
    });

    expect(written).toEqual([
      { text: ".", x: 3, y: 5, fill: "tomato" },
      { text: "#", x: 9, y: 5, fill: "tomato" },
    ]);
  });
});
