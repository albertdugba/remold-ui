/**
 * A cloud of points that rebuilds itself into each new shape.
 *
 * Give it a new set of points and every old point is paired with a nearby new spot
 * (`matchPoints`), then springs there from wherever it is, at whatever speed it's going. Spare
 * old points shrink away; new ones grow in. Interrupt it mid-flight and nothing jumps.
 *
 * Each point can carry a `tone` (any number, say 0 to 1), which springs along with it: map it to a
 * colour to recolour dots as they move, for categories, colourways or heat.
 *
 * Pass `scatter` to `to` and the change has a middle: every point first drifts out into a loose,
 * glittering cloud around both shapes, holds there a moment, then gathers into the new shape, each
 * point setting off at a slightly different time.
 *
 * It only does the motion. Draw `data` however you like: a 2D canvas (`@remold-ui/canvas`'s
 * `particles`), WebGL, SVG, or a terminal.
 */
import type { Point } from "../interpolate";
import { matchPoints, type MatchPointsOptions, type PointMatches } from "../match/points";
import type { SpringConfig } from "../motion/spring";
import { values } from "../motion/values";

/** A point in a cloud, with an optional tone that springs along with it (default 0). */
export interface CloudPoint extends Point {
  tone?: number;
}

export interface PointCloudOptions {
  /** Default `{ duration: 0.9, bounce: 0.2 }`: a little settle, like dots finding their place. */
  spring?: SpringConfig;
  /** How close counts as arrived, in your units. Default 0.05 (a twentieth of a pixel). */
  precision?: number;
  /** Where arriving points start, relative to where they land. Default `{ x: 0, y: 12 }`: a short rise. */
  enter?: { x?: number; y?: number };
  /** Passed to `matchPoints`, for example `{ maxDistance }`. */
  match?: MatchPointsOptions;
}

/** How a `scatter` change spreads out before it gathers. */
export interface PointCloudScatter {
  /** How far the cloud spreads, as a multiple of the area both shapes cover. Default 1.35. */
  spread?: number;
  /** Seconds the points stay spread out before they start to gather. Default 0.35. */
  hold?: number;
  /** Up to how many seconds later some points set off than others, so they gather like a breath. Default 0.35. */
  stagger?: number;
  /** Seeds where each point drifts to, so the same change spreads the same way. Defaults to a new seed each change. */
  seed?: number;
}

export interface PointCloud {
  /**
   * Every point being drawn as `[x, y, size, tone, x, y, size, tone, …]` (`STRIDE` numbers per
   * point), with size from 0 (gone) to 1. A live view: read it each frame, don't write to it.
   * Its length changes after `to` and as leaving points finish, so read `length` alongside.
   */
  readonly data: Float64Array;
  /** How many points are being drawn, including ones still shrinking away. */
  readonly length: number;
  /** How many points make up the current shape. They come first in `data`; leaving ones follow. */
  readonly live: number;
  /** True when nothing is moving. */
  readonly settled: boolean;
  /**
   * Where the current shape's points are heading, as `{ x, y }`. Pairing is done from here, so
   * a caller that works out `matches` elsewhere (in a worker, say) should start from this.
   */
  heading(): { x: number; y: number }[];
  /**
   * Rebuild into `points`. Returns the pairing it used. `instant` jumps there (for reduced
   * motion). `matches`, from `matchPoints(cloud.heading(), points)`, skips the pairing here.
   */
  to(
    points: readonly CloudPoint[],
    options?: { instant?: boolean; matches?: PointMatches; scatter?: boolean | PointCloudScatter },
  ): PointMatches;
  /** Advance by `dt` seconds. Returns true while anything is moving. */
  step(dt: number): boolean;
}

/** Matches made elsewhere must fit: every index in range and used once. */
function checkMatches(m: PointMatches, from: number, to: number): void {
  const seenA = new Uint8Array(from);
  const seenB = new Uint8Array(to);
  const fail = () => {
    throw new RangeError(`pointCloud: matches don't fit ${from} current points and ${to} new ones; pair from cloud.heading()`);
  };
  for (const [i, j] of m.pairs) {
    if (!(i >= 0 && i < from && j >= 0 && j < to) || seenA[i] || seenB[j]) fail();
    seenA[i] = 1;
    seenB[j] = 1;
  }
  for (const i of m.leaving) {
    if (!(i >= 0 && i < from) || seenA[i]) fail();
    seenA[i] = 1;
  }
  if (seenA.some((x) => !x)) fail();
}

