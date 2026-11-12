import type { Point } from "../../interpolate";
import { toCubics, type Subpath } from "../../path/normalize";
import { parsePath } from "../../path/parse";
import { bounds, samplePoints, signedArea } from "../../path/measure";
import { checkPixels, colourAt, luma, mainColours, nearest, subjectMask, toHex, type PixelSubject, type Pixels, type Rgb } from "../pixels";
import { sampleMask } from "../sample-mask";
import { samplePath } from "../sample-path";
import { checkFinite, checkPositive, shape, shareOut, type Sample, type Shape, type Vec3 } from "./base";

export interface FromPathOptions {
  depth?: number;
  fillRule?: "nonzero" | "evenodd";
}

export interface FromPixelsOptions {
  by?: PixelSubject;
  threshold?: number;
  depth?: number;
  bulge?: number;
  colors?: number;
}

export interface PixelShape extends Shape {
  readonly palette: Readonly<Record<string, string>>;
}

interface Placement {
  scale: number;
  centreX: number;
  centreY: number;
}

interface Subject {
  filled: number;
  half: number;
  centreX: number;
  centreY: number;
  reachX: number;
  reachY: number;
}

const SUBJECTS: readonly PixelSubject[] = ["alpha", "dark", "light", "saturation"];
const PIXEL_JITTER = 0.35;
const SEED_RANGE = 2 ** 31;
const MAX_COLOURS = 64;

function outlineLength(subpath: Subpath): number {
  const outline = samplePoints(subpath);

  return outline.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - outline[index]!.x, point.y - outline[index]!.y), 0);
}

function placementFor(subpaths: readonly Subpath[]): Placement {
  const box = bounds(subpaths);

  if (!box || (box.width === 0 && box.height === 0)) throw new RangeError("shapes: fromPath needs a path with some size");

  return { scale: 2 / Math.max(box.width, box.height), centreX: box.x + box.width / 2, centreY: box.y + box.height / 2 };
}

function pathSample({ scale, centreX, centreY }: Placement, { x, y }: Point, z: number): Sample {
  const [px, py] = [(x - centreX) * scale, (centreY - y) * scale];

  return { at: [px, py, z], along: (px + 1) / 2, group: 0 };
}

export function fromPath(path: string, { depth = 0.3, fillRule = "nonzero" }: FromPathOptions = {}): Shape {
  checkPositive(depth, "fromPath.depth");

  const subpaths = toCubics(parsePath(path));
  const placement = placementFor(subpaths);
  const face = Math.abs(subpaths.reduce((sum, subpath) => sum + signedArea(subpath), 0)) * placement.scale ** 2;
  const edge = subpaths.reduce((sum, subpath) => sum + outlineLength(subpath), 0) * placement.scale;

  return shape(face * 2 + edge * depth, (count, random) => {
    const [faces, sides] = shareOut(count, [face * 2, edge * depth]) as [number, number];
    const front = Math.ceil(faces / 2);
    const filled = front > 0 ? samplePath(subpaths, { count: front, fillRule }) : [];
    const outlined = sides > 0 ? samplePath(subpaths, { count: sides, mode: "outline" }) : [];

    return [
      ...filled.map((point) => pathSample(placement, point, depth / 2)),
      ...filled.slice(0, faces - front).map((point) => pathSample(placement, point, -depth / 2)),
      ...outlined.map((point) => pathSample(placement, point, (random() - 0.5) * depth)),
    ];
  });
}

function checkPixelOptions(by: PixelSubject, threshold: number, depth: number, bulge: number, colors: number) {
  if (!SUBJECTS.includes(by)) {
    throw new RangeError(`shapes: fromPixels.by takes "alpha", "dark", "light" or "saturation", got ${String(by)}`);
  }

  checkFinite(threshold, "fromPixels.threshold");
  checkFinite(depth, "fromPixels.depth");
  checkFinite(bulge, "fromPixels.bulge");

  if (!Number.isInteger(colors) || colors < 1 || colors > MAX_COLOURS) {
    throw new RangeError(`shapes: fromPixels.colors must be a whole number from 1 to 64, got ${colors}`);
  }
}

function subjectOf({ width, height }: Pixels, mask: Uint8ClampedArray, threshold: number): Subject {
  let [minX, minY, maxX, maxY, filled] = [width, height, 0, 0, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]! < threshold) continue;

      filled++;
      [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x + 1), Math.max(maxY, y + 1)];
    }
  }

  const half = Math.max(maxX - minX, maxY - minY, 1) / 2;

  return {
    filled,
    half,
    centreX: (minX + maxX) / 2,
    centreY: (minY + maxY) / 2,
    reachX: Math.max((maxX - minX) / 2, 1) / half,
    reachY: Math.max((maxY - minY) / 2, 1) / half,
  };
}

interface Relief {
  pixels: Pixels;
  subject: Subject;
  found: readonly Rgb[];
  names: readonly string[];
  depth: number;
  bulge: number;
}

function reliefSample({ pixels, subject, found, names, depth, bulge }: Relief, { x, y }: Point): Sample {
  const colour = colourAt(pixels, Math.min(pixels.width - 1, Math.floor(x)), Math.min(pixels.height - 1, Math.floor(y)));
  const [px, py] = [(x - subject.centreX) / subject.half, (subject.centreY - y) / subject.half];
  const round = 1 - (px / subject.reachX) ** 2 - (py / subject.reachY) ** 2;
  const z = (luma(colour) - 0.5) * depth + bulge * Math.sqrt(Math.max(0, round));

  return {
    at: [px, py, z] as Vec3,
    along: (px + 1) / 2,
    group: 0,
    ...(found.length > 0 ? { tone: names[nearest(colour, found)]! } : {}),
  };
}

export function fromPixels(
  pixels: Pixels,
  { by = "alpha", threshold = 128, depth = 0.25, bulge = 0, colors = 10 }: FromPixelsOptions = {},
): PixelShape {
  checkPixels(pixels, "shapes: fromPixels");
  checkPixelOptions(by, threshold, depth, bulge, colors);

  const mask = subjectMask(pixels, by);
  const found = mainColours(pixels, mask, threshold, colors);
  const names = found.map((_, index) => `color${index + 1}`);
  const subject = subjectOf(pixels, mask, threshold);
  const relief: Relief = { pixels, subject, found, names, depth, bulge };
  const maskData = { width: pixels.width, height: pixels.height, data: mask };

  const built = shape(subject.filled / subject.half ** 2, (count, random) =>
    sampleMask(maskData, { count, threshold, jitter: PIXEL_JITTER, seed: Math.floor(random() * SEED_RANGE) }).map((point) =>
      reliefSample(relief, point),
    ),
  );

  return Object.assign(built, { palette: Object.fromEntries(found.map((colour, index) => [names[index]!, toHex(colour)])) });
}
