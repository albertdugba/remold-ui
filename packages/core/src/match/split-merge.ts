import type { Assignment } from "./hungarian";
import type { PreparedNode } from "./nodes";

export interface Split {
  from: number;
  to: number[];
}

export interface Merge {
  from: number[];
  to: number;
}

interface Candidate {
  index: number;
  score: number;
}

const MIN_COVERAGE = 0.6;
const CLOSENESS_SCALE = 0.6;

function isPartOf(part: PreparedNode, whole: PreparedNode): boolean {
  const tokens = part.significant;

  return tokens.length > 0 && tokens.length < whole.significantSet.size && tokens.every((token) => whole.significantSet.has(token));
}

const closeness = (p: PreparedNode, q: PreparedNode) =>
  Math.exp(-Math.hypot(p.node.x - q.node.x, p.node.y - q.node.y) / CLOSENESS_SCALE);

function bestWhole(
  part: PreparedNode,
  wholes: readonly PreparedNode[],
  parts: readonly PreparedNode[],
  wholeTo: ReadonlyMap<number, number>,
  partFrom: ReadonlyMap<number, number>,
): number | undefined {
  const partner = partFrom.get(part.index);

  const isFree = (whole: PreparedNode) => {
    const current = wholeTo.get(whole.index);

    if (partner !== undefined && partner !== whole.index) return false;

    return current === undefined || current === part.index || isPartOf(parts[current]!, whole);
  };

  const best = wholes
    .filter((whole) => whole.text && isPartOf(part, whole) && isFree(whole))
    .reduce<Candidate | null>((best, whole) => {
      const score = closeness(part, whole) + (wholeTo.get(whole.index) === part.index ? 1 : 0);

      return score > (best?.score ?? 0) ? { index: whole.index, score } : best;
    }, null);

  return best?.index;
}

function coverage(whole: PreparedNode, claimed: readonly PreparedNode[]): number {
  const covered = new Set(claimed.flatMap((part) => part.significant));
  const tokens = new Set(whole.significant);
  const hits = [...tokens].filter((token) => covered.has(token)).length;

  return hits / tokens.size;
}

function findGroups(
  wholes: readonly PreparedNode[],
  parts: readonly PreparedNode[],
  wholeTo: ReadonlyMap<number, number>,
  partFrom: ReadonlyMap<number, number>,
): Map<number, number[]> {
  const claims = parts
    .filter((part) => part.text)
    .reduce((claims, part) => {
      const whole = bestWhole(part, wholes, parts, wholeTo, partFrom);

      return whole === undefined ? claims : claims.set(whole, [...(claims.get(whole) ?? []), part.index]);
    }, new Map<number, number[]>());

  const groups = [...claims].filter(
    ([whole, claimed]) =>
      claimed.length >= 2 &&
      coverage(
        wholes[whole]!,
        claimed.map((index) => parts[index]!),
      ) >= MIN_COVERAGE,
  );

  return new Map(groups);
}

const directions = (pairs: readonly Assignment[]) => ({
  forward: new Map(pairs.map((pair) => [pair.from, pair.to])),
  backward: new Map(pairs.map((pair) => [pair.to, pair.from])),
});

export function splitsAndMerges(
  fromNodes: readonly PreparedNode[],
  toNodes: readonly PreparedNode[],
  pairs: readonly Assignment[],
): { pairs: Assignment[]; splits: Split[]; merges: Merge[] } {
  const before = directions(pairs);
  const splits = [...findGroups(fromNodes, toNodes, before.forward, before.backward)].map(([from, to]): Split => ({ from, to }));
  const afterSplits = pairs.filter((pair) => !splits.some((split) => pair.from === split.from || split.to.includes(pair.to)));

  const after = directions(afterSplits);
  const merges = [...findGroups(toNodes, fromNodes, after.backward, after.forward)].map(([to, from]): Merge => ({ from, to }));
  const remaining = afterSplits.filter((pair) => !merges.some((merge) => pair.to === merge.to || merge.from.includes(pair.from)));

  return { pairs: remaining, splits, merges };
}