/** `target` with its first `live` points replaced by where a scatter is taking them. */
function withGoal(target: Float64Array, goal: Float64Array, live: number): Float64Array {
  const out = target.slice();
  out.set(goal.subarray(0, live * STRIDE));
  return out;
}

/** How many numbers each point takes in `PointCloud.data`: x, y, size, tone. */
export const STRIDE = 4;

const toneOf = (p: CloudPoint, where: string) => {
  const tone = p.tone ?? 0;
  if (!Number.isFinite(tone)) throw new RangeError(`pointCloud: ${where} tone must be a finite number, got ${tone}`);
  return tone;
};

/** A small seeded random generator (mulberry32), so a seeded scatter spreads the same way every time. */
function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function scatterSettings(scatter: true | PointCloudScatter) {
  const given = scatter === true ? {} : scatter;
  const spread = given.spread ?? 1.35;
  const hold = given.hold ?? 0.35;
  const stagger = given.stagger ?? 0.35;
  if (!(spread > 0) || !Number.isFinite(spread)) throw new RangeError(`pointCloud: scatter.spread must be a positive number, got ${spread}`);
  if (!(hold >= 0) || !Number.isFinite(hold)) throw new RangeError(`pointCloud: scatter.hold must be zero or more seconds, got ${hold}`);
  if (!(stagger >= 0) || !Number.isFinite(stagger)) throw new RangeError(`pointCloud: scatter.stagger must be zero or more seconds, got ${stagger}`);
  if (given.seed !== undefined && !Number.isFinite(given.seed)) throw new RangeError(`pointCloud: scatter.seed must be a finite number, got ${given.seed}`);
  return { spread, hold, stagger, seed: given.seed };
}

