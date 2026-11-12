import { hungarian, solve } from "./hungarian";
import { kdTree, select, type KdTree } from "./kdtree";

export interface Point3 {
  x: number;
  y: number;
  z?: number;
}

export interface PointMatches {
  pairs: [number, number][];
  leaving: number[];
  arriving: number[];
}

export interface MatchPointsOptions {
  by?: "nearest" | "order";
  maxDistance?: number;
}

type Pair = [number, number];

interface Cloud {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  axes: readonly [Float64Array, Float64Array, Float64Array];
  tree: KdTree;
}

interface Matcher {
  from: Cloud;
  to: Cloud;
  fromCount: number;
  toCount: number;
  distance: (fromIndex: number, toIndex: number) => number;
  ids: Int32Array;
  distances: Float64Array;
}

const EXACT_LIMIT = 250_000;
const EXACT_PIECE = 32;
const WINDOW = 32;
const WINDOW_PASSES = 2;
const NEIGHBOURS = 8;
const NEAREST_ROUNDS = 4;
const NEAREST_GIVE_UP = 0.25;
const SWAP_PASSES = 12;
const SWAP_TOLERANCE = 1e-9;
const UNPAIRED = -1;

const squaredDistance = (from: Point3, to: Point3) =>
  (from.x - to.x) ** 2 + (from.y - to.y) ** 2 + ((from.z ?? 0) - (to.z ?? 0)) ** 2;

const allIndexes = (length: number) => Int32Array.from({ length }, (_, index) => index);

const unmatched = (length: number, paired: ReadonlySet<number>) =>
  Array.from({ length }, (_, index) => index).filter((index) => !paired.has(index));

function validateOptions({ by = "nearest", maxDistance = Infinity }: MatchPointsOptions): Required<MatchPointsOptions> {
  if (!(maxDistance > 0)) throw new RangeError(`matchPoints: maxDistance must be positive, got ${maxDistance}`);

  if (by !== "nearest" && by !== "order") throw new RangeError(`matchPoints: by must be "nearest" or "order", got ${by}`);

  return { by, maxDistance };
}

function checkPoints(points: readonly Point3[], name: string): void {
  points.forEach((point, index) => {
    const finite = Number.isFinite(point.x) && Number.isFinite(point.y) && (point.z === undefined || Number.isFinite(point.z));

    if (!finite) {
      throw new RangeError(`matchPoints: ${name}[${index}] must have finite coordinates, got (${point.x}, ${point.y}, ${point.z})`);
    }
  });
}

const pairsByOrder = (fromLength: number, toLength: number) =>
  Array.from({ length: Math.min(fromLength, toLength) }, (_, index): Pair => [index, index]);

function pairsExactly(from: readonly Point3[], to: readonly Point3[], maxDistance: number): Pair[] {
  const limit = maxDistance ** 2;
  const costs = from.map((source) => to.map((target) => Math.min(squaredDistance(source, target), limit)));

  return hungarian(costs).flatMap((target, source): Pair[] => (target >= 0 ? [[source, target]] : []));
}

function findPairs(from: readonly Point3[], to: readonly Point3[], by: "nearest" | "order", maxDistance: number): Pair[] {
  if (by === "order") return pairsByOrder(from.length, to.length);

  if (from.length * to.length <= EXACT_LIMIT) return pairsExactly(from, to, maxDistance);

  return approximate(from, to, maxDistance);
}

function withinReach(pairs: readonly Pair[], from: readonly Point3[], to: readonly Point3[], maxDistance: number): Pair[] {
  const limit = maxDistance ** 2;

  return pairs
    .filter(([source, target]) => squaredDistance(from[source]!, to[target]!) <= limit)
    .sort(([first], [second]) => first - second);
}

export function matchPoints(from: readonly Point3[], to: readonly Point3[], options: MatchPointsOptions = {}): PointMatches {
  const { by, maxDistance } = validateOptions(options);

  checkPoints(from, "a");
  checkPoints(to, "b");

  const pairs = withinReach(findPairs(from, to, by, maxDistance), from, to, maxDistance);

  return {
    pairs,
    leaving: unmatched(from.length, new Set(pairs.map(([source]) => source))),
    arriving: unmatched(to.length, new Set(pairs.map(([, target]) => target))),
  };
}

