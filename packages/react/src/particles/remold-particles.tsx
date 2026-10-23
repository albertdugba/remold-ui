import { forwardRef, useMemo, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef } from "react";
import { particles as createParticles, sampleImagePoints, sampleTextPoints, type Particles, type ParticlesOptions } from "@remold-ui/canvas";
import { samplePath, type CloudPoint } from "@remold-ui/core";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { ParticleShape, RemoldParticlesProps, RemoldParticlesState } from "./types.js";

/** Gives each points array a stable id, so a new array is a new shape but a re-render isn't. */
const pointIds = new WeakMap<readonly CloudPoint[], number>();
let nextPointId = 0;

function keyOf(shape: ParticleShape, count: number): string {
  if (typeof shape === "string") return `text:${count}:${shape}`;
  if ("text" in shape) return `text:${count}:${shape.font ?? ""}:${shape.text}`;
  if ("path" in shape) return `path:${count}:${shape.fillRule ?? ""}:${shape.mode ?? ""}:${shape.path}`;
  if ("image" in shape) return `image:${count}:${JSON.stringify(shape)}`;
  if (!pointIds.has(shape.points)) pointIds.set(shape.points, nextPointId++);
  return `points:${pointIds.get(shape.points)}`;
}

function labelOf(shape: ParticleShape): string | undefined {
  if (typeof shape === "string") return shape;
  return "text" in shape ? shape.text : undefined;
}

/** The longest side images are sampled at: plenty of detail for a few thousand dots, and quick. */
const IMAGE_SIZE = 480;

function sample(shape: ParticleShape, count: number, palette?: readonly string[]): readonly CloudPoint[] | Promise<readonly CloudPoint[]> {
  if (typeof shape === "string") return sampleTextPoints(shape, { count });
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
    radius,
    dot,
    color,
    palette,
    padding,
    pointer,
    spring,
    enter,
    reducedMotion,
    loop,
    maxPixelRatio,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLCanvasElement | null>(null);
  const [instance, setInstance] = useState<Particles | null>(null);
  const key = keyOf(shape, count);
  const latest = useLatest({ shape, count, label: label ?? labelOf(shape), pairing, radius, palette });
  const mountOptions = useLatest<ParticlesOptions>({
    radius,
    shape: dot,
    color,
    palette,
    padding,
    pointer,
    spring,
    enter,
    reducedMotion,
    loop,
    maxPixelRatio,
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

  // A new shape: sample it (images load first) and flow into it.
  const warned = useRef(false);
  useIsoLayoutEffect(() => {
    if (!instance) return;
    let current = true;
    const { shape, count, label, pairing, radius, palette } = latest.current;
    const apply = (points: readonly CloudPoint[]) => {
      if (current) instance.to(points, { label, pairing, radius });
    };
    const fail = (error: unknown) => {
      if (!warned.current) console.warn(error);
      warned.current = true;
    };
    try {
      const result = sample(shape, count, palette);
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
