import { forwardRef, useMemo, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef, type MutableRefObject } from "react";
import { particles as createParticles, type ParticleCamera, type ParticlePalette, type Particles, type ParticlesOptions } from "@remold-ui/canvas";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import { keyOf, labelOf, sample, type Sampled } from "./sampling.js";
import type { ParticleShape, RemoldParticlesProps, RemoldParticlesState } from "./types.js";

interface ShapeRequest {
  shape: ParticleShape;
  count: number;
  label: string | undefined;
  pairing: RemoldParticlesProps["pairing"];
  transition: RemoldParticlesProps["transition"];
  radius: number | undefined;
  palette: ParticlePalette | undefined;
}

const DEFAULT_COUNT = 1200;

const paletteList = (palette: ParticlePalette | undefined) => palette && (Array.isArray(palette) ? palette : Object.values(palette));

function useParticlesInstance(element: HTMLCanvasElement | null, options: MutableRefObject<ParticlesOptions>): Particles | null {
  const [instance, setInstance] = useState<Particles | null>(null);

  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = createParticles(element, options.current);

    setInstance(created);

    return () => {
      created.destroy();
      setInstance(null);
    };
  }, [element]);

  return instance;
}

function usePaletteSync(instance: Particles | null, palette: ParticlePalette | undefined) {
  const paletteKey = palette ? JSON.stringify(palette) : "";

  useIsoLayoutEffect(() => {
    if (!instance || !palette) return;

    instance.setPalette(palette);
  }, [instance, paletteKey]);
}

function useCameraSync(instance: Particles | null, camera: ParticlesOptions["camera"], mounted: MutableRefObject<ParticlesOptions>) {
  const { spin, tilt, distance, sway, angle }: ParticleCamera = typeof camera === "object" ? camera : {};
  const shownAngle = useRef(angle);

  useIsoLayoutEffect(() => {
    if (!instance || !mounted.current.camera) return;

    const turned = angle !== shownAngle.current;

    shownAngle.current = angle;
    instance.setCamera({ spin, tilt, distance, sway, ...(turned ? { angle } : {}) });
  }, [instance, spin, tilt, distance, sway, angle]);
}

function useShapeSync(instance: Particles | null, key: string, request: MutableRefObject<ShapeRequest>) {
  const warned = useRef(false);

  useIsoLayoutEffect(() => {
    if (!instance) return;

    let current = true;
    const { shape, count, label, pairing, transition, radius, palette } = request.current;

    const apply = ({ points, palette: found }: Sampled) => {
      if (!current) return;

      if (found && !palette) instance.setPalette(found);

      instance.to(points, { label, pairing, transition, radius });
    };

    const fail = (error: unknown) => {
      if (!warned.current) console.warn(error);

      warned.current = true;
    };

    try {
      const result = sample(shape, count, paletteList(palette));

      if (result instanceof Promise) result.then(apply, fail);
      else apply(result);
    } catch (error) {
      fail(error);
    }

    return () => {
      current = false;
    };
  }, [instance, key]);
}

export const RemoldParticles = forwardRef(function RemoldParticles(
  componentProps: RemoldParticles.Props,
  forwardedRef: ForwardedRef<HTMLCanvasElement>,
) {
  const {
    shape,
    count = DEFAULT_COUNT,
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
  const shownLabel = label ?? labelOf(shape);
  const request = useLatest<ShapeRequest>({ shape, count, label: shownLabel, pairing, transition, radius, palette });
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
    label: shownLabel,
  });

  const instance = useParticlesInstance(element, mountOptions);

  usePaletteSync(instance, palette);
  useCameraSync(instance, camera, mountOptions);
  useShapeSync(instance, keyOf(shape, count), request);

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
