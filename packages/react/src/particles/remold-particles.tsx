import { forwardRef, useMemo, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef } from "react";
import {
  particles as createParticles,
  loadPixels,
  sampleImagePoints,
  sampleTextPoints,
  type ParticlePalette,
  type ParticlePoint,
  type Particles,
  type ParticlesOptions,
} from "@remold-ui/canvas";
import { samplePath, shapes, type Shape } from "@remold-ui/core";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { ParticleShape, RemoldParticlesProps, RemoldParticlesState } from "./types.js";

/** Gives each points array or shape a stable id, so a new one is a new shape but a re-render isn't. */
const pointIds = new WeakMap<object, number>();
let nextPointId = 0;

const isShape = (shape: ParticleShape): shape is Shape => typeof shape === "object" && typeof (shape as Shape).points === "function";

function idOf(source: object): number {
  if (!pointIds.has(source)) pointIds.set(source, nextPointId++);
  return pointIds.get(source)!;
}

function keyOf(shape: ParticleShape, count: number): string {
  if (typeof shape === "string") return `text:${count}:${shape}`;
  if (isShape(shape)) return `shape:${count}:${idOf(shape)}`;
  if ("text" in shape) return `text:${count}:${shape.font ?? ""}:${shape.text}`;
  if ("path" in shape) return `path:${count}:${shape.fillRule ?? ""}:${shape.mode ?? ""}:${shape.path}`;
  if ("image" in shape) return `image:${count}:${JSON.stringify(shape)}`;

  return `points:${idOf(shape.points)}`;
}

function labelOf(shape: ParticleShape): string | undefined {
  if (typeof shape === "string") return shape;
  return !isShape(shape) && "text" in shape ? shape.text : undefined;
}

/** The longest side images are sampled at: plenty of detail for a few thousand dots, and quick. */
const IMAGE_SIZE = 480;

/** A shape's points, and for an image in 3D, the colours found in it. */
interface Sampled {
  points: readonly ParticlePoint[];
  palette?: ParticlePalette;
}

function sample(shape: ParticleShape, count: number, palette?: readonly string[]): Sampled | Promise<Sampled> {
  if (!isShape(shape) && typeof shape === "object" && "image" in shape && (shape.depth !== undefined || shape.bulge !== undefined)) {
    // In 3D: a relief of the image in its own colours.
    return loadPixels(shape.image, { size: IMAGE_SIZE }).then((pixels) => {
      const relief = shapes.fromPixels(pixels, {
        by: shape.by,
        threshold: shape.threshold,
        depth: shape.depth,
        bulge: shape.bulge,
        colors: shape.colors,
      });
      return { points: relief.points(count), palette: relief.palette };
    });
  }
  const points = flat(shape, count, palette);
  return points instanceof Promise ? points.then((resolved) => ({ points: resolved })) : { points };
}

function flat(shape: ParticleShape, count: number, palette?: readonly string[]): readonly ParticlePoint[] | Promise<readonly ParticlePoint[]> {
  if (typeof shape === "string") return sampleTextPoints(shape, { count });
  if (isShape(shape)) return shape.points(count);
  if ("text" in shape) return sampleTextPoints(shape.text, { count, font: shape.font });
  if ("path" in shape) return samplePath(shape.path, { count, fillRule: shape.fillRule, mode: shape.mode });
  if ("points" in shape) return shape.points;

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      const k = Math.min(1, IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));

      resolve(
        sampleImagePoints(image, {
          count,
          by: shape.by,
          threshold: shape.threshold,
          pattern: shape.pattern,
          details: shape.details,
          palette,
          jitter: shape.jitter ?? 0.25,
          width: Math.round(image.naturalWidth * k),
          height: Math.round(image.naturalHeight * k),
        }),
      );
    };
    image.onerror = () => reject(new Error(`Remold.Particles: couldn't load the image ${shape.image}`));
    image.src = shape.image;
  });
}

