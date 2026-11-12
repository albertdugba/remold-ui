import type { Point } from "../interpolate";
import { matchPoints, type MatchPointsOptions, type PointMatches } from "../match/points";
import type { SpringConfig } from "../motion/spring";
import { values, type AnimatedValues } from "../motion/values";

/** A point in a cloud, with an optional tone and depth that spring along with it (both default 0). */
export interface CloudPoint extends Point {
  tone?: number;
  /** Depth, in the same units as `x` and `y`. */
  z?: number;
}

export interface PointCloudOptions {
  /** Default `{ duration: 0.9, bounce: 0.2 }`: a little settle, like dots finding their place. */
  spring?: SpringConfig;
  /** How close counts as arrived, in your units. */
  precision?: number;
  /** Where arriving points start, relative to where they land. */
  enter?: { x?: number; y?: number; z?: number };
  /** Passed to `matchPoints`, for example `{ maxDistance }`. */
  match?: MatchPointsOptions;
}

/** How a `scatter` change spreads out before it gathers. */
export interface PointCloudScatter {
  /** How far the cloud spreads, as a multiple of the area both shapes cover. */
  spread?: number;
  /** Seconds the points stay spread out before they start to gather. */
  hold?: number;
  /** Up to how many seconds later some points set off than others, so they gather like a breath. */
  stagger?: number;
  /** Seeds where each point drifts to, so the same change spreads the same way. */
  seed?: number;
}

export interface CloudToOptions {
  instant?: boolean;
  matches?: PointMatches;
  scatter?: boolean | PointCloudScatter;
}

export interface PointCloud {
  /** Every point being drawn as `[x, y, size, tone, z, x, y, size, tone, z, …]`. */
  readonly data: Float64Array;
  /** How many points are being drawn, including ones still shrinking away. */
  readonly length: number;
  /** How many points make up the current shape. */
  readonly live: number;
  /** True when nothing is moving. */
  readonly settled: boolean;
  /** Where the current shape's points are heading, as `{ x, y, z }`. */
  heading(): { x: number; y: number; z: number }[];
  /** Rebuild into `points`. */
  to(points: readonly CloudPoint[], options?: CloudToOptions): PointMatches;
  /** Advance by `dt` seconds. */
  step(dt: number): boolean;
}

/** How many numbers each point takes in `PointCloud.data`: x, y, size, tone, z. */
export const STRIDE = 5;

const X = 0;
const Y = 1;
const SIZE = 2;
const TONE = 3;
const Z = 4;
const UNPAIRED = -1;
const RELEASED = -1;
const SEED_STEP = 2654435761;
const ARRIVING_MIN_SIZE = 0.35;

const DEFAULT_SPRING: SpringConfig = { duration: 0.9, bounce: 0.2 };
const DEFAULT_PRECISION = 0.05;
const DEFAULT_ENTER = { x: 0, y: 12, z: 0 };
const DEFAULT_SCATTER = { spread: 1.35, hold: 0.35, stagger: 0.35 };

interface Enter {
  x: number;
  y: number;
  z: number;
}

interface Scatter {
  spread: number;
  hold: number;
  stagger: number;
  seed: number | undefined;
}

interface Gather {
  goal: Float64Array;
  release: Float64Array;
  elapsed: number;
  left: number;
}

interface Box {
  centre: [number, number, number];
  reach: [number, number, number];
}

function finiteField(value: number | undefined, label: string): number {
  const resolved = value ?? 0;

  if (!Number.isFinite(resolved)) throw new RangeError(`pointCloud: ${label} must be a finite number, got ${resolved}`);

  return resolved;
}

const toneOf = (point: CloudPoint, where: string) => finiteField(point.tone, `${where} tone`);

const depthOf = (point: CloudPoint, where: string) => finiteField(point.z, `${where} z`);

function resolveEnter(enter: PointCloudOptions["enter"]): Enter {
  const resolved = {
    x: enter?.x ?? DEFAULT_ENTER.x,
    y: enter?.y ?? DEFAULT_ENTER.y,
    z: enter?.z ?? DEFAULT_ENTER.z,
  };

  if (!Number.isFinite(resolved.x) || !Number.isFinite(resolved.y) || !Number.isFinite(resolved.z)) {
    throw new RangeError(`pointCloud: enter must be finite numbers, got (${resolved.x}, ${resolved.y}, ${resolved.z})`);
  }

  return resolved;
}

function checkScatterNumber(value: number, name: string, allowZero: boolean) {
  const valid = Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);

  if (!valid) {
    const expected = allowZero ? "zero or more seconds" : "a positive number";

    throw new RangeError(`pointCloud: scatter.${name} must be ${expected}, got ${value}`);
  }
}

