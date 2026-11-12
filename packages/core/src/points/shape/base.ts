export type Vec3 = readonly [number, number, number];

export interface ShapePoint {
  x: number;
  y: number;
  z: number;
  tone?: number | string;
  order?: number;
}

export interface ShapeSample {
  x: number;
  y: number;
  z: number;
  along: number;
  group: number;
}

export type ToneRule = number | string | ((point: ShapeSample) => number | string);

export type Axis = "x" | "y" | "z";

export interface Sample {
  at: Vec3;
  along: number;
  group: number;
  tone?: number | string;
}

export type Generate = (count: number, random: () => number) => Sample[];

export interface Shape {
  readonly area: number;
  points(count: number, options?: { seed?: number }): ShapePoint[];
  at(offset: Vec3): Shape;
  scale(by: number | Vec3): Shape;
  rotate(degrees: { x?: number; y?: number; z?: number }): Shape;
  mirror(axis: Axis): Shape;
  tone(rule: ToneRule): Shape;
  stripes(options: { every: number; tones: readonly (number | string)[]; axis?: Axis }): Shape;
  fuzz(amount: number): Shape;
  warp(move: (point: ShapeSample) => Vec3): Shape;
  repeat(options: { copies: number; around?: Axis; step?: Vec3 }): Shape;
}

export const AXES = { x: 0, y: 1, z: 2 } as const;

export const STRAND = 0.03;

const DEGREES = Math.PI / 180;
const FUZZ_SPREAD = 0.5;

export function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);

    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(random() || 1e-12)) * Math.cos(2 * Math.PI * random());
}

export function checkCount(count: number, where: string): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`shapes: ${where} count must be a whole number of 0 or more, got ${count}`);
  }
}

export function checkFinite(value: number, where: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`shapes: ${where} must be a finite number, got ${value}`);
}

export function checkPositive(value: number, where: string): void {
  if (!(value > 0) || !Number.isFinite(value)) throw new RangeError(`shapes: ${where} must be a positive number, got ${value}`);
}

export function checkWhole(value: number, where: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`shapes: ${where} must be a whole number of ${minimum} or more, got ${value}`);
  }
}

export function checkUnit(value: number, where: string): void {
  if (!(value >= 0 && value <= 1)) throw new RangeError(`shapes: ${where} must be from 0 to 1, got ${value}`);
}

function checkVec(vector: Vec3, where: string) {
  for (const [axis, value] of vector.entries()) checkFinite(value, `${where}[${axis}]`);
}

export function shareOut(count: number, weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (total > 0 ? (weight / total) * count : count / weights.length));
  const counts = exact.map(Math.floor);
  const short = count - counts.reduce((sum, value) => sum + value, 0);

  const largestRemainders = exact
    .map((value, index) => ({ index, left: value - Math.floor(value) }))
    .sort((a, b) => b.left - a.left)
    .slice(0, short);

  for (const { index } of largestRemainders) counts[index]!++;

  return counts;
}

function turnAbout(at: Vec3, axis: 0 | 1 | 2, radians: number): Vec3 {
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
  const [x, y, z] = at;

  if (axis === 0) return [x, y * cos - z * sin, y * sin + z * cos];

  if (axis === 1) return [x * cos + z * sin, y, z * cos - x * sin];

  return [x * cos - y * sin, x * sin + y * cos, z];
}

const sampleView = ({ at, along, group }: Sample): ShapeSample => ({ x: at[0], y: at[1], z: at[2], along, group });

const toPoint = ({ at, along, tone }: Sample): ShapePoint => ({
  x: at[0],
  y: -at[1],
  z: at[2],
  ...(tone === undefined ? {} : { tone }),
  order: along,
});

type Change = (sample: Sample, random: () => number) => Sample;

const mapped = (generate: Generate, change: Change): Generate => (count, random) =>
  generate(count, random).map((sample) => change(sample, random));

function moved(area: number, generate: Generate, offset: Vec3): Shape {
  checkVec(offset, "at");

  return shape(
    area,
    mapped(generate, (sample) => ({ ...sample, at: [sample.at[0] + offset[0], sample.at[1] + offset[1], sample.at[2] + offset[2]] })),
  );
}

function scaled(area: number, generate: Generate, by: number | Vec3): Shape {
  const factors: Vec3 = typeof by === "number" ? [by, by, by] : by;

  checkVec(factors, "scale");

  const [a, b, c] = factors.map(Math.abs) as [number, number, number];
  const change: Change = (sample) => ({ ...sample, at: [sample.at[0] * factors[0], sample.at[1] * factors[1], sample.at[2] * factors[2]] });

  return shape((area * (a * b + b * c + c * a)) / 3, mapped(generate, change));
}

