/**
 * Springs as CSS easing, for animations the browser runs itself (View Transitions, WAAPI,
 * CSS transitions). The curve is sampled into a `linear()` function.
 *
 * Browser-run animations can't be redirected mid-flight with their momentum, so prefer
 * `value()` wherever interruption matters.
 */
import { isSettled, springCoefficients, stepSpring, type SpringConfig } from "./spring";

export interface CssSpring {
  /** How long the spring takes to settle, in milliseconds. */
  duration: number;
  /** A CSS `linear()` easing function that follows the spring from 0 to 1. */
  easing: string;
}

/**
 * Sample a spring going from 0 to 1 into a CSS `linear()` easing. `samples` points are spread
 * evenly over the settle time; more points follow the curve more closely.
 */
export function springToCss(config: SpringConfig, samples = 40): CssSpring {
  if (!Number.isInteger(samples) || samples < 2) {
    throw new RangeError(`springToCss: samples must be a whole number of at least 2, got ${samples}`);
  }

  const coefficients = springCoefficients(config);
  const state = { value: 0, velocity: 0 };
  const step = 1 / 240;
  // Settle with a fine precision so the curve ends without a visible jump. Capped at 10 s.
  let elapsed = 0;
  while (!isSettled(state, 1, 0.001) && elapsed < 10) {
    stepSpring({ state, target: 1, spring: coefficients, dt: step });
    elapsed += step;
  }
  const duration = Math.max(elapsed, step);

  state.value = 0;
  state.velocity = 0;
  const points = [0];
  for (let i = 1; i < samples; i++) {
    stepSpring({ state, target: 1, spring: coefficients, dt: duration / (samples - 1) });
    points.push(i === samples - 1 ? 1 : state.value);
  }
  const easing = `linear(${points.map((p) => String(Math.round(p * 10000) / 10000)).join(", ")})`;
  return { duration: Math.round(duration * 1000), easing };
}
