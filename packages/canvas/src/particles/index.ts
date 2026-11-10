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
import { flowKeys, matchByFlow, paletteColors, withNumericTones } from "./tones";
import type {
  ParticleCamera,
  ParticleFit,
  ParticlePoint,
  Particles,
  ParticlesOptions,
  ParticlesToOptions,
  ParticleTransition,
} from "./types";

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

export function particles(canvas: HTMLCanvasElement, options: ParticlesOptions = {}): Particles {
  const configuration = createConfiguration(options);
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
  const waiting: (() => void)[] = [];
  let camera = configuration.camera;
  let turn = camera?.angle ?? 0;
  // How far through its swing a swaying camera is, in radians.
  let swing = 0;
  const fitShape = (points: readonly CloudPoint[]) =>
    fitPointsToCanvas({ points, fit: configuration.fit, padding: configuration.padding, size, camera });
  const cloud = pointCloud(fitShape(shownPoints), options);
  const radius = value(configuration.radius, { precision: 0.005 });
  const reducedMotion = () => options.reducedMotion === "always" || (options.reducedMotion !== "never" && prefersReducedMotion());
  const spinning = () => camera !== null && camera.spin !== 0 && !reducedMotion();

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
    pointer: pointerController.pointer,
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
    if (camera && spinning()) {
      swing += camera.spin * Math.PI * 2 * deltaTime;
      turn = camera.sway > 0 ? camera.angle + camera.sway * Math.sin(swing) : turn + camera.spin * Math.PI * 2 * deltaTime;
    }
    renderer.render();
    // A turning camera keeps drawing, but the shape itself has settled once its dots stop.
    if (!moving) settle();
    running = moving || spinning();

    return running;
  }

  function settle(): void {
    if (pairing > 0) return;
    for (const resolve of waiting.splice(0)) resolve();
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

      const targetPoints = fitShape(points);

      cloud.to(targetPoints, { instant: reducedMotion(), ...(matches ? { matches } : {}), ...(scatter ? { scatter } : {}) });
      setCanvasLabel(canvas, transitionOptions.label);
      renderer.render();
      if (!cloud.settled || !radius.settled) wake();
    };
    if (transitionOptions.pairing === "index" && cloud.live === points.length) {
      show(matchByIndex(points.length));

      return;
    }
    if (transitionOptions.pairing === "flow" && fromKeys.length === cloud.live) {
      show(matchByFlow(fromKeys, keys));

      return;
    }
    const targetPoints = fitShape(points);
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
        if (cloud.settled) settle();
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
      const radians = Math.PI / 180;
      const updated = cameraOf({
        spin: next.spin ?? camera.spin,
        // A swaying camera keeps swinging about the same angle; a turning one carries on from where it is.
        angle: next.angle ?? (camera.sway > 0 ? camera.angle : turn) / radians,
        sway: next.sway ?? camera.sway / radians,
        tilt: next.tilt ?? camera.tilt / radians,
        distance: next.distance ?? camera.distance,
      });
      const refit = updated.distance !== camera.distance;
      camera = updated;
      turn = updated.sway > 0 ? updated.angle + updated.sway * Math.sin(swing) : updated.angle;
      // The fit depends on the distance, so a new distance refits the shape where it stands.
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

function createConfiguration(options: ParticlesOptions) {
  const radius = options.radius ?? 2.5;
  const fit = options.fit ?? "contain";

  if (!(radius > 0)) throw new RangeError(`particles: radius must be positive, got ${radius}`);
  const frame = typeof fit === "object" && fit !== null;
  if (fit !== "contain" && fit !== "none" && !(frame && fit.width > 0 && fit.height > 0)) {
    throw new RangeError(`particles: fit must be "contain", "none" or a frame with a positive width and height, got ${JSON.stringify(fit)}`);
  }
  if (options.palette && paletteColors(options.palette).length === 0) throw new RangeError("particles: palette needs at least one colour");
  if (options.camera && frame) throw new RangeError('particles: a camera works with fit "contain" or "none", not a frame');
  if (options.blend !== undefined && options.blend !== "normal" && options.blend !== "add") {
    throw new RangeError(`particles: blend must be "normal" or "add", got ${String(options.blend)}`);
  }
  return {
    camera: options.camera ? cameraOf(options.camera === true ? {} : options.camera) : null,
    blend: options.blend ?? "normal",
    radius,
    fit,
    padding: options.padding ?? 24,
    shape: options.shape ?? "circle",
    pointer: options.pointer === false ? null : { radius: options.pointer?.radius ?? 90, strength: options.pointer?.strength ?? 22 },
    loop: options.loop ?? { add: frames },
  };
}

