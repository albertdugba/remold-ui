import { sampleMask, type CloudPoint, type MaskSampleOptions, type Point } from "@remold-ui/core";

export interface TextSampleOptions extends MaskSampleOptions {
  font?: string;
}

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
  width?: number;
  height?: number;
  by?: "alpha" | "dark" | "light" | "saturation";
  palette?: readonly string[];
  details?: readonly { x: number; y: number; tone?: number }[];
}

type Rgb = readonly [number, number, number];

interface Detail {
  x: number;
  y: number;
  tone?: number;
}

const DEFAULT_COUNT = 500;
const LONG_HEX = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i;
const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]?$/i;
const RGB_FUNCTION = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;
const PROBE = "#010203";

const isUnit = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

function checkDetail(detail: Detail) {
  if (![detail.x, detail.y].every(isUnit)) throw new RangeError("sampleImagePoints: detail coordinates must be between 0 and 1");

  if (detail.tone !== undefined && !isUnit(detail.tone)) throw new RangeError("sampleImagePoints: detail tone must be between 0 and 1");
}

function imageDetailPoint({ detail, pixels, palette }: { detail: Detail; pixels: ImageData; palette: readonly Rgb[] | undefined }): CloudPoint {
  checkDetail(detail);

  const point = { x: detail.x * (pixels.width - 1), y: detail.y * (pixels.height - 1) };

  return { ...point, tone: detail.tone ?? (palette ? nearestPaletteTone({ point, pixels, palette }) : undefined) };
}

function longHex(color: string): Rgb | null {
  const digits = LONG_HEX.exec(color)?.[1];

  if (!digits) return null;

  const rgb = Number.parseInt(digits, 16);

  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
}

function shortHex(color: string): Rgb | null {
  const match = SHORT_HEX.exec(color);

  return match ? ([match[1]!, match[2]!, match[3]!].map((digit) => Number.parseInt(digit + digit, 16)) as unknown as Rgb) : null;
}

function rgbFunction(color: string): Rgb | null {
  const match = RGB_FUNCTION.exec(color);

  return match ? ([Number(match[1]), Number(match[2]), Number(match[3])].map(Math.round) as unknown as Rgb) : null;
}

function rgbOf(color: string): Rgb | null {
  const trimmed = color.trim();

  return longHex(trimmed) ?? shortHex(trimmed) ?? rgbFunction(trimmed);
}

function parseHexColor(color: string): Rgb {
  const direct = rgbOf(color);

  if (direct) return direct;

  const context = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

  if (context) {
    context.fillStyle = PROBE;
    context.fillStyle = color;

    const read = rgbOf(String(context.fillStyle));

    if (read && read.join() !== "1,2,3") return read;
  }

  throw new TypeError(`sampleImagePoints: palette colours must be CSS colours, got ${color}`);
}

function colourAt(pixels: ImageData, point: Point): Rgb {
  const x = Math.max(0, Math.min(pixels.width - 1, Math.round(point.x)));
  const y = Math.max(0, Math.min(pixels.height - 1, Math.round(point.y)));
  const offset = (y * pixels.width + x) * 4;

  return [pixels.data[offset]!, pixels.data[offset + 1]!, pixels.data[offset + 2]!];
}

function nearestPaletteTone({ point, pixels, palette }: { point: Point; pixels: ImageData; palette: readonly Rgb[] }): number {
  const [red, green, blue] = colourAt(pixels, point);

  const closest = palette.reduce(
    (best, [paletteRed, paletteGreen, paletteBlue], index) => {
      const distance = (red - paletteRed) ** 2 + (green - paletteGreen) ** 2 + (blue - paletteBlue) ** 2;

      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Infinity },
  ).index;

  return palette.length === 1 ? 0 : closest / (palette.length - 1);
}

const numericDimension = (value: unknown) => (typeof value === "number" ? value : 0);

function imageSize({ image, options }: { image: CanvasImageSource; options: ImageSampleOptions }) {
  const source = image as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number | { baseVal?: { value: number } };
    height?: number | { baseVal?: { value: number } };
  };
  const width = Math.round(options.width ?? (source.naturalWidth || numericDimension(source.width)));
  const height = Math.round(options.height ?? (source.naturalHeight || numericDimension(source.height)));

  if (!(width > 0 && height > 0)) {
    throw new RangeError("sampleImagePoints: the image has no size yet (is it loaded?); pass width and height");
  }

  return { width, height };
}

function maskValue(by: "dark" | "light" | "saturation", red: number, green: number, blue: number): number {
  if (by === "saturation") return Math.max(red, green, blue) - Math.min(red, green, blue);

  const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return by === "dark" ? 255 - brightness : brightness;
}

function imageMask({ pixels, by }: { pixels: ImageData; by: "dark" | "light" | "saturation" }) {
  const { data } = pixels;
  const mask = new Uint8ClampedArray(pixels.width * pixels.height);

  for (let index = 0; index < mask.length; index++) {
    const offset = index * 4;

    mask[index] = maskValue(by, data[offset]!, data[offset + 1]!, data[offset + 2]!) * (data[offset + 3]! / 255);
  }

  return { width: pixels.width, height: pixels.height, data: mask };
}

function readImage(image: CanvasImageSource, options: ImageSampleOptions): ImageData {
  const size = imageSize({ image, options });
  const context = createScratchContext(size);

  context.drawImage(image, 0, 0, size.width, size.height);

  return context.getImageData(0, 0, size.width, size.height);
}

function sampleCount(options: ImageSampleOptions, details: number): number | undefined {
  const count = options.count ?? (options.spacing === undefined ? DEFAULT_COUNT : undefined);

  if (count !== undefined && details > count) throw new RangeError("sampleImagePoints: count must include all detail points");

  return count === undefined ? undefined : count - details;
}

export function sampleImagePoints(image: CanvasImageSource, options: ImageSampleOptions = {}): CloudPoint[] {
  const pixels = readImage(image, options);
  const by = options.by ?? "alpha";
  const mask = by === "alpha" ? pixels : imageMask({ pixels, by });
  const details = options.details ?? [];
  const points = sampleMask(mask, { ...options, count: sampleCount(options, details.length) });
  const palette = options.palette?.map(parseHexColor);

  if (palette?.length === 0) throw new RangeError("sampleImagePoints: palette needs at least one colour");

  const sampled = palette ? points.map((point) => ({ ...point, tone: nearestPaletteTone({ point, pixels, palette }) })) : points;

  return [...sampled, ...details.map((detail) => imageDetailPoint({ detail, pixels, palette }))];
}

export function createScratchContext({ width, height }: { width: number; height: number }): CanvasRenderingContext2D {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

  if (!canvas) throw new Error("particles: sampling text and images needs a browser (a canvas to draw into)");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("particles: couldn't get a 2D canvas context to sample with");

  return context;
}
