/**
 * 3D shapes as clouds of points, built from a few primitives and composed into anything.
 *
 * ```ts
 * const planet = shapes.compose([
 *   { share: 0.7, shape: shapes.sphere().tone("rock") },
 *   { share: 0.3, shape: shapes.oval({ radii: [1.8, 1.8] }).rotate({ x: 75 }).tone("ice") },
 * ]);
 * const points = planet.points(3000);
 * ```
 *
 * Every shape is a description: nothing is sampled until `points(count)`, so one shape can be drawn
 * with 800 dots on a phone and 4000 on a desktop. Sampling is seeded, so the same shape gives the
 * same points every time. Shapes are built with y pointing up, as in most 3D tools; `points`
 * turns them over for the screen, where y points down.
 */

import { toCubics } from "../path/normalize";
import { parsePath } from "../path/parse";
import { bounds, samplePoints, signedArea } from "../path/measure";
import { checkPixels, colourAt, luma, mainColours, nearest, subjectMask, toHex, type PixelSubject, type Pixels } from "./pixels";
import { sampleMask, samplePath } from "./sampling";

/** A point in a shape's own space: `[x, y, z]`, with y up. */
export type Vec3 = readonly [number, number, number];

/** A sampled point, ready for `pointCloud` or `particles`. */
export interface ShapePoint {
  x: number;
  y: number;
  z: number;
  /** A colour: a number from 0 to 1 along a palette, or a palette colour's name. */
  tone?: number | string;
  /**
   * Where the point sits along its shape, from 0 to 1 (out from a spiral's core, down a helix,
   * along a path). Points sorted by it flow into each other in order.
   */
  order?: number;
}

/** A point as a tone rule sees it: where it is (y up), and where along its shape. */
export interface ShapeSample {
  x: number;
  y: number;
  z: number;
  /** From 0 to 1 along the shape. */
  along: number;
  /** Which arm, strand or part of a shape it belongs to, from 0. */
  group: number;
}

/** A tone, or a rule that picks one for each point. */
export type ToneRule = number | string | ((point: ShapeSample) => number | string);

interface Sample {
  at: Vec3;
  along: number;
  group: number;
  tone?: number | string;
}

type Generate = (count: number, random: () => number) => Sample[];

export interface Shape {
  /**
   * Roughly how much surface the shape has, in square units. `compose` shares its dots out by it,
   * so every part is drawn equally densely. Lines count as thin strands.
   */
  readonly area: number;
  /** `count` points on the shape, the same ones every time for the same `seed`. */
  points(count: number, options?: { seed?: number }): ShapePoint[];
  /** Moved by `[x, y, z]`. */
  at(offset: Vec3): Shape;
  /** Scaled about its origin, evenly or per axis. */
  scale(by: number | Vec3): Shape;
  /** Turned about its origin, in degrees: first about x, then y, then z. */
  rotate(degrees: { x?: number; y?: number; z?: number }): Shape;
  /** The shape and its reflection across the plane where `axis` is 0, sharing the points. */
  mirror(axis: "x" | "y" | "z"): Shape;
  /** Coloured: one tone for every point, or a rule that picks one per point. */
  tone(rule: ToneRule): Shape;
  /** Banded: tones that take turns every `every` units along `axis`. */
  stripes(options: { every: number; tones: readonly (number | string)[]; axis?: "x" | "y" | "z" }): Shape;
  /** Loosened: each point nudged by up to about `amount` in a random direction. */
  fuzz(amount: number): Shape;
  /**
   * Reshaped point by point: `move` gets each point (y up, with its `along` and `group`) and returns
   * where it goes instead. For ripples, bulges and twists that the other methods can't make.
   */
  warp(move: (point: ShapeSample) => Vec3): Shape;
  /**
   * Copies of the shape: turned evenly about an axis (`around`), stepped along (`step`), or both,
   * for a spiral staircase. The dots are shared between the copies, and `group` is the copy.
   */
  repeat(options: { copies: number; around?: "x" | "y" | "z"; step?: Vec3 }): Shape;
}

const AXES = { x: 0, y: 1, z: 2 } as const;

/** A small seeded random generator (mulberry32). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A normally distributed number around 0 (Box–Muller). */
function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(random() || 1e-12)) * Math.cos(2 * Math.PI * random());
}

