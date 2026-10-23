/**
 * Keyless point matching: given two clouds of points (voxels in a shape, dots on a map, bars in
 * a chart), decide which old point travels to which new one so the change reads as one motion.
 */
import { hungarian, solve } from "./hungarian";
import { kdTree, select, type KdTree } from "./kdtree";

export interface Point3 {
  x: number;
  y: number;
  /** Optional; treated as 0 for flat data. */
  z?: number;
}

export interface PointMatches {
  /** [old index, new index], sorted by old index. */
  pairs: [number, number][];
  /** Old points with no partner: they should shrink or fade away. */
  leaving: number[];
  /** New points with no partner: they should grow or fade in. */
  arriving: number[];
}

export interface MatchPointsOptions {
  /**
   * `"nearest"` (default) pairs points to minimise the total squared distance travelled, so
   * nothing crosses the whole scene when a closer partner exists. `"order"` pairs by index.
   */
  by?: "nearest" | "order";
  /**
   * Pairs further apart than this leave and arrive instead of travelling. The pairing keeps as
   * many pairs within the limit as it can. Default: no limit.
   */
  maxDistance?: number;
}

/**
 * Up to this many cells (old points × new points), the best pairing is found exactly. Beyond it
 * the exact solver gets slow (it grows with the cube of the cloud size), so a fast approximate
 * matcher takes over. It lands within a few percent of the best total, and 10,000 points take a
 * few hundred milliseconds (run it in a Worker for clouds that big: core needs no DOM).
 */
const EXACT_LIMIT = 250_000;

/** Pieces of the cloud this small are paired exactly while halving. */
const EXACT_PIECE = 32;
/** How many neighbouring pairs each window re-pairs exactly, and how many sweeps of windows. */
const WINDOW = 32;
const WINDOW_PASSES = 2;
/** How many nearby points the nearest-first guess starts with, and the swaps look at. */
const NEIGHBOURS = 8;
/** Rounds of the nearest-first guess (the search widens 8, 16, 32, 64). */
const NEAREST_ROUNDS = 4;
/** Stop the nearest-first rounds early once a round pairs less than this share of who's left. */
const NEAREST_GIVE_UP = 0.25;
/** A ceiling on the swaps' work, in sweeps of every point. */
const SWAP_PASSES = 12;

const squaredDistance = (from: Point3, to: Point3) => (from.x - to.x) ** 2 + (from.y - to.y) ** 2 + ((from.z ?? 0) - (to.z ?? 0)) ** 2;

export function matchPoints(from: readonly Point3[], to: readonly Point3[], options: MatchPointsOptions = {}): PointMatches {
  const { by, maxDistance } = validateOptions(options);
  checkPoints(from, "a");
  checkPoints(to, "b");
  const pairs = filterDistantPairs(findPairs(from, to, by, maxDistance), from, to, maxDistance);
  return toMatchResult(pairs, from.length, to.length);
}

function validateOptions(options: MatchPointsOptions): Required<MatchPointsOptions> {
  const { by = "nearest", maxDistance = Infinity } = options;
  if (!(maxDistance > 0)) throw new RangeError(`matchPoints: maxDistance must be positive, got ${maxDistance}`);
  if (by !== "nearest" && by !== "order") throw new RangeError(`matchPoints: by must be "nearest" or "order", got ${by}`);
  return { by, maxDistance };
}

function findPairs(
  from: readonly Point3[],
  to: readonly Point3[],
  by: NonNullable<MatchPointsOptions["by"]>,
  maxDistance: number,
): [number, number][] {
  if (by === "order") {
    return pairsByOrder(from.length, to.length);
  }
  if (from.length * to.length <= EXACT_LIMIT) return pairsExactly(from, to, maxDistance);
  return approximate(from, to, maxDistance);
}

function pairsByOrder(fromLength: number, toLength: number): [number, number][] {
  return Array.from({ length: Math.min(fromLength, toLength) }, (_, index): [number, number] => [index, index]);
}

