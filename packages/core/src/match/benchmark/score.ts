import type { MatchNode } from "../nodes";
import type { NodeMatches } from "../nodes-match";
import { normalizeText } from "../text";

export interface Score {
  precision: number;
  recall: number;
  f1: number;
  correct: number;
  claimed: number;
  expected: number;
}

interface Link {
  from: number;
  to: number;
}

export function relations(result: NodeMatches): Set<string> {
  const pairs = result.pairs.map((pair) => `${pair.from}>${pair.to}`);
  const splits = result.splits.flatMap((split) => split.to.map((to) => `${split.from}>${to}`));
  const merges = result.merges.flatMap((merge) => merge.from.map((from) => `${from}>${merge.to}`));

  return new Set([...pairs, ...splits, ...merges]);
}

export function score(claimed: Set<string>, expected: Set<string>): Score {
  const correct = [...claimed].filter((relation) => expected.has(relation)).length;
  const precision = claimed.size > 0 ? correct / claimed.size : 1;
  const recall = expected.size > 0 ? correct / expected.size : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1, correct, claimed: claimed.size, expected: expected.size };
}

const unused = (count: number, used: ReadonlySet<number>) =>
  Array.from({ length: count }, (_, index) => index).filter((index) => !used.has(index));

function finish(fromNodes: readonly MatchNode[], toNodes: readonly MatchNode[], links: readonly Link[]): NodeMatches {
  return {
    pairs: links.map((link) => ({ ...link, score: 1 })),
    splits: [],
    merges: [],
    removed: unused(fromNodes.length, new Set(links.map((link) => link.from))),
    added: unused(toNodes.length, new Set(links.map((link) => link.to))),
  };
}

function treePaths(nodes: readonly MatchNode[]): string[] {
  const childCount = new Map<number, number>();
  const paths: string[] = [];

  for (const node of nodes) {
    const sibling = childCount.get(node.parent) ?? 0;
    const parentPath = node.parent >= 0 ? paths[node.parent]! : "";

    childCount.set(node.parent, sibling + 1);
    paths.push(`${parentPath}/${node.kind}:${sibling}`);
  }

  return paths;
}

export function matchByTreePosition(a: readonly MatchNode[], b: readonly MatchNode[]): NodeMatches {
  const indexOf = new Map(treePaths(b).map((path, index) => [path, index]));

  const links = treePaths(a).flatMap((path, from): Link[] => {
    const to = indexOf.get(path);

    return to === undefined ? [] : [{ from, to }];
  });

  return finish(a, b, links);
}

const textKey = (node: MatchNode) => (node.media ? `#${node.media}` : normalizeText(node.text));

export function matchByExactText(a: readonly MatchNode[], b: readonly MatchNode[]): NodeMatches {
  const used = new Set<number>();

  const links = a.flatMap((node, from): Link[] => {
    const key = textKey(node);
    const to = key ? b.findIndex((candidate, index) => !used.has(index) && textKey(candidate) === key) : -1;

    if (to < 0) return [];

    used.add(to);

    return [{ from, to }];
  });

  return finish(a, b, links);
}