/** A camera in radians, checked. */
interface Camera {
  spin: number;
  sway: number;
  angle: number;
  tilt: number;
  distance: number;
}

function cameraOf(camera: ParticleCamera): Camera {
  const spin = camera.spin ?? 0.04;
  const angle = camera.angle ?? 0;
  const tilt = camera.tilt ?? 20;
  const distance = camera.distance ?? 4;
  const sway = camera.sway ?? 0;
  if (!(sway >= 0) || !Number.isFinite(sway)) throw new RangeError(`particles: camera.sway must be 0 or more degrees, got ${sway}`);
  for (const [name, given] of [
    ["spin", spin],
    ["angle", angle],
    ["tilt", tilt],
  ] as const) {
    if (!Number.isFinite(given)) throw new RangeError(`particles: camera.${name} must be a finite number, got ${given}`);
  }
  if (!(distance >= 1.5) || !Number.isFinite(distance)) {
    throw new RangeError(`particles: camera.distance must be at least 1.5, got ${distance}`);
  }
  const radians = Math.PI / 180;
  return { spin, sway: sway * radians, angle: angle * radians, tilt: tilt * radians, distance };
}

/** How far the eye is from the canvas's centre, in CSS pixels. */
function eyeDistance(camera: Camera, size: CanvasSize, padding: number): number {
  return camera.distance * Math.max(Math.min(size.width, size.height) / 2 - padding, 1);
}

/**
 * Where a point lands on screen once the cloud is turned by `angle` about its upright axis and
 * leaned by the tilt, and how much bigger or smaller it draws there. Points turn about the canvas's centre.
 */
export function project({
  x,
  y,
  z,
  camera,
  angle,
  size,
  padding,
}: {
  x: number;
  y: number;
  z: number;
  camera: Camera;
  angle: number;
  size: CanvasSize;
  padding: number;
}): { x: number; y: number; scale: number } {
  const centreX = size.width / 2;
  const centreY = size.height / 2;
  const across = x - centreX;
  const down = y - centreY;
  const turnedX = across * Math.cos(angle) + z * Math.sin(angle);
  const turnedZ = z * Math.cos(angle) - across * Math.sin(angle);
  // Leaning the top toward you lifts the far side, so you look down onto the shape.
  const leanedY = down * Math.cos(camera.tilt) + turnedZ * Math.sin(camera.tilt);
  const towardYou = turnedZ * Math.cos(camera.tilt) - down * Math.sin(camera.tilt);
  const eye = eyeDistance(camera, size, padding);
  const scale = eye / Math.max(eye - towardYou, 1);
  return { x: centreX + turnedX * scale, y: centreY + leanedY * scale, scale };
}

/**
 * Centres a 3D shape on the canvas and sizes it by its furthest point from the centre, shrunk so
 * that point still fits when it turns toward you.
 */
function fitPoints3D(points: readonly CloudPoint[], size: CanvasSize, padding: number, camera: Camera): CloudPoint[] {
  if (points.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const { x, y, z = 0 } of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  const centreZ = (minZ + maxZ) / 2;
  let reach = 0;
  for (const { x, y, z = 0 } of points) reach = Math.max(reach, Math.hypot(x - centreX, y - centreY, z - centreZ));
  const room = Math.max(Math.min(size.width, size.height) / 2 - padding, 1);
  const scale = reach > 0 ? (room * (camera.distance - 1)) / camera.distance / reach : 1;
  return points.map((point) => ({
    ...point,
    x: size.width / 2 + (point.x - centreX) * scale,
    y: size.height / 2 + (point.y - centreY) * scale,
    z: ((point.z ?? 0) - centreZ) * scale,
  }));
}

function fitPointsToCanvas({
  points,
  fit,
  padding,
  size,
  camera,
}: {
  points: readonly CloudPoint[];
  fit: ParticleFit;
  padding: number;
  size: CanvasSize;
  camera: Camera | null;
}) {
  if (fit === "none") return points;
  if (camera) return fitPoints3D(points, size, padding, camera);
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
  needsFrames,
  wake,
  setVisible,
}: {
  canvas: HTMLCanvasElement;
  needsFrames: () => boolean;
  wake: () => void;
  setVisible: (visible: boolean) => void;
}): IntersectionObserver | null {
  if (typeof IntersectionObserver !== "function") return null;

  const observer = new IntersectionObserver(([entry]) => {
    const visible = entry?.isIntersecting ?? true;
    setVisible(visible);
    if (visible && needsFrames()) wake();
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
  if (pairing !== undefined && pairing !== "match" && pairing !== "index" && pairing !== "flow")
    throw new RangeError(`particles: pairing must be "match", "index" or "flow", got ${pairing}`);
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
