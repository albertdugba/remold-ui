/**
 * Many animated values at once.
 *
 * `value()` is one number with its own spring. That's right for a card or a slider, but a cloud
 * of ten thousand dots would need thirty thousand of them, each an object the garbage collector
 * has to track. `values()` keeps every number in three flat arrays (where each one is, how fast
 * it's going, where it's heading) and moves them all with one shared spring, so a renderer can
 * read positions straight out of a typed array with no allocation per frame.
 *
 * It behaves exactly like `value()` per entry: same physics, same settling, same landing exactly
 * on the target, and every change starts from where the entry is now, at the speed it's going.
 */
import { isSettled, springCoefficients, springs, substep, type SpringCoefficients, type SpringConfig } from "./spring";

export interface ValuesOptions {
  /** The spring every entry uses. Defaults to `springs.smooth`. Change it later with `setSpring`. */
  spring?: SpringConfig;
  /** How close counts as arrived, in the values' own units. Defaults to 0.01, which suits pixels. */
  precision?: number;
  /**
   * How many entries make up one item, for `remap`. Use 2 for `[x0, y0, x1, y1, …]` or 3 for
   * `[x, y, size, …]`, so remapping moves whole items. Defaults to 1. The length must divide by it.
   */
  stride?: number;
}

export interface AnimatedValues {
  /** How many entries there are (items × stride). */
  readonly length: number;
  /** How many entries make up one item. */
  readonly stride: number;
  /**
   * Where every entry is now. A live view for fast reading: don't write into it (use `set`), and
   * read it again after `remap`, which replaces the arrays.
   */
  readonly current: Float64Array;
  /** How fast every entry is moving, in units per second. A live view; don't write into it. */
  readonly velocity: Float64Array;
  /** Where every entry is heading. A live view; don't write into it. */
  readonly target: Float64Array;
  /** True when every entry is at rest on its target. */
  readonly settled: boolean;
  /** Whether one entry is at rest on its target. */
  isSettled(index: number): boolean;
  /** Spring one entry towards `target`, keeping its position and velocity unless `velocity` is given. */
  to(index: number, target: number, options?: { velocity?: number }): void;
  /** Spring every entry towards its matching target. `targets` must have `length` entries. */
  toAll(targets: ArrayLike<number>): void;
  /** Jump one entry to `value` and stop it. */
  set(index: number, value: number): void;
  /** Jump every entry to its matching value and stop. Use it for reduced motion. */
  setAll(values: ArrayLike<number>): void;
  /** Use a different spring from now on. Entries keep their position and velocity. */
  setSpring(spring: SpringConfig): void;
  /**
   * Rebuild with a new set of items, carrying motion across: new item `i` takes over old item
   * `sources[i]` (position, velocity and target), or, when `sources[i]` is -1, starts at rest at
   * `fill`. The length becomes `sources.length × stride`. Pair it with `matchPoints` to morph one
   * cloud into another without losing momentum.
   */
  remap(sources: ArrayLike<number>, fill?: number | ArrayLike<number>): void;
  /** Advance every moving entry by `dt` seconds. Returns true while anything is still moving. */
  step(dt: number): boolean;
}

/**
 * Create a batch of animated values, starting at rest at `initial`.
 *
 * ```ts
 * const dots = values(positions, { stride: 2, spring: springs.snappy });
 * dots.toAll(nextPositions);
 * frames((dt) => {
 *   const moving = dots.step(dt);
 *   draw(dots.current);
 *   return moving;
 * });
 * ```
 */
