/**
 * Flat shapes as signed distance fields, so the renderer can give them depth. A word or an SVG path
 * is drawn into a mask, then every texel stores how far it is from the shape's edge in world units:
 * negative inside, positive outside. Mixing two fields morphs one shape into the other.
 */

/** The world box every shape is fitted into: 4 units wide, 2 high, centred on the origin. */
export const WORLD_WIDTH = 4;
export const WORLD_HEIGHT = 2;

const FIELD_WIDTH = 512;
const FIELD_HEIGHT = 256;
const UNITS_PER_TEXEL = WORLD_WIDTH / FIELD_WIDTH;
const FAR = 1e20;
const OPAQUE = 127;
const PROBE_SIZE = 200;

const TEXT_WIDTH = 0.86;
const TEXT_HEIGHT = 0.56;
const PATH_HEIGHT = 0.8;

export interface DistanceField {
  width: number;
  height: number;
  /** Row 0 is the top of the shape. */
  distances: Float32Array;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_TEXT_FONT = (pixels: number) => `800 ${pixels}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif`;

/** A word, fitted to the world box. `font` gives a CSS font for a pixel size. */
export function textField(text: string, font: (pixels: number) => string = DEFAULT_TEXT_FONT): DistanceField {
  if (text.trim() === "") throw new RangeError("ascii: text needs at least one visible character");

  return fieldFromMask((context) => {
    context.font = font(PROBE_SIZE);
    const metrics = context.measureText(text);
    const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const scale = Math.min((FIELD_WIDTH * TEXT_WIDTH) / metrics.width, (FIELD_HEIGHT * TEXT_HEIGHT) / inkHeight);

    context.font = font(PROBE_SIZE * scale);
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillText(text, FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + ((metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) * scale) / 2);
  });
}

/** An SVG path's filled shape, fitted to the world box. */
export function pathField(path: string, viewBox: ViewBox): DistanceField {
  if (!(viewBox.width > 0 && viewBox.height > 0)) throw new RangeError(`ascii: a path's viewBox needs a positive size, got ${viewBox.width}×${viewBox.height}`);

  return fieldFromMask((context) => {
    const scale = (FIELD_HEIGHT * PATH_HEIGHT) / Math.max(viewBox.width, viewBox.height);

    context.translate(FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
    context.scale(scale, scale);
    context.translate(-(viewBox.x + viewBox.width / 2), -(viewBox.y + viewBox.height / 2));
    context.fill(new Path2D(path));
  });
}

function fieldFromMask(draw: (context: CanvasRenderingContext2D) => void): DistanceField {
  const canvas = document.createElement("canvas");
  canvas.width = FIELD_WIDTH;
  canvas.height = FIELD_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("ascii: no 2D canvas to draw a shape into");

  context.fillStyle = "#fff";
  draw(context);

  const { data } = context.getImageData(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  const inside = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT);

  for (let texel = 0; texel < inside.length; texel++) inside[texel] = (data[texel * 4 + 3] ?? 0) > OPAQUE ? 1 : 0;

  return { width: FIELD_WIDTH, height: FIELD_HEIGHT, distances: signedDistances(inside, FIELD_WIDTH, FIELD_HEIGHT, UNITS_PER_TEXEL) };
}

/**
 * Exact signed distances from a mask, `1` inside: how far each texel's centre is from the nearest
 * texel edge on the other side, in `unitsPerTexel`.
 */
export function signedDistances(inside: Uint8Array, width: number, height: number, unitsPerTexel = 1): Float32Array {
  const count = width * height;
  const toInside = new Float64Array(count);
  const toOutside = new Float64Array(count);

  for (let texel = 0; texel < count; texel++) {
    toInside[texel] = inside[texel] ? 0 : FAR;
    toOutside[texel] = inside[texel] ? FAR : 0;
  }

  squaredDistances(toInside, width, height);
  squaredDistances(toOutside, width, height);

  const distances = new Float32Array(count);

  for (let texel = 0; texel < count; texel++) {
    const outside = toInside[texel] ?? 0;
    const texels = outside > 0 ? Math.sqrt(outside) - 0.5 : -(Math.sqrt(toOutside[texel] ?? 0) - 0.5);
    distances[texel] = texels * unitsPerTexel;
  }

  return distances;
}

/** Felzenszwalb and Huttenlocher's exact squared distance transform, columns then rows, in place. */
function squaredDistances(grid: Float64Array, width: number, height: number) {
  const longest = Math.max(width, height);
  const line = new Float64Array(longest);
  const result = new Float64Array(longest);
  const parabolas = new Int32Array(longest);
  const bounds = new Float64Array(longest + 1);

  for (let column = 0; column < width; column++) {
    for (let row = 0; row < height; row++) line[row] = grid[row * width + column] ?? FAR;
    transformLine(line, height, parabolas, bounds, result);
    for (let row = 0; row < height; row++) grid[row * width + column] = result[row] ?? FAR;
  }

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) line[column] = grid[row * width + column] ?? FAR;
    transformLine(line, width, parabolas, bounds, result);
    for (let column = 0; column < width; column++) grid[row * width + column] = result[column] ?? FAR;
  }
}

function transformLine(values: Float64Array, length: number, parabolas: Int32Array, bounds: Float64Array, result: Float64Array) {
  const value = (at: number) => values[at] ?? FAR;
  const parabola = (at: number) => parabolas[at] ?? 0;
  const intersection = (from: number, to: number) => (value(to) + to * to - (value(from) + from * from)) / (2 * to - 2 * from);
  let last = 0;

  parabolas[0] = 0;
  bounds[0] = -FAR;
  bounds[1] = FAR;

  for (let position = 1; position < length; position++) {
    let crossing = intersection(parabola(last), position);

    while (crossing <= (bounds[last] ?? -FAR)) {
      last--;
      crossing = intersection(parabola(last), position);
    }

    last++;
    parabolas[last] = position;
    bounds[last] = crossing;
    bounds[last + 1] = FAR;
  }

  let current = 0;

  for (let position = 0; position < length; position++) {
    while ((bounds[current + 1] ?? FAR) < position) current++;
    const offset = position - parabola(current);
    result[position] = offset * offset + value(parabola(current));
  }
}
