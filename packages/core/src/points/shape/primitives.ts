import {
  checkFinite,
  checkPositive,
  checkUnit,
  checkWhole,
  gaussian,
  shape,
  STRAND,
  type Sample,
  type Shape,
  type Vec3,
} from "./base";

const TURN = Math.PI * 2;
const THOMSEN = 1.6075;
const CURVE_STEPS = 64;
const SPIRAL_AREA = Math.PI * 0.4;
const LORENZ_STEP = 0.004;
const LORENZ_WARMUP = 2000;
const LORENZ_SUBSTEPS = 3;

const thomsenSurface = ([a, b, c]: Vec3) =>
  4 * Math.PI * (((a * b) ** THOMSEN + (a * c) ** THOMSEN + (b * c) ** THOMSEN) / 3) ** (1 / THOMSEN);

function ellipsoidPoint(radii: Vec3, solid: boolean, random: () => number): Sample {
  const up = random() * 2 - 1;
  const around = random() * TURN;
  const ring = Math.sqrt(1 - up * up);
  const depth = solid ? Math.cbrt(random()) : 1;

  return {
    at: [radii[0] * ring * Math.cos(around) * depth, radii[1] * up * depth, radii[2] * ring * Math.sin(around) * depth],
    along: (up + 1) / 2,
    group: 0,
  };
}

/** Points on an ellipsoid's surface (or through it, with `solid`), with these radii along x, y and z. */
export function ellipsoid({ radii, solid = false }: { radii: Vec3; solid?: boolean }): Shape {
  for (const [axis, radius] of radii.entries()) checkPositive(radius, `ellipsoid.radii[${axis}]`);

  return shape(thomsenSurface(radii), (count, random) => Array.from({ length: count }, () => ellipsoidPoint(radii, solid, random)));
}

/** Points on a sphere's surface, or through its volume with `solid`. */
export function sphere({ radius = 1, solid = false }: { radius?: number; solid?: boolean } = {}): Shape {
  checkPositive(radius, "sphere.radius");

  return ellipsoid({ radii: [radius, radius, radius], solid });
}

function ovalPoint(radii: readonly [number, number], edge: number, random: () => number): Sample {
  const angle = random() * TURN;
  const reach = random() < edge ? 1 : Math.sqrt(random());

  return { at: [Math.cos(angle) * radii[0] * reach, Math.sin(angle) * radii[1] * reach, 0], along: reach, group: 0 };
}

/** A flat oval facing you, in the x–y plane, with these radii. */
export function oval({ radii, edge = 0.6 }: { radii: readonly [number, number]; edge?: number }): Shape {
  for (const [axis, radius] of radii.entries()) checkPositive(radius, `oval.radii[${axis}]`);
  checkUnit(edge, "oval.edge");

  return shape(Math.PI * radii[0] * radii[1], (count, random) => Array.from({ length: count }, () => ovalPoint(radii, edge, random)));
}

function torusPoint(radius: number, tube: number, random: () => number): Sample {
  const around = random() * TURN;
  const across = random() * TURN;
  const reach = radius + tube * Math.cos(across);

  return { at: [Math.cos(around) * reach, tube * Math.sin(across), Math.sin(around) * reach], along: around / TURN, group: 0 };
}

/** A ring-shaped tube lying flat in the x–z plane. */
export function torus({ radius = 0.7, tube = 0.22 }: { radius?: number; tube?: number } = {}): Shape {
  checkPositive(radius, "torus.radius");
  checkPositive(tube, "torus.tube");

  return shape(4 * Math.PI ** 2 * radius * tube, (count, random) => Array.from({ length: count }, () => torusPoint(radius, tube, random)));
}

