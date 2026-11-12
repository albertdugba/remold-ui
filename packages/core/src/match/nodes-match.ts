import { assignFlat, type Assignment } from "./hungarian";
import { descendants, prepare, type PreparedNode, type MatchNode } from "./nodes";
import { baseSimilarity, styleSimilarity } from "./similarity";
import { splitsAndMerges, type Merge, type Split } from "./split-merge";
import { structureContext, withContext } from "./structure";

export interface MatchNodesOptions {
  /** Pairs scoring below this (0–1) are left unmatched. */
  threshold?: number;
  /** Use family context to settle ambiguous pairs. */
  structure?: boolean;
  /** Detect one-to-many and many-to-one changes in text. */
  splits?: boolean;
  /** Maximum score-table size for the optimal matcher. */
  maxPairComparisons?: number;
}

export interface NodeMatches {
  /** One old element became one new element. */
  pairs: Assignment[];
  /** One old element became several new ones. */
  splits: Split[];
  /** Several old elements became one new one. */
  merges: Merge[];
  /** Old elements with no counterpart. */
  removed: number[];
  /** New elements with no counterpart. */
  added: number[];
}

interface Refinement {
  fromNodes: readonly PreparedNode[];
  toNodes: readonly PreparedNode[];
  pairs: Assignment[];
  styleScores: Float64Array;
  toCount: number;
  splits: readonly Split[];
  merges: readonly Merge[];
}

interface Candidate {
  from: number;
  to: number;
  score: number;
}

const STRUCTURE_PASSES = 3;
const LONER_STYLE = 0.7;
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MAX_PAIR_COMPARISONS = 160_000;
const GREEDY_CANDIDATES_PER_NODE = 4;
const MIN_SHARED_CONTENTS = 3;
const CONTAINER_HELD_SHARE = 0.6;
const CONTAINER_TARGET_SHARE = 0.3;
const CONTAINER_SCORE_RANGE = 2.5;
const TOP_LEVEL = "top";

const isTextual = ({ node }: PreparedNode) => node.kind === "text" || node.kind === "heading";

const isContainer = (entry: PreparedNode) => !isTextual(entry);

const contentsOf = (nodes: readonly PreparedNode[], index: number) =>
  descendants(nodes, index).filter((descendant) => nodes[descendant]!.hasContent);

function regroupedSides(splits: readonly Split[], merges: readonly Merge[]) {
  return {
    from: new Set([...splits.map((split) => split.from), ...merges.flatMap((merge) => merge.from)]),
    to: new Set([...splits.flatMap((split) => split.to), ...merges.map((merge) => merge.to)]),
  };
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string | null, valueFor: (item: T) => number) {
  return items.reduce((groups, item) => {
    const key = keyOf(item);

    return key === null ? groups : groups.set(key, [...(groups.get(key) ?? []), valueFor(item)]);
  }, new Map<string, number[]>());
}

function pickGreedily(candidates: readonly Candidate[]): Candidate[] {
  const usedFrom = new Set<number>();
  const usedTo = new Set<number>();

  return candidates.filter(({ from, to }) => {
    if (usedFrom.has(from) || usedTo.has(to)) return false;

    usedFrom.add(from);
    usedTo.add(to);

    return true;
  });
}

