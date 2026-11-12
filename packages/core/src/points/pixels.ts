export interface Pixels {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export type PixelSubject = "alpha" | "dark" | "light" | "saturation";

export type Rgb = readonly [number, number, number];

interface Split {
  group: number;
  channel: number;
  range: number;
}

const CHANNELS = 4;
const SEE_THROUGH = 128;
const COLOUR_SAMPLE = 6000;
const PERCEIVED_WEIGHTS: Rgb = [2, 4, 3];

export function luma([red, green, blue]: Rgb): number {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function saturation([red, green, blue]: Rgb): number {
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);

  return high === 0 ? 0 : (high - low) / high;
}

export function checkPixels({ width, height, data }: Pixels, where: string): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`${where}: width and height must be whole numbers above 0, got ${width} × ${height}`);
  }

  if (data.length !== width * height * CHANNELS) {
    throw new RangeError(`${where}: data needs ${width * height * CHANNELS} values (RGBA for each pixel), got ${data.length}`);
  }
}

export function colourAt({ width, data }: Pixels, x: number, y: number): Rgb {
  const start = (y * width + x) * CHANNELS;

  return [data[start]!, data[start + 1]!, data[start + 2]!];
}

const colourOfPixel = ({ data }: Pixels, index: number): Rgb => [data[index * CHANNELS]!, data[index * CHANNELS + 1]!, data[index * CHANNELS + 2]!];

function membership(by: PixelSubject, alpha: number, colour: Rgb): number {
  switch (by) {
    case "alpha":
      return alpha;
    case "dark":
      return 255 - luma(colour) * 255;
    case "light":
      return luma(colour) * 255;
    default:
      return saturation(colour) * 255;
  }
}

export function subjectMask(pixels: Pixels, by: PixelSubject): Uint8ClampedArray {
  const { width, height, data } = pixels;
  const mask = new Uint8ClampedArray(width * height);

  for (let index = 0; index < width * height; index++) {
    const alpha = data[index * CHANNELS + 3]!;

    if (alpha >= SEE_THROUGH) mask[index] = membership(by, alpha, colourOfPixel(pixels, index));
  }

  return mask;
}

const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");

export const toHex = ([red, green, blue]: Rgb) => `#${hex(red)}${hex(green)}${hex(blue)}`;

function sampleSubject(pixels: Pixels, mask: Uint8ClampedArray, threshold: number): Rgb[] {
  const inside = Array.from(mask.keys()).filter((index) => mask[index]! >= threshold);
  const every = Math.max(1, Math.floor(inside.length / COLOUR_SAMPLE));

  return inside
    .filter((_, position) => position % every === 0)
    .map((index) => colourAt(pixels, index % pixels.width, Math.floor(index / pixels.width)));
}

function channelRange(group: readonly Rgb[], channel: number): number {
  const values = group.map((colour) => colour[channel]!);

  return values.reduce((high, value) => Math.max(high, value), -Infinity) - values.reduce((low, value) => Math.min(low, value), Infinity);
}

function widestSplit(groups: readonly Rgb[][]): Split | null {
  return groups.reduce<Split | null>((best, group, index) => {
    if (group.length < 2) return best;

    return [0, 1, 2].reduce((current, channel) => {
      const range = channelRange(group, channel);

      return range > (current?.range ?? 0) ? { group: index, channel, range } : current;
    }, best);
  }, null);
}

function splitGroup(groups: Rgb[][], { group, channel }: Split): Rgb[][] {
  const sorted = groups[group]!.slice().sort((a, b) => a[channel]! - b[channel]!);
  const middle = Math.floor(sorted.length / 2);

  return [...groups.slice(0, group), sorted.slice(0, middle), sorted.slice(middle), ...groups.slice(group + 1)];
}

function average(group: readonly Rgb[]): Rgb {
  const total = group.reduce<Rgb>((sum, colour) => [sum[0] + colour[0], sum[1] + colour[1], sum[2] + colour[2]], [0, 0, 0]);

  return [total[0] / group.length, total[1] / group.length, total[2] / group.length];
}

export function mainColours(pixels: Pixels, mask: Uint8ClampedArray, threshold: number, count: number): Rgb[] {
  const colours = sampleSubject(pixels, mask, threshold);

  if (colours.length === 0) return [];

  let groups: Rgb[][] = [colours];

  while (groups.length < count) {
    const split = widestSplit(groups);

    if (!split) break;

    groups = splitGroup(groups, split);
  }

  return groups.map(average).sort((a, b) => luma(a) - luma(b));
}

const perceivedDistance = (a: Rgb, b: Rgb) =>
  PERCEIVED_WEIGHTS.reduce((total, weight, channel) => total + weight * (a[channel]! - b[channel]!) ** 2, 0);

export function nearest(colour: Rgb, palette: readonly Rgb[]): number {
  return palette.reduce(
    (best, option, index) => {
      const distance = perceivedDistance(colour, option);

      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Infinity },
  ).index;
}