function toCloud(points: readonly Point3[]): Cloud {
  const x = Float64Array.from(points, (point) => point.x);
  const y = Float64Array.from(points, (point) => point.y);
  const z = Float64Array.from(points, (point) => point.z ?? 0);

  return { x, y, z, axes: [x, y, z], tree: kdTree({ x, y, z, ids: allIndexes(points.length) }) };
}

function closestToOther(cloud: Cloud, other: KdTree, wanted: number): Int32Array {
  const id = new Int32Array(1);
  const distance = new Float64Array(1);

  const nearest = Float64Array.from(cloud.x, (_, index) => {
    other.nearest(cloud.x[index]!, cloud.y[index]!, cloud.z[index]!, 1, Infinity, id, distance);

    return distance[0]!;
  });

  return allIndexes(cloud.x.length)
    .sort((first, second) => nearest[first]! - nearest[second]! || first - second)
    .subarray(0, wanted);
}

function createMatcher(from: Cloud, to: Cloud, maxDistance: number): Matcher {
  const limit = maxDistance ** 2;
  const scratch = Math.max(WINDOW, NEIGHBOURS);

  return {
    from,
    to,
    fromCount: from.x.length,
    toCount: to.x.length,
    ids: new Int32Array(scratch),
    distances: new Float64Array(scratch),
    distance: (source, target) =>
      Math.min(
        (from.x[source]! - to.x[target]!) ** 2 + (from.y[source]! - to.y[target]!) ** 2 + (from.z[source]! - to.z[target]!) ** 2,
        limit,
      ),
  };
}

const nearestIn = (tree: KdTree, cloud: Cloud, index: number, count: number, reach: number, ids: Int32Array, distances: Float64Array) =>
  tree.nearest(cloud.x[index]!, cloud.y[index]!, cloud.z[index]!, count, reach, ids, distances);

function extentOnAxis(matcher: Matcher, axis: number, fromOrder: Int32Array, toOrder: Int32Array, start: number, end: number): number {
  const fromValues = matcher.from.axes[axis]!;
  const toValues = matcher.to.axes[axis]!;
  let min = Infinity;
  let max = -Infinity;

  for (let index = start; index < end; index++) {
    const fromValue = fromValues[fromOrder[index]!]!;
    const toValue = toValues[toOrder[index]!]!;

    min = Math.min(min, fromValue, toValue);
    max = Math.max(max, fromValue, toValue);
  }

  return max - min;
}

function widestAxis(matcher: Matcher, fromOrder: Int32Array, toOrder: Int32Array, start: number, end: number): number {
  const extents = [0, 1, 2].map((axis) => extentOnAxis(matcher, axis, fromOrder, toOrder, start, end));

  return extents.reduce((widest, extent, axis) => (extent > extents[widest]! ? axis : widest), 0);
}

function pieceCost(matcher: Matcher, fromOrder: Int32Array, toOrder: Int32Array, start: number, size: number): Float64Array {
  const cost = new Float64Array(size * size);

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      cost[row * size + column] = matcher.distance(fromOrder[start + row]!, toOrder[start + column]!);
    }
  }

  return cost;
}

function solvePiece(matcher: Matcher, fromOrder: Int32Array, toOrder: Int32Array, partnerOf: Int32Array, start: number, size: number) {
  const cost = pieceCost(matcher, fromOrder, toOrder, start, size);

  solve({ cost, rows: size, cols: size }).forEach((column, row) => {
    partnerOf[fromOrder[start + row]!] = toOrder[start + column]!;
  });
}

function halve(matcher: Matcher, fromOrder: Int32Array, toOrder: Int32Array, partnerOf: Int32Array, start: number, end: number): void {
  const size = end - start;

  if (size <= EXACT_PIECE) {
    solvePiece(matcher, fromOrder, toOrder, partnerOf, start, size);
    return;
  }

  const axis = widestAxis(matcher, fromOrder, toOrder, start, end);
  const middle = start + (size >> 1);

  select({ order: fromOrder, coordinates: matcher.from.axes[axis]!, start, end: end - 1, target: middle });
  select({ order: toOrder, coordinates: matcher.to.axes[axis]!, start, end: end - 1, target: middle });
  halve(matcher, fromOrder, toOrder, partnerOf, start, middle);
  halve(matcher, fromOrder, toOrder, partnerOf, middle, end);
}