function pairLoners({ fromNodes, toNodes, pairs, styleScores, toCount, splits, merges }: Refinement): Assignment[] {
  const toByFrom = new Map(pairs.map((pair) => [pair.from, pair.to]));
  const fromByTo = new Map(pairs.map((pair) => [pair.to, pair.from]));
  const regrouped = regroupedSides(splits, merges);

  const familyKey = (parent: number, oldParent: number | undefined, newParent: number | undefined) => {
    if (parent === -1) return TOP_LEVEL;

    return oldParent === undefined || newParent === undefined ? null : `${oldParent}>${newParent}`;
  };

  const lonelyFrom = fromNodes.filter((entry) => !toByFrom.has(entry.index) && !regrouped.from.has(entry.index) && isContainer(entry));
  const lonelyTo = toNodes.filter((entry) => !fromByTo.has(entry.index) && !regrouped.to.has(entry.index) && isContainer(entry));

  const leftA = groupBy(
    lonelyFrom,
    ({ node }) => familyKey(node.parent, node.parent, toByFrom.get(node.parent)),
    (entry) => entry.index,
  );

  const leftB = groupBy(
    lonelyTo,
    ({ node }) => familyKey(node.parent, fromByTo.get(node.parent), node.parent),
    (entry) => entry.index,
  );

  const added = [...leftA].flatMap(([key, olds]) => {
    const news = leftB.get(key);

    if (olds.length !== 1 || news?.length !== 1) return [];

    const [from, to] = [olds[0]!, news[0]!];
    const score = styleScores[from * toCount + to]!;
    const sameKind = fromNodes[from]!.node.kind === toNodes[to]!.node.kind;

    return sameKind && score >= LONER_STYLE ? [{ from, to, score }] : [];
  });

  return added.length > 0 ? [...pairs, ...added] : pairs;
}

function pairContainers({ fromNodes, toNodes, pairs, styleScores, toCount, splits, merges }: Refinement): Assignment[] {
  const toByFrom = new Map(pairs.map((pair) => [pair.from, pair.to]));
  const regrouped = regroupedSides(splits, merges);
  const takenTo = new Set([...pairs.map((pair) => pair.to), ...regrouped.to]);

  const openTargets = toNodes
    .filter((entry) => !takenTo.has(entry.index) && isContainer(entry))
    .map((entry) => ({ index: entry.index, kind: entry.node.kind, contents: new Set(contentsOf(toNodes, entry.index)) }));

  const candidatesFor = (entry: PreparedNode): Candidate[] => {
    const held = contentsOf(fromNodes, entry.index);
    const sent = held.map((index) => toByFrom.get(index)).filter((index): index is number => index !== undefined);

    if (sent.length < MIN_SHARED_CONTENTS) return [];

    return openTargets.flatMap((target) => {
      if (target.kind !== entry.node.kind || target.contents.size === 0) return [];

      const agree = sent.filter((index) => target.contents.has(index)).length;
      const heldShare = agree / held.length;
      const targetShare = agree / target.contents.size;

      if (agree < MIN_SHARED_CONTENTS || heldShare < CONTAINER_HELD_SHARE || targetShare < CONTAINER_TARGET_SHARE) return [];

      const score = heldShare + targetShare + 0.5 * styleScores[entry.index * toCount + target.index]!;

      return [{ from: entry.index, to: target.index, score }];
    });
  };

  const candidates = fromNodes
    .filter((entry) => !toByFrom.has(entry.index) && !regrouped.from.has(entry.index) && isContainer(entry))
    .flatMap(candidatesFor)
    .sort((x, y) => y.score - x.score);

  const added = pickGreedily(candidates).map((candidate) => ({ ...candidate, score: candidate.score / CONTAINER_SCORE_RANGE }));

  return added.length > 0 ? [...pairs, ...added] : pairs;
}

const samePairs = (previous: readonly Assignment[], next: readonly Assignment[]) =>
  previous.length === next.length && previous.every((pair, index) => pair.from === next[index]!.from && pair.to === next[index]!.to);

function bestForRow(similarity: Float64Array, row: number, cols: number, threshold: number): Candidate[] {
  return Array.from({ length: cols }, (_, to) => ({ from: row, to, score: similarity[row * cols + to]! }))
    .filter((candidate) => candidate.score >= threshold)
    .sort((x, y) => y.score - x.score || x.to - y.to)
    .slice(0, GREEDY_CANDIDATES_PER_NODE);
}

function assignGreedy(similarity: Float64Array, rows: number, cols: number, threshold: number): Assignment[] {
  const candidates = Array.from({ length: rows }, (_, row) => bestForRow(similarity, row, cols, threshold))
    .flat()
    .sort((x, y) => y.score - x.score || x.from - y.from || x.to - y.to);

  return pickGreedily(candidates);
}