function rotated(area: number, generate: Generate, { x = 0, y = 0, z = 0 }: { x?: number; y?: number; z?: number }): Shape {
  checkFinite(x, "rotate.x");
  checkFinite(y, "rotate.y");
  checkFinite(z, "rotate.z");

  const [cosX, sinX] = [Math.cos(x * DEGREES), Math.sin(x * DEGREES)];
  const [cosY, sinY] = [Math.cos(y * DEGREES), Math.sin(y * DEGREES)];
  const [cosZ, sinZ] = [Math.cos(z * DEGREES), Math.sin(z * DEGREES)];

  const change: Change = (sample) => {
    const [px, py, pz] = sample.at;
    const [ay, az] = [py * cosX - pz * sinX, py * sinX + pz * cosX];
    const [bx, bz] = [px * cosY + az * sinY, az * cosY - px * sinY];

    return { ...sample, at: [bx * cosZ - ay * sinZ, bx * sinZ + ay * cosZ, bz] };
  };

  return shape(area, mapped(generate, change));
}

function mirrored(area: number, generate: Generate, axis: Axis): Shape {
  const index = AXES[axis];

  if (index === undefined) throw new RangeError(`shapes: mirror takes "x", "y" or "z", got ${String(axis)}`);

  const flip = (sample: Sample): Sample => {
    const at = [...sample.at] as [number, number, number];

    at[index] = -at[index];

    return { ...sample, at };
  };

  return shape(area * 2, (count, random) => {
    const half = generate(Math.ceil(count / 2), random);

    return [...half, ...half.map(flip)].slice(0, count);
  });
}

function toned(area: number, generate: Generate, rule: ToneRule): Shape {
  if (typeof rule === "number") checkFinite(rule, "tone");

  const toneOf = (sample: Sample) => (typeof rule === "function" ? rule(sampleView(sample)) : rule);

  return shape(area, mapped(generate, (sample) => ({ ...sample, tone: toneOf(sample) })));
}

function striped(area: number, generate: Generate, { every, tones, axis = "x" }: Parameters<Shape["stripes"]>[0]): Shape {
  checkPositive(every, "stripes.every");

  if (tones.length === 0) throw new RangeError("shapes: stripes needs at least one tone");

  const index = AXES[axis];
  const bandTone = (sample: Sample) => {
    const band = Math.floor(sample.at[index] / every);

    return tones[((band % tones.length) + tones.length) % tones.length]!;
  };

  return shape(area, mapped(generate, (sample) => ({ ...sample, tone: bandTone(sample) })));
}

function warped(area: number, generate: Generate, move: (point: ShapeSample) => Vec3): Shape {
  const change: Change = (sample) => {
    const at = move(sampleView(sample));

    if (!at.every(Number.isFinite)) throw new RangeError(`shapes: warp must return three finite numbers, got [${at.join(", ")}]`);

    return { ...sample, at };
  };

  return shape(area, mapped(generate, change));
}

function checkRepeat({ copies, around, step }: Parameters<Shape["repeat"]>[0]): 0 | 1 | 2 | null {
  checkWhole(copies, "repeat.copies", 1);

  if (around === undefined && step === undefined) throw new RangeError("shapes: repeat needs `around`, `step` or both");

  const axis = around === undefined ? null : AXES[around];

  if (axis === undefined) throw new RangeError(`shapes: repeat.around takes "x", "y" or "z", got ${String(around)}`);

  if (step) checkVec(step, "repeat.step");

  return axis;
}

function repeated(area: number, generate: Generate, options: Parameters<Shape["repeat"]>[0]): Shape {
  const axis = checkRepeat(options);
  const { copies, step } = options;

  const placeCopy = (sample: Sample, copy: number): Sample => {
    const turned = axis === null ? sample.at : turnAbout(sample.at, axis, (copy * Math.PI * 2) / copies);
    const at: Vec3 = step ? [turned[0] + step[0] * copy, turned[1] + step[1] * copy, turned[2] + step[2] * copy] : turned;

    return { ...sample, at, group: copy };
  };

  return shape(area * copies, (count, random) =>
    shareOut(count, Array.from({ length: copies }, () => 1)).flatMap((share, copy) =>
      generate(share, random).map((sample) => placeCopy(sample, copy)),
    ),
  );
}

function fuzzed(area: number, generate: Generate, amount: number): Shape {
  checkFinite(amount, "fuzz");

  const nudge = (value: number, random: () => number) => value + gaussian(random) * amount * FUZZ_SPREAD;

  const change: Change = (sample, random) => ({
    ...sample,
    at: [nudge(sample.at[0], random), nudge(sample.at[1], random), nudge(sample.at[2], random)],
  });

  return shape(area, mapped(generate, change));
}

export function shape(area: number, generate: Generate): Shape {
  return {
    area,

    points(count, { seed = 1 } = {}) {
      checkCount(count, "points");
      checkFinite(seed, "seed");

      return generate(count, seeded(seed)).map(toPoint);
    },

    at: (offset) => moved(area, generate, offset),
    scale: (by) => scaled(area, generate, by),
    rotate: (degrees) => rotated(area, generate, degrees),
    mirror: (axis) => mirrored(area, generate, axis),
    tone: (rule) => toned(area, generate, rule),
    stripes: (options) => striped(area, generate, options),
    warp: (move) => warped(area, generate, move),
    repeat: (options) => repeated(area, generate, options),
    fuzz: (amount) => fuzzed(area, generate, amount),
  };
}
