/**
 * Pairwise similarity: how likely an old element and a new element are the same thing.
 *
 * Content (text, media, what's inside) carries most of the weight. Kind gates implausible pairs
 * (a photo never becomes a heading). Position and paint break ties, but only in proportion to
 * how plausible the content already is: two unrelated paragraphs in the same slot are not the
 * same element.
 */
import type { NodeKind, PreparedNode, Rgba } from "./nodes";
import { compareText, overlap } from "./text";

const KIND: Record<NodeKind, Record<NodeKind, number>> = {
  heading: { heading: 1, text: 0.7, control: 0.4, media: 0, box: 0.1 },
  text: { heading: 0.7, text: 1, control: 0.5, media: 0, box: 0.1 },
  control: { heading: 0.4, text: 0.5, control: 1, media: 0.1, box: 0.3 },
  media: { heading: 0, text: 0, control: 0.1, media: 1, box: 0.3 },
  box: { heading: 0.1, text: 0.1, control: 0.3, media: 0.3, box: 1 },
};

export function kindSimilarity(a: NodeKind, b: NodeKind): number {
  return KIND[a][b];
}

/** Same media, same text, or the same things inside. */
export function contentSimilarity(a: PreparedNode, b: PreparedNode): number {
  const ma = a.node.media;
  const mb = b.node.media;

  if (ma || mb) {
    if (ma && mb) return ma === mb ? 1 : 0.15;

    return 0;
  }
  if (a.text && b.text) return compareText(a.features, b.features);

  if (a.text || b.text) return 0.08;
  // Two containers: compare what they hold.
  if (a.subtree.length === 0 && b.subtree.length === 0) return 0.3;

  const { dice, containment } = overlap(a.subtreeSet, b.subtreeSet);

  return Math.max(dice, 0.85 * containment);
}

/** Nearby and similar in size. Distances are in root widths. */
export function geometrySimilarity(a: PreparedNode, b: PreparedNode): number {
  const p = a.node;
  const q = b.node;
  const distance = Math.hypot(p.x + p.width / 2 - (q.x + q.width / 2), p.y + p.height / 2 - (q.y + q.height / 2));
  const position = Math.exp(-distance / 0.25);
  const ratio = Math.abs(Math.log((p.width + 1e-3) / (q.width + 1e-3))) + Math.abs(Math.log((p.height + 1e-3) / (q.height + 1e-3)));
  const size = Math.exp(-ratio / 1.5);

  return 0.6 * position + 0.4 * size;
}

/** 1 for the same colour, falling to 0. Transparent colours mostly agree with each other. */
export function colorSimilarity(p: Rgba | undefined, q: Rgba | undefined): number {
  if (!p || !q) return p === q ? 1 : 0.5;

  const d = Math.hypot((p[0] - q[0]) * p[3], (p[1] - q[1]) * p[3], (p[2] - q[2]) * p[3], (p[3] - q[3]) * 255);

  return 1 - Math.min(1, d / 220);
}

/** Same colours, type and corners. Missing values count as neither agreeing nor disagreeing. */
export function styleSimilarity(a: PreparedNode, b: PreparedNode): number {
  const p = a.node;
  const q = b.node;
  const fontSize = p.fontSize && q.fontSize ? Math.exp(-Math.abs(Math.log(p.fontSize / q.fontSize)) * 2) : 0.5;
  const fontWeight = p.fontWeight && q.fontWeight ? 1 - Math.min(1, Math.abs(p.fontWeight - q.fontWeight) / 500) : 0.5;
  const radius =
    p.radius !== undefined && q.radius !== undefined ? Math.exp(-Math.abs(Math.min(p.radius, 40) - Math.min(q.radius, 40)) / 8) : 0.5;
  return (
    (colorSimilarity(p.color, q.color) + 1.4 * colorSimilarity(p.background, q.background) + fontSize + 0.6 * fontWeight + 0.6 * radius) /
    4.6
  );
}

const WEIGHTS = { kind: 0.15, content: 0.45, geometry: 0.2, style: 0.2 };

/**
 * The overall first-impression similarity, before family context is considered. Pass `style`
 * when it's already known (the matcher works it out once per pair and reuses it).
 */
export function baseSimilarity(a: PreparedNode, b: PreparedNode, style = styleSimilarity(a, b)): number {
  const kind = kindSimilarity(a.node.kind, b.node.kind);
  const content = contentSimilarity(a, b);
  const gate = 0.35 + 0.65 * Math.min(1, content / 0.6);
  const looks = (WEIGHTS.geometry * geometrySimilarity(a, b) + WEIGHTS.style * style) * gate;
  let score = WEIGHTS.kind * kind + WEIGHTS.content * content + looks;
  // Weights sum to 1, so no normalising needed. Implausible kinds are halved on top.
  if (kind < 0.2) score *= 0.5;

  return score;
}
