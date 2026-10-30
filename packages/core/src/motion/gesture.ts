/**
 * Gesture maths: how fast a finger moved, where a flick would coast to, and how much to resist
 * past an edge. Constants follow WWDC18 "Designing Fluid Interfaces".
 */

/** How quickly a flick slows down, per millisecond. Matches UIScrollView's deceleration rates. */
export const deceleration = {
  /** Scrolling: coasts a long way. */
  normal: 0.998,
  /** Paging and snapping: stops sooner. */
  fast: 0.99,
} as const;

/**
 * Where a flick at `velocity` (units per second) would come to rest, as a distance from where
 * it was let go. Use it to pick a snap point: `nearest(current + project(velocity))`.
 */
export function project(velocity: number, rate: number = deceleration.normal): number {
  if (!(rate > 0 && rate < 1)) {
    throw new RangeError(`project: rate must be between 0 and 1, got ${rate}`);
  }

  return ((velocity / 1000) * rate) / (1 - rate);
}

/**
 * Resistance past an edge. `overshoot` is how far the finger has gone past the edge; the result
 * is how far the content should move. It starts at about half speed and never exceeds
 * `dimension`, the size of the scrolling area.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;

  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export interface VelocityTracker {
  /** Record a position at a time in milliseconds (such as `PointerEvent.timeStamp`). */
  add(time: number, position: number): void;
  /**
   * Velocity in units per second over the recent samples. Pass `now` (the release time, in
   * milliseconds) to get 0 when the finger stopped moving before letting go.
   */
  velocity(now?: number): number;
  /** Forget all samples. */
  reset(): void;
}

/**
 * Track a finger's speed along one axis. Only the last `window` milliseconds count, and if no
 * sample arrived in the `idle` milliseconds before `velocity(now)`, the finger is treated as
 * having stopped, so a drag that pauses before letting go doesn't fling.
 */
export function velocityTracker({ window = 100, idle = 50 }: { window?: number; idle?: number } = {}): VelocityTracker {
  let samples: { time: number; position: number }[] = [];
  return {
    add(time, position) {
      samples.push({ time, position });

      // Drop samples older than the window, but keep two so there is always a span to measure.
      while (samples.length > 2 && time - samples[0]!.time > window) samples.shift();
    },
    velocity(now) {
      const first = samples[0];
      const last = samples[samples.length - 1];

      if (!first || !last || first === last) return 0;
      if (now !== undefined && now - last.time > idle) return 0;

      const span = last.time - first.time;

      return span > 0 ? ((last.position - first.position) / span) * 1000 : 0;
    },
    reset() {
      samples = [];
    },
  };
}