function resolveScatter(scatter: true | PointCloudScatter): Scatter {
  const given = scatter === true ? {} : scatter;
  const spread = given.spread ?? DEFAULT_SCATTER.spread;
  const hold = given.hold ?? DEFAULT_SCATTER.hold;
  const stagger = given.stagger ?? DEFAULT_SCATTER.stagger;

  checkScatterNumber(spread, "spread", false);
  checkScatterNumber(hold, "hold", true);
  checkScatterNumber(stagger, "stagger", true);

  if (given.seed !== undefined && !Number.isFinite(given.seed)) {
    throw new RangeError(`pointCloud: scatter.seed must be a finite number, got ${given.seed}`);
  }

  return { spread, hold, stagger, seed: given.seed };
}

function checkMatches({ pairs, leaving }: PointMatches, from: number, to: number): void {
  const seenFrom = new Uint8Array(from);
  const seenTo = new Uint8Array(to);
  const fail = () => {
    throw new RangeError(`pointCloud: matches don't fit ${from} current points and ${to} new ones; pair from cloud.heading()`);
  };

  for (const [source, target] of pairs) {
    if (!(source >= 0 && source < from && target >= 0 && target < to) || seenFrom[source] || seenTo[target]) fail();

    seenFrom[source] = 1;
    seenTo[target] = 1;
  }

  for (const source of leaving) {
    if (!(source >= 0 && source < from) || seenFrom[source]) fail();

    seenFrom[source] = 1;
  }

  if (seenFrom.some((seen) => !seen)) fail();
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);

    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function packInitial(initial: readonly CloudPoint[]): Float64Array {
  const packed = new Float64Array(initial.length * STRIDE);

  initial.forEach((point, index) => {
    packed.set([point.x, point.y, 1, toneOf(point, `initial[${index}]`), depthOf(point, `initial[${index}]`)], index * STRIDE);
  });

  return packed;
}

function withGoal(target: Float64Array, goal: Float64Array, live: number): Float64Array {
  const merged = target.slice();

  merged.set(goal.subarray(0, live * STRIDE));

  return merged;
}

function partnersOf(matches: PointMatches, count: number): Int32Array {
  const partner = new Int32Array(count).fill(UNPAIRED);

  for (const [source, target] of matches.pairs) partner[target] = source;

  return partner;
}

function sourcesFor(partner: Int32Array, matches: PointMatches, live: number, items: number): number[] {
  const stillLeaving = Array.from({ length: items - live }, (_, offset) => live + offset);

  return [...partner, ...matches.leaving, ...stillLeaving];
}

function placements(points: readonly CloudPoint[], sources: readonly number[], target: Float64Array, enter: Enter) {
  const fill = new Float64Array(sources.length * STRIDE);
  const goal = new Float64Array(sources.length * STRIDE);

  points.forEach((point, index) => {
    const tone = toneOf(point, `points[${index}]`);
    const z = depthOf(point, `points[${index}]`);

    fill.set([point.x + enter.x, point.y + enter.y, 0, tone, z + enter.z], index * STRIDE);
    goal.set([point.x, point.y, 1, tone, z], index * STRIDE);
  });

  for (let slot = points.length; slot < sources.length; slot++) {
    const old = sources[slot]! * STRIDE;

    goal.set([target[old + X]!, target[old + Y]!, 0, target[old + TONE]!, target[old + Z]!], slot * STRIDE);
  }

  return { fill, goal };
}

function scatterBox(current: Float64Array, items: number, goal: Float64Array, arriving: number, spread: number): Box {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  const include = (values: Float64Array, slot: number) => {
    [X, Y, Z].forEach((field, axis) => {
      const value = values[slot * STRIDE + field]!;

      if (value < min[axis]!) min[axis] = value;
      if (value > max[axis]!) max[axis] = value;
    });
  };

  for (let slot = 0; slot < items; slot++) include(current, slot);

  for (let slot = 0; slot < arriving; slot++) include(goal, slot);

  const half = (axis: number) => ((max[axis]! - min[axis]!) / 2) * spread;

  return {
    centre: [(min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2],
    reach: [Math.max(half(0), 1), Math.max(half(1), 1), half(2)],
  };
}

function scatterLayout(box: Box, goal: Float64Array, fill: Float64Array, partner: Int32Array, slots: number, random: () => number) {
  const spread = new Float64Array(slots * STRIDE);
  const [centreX, centreY, centreZ] = box.centre;
  const [reachX, reachY, reachZ] = box.reach;

  for (let slot = 0; slot < slots; slot++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());
    const x = centreX + Math.cos(angle) * reachX * distance;
    const y = centreY + Math.sin(angle) * reachY * distance;
    const arriving = slot < partner.length;
    const size = arriving ? ARRIVING_MIN_SIZE + (1 - ARRIVING_MIN_SIZE) * random() : 0;
    const z = reachZ > 0 ? centreZ + (random() * 2 - 1) * reachZ : centreZ;

    spread.set([x, y, size, goal[slot * STRIDE + TONE]!, z], slot * STRIDE);

    if (arriving && partner[slot] === UNPAIRED) {
      fill[slot * STRIDE + X] = x;
      fill[slot * STRIDE + Y] = y;
      fill[slot * STRIDE + Z] = z;
    }
  }

  return spread;
}

