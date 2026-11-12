import type { Assignment } from "./hungarian";
import { ancestors, descendants, type PreparedNode } from "./nodes";
import { styleSimilarity } from "./similarity";

export interface StructureContext {
  ancestorsA: number[][];
  ancestorsB: number[][];
  evidenceA: number[][];
  evidenceB: number[][];
  evidenceSetsB: Set<number>[];
  style: Float64Array;
}

const UNMATCHED = -1;
const ALIGNED_DISTANCE = 0.25;
const ANCHOR_REACH = 0.4;
const SECOND_ANCHOR_SLACK = 0.01;
const POSITION_SCALE = 0.3;
const SHARED_ANCESTOR = 0.5;
const SHARED_ANCHOR = 0.8;
const AGREEMENT_WEIGHT = 0.18;

const centre = ({ node }: PreparedNode) => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });

function gap(p: PreparedNode, q: PreparedNode): number {
  const [a, b] = [p.node, q.node];
  const [from, to] = [centre(p), centre(q)];
  const dx = Math.max(0, Math.abs(from.x - to.x) - (a.width + b.width) / 2);
  const dy = Math.max(0, Math.abs(from.y - to.y) - (a.height + b.height) / 2);

  return Math.hypot(dx, dy);
}

function aligned(p: PreparedNode, q: PreparedNode): boolean {
  const [a, b] = [p.node, q.node];
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);

  return overlapY > 0.5 * Math.min(a.height, b.height) || overlapX > 0.5 * Math.min(a.width, b.width);
}

function positionIn(child: PreparedNode, parent: PreparedNode): [number, number] {
  const { x, y } = centre(child);
  const { node } = parent;

  return [(x - node.x) / (node.width || 1), (y - node.y) / (node.height || 1)];
}

const isAnchorFor = (node: PreparedNode, matched: Int32Array) => (other: PreparedNode) =>
  other.index !== node.index && matched[other.index]! >= 0 && other.node.parent === node.node.parent && other.hasContent;

const anchorDistance = (node: PreparedNode, other: PreparedNode) => gap(node, other) * (aligned(node, other) ? ALIGNED_DISTANCE : 1);

function anchorsOf(node: PreparedNode, nodes: readonly PreparedNode[], matched: Int32Array): number[] {
  const near = nodes
    .filter(isAnchorFor(node, matched))
    .map((other) => ({ distance: anchorDistance(node, other), index: other.index }))
    .filter(({ distance }) => distance < ANCHOR_REACH)
    .sort((x, y) => x.distance - y.distance);

  const [first, second] = near;

  if (!first) return [];

  const keepSecond = second && second.distance < 2 * first.distance + SECOND_ANCHOR_SLACK;

  return keepSecond ? [first.index, second.index] : [first.index];
}

const anchors = (nodes: readonly PreparedNode[], matched: Int32Array) => nodes.map((node) => anchorsOf(node, nodes, matched));

const contentDescendants = (nodes: readonly PreparedNode[]) =>
  nodes.map((_, index) => descendants(nodes, index).filter((child) => nodes[child]!.hasContent));

function sameKindStyle(a: readonly PreparedNode[], b: readonly PreparedNode[], style?: Float64Array): Float64Array {
  const table = new Float64Array(a.length * b.length);

  for (const [row, from] of a.entries()) {
    for (const [column, to] of b.entries()) {
      const cell = row * b.length + column;

      if (from.node.kind === to.node.kind) table[cell] = style ? style[cell]! : styleSimilarity(from, to);
    }
  }

  return table;
}

export function structureContext(a: readonly PreparedNode[], b: readonly PreparedNode[], style?: Float64Array): StructureContext {
  const evidenceB = contentDescendants(b);

  return {
    ancestorsA: a.map((_, index) => ancestors(a, index)),
    ancestorsB: b.map((_, index) => ancestors(b, index)),
    evidenceA: contentDescendants(a),
    evidenceB,
    evidenceSetsB: evidenceB.map((evidence) => new Set(evidence)),
    style: sameKindStyle(a, b, style),
  };
}

function partnerTables(pairs: readonly Assignment[], fromCount: number, toCount: number) {
  const forward = new Int32Array(fromCount).fill(UNMATCHED);
  const backward = new Int32Array(toCount).fill(UNMATCHED);

  pairs.forEach(({ from, to }) => {
    forward[from] = to;
    backward[to] = from;
  });

  return { forward, backward };
}

function agreementBonus(evidenceA: readonly number[], evidenceB: readonly number[], inB: ReadonlySet<number>, forward: Int32Array) {
  if (evidenceA.length === 0 || evidenceB.length === 0) return 0;

  const agree = evidenceA.reduce((count, child) => (forward[child]! >= 0 && inB.has(forward[child]!) ? count + 1 : count), 0);

  return (AGREEMENT_WEIGHT * (2 * agree)) / (evidenceA.length + evidenceB.length);
}

interface Family {
  a: readonly PreparedNode[];
  b: readonly PreparedNode[];
  forward: Int32Array;
  anchorsA: number[][];
  anchorsB: number[][];
  context: StructureContext;
}

const sharesAncestor = ({ forward, context }: Family, row: number, column: number) =>
  context.ancestorsA[row]!.some((ancestor) => forward[ancestor]! >= 0 && context.ancestorsB[column]!.includes(forward[ancestor]!));

const sharesAnchor = ({ forward, anchorsA, anchorsB }: Family, row: number, column: number) =>
  anchorsA[row]!.length > 0 && anchorsA[row]!.some((anchor) => anchorsB[column]!.includes(forward[anchor]!));

function parentCloseness({ a, b, forward }: Family, row: number, column: number): number | null {
  const parentA = a[row]!.node.parent;
  const parentB = b[column]!.node.parent;

  if (parentA < 0 || parentB < 0 || forward[parentA] !== parentB) return null;

  const [ax, ay] = positionIn(a[row]!, a[parentA]!);
  const [bx, by] = positionIn(b[column]!, b[parentB]!);

  return 0.5 + 0.5 * Math.exp(-Math.hypot(ax - bx, ay - by) / POSITION_SCALE);
}

function kinship(family: Family, row: number, column: number): number {
  const inherited = parentCloseness(family, row, column) ?? (sharesAncestor(family, row, column) ? SHARED_ANCESTOR : 0);

  return sharesAnchor(family, row, column) ? Math.max(inherited, SHARED_ANCHOR) : inherited;
}

function familyBonus(family: Family, row: number, column: number, cell: number): number {
  const { context, forward } = family;
  const kin = kinship(family, row, column);
  const together = agreementBonus(context.evidenceA[row]!, context.evidenceB[column]!, context.evidenceSetsB[column]!, forward);

  return 0.12 * kin + 0.08 * kin * context.style[cell]! ** 3 + together;
}

const plausibility = (score: number) => 0.4 + 0.6 * Math.min(1, score / 0.45);

export function withContext(
  base: Float64Array,
  a: readonly PreparedNode[],
  b: readonly PreparedNode[],
  pairs: readonly Assignment[],
  context: StructureContext,
  out: Float64Array,
): Float64Array {
  const { forward, backward } = partnerTables(pairs, a.length, b.length);
  const family: Family = { a, b, forward, anchorsA: anchors(a, forward), anchorsB: anchors(b, backward), context };

  for (let row = 0; row < a.length; row++) {
    for (let column = 0; column < b.length; column++) {
      const cell = row * b.length + column;
      const score = base[cell]!;

      out[cell] = score + familyBonus(family, row, column, cell) * plausibility(score);
    }
  }

  return out;
}
