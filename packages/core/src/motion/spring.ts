/**
 * Springs.
 *
 * A spring pulls a value towards its target and slows itself down. Unlike a timed easing curve
 * it has no fixed end time, so it can be redirected at any moment and keep its momentum.
 *
 * Springs are described the way SwiftUI describes them (WWDC23 "Animate with springs"):
 * `duration` is how long it takes to feel finished, and `bounce` is how much it overshoots.
 */

export interface SpringConfig {
  /** Perceived duration in seconds. Must be greater than 0. */
  duration: number;
  /**
   * Overshoot, from just above -1 to just below 1. 0 is critically damped: as fast as possible
   * with no overshoot. Positive values bounce; negative values settle more slowly, with no bounce.
   */
  bounce: number;
}

/** Presets. All last half a second; they differ only in how much they bounce. */
export const springs = {
  smooth: { duration: 0.5, bounce: 0 },
  snappy: { duration: 0.5, bounce: 0.15 },
  bouncy: { duration: 0.5, bounce: 0.3 },
} as const satisfies Record<string, SpringConfig>;

/** The physical constants behind a `SpringConfig`. Mass is always 1. */
export interface SpringCoefficients {
  stiffness: number;
  damping: number;
}

/** The moving part of a spring: where it is and how fast it is going (units per second). */
export interface SpringState {
  value: number;
  velocity: number;
}

/** The simulation advances in steps no longer than this, so results don't depend on frame rate. */
const MAX_STEP = 1 / 240;

/**
 * The longest substep that keeps semi-implicit Euler stable for this spring, with a 2× margin.
 * The method only stays bounded while `stiffness·h² + 2·damping·h < 4`; very short or heavily
 * damped springs (a duration under about 0.03 s, or bounce near -1) need steps shorter than
 * `MAX_STEP`, or they blow up to Infinity and then NaN. Every ordinary spring gets `MAX_STEP`.
 */
export function substep({ stiffness, damping }: SpringCoefficients): number {
  const stable = (Math.sqrt(damping * damping + 2 * stiffness) - damping) / stiffness;
  return Math.min(MAX_STEP, stable);
}

/** Turn `{ duration, bounce }` into stiffness and damping. Throws `RangeError` on invalid input. */
export function springCoefficients({ duration, bounce }: SpringConfig): SpringCoefficients {
  if (!(duration > 0) || !Number.isFinite(duration)) {
    throw new RangeError(`spring: duration must be a positive number of seconds, got ${duration}`);
  }
  if (!(bounce > -1 && bounce < 1)) {
    throw new RangeError(`spring: bounce must be between -1 and 1 (exclusive), got ${bounce}`);
  }
  const stiffness = ((2 * Math.PI) / duration) ** 2;
  const damping = bounce >= 0 ? (4 * Math.PI * (1 - bounce)) / duration : (4 * Math.PI) / (duration * (1 + bounce));
  return { stiffness, damping };
}

/**
 * Advance `state` towards `target` by `dt` seconds, in place. Uses semi-implicit Euler in fixed
 * substeps, which stays stable for stiff springs and gives the same motion at 30, 60 or 120 fps.
 */
export function stepSpring({
  state,
  target,
  spring,
  dt,
}: {
  state: SpringState;
  target: number;
  spring: SpringCoefficients;
  dt: number;
}): void {
  const { stiffness, damping } = spring;
  const longest = substep(spring);
  let remaining = dt;
  while (remaining > 1e-12) {
    const h = Math.min(remaining, longest);
    const acceleration = -stiffness * (state.value - target) - damping * state.velocity;
    // Update velocity first, then move with the new velocity: that order is what keeps it stable.
    state.velocity += acceleration * h;
    state.value += state.velocity * h;
    remaining -= h;
  }
}

/**
 * Whether a spring is close enough to rest to stop: within `precision` of the target and moving
 * slower than a speed that would carry it that far in about a frame. This is perceptual
 * completion; the maths alone would keep it wobbling invisibly for much longer.
 */
export function isSettled(state: SpringState, target: number, precision: number): boolean {
  return Math.abs(state.value - target) < precision && Math.abs(state.velocity) < precision * 60;
}
