import type { AnimatedValue } from "@remold-ui/core";
import { frames } from "@remold-ui/dom";
import { cameraOf } from "./camera";
import { paletteColors } from "./tones";
import type { ParticlesOptions, ParticlesToOptions, ParticleTransition } from "./types";

const DEFAULT_RADIUS = 2.5;
const DEFAULT_PADDING = 24;
const DEFAULT_POINTER = { radius: 90, strength: 22 };

function checkOptions(options: ParticlesOptions, radius: number, fit: NonNullable<ParticlesOptions["fit"]>) {
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
}

export function createConfiguration(options: ParticlesOptions) {
  const radius = options.radius ?? DEFAULT_RADIUS;
  const fit = options.fit ?? "contain";

  checkOptions(options, radius, fit);

  return {
    camera: options.camera ? cameraOf(options.camera === true ? {} : options.camera) : null,
    blend: options.blend ?? "normal",
    radius,
    fit,
    padding: options.padding ?? DEFAULT_PADDING,
    shape: options.shape ?? "circle",
    pointer:
      options.pointer === false
        ? null
        : { radius: options.pointer?.radius ?? DEFAULT_POINTER.radius, strength: options.pointer?.strength ?? DEFAULT_POINTER.strength },
    loop: options.loop ?? { add: frames },
  };
}

export function updateRadius({
  radius,
  animatedRadius,
  reducedMotion,
}: {
  radius: number | undefined;
  animatedRadius: AnimatedValue;
  reducedMotion: () => boolean;
}): void {
  if (radius === undefined) return;

  if (!(radius > 0)) throw new RangeError(`particles: radius must be positive, got ${radius}`);

  if (reducedMotion()) animatedRadius.set(radius);
  else animatedRadius.to(radius);
}

export function validatePairing(pairing: ParticlesToOptions["pairing"]): void {
  if (pairing !== undefined && pairing !== "match" && pairing !== "index" && pairing !== "flow") {
    throw new RangeError(`particles: pairing must be "match", "index" or "flow", got ${pairing}`);
  }
}

export function scatterOf(transition: ParticleTransition | undefined) {
  if (transition === undefined || transition === "direct") return undefined;

  if (transition === "scatter") return true;

  if (typeof transition === "object" && transition !== null && transition.type === "scatter") {
    const { type: _, ...settings } = transition;

    return settings;
  }

  throw new RangeError(`particles: transition must be "direct", "scatter" or { type: "scatter", … }, got ${String(transition)}`);
}
