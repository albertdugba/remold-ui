import { loadPixels, sampleImagePoints, sampleTextPoints, type ParticlePalette, type ParticlePoint } from "@remold-ui/canvas";
import { samplePath, shapes, type Shape } from "@remold-ui/core";
import type { ParticleShape } from "./types.js";

export interface Sampled {
  points: readonly ParticlePoint[];
  palette?: ParticlePalette;
}

type ImageShape = Extract<ParticleShape, { image: string }>;

const IMAGE_SIZE = 480;
const DEFAULT_JITTER = 0.25;

const pointIds = new WeakMap<object, number>();
let nextPointId = 0;

const isShape = (shape: ParticleShape): shape is Shape => typeof shape === "object" && typeof (shape as Shape).points === "function";

function idOf(source: object): number {
  if (!pointIds.has(source)) pointIds.set(source, nextPointId++);

  return pointIds.get(source)!;
}

export function keyOf(shape: ParticleShape, count: number): string {
  if (typeof shape === "string") return `text:${count}:${shape}`;

  if (isShape(shape)) return `shape:${count}:${idOf(shape)}`;

  if ("text" in shape) return `text:${count}:${shape.font ?? ""}:${shape.text}`;

  if ("path" in shape) return `path:${count}:${shape.fillRule ?? ""}:${shape.mode ?? ""}:${shape.path}`;

  if ("image" in shape) return `image:${count}:${JSON.stringify(shape)}`;

  return `points:${idOf(shape.points)}`;
}

export function labelOf(shape: ParticleShape): string | undefined {
  if (typeof shape === "string") return shape;

  return !isShape(shape) && "text" in shape ? shape.text : undefined;
}

const isRelief = (shape: ParticleShape): shape is ImageShape =>
  !isShape(shape) && typeof shape === "object" && "image" in shape && (shape.depth !== undefined || shape.bulge !== undefined);

async function relief(shape: ImageShape, count: number): Promise<Sampled> {
  const pixels = await loadPixels(shape.image, { size: IMAGE_SIZE });
  const built = shapes.fromPixels(pixels, { by: shape.by, threshold: shape.threshold, depth: shape.depth, bulge: shape.bulge, colors: shape.colors });

  return { points: built.points(count), palette: built.palette };
}

function imagePoints(shape: ImageShape, count: number, palette?: readonly string[]): Promise<readonly ParticlePoint[]> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      const scale = Math.min(1, IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));

      resolve(
        sampleImagePoints(image, {
          count,
          by: shape.by,
          threshold: shape.threshold,
          pattern: shape.pattern,
          details: shape.details,
          palette,
          jitter: shape.jitter ?? DEFAULT_JITTER,
          width: Math.round(image.naturalWidth * scale),
          height: Math.round(image.naturalHeight * scale),
        }),
      );
    };

    image.onerror = () => reject(new Error(`Remold.Particles: couldn't load the image ${shape.image}`));
    image.src = shape.image;
  });
}

function flat(shape: ParticleShape, count: number, palette?: readonly string[]): readonly ParticlePoint[] | Promise<readonly ParticlePoint[]> {
  if (typeof shape === "string") return sampleTextPoints(shape, { count });

  if (isShape(shape)) return shape.points(count);

  if ("text" in shape) return sampleTextPoints(shape.text, { count, font: shape.font });

  if ("path" in shape) return samplePath(shape.path, { count, fillRule: shape.fillRule, mode: shape.mode });

  if ("points" in shape) return shape.points;

  return imagePoints(shape, count, palette);
}

export function sample(shape: ParticleShape, count: number, palette?: readonly string[]): Sampled | Promise<Sampled> {
  if (isRelief(shape)) return relief(shape, count);

  const points = flat(shape, count, palette);

  return points instanceof Promise ? points.then((resolved) => ({ points: resolved })) : { points };
}