function pairByPlace(matcher: Matcher, fromIds: ArrayLike<number>, toIds: ArrayLike<number>, partnerOf: Int32Array): Int32Array {
  halve(matcher, Int32Array.from(fromIds), Int32Array.from(toIds), partnerOf, 0, fromIds.length);

  return partnerOf;
}

interface Edges {
  distance: Float64Array;
  from: Int32Array;
  to: Int32Array;
  count: number;
}

function collectEdges(matcher: Matcher, tree: KdTree, sources: Int32Array, want: number): Edges {
  const found = new Int32Array(want);
  const foundDistance = new Float64Array(want);
  const edges: Edges = {
    distance: new Float64Array(sources.length * want),
    from: new Int32Array(sources.length * want),
    to: new Int32Array(sources.length * want),
    count: 0,
  };

  for (const source of sources) {
    const count = nearestIn(tree, matcher.from, source, want, Infinity, found, foundDistance);

    for (let index = 0; index < count; index++, edges.count++) {
      edges.distance[edges.count] = foundDistance[index]!;
      edges.from[edges.count] = source;
      edges.to[edges.count] = found[index]!;
    }
  }

  return edges;
}

const edgeOrder = (edges: Edges) =>
  Uint32Array.from({ length: edges.count }, (_, edge) => edge).sort(
    (p, q) => edges.distance[p]! - edges.distance[q]! || edges.from[p]! - edges.from[q]! || edges.to[p]! - edges.to[q]!,
  );

function acceptEdges(edges: Edges, partnerOf: Int32Array, takenTo: Uint8Array) {
  for (const edge of edgeOrder(edges)) {
    const source = edges.from[edge]!;
    const target = edges.to[edge]!;

    if (partnerOf[source] !== UNPAIRED || takenTo[target]) continue;

    partnerOf[source] = target;
    takenTo[target] = 1;
  }
}

function treeOver(matcher: Matcher, targets: Int32Array): KdTree {
  const { to } = matcher;

  return targets.length === matcher.toCount ? to.tree : kdTree({ x: to.x, y: to.y, z: to.z, ids: targets });
}

function pairByNearest(matcher: Matcher, keptFrom: Int32Array, keptTo: Int32Array): Int32Array {
  const partnerOf = new Int32Array(matcher.fromCount).fill(UNPAIRED);
  const takenTo = new Uint8Array(matcher.toCount);
  let restFrom = keptFrom;
  let restTo = keptTo;

  for (let round = 0, neighbours = NEIGHBOURS; round < NEAREST_ROUNDS && restFrom.length > 0; round++, neighbours *= 2) {
    const edges = collectEdges(matcher, treeOver(matcher, restTo), restFrom, Math.min(neighbours, restTo.length));

    acceptEdges(edges, partnerOf, takenTo);

    const before = restFrom.length;

    restFrom = restFrom.filter((source) => partnerOf[source] === UNPAIRED);
    restTo = restTo.filter((target) => !takenTo[target]);

    if (before - restFrom.length < before * NEAREST_GIVE_UP) break;
  }

  return pairByPlace(matcher, restFrom, restTo, partnerOf);
}

function partnersOfTo(partnerOf: Int32Array, toCount: number): Int32Array {
  const partnerOfTo = new Int32Array(toCount).fill(UNPAIRED);

  partnerOf.forEach((target, source) => {
    if (target !== UNPAIRED) partnerOfTo[target] = source;
  });

  return partnerOfTo;
}

function takenTargets(partnerOf: Int32Array, toCount: number): Uint8Array {
  const taken = new Uint8Array(toCount);

  partnerOf.forEach((target) => {
    if (target !== UNPAIRED) taken[target] = 1;
  });

  return taken;
}

function freeTargetTree(matcher: Matcher, taken: Uint8Array): KdTree | null {
  const free = Array.from({ length: matcher.toCount }, (_, target) => target).filter((target) => !taken[target]);
  const { to } = matcher;

  return free.length > 0 ? kdTree({ x: to.x, y: to.y, z: to.z, ids: free }) : null;
}

interface WindowState {
  partnerOf: Int32Array;
  taken: Uint8Array;
  freeTree: KdTree | null;
  rows: Int32Array;
  columns: Int32Array;
  extra: Int32Array;
  extraDistance: Float64Array;
}