function checkCount(count: number, where: string): void {
  if (!Number.isInteger(count) || count < 0)
    throw new RangeError(`shapes: ${where} count must be a whole number of 0 or more, got ${count}`);
}

function checkFinite(value: number, where: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`shapes: ${where} must be a finite number, got ${value}`);
}

function checkPositive(value: number, where: string): void {
  if (!(value > 0) || !Number.isFinite(value)) throw new RangeError(`shapes: ${where} must be a positive number, got ${value}`);
}

/** A point turned by `radians` about one axis. */
function turnAbout(at: Vec3, axis: 0 | 1 | 2, radians: number): Vec3 {
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
  const [x, y, z] = at;
  if (axis === 0) return [x, y * cos - z * sin, y * sin + z * cos];
  if (axis === 1) return [x * cos + z * sin, y, z * cos - x * sin];
  return [x * cos - y * sin, x * sin + y * cos, z];
}

/** `count` shared out in proportion to `weights`, whole numbers that add up to exactly `count`. */
function shareOut(count: number, weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (total > 0 ? (weight / total) * count : count / weights.length));
  const counts = exact.map(Math.floor);
  const short = count - counts.reduce((sum, value) => sum + value, 0);
  exact
    .map((value, index) => ({ index, left: value - Math.floor(value) }))
    .sort((a, b) => b.left - a.left)
    .slice(0, short)
    .forEach(({ index }) => {
      counts[index]!++;
    });
  return counts;
}

/** A strand's area: its length, as if it were a thin tube. */
const STRAND = 0.03;

function shape(area: number, generate: Generate): Shape {
  const map = (change: (sample: Sample, random: () => number) => Sample, nextArea = area): Shape =>
    shape(nextArea, (count, random) => generate(count, random).map((sample) => change(sample, random)));

  return {
    area,
    points(count, { seed = 1 } = {}) {
      checkCount(count, "points");
      checkFinite(seed, "seed");
      return generate(count, seeded(seed)).map(({ at, along, tone }) => ({
        x: at[0],
        y: -at[1],
        z: at[2],
        ...(tone === undefined ? {} : { tone }),
        order: along,
      }));
    },
    at(offset) {
      offset.forEach((value, axis) => {
        checkFinite(value, `at[${axis}]`);
      });
      return map((sample) => ({
        ...sample,
        at: [sample.at[0] + offset[0], sample.at[1] + offset[1], sample.at[2] + offset[2]],
      }));
    },
    scale(by) {
      const factors: Vec3 = typeof by === "number" ? [by, by, by] : by;
      factors.forEach((value, axis) => {
        checkFinite(value, `scale[${axis}]`);
      });
      const [a, b, c] = factors.map(Math.abs) as [number, number, number];
      return map(
        (sample) => ({
          ...sample,
          at: [sample.at[0] * factors[0], sample.at[1] * factors[1], sample.at[2] * factors[2]],
        }),
        (area * (a * b + b * c + c * a)) / 3,
      );
    },
    rotate({ x = 0, y = 0, z = 0 }) {
      checkFinite(x, "rotate.x");
      checkFinite(y, "rotate.y");
      checkFinite(z, "rotate.z");
      const radians = Math.PI / 180;
      const [cosX, sinX] = [Math.cos(x * radians), Math.sin(x * radians)];
      const [cosY, sinY] = [Math.cos(y * radians), Math.sin(y * radians)];
      const [cosZ, sinZ] = [Math.cos(z * radians), Math.sin(z * radians)];
      return map((sample) => {
        const [px, py, pz] = sample.at;
        const [ay, az] = [py * cosX - pz * sinX, py * sinX + pz * cosX];
        const [bx, bz] = [px * cosY + az * sinY, az * cosY - px * sinY];
        return {
          ...sample,
          at: [bx * cosZ - ay * sinZ, bx * sinZ + ay * cosZ, bz],
        };
      });
    },
    mirror(axis) {
      const index = AXES[axis];
      if (index === undefined) throw new RangeError(`shapes: mirror takes "x", "y" or "z", got ${String(axis)}`);
      return shape(area * 2, (count, random) => {
        const half = generate(Math.ceil(count / 2), random);
        const flipped = half.map((sample) => {
          const at = [...sample.at] as [number, number, number];
          at[index] = -at[index];
          return { ...sample, at: at as Vec3 };
        });
        return [...half, ...flipped].slice(0, count);
      });
    },
    tone(rule) {
      if (typeof rule === "number") checkFinite(rule, "tone");
      return map((sample) => ({
        ...sample,
        tone:
          typeof rule === "function"
            ? rule({
                x: sample.at[0],
                y: sample.at[1],
                z: sample.at[2],
                along: sample.along,
                group: sample.group,
              })
            : rule,
      }));
    },
    stripes({ every, tones, axis = "x" }) {
      checkPositive(every, "stripes.every");
      if (tones.length === 0) throw new RangeError("shapes: stripes needs at least one tone");
      const index = AXES[axis];
      return map((sample) => {
        const band = Math.floor(sample.at[index] / every);
        return {
          ...sample,
          tone: tones[((band % tones.length) + tones.length) % tones.length]!,
        };
      });
    },
    warp(move) {
      return map((sample) => {
        const at = move({ x: sample.at[0], y: sample.at[1], z: sample.at[2], along: sample.along, group: sample.group });
        if (!at.every(Number.isFinite)) throw new RangeError(`shapes: warp must return three finite numbers, got [${at.join(", ")}]`);
        return { ...sample, at };
      });
    },
    repeat({ copies, around, step }) {
      if (!Number.isInteger(copies) || copies < 1)
        throw new RangeError(`shapes: repeat.copies must be a whole number of 1 or more, got ${copies}`);
      if (around === undefined && step === undefined) throw new RangeError("shapes: repeat needs `around`, `step` or both");
      const axis = around === undefined ? null : AXES[around];
      if (axis === undefined) throw new RangeError(`shapes: repeat.around takes "x", "y" or "z", got ${String(around)}`);
      step?.forEach((value, index) => {
        checkFinite(value, `repeat.step[${index}]`);
      });
      return shape(area * copies, (count, random) =>
        shareOut(
          count,
          Array.from({ length: copies }, () => 1),
        ).flatMap((share, copy) =>
          generate(share, random).map((sample) => {
            const turned = axis === null ? sample.at : turnAbout(sample.at, axis, (copy * Math.PI * 2) / copies);
            const at: Vec3 = step ? [turned[0] + step[0] * copy, turned[1] + step[1] * copy, turned[2] + step[2] * copy] : turned;
            return { ...sample, at, group: copy };
          }),
        ),
      );
    },
    fuzz(amount) {
      checkFinite(amount, "fuzz");
      return map((sample, random) => ({
        ...sample,
        at: [
          sample.at[0] + gaussian(random) * amount * 0.5,
          sample.at[1] + gaussian(random) * amount * 0.5,
          sample.at[2] + gaussian(random) * amount * 0.5,
        ],
      }));
    },
  };
}

