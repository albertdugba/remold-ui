/**
 * Family context: use the matches we're sure of to decide the ones we're not.
 *
 * Three "Get" buttons look identical on their own. But if the card around one button was
 * matched to a card on the new page, the button inside that card is the likely partner.
 * Likewise a container whose contents moved together is probably the same container, and an
 * element sitting beside a matched label (the switch next to "Mentions") follows its label.
 */
import type { Assignment } from "./hungarian";
import { ancestors, descendants, type PreparedNode } from "./nodes";
import { styleSimilarity } from "./similarity";

/** Space between two boxes (0 when they touch or overlap), in root widths. */
function gap(p: PreparedNode, q: PreparedNode): number {
  const a = p.node;
  const b = q.node;
  const dx = Math.max(0, Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) - (a.width + b.width) / 2);
  const dy = Math.max(0, Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) - (a.height + b.height) / 2);
  return Math.hypot(dx, dy);
}

/** In the same row or column: they overlap by at least half the smaller one's height or width. */
function aligned(p: PreparedNode, q: PreparedNode): boolean {
  const a = p.node;
  const b = q.node;
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  return overlapY > 0.5 * Math.min(a.height, b.height) || overlapX > 0.5 * Math.min(a.width, b.width);
}

/** Where a node's centre sits inside its parent, as fractions of the parent's size. */
function positionIn(child: PreparedNode, parent: PreparedNode): [number, number] {
  const c = child.node;
  const p = parent.node;
  return [(c.x + c.width / 2 - p.x) / (p.width || 1), (c.y + c.height / 2 - p.y) / (p.height || 1)];
}

/**
 * Each node's anchors: its nearest already-matched siblings that carry content. Siblings in
 * the same row or column count as four times closer, because that's how people read
 * "belongs together". A second anchor is kept only if it's nearly as close as the first.
 */
function anchors(nodes: readonly PreparedNode[], matched: Int32Array): number[][] {
  return nodes.map((n) => {
    const near: [distance: number, index: number][] = [];
    for (const m of nodes) {
      if (m.index === n.index || matched[m.index]! < 0 || m.node.parent !== n.node.parent || !m.hasContent) continue;
      let d = gap(n, m);
      if (aligned(n, m)) d *= 0.25;
      if (d < 0.4) near.push([d, m.index]);
    }
    near.sort((x, y) => x[0] - y[0]);
    const first = near[0];
    return near.filter((x, k) => k === 0 || (k === 1 && x[0] < 2 * first![0] + 0.01)).map((x) => x[1]);
  });
}

/** Precomputed relationships that don't change between passes. */
export interface StructureContext {
  ancestorsA: number[][];
  ancestorsB: number[][];
  /** Descendants that carry content: only they vote, so empty boxes can't echo earlier guesses. */
  evidenceA: number[][];
  evidenceB: number[][];
  /** The same as sets, built once instead of once per pair per pass. */
  evidenceSetsB: Set<number>[];
  /** Style similarity of every pair of the same kind (0 otherwise), row-major. */
  style: Float64Array;
}

/** `style`, when given, is every pair's style similarity (row-major), already worked out. */
export function structureContext(a: readonly PreparedNode[], b: readonly PreparedNode[], style?: Float64Array): StructureContext {
  const evidence = (nodes: readonly PreparedNode[]) => nodes.map((_, i) => descendants(nodes, i).filter((d) => nodes[d]!.hasContent));
  const evidenceB = evidence(b);
  return {
    ancestorsA: a.map((_, i) => ancestors(a, i)),
    ancestorsB: b.map((_, j) => ancestors(b, j)),
    evidenceA: evidence(a),
    evidenceB,
    evidenceSetsB: evidenceB.map((e) => new Set(e)),
    style: sameKindStyle(a, b, style),
  };
}

function sameKindStyle(a: readonly PreparedNode[], b: readonly PreparedNode[], style?: Float64Array): Float64Array {
  const out = new Float64Array(a.length * b.length);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (a[i]!.node.kind === b[j]!.node.kind) out[i * b.length + j] = style ? style[i * b.length + j]! : styleSimilarity(a[i]!, b[j]!);
    }
  }
  return out;
}

/**
 * Add a family bonus to every base similarity, given the current pairs. The bonus is scaled
 * by how plausible the pair already is, so context can tip a close call but never invent a
 * match between unrelated things. Tables are row-major, `a.length` × `b.length`; the result is
 * written into `out`.
 */
export function withContext(
  base: Float64Array,
  a: readonly PreparedNode[],
  b: readonly PreparedNode[],
  pairs: readonly Assignment[],
  context: StructureContext,
  out: Float64Array,
): Float64Array {
  const forward = new Int32Array(a.length).fill(-1);
  const backward = new Int32Array(b.length).fill(-1);
  for (const p of pairs) {
    forward[p.from] = p.to;
    backward[p.to] = p.from;
  }
  const anchorsA = anchors(a, forward);
  const anchorsB = anchors(b, backward);
  const cols = b.length;

  for (let i = 0; i < a.length; i++) {
    const pa = a[i]!.node.parent;
    const parentPartner = pa >= 0 ? forward[pa]! : -1;
    const ancestorsA = context.ancestorsA[i]!;
    const anchorsOfA = anchorsA[i]!;
    const da = context.evidenceA[i]!;
    for (let j = 0; j < cols; j++) {
      const score = base[i * cols + j]!;
      let family = 0;
      const pb = b[j]!.node.parent;
      if (pa >= 0 && pb >= 0 && parentPartner === pb) {
        // Matched parents: the closer the position inside the parent, the stronger.
        const [ax, ay] = positionIn(a[i]!, a[pa]!);
        const [bx, by] = positionIn(b[j]!, b[pb]!);
        family = 0.5 + 0.5 * Math.exp(-Math.hypot(ax - bx, ay - by) / 0.3);
      } else if (ancestorsA.some((x) => forward[x]! >= 0 && context.ancestorsB[j]!.includes(forward[x]!))) {
        family = 0.5;
      }
      if (anchorsOfA.length > 0 && anchorsOfA.some((x) => anchorsB[j]!.includes(forward[x]!))) family = Math.max(family, 0.8);

      // Same slot, same kind, same look: an element whose label or value changed.
      let bonus = 0.12 * family + 0.08 * family * context.style[i * cols + j]! ** 3;

      // Containers whose contents moved together.
      const db = context.evidenceB[j]!;
      if (da.length > 0 && db.length > 0) {
        const inB = context.evidenceSetsB[j]!;
        let agree = 0;
        for (const c of da) if (forward[c]! >= 0 && inB.has(forward[c]!)) agree++;
        bonus += (0.18 * (2 * agree)) / (da.length + db.length);
      }
      out[i * cols + j] = score + bonus * (0.4 + 0.6 * Math.min(1, score / 0.45));
    }
  }
  return out;
}
