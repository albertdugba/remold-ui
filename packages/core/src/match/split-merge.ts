/**
 * Splits and merges: one text became several ("12 Rue de Rivoli, 75001 Paris" became two
 * lines), or several became one ("Ada" and "Lovelace" became "Ada Lovelace").
 */
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

/** Tokens that identify content: words of two or more characters, and anything with a digit. */
const significant = (n: PreparedNode) => n.significant;

/** Every significant token of `part` appears in `whole`, and `whole` has more. */
function isPartOf(part: PreparedNode, whole: PreparedNode): boolean {
  const p = part.significant;
  const w = whole.significantSet;
  return p.length > 0 && p.length < w.size && p.every((t) => w.has(t));
}

const closeness = (p: PreparedNode, q: PreparedNode) => Math.exp(-Math.hypot(p.node.x - q.node.x, p.node.y - q.node.y) / 0.6);

/**
 * Find wholes in `wholes` made of two or more parts in `parts`. `wholeTo` and `partFrom` are the
 * current one-to-one matches in that direction.
 */
function findGroups(
  wholes: readonly PreparedNode[],
  parts: readonly PreparedNode[],
  wholeTo: ReadonlyMap<number, number>,
  partFrom: ReadonlyMap<number, number>,
): Map<number, number[]> {
  const claims = new Map<number, number[]>();
  for (const part of parts) {
    if (!part.text) continue;
    const partner = partFrom.get(part.index);
    let best = -1;
    let bestScore = 0;
    for (const whole of wholes) {
      if (!whole.text || !isPartOf(part, whole)) continue;
      // Already matched one-to-one to some other whole: leave it.
      if (partner !== undefined && partner !== whole.index) continue;
      // The whole is matched to something that isn't one of its parts: leave it.
      const current = wholeTo.get(whole.index);
      if (current !== undefined && current !== part.index && !isPartOf(parts[current]!, whole)) continue;
      const score = closeness(part, whole) + (current === part.index ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = whole.index;
      }
    }
    if (best >= 0) claims.set(best, [...(claims.get(best) ?? []), part.index]);
  }

  const groups = new Map<number, number[]>();
  for (const [whole, claimed] of claims) {
    if (claimed.length < 2) continue;
    // The parts must cover most of the whole, or it's a coincidence of shared words.
    const covered = new Set(claimed.flatMap((p) => significant(parts[p]!)));
    const tokens = new Set(significant(wholes[whole]!));
    let hits = 0;
    for (const t of tokens) if (covered.has(t)) hits++;
    if (hits / tokens.size >= 0.6) groups.set(whole, claimed);
  }
  return groups;
}

const maps = (pairs: readonly Assignment[]) => ({
  forward: new Map(pairs.map((p) => [p.from, p.to])),
  backward: new Map(pairs.map((p) => [p.to, p.from])),
});

/** Detect splits, then merges. Pairs absorbed into a split or merge are removed from `pairs`. */
export function splitsAndMerges(
  a: readonly PreparedNode[],
  b: readonly PreparedNode[],
  pairs: readonly Assignment[],
): { pairs: Assignment[]; splits: Split[]; merges: Merge[] } {
  let remaining = [...pairs];

  const splits: Split[] = [];
  const before = maps(remaining);
  for (const [from, to] of findGroups(a, b, before.forward, before.backward)) {
    splits.push({ from, to });
    remaining = remaining.filter((p) => p.from !== from && !to.includes(p.to));
  }

  const merges: Merge[] = [];
  const after = maps(remaining);
  for (const [to, from] of findGroups(b, a, after.backward, after.forward)) {
    merges.push({ from, to });
    remaining = remaining.filter((p) => p.to !== to && !from.includes(p.from));
  }
  return { pairs: remaining, splits, merges };
}