/** Points on a sphere's surface, or through its volume with `solid`. */
export function sphere({ radius = 1, solid = false }: { radius?: number; solid?: boolean } = {}): Shape {
  checkPositive(radius, "sphere.radius");
  return ellipsoid({ radii: [radius, radius, radius], solid });
}

/** Points on an ellipsoid's surface (or through it, with `solid`), with these radii along x, y and z. */
export function ellipsoid({ radii, solid = false }: { radii: Vec3; solid?: boolean }): Shape {
  radii.forEach((radius, axis) => {
    checkPositive(radius, `ellipsoid.radii[${axis}]`);
  });
  // Knud Thomsen's approximation of an ellipsoid's surface; a solid one is drawn through its volume.
  const [a, b, c] = radii;
  const surface = 4 * Math.PI * (((a * b) ** 1.6075 + (a * c) ** 1.6075 + (b * c) ** 1.6075) / 3) ** (1 / 1.6075);
  return shape(surface, (count, random) =>
    Array.from({ length: count }, () => {
      const up = random() * 2 - 1;
      const around = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - up * up);
      const depth = solid ? Math.cbrt(random()) : 1;
      return {
        at: [radii[0] * ring * Math.cos(around) * depth, radii[1] * up * depth, radii[2] * ring * Math.sin(around) * depth],
        along: (up + 1) / 2,
        group: 0,
      };
    }),
  );
}

/**
 * A flat oval facing you, in the x–y plane, with these radii. Most points line its edge (`edge`,
 * from 0 to 1) and the rest fill it, which reads well for wings, rings and leaves.
 */