interface Window {
  rowCount: number;
  columnCount: number;
  paired: number;
}

function gatherWindow(matcher: Matcher, state: WindowState, seed: number, covered: Uint8Array): Window {
  const { partnerOf, taken, freeTree, rows, columns, extra, extraDistance } = state;
  const rowCount = nearestIn(matcher.from.tree, matcher.from, seed, WINDOW, Infinity, matcher.ids, matcher.distances);
  let columnCount = 0;

  for (let row = 0; row < rowCount; row++) {
    const source = matcher.ids[row]!;

    rows[row] = source;
    covered[source] = 1;

    if (partnerOf[source] !== UNPAIRED) columns[columnCount++] = partnerOf[source]!;
  }

  const paired = columnCount;

  if (freeTree) {
    const found = nearestIn(freeTree, matcher.from, seed, WINDOW, Infinity, extra, extraDistance);

    for (let index = 0; index < found; index++) {
      if (!taken[extra[index]!]) columns[columnCount++] = extra[index]!;
    }
  }

  return { rowCount, columnCount, paired };
}

function windowCost(matcher: Matcher, state: WindowState, { rowCount, columnCount }: Window, flip: boolean, width: number): Float64Array {
  const height = flip ? columnCount : rowCount;
  const cost = new Float64Array(height * width);

  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const cell = flip ? column * width + row : row * width + column;

      cost[cell] = matcher.distance(state.rows[row]!, state.columns[column]!);
    }
  }

  return cost;
}

function isAlreadyOptimal(cost: Float64Array, size: number, width: number): boolean {
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (cost[row * width + column]! < cost[row * width + row]!) return false;
    }
  }

  return true;
}

function resolveWindow(state: WindowState, window: Window, cost: Float64Array, flip: boolean) {
  const { partnerOf, taken, rows, columns } = state;
  const [height, width] = flip ? [window.columnCount, window.rowCount] : [window.rowCount, window.columnCount];

  for (let row = 0; row < window.rowCount; row++) partnerOf[rows[row]!] = UNPAIRED;

  for (let column = 0; column < window.columnCount; column++) taken[columns[column]!] = 0;

  solve({ cost, rows: height, cols: width }).forEach((solvedColumn, solvedRow) => {
    const [row, column] = flip ? [solvedColumn, solvedRow] : [solvedRow, solvedColumn];

    partnerOf[rows[row]!] = columns[column]!;
    taken[columns[column]!] = 1;
  });
}

function repairWindow(matcher: Matcher, state: WindowState, seed: number, covered: Uint8Array) {
  const window = gatherWindow(matcher, state, seed, covered);
  const { rowCount, columnCount, paired } = window;

  if (paired < 2 && columnCount === paired) return;

  const flip = rowCount > columnCount;
  const width = flip ? rowCount : columnCount;
  const cost = windowCost(matcher, state, window, flip, width);
  const unchanged = rowCount === paired && columnCount === paired && isAlreadyOptimal(cost, rowCount, width);

  if (!unchanged) resolveWindow(state, window, cost, flip);
}

function repairWindows(matcher: Matcher, partnerOf: Int32Array): Int32Array {
  const taken = takenTargets(partnerOf, matcher.toCount);
  const state: WindowState = {
    partnerOf,
    taken,
    freeTree: freeTargetTree(matcher, taken),
    rows: new Int32Array(WINDOW),
    columns: new Int32Array(WINDOW * 2),
    extra: new Int32Array(WINDOW),
    extraDistance: new Float64Array(WINDOW),
  };

  for (let pass = 0; pass < WINDOW_PASSES; pass++) {
    const covered = new Uint8Array(matcher.fromCount);

    for (let step = 0; step < matcher.fromCount; step++) {
      const seed = pass % 2 === 0 ? step : matcher.fromCount - 1 - step;

      if (!covered[seed] && partnerOf[seed] !== UNPAIRED) repairWindow(matcher, state, seed, covered);
    }
  }

  return partnerOf;
}

function workQueue(size: number) {
  const items = allIndexes(size);
  const queued = new Uint8Array(size).fill(1);
  let head = 0;
  let length = size;

  return {
    get isEmpty() {
      return length === 0;
    },

    push(item: number) {
      if (queued[item]) return;

      queued[item] = 1;
      items[(head + length) % size] = item;
      length++;
    },

    shift(): number {
      const item = items[head]!;

      head = (head + 1) % size;
      length--;
      queued[item] = 0;

      return item;
    },
  };
}

