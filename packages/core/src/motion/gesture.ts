/** How quickly a flick slows down, per millisecond. */
export const deceleration = {
  normal: 0.998,
  fast: 0.99,
} as const;

/** Where a flick at `velocity` (units per second) would come to rest, as a distance from where it was let go. */
export function project(velocity: number, rate: number = deceleration.normal): number {
  if (!(rate > 0 && rate < 1)) {
    throw new RangeError(`project: rate must be between 0 and 1, got ${rate}`);
  }

  return ((velocity / 1000) * rate) / (1 - rate);
}

/** Resistance past an edge. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;

  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export interface VelocityTracker {
  /** Record a position at a time in milliseconds (such as `PointerEvent.timeStamp`). */
  add(time: number, position: number): void;
  /** Velocity in units per second over the recent samples. */
  velocity(now?: number): number;
  /** Forget all samples. */
  reset(): void;
}

interface Sample {
  time: number;
  position: number;
}

const MIN_SAMPLES = 2;

/** Track a finger's speed along one axis. */
export function velocityTracker({ window = 100, idle = 50 }: { window?: number; idle?: number } = {}): VelocityTracker {
  let samples: Sample[] = [];

  const isStale = (time: number) => samples.length > MIN_SAMPLES && time - samples[0]!.time > window;

  return {
    add(time, position) {
      samples.push({ time, position });

      while (isStale(time)) samples.shift();
    },

    velocity(now) {
      const first = samples[0];
      const last = samples.at(-1);

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
