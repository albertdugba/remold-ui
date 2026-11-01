/**
 * Particles: a canvas full of dots that rebuild themselves into each new shape.
 *
 * ```ts
 * const dots = particles(canvas, { points: await sampleTextPoints("Hello"), label: "Hello" });
 * dots.to(await sampleTextPoints("World"));
 * ```
 */
import { fitPoints, pointCloud, value, type CloudPoint, type PointMatches } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { fitCanvas, type CanvasSize } from "../canvas-size";
import { matchByIndex, matchOffThread, OFF_THREAD_MATCH_CELLS } from "./matching";
import { createPointerController } from "./pointer";
import { hasVariables, resolveColors, watchTheme } from "./css-colors";
import { createParticleRenderer } from "./renderer";
import type { ParticleFit, Particles, ParticlesOptions, ParticlesToOptions, ParticleTransition } from "./types";

export { sampleImagePoints, sampleTextPoints, type ImageSampleOptions, type TextSampleOptions } from "./sampling";
export { sampleElementPoints, type ElementSampleOptions } from "./element";
export type { ParticleFill, ParticleFit, ParticleTransition, Particles, ParticlesOptions, ParticlesToOptions } from "./types";

export function particles(canvas: HTMLCanvasElement, options: ParticlesOptions = {}): Particles {
  const configuration = createConfiguration(options);
  let size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });
  let shownPoints = options.points ?? [];
  let fittedSize = dimensions(size);
  let pendingTransition = 0;
  let destroyed = false;
  let running = false;
  let visible = true;
  let pairing = 0;
  const waiting: (() => void)[] = [];
  const cloud = pointCloud(
    fitPointsToCanvas({ points: shownPoints, fit: configuration.fit, padding: configuration.padding, size }),
    options,
  );
  const radius = value(configuration.radius, { precision: 0.005 });
  const reducedMotion = () => options.reducedMotion === "always" || (options.reducedMotion !== "never" && prefersReducedMotion());

  const wake = () => {
    if (destroyed || running) return;

    running = true;
    configuration.loop.add(tick);
  };
  const pointerController = createPointerController({
    canvas,
    enabled: configuration.pointer !== null,
    getSize: () => size,
    wake,
  });

  // `var(--name)` colours are read from the canvas's styles, and again whenever the theme changes.
  let palette = options.palette && resolveColors(options.palette, canvas);
  const stopWatchingTheme = hasVariables(options.palette)
    ? watchTheme(() => {
        palette = resolveColors(options.palette!, canvas);
        renderer.render();
      })
    : null;

  const renderer = createParticleRenderer({
    canvas,
    context: canvas.getContext("2d"),
    cloud,
    radius,
    pointer: pointerController.pointer,
    getSize: () => size,
    color: options.color,
    getPalette: () => palette,
    shape: configuration.shape,
    pointerEffect: configuration.pointer,
    reducedMotion,
    isDestroyed: () => destroyed,
  });

  const resizeObserver = createResizeObserver({
    canvas,
    cloud,
    getFittedPoints: () => fitPointsToCanvas({ points: shownPoints, fit: configuration.fit, padding: configuration.padding, size }),
    getSize: () => size,
    setSize: (nextSize) => (size = nextSize),
    getFittedSize: () => fittedSize,
    setFittedSize: (nextSize) => (fittedSize = nextSize),
    refit: configuration.fit !== "none",
    maxPixelRatio: options.maxPixelRatio,
    resetFill: renderer.resetFill,
    render: renderer.render,
  });
  const visibilityObserver = createVisibilityObserver({ canvas, cloud, wake, setVisible: (nextVisible) => (visible = nextVisible) });

  setCanvasLabel(canvas, options.label);
  renderer.render();

  function tick(deltaTime: number): boolean {
    if (destroyed) {
      running = false;

      return running;
    }
    let moving = cloud.step(deltaTime);

    for (const animatedValue of [pointerController.pointer.x, pointerController.pointer.y, pointerController.pointer.presence, radius]) {
      if (animatedValue.step(deltaTime)) moving = true;
    }
    if (!visible) {
      running = false;

      return running;
    }
    renderer.render();
    running = moving;
    if (!running) settle();

    return running;
  }

  function settle(): void {
    if (pairing > 0) return;
    for (const resolve of waiting.splice(0)) resolve();
  }

  function transitionTo(points: readonly CloudPoint[], transitionOptions: ParticlesToOptions = {}): void {
    if (destroyed) return;

    validatePairing(transitionOptions.pairing);
    const scatter = scatterOf(transitionOptions.transition);

    updateRadius({ radius: transitionOptions.radius, animatedRadius: radius, reducedMotion });
    shownPoints = points;
    fittedSize = dimensions(size);
    const ticket = ++pendingTransition;
    const show = (matches?: PointMatches) => {
      if (destroyed || ticket !== pendingTransition) return;

      const targetPoints = fitPointsToCanvas({ points, fit: configuration.fit, padding: configuration.padding, size });

      cloud.to(targetPoints, { instant: reducedMotion(), ...(matches ? { matches } : {}), ...(scatter ? { scatter } : {}) });
      setCanvasLabel(canvas, transitionOptions.label);
      renderer.render();
      if (!cloud.settled || !radius.settled) wake();
    };
    if (transitionOptions.pairing === "index" && cloud.live === points.length) {
      show(matchByIndex(points.length));

      return;
    }
    const targetPoints = fitPointsToCanvas({ points, fit: configuration.fit, padding: configuration.padding, size });
    const heading = cloud.heading();
    const matches =
      heading.length * points.length > OFF_THREAD_MATCH_CELLS
        ? matchOffThread({ from: heading, to: targetPoints, match: options.match })
        : null;
    if (matches) {
      // Paired off the main thread: `settled()` waits for the pairing too.
      pairing++;
      const finish = (found?: PointMatches) => {
        pairing--;
        show(found);
        if (!running) settle();
      };
      matches.then(finish, () => finish());
    } else show();
  }

  return {
    get count() {
      return cloud.live;
    },
    to: transitionTo,
    render: renderer.render,
    settled() {
      return new Promise<void>((resolve) => {
        waiting.push(resolve);
        if (!running) settle();
      });
    },
    destroy() {
      destroyed = true;
      stopWatchingTheme?.();
      settle();
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      pointerController.destroy();
    },
  };
}