function swapGain(matcher: Matcher, source: number, partner: number, current: number, target: number, rival: number): number {
  const { distance } = matcher;

  if (rival === UNPAIRED) return current - distance(source, target);

  if (partner === UNPAIRED) return distance(rival, target) - distance(source, target);

  return current + distance(rival, target) - distance(source, target) - distance(rival, partner);
}

interface Swap {
  source: number;
  partner: number;
  target: number;
  rival: number;
}

function applySwap(partnerOf: Int32Array, partnerOfTo: Int32Array, { source, partner, target, rival }: Swap) {
  partnerOf[source] = target;
  partnerOfTo[target] = source;

  if (partner !== UNPAIRED) partnerOfTo[partner] = rival;

  if (rival !== UNPAIRED) partnerOf[rival] = partner;
}

function findSwap(matcher: Matcher, partnerOf: Int32Array, partnerOfTo: Int32Array, source: number): Swap | null {
  const partner = partnerOf[source]!;
  const current = partner === UNPAIRED ? Infinity : matcher.distance(source, partner);
  const found = nearestIn(matcher.to.tree, matcher.from, source, NEIGHBOURS, current, matcher.ids, matcher.distances);
  const tolerance = SWAP_TOLERANCE * (Number.isFinite(current) ? current + 1 : 1);

  for (let index = 0; index < found; index++) {
    const target = matcher.ids[index]!;

    if (target === partner) return null;

    const rival = partnerOfTo[target]!;

    if (swapGain(matcher, source, partner, current, target, rival) > tolerance) return { source, partner, target, rival };
  }

  return null;
}

function swapPartners(matcher: Matcher, partnerOf: Int32Array): Int32Array {
  const partnerOfTo = partnersOfTo(partnerOf, matcher.toCount);
  const queue = workQueue(matcher.fromCount);
  const near = new Int32Array(NEIGHBOURS);
  const nearDistance = new Float64Array(NEIGHBOURS);

  const wake = (target: number) => {
    const count = nearestIn(matcher.from.tree, matcher.to, target, NEIGHBOURS, Infinity, near, nearDistance);

    for (let index = 0; index < count; index++) queue.push(near[index]!);
  };

  for (let budget = matcher.fromCount * SWAP_PASSES; !queue.isEmpty && budget > 0; budget--) {
    const swap = findSwap(matcher, partnerOf, partnerOfTo, queue.shift());

    if (!swap) continue;

    applySwap(partnerOf, partnerOfTo, swap);
    queue.push(swap.source);

    if (swap.rival !== UNPAIRED) queue.push(swap.rival);

    wake(swap.target);

    if (swap.partner !== UNPAIRED) wake(swap.partner);
  }

  return partnerOf;
}

function totalDistance(matcher: Matcher, partnerOf: Int32Array): number {
  return partnerOf.reduce((total, target, source) => (target === UNPAIRED ? total : total + matcher.distance(source, target)), 0);
}

const polish = (matcher: Matcher, partnerOf: Int32Array) =>
  swapPartners(matcher, repairWindows(matcher, swapPartners(matcher, partnerOf)));

const toPairs = (partnerOf: Int32Array) =>
  Array.from(partnerOf).flatMap((target, source): Pair[] => (target === UNPAIRED ? [] : [[source, target]]));

export function approximate(a: readonly Point3[], b: readonly Point3[], maxDistance = Infinity): Pair[] {
  const from = toCloud(a);
  const to = toCloud(b);
  const matcher = createMatcher(from, to, maxDistance);

  const keptFrom = a.length > b.length ? closestToOther(from, to.tree, b.length) : allIndexes(a.length);
  const keptTo = b.length > a.length ? closestToOther(to, from.tree, a.length) : allIndexes(b.length);

  const byPlace = polish(matcher, pairByPlace(matcher, keptFrom, keptTo, new Int32Array(a.length).fill(UNPAIRED)));
  const byNearest = polish(matcher, pairByNearest(matcher, keptFrom, keptTo));

  return toPairs(totalDistance(matcher, byNearest) < totalDistance(matcher, byPlace) ? byNearest : byPlace);
}
