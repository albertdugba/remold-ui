import type { Point } from "../interpolate";
import { checkSampleOptions, sampleLattice, type Box, type SampleOptions } from "./lattice";

export interface Mask {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface MaskSampleOptions extends SampleOptions {
  threshold?: number;
}

interface Reader {
  value: (x: number, y: number) => number;
  threshold: number;
}

const RGBA = 4;
const ALPHA = 3;

function checkSize({ width, height }: Mask) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 0 || height < 0) {
    throw new RangeError(`sampleMask: width and height must be whole numbers, got ${width} × ${height}`);
  }
}

function channelsOf({ data }: Mask, pixels: number): number {
  const channels = data.length / pixels;

  if (channels !== 1 && channels !== RGBA) {
    throw new RangeError(`sampleMask: data needs ${pixels} values (one per pixel) or ${pixels * RGBA} (RGBA), got ${data.length}`);
  }

  return channels;
}

function readerFor(mask: Mask, channels: number, options: MaskSampleOptions): Reader {
  const { width, data } = mask;
  const float = data instanceof Float32Array || data instanceof Float64Array;
  const threshold = options.threshold ?? (float ? 0.5 : 128);

  if (!Number.isFinite(threshold)) throw new RangeError(`sampleMask: threshold must be a finite number, got ${threshold}`);

  const offset = channels === RGBA ? ALPHA : 0;

  return { value: (x, y) => data[(y * width + x) * channels + offset]!, threshold };
}

function filledArea({ width, height }: Mask, { value, threshold }: Reader): { area: number; box: Box } {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let area = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (value(x, y) < threshold) continue;

      area++;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    }
  }

  return { area, box };
}

const filledAt = ({ width, height }: Mask, { value, threshold }: Reader) => (x: number, y: number) => {
  const [column, row] = [Math.floor(x), Math.floor(y)];

  return column >= 0 && row >= 0 && column < width && row < height && value(column, row) >= threshold;
};

const maskRow = (box: Box, filled: (x: number, y: number) => boolean) => (y: number, emit: (from: number, to: number) => void) => {
  const row = Math.floor(y);
  let start = -1;

  for (let x = box.minX; x <= box.maxX + 1; x++) {
    const on = x <= box.maxX && filled(x, row);

    if (on && start < 0) start = x;

    if (!on && start >= 0) {
      emit(start, x);
      start = -1;
    }
  }
};

export function sampleMask(mask: Mask, options: MaskSampleOptions = {}): Point[] {
  checkSize(mask);
  checkSampleOptions(options, "sampleMask");

  const pixels = mask.width * mask.height;

  if (pixels === 0) return [];

  const reader = readerFor(mask, channelsOf(mask, pixels), options);
  const { area, box } = filledArea(mask, reader);

  if (area === 0) return [];

  const filled = filledAt(mask, reader);

  return sampleLattice({
    box: { ...box, maxX: box.maxX + 1, maxY: box.maxY + 1 },
    area,
    options,
    row: maskRow(box, filled),
    inside: filled,
  });
}