export function oval({ radii, edge = 0.6 }: { radii: readonly [number, number]; edge?: number }): Shape {
  radii.forEach((radius, axis) => {
    checkPositive(radius, `oval.radii[${axis}]`);
  });
  if (!(edge >= 0 && edge <= 1)) throw new RangeError(`shapes: oval.edge must be from 0 to 1, got ${edge}`);
  return shape(Math.PI * radii[0] * radii[1], (count, random) =>
    Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const reach = random() < edge ? 1 : Math.sqrt(random());
      return {
        at: [Math.cos(angle) * radii[0] * reach, Math.sin(angle) * radii[1] * reach, 0],
        along: reach,
        group: 0,
      };
    }),
  );
}

/**
 * A ring-shaped tube lying flat in the x–z plane: `radius` from the centre to the middle of the
 * tube, which is `tube` thick. `along` goes once round the ring.
 */
export function torus({ radius = 0.7, tube = 0.22 }: { radius?: number; tube?: number } = {}): Shape {
  checkPositive(radius, "torus.radius");
  checkPositive(tube, "torus.tube");
  return shape(4 * Math.PI ** 2 * radius * tube, (count, random) =>
    Array.from({ length: count }, () => {
      const around = random() * Math.PI * 2;
      const across = random() * Math.PI * 2;
      const reach = radius + tube * Math.cos(across);
      return { at: [Math.cos(around) * reach, tube * Math.sin(across), Math.sin(around) * reach], along: around / (Math.PI * 2), group: 0 };
    }),
  );
}

/** Points along a smooth curve through every point in `through` (a Catmull–Rom spline). */
export function curve({ through }: { through: readonly Vec3[] }): Shape {
  if (through.length < 2) throw new RangeError(`shapes: curve needs at least 2 points to pass through, got ${through.length}`);
  through.forEach((point, index) => {
    point.forEach((value, axis) => {
      checkFinite(value, `curve.through[${index}][${axis}]`);
    });
  });
  const spans = through.length - 1;
  const pointAt = (t: number): Vec3 => {
    const span = Math.min(Math.floor(t * spans), spans - 1);
    const local = t * spans - span;
    const p0 = through[Math.max(span - 1, 0)]!;
    const p1 = through[span]!;
    const p2 = through[span + 1]!;
    const p3 = through[Math.min(span + 2, spans)]!;
    const blend = (axis: number) =>
      0.5 *
      (2 * p1[axis]! +
        (p2[axis]! - p0[axis]!) * local +
        (2 * p0[axis]! - 5 * p1[axis]! + 4 * p2[axis]! - p3[axis]!) * local ** 2 +
        (3 * p1[axis]! - p0[axis]! - 3 * p2[axis]! + p3[axis]!) * local ** 3);
    return [blend(0), blend(1), blend(2)];
  };
  let length = 0;
  for (let step = 1; step <= 64; step++) {
    const [from, to] = [pointAt((step - 1) / 64), pointAt(step / 64)];
    length += Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  }
  return shape(length * STRAND, (count, random) =>
    Array.from({ length: count }, () => {
      const t = random();
      return { at: pointAt(t), along: t, group: 0 };
    }),
  );
}

/**
 * A spiral galaxy lying flat in the x–z plane, radius 1: `arms` arms that wind `twist` radians
 * from the centre out, round a dense core holding `core` of the points. `group` is the arm, and
 * the core is group `arms`.
 */
export function spiral({ arms = 3, twist = 3.4, core = 0.18 }: { arms?: number; twist?: number; core?: number } = {}): Shape {
  if (!Number.isInteger(arms) || arms < 1) throw new RangeError(`shapes: spiral.arms must be a whole number of 1 or more, got ${arms}`);
  checkFinite(twist, "spiral.twist");
  if (!(core >= 0 && core <= 1)) throw new RangeError(`shapes: spiral.core must be from 0 to 1, got ${core}`);
  return shape(Math.PI * 0.4, (count, random) =>
    Array.from({ length: count }, (_, index) => {
      if (index < count * core) {
        const radius = Math.abs(gaussian(random)) * 0.12;
        const angle = random() * Math.PI * 2;
        return {
          at: [Math.cos(angle) * radius, gaussian(random) * 0.05, Math.sin(angle) * radius],
          along: radius / 1.2,
          group: arms,
        };
      }
      const arm = index % arms;
      const reach = 0.08 + random() ** 0.8 * 0.92;
      const angle = (arm * Math.PI * 2) / arms + reach * twist + gaussian(random) * 0.22 * (1 - reach * 0.5);
      const scatter = gaussian(random) * 0.05;
      return {
        at: [Math.cos(angle) * (reach + scatter), gaussian(random) * 0.035 * (1 - reach), Math.sin(angle) * (reach + scatter)],
        along: reach,
        group: arm,
      };
    }),
  );
}

