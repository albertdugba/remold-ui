/**
 * Keyless matching: which element of the old interface became which element of the new one.
 *
 *   1. Score every old/new pair on content, kind, position and paint.
 *   2. Pick the best overall pairing (Hungarian), dropping weak pairs.
 *   3. Re-score with family context (matched parents, anchors, contents that moved together)
 *      and pair again, a few times.
 *   4. Look for splits and merges among the text.
 *   5. Pair lone leftovers: when two matched parents (or the two top levels) each have exactly
 *      one unmatched box, control or image left, painted alike, it's one element changing shape
 *      (a pill growing into a player), however different its size and contents.
 * Whatever is left over on the old side was removed; on the new side, added.
 */
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
/** How alike in paint (colours, type, corners) two lone leftovers must be to be paired. */
const LONER_STYLE = 0.7;

/**
 * Two elements that are each the only unmatched child of a matched pair of parents (or of the two
 * top levels), of the same kind and painted alike, are the same element: its size and contents
 * changed too much for a first impression, but there's nothing else it could have become.
 */
function pairLoners(
  a: ReturnType<typeof prepare>,
  b: ReturnType<typeof prepare>,
  pairs: Assignment[],
  style: Float64Array,
  cols: number,
  splits: readonly Split[],
  merges: readonly Merge[],
): Assignment[] {
  const forward = new Map<number, number>();
  const backward = new Map<number, number>();
  for (const p of pairs) {
    forward.set(p.from, p.to);
    backward.set(p.to, p.from);
  }
  // Pieces of a split or merge aren't leftovers.
  const taken = { a: new Set<number>(), b: new Set<number>() };
  for (const s of splits) {
    taken.a.add(s.from);
    for (const j of s.to) taken.b.add(j);
  }
  for (const m of merges) {
    taken.b.add(m.to);
    for (const i of m.from) taken.a.add(i);
  }
  const family = (parent: number, partner: number | undefined) =>
    parent === -1 ? "top" : partner === undefined ? null : `${parent}>${partner}`;
  const leftA = new Map<string, number[]>();
  const leftB = new Map<string, number[]>();
  for (const n of a) {
    if (forward.has(n.index) || taken.a.has(n.index) || n.node.kind === "text" || n.node.kind === "heading") continue;
    const key = family(n.node.parent, n.node.parent === -1 ? undefined : forward.get(n.node.parent));
    if (key) leftA.set(key, [...(leftA.get(key) ?? []), n.index]);
  }
  for (const n of b) {
    if (backward.has(n.index) || taken.b.has(n.index) || n.node.kind === "text" || n.node.kind === "heading") continue;
    const from = n.node.parent === -1 ? undefined : backward.get(n.node.parent);
    const key = n.node.parent === -1 ? "top" : from === undefined ? null : `${from}>${n.node.parent}`;
    if (key) leftB.set(key, [...(leftB.get(key) ?? []), n.index]);
  }
  const added: Assignment[] = [];
  for (const [key, olds] of leftA) {
    const news = leftB.get(key);
    if (olds.length !== 1 || news?.length !== 1) continue;
    const i = olds[0]!;
    const j = news[0]!;
    const score = style[i * cols + j]!;
    if (a[i]!.node.kind === b[j]!.node.kind && score >= LONER_STYLE) added.push({ from: i, to: j, score });
  }
  return added.length ? [...pairs, ...added] : pairs;
}

/**
 * Step 6: containers that carry the same contents. A card that grows into a sheet, or a bar that
 * opens into a page, often changes size and place too much to match on its own, but most of what
 * was inside it ends up inside the new one. For each unmatched box on the old side, find the
 * unmatched box on the new side that received most of its matched contents (at least three
 * things, at least 60% of what it held, and at least 30% of what the new one holds), and pair
 * the best of them, closest in look first. Inner wrappers that hold the same things lose to the
 * outer box that paints, because look breaks ties.
 */
function pairContainers(
  a: ReturnType<typeof prepare>,
  b: ReturnType<typeof prepare>,
  pairs: Assignment[],
  style: Float64Array,
  cols: number,
  splits: readonly Split[],
  merges: readonly Merge[],
): Assignment[] {
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
  const contents = (nodes: ReturnType<typeof prepare>, i: number) => descendants(nodes, i).filter((d) => nodes[d]!.hasContent);
  const boxes = (n: (typeof a)[number]) => n.node.kind !== "text" && n.node.kind !== "heading";
  const inB = new Map<number, Set<number>>();
  for (const q of b) if (!usedB.has(q.index) && boxes(q)) inB.set(q.index, new Set(contents(b, q.index)));

  const candidates: { i: number; j: number; score: number }[] = [];
  for (const p of a) {
    if (forward.has(p.index) || !boxes(p)) continue;
    const held = contents(a, p.index);
    const sent = held.map((d) => forward.get(d)).filter((j): j is number => j !== undefined && j >= 0);
    if (sent.length < 3) continue;
    for (const [j, there] of inB) {
      if (b[j]!.node.kind !== p.node.kind || there.size === 0) continue;
      let agree = 0;
      for (const t of sent) if (there.has(t)) agree++;
      if (agree < 3 || agree / held.length < 0.6 || agree / there.size < 0.3) continue;
      candidates.push({ i: p.index, j, score: agree / held.length + agree / there.size + 0.5 * style[p.index * cols + j]! });
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  const takenA = new Set<number>();
  const takenB = new Set<number>();
  const added: Assignment[] = [];
  for (const c of candidates) {
    if (takenA.has(c.i) || takenB.has(c.j)) continue;
    takenA.add(c.i);
    takenB.add(c.j);
    added.push({ from: c.i, to: c.j, score: c.score / 2.5 });
  }
  return added.length ? [...pairs, ...added] : pairs;
}

function samePairs(p: readonly Assignment[], q: readonly Assignment[]): boolean {
  if (p.length !== q.length) return false;
  for (let k = 0; k < p.length; k++) if (p[k]!.from !== q[k]!.from || p[k]!.to !== q[k]!.to) return false;
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
  const a = prepare(from);
  const b = prepare(to);
  // Every pair is scored into flat tables, row-major. Style is used twice (first impressions and
  // family context), so it's worked out once.
  const rows = a.length;
  const cols = b.length;
  const style = new Float64Array(rows * cols);
  const base = new Float64Array(rows * cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j;
      style[k] = styleSimilarity(a[i]!, b[j]!);
      base[k] = baseSimilarity(a[i]!, b[j]!, style[k]);
    }
  }
  let pairs = assignFlat({ similarity: base, rows, cols, threshold });

  if (structure && rows > 0 && cols > 0) {
    const context = structureContext(a, b, style);
    const scored = new Float64Array(rows * cols);
    for (let pass = 0; pass < STRUCTURE_PASSES; pass++) {
      const next = assignFlat({ similarity: withContext(base, a, b, pairs, context, scored), rows, cols, threshold });
      // A pass only depends on the pairs before it: once they stop changing, so would every later pass.
      const settled = samePairs(next, pairs);
      pairs = next;
      if (settled) break;
    }
  }

  let splits: Split[] = [];
  let merges: Merge[] = [];
  if (findSplits) ({ pairs, splits, merges } = splitsAndMerges(a, b, pairs));
  // Last, so splits and merges get the first say over leftovers.
  if (structure) pairs = pairLoners(a, b, pairs, style, cols, splits, merges);
  if (structure) pairs = pairContainers(a, b, pairs, style, cols, splits, merges);

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
    removed: a.map((p) => p.index).filter((i) => !usedA.has(i)),
    added: b.map((q) => q.index).filter((j) => !usedB.has(j)),
  };
}
