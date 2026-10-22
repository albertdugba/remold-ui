/**
 * `<Remold.Particles shape="Just landed" />`: a canvas of dots that take the shape of
 * whatever you give it, and flow into the next shape when it changes. Each dot heads for its
 * nearest place in the new shape.
 *
 * `shape` can be words, an SVG path, an image, or your own points:
 *
 * ```tsx
 * <Remold.Particles shape="Hello" />
 * <Remold.Particles shape={{ path: HEART }} />
 * <Remold.Particles shape={{ image: "/logo.png", by: "dark", threshold: 80 }} />
 * <Remold.Particles shape={{ points: myPoints }} />
 * ```
 *
 * Shapes are sampled in the browser, so server rendering gives an empty canvas that fills in
 * on load. `ref` is the canvas.
 */
import { forwardRef, useMemo, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef } from "react";
import {
  particles as createParticles,
  sampleImagePoints,
  sampleTextPoints,
  type Particles,
  type ParticlesOptions,
  type ParticlesToOptions,
} from "@remold-ui/canvas";
import { samplePath, type CloudPoint } from "@remold-ui/core";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

export type ParticleShape =
  | string
  | { text: string; font?: string }
  | { path: string; fillRule?: "nonzero" | "evenodd"; mode?: "fill" | "outline" }
  | {
      image: string;
      by?: "alpha" | "dark" | "light" | "saturation";
      threshold?: number;
      pattern?: "hex" | "grid";
      jitter?: number;
      details?: readonly { x: number; y: number; tone?: number }[];
    }
  | { points: readonly CloudPoint[] };

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
  return useRenderElement<RemoldParticles.State, HTMLCanvasElement>(
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
  export type State = Record<string, never>;

  export interface Props
    extends BaseProps<State, HTMLCanvasElement>,
      Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "color">,
      Pick<
        ParticlesOptions,
        "color" | "palette" | "padding" | "pointer" | "spring" | "enter" | "reducedMotion" | "loop" | "maxPixelRatio"
      > {
    /** What the dots show: words, `{ text, font }`, `{ path }`, `{ image, by, threshold, pattern, jitter, details }` or `{ points }`. Change it to morph. */
    shape: ParticleShape;
    /** How many dots. Default 1200. Ignored for `{ points }`, which brings its own. */
    count?: number;
    /** What the dots show, for screen readers. Defaults to the words of a text shape. */
    label?: string;
    /** How dots find their place in the next shape. See `particles().to`. Default `"match"`. */
    pairing?: ParticlesToOptions["pairing"];
    /** Dot radius in CSS pixels. Changing it springs the dots to the new size. Default 2.5. */
    radius?: number;
    /** Dot shape. Default `"circle"`; squares are cheaper for very large clouds. Read once. */
    dot?: "circle" | "square";
  }
}
