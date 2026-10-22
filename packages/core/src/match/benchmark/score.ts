/**
 * Scoring matchers against ground truth, plus the two baselines the matcher has to beat.
 */
import type { MatchNode } from "../nodes";
import type { NodeMatches } from "../nodes-match";
import { normalizeText } from "../text";

/** Every relation a result claims, as "i>j" strings. */
export function relations(result: NodeMatches): Set<string> {
  const out = new Set<string>();
  for (const p of result.pairs) out.add(`${p.from}>${p.to}`);
  for (const s of result.splits) for (const j of s.to) out.add(`${s.from}>${j}`);
  for (const m of result.merges) for (const i of m.from) out.add(`${i}>${m.to}`);
  return out;
}

export interface Score {
  precision: number;
  recall: number;
  f1: number;
  correct: number;
  claimed: number;
  expected: number;
}

/** Precision: how many claimed relations are right. Recall: how many right ones were found. */
export function score(claimed: Set<string>, expected: Set<string>): Score {
  let correct = 0;
  for (const r of claimed) if (expected.has(r)) correct++;
  const precision = claimed.size > 0 ? correct / claimed.size : 1;
  const recall = expected.size > 0 ? correct / expected.size : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1, correct, claimed: claimed.size, expected: expected.size };
}

function finish(a: readonly MatchNode[], b: readonly MatchNode[], pairs: { from: number; to: number }[]): NodeMatches {
  const usedA = new Set(pairs.map((p) => p.from));
  const usedB = new Set(pairs.map((p) => p.to));
  return {
    pairs: pairs.map((p) => ({ ...p, score: 1 })),
    splits: [],
    merges: [],
    removed: a.map((_, i) => i).filter((i) => !usedA.has(i)),
    added: b.map((_, j) => j).filter((j) => !usedB.has(j)),
  };
}

/** A path like "0/box:2/text:0": what keyless reconciliation (React without keys) compares. */
function treePaths(nodes: readonly MatchNode[]): string[] {
  const paths: string[] = [];
  const childCount = new Map<number, number>();
  nodes.forEach((n, i) => {
    const sibling = childCount.get(n.parent) ?? 0;
    childCount.set(n.parent, sibling + 1);
    const parentPath = n.parent >= 0 ? paths[n.parent]! : "";
    paths[i] = `${parentPath}/${n.kind}:${sibling}`;
  });
  return paths;
}

/** Baseline 1: same position in the tree means same element. */
export function matchByTreePosition(a: readonly MatchNode[], b: readonly MatchNode[]): NodeMatches {
  const index = new Map(treePaths(b).map((p, j) => [p, j]));
  const pairs = treePaths(a).flatMap((p, i) => {
    const j = index.get(p);
    return j === undefined ? [] : [{ from: i, to: j }];
  });
  return finish(a, b, pairs);
}

/** Baseline 2: identical text or identical media, first come first served. */
export function matchByExactText(a: readonly MatchNode[], b: readonly MatchNode[]): NodeMatches {
  const key = (n: MatchNode) => (n.media ? `#${n.media}` : normalizeText(n.text));
  const used = new Set<number>();
  const pairs: { from: number; to: number }[] = [];
  a.forEach((n, i) => {
    const k = key(n);
    if (!k) return;
    const j = b.findIndex((m, jj) => !used.has(jj) && key(m) === k);
    if (j >= 0) {
      used.add(j);
      pairs.push({ from: i, to: j });
    }
  });
  return finish(a, b, pairs);
}