function pairsExactly(from: readonly Point3[], to: readonly Point3[], maxDistance: number): [number, number][] {
  const distanceLimit = maxDistance ** 2;
  const costs = from.map((source) => to.map((target) => Math.min(squaredDistance(source, target), distanceLimit)));
  return hungarian(costs).flatMap((targetIndex, sourceIndex): [number, number][] => (targetIndex >= 0 ? [[sourceIndex, targetIndex]] : []));
}

function filterDistantPairs(
  pairs: readonly [number, number][],
  from: readonly Point3[],
  to: readonly Point3[],
  maxDistance: number,
): [number, number][] {
  const distanceLimit = maxDistance ** 2;
  return pairs
    .filter(([sourceIndex, targetIndex]) => squaredDistance(from[sourceIndex]!, to[targetIndex]!) <= distanceLimit)
    .sort(([firstSourceIndex], [secondSourceIndex]) => firstSourceIndex - secondSourceIndex);
}

function toMatchResult(pairs: [number, number][], fromLength: number, toLength: number): PointMatches {
  const pairedFrom = new Set(pairs.map(([sourceIndex]) => sourceIndex));
  const pairedTo = new Set(pairs.map(([, targetIndex]) => targetIndex));
  return {
    pairs,
    leaving: unmatchedIndexes(fromLength, pairedFrom),
    arriving: unmatchedIndexes(toLength, pairedTo),
  };
}

function unmatchedIndexes(length: number, pairedIndexes: ReadonlySet<number>): number[] {
  return Array.from({ length }, (_, index) => index).filter((index) => !pairedIndexes.has(index));
}

function checkPoints(points: readonly Point3[], name: string): void {
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || (point.z !== undefined && !Number.isFinite(point.z))) {
      throw new RangeError(`matchPoints: ${name}[${index}] must have finite coordinates, got (${point.x}, ${point.y}, ${point.z})`);
    }
  }
}

interface PointCloudCoordinates {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly axes: readonly [Float64Array, Float64Array, Float64Array];
  readonly tree: KdTree;
}

function toCoordinateCloud(points: readonly Point3[]): PointCloudCoordinates {
  const x = Float64Array.from(points, (point) => point.x);
  const y = Float64Array.from(points, (point) => point.y);
  const z = Float64Array.from(points, (point) => point.z ?? 0);
  const axes = [x, y, z] as const;
  return { x, y, z, axes, tree: kdTree({ x, y, z, ids: allIndexes(points.length) }) };
}

function allIndexes(length: number): Int32Array {
  return Int32Array.from({ length }, (_, index) => index);
}

function cappedDistance(
  from: PointCloudCoordinates,
  to: PointCloudCoordinates,
  fromIndex: number,
  toIndex: number,
  distanceLimit: number,
): number {
  return Math.min(
    (from.x[fromIndex]! - to.x[toIndex]!) ** 2 + (from.y[fromIndex]! - to.y[toIndex]!) ** 2 + (from.z[fromIndex]! - to.z[toIndex]!) ** 2,
    distanceLimit,
  );
}

function closestIndexes(cloud: PointCloudCoordinates, otherTree: KdTree, wanted: number): Int32Array {
  const pointIds = new Int32Array(1);
  const distances = new Float64Array(1);
  const nearestDistances = new Float64Array(cloud.x.length);
  for (let index = 0; index < cloud.x.length; index++) {
    otherTree.nearest(cloud.x[index]!, cloud.y[index]!, cloud.z[index]!, 1, Infinity, pointIds, distances);
    nearestDistances[index] = distances[0]!;
  }
  return allIndexes(cloud.x.length)
    .sort((firstIndex, secondIndex) => nearestDistances[firstIndex]! - nearestDistances[secondIndex]! || firstIndex - secondIndex)
    .subarray(0, wanted);
}

/**
 * The fast matcher for big clouds.
 *
 * 1. **Same count.** When one cloud is bigger, its points furthest from the other cloud are the
 *    ones that leave, as with the exact solver.
 * 2. **Two first guesses.** Clouds that overlap (a wobble, one word becoming another) are best
 *    paired nearest-first. Clouds that move as a whole (shifted, stretched) are best paired by
 *    relative place: split both at their middle along their widest direction, pair lower half
 *    with lower half and upper with upper, and repeat down to small pieces solved exactly.
 *    Both are polished (below), and the one with the lower total wins.
 * 3. **Polish.** Single swaps: every point looks at the new points nearer to it than its
 *    partner and trades whenever the total goes down (any helpful swap involves at least one
 *    point seeing a nearer partner, so this finds them). Then overlapping windows of nearby
 *    points are re-paired exactly, which also decides who is left out, and swaps once more.
 *
 * Nothing here ever compares a point with the whole other cloud, so it stays close to
 * O(n log n) whatever the layout: 10,000 points in a few hundred milliseconds.
 */