/**
 * Strands twisting round the y axis, `height` tall, joined by `rungs` cross-pieces (which take
 * `rungShare` of the points). `group` is the strand, and the rungs are group `strands`.
 */
export function helix({
  strands = 2,
  turns = 3,
  radius = 0.34,
  height = 1.75,
  rungs = 26,
  rungShare = 0.22,
}: {
  strands?: number;
  turns?: number;
  radius?: number;
  height?: number;
  rungs?: number;
  rungShare?: number;
} = {}): Shape {
  if (!Number.isInteger(strands) || strands < 1)
    throw new RangeError(`shapes: helix.strands must be a whole number of 1 or more, got ${strands}`);
  if (!Number.isInteger(rungs) || rungs < 0) throw new RangeError(`shapes: helix.rungs must be a whole number of 0 or more, got ${rungs}`);
  checkFinite(turns, "helix.turns");
  checkPositive(radius, "helix.radius");
  checkPositive(height, "helix.height");
  if (!(rungShare >= 0 && rungShare <= 1)) throw new RangeError(`shapes: helix.rungShare must be from 0 to 1, got ${rungShare}`);
  const spin = turns * Math.PI * 2;
  const strandLength = Math.hypot(spin * radius, height);
  return shape((strands * strandLength + rungs * radius * 2) * STRAND * 2, (count, random) =>
    Array.from({ length: count }, (_, index) => {
      if (rungs > 0 && index < count * rungShare) {
        const along = rungs === 1 ? 0.5 : (index % rungs) / (rungs - 1);
        const across = random() * 2 - 1;
        return {
          at: [Math.cos(along * spin) * radius * across, (0.5 - along) * height, Math.sin(along * spin) * radius * across],
          along,
          group: strands,
        };
      }
      const strand = index % strands;
      const along = random();
      const angle = along * spin + (strand * Math.PI * 2) / strands;
      const wobble = radius + gaussian(random) * radius * 0.045;
      return {
        at: [Math.cos(angle) * wobble, (0.5 - along) * height, Math.sin(angle) * wobble],
        along,
        group: strand,
      };
    }),
  );
}

/**
 * A strange attractor, traced as one long path and scaled to about radius 1. `"lorenz"` is the
 * Lorenz system's two-winged butterfly.
 */
export function attractor(name: "lorenz"): Shape {
  if (name !== "lorenz") throw new RangeError(`shapes: attractor knows "lorenz", got ${String(name)}`);
  const step = 0.004;
  return shape(1.5, (count) => {
    let [x, y, z] = [0.1, 0, 0];
    const advance = () => {
      [x, y, z] = [x + 10 * (y - x) * step, y + (x * (28 - z) - y) * step, z + (x * y - (8 / 3) * z) * step];
    };
    for (let warmup = 0; warmup < 2000; warmup++) advance();
    return Array.from({ length: count }, (_, index) => {
      for (let substep = 0; substep < 3; substep++) advance();
      return {
        at: [x / 26, (z - 25) / 24, y / 26],
        along: count > 1 ? index / (count - 1) : 0,
        group: 0,
      };
    });
  });
}

/**
 * One shape made of others, each keeping its own tones. Each part's dots are in proportion to its
 * `area`, so every part is drawn equally densely; give a part a `share` to weight it by hand instead,
 * in the same square units. Points are ordered along the whole shape's longest side, and `group` is
 * the part.
 */
