/**
 * Animated values.
 *
 * One number that moves with a spring and can be interrupted, grabbed and thrown at any moment
 * without jumping: every change starts from where the value is now, at the speed it is going.
 */
import { isSettled, springCoefficients, springs, stepSpring, type SpringConfig, type SpringState } from "./spring";

export interface ValueOptions {
  /** The spring used by `to` and `release` unless they pass their own. Defaults to `springs.smooth`. */
  spring?: SpringConfig;
  /**
   * How close counts as arrived, in the value's own units. Defaults to 0.01, which suits pixels;
   * use a smaller number for values that live between 0 and 1, such as opacity.
   */
  precision?: number;
}

export interface ToOptions {
  /** A different spring for this move only. */
  spring?: SpringConfig;
  /** Start with this velocity instead of the current one, in units per second. */
  velocity?: number;
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
  /** Jump to `value` and stop. Use for reduced motion, or while held to follow a finger. */
  set(value: number): void;
  /**
   * Stop simulating where it is, mid-flight or not, so the value only changes through `set`.
   * Use it when a finger grabs the thing being animated.
   */
  hold(): void;
  /**
   * Let go and spring towards `target` (default: the current target), starting at `velocity`
   * (default 0). Pass the finger's release speed so a throw carries on smoothly.
   */
  release(options?: { velocity?: number; target?: number; spring?: SpringConfig }): void;
  /** Advance by `dt` seconds. Returns true while the value is still moving. */
  step(dt: number): boolean;
}

/**
 * Create an animated value.
 *
 * ```ts
 * const x = value(0, { spring: springs.snappy });
 * x.to(100);
 * frames((dt) => { x.step(dt); el.style.translate = `${x.current}px`; return !x.settled; });
 * ```
 */
export function value(initial: number, options: ValueOptions = {}): AnimatedValue {
  const precision = options.precision ?? 0.01;
  if (!(precision > 0)) throw new RangeError(`value: precision must be positive, got ${precision}`);

  let coefficients = springCoefficients(options.spring ?? springs.smooth);
  const defaultCoefficients = coefficients;
  const state: SpringState = { value: initial, velocity: 0 };
  let target = initial;
  let held = false;
  let settled = true;

  const start = (to: number, spring: SpringConfig | undefined, velocity: number | undefined) => {
    target = to;
    coefficients = spring ? springCoefficients(spring) : defaultCoefficients;
    if (velocity !== undefined) state.velocity = velocity;
    settled = isSettled(state, target, precision);
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
    to(to, { spring, velocity } = {}) {
      held = false;
      start(to, spring, velocity);
    },
    set(v) {
      state.value = v;
      state.velocity = 0;
      if (!held) {
        target = v;
        settled = true;
      }
    },
    hold() {
      held = true;
    },
    release({ velocity, target: to = target, spring } = {}) {
      held = false;
      start(to, spring, velocity ?? 0);
    },
    step(dt) {
      if (held || settled) return false;
      stepSpring({ state, target, spring: coefficients, dt });
      if (isSettled(state, target, precision)) {
        // Land exactly on the target so layouts don't end up a fraction of a pixel off.
        state.value = target;
        state.velocity = 0;
        settled = true;
      }
      return !settled;
    },
  };
}
