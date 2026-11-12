import { checkFinite, checkPositive, shape, shareOut, type Sample, type Shape, type ShapePoint, type Vec3 } from "./base";
import { curve } from "./primitives";

export interface ComposePart {
  shape: Shape;
  share?: number;
}

const PROFILE_STEPS = 256;
const SEED_RANGE = 2 ** 32;

function partSamples(part: Shape, count: number, group: number, random: () => number): Sample[] {
  const seed = Math.floor(random() * SEED_RANGE);

  return part.points(count, { seed }).map(({ x, y, z, tone }) => ({
    at: [x, -y, z],
    along: 0,
    group,
    ...(tone === undefined ? {} : { tone }),
  }));
}

function extentOn(samples: readonly Sample[], axis: number) {
  const values = samples.map((sample) => sample.at[axis]!);
  const min = values.reduce((low, value) => Math.min(low, value), Infinity);
  const max = values.reduce((high, value) => Math.max(high, value), -Infinity);

  return { axis, min, size: max - min };
}

function alongLongestSide(samples: Sample[]): Sample[] {
  const longest = [0, 1, 2].map((axis) => extentOn(samples, axis)).reduce((best, next) => (next.size > best.size ? next : best));

  return samples.map((sample) => ({
    ...sample,
    along: longest.size > 0 ? (sample.at[longest.axis]! - longest.min) / longest.size : 0,
  }));
}

export function compose(parts: readonly ComposePart[]): Shape {
  if (parts.length === 0) throw new RangeError("shapes: compose needs at least one part");

  parts.forEach(({ share }, index) => {
    if (share !== undefined) checkPositive(share, `compose[${index}].share`);
  });

  const weights = parts.map(({ shape: part, share }) => share ?? part.area);
  const area = weights.reduce((sum, weight) => sum + weight, 0);

  return shape(area, (count, random) => {
    const counts = shareOut(count, weights);
    const samples = parts.flatMap(({ shape: part }, index) => partSamples(part, counts[index]!, index, random));

    return alongLongestSide(samples);
  });
}

function checkProfile(profile: readonly (readonly [number, number])[]) {
  if (profile.length < 2) throw new RangeError(`shapes: revolve needs at least 2 profile points, got ${profile.length}`);

  profile.forEach(([radius, height], index) => {
    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError(`shapes: revolve.profile[${index}] radius must be 0 or more, got ${radius}`);
    }

    checkFinite(height, `revolve.profile[${index}] height`);
  });
}

function surfaceWeights(steps: readonly ShapePoint[]): number[] {
  const running: number[] = [];
  let surface = 0;

  for (let index = 1; index < steps.length; index++) {
    const [from, to] = [steps[index - 1]!, steps[index]!];

    surface += Math.PI * (from.x + to.x) * Math.hypot(to.x - from.x, to.y - from.y);
    running.push(surface);
  }

  return running;
}

function stepAt(running: readonly number[], pick: number): number {
  let low = 0;
  let high = running.length - 1;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (running[middle]! < pick) low = middle + 1;
    else high = middle;
  }

  return low;
}

function revolvedPoint(steps: readonly ShapePoint[], running: readonly number[], surface: number, random: () => number): Sample {
  const index = stepAt(running, random() * surface);
  const blend = random();
  const [from, to] = [steps[index]!, steps[index + 1]!];
  const radius = from.x + (to.x - from.x) * blend;
  const height = -(from.y + (to.y - from.y) * blend);
  const angle = random() * Math.PI * 2;

  return {
    at: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
    along: from.order! + (to.order! - from.order!) * blend,
    group: 0,
  };
}

export function revolve({ profile }: { profile: readonly (readonly [number, number])[] }): Shape {
  checkProfile(profile);

  const side = curve({ through: profile.map(([radius, height]): Vec3 => [radius, height, 0]) });
  const steps = side.points(PROFILE_STEPS + 1, { seed: 1 }).sort((a, b) => a.order! - b.order!);
  const running = surfaceWeights(steps);
  const surface = running.at(-1) ?? 0;

  return shape(surface, (count, random) => Array.from({ length: count }, () => revolvedPoint(steps, running, surface, random)));
}
