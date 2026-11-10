/**
 * Reading images as plain data: which pixels count as the subject, how bright they are, and the
 * handful of colours that describe them. No DOM: the pixels come in as numbers, as in `ImageData`.
 */

/** An image as RGBA numbers from 0 to 255, row by row, four per pixel (as in `ImageData`). */
export interface Pixels {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

/** Which pixels are the subject: opaque ones, dark ones on a light ground, light ones on a dark ground, or vivid ones. */
export type PixelSubject = "alpha" | "dark" | "light" | "saturation";

export type Rgb = readonly [number, number, number];

/** How bright a colour looks, from 0 to 1 (Rec. 709 weights). */
export function luma([red, green, blue]: Rgb): number {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

/** How strongly coloured, from 0 (grey) to 1. */
function saturation([red, green, blue]: Rgb): number {
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  return high === 0 ? 0 : (high - low) / high;
}

export function checkPixels({ width, height, data }: Pixels, where: string): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`${where}: width and height must be whole numbers above 0, got ${width} × ${height}`);
  }
  if (data.length !== width * height * 4) {
    throw new RangeError(`${where}: data needs ${width * height * 4} values (RGBA for each pixel), got ${data.length}`);
  }
}

export function colourAt({ width, data }: Pixels, x: number, y: number): Rgb {
  const at = (y * width + x) * 4;
  return [data[at]!, data[at + 1]!, data[at + 2]!];
}

/**
 * How much each pixel belongs to the subject, from 0 to 255, ready for `sampleMask`. Pixels that
 * are mostly see-through never count.
 */
export function subjectMask(pixels: Pixels, by: PixelSubject): Uint8ClampedArray {
  const { width, height, data } = pixels;
  const mask = new Uint8ClampedArray(width * height);
  for (let index = 0; index < width * height; index++) {
    const alpha = data[index * 4 + 3]!;
    if (alpha < 128) continue;
    const colour: Rgb = [data[index * 4]!, data[index * 4 + 1]!, data[index * 4 + 2]!];
    mask[index] =
      by === "alpha" ? alpha : by === "dark" ? 255 - luma(colour) * 255 : by === "light" ? luma(colour) * 255 : saturation(colour) * 255;
  }
  return mask;
}

const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");
export const toHex = ([red, green, blue]: Rgb) => `#${hex(red)}${hex(green)}${hex(blue)}`;

/**
 * The `count` colours that best describe the subject (median cut): the subject's pixels are split,
 * again and again, across whichever channel they vary most in, and each group's average is a colour.
 * Sorted from dark to light.
 */
export function mainColours(pixels: Pixels, mask: Uint8ClampedArray, threshold: number, count: number): Rgb[] {
  const { width, height } = pixels;
  const inside: number[] = [];
  for (let index = 0; index < width * height; index++) if (mask[index]! >= threshold) inside.push(index);
  if (inside.length === 0) return [];
  // A few thousand pixels describe the colours as well as all of them, much faster.
  const every = Math.max(1, Math.floor(inside.length / 6000));
  const colours: Rgb[] = [];
  for (let at = 0; at < inside.length; at += every) {
    const index = inside[at]!;
    colours.push(colourAt(pixels, index % width, Math.floor(index / width)));
  }

  const groups: Rgb[][] = [colours];
  while (groups.length < count) {
    let widest = -1;
    let widestRange = 0;
    let widestChannel = 0;
    groups.forEach((group, index) => {
      if (group.length < 2) return;
      for (let channel = 0; channel < 3; channel++) {
        const values = group.map((colour) => colour[channel]!);
        const range = Math.max(...values) - Math.min(...values);
        if (range > widestRange) [widest, widestRange, widestChannel] = [index, range, channel];
      }
    });
    if (widest < 0) break;
    const group = groups[widest]!.slice().sort((a, b) => a[widestChannel]! - b[widestChannel]!);
    const middle = Math.floor(group.length / 2);
    groups.splice(widest, 1, group.slice(0, middle), group.slice(middle));
  }

  return groups
    .map((group): Rgb => {
      const sum = group.reduce((total, colour) => [total[0] + colour[0], total[1] + colour[1], total[2] + colour[2]] as const, [
        0, 0, 0,
      ] as const);
      return [sum[0] / group.length, sum[1] / group.length, sum[2] / group.length];
    })
    .sort((a, b) => luma(a) - luma(b));
}

/** The palette colour closest to `colour`, as its index. */
export function nearest(colour: Rgb, palette: readonly Rgb[]): number {
  let best = 0;
  let bestDistance = Infinity;
  palette.forEach((option, index) => {
    // Weighted towards how the eye sees difference: green counts most, blue least.
    const distance = 2 * (colour[0] - option[0]) ** 2 + 4 * (colour[1] - option[1]) ** 2 + 3 * (colour[2] - option[2]) ** 2;
    if (distance < bestDistance) [best, bestDistance] = [index, distance];
  });
  return best;
}