export function compose(parts: readonly { shape: Shape; share?: number }[]): Shape {
  if (parts.length === 0) throw new RangeError("shapes: compose needs at least one part");
  parts.forEach(({ share }, index) => {
    if (share !== undefined) checkPositive(share, `compose[${index}].share`);
  });
  const weights = parts.map(({ shape: part, share }) => share ?? part.area);
  return shape(
    weights.reduce((sum, weight) => sum + weight, 0),
    (count, random) => {
      const counts = shareOut(count, weights);

      const samples = parts.flatMap(({ shape: part }, index) => {
        const seed = Math.floor(random() * 2 ** 32);
        return part.points(counts[index]!, { seed }).map(
          ({ x, y, z, tone }): Sample => ({
            at: [x, -y, z],
            along: 0,
            group: index,
            ...(tone === undefined ? {} : { tone }),
          }),
        );
      });

      const extent = [0, 1, 2].map((axis) => {
        const values = samples.map((sample) => sample.at[axis]!);
        return {
          axis,
          min: Math.min(...values),
          size: Math.max(...values) - Math.min(...values),
        };
      });
      const longest = extent.reduce((best, next) => (next.size > best.size ? next : best));
      return samples.map((sample) => ({
        ...sample,
        along: longest.size > 0 ? (sample.at[longest.axis]! - longest.min) / longest.size : 0,
      }));
    },
  );
}

/**
 * A surface of revolution: the side view `profile`, as `[radius, height]` points from bottom to
 * top, spun once round the y axis. A smooth curve passes through every point, so a few make a vase,
 * a bottle, a bell or a lamp. Dots are spread evenly over the surface, so wide parts get more.
 * `along` runs from bottom to top.
 */
export function revolve({ profile }: { profile: readonly (readonly [number, number])[] }): Shape {
  if (profile.length < 2) throw new RangeError(`shapes: revolve needs at least 2 profile points, got ${profile.length}`);
  profile.forEach(([radius, height], index) => {
    if (!(radius >= 0) || !Number.isFinite(radius))
      throw new RangeError(`shapes: revolve.profile[${index}] radius must be 0 or more, got ${radius}`);
    checkFinite(height, `revolve.profile[${index}] height`);
  });
  // The profile as a smooth curve, then measured in short steps: each step's share of the surface
  // is its length times how far it is from the axis.
  const side = curve({ through: profile.map(([radius, height]): Vec3 => [radius, height, 0]) });
  const STEPS = 256;
  const steps = side.points(STEPS + 1, { seed: 1 }).sort((a, b) => a.order! - b.order!);
  const weights: number[] = [];
  let surface = 0;
  for (let index = 1; index < steps.length; index++) {
    const [from, to] = [steps[index - 1]!, steps[index]!];
    const weight = Math.PI * (from.x + to.x) * Math.hypot(to.x - from.x, to.y - from.y);
    surface += weight;
    weights.push(surface);
  }
  return shape(surface, (count, random) =>
    Array.from({ length: count }, () => {
      const pick = random() * surface;
      let low = 0;
      let high = weights.length - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (weights[middle]! < pick) low = middle + 1;
        else high = middle;
      }
      const blend = random();
      const [from, to] = [steps[low]!, steps[low + 1]!];
      const radius = from.x + (to.x - from.x) * blend;
      const height = -(from.y + (to.y - from.y) * blend);
      const angle = random() * Math.PI * 2;
      return {
        at: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
        along: from.order! + (to.order! - from.order!) * blend,
        group: 0,
      };
    }),
  );
}

/**
 * An SVG path made solid: its fill on a front and a back face, `depth` apart, joined round the
 * edges. Any icon, logo or drawing becomes a 3D shape. The path is centred and scaled to fit
 * radius 1 (depth is in those units), turned the right way up, and `along` runs left to right.
 */
export function fromPath(
  path: string,
  { depth = 0.3, fillRule = "nonzero" }: { depth?: number; fillRule?: "nonzero" | "evenodd" } = {},
): Shape {
  checkPositive(depth, "fromPath.depth");
  const subpaths = toCubics(parsePath(path));
  const box = bounds(subpaths);
  if (!box || (box.width === 0 && box.height === 0)) throw new RangeError("shapes: fromPath needs a path with some size");
  const scale = 2 / Math.max(box.width, box.height);
  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;
  const place = (x: number, y: number) => [(x - centreX) * scale, (centreY - y) * scale] as const;

  const face = Math.abs(subpaths.reduce((sum, subpath) => sum + signedArea(subpath), 0)) * scale ** 2;
  const edge =
    subpaths.reduce((sum, subpath) => {
      const outline = samplePoints(subpath);
      let length = 0;
      for (let index = 1; index < outline.length; index++) {
        length += Math.hypot(outline[index]!.x - outline[index - 1]!.x, outline[index]!.y - outline[index - 1]!.y);
      }
      return sum + length;
    }, 0) * scale;

  return shape(face * 2 + edge * depth, (count, random) => {
    const [faces, sides] = shareOut(count, [face * 2, edge * depth]);
    const front = Math.ceil(faces! / 2);
    const filled = front > 0 ? samplePath(subpaths, { count: front, fillRule }) : [];
    const outlined = sides! > 0 ? samplePath(subpaths, { count: sides!, mode: "outline" }) : [];
    const sample = (x: number, y: number, z: number): Sample => {
      const [px, py] = place(x, y);
      return { at: [px, py, z], along: (px + 1) / 2, group: 0 };
    };
    return [
      ...filled.map(({ x, y }) => sample(x, y, depth / 2)),
      ...filled.slice(0, faces! - front).map(({ x, y }) => sample(x, y, -depth / 2)),
      ...outlined.map(({ x, y }) => sample(x, y, (random() - 0.5) * depth)),
    ];
  });
}

