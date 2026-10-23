/** Matches two UI snapshots without relying on element keys. */
import { assignFlat, type Assignment } from "./hungarian";
import { descendants, prepare, type MatchNode } from "./nodes";
import { baseSimilarity, styleSimilarity } from "./similarity";
import { splitsAndMerges, type Merge, type Split } from "./split-merge";
import { structureContext, withContext } from "./structure";

export interface MatchNodesOptions {
  /** Pairs scoring below this (0–1) are left unmatched. Default 0.5. */
  threshold?: number;
  /** Use family context to settle ambiguous pairs. Default true. */
  structure?: boolean;
  /** Detect one-to-many and many-to-one changes in text. Default true. */
  splits?: boolean;
}

export interface NodeMatches {
  /** One old element became one new element. Indexes into the two input lists. */
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

/** How many times family context is applied. Each pass can settle ties the previous one exposed. */
const STRUCTURE_PASSES = 3;
const LONER_STYLE = 0.7;

type PreparedNodes = ReturnType<typeof prepare>;

interface RefinementOptions {
  fromNodes: PreparedNodes;
  toNodes: PreparedNodes;
  pairs: Assignment[];
  styleScores: Float64Array;
  toCount: number;
  splits: readonly Split[];
  merges: readonly Merge[];
}

interface PairIndexes {
  toByFrom: Map<number, number>;
  fromByTo: Map<number, number>;
  excludedFrom: Set<number>;
  excludedTo: Set<number>;
}

function createPairIndexes({ pairs, splits, merges }: Pick<RefinementOptions, "pairs" | "splits" | "merges">): PairIndexes {
  const forward = new Map<number, number>();
  const backward = new Map<number, number>();

  for (const p of pairs) {
    forward.set(p.from, p.to);
    backward.set(p.to, p.from);
  }

  const excludedFrom = new Set<number>();
  const excludedTo = new Set<number>();

  for (const split of splits) {
    excludedFrom.add(split.from);
    for (const toIndex of split.to) excludedTo.add(toIndex);
  }

  for (const merge of merges) {
    excludedTo.add(merge.to);
    for (const fromIndex of merge.from) excludedFrom.add(fromIndex);
  }
  return { toByFrom: forward, fromByTo: backward, excludedFrom, excludedTo };
}

function pairLoners({ fromNodes, toNodes, pairs, styleScores, toCount, splits, merges }: RefinementOptions): Assignment[] {
  const { toByFrom, fromByTo, excludedFrom, excludedTo } = createPairIndexes({ pairs, splits, merges });
  const family = (parent: number, partner: number | undefined) =>
    parent === -1 ? "top" : partner === undefined ? null : `${parent}>${partner}`;

  const leftA = new Map<string, number[]>();
  const leftB = new Map<string, number[]>();

  for (const entry of fromNodes) {
    if (toByFrom.has(entry.index) || excludedFrom.has(entry.index) || entry.node.kind === "text" || entry.node.kind === "heading") {
      continue;
    }

    const key = family(entry.node.parent, entry.node.parent === -1 ? undefined : toByFrom.get(entry.node.parent));
    if (key) leftA.set(key, [...(leftA.get(key) ?? []), entry.index]);
  }

  for (const entry of toNodes) {
    if (fromByTo.has(entry.index) || excludedTo.has(entry.index) || entry.node.kind === "text" || entry.node.kind === "heading") {
      continue;
    }

    const fromParent = entry.node.parent === -1 ? undefined : fromByTo.get(entry.node.parent);
    const key = entry.node.parent === -1 ? "top" : fromParent === undefined ? null : `${fromParent}>${entry.node.parent}`;
    if (key) leftB.set(key, [...(leftB.get(key) ?? []), entry.index]);
  }

  const added: Assignment[] = [];
  for (const [key, olds] of leftA) {
    const news = leftB.get(key);
    if (olds.length !== 1 || news?.length !== 1) continue;
    const i = olds[0]!;
    const j = news[0]!;
    const score = styleScores[i * toCount + j]!;
    if (fromNodes[i]!.node.kind === toNodes[j]!.node.kind && score >= LONER_STYLE) added.push({ from: i, to: j, score });
  }

  return added.length ? [...pairs, ...added] : pairs;
}

function pairContainers({ fromNodes, toNodes, pairs, styleScores, toCount, splits, merges }: RefinementOptions): Assignment[] {
  const forward = new Map<number, number>();
  const usedB = new Set<number>();
  for (const p of pairs) {
    forward.set(p.from, p.to);
    usedB.add(p.to);
  }
  for (const s of splits) {
    forward.set(s.from, -1);
    for (const j of s.to) usedB.add(j);
  }
  for (const m of merges) {
    usedB.add(m.to);
    for (const i of m.from) forward.set(i, -1);
  }

  const contents = (nodes: PreparedNodes, index: number) => descendants(nodes, index).filter((descendant) => nodes[descendant]!.hasContent);
  const isContainer = (entry: (typeof fromNodes)[number]) => entry.node.kind !== "text" && entry.node.kind !== "heading";
  const inB = new Map<number, Set<number>>();

  for (const entry of toNodes) {
    if (!usedB.has(entry.index) && isContainer(entry)) inB.set(entry.index, new Set(contents(toNodes, entry.index)));
  }

  const candidates: { from: number; to: number; score: number }[] = [];

  for (const entry of fromNodes) {
    if (forward.has(entry.index) || !isContainer(entry)) continue;
    const held = contents(fromNodes, entry.index);
    const sent = held.map((descendant) => forward.get(descendant)).filter((index): index is number => index !== undefined && index >= 0);
    if (sent.length < 3) continue;
    for (const [toIndex, contained] of inB) {
      if (toNodes[toIndex]!.node.kind !== entry.node.kind || contained.size === 0) continue;
      let agree = 0;
      for (const targetIndex of sent) if (contained.has(targetIndex)) agree++;
      if (agree < 3 || agree / held.length < 0.6 || agree / contained.size < 0.3) continue;
      candidates.push({ from: entry.index, to: toIndex, score: agree / held.length + agree / contained.size + 0.5 * styleScores[entry.index * toCount + toIndex]! });
    }
  }

  candidates.sort((x, y) => y.score - x.score);
  const usedFrom = new Set<number>();
  const usedTo = new Set<number>();
  const added: Assignment[] = [];

  for (const candidate of candidates) {
    if (usedFrom.has(candidate.from) || usedTo.has(candidate.to)) continue;
    usedFrom.add(candidate.from);
    usedTo.add(candidate.to);
    added.push({ from: candidate.from, to: candidate.to, score: candidate.score / 2.5 });
  }

  return added.length ? [...pairs, ...added] : pairs;
}

function samePairs(previousPairs: readonly Assignment[], nextPairs: readonly Assignment[]): boolean {
  if (previousPairs.length !== nextPairs.length) return false;

  for (let index = 0; index < previousPairs.length; index++) {
    if (previousPairs[index]!.from !== nextPairs[index]!.from || previousPairs[index]!.to !== nextPairs[index]!.to) return false;
  }
  return true;
}

export function matchNodes(
  from: readonly MatchNode[],
  to: readonly MatchNode[],
  { threshold = 0.5, structure = true, splits: findSplits = true }: MatchNodesOptions = {},
): NodeMatches {
  if (!(threshold >= 0 && threshold <= 1)) {
    throw new RangeError(`matchNodes: threshold must be between 0 and 1, got ${threshold}`);
  }

  const fromNodes = prepare(from);
  const toNodes = prepare(to);
  const fromCount = fromNodes.length;
  const toCount = toNodes.length;
  const styleScores = new Float64Array(fromCount * toCount);
  const baseScores = new Float64Array(fromCount * toCount);

  for (let fromIndex = 0; fromIndex < fromCount; fromIndex++) {
    for (let toIndex = 0; toIndex < toCount; toIndex++) {
      const scoreIndex = fromIndex * toCount + toIndex;
      styleScores[scoreIndex] = styleSimilarity(fromNodes[fromIndex]!, toNodes[toIndex]!);
      baseScores[scoreIndex] = baseSimilarity(fromNodes[fromIndex]!, toNodes[toIndex]!, styleScores[scoreIndex]);
    }
  }

  let pairs = assignFlat({ similarity: baseScores, rows: fromCount, cols: toCount, threshold });

  if (structure && fromCount > 0 && toCount > 0) {
    const context = structureContext(fromNodes, toNodes, styleScores);
    const contextualScores = new Float64Array(fromCount * toCount);

    for (let pass = 0; pass < STRUCTURE_PASSES; pass++) {
      const nextPairs = assignFlat({ similarity: withContext(baseScores, fromNodes, toNodes, pairs, context, contextualScores), rows: fromCount, cols: toCount, threshold });
      const settled = samePairs(nextPairs, pairs);
      pairs = nextPairs;
      if (settled) break;
    }
  }

  let splits: Split[] = [];
  let merges: Merge[] = [];

  if (findSplits) ({ pairs, splits, merges } = splitsAndMerges(fromNodes, toNodes, pairs));
  const refinementOptions = { fromNodes, toNodes, pairs, styleScores, toCount, splits, merges };
  if (structure) pairs = pairLoners(refinementOptions);
  if (structure) pairs = pairContainers({ ...refinementOptions, pairs });

  const usedA = new Set<number>();
  const usedB = new Set<number>();

  for (const p of pairs) {
    usedA.add(p.from);
    usedB.add(p.to);
  }

  for (const s of splits) {
    usedA.add(s.from);
    for (const j of s.to) usedB.add(j);
  }

  for (const m of merges) {
    usedB.add(m.to);
    for (const i of m.from) usedA.add(i);
  }

  return {
    pairs: pairs.sort((p, q) => p.from - q.from),
    splits,
    merges,
    removed: fromNodes.map((entry) => entry.index).filter((index) => !usedA.has(index)),
    added: toNodes.map((entry) => entry.index).filter((index) => !usedB.has(index)),
  };
}
