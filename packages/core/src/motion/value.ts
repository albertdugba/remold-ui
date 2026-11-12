import { isSettled, springCoefficients, springs, stepSpring, type SpringConfig, type SpringState } from "./spring";

export interface ValueOptions {
  /** The spring used by `to` and `release` unless they pass their own. */
  spring?: SpringConfig;
  /** How close counts as arrived, in the value's own units. */
  precision?: number;
}

export interface ToOptions {
  /** A different spring for this move only. */
  spring?: SpringConfig;
  /** Start with this velocity instead of the current one, in units per second. */
  velocity?: number;
}

export interface ReleaseOptions {
  velocity?: number;
  target?: number;
  spring?: SpringConfig;
}

export interface AnimatedValue {
  /** Where the value is now. */
  readonly current: number;
  /** How fast it is moving, in units per second. */
  readonly velocity: number;
  /** Where it is heading. */
  readonly target: number;
  /** True while a finger (or anything else) is holding it. */
  readonly held: boolean;
  /** True when it is at rest on its target and not held. */
  readonly settled: boolean;
  /** Spring towards `target`, keeping the current position and velocity. */
  to(target: number, options?: ToOptions): void;
  /** Jump to `value` and stop. */
  set(value: number): void;
  /** Stop simulating where it is, mid-flight or not, so the value only changes through `set`. */
  hold(): void;
  /** Let go and spring towards `target` (default: the current target), starting at `velocity` (default 0). */
  release(options?: ReleaseOptions): void;
  /** Advance by `dt` seconds. */
  step(dt: number): boolean;
}

const DEFAULT_PRECISION = 0.01;

/** Create an animated value. */
export function value(initial: number, options: ValueOptions = {}): AnimatedValue {
  const precision = options.precision ?? DEFAULT_PRECISION;

  if (!(precision > 0)) {
    throw new RangeError(`value: precision must be positive, got ${precision}`);
  }

  const defaultSpring = springCoefficients(options.spring ?? springs.smooth);
  const state: SpringState = { value: initial, velocity: 0 };

  let spring = defaultSpring;
  let target = initial;
  let held = false;
  let settled = true;

  const start = (next: number, config: SpringConfig | undefined, velocity: number | undefined) => {
    target = next;
    spring = config ? springCoefficients(config) : defaultSpring;

    if (velocity !== undefined) state.velocity = velocity;

    settled = isSettled(state, target, precision);
  };

  const land = () => {
    state.value = target;
    state.velocity = 0;
    settled = true;
  };

  return {
    get current() {
      return state.value;
    },

    get velocity() {
      return state.velocity;
    },

    get target() {
      return target;
    },

    get held() {
      return held;
    },

    get settled() {
      return settled && !held;
    },

    to(next, { spring: config, velocity } = {}) {
      held = false;
      start(next, config, velocity);
    },

    set(next) {
      state.value = next;
      state.velocity = 0;

      if (held) return;

      target = next;
      settled = true;
    },

    hold() {
      held = true;
    },

    release({ velocity, target: next = target, spring: config } = {}) {
      held = false;
      start(next, config, velocity ?? 0);
    },

    step(dt) {
      if (held || settled) return false;

      stepSpring({ state, target, spring, dt });

      if (isSettled(state, target, precision)) land();

      return !settled;
    },
  };
}
