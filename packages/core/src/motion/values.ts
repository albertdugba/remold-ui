import { isSettled, springCoefficients, springs, substep, type SpringCoefficients, type SpringConfig } from "./spring";

export interface ValuesOptions {
  /** The spring every entry uses. */
  spring?: SpringConfig;
  /** How close counts as arrived, in the values' own units. */
  precision?: number;
  /** How many entries make up one item, for `remap`. */
  stride?: number;
}

export interface AnimatedValues {
  /** How many entries there are (items × stride). */
  readonly length: number;
  /** How many entries make up one item. */
  readonly stride: number;
  /** Where every entry is now. */
  readonly current: Float64Array;
  /** How fast every entry is moving, in units per second. */
  readonly velocity: Float64Array;
  /** Where every entry is heading. */
  readonly target: Float64Array;
  /** True when every entry is at rest on its target. */
  readonly settled: boolean;
  /** Whether one entry is at rest on its target. */
  isSettled(index: number): boolean;
  /** Spring one entry towards `target`, keeping its position and velocity unless `velocity` is given. */
  to(index: number, target: number, options?: { velocity?: number }): void;
  /** Spring every entry towards its matching target. */
  toAll(targets: ArrayLike<number>): void;
  /** Jump one entry to `value` and stop it. */
  set(index: number, value: number): void;
  /** Jump every entry to its matching value and stop. */
  setAll(values: ArrayLike<number>): void;
  /** Use a different spring from now on. */
  setSpring(spring: SpringConfig): void;
  /** Rebuild with a new set of items, carrying motion across. */
  remap(sources: ArrayLike<number>, fill?: number | ArrayLike<number>): void;
  /** Advance every moving entry by `dt` seconds. */
  step(dt: number): boolean;
}

interface Buffers {
  current: Float64Array;
  velocity: Float64Array;
  target: Float64Array;
  moving: Uint8Array;
}

const DEFAULT_PRECISION = 0.01;
const REST_EPSILON = 1e-12;
const FRAMES_PER_SECOND = 60;
const NEW_ITEM = -1;

const emptyBuffers = (length: number): Buffers => ({
  current: new Float64Array(length),
  velocity: new Float64Array(length),
  target: new Float64Array(length),
  moving: new Uint8Array(length),
});

function finite(value: number | undefined, name: string, index: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`values: ${name}[${index}] must be a finite number, got ${value}`);
  }

  return value;
}

const checkAllFinite = (source: ArrayLike<number>, name: string) => {
  Array.from(source, (value, index) => finite(value, name, index));
};

function checkOptions(precision: number, stride: number, length: number) {
  if (!(precision > 0) || !Number.isFinite(precision)) {
    throw new RangeError(`values: precision must be a positive number, got ${precision}`);
  }

  if (!Number.isInteger(stride) || stride < 1) {
    throw new RangeError(`values: stride must be a whole number of at least 1, got ${stride}`);
  }

  if (length % stride !== 0) {
    throw new RangeError(`values: length ${length} doesn't divide into items of ${stride} (the stride)`);
  }
}

function checkSources(sources: ArrayLike<number>, oldItems: number) {
  const claimed = new Uint8Array(oldItems);

  Array.from(sources).forEach((source, index) => {
    if (source === NEW_ITEM) return;

    if (!Number.isInteger(source) || source < 0 || source >= oldItems) {
      throw new RangeError(`values: sources[${index}] must be -1 or an item from 0 to ${oldItems - 1}, got ${source}`);
    }

    if (claimed[source]) throw new RangeError(`values: item ${source} appears twice in sources`);

    claimed[source] = 1;
  });
}

function checkFill(fill: number | ArrayLike<number>, length: number) {
  if (typeof fill === "number") {
    finite(fill, "fill", 0);
    return;
  }

  if (fill.length !== length) {
    throw new RangeError(`values: fill needs ${length} entries (one per new entry), got ${fill.length}`);
  }

  checkAllFinite(fill, "fill");
}

function remapped(old: Buffers, sources: ArrayLike<number>, stride: number, fill: number | ArrayLike<number>): Buffers {
  const next = emptyBuffers(sources.length * stride);
  const fillAt = (index: number) => (typeof fill === "number" ? fill : fill[index]!);

  Array.from(sources).forEach((source, item) => {
    for (let part = 0; part < stride; part++) {
      const to = item * stride + part;

      if (source === NEW_ITEM) {
        next.current[to] = fillAt(to);
        next.target[to] = fillAt(to);
        continue;
      }

      const from = source * stride + part;

      next.current[to] = old.current[from]!;
      next.velocity[to] = old.velocity[from]!;
      next.target[to] = old.target[from]!;
      next.moving[to] = old.moving[from]!;
    }
  });

  return next;
}

