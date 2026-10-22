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
  to(points: readonly CloudPoint[], options?: { instant?: boolean; matches?: PointMatches }): PointMatches;
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

/** How many numbers each point takes in `PointCloud.data`: x, y, size, tone. */
export const STRIDE = 4;

const toneOf = (p: CloudPoint, where: string) => {
  const tone = p.tone ?? 0;
  if (!Number.isFinite(tone)) throw new RangeError(`pointCloud: ${where} tone must be a finite number, got ${tone}`);
  return tone;
};

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
    const target = batch.target;
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
      return batch.settled;
    },
    heading,
    to(points, { instant = false, matches: given } = {}) {
      const items = batch.length / STRIDE;
      const target = batch.target;
      // Pair from where the current points are heading, so a quick second change pairs with
      // the shape the viewer expects rather than wherever the dots happen to be mid-flight.
      const matches = given ?? matchPoints(heading(), points, options.match);
      if (given) checkMatches(given, live, points.length);

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
      const moving = batch.step(dt);
      sweep();
      return moving;
    },
  };
}
