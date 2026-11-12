import { isSettled, springCoefficients, stepSpring, type SpringCoefficients, type SpringConfig } from "./spring";

export interface CssSpring {
  /** How long the spring takes to settle, in milliseconds. */
  duration: number;
  /** A CSS `linear()` easing function that follows the spring from 0 to 1. */
  easing: string;
}

const STEP = 1 / 240;
const SETTLE_PRECISION = 0.001;
const MAX_SECONDS = 10;
const EASING_PRECISION = 10_000;

const isValidSampleCount = (samples: number) => Number.isInteger(samples) && samples >= 2;

const round = (value: number) => Math.round(value * EASING_PRECISION) / EASING_PRECISION;

function settleTime(spring: SpringCoefficients): number {
  const state = { value: 0, velocity: 0 };
  let elapsed = 0;

  while (!isSettled(state, 1, SETTLE_PRECISION) && elapsed < MAX_SECONDS) {
    stepSpring({ state, target: 1, spring, dt: STEP });
    elapsed += STEP;
  }

  return Math.max(elapsed, STEP);
}

function sampleCurve(spring: SpringCoefficients, duration: number, samples: number): number[] {
  const state = { value: 0, velocity: 0 };
  const dt = duration / (samples - 1);

  const following = Array.from({ length: samples - 1 }, (_, index) => {
    stepSpring({ state, target: 1, spring, dt });

    return index === samples - 2 ? 1 : state.value;
  });

  return [0, ...following];
}

/** Sample a spring going from 0 to 1 into a CSS `linear()` easing. */
export function springToCss(config: SpringConfig, samples = 40): CssSpring {
  if (!isValidSampleCount(samples)) {
    throw new RangeError(`springToCss: samples must be a whole number of at least 2, got ${samples}`);
  }

  const spring = springCoefficients(config);
  const duration = settleTime(spring);
  const points = sampleCurve(spring, duration, samples);

  return {
    duration: Math.round(duration * 1000),
    easing: `linear(${points.map((point) => String(round(point))).join(", ")})`,
  };
}