interface StepOptions {
  spring: SpringCoefficients;
  longest: number;
  dt: number;
  precision: number;
  speedLimit: number;
}

function advanceEntry({ current, velocity, target, moving }: Buffers, index: number, options: StepOptions): boolean {
  const { spring, longest, dt, precision, speedLimit } = options;
  const goal = target[index]!;
  let position = current[index]!;
  let speed = velocity[index]!;

  for (let remaining = dt; remaining > REST_EPSILON; remaining -= longest) {
    const h = Math.min(remaining, longest);

    speed += (-spring.stiffness * (position - goal) - spring.damping * speed) * h;
    position += speed * h;
  }

  const landed = Math.abs(position - goal) < precision && Math.abs(speed) < speedLimit;

  current[index] = landed ? goal : position;
  velocity[index] = landed ? 0 : speed;

  if (landed) moving[index] = 0;

  return landed;
}

const countMoving = (moving: Uint8Array) => moving.reduce((total, flag) => total + flag, 0);

/** Create a batch of animated values, starting at rest at `initial`. */
export function values(initial: ArrayLike<number>, options: ValuesOptions = {}): AnimatedValues {
  const precision = options.precision ?? DEFAULT_PRECISION;
  const stride = options.stride ?? 1;

  checkOptions(precision, stride, initial.length);
  checkAllFinite(initial, "initial");

  let spring: SpringCoefficients = springCoefficients(options.spring ?? springs.smooth);
  let longest = substep(spring);
  let buffers = emptyBuffers(initial.length);
  let movingCount = 0;

  buffers.current.set(Array.from(initial));
  buffers.target.set(Array.from(initial));

  const length = () => buffers.current.length;

  const checkIndex = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= length()) {
      throw new RangeError(`values: index must be a whole number from 0 to ${length() - 1}, got ${index}`);
    }
  };

  const checkSize = (source: ArrayLike<number>, name: string) => {
    if (source.length !== length()) {
      throw new RangeError(`values: ${name} needs ${length()} entries, got ${source.length}`);
    }
  };

  const refresh = (index: number) => {
    const { current, velocity, target, moving } = buffers;
    const state = { value: current[index]!, velocity: velocity[index]! };
    const now = isSettled(state, target[index]!, precision) ? 0 : 1;

    movingCount += now - moving[index]!;
    moving[index] = now;
  };

  const stop = (index: number, value: number) => {
    const { current, velocity, target, moving } = buffers;

    current[index] = value;
    velocity[index] = 0;
    target[index] = value;
    movingCount -= moving[index]!;
    moving[index] = 0;
  };

  return {
    get length() {
      return length();
    },

    stride,

    get current() {
      return buffers.current;
    },

    get velocity() {
      return buffers.velocity;
    },

    get target() {
      return buffers.target;
    },

    get settled() {
      return movingCount === 0;
    },

    isSettled(index) {
      checkIndex(index);

      return buffers.moving[index] === 0;
    },

    to(index, next, { velocity } = {}) {
      checkIndex(index);
      buffers.target[index] = finite(next, "target", index);

      if (velocity !== undefined) buffers.velocity[index] = finite(velocity, "velocity", index);

      refresh(index);
    },

    toAll(targets) {
      checkSize(targets, "targets");
      checkAllFinite(targets, "targets");

      for (let index = 0; index < length(); index++) {
        buffers.target[index] = targets[index]!;
        refresh(index);
      }
    },

    set(index, value) {
      checkIndex(index);
      stop(index, finite(value, "value", index));
    },

    setAll(next) {
      checkSize(next, "values");
      checkAllFinite(next, "values");

      for (let index = 0; index < length(); index++) stop(index, next[index]!);
    },

    setSpring(config) {
      spring = springCoefficients(config);
      longest = substep(spring);
    },

    remap(sources, fill = 0) {
      checkFill(fill, sources.length * stride);
      checkSources(sources, length() / stride);

      buffers = remapped(buffers, sources, stride, fill);
      movingCount = countMoving(buffers.moving);
    },

    step(dt) {
      if (!(dt >= 0) || dt === Infinity) {
        throw new RangeError(`values: dt must be a finite number of seconds, 0 or more, got ${dt}`);
      }

      if (movingCount === 0 || dt === 0) return movingCount > 0;

      const options: StepOptions = { spring, longest, dt, precision, speedLimit: precision * FRAMES_PER_SECOND };

      for (let index = 0; index < buffers.current.length; index++) {
        if (buffers.moving[index] === 0) continue;

        if (advanceEntry(buffers, index, options)) movingCount--;
      }

      return movingCount > 0;
    },
  };
}
