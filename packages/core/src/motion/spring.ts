/** A spring described by how long it takes to feel finished and how much it overshoots. */
export interface SpringConfig {
  /** Perceived duration in seconds. */
  duration: number;
  /** Overshoot, from just above -1 to just below 1. */
  bounce: number;
}

/** Presets. All last half a second; they differ only in how much they bounce. */
export const springs = {
  smooth: { duration: 0.5, bounce: 0 },
  snappy: { duration: 0.5, bounce: 0.15 },
  bouncy: { duration: 0.5, bounce: 0.3 },
} as const satisfies Record<string, SpringConfig>;

/** The physical constants behind a `SpringConfig`. */
export interface SpringCoefficients {
  stiffness: number;
  damping: number;
}

/** The moving part of a spring: where it is and how fast it is going (units per second). */
export interface SpringState {
  value: number;
  velocity: number;
}

const MAX_STEP = 1 / 240;
const REST_EPSILON = 1e-12;
const FRAMES_PER_SECOND = 60;

const isPositiveDuration = (duration: number) => duration > 0 && Number.isFinite(duration);

const isOpenUnit = (bounce: number) => bounce > -1 && bounce < 1;

const dampingFor = (duration: number, bounce: number) =>
  bounce >= 0 ? (4 * Math.PI * (1 - bounce)) / duration : (4 * Math.PI) / (duration * (1 + bounce));

export function substep({ stiffness, damping }: SpringCoefficients): number {
  const stable = (Math.sqrt(damping * damping + 2 * stiffness) - damping) / stiffness;

  return Math.min(MAX_STEP, stable);
}

/** Turn `{ duration, bounce }` into stiffness and damping. */
export function springCoefficients({ duration, bounce }: SpringConfig): SpringCoefficients {
  if (!isPositiveDuration(duration)) {
    throw new RangeError(`spring: duration must be a positive number of seconds, got ${duration}`);
  }

  if (!isOpenUnit(bounce)) {
    throw new RangeError(`spring: bounce must be between -1 and 1 (exclusive), got ${bounce}`);
  }

  return {
    stiffness: ((2 * Math.PI) / duration) ** 2,
    damping: dampingFor(duration, bounce),
  };
}

/** Advance `state` towards `target` by `dt` seconds, in place. */
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

  for (let remaining = dt; remaining > REST_EPSILON; remaining -= longest) {
    const h = Math.min(remaining, longest);
    const acceleration = -stiffness * (state.value - target) - damping * state.velocity;

    state.velocity += acceleration * h;
    state.value += state.velocity * h;
  }
}

/** Whether a spring is close enough to rest to stop. */
export function isSettled(state: SpringState, target: number, precision: number): boolean {
  const near = Math.abs(state.value - target) < precision;
  const slow = Math.abs(state.velocity) < precision * FRAMES_PER_SECOND;

  return near && slow;
}
