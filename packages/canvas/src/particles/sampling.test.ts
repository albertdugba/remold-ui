// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleImagePoints } from "./sampling";

function imageWithTwoColours(
  left: readonly [number, number, number] = [255, 0, 0],
  right: readonly [number, number, number] = [0, 0, 255],
): CanvasImageSource {
  const width = 20;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const color = x < width / 2 ? left : right;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }

  const context = {
    drawImage: vi.fn(),
    getImageData: () => ({ width, height, data }),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  return { width, height } as CanvasImageSource;
}

afterEach(() => vi.restoreAllMocks());

describe("sampleImagePoints", () => {
  it("samples source colours into tones for the supplied palette", () => {
    const points = sampleImagePoints(imageWithTwoColours(), { count: 60, palette: ["#ff0000", "#0000ff"] });

    expect(points).toHaveLength(60);
    expect(points.some((point) => point.tone === 0)).toBe(true);
    expect(points.some((point) => point.tone === 1)).toBe(true);
    expect(points.filter((point) => point.x < 9).every((point) => point.tone === 0)).toBe(true);
    expect(points.filter((point) => point.x > 11).every((point) => point.tone === 1)).toBe(true);
  });

  it("takes palette colours in any CSS spelling, as a minifier or getComputedStyle writes them", () => {
    const points = sampleImagePoints(imageWithTwoColours(), { count: 60, palette: ["#f00", "rgb(0, 0, 255)"] });

    expect(points.filter((point) => point.x < 9).every((point) => point.tone === 0)).toBe(true);
    expect(points.filter((point) => point.x > 11).every((point) => point.tone === 1)).toBe(true);
  });

  it("keeps silhouette-only sampling when no palette is supplied", () => {
    const points = sampleImagePoints(imageWithTwoColours(), { count: 20 });
    expect(points).toHaveLength(20);
    expect(points.every((point) => point.tone === undefined)).toBe(true);
  });

  it("uses the brightness threshold to isolate light parts of a dark image", () => {
    const points = sampleImagePoints(imageWithTwoColours(), { count: 20, by: "light", threshold: 40 });

    expect(points).toHaveLength(20);
    expect(points.every((point) => point.x < 10)).toBe(true);
  });

  it("isolates saturated colour from neutral watermarks and backgrounds", () => {
    const image = imageWithTwoColours([255, 20, 150], [140, 140, 140]);
    const points = sampleImagePoints(image, { count: 20, by: "saturation", threshold: 100 });

    expect(points).toHaveLength(20);
    expect(points.every((point) => point.x < 10)).toBe(true);
  });

  it("keeps highlighted detail dots that a mask omits without changing the requested count", () => {
    const image = imageWithTwoColours([255, 20, 150], [140, 140, 140]);
    const points = sampleImagePoints(image, {
      count: 20,
      by: "saturation",
      threshold: 100,
      palette: ["#ff1496", "#ffffff"],
      details: [{ x: 0.75, y: 0.5, tone: 1 }],
    });

    expect(points).toHaveLength(20);
    expect(points.filter((point) => point.x > 10)).toEqual([{ x: 14.25, y: 4.5, tone: 1 }]);
  });

  it("rejects detail coordinates or tones outside the normalized range", () => {
    const image = imageWithTwoColours();
    expect(() => sampleImagePoints(image, { count: 1, details: [{ x: 1.1, y: 0.5 }] })).toThrow(/coordinates/);
    expect(() => sampleImagePoints(image, { count: 1, details: [{ x: 0.5, y: 0.5, tone: -0.1 }] })).toThrow(/tone/);
    expect(() => sampleImagePoints(image, { count: 0, details: [{ x: 0.5, y: 0.5 }] })).toThrow(/count/);
  });

  it("rejects empty palettes and colours that aren't colours", () => {
    const image = imageWithTwoColours();
    expect(() => sampleImagePoints(image, { count: 20, palette: [] })).toThrow(/at least one colour/);
    expect(() => sampleImagePoints(image, { count: 20, palette: ["not a colour"] })).toThrow(/CSS colours/);
  });
});