function catmullRom(through: readonly Vec3[]) {
  const spans = through.length - 1;

  return (t: number): Vec3 => {
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
}

function curveLength(pointAt: (t: number) => Vec3): number {
  let length = 0;

  for (let step = 1; step <= CURVE_STEPS; step++) {
    const [from, to] = [pointAt((step - 1) / CURVE_STEPS), pointAt(step / CURVE_STEPS)];

    length += Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  }

  return length;
}

/** Points along a smooth curve through every point in `through` (a Catmull–Rom spline). */
export function curve({ through }: { through: readonly Vec3[] }): Shape {
  if (through.length < 2) throw new RangeError(`shapes: curve needs at least 2 points to pass through, got ${through.length}`);

  for (const [index, point] of through.entries()) {
    for (const [axis, value] of point.entries()) checkFinite(value, `curve.through[${index}][${axis}]`);
  }

  const pointAt = catmullRom(through);

  return shape(curveLength(pointAt) * STRAND, (count, random) =>
    Array.from({ length: count }, () => {
      const t = random();

      return { at: pointAt(t), along: t, group: 0 };
    }),
  );
}

function corePoint(arms: number, random: () => number): Sample {
  const radius = Math.abs(gaussian(random)) * 0.12;
  const angle = random() * TURN;

  return { at: [Math.cos(angle) * radius, gaussian(random) * 0.05, Math.sin(angle) * radius], along: radius / 1.2, group: arms };
}

function armPoint(arm: number, arms: number, twist: number, random: () => number): Sample {
  const reach = 0.08 + random() ** 0.8 * 0.92;
  const angle = (arm * TURN) / arms + reach * twist + gaussian(random) * 0.22 * (1 - reach * 0.5);
  const scatter = gaussian(random) * 0.05;

  return {
    at: [Math.cos(angle) * (reach + scatter), gaussian(random) * 0.035 * (1 - reach), Math.sin(angle) * (reach + scatter)],
    along: reach,
    group: arm,
  };
}

/** A spiral galaxy lying flat in the x–z plane, radius 1. */
export function spiral({ arms = 3, twist = 3.4, core = 0.18 }: { arms?: number; twist?: number; core?: number } = {}): Shape {
  checkWhole(arms, "spiral.arms", 1);
  checkFinite(twist, "spiral.twist");
  checkUnit(core, "spiral.core");

  return shape(SPIRAL_AREA, (count, random) =>
    Array.from({ length: count }, (_, index) =>
      index < count * core ? corePoint(arms, random) : armPoint(index % arms, arms, twist, random),
    ),
  );
}

export interface HelixOptions {
  strands?: number;
  turns?: number;
  radius?: number;
  height?: number;
  rungs?: number;
  rungShare?: number;
}

interface Helix {
  strands: number;
  rungs: number;
  radius: number;
  height: number;
  spin: number;
}

function rungPoint({ rungs, radius, height, spin, strands }: Helix, index: number, random: () => number): Sample {
  const along = rungs === 1 ? 0.5 : (index % rungs) / (rungs - 1);
  const across = random() * 2 - 1;

  return {
    at: [Math.cos(along * spin) * radius * across, (0.5 - along) * height, Math.sin(along * spin) * radius * across],
    along,
    group: strands,
  };
}

function strandPoint({ strands, radius, height, spin }: Helix, index: number, random: () => number): Sample {
  const strand = index % strands;
  const along = random();
  const angle = along * spin + (strand * TURN) / strands;
  const wobble = radius + gaussian(random) * radius * 0.045;

  return { at: [Math.cos(angle) * wobble, (0.5 - along) * height, Math.sin(angle) * wobble], along, group: strand };
}

function checkHelix({ strands, rungs, turns, radius, height, rungShare }: Required<HelixOptions>) {
  checkWhole(strands, "helix.strands", 1);
  checkWhole(rungs, "helix.rungs", 0);
  checkFinite(turns, "helix.turns");
  checkPositive(radius, "helix.radius");
  checkPositive(height, "helix.height");
  checkUnit(rungShare, "helix.rungShare");
}

/** Strands twisting round the y axis, `height` tall, joined by `rungs` cross-pieces. */
export function helix({ strands = 2, turns = 3, radius = 0.34, height = 1.75, rungs = 26, rungShare = 0.22 }: HelixOptions = {}): Shape {
  checkHelix({ strands, turns, radius, height, rungs, rungShare });

  const spin = turns * TURN;
  const strandLength = Math.hypot(spin * radius, height);
  const options: Helix = { strands, rungs, radius, height, spin };
  const area = (strands * strandLength + rungs * radius * 2) * STRAND * 2;

  return shape(area, (count, random) =>
    Array.from({ length: count }, (_, index) =>
      rungs > 0 && index < count * rungShare ? rungPoint(options, index, random) : strandPoint(options, index, random),
    ),
  );
}

function lorenzTrace(count: number): Sample[] {
  let [x, y, z] = [0.1, 0, 0];

  const advance = () => {
    [x, y, z] = [x + 10 * (y - x) * LORENZ_STEP, y + (x * (28 - z) - y) * LORENZ_STEP, z + (x * y - (8 / 3) * z) * LORENZ_STEP];
  };

  for (let warmup = 0; warmup < LORENZ_WARMUP; warmup++) advance();

  return Array.from({ length: count }, (_, index) => {
    for (let substep = 0; substep < LORENZ_SUBSTEPS; substep++) advance();

    return { at: [x / 26, (z - 25) / 24, y / 26], along: count > 1 ? index / (count - 1) : 0, group: 0 };
  });
}

/** A strange attractor, traced as one long path and scaled to about radius 1. */
export function attractor(name: "lorenz"): Shape {
  if (name !== "lorenz") throw new RangeError(`shapes: attractor knows "lorenz", got ${String(name)}`);

  return shape(1.5, lorenzTrace);
}