const releaseTimes = (count: number, scatter: Scatter, random: () => number) =>
  Float64Array.from({ length: count }, () => scatter.hold + scatter.stagger * random());

function releaseDue(batch: AnimatedValues, gather: Gather, live: number) {
  for (let slot = 0; slot < live; slot++) {
    const at = gather.release[slot]!;

    if (at < 0 || gather.elapsed < at) continue;

    for (let field = 0; field < STRIDE; field++) batch.to(slot * STRIDE + field, gather.goal[slot * STRIDE + field]!);

    gather.release[slot] = RELEASED;
    gather.left--;
  }
}

/** Create a cloud, starting at rest at `initial`. */
export function pointCloud(initial: readonly CloudPoint[] = [], options: PointCloudOptions = {}): PointCloud {
  const enter = resolveEnter(options.enter);
  const batch = values(packInitial(initial), {
    spring: options.spring ?? DEFAULT_SPRING,
    precision: options.precision ?? DEFAULT_PRECISION,
    stride: STRIDE,
  });

  let live = initial.length;
  let changes = 0;
  let gather: Gather | null = null;

  const items = () => batch.length / STRIDE;

  const sweep = () => {
    if (items() === live) return;

    const keep = Array.from({ length: items() }, (_, slot) => slot).filter(
      (slot) => slot < live || !batch.isSettled(slot * STRIDE + SIZE),
    );

    if (keep.length < items()) batch.remap(keep);
  };

  const heading = () => {
    const target = gather ? gather.goal : batch.target;

    return Array.from({ length: live }, (_, slot) => ({
      x: target[slot * STRIDE + X]!,
      y: target[slot * STRIDE + Y]!,
      z: target[slot * STRIDE + Z]!,
    }));
  };

  const startScatter = (scatter: Scatter, plan: ReturnType<typeof placements>, partner: Int32Array, sources: number[]) => {
    const random = seeded(scatter.seed ?? changes * SEED_STEP);
    const box = scatterBox(batch.current, items(), plan.goal, partner.length, scatter.spread);
    const spread = scatterLayout(box, plan.goal, plan.fill, partner, sources.length, random);
    const release = releaseTimes(partner.length, scatter, random);

    batch.remap(sources, plan.fill);
    live = partner.length;
    batch.toAll(spread);
    gather = { goal: plan.goal, release, elapsed: 0, left: partner.length };
  };

  const settleInto = (plan: ReturnType<typeof placements>, sources: number[], count: number, instant: boolean) => {
    batch.remap(sources, plan.fill);
    live = count;

    if (!instant) {
      batch.toAll(plan.goal);
      return;
    }

    batch.setAll(plan.goal);
    sweep();
  };

  return {
    get data() {
      return batch.current;
    },

    get length() {
      return items();
    },

    get live() {
      return live;
    },

    get settled() {
      return batch.settled && !gather;
    },

    heading,

    to(points, { instant = false, matches: given, scatter } = {}) {
      const target = gather ? withGoal(batch.target, gather.goal, live) : batch.target;
      const spreadOut = scatter ? resolveScatter(scatter) : null;

      changes++;

      const matches = given ?? matchPoints(heading(), points, options.match);

      if (given) checkMatches(given, live, points.length);

      gather = null;

      const partner = partnersOf(matches, points.length);
      const sources = sourcesFor(partner, matches, live, items());
      const plan = placements(points, sources, target, enter);

      if (spreadOut && !instant && sources.length > 0) startScatter(spreadOut, plan, partner, sources);
      else settleInto(plan, sources, points.length, instant);

      return matches;
    },

    step(dt) {
      const moving = batch.step(dt);

      if (!gather) {
        sweep();
        return moving;
      }

      gather.elapsed += dt;
      releaseDue(batch, gather, live);

      if (gather.left === 0) gather = null;

      sweep();

      return true;
    },
  };
}
