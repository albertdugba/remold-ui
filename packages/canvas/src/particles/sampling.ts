import { sampleMask, type CloudPoint, type MaskSampleOptions, type Point } from "@remold-ui/core";

export interface TextSampleOptions extends MaskSampleOptions {
  /** A CSS font. Make sure web fonts have loaded first. */
  font?: string;
}

/** Points evenly spread over `text` as drawn in `font`. */
export function sampleTextPoints(text: string, options: TextSampleOptions = {}): Point[] {
  const font = options.font ?? "700 160px system-ui, sans-serif";
  const measurementContext = createScratchContext({ width: 1, height: 1 });
  measurementContext.font = font;
  const metrics = measurementContext.measureText(text);
  const left = Math.ceil(metrics.actualBoundingBoxLeft ?? 0) + 2;
  const width = Math.ceil(left + (metrics.actualBoundingBoxRight ?? metrics.width)) + 2;
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent ?? 0) + 2;
  const height = Math.ceil(ascent + (metrics.actualBoundingBoxDescent ?? 0)) + 2;
  if (!text || width <= 4 || height <= 4) return [];
  const context = createScratchContext({ width, height });
  context.font = font;
  context.textBaseline = "alphabetic";
  context.fillStyle = "#000";
  context.fillText(text, left, ascent);
  return sampleMask(context.getImageData(0, 0, width, height), options);
}

export interface ImageSampleOptions extends MaskSampleOptions {
  /** The size to sample at, in pixels. Defaults to the image's own size. */
  width?: number;
  height?: number;
  /** Which pixels count as the shape. */
  by?: "alpha" | "dark" | "light" | "saturation";
  /** Hex colours to assign to sampled dots from the image's pixels. Use the same palette with `particles()`. */
  palette?: readonly string[];
  /** Extra dots at normalized image coordinates, for small details that the mask omits. */
  details?: readonly { x: number; y: number; tone?: number }[];
}

/** Points over an image's opaque, dark, light, or saturated pixels. With a palette, each point carries the nearest source colour as a tone. */
export function sampleImagePoints(image: CanvasImageSource, options: ImageSampleOptions = {}): CloudPoint[] {
  const size = imageSize({ image, options });
  const context = createScratchContext(size);
  context.drawImage(image, 0, 0, size.width, size.height);
  const pixels = context.getImageData(0, 0, size.width, size.height);
  const samplingMode = options.by ?? "alpha";
  const mask = samplingMode === "alpha" ? pixels : imageMask({ pixels, by: samplingMode });
  const details = options.details ?? [];
  const count = options.count ?? (options.spacing === undefined ? 500 : undefined);
  if (count !== undefined && details.length > count) {
    throw new RangeError("sampleImagePoints: count must include all detail points");
  }
  const points = sampleMask(mask, { ...options, count: count === undefined ? undefined : count - details.length });
  const palette = options.palette?.map(parseHexColor);
  if (palette?.length === 0) throw new RangeError("sampleImagePoints: palette needs at least one colour");
  const sampled = palette ? points.map((point) => ({ ...point, tone: nearestPaletteTone({ point, pixels, palette }) })) : points;
  return [...sampled, ...details.map((detail) => imageDetailPoint({ detail, pixels, palette }))];
}

function imageDetailPoint({
  detail,
  pixels,
  palette,
}: {
  detail: { x: number; y: number; tone?: number };
  pixels: ImageData;
  palette: readonly (readonly [number, number, number])[] | undefined;
}): CloudPoint {
  if (![detail.x, detail.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new RangeError("sampleImagePoints: detail coordinates must be between 0 and 1");
  }
  if (detail.tone !== undefined && (!Number.isFinite(detail.tone) || detail.tone < 0 || detail.tone > 1)) {
    throw new RangeError("sampleImagePoints: detail tone must be between 0 and 1");
  }
  const point = { x: detail.x * (pixels.width - 1), y: detail.y * (pixels.height - 1) };
  return { ...point, tone: detail.tone ?? (palette ? nearestPaletteTone({ point, pixels, palette }) : undefined) };
}

function parseHexColor(color: string): readonly [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) throw new TypeError(`sampleImagePoints: palette colours must be six-digit hex values, got ${color}`);
  const rgb = Number.parseInt(hex, 16);
  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
}

function nearestPaletteTone({
  point,
  pixels,
  palette,
}: {
  point: Point;
  pixels: ImageData;
  palette: readonly (readonly [number, number, number])[];
}): number {
  const x = Math.max(0, Math.min(pixels.width - 1, Math.round(point.x)));
  const y = Math.max(0, Math.min(pixels.height - 1, Math.round(point.y)));
  const offset = (y * pixels.width + x) * 4;
  const red = pixels.data[offset]!;
  const green = pixels.data[offset + 1]!;
  const blue = pixels.data[offset + 2]!;
  let closest = 0;
  let shortestDistance = Infinity;
  palette.forEach(([paletteRed, paletteGreen, paletteBlue], index) => {
    const distance = (red - paletteRed) ** 2 + (green - paletteGreen) ** 2 + (blue - paletteBlue) ** 2;
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closest = index;
    }
  });
  return palette.length === 1 ? 0 : closest / (palette.length - 1);
}

function imageSize({ image, options }: { image: CanvasImageSource; options: ImageSampleOptions }) {
  const source = image as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number | { baseVal?: { value: number } };
    height?: number | { baseVal?: { value: number } };
  };
  const width = Math.round(options.width ?? (source.naturalWidth || numericDimension(source.width)));
  const height = Math.round(options.height ?? (source.naturalHeight || numericDimension(source.height)));
  if (!(width > 0 && height > 0))
    throw new RangeError("sampleImagePoints: the image has no size yet (is it loaded?); pass width and height");
  return { width, height };
}

function numericDimension(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function imageMask({ pixels, by }: { pixels: ImageData; by: "dark" | "light" | "saturation" }): {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} {
  const mask = new Uint8ClampedArray(pixels.width * pixels.height);
  for (let index = 0; index < mask.length; index++) {
    const offset = index * 4;
    const red = pixels.data[offset]!;
    const green = pixels.data[offset + 1]!;
    const blue = pixels.data[offset + 2]!;
    const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const value =
      by === "saturation" ? Math.max(red, green, blue) - Math.min(red, green, blue) : by === "dark" ? 255 - brightness : brightness;
    mask[index] = value * (pixels.data[offset + 3]! / 255);
  }
  return { width: pixels.width, height: pixels.height, data: mask };
}

function createScratchContext({ width, height }: { width: number; height: number }): CanvasRenderingContext2D {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) throw new Error("particles: sampling text and images needs a browser (a canvas to draw into)");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("particles: couldn't get a 2D canvas context to sample with");
  return context;
}