/** A shape made from an image, with the colours it found in it. */
export interface PixelShape extends Shape {
  /** The image's main colours by name (`color1` darkest, then lighter), for `particles`' `palette`. Each point's tone names one. */
  readonly palette: Readonly<Record<string, string>>;
}

/**
 * An image as a 3D relief of dots, in its own colours. The subject's pixels (`by`) are sampled
 * evenly, lighter ones stand out by up to `depth`, and `bulge` rounds the whole picture into a dome,
 * like a flower head or a face. The image's `colors` main colours are found for you: each point is
 * toned with the nearest, and `palette` maps their names to hex. The picture is centred and fitted
 * to radius 1, the right way up; `along` runs left to right.
 *
 * Pixels are plain RGBA numbers, as in `ImageData`; `loadPixels` in `@remold-ui/canvas` reads them
 * from an image in the browser.
 */
export function fromPixels(
  pixels: Pixels,
  {
    by = "alpha",
    threshold = 128,
    depth = 0.25,
    bulge = 0,
    colors = 10,
  }: { by?: PixelSubject; threshold?: number; depth?: number; bulge?: number; colors?: number } = {},
): PixelShape {
  checkPixels(pixels, "shapes: fromPixels");
  if (by !== "alpha" && by !== "dark" && by !== "light" && by !== "saturation") {
    throw new RangeError(`shapes: fromPixels.by takes "alpha", "dark", "light" or "saturation", got ${String(by)}`);
  }
  checkFinite(threshold, "fromPixels.threshold");
  checkFinite(depth, "fromPixels.depth");
  checkFinite(bulge, "fromPixels.bulge");
  if (!Number.isInteger(colors) || colors < 1 || colors > 64) {
    throw new RangeError(`shapes: fromPixels.colors must be a whole number from 1 to 64, got ${colors}`);
  }
  const { width, height } = pixels;
  const mask = subjectMask(pixels, by);
  const found = mainColours(pixels, mask, threshold, colors);
  const names = found.map((_, index) => `color${index + 1}`);

  // Fitted to radius 1 by the subject's own bounds, so a small subject on a big canvas fills it.
  let [minX, minY, maxX, maxY, filled] = [width, height, 0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]! < threshold) continue;
      filled++;
      [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x + 1), Math.max(maxY, y + 1)];
    }
  }
  const half = Math.max(maxX - minX, maxY - minY, 1) / 2;
  const [centreX, centreY] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const reachX = Math.max((maxX - minX) / 2, 1) / half;
  const reachY = Math.max((maxY - minY) / 2, 1) / half;

  const built = shape(filled / half ** 2, (count, random) =>
    sampleMask({ width, height, data: mask }, { count, threshold, jitter: 0.35, seed: Math.floor(random() * 2 ** 31) }).map(({ x, y }) => {
      const colour = colourAt(pixels, Math.min(width - 1, Math.floor(x)), Math.min(height - 1, Math.floor(y)));
      const [px, py] = [(x - centreX) / half, (centreY - y) / half];
      const round = 1 - (px / reachX) ** 2 - (py / reachY) ** 2;
      const z = (luma(colour) - 0.5) * depth + bulge * Math.sqrt(Math.max(0, round));
      return {
        at: [px, py, z] as Vec3,
        along: (px + 1) / 2,
        group: 0,
        ...(found.length > 0 ? { tone: names[nearest(colour, found)]! } : {}),
      };
    }),
  );
  return Object.assign(built, { palette: Object.fromEntries(found.map((colour, index) => [names[index]!, toHex(colour)])) });
}
