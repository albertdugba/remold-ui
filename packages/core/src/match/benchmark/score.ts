/** Scores matchers against expected relations and provides baseline matchers. */
import type { MatchNode } from "../nodes";
import type { NodeMatches } from "../nodes-match";
import { normalizeText } from "../text";

/** Every relation a result claims, as "i>j" strings. */
export function relations(result: NodeMatches): Set<string> {
  const relationKeys = new Set<string>();

  for (const pair of result.pairs) relationKeys.add(`${pair.from}>${pair.to}`);
  for (const split of result.splits) for (const toIndex of split.to) relationKeys.add(`${split.from}>${toIndex}`);
  for (const merge of result.merges) for (const fromIndex of merge.from) relationKeys.add(`${fromIndex}>${merge.to}`);

  return relationKeys;
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
  for (const relation of claimed) if (expected.has(relation)) correct++;
  const precision = claimed.size > 0 ? correct / claimed.size : 1;
  const recall = expected.size > 0 ? correct / expected.size : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1, correct, claimed: claimed.size, expected: expected.size };
}

function finish(fromNodes: readonly MatchNode[], toNodes: readonly MatchNode[], pairs: { from: number; to: number }[]): NodeMatches {
  const usedFrom = new Set(pairs.map((pair) => pair.from));
  const usedTo = new Set(pairs.map((pair) => pair.to));

  return {
    pairs: pairs.map((pair) => ({ ...pair, score: 1 })),
    splits: [],
    merges: [],
    removed: fromNodes.map((_, index) => index).filter((index) => !usedFrom.has(index)),
    added: toNodes.map((_, index) => index).filter((index) => !usedTo.has(index)),
  };
}

/** A path like "0/box:2/text:0": what keyless reconciliation (React without keys) compares. */
function treePaths(nodes: readonly MatchNode[]): string[] {
  const paths: string[] = [];
  const childCount = new Map<number, number>();
  nodes.forEach((node, index) => {
    const sibling = childCount.get(node.parent) ?? 0;
    childCount.set(node.parent, sibling + 1);
    const parentPath = node.parent >= 0 ? paths[node.parent]! : "";
    paths[index] = `${parentPath}/${node.kind}:${sibling}`;
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
