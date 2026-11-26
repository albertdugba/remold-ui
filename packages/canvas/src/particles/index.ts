import { pointCloud, value, type CloudPoint, type PointMatches } from "@remold-ui/core";
import { prefersReducedMotion } from "@remold-ui/dom";
import { fitCanvas } from "../canvas-size";
import { changedCamera, fitPointsToCanvas, project, restingTurn } from "./camera";
import { createConfiguration, scatterOf, updateRadius, validatePairing } from "./configuration";
import { hasVariables, resolveColors, watchTheme } from "./css-colors";
import { matchByIndex, matchOffThread, OFF_THREAD_MATCH_CELLS } from "./matching";
import { createResizeObserver, createVisibilityObserver, dimensions, setCanvasLabel } from "./observers";
import { createPointerController } from "./pointer";
import { createParticleRenderer } from "./renderer";
import { flowKeys, matchByFlow, paletteColors, withNumericTones } from "./tones";
import type { ParticlePoint, Particles, ParticlesOptions, ParticlesToOptions } from "./types";

export { sampleImagePoints, sampleTextPoints, type ImageSampleOptions, type TextSampleOptions } from "./sampling";
export { sampleElementPoints, type ElementSampleOptions } from "./element";
export type {
  ParticleCamera,
  ParticleFill,
  ParticlePalette,
  ParticlePoint,
  ParticleFit,
  ParticleTransition,
  Particles,
  ParticlesOptions,
  ParticlesToOptions,
} from "./types";

const FULL_TURN = Math.PI * 2;
const RADIUS_PRECISION = 0.005;

function quickMatches(
  pairing: ParticlesToOptions["pairing"],
  live: number,
  fromKeys: readonly number[],
  toKeys: readonly number[],
  count: number,
): PointMatches | null {
  if (pairing === "index" && live === count) return matchByIndex(count);

  if (pairing === "flow" && fromKeys.length === live) return matchByFlow(fromKeys, toKeys);

  return null;
}

