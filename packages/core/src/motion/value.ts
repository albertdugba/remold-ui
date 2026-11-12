import { isSettled, springCoefficients, springs, stepSpring, type SpringConfig, type SpringState } from "./spring";

export interface ValueOptions {
  spring?: SpringConfig;
  precision?: number;
}

export interface ToOptions {
  spring?: SpringConfig;
  velocity?: number;
}

export interface ReleaseOptions {
  velocity?: number;
  target?: number;
  spring?: SpringConfig;
}

export interface AnimatedValue {
  readonly current: number;
  readonly velocity: number;
  readonly target: number;
  readonly held: boolean;
  readonly settled: boolean;
  to(target: number, options?: ToOptions): void;
  set(value: number): void;
  hold(): void;
  release(options?: ReleaseOptions): void;
  step(dt: number): boolean;
}

const DEFAULT_PRECISION = 0.01;

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