/** Create a cloud, starting at rest at `initial`. */
export function pointCloud(initial: readonly CloudPoint[] = [], options: PointCloudOptions = {}): PointCloud {
  const enterX = options.enter?.x ?? 0;
  const enterY = options.enter?.y ?? 12;
  if (!Number.isFinite(enterX) || !Number.isFinite(enterY)) {
    throw new RangeError(`pointCloud: enter must be finite numbers, got (${enterX}, ${enterY})`);
  }
  const start = new Float64Array(initial.length * STRIDE);
  initial.forEach((p, i) => {
    start[i * STRIDE] = p.x;
    start[i * STRIDE + 1] = p.y;
    start[i * STRIDE + 2] = 1;
    start[i * STRIDE + 3] = toneOf(p, `initial[${i}]`);
  });
  const batch = values(start, {
    spring: options.spring ?? { duration: 0.9, bounce: 0.2 },
    precision: options.precision ?? 0.05,
    stride: STRIDE,
  });
  let live = initial.length;
  let changes = 0;

  /**
   * A scatter in progress: where each current point finally belongs, and when (in seconds since the
   * change) it sets off there. A point already sent has a release of -1.
   */
  let gather: { goal: Float64Array; release: Float64Array; elapsed: number; left: number } | null = null;

  /** Drop leaving points that have finished shrinking. */
  const sweep = () => {
    const items = batch.length / STRIDE;
    if (items === live) return;
    const keep: number[] = [];
    for (let i = 0; i < items; i++) {
      if (i < live || !batch.isSettled(i * STRIDE + 2)) keep.push(i);
    }
    if (keep.length < items) batch.remap(keep);
  };

  const heading = () => {
    // While points are spread out, they're still heading for the shape, not for the cloud.
    const target = gather ? gather.goal : batch.target;
    return Array.from({ length: live }, (_, i) => ({ x: target[i * STRIDE]!, y: target[i * STRIDE + 1]! }));
  };

  return {
    get data() {
      return batch.current;
    },
    get length() {
      return batch.length / STRIDE;
    },
    get live() {
      return live;
    },
    get settled() {
      return batch.settled && !gather;
    },
    heading,
    to(points, { instant = false, matches: given, scatter } = {}) {
      const items = batch.length / STRIDE;
      // Pair and shrink from where things are really heading, even mid-scatter.
      const target = gather ? withGoal(batch.target, gather.goal, live) : batch.target;
      const spreadOut = scatter ? scatterSettings(scatter) : null;
      changes++;
      // Pair from where the current points are heading, so a quick second change pairs with
      // the shape the viewer expects rather than wherever the dots happen to be mid-flight.
      const matches = given ?? matchPoints(heading(), points, options.match);
      if (given) checkMatches(given, live, points.length);
      // Paired from the shape a scatter in progress was heading for; now this change takes over.
      gather = null;

      const partner = new Int32Array(points.length).fill(-1);
      for (const [i, j] of matches.pairs) partner[j] = i;
      const stillLeaving = Array.from({ length: items - live }, (_, k) => live + k);
      const sources = [...partner, ...matches.leaving, ...stillLeaving];

      // Where arriving points start (only those entries are used), and where everyone heads.
      const fill = new Float64Array(sources.length * STRIDE);
      const goal = new Float64Array(sources.length * STRIDE);
      points.forEach((p, j) => {
        const tone = toneOf(p, `points[${j}]`);
        fill[j * STRIDE] = p.x + enterX;
        fill[j * STRIDE + 1] = p.y + enterY;
        // New points arrive already in their colour.
        fill[j * STRIDE + 3] = tone;
        goal[j * STRIDE] = p.x;
        goal[j * STRIDE + 1] = p.y;
        goal[j * STRIDE + 2] = 1;
        goal[j * STRIDE + 3] = tone;
      });
      for (let k = points.length; k < sources.length; k++) {
        // Leaving points shrink where they're heading, keeping their colour.
        const old = sources[k]!;
        goal[k * STRIDE] = target[old * STRIDE]!;
        goal[k * STRIDE + 1] = target[old * STRIDE + 1]!;
        goal[k * STRIDE + 3] = target[old * STRIDE + 3]!;
      }

      if (spreadOut && !instant && sources.length > 0) {
        // The cloud covers where the points are now and where they're going, spread a little wider.
        const current = batch.current;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const include = (x: number, y: number) => {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        };
        for (let i = 0; i < items; i++) include(current[i * STRIDE]!, current[i * STRIDE + 1]!);
        for (let j = 0; j < points.length; j++) include(goal[j * STRIDE]!, goal[j * STRIDE + 1]!);
        const centreX = (minX + maxX) / 2;
        const centreY = (minY + maxY) / 2;
        const reachX = Math.max(((maxX - minX) / 2) * spreadOut.spread, 1);
        const reachY = Math.max(((maxY - minY) / 2) * spreadOut.spread, 1);
        const random = seeded(spreadOut.seed ?? changes * 2654435761);

        // Each point drifts to a random spot in the cloud (evenly over its area), at a random size,
        // which is what makes it glitter. Arriving points appear there; leaving points fade there.
        const spread = new Float64Array(sources.length * STRIDE);
        for (let k = 0; k < sources.length; k++) {
          const angle = random() * Math.PI * 2;
          const distance = Math.sqrt(random());
          const x = centreX + Math.cos(angle) * reachX * distance;
          const y = centreY + Math.sin(angle) * reachY * distance;
          const arriving = k < points.length;
          spread[k * STRIDE] = x;
          spread[k * STRIDE + 1] = y;
          spread[k * STRIDE + 2] = arriving ? 0.35 + 0.65 * random() : 0;
          spread[k * STRIDE + 3] = goal[k * STRIDE + 3]!;
          if (arriving && partner[k] === -1) {
            fill[k * STRIDE] = x;
            fill[k * STRIDE + 1] = y;
          }
        }
        const release = new Float64Array(points.length);
        for (let j = 0; j < points.length; j++) release[j] = spreadOut.hold + spreadOut.stagger * random();

        batch.remap(sources, fill);
        live = points.length;
        batch.toAll(spread);
        gather = { goal, release, elapsed: 0, left: points.length };
        return matches;
      }

      batch.remap(sources, fill);
      live = points.length;
      if (instant) {
        batch.setAll(goal);
        sweep();
      } else {
        batch.toAll(goal);
      }
      return matches;
    },
    step(dt) {
      let moving = batch.step(dt);
      if (gather) {
        // Send each spread-out point on to its place in the shape once its moment comes.
        const scatter = gather;
        scatter.elapsed += dt;
        for (let j = 0; j < live; j++) {
          const at = scatter.release[j]!;
          if (at < 0 || scatter.elapsed < at) continue;
          for (let e = 0; e < STRIDE; e++) batch.to(j * STRIDE + e, scatter.goal[j * STRIDE + e]!);
          scatter.release[j] = -1;
          scatter.left--;
        }
        if (scatter.left === 0) gather = null;
        moving = true;
      }
      sweep();
      return moving;
    },
  };
}