export function values(initial: ArrayLike<number>, options: ValuesOptions = {}): AnimatedValues {
  const precision = options.precision ?? 0.01;

  if (!(precision > 0) || !Number.isFinite(precision)) {
    throw new RangeError(`values: precision must be a positive number, got ${precision}`);
  }
  const stride = options.stride ?? 1;
  if (!Number.isInteger(stride) || stride < 1) {
    throw new RangeError(`values: stride must be a whole number of at least 1, got ${stride}`);
  }
  checkLength(initial.length, stride);

  let coefficients: SpringCoefficients = springCoefficients(options.spring ?? springs.smooth);
  let longest = substep(coefficients);
  let length = initial.length;
  let current = new Float64Array(length);
  let velocity = new Float64Array(length);
  let target = new Float64Array(length);
  // 1 while an entry still needs simulating. Counting them makes `settled` and an idle `step` O(1).
  let moving = new Uint8Array(length);
  let movingCount = 0;

  for (let i = 0; i < length; i++) {
    const v = finite(initial[i], "initial", i);
    current[i] = v;
    target[i] = v;
  }

  const checkIndex = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= length) {
      throw new RangeError(`values: index must be a whole number from 0 to ${length - 1}, got ${index}`);
    }
  };

  const checkSize = (source: ArrayLike<number>, name: string) => {
    if (source.length !== length) {
      throw new RangeError(`values: ${name} needs ${length} entries, got ${source.length}`);
    }
  };

  /** Recompute whether entry `i` is moving after its state or target changed. */
  const refresh = (i: number) => {
    const was = moving[i]!;
    const now = isSettled({ value: current[i]!, velocity: velocity[i]! }, target[i]!, precision) ? 0 : 1;
    moving[i] = now;
    movingCount += now - was;
  };

  const stop = (i: number, v: number) => {
    current[i] = v;
    velocity[i] = 0;
    target[i] = v;
    movingCount -= moving[i]!;
    moving[i] = 0;
  };

  return {
    get length() {
      return length;
    },
    stride,
    get current() {
      return current;
    },
    get velocity() {
      return velocity;
    },
    get target() {
      return target;
    },
    get settled() {
      return movingCount === 0;
    },
    isSettled(index) {
      checkIndex(index);
      return moving[index] === 0;
    },
    to(index, to, { velocity: v } = {}) {
      checkIndex(index);
      target[index] = finite(to, "target", index);
      if (v !== undefined) velocity[index] = finite(v, "velocity", index);
      refresh(index);
    },
    toAll(targets) {
      checkSize(targets, "targets");
      // Validate everything first, so a bad entry leaves the batch untouched.
      for (let i = 0; i < length; i++) finite(targets[i], "targets", i);
      for (let i = 0; i < length; i++) {
        target[i] = targets[i]!;
        refresh(i);
      }
    },
    set(index, v) {
      checkIndex(index);
      stop(index, finite(v, "value", index));
    },
    setAll(next) {
      checkSize(next, "values");
      for (let i = 0; i < length; i++) finite(next[i], "values", i);
      for (let i = 0; i < length; i++) stop(i, next[i]!);
    },
    setSpring(spring) {
      coefficients = springCoefficients(spring);
      longest = substep(coefficients);
    },
    remap(sources, fill = 0) {
      const items = sources.length;
      const oldItems = length / stride;
      const fills = typeof fill === "number" ? null : fill;
      if (fills && fills.length !== items * stride) {
        throw new RangeError(`values: fill needs ${items * stride} entries (one per new entry), got ${fills.length}`);
      }
      if (typeof fill === "number") finite(fill, "fill", 0);
      const claimed = new Uint8Array(oldItems);
      for (let i = 0; i < items; i++) {
        const source = sources[i]!;
        if (source === -1) continue;
        if (!Number.isInteger(source) || source < 0 || source >= oldItems) {
          throw new RangeError(`values: sources[${i}] must be -1 or an item from 0 to ${oldItems - 1}, got ${source}`);
        }
        if (claimed[source]) throw new RangeError(`values: item ${source} appears twice in sources`);
        claimed[source] = 1;
      }
      if (fills) for (let i = 0; i < fills.length; i++) finite(fills[i], "fill", i);

      const nextLength = items * stride;
      const nextCurrent = new Float64Array(nextLength);
      const nextVelocity = new Float64Array(nextLength);
      const nextTarget = new Float64Array(nextLength);
      const nextMoving = new Uint8Array(nextLength);
      let nextCount = 0;
      for (let i = 0; i < items; i++) {
        const source = sources[i]!;
        for (let k = 0; k < stride; k++) {
          const to = i * stride + k;
          if (source === -1) {
            const v = fills ? fills[to]! : (fill as number);
            nextCurrent[to] = v;
            nextTarget[to] = v;
          } else {
            const from = source * stride + k;
            nextCurrent[to] = current[from]!;
            nextVelocity[to] = velocity[from]!;
            nextTarget[to] = target[from]!;
            nextMoving[to] = moving[from]!;
            nextCount += moving[from]!;
          }
        }
      }
      length = nextLength;
      current = nextCurrent;
      velocity = nextVelocity;
      target = nextTarget;
      moving = nextMoving;
      movingCount = nextCount;
    },
    step(dt) {
      if (!(dt >= 0) || dt === Infinity) {
        throw new RangeError(`values: dt must be a finite number of seconds, 0 or more, got ${dt}`);
      }
      if (movingCount === 0 || dt === 0) return movingCount > 0;
      const { stiffness, damping } = coefficients;
      const limit = precision * 60;
      for (let i = 0; i < length; i++) {
        if (moving[i] === 0) continue;
        let x = current[i]!;
        let v = velocity[i]!;
        const t = target[i]!;
        // The same substeps as `stepSpring`, inlined so a big batch doesn't pay a call per entry.
        let remaining = dt;
        while (remaining > 1e-12) {
          const h = Math.min(remaining, longest);
          v += (-stiffness * (x - t) - damping * v) * h;
          x += v * h;
          remaining -= h;
        }
        if (Math.abs(x - t) < precision && Math.abs(v) < limit) {
          // Land exactly on the target, like `value()`.
          x = t;
          v = 0;
          moving[i] = 0;
          movingCount--;
        }
        current[i] = x;
        velocity[i] = v;
      }
      return movingCount > 0;
    },
  };
}

function checkLength(length: number, stride: number) {
  if (length % stride !== 0) {
    throw new RangeError(`values: length ${length} doesn't divide into items of ${stride} (the stride)`);
  }
}

function finite(v: number | undefined, name: string, index: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new RangeError(`values: ${name}[${index}] must be a finite number, got ${v}`);
  }
  return v;
}