function scoreTables(fromNodes: readonly PreparedNode[], toNodes: readonly PreparedNode[]) {
  const style = new Float64Array(fromNodes.length * toNodes.length);
  const base = new Float64Array(fromNodes.length * toNodes.length);

  for (const [row, from] of fromNodes.entries()) {
    for (const [column, to] of toNodes.entries()) {
      const cell = row * toNodes.length + column;

      style[cell] = styleSimilarity(from, to);
      base[cell] = baseSimilarity(from, to, style[cell]);
    }
  }

  return { style, base };
}

function refineWithStructure(
  fromNodes: readonly PreparedNode[],
  toNodes: readonly PreparedNode[],
  base: Float64Array,
  style: Float64Array,
  initial: Assignment[],
  threshold: number,
): Assignment[] {
  const context = structureContext(fromNodes, toNodes, style);
  const scratch = new Float64Array(base.length);
  let pairs = initial;

  for (let pass = 0; pass < STRUCTURE_PASSES; pass++) {
    const similarity = withContext(base, fromNodes, toNodes, pairs, context, scratch);
    const next = assignFlat({ similarity, rows: fromNodes.length, cols: toNodes.length, threshold });
    const settled = samePairs(next, pairs);

    pairs = next;

    if (settled) break;
  }

  return pairs;
}

function validate(threshold: number, maxPairComparisons: number) {
  if (!(threshold >= 0 && threshold <= 1)) {
    throw new RangeError(`matchNodes: threshold must be between 0 and 1, got ${threshold}`);
  }

  if (!(maxPairComparisons >= 0)) {
    throw new RangeError(`matchNodes: maxPairComparisons must be non-negative, got ${maxPairComparisons}`);
  }
}

/** Works out which old elements became which new ones, without keys or ids. */
export function matchNodes(
  from: readonly MatchNode[],
  to: readonly MatchNode[],
  {
    threshold = DEFAULT_THRESHOLD,
    structure = true,
    splits: findSplits = true,
    maxPairComparisons = DEFAULT_MAX_PAIR_COMPARISONS,
  }: MatchNodesOptions = {},
): NodeMatches {
  validate(threshold, maxPairComparisons);

  const fromNodes = prepare(from);
  const toNodes = prepare(to);
  const fromCount = fromNodes.length;
  const toCount = toNodes.length;
  const greedy = fromCount * toCount > maxPairComparisons;
  const scores = scoreTables(fromNodes, toNodes);

  const initial = greedy
    ? assignGreedy(scores.base, fromCount, toCount, threshold)
    : assignFlat({ similarity: scores.base, rows: fromCount, cols: toCount, threshold });

  const structured =
    structure && !greedy && fromCount > 0 && toCount > 0
      ? refineWithStructure(fromNodes, toNodes, scores.base, scores.style, initial, threshold)
      : initial;

  const regrouped = findSplits && !greedy ? splitsAndMerges(fromNodes, toNodes, structured) : { pairs: structured, splits: [], merges: [] };
  const refinement = { fromNodes, toNodes, styleScores: scores.style, toCount, splits: regrouped.splits, merges: regrouped.merges };

  const pairs =
    structure && !greedy
      ? pairContainers({ ...refinement, pairs: pairLoners({ ...refinement, pairs: regrouped.pairs }) })
      : regrouped.pairs;

  const sides = regroupedSides(regrouped.splits, regrouped.merges);
  const usedFrom = new Set([...pairs.map((pair) => pair.from), ...sides.from]);
  const usedTo = new Set([...pairs.map((pair) => pair.to), ...sides.to]);

  return {
    pairs: pairs.sort((p, q) => p.from - q.from),
    splits: regrouped.splits,
    merges: regrouped.merges,
    removed: fromNodes.map((entry) => entry.index).filter((index) => !usedFrom.has(index)),
    added: toNodes.map((entry) => entry.index).filter((index) => !usedTo.has(index)),
  };
}