function createConfiguration(options: ParticlesOptions) {
  const radius = options.radius ?? 2.5;
  const fit = options.fit ?? "contain";

  if (!(radius > 0)) throw new RangeError(`particles: radius must be positive, got ${radius}`);
  const frame = typeof fit === "object" && fit !== null;
  if (fit !== "contain" && fit !== "none" && !(frame && fit.width > 0 && fit.height > 0)) {
    throw new RangeError(`particles: fit must be "contain", "none" or a frame with a positive width and height, got ${JSON.stringify(fit)}`);
  }
  if (options.palette?.length === 0) throw new RangeError("particles: palette needs at least one colour");
  return {
    radius,
    fit,
    padding: options.padding ?? 24,
    shape: options.shape ?? "circle",
    pointer: options.pointer === false ? null : { radius: options.pointer?.radius ?? 90, strength: options.pointer?.strength ?? 22 },
    loop: options.loop ?? { add: frames },
  };
}

function fitPointsToCanvas({
  points,
  fit,
  padding,
  size,
}: {
  points: readonly CloudPoint[];
  fit: ParticleFit;
  padding: number;
  size: CanvasSize;
}) {
  if (fit === "none") return points;
  return fitPoints(points, { x: 0, y: 0, width: size.width, height: size.height }, { padding, from: fit === "contain" ? undefined : fit });
}

function createResizeObserver({
  canvas,
  cloud,
  getFittedPoints,
  getSize,
  setSize,
  getFittedSize,
  setFittedSize,
  maxPixelRatio,
  resetFill,
  render,
  refit,
}: {
  canvas: HTMLCanvasElement;
  cloud: ReturnType<typeof pointCloud>;
  getFittedPoints: () => readonly CloudPoint[];
  getSize: () => CanvasSize;
  setSize: (size: CanvasSize) => void;
  getFittedSize: () => { width: number; height: number };
  setFittedSize: (size: { width: number; height: number }) => void;
  maxPixelRatio: number | undefined;
  resetFill: () => void;
  render: () => void;
  refit: boolean;
}): ResizeObserver | null {
  if (typeof ResizeObserver !== "function") return null;

  const observer = new ResizeObserver(() => {
    setSize(fitCanvas(canvas, { maxPixelRatio }));
    resetFill();
    const size = getSize();
    const previousSize = getFittedSize();
    if (refit && (size.width !== previousSize.width || size.height !== previousSize.height)) {
      setFittedSize(dimensions(size));
      // A change that's still being paired off the main thread fits itself to the new size when it
      // lands; until then the cloud still holds the previous shape, which these points don't fit.
      const fitted = getFittedPoints();
      if (fitted.length === cloud.live) cloud.to(fitted, { instant: true, matches: matchByIndex(cloud.live) });
    }
    render();
  });
  observer.observe(canvas);
  return observer;
}

function createVisibilityObserver({
  canvas,
  cloud,
  wake,
  setVisible,
}: {
  canvas: HTMLCanvasElement;
  cloud: ReturnType<typeof pointCloud>;
  wake: () => void;
  setVisible: (visible: boolean) => void;
}): IntersectionObserver | null {
  if (typeof IntersectionObserver !== "function") return null;

  const observer = new IntersectionObserver(([entry]) => {
    const visible = entry?.isIntersecting ?? true;
    setVisible(visible);
    if (visible && !cloud.settled) wake();
  });
  observer.observe(canvas);
  return observer;
}

function updateRadius({
  radius,
  animatedRadius,
  reducedMotion,
}: {
  radius: number | undefined;
  animatedRadius: ReturnType<typeof value>;
  reducedMotion: () => boolean;
}): void {
  if (radius === undefined) return;
  if (!(radius > 0)) throw new RangeError(`particles: radius must be positive, got ${radius}`);
  if (reducedMotion()) animatedRadius.set(radius);
  else animatedRadius.to(radius);
}

function validatePairing(pairing: ParticlesToOptions["pairing"]): void {
  if (pairing !== undefined && pairing !== "match" && pairing !== "index")
    throw new RangeError(`particles: pairing must be "match" or "index", got ${pairing}`);
}

/** The point cloud's scatter settings for a transition, or nothing for a direct one. */
function scatterOf(transition: ParticleTransition | undefined) {
  if (transition === undefined || transition === "direct") return undefined;
  if (transition === "scatter") return true;
  if (typeof transition === "object" && transition !== null && transition.type === "scatter") {
    const { type: _, ...settings } = transition;
    return settings;
  }
  throw new RangeError(`particles: transition must be "direct", "scatter" or { type: "scatter", … }, got ${String(transition)}`);
}

function setCanvasLabel(canvas: HTMLCanvasElement, label: string | undefined): void {
  if (label === undefined) return;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", label);
}

function dimensions(size: CanvasSize): { width: number; height: number } {
  return { width: size.width, height: size.height };
}