export function approximate(a: readonly Point3[], b: readonly Point3[], maxDistance = Infinity): [number, number][] {
  const n = a.length;
  const m = b.length;
  const from = toCoordinateCloud(a);
  const to = toCoordinateCloud(b);
  const { x: ax, y: ay, z: az, axes: aAxes, tree: treeA } = from;
  const { x: bx, y: by, z: bz, axes: bAxes, tree: treeB } = to;
  const limit = maxDistance ** 2;
  const d2 = (fromIndex: number, toIndex: number) => cappedDistance(from, to, fromIndex, toIndex, limit);
  const ids = new Int32Array(Math.max(WINDOW, NEIGHBOURS));
  const ds = new Float64Array(ids.length);
  const keptA = n > m ? closestIndexes(from, treeB, m) : allIndexes(n);
  const keptB = m > n ? closestIndexes(to, treeA, n) : allIndexes(m);

  interface HalveOptions {
    ia: Int32Array;
    ib: Int32Array;
    partnerOfA: Int32Array;
    lo: number;
    hi: number;
  }

  /** Pair `ia[i]` with `ib[i]` after shuffling both so equal positions hold matching places. */
  const halve = ({ ia, ib, partnerOfA, lo, hi }: HalveOptions): void => {
    const size = hi - lo;
    if (size <= EXACT_PIECE) {
      const cost = new Float64Array(size * size);
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cost[r * size + c] = d2(ia[lo + r]!, ib[lo + c]!);
      solve({ cost, rows: size, cols: size }).forEach((targetOffset, sourceOffset) => {
        partnerOfA[ia[lo + sourceOffset]!] = ib[lo + targetOffset]!;
      });
      return;
    }
    let axis = 0;
    let widest = -1;
    for (let k = 0; k < 3; k++) {
      let min = Infinity;
      let max = -Infinity;
      for (let i = lo; i < hi; i++) {
        const u = aAxes[k]![ia[i]!]!;
        const v = bAxes[k]![ib[i]!]!;
        if (u < min) min = u;
        if (u > max) max = u;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (max - min > widest) {
        widest = max - min;
        axis = k;
      }
    }
    const mid = lo + (size >> 1);
    select({ order: ia, coordinates: aAxes[axis]!, start: lo, end: hi - 1, target: mid });
    select({ order: ib, coordinates: bAxes[axis]!, start: lo, end: hi - 1, target: mid });
    halve({ ia, ib, partnerOfA, lo, hi: mid });
    halve({ ia, ib, partnerOfA, lo: mid, hi });
  };

  /** Guess by relative place. */
  const byPlace = () => {
    const partnerOfA = new Int32Array(n).fill(-1);
    halve({ ia: Int32Array.from(keptA), ib: Int32Array.from(keptB), partnerOfA, lo: 0, hi: keptA.length });
    return partnerOfA;
  };

  /**
   * Guess nearest-first: a few rounds in which every unpaired point offers its nearest unpaired
   * partners and the closest offers are accepted, widening the search each round. Whoever is
   * still left after that is paired by place. The round limit, and giving up early when most
   * offers clash, keep a crowd fighting over the same few partners from taking long.
   */
  const byNearest = () => {
    const partnerOfA = new Int32Array(n).fill(-1);
    const takenB = new Uint8Array(m);
    let restA = keptA;
    let restB = keptB;
    for (let round = 0, k = NEIGHBOURS; round < NEAREST_ROUNDS && restA.length > 0; round++, k *= 2) {
      const tree = restB.length === m ? treeB : kdTree({ x: bx, y: by, z: bz, ids: restB });
      const want = Math.min(k, restB.length);
      const found = new Int32Array(want);
      const foundD = new Float64Array(want);
      const edgeD = new Float64Array(restA.length * want);
      const edgeA = new Int32Array(restA.length * want);
      const edgeB = new Int32Array(restA.length * want);
      let edges = 0;
      for (const i of restA) {
        const count = tree.nearest(ax[i]!, ay[i]!, az[i]!, want, Infinity, found, foundD);
        for (let c = 0; c < count; c++, edges++) {
          edgeD[edges] = foundD[c]!;
          edgeA[edges] = i;
          edgeB[edges] = found[c]!;
        }
      }
      const order = Uint32Array.from({ length: edges }, (_, e) => e).sort(
        (p, q) => edgeD[p]! - edgeD[q]! || edgeA[p]! - edgeA[q]! || edgeB[p]! - edgeB[q]!,
      );
      for (const e of order) {
        const i = edgeA[e]!;
        const j = edgeB[e]!;
        if (partnerOfA[i] !== -1 || takenB[j]) continue;
        partnerOfA[i] = j;
        takenB[j] = 1;
      }
      const before = restA.length;
      restA = restA.filter((i) => partnerOfA[i] === -1);
      restB = restB.filter((j) => !takenB[j]);
      // When most offers clash, everyone wants the same few partners: nearest-first isn't the
      // right idea here, and wider searches would only get slower. Leave the rest to placing.
      if (before - restA.length < before * NEAREST_GIVE_UP) break;
    }
    halve({ ia: Int32Array.from(restA), ib: Int32Array.from(restB), partnerOfA, lo: 0, hi: restA.length });
    return partnerOfA;
  };

  const partnersOfB = (partnerOfA: Int32Array) => {
    const partnerOfB = new Int32Array(m).fill(-1);
    for (let i = 0; i < n; i++) if (partnerOfA[i] !== -1) partnerOfB[partnerOfA[i]!] = i;
    return partnerOfB;
  };

  /** Re-pair overlapping windows of nearby pairs exactly. Each window can only lower the total. */
  const windows = (partnerOfA: Int32Array) => {
    const takenB = new Uint8Array(m);
    for (let i = 0; i < n; i++) if (partnerOfA[i] !== -1) takenB[partnerOfA[i]!] = 1;
    const freeB: number[] = [];
    for (let j = 0; j < m; j++) if (!takenB[j]) freeB.push(j);
    const treeFreeB = freeB.length > 0 ? kdTree({ x: bx, y: by, z: bz, ids: freeB }) : null;
    const extra = new Int32Array(WINDOW);
    const extraD = new Float64Array(WINDOW);
    const rows = new Int32Array(WINDOW);
    const cols = new Int32Array(WINDOW * 2);

    for (let pass = 0; pass < WINDOW_PASSES; pass++) {
      const covered = new Uint8Array(n);
      for (let s = 0; s < n; s++) {
        // Alternate the order seeds are taken in, so window edges fall in new places each pass.
        const seed = pass % 2 === 0 ? s : n - 1 - s;
        if (covered[seed] || partnerOfA[seed] === -1) continue;
        // The window: the old points nearest the seed (paired or left out), their partners, and
        // the free new points nearest the seed, so the exact solve can also choose who is left out.
        const R = treeA.nearest(ax[seed]!, ay[seed]!, az[seed]!, WINDOW, Infinity, ids, ds);
        let C = 0;
        for (let r = 0; r < R; r++) {
          rows[r] = ids[r]!;
          covered[ids[r]!] = 1;
          if (partnerOfA[ids[r]!] !== -1) cols[C++] = partnerOfA[ids[r]!]!;
        }
        const paired = C;
        if (treeFreeB) {
          const found = treeFreeB.nearest(ax[seed]!, ay[seed]!, az[seed]!, WINDOW, Infinity, extra, extraD);
          for (let c = 0; c < found; c++) if (!takenB[extra[c]!]) cols[C++] = extra[c]!;
        }
        if (paired < 2 && C === paired) continue;

        // The solver needs no more rows than columns, so solve whichever way round fits.
        const flip = R > C;
        const [h, w] = flip ? [C, R] : [R, C];
        const cost = new Float64Array(h * w);
        for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) cost[flip ? c * w + r : r * w + c] = d2(rows[r]!, cols[c]!);
        }
        // When everyone is paired, row r's partner is column r. If every row already has its
        // cheapest column, no other pairing can beat it, so skip the solve.
        if (R === paired && C === paired) {
          let optimal = true;
          for (let r = 0; r < R && optimal; r++) {
            for (let c = 0; c < C; c++) if (cost[r * w + c]! < cost[r * w + r]!) optimal = false;
          }
          if (optimal) continue;
        }
        for (let r = 0; r < R; r++) partnerOfA[rows[r]!] = -1;
        for (let c = 0; c < C; c++) takenB[cols[c]!] = 0;
        solve({ cost, rows: h, cols: w }).forEach((to, from) => {
          const [r, c] = flip ? [to, from] : [from, to];
          partnerOfA[rows[r]!] = cols[c]!;
          takenB[cols[c]!] = 1;
        });
      }
    }
    return partnerOfA;
  };

  /** Swap partners one pair at a time while that lowers the total. Also lets left-out points in. */
  const swaps = (partnerOfA: Int32Array) => {
    const partnerOfB = partnersOfB(partnerOfA);
    // A worklist of old points to check, so after the first sweep only the neighbourhoods of
    // recent swaps get looked at again. It starts with everyone.
    const queue = Int32Array.from({ length: n }, (_, i) => i);
    const queued = new Uint8Array(n).fill(1);
    let head = 0;
    let size = n;
    const push = (i: number) => {
      if (queued[i]) return;
      queued[i] = 1;
      queue[(head + size) % n] = i;
      size++;
    };
    const near = new Int32Array(NEIGHBOURS);
    const nearD = new Float64Array(NEIGHBOURS);
    // When a new point changes partner, the old points around it may now have a better swap.
    const wake = (j: number) => {
      const count = treeA.nearest(bx[j]!, by[j]!, bz[j]!, NEIGHBOURS, Infinity, near, nearD);
      for (let c = 0; c < count; c++) push(near[c]!);
    };

    // A ceiling on the work, in case rounding ever keeps it busy; it is never reached in practice.
    for (let budget = n * SWAP_PASSES; size > 0 && budget > 0; budget--) {
      const i = queue[head]!;
      head = (head + 1) % n;
      size--;
      queued[i] = 0;
      const j = partnerOfA[i]!;
      // A left-out old point (more old than new) may take over a new point whose partner is
      // further away; a paired one looks only at new points nearer than its own.
      const current = j === -1 ? Infinity : d2(i, j);
      const found = treeB.nearest(ax[i]!, ay[i]!, az[i]!, NEIGHBOURS, current, ids, ds);
      for (let c = 0; c < found; c++) {
        const other = ids[c]!;
        if (other === j) break; // Everything after this is no nearer than our own partner.
        const rival = partnerOfB[other]!;
        const gain =
          rival === -1
            ? current - d2(i, other) // A left-out new point (more new than old): just move to it.
            : j === -1
            ? d2(rival, other) - d2(i, other)
            : current + d2(rival, other) - d2(i, other) - d2(rival, j);
        // Demand a real improvement, so rounding noise can't make points trade back and forth.
        if (!(gain > 1e-9 * (Number.isFinite(current) ? current + 1 : 1))) continue;
        partnerOfA[i] = other;
        partnerOfB[other] = i;
        if (j !== -1) partnerOfB[j] = rival;
        if (rival !== -1) partnerOfA[rival] = j;
        push(i);
        if (rival !== -1) push(rival);
        wake(other);
        if (j !== -1) wake(j);
        break;
      }
    }
    return partnerOfA;
  };

  const total = (partnerOfA: Int32Array) => {
    let sum = 0;
    for (let i = 0; i < n; i++) if (partnerOfA[i] !== -1) sum += d2(i, partnerOfA[i]!);
    return sum;
  };
  const polish = (partnerOfA: Int32Array) => swaps(windows(swaps(partnerOfA)));
  const place = polish(byPlace());
  const nearest = polish(byNearest());
  const best = total(nearest) < total(place) ? nearest : place;

  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) if (best[i] !== -1) pairs.push([i, best[i]!]);
  return pairs;
}