/**
 * Thousands of dots that rebuild themselves into each new `shape`: a word, an SVG path, an image
 * or points you sampled yourself.
 *
 * @example
 * ```tsx
 * <Remold.Particles shape="Just landed" className="h-64 w-full" />
 * <Remold.Particles shape={{ image: "/logo.png", by: "dark" }} count={4000} />
 * <Remold.Particles shape={next} transition="scatter" />
 * ```
 */
export const RemoldParticles = forwardRef(function RemoldParticles(
  componentProps: RemoldParticles.Props,
  forwardedRef: ForwardedRef<HTMLCanvasElement>,
) {
  const {
    shape,
    count = 1200,
    label,
    pairing,
    transition,
    radius,
    dot,
    color,
    palette,
    fit,
    padding,
    pointer,
    spring,
    enter,
    reducedMotion,
    loop,
    maxPixelRatio,
    camera,
    blend,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLCanvasElement | null>(null);
  const [instance, setInstance] = useState<Particles | null>(null);
  const key = keyOf(shape, count);
  const latest = useLatest({ shape, count, label: label ?? labelOf(shape), pairing, transition, radius, palette });
  const mountOptions = useLatest<ParticlesOptions>({
    radius,
    shape: dot,
    color,
    palette,
    fit,
    padding,
    pointer,
    spring,
    enter,
    reducedMotion,
    loop,
    maxPixelRatio,
    camera,
    blend,
    label: label ?? labelOf(shape),
  });

  // One particles instance per canvas, made once the canvas exists.
  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = createParticles(element, mountOptions.current);

    setInstance(created);

    return () => {
      created.destroy();
      setInstance(null);
    };
  }, [element]);

  // A changed palette recolours the dots where they are, without moving them.
  const paletteKey = palette ? JSON.stringify(palette) : "";
  useIsoLayoutEffect(() => {
    if (!instance || !palette) return;

    instance.setPalette(palette);
  }, [instance, paletteKey]);

  // A changed camera turns, tilts or pauses the cloud from where it is. A changed angle turns it to
  // that angle, so a drag can steer it; an unchanged one is left out, so the cloud keeps turning.
  const { spin, tilt, distance, sway, angle } = typeof camera === "object" ? camera : {};
  const shownAngle = useRef(angle);
  useIsoLayoutEffect(() => {
    if (!instance || !mountOptions.current.camera) return;

    const turned = angle !== shownAngle.current;
    shownAngle.current = angle;
    instance.setCamera({ spin, tilt, distance, sway, ...(turned ? { angle } : {}) });
  }, [instance, spin, tilt, distance, sway, angle]);

  // A new shape: sample it (images load first) and flow into it.
  const warned = useRef(false);
  useIsoLayoutEffect(() => {
    if (!instance) return;

    let current = true;
    const { shape, count, label, pairing, transition, radius, palette } = latest.current;

    const apply = ({ points, palette: found }: Sampled) => {
      if (!current) return;
      // An image's own colours, unless you gave a palette.
      if (found && !palette) instance.setPalette(found);
      instance.to(points, { label, pairing, transition, radius });
    };

    const fail = (error: unknown) => {
      if (!warned.current) console.warn(error);
      warned.current = true;
    };

    try {
      const result = sample(shape, count, palette && (Array.isArray(palette) ? palette : Object.values(palette)));

      if (result instanceof Promise) result.then(apply, fail);
      else apply(result);
    } catch (error) {
      fail(error);
    }

    return () => {
      current = false;
    };
  }, [instance, key]);

  const state = useMemo<RemoldParticles.State>(() => ({}), []);

  return useRenderElement(
    "canvas",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: elementProps as CanvasHTMLAttributes<HTMLCanvasElement> & Record<string, unknown>,
    },
  );
});

export namespace RemoldParticles {
  export type State = RemoldParticlesState;
  export type Props = RemoldParticlesProps;
}