/** Thousands of dots that rebuild themselves into each new shape. */
export function particles(canvas: HTMLCanvasElement, options: ParticlesOptions = {}): Particles {
  const configuration = createConfiguration(options);
  const waiting: (() => void)[] = [];

  let size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });
  let paletteOption = options.palette;
  let shownPoints = withNumericTones(options.points ?? [], paletteOption);
  let shownKeys = flowKeys(options.points ?? []);
  let fittedSize = dimensions(size);
  let pendingTransition = 0;
  let destroyed = false;
  let running = false;
  let visible = true;
  let pairing = 0;
  let camera = configuration.camera;
  let turn = camera?.angle ?? 0;
  let swing = 0;

  const fitShape = (points: readonly CloudPoint[]) =>
    fitPointsToCanvas({ points, fit: configuration.fit, padding: configuration.padding, size, camera });

  const cloud = pointCloud(fitShape(shownPoints), options);
  const radius = value(configuration.radius, { precision: RADIUS_PRECISION });
  const reducedMotion = () => options.reducedMotion === "always" || (options.reducedMotion !== "never" && prefersReducedMotion());
  const spinning = () => camera !== null && camera.spin !== 0 && !reducedMotion();

  const wake = () => {
    if (destroyed || running) return;

    running = true;
    configuration.loop.add(tick);
  };

  const pointerController = createPointerController({ canvas, enabled: configuration.pointer !== null, getSize: () => size, wake });
  const { pointer } = pointerController;

  let colors = paletteOption && paletteColors(paletteOption);
  let palette = colors && resolveColors(colors, canvas);

  const stopWatchingTheme = watchTheme(() => {
    if (!hasVariables(colors)) return;

    palette = resolveColors(colors!, canvas);
    renderer.render();
  });

  const renderer = createParticleRenderer({
    canvas,
    context: canvas.getContext("2d"),
    cloud,
    radius,
    pointer,
    getSize: () => size,
    color: options.color,
    getPalette: () => palette,
    shape: configuration.shape,
    blend: configuration.blend,
    project: configuration.camera
      ? (x, y, z) => project({ x, y, z, camera: camera!, angle: turn, size, padding: configuration.padding })
      : null,
    pointerEffect: configuration.pointer,
    reducedMotion,
    isDestroyed: () => destroyed,
  });

  const resizeObserver = createResizeObserver({
    canvas,
    cloud,
    getFittedPoints: () => fitShape(shownPoints),
    getSize: () => size,
    setSize: (nextSize) => (size = nextSize),
    getFittedSize: () => fittedSize,
    setFittedSize: (nextSize) => (fittedSize = nextSize),
    refit: configuration.fit !== "none",
    maxPixelRatio: options.maxPixelRatio,
    resetFill: renderer.resetFill,
    render: renderer.render,
  });

  const visibilityObserver = createVisibilityObserver({
    canvas,
    needsFrames: () => !cloud.settled || spinning(),
    wake,
    setVisible: (nextVisible) => (visible = nextVisible),
  });

  setCanvasLabel(canvas, options.label);
  renderer.render();

  if (spinning()) wake();

  function stepValues(deltaTime: number): boolean {
    let moving = cloud.step(deltaTime);

    for (const animated of [pointer.x, pointer.y, pointer.presence, radius]) {
      if (animated.step(deltaTime)) moving = true;
    }

    return moving;
  }

  function advanceTurn(deltaTime: number) {
    if (!camera || !spinning()) return;

    swing += camera.spin * FULL_TURN * deltaTime;
    turn = camera.sway > 0 ? camera.angle + camera.sway * Math.sin(swing) : turn + camera.spin * FULL_TURN * deltaTime;
  }

  function tick(deltaTime: number): boolean {
    if (destroyed) {
      running = false;
      return running;
    }

    const moving = stepValues(deltaTime);

    if (!visible) {
      running = false;
      return running;
    }

    advanceTurn(deltaTime);
    renderer.render();

    if (!moving) settle();

    running = moving || spinning();

    return running;
  }

  function settle(): void {
    if (pairing > 0) return;

    for (const resolve of waiting.splice(0)) resolve();
  }

  function pairInBackground(points: readonly CloudPoint[], show: (matches?: PointMatches) => void): boolean {
    const heading = cloud.heading();
    const tooBig = heading.length * points.length > OFF_THREAD_MATCH_CELLS;
    const matches = tooBig ? matchOffThread({ from: heading, to: fitShape(points), match: options.match }) : null;

    if (!matches) return false;

    pairing++;

    const finish = (found?: PointMatches) => {
      pairing--;
      show(found);

      if (cloud.settled) settle();
    };

    matches.then(finish, () => finish());

    return true;
  }

  function transitionTo(given: readonly ParticlePoint[], transitionOptions: ParticlesToOptions = {}): void {
    if (destroyed) return;

    validatePairing(transitionOptions.pairing);

    const scatter = scatterOf(transitionOptions.transition);
    const points = withNumericTones(given, paletteOption);
    const keys = flowKeys(given);
    const fromKeys = shownKeys;

    shownKeys = keys;
    updateRadius({ radius: transitionOptions.radius, animatedRadius: radius, reducedMotion });
    shownPoints = points;
    fittedSize = dimensions(size);

    const ticket = ++pendingTransition;

    const show = (matches?: PointMatches) => {
      if (destroyed || ticket !== pendingTransition) return;

      cloud.to(fitShape(points), { instant: reducedMotion(), ...(matches ? { matches } : {}), ...(scatter ? { scatter } : {}) });
      setCanvasLabel(canvas, transitionOptions.label);
      renderer.render();

      if (!cloud.settled || !radius.settled) wake();
    };

    const quick = quickMatches(transitionOptions.pairing, cloud.live, fromKeys, keys, points.length);

    if (quick) show(quick);
    else if (!pairInBackground(points, show)) show();
  }

  return {
    get count() {
      return cloud.live;
    },

    to: transitionTo,

    render: renderer.render,

    setPalette(next) {
      if (destroyed) return;

      if (paletteColors(next).length === 0) throw new RangeError("particles: palette needs at least one colour");

      paletteOption = next;
      colors = paletteColors(next);
      palette = resolveColors(colors, canvas);
      renderer.render();
    },

    setCamera(next) {
      if (destroyed) return;

      if (!camera) throw new Error("particles: setCamera needs a cloud made with a camera");

      const updated = changedCamera(camera, next, turn);
      const refit = updated.distance !== camera.distance;

      camera = updated;
      turn = restingTurn(updated, swing);

      if (refit && cloud.live === shownPoints.length) cloud.to(fitShape(shownPoints), { instant: true, matches: matchByIndex(cloud.live) });

      renderer.render();

      if (spinning()) wake();
    },

    settled() {
      return new Promise<void>((resolve) => {
        waiting.push(resolve);

        if (cloud.settled && radius.settled) settle();
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
