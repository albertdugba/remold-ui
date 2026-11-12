import type { NodeKind, PreparedNode, Rgba } from "./nodes";
import { compareText, overlap } from "./text";

const KIND: Record<NodeKind, Record<NodeKind, number>> = {
  heading: { heading: 1, text: 0.7, control: 0.4, media: 0, box: 0.1 },
  text: { heading: 0.7, text: 1, control: 0.5, media: 0, box: 0.1 },
  control: { heading: 0.4, text: 0.5, control: 1, media: 0.1, box: 0.3 },
  media: { heading: 0, text: 0, control: 0.1, media: 1, box: 0.3 },
  box: { heading: 0.1, text: 0.1, control: 0.3, media: 0.3, box: 1 },
};

const WEIGHTS = { kind: 0.15, content: 0.45, geometry: 0.2, style: 0.2 };
const STYLE_WEIGHTS = { color: 1, background: 1.4, fontSize: 1, fontWeight: 0.6, radius: 0.6 };
const STYLE_TOTAL = Object.values(STYLE_WEIGHTS).reduce((total, weight) => total + weight, 0);

const UNKNOWN = 0.5;
const SIZE_EPSILON = 1e-3;
const RADIUS_CAP = 40;
const COLOR_RANGE = 220;
const IMPLAUSIBLE_KIND = 0.2;

const logRatio = (a: number, b: number) => Math.abs(Math.log(a / b));

const centreOf = ({ x, y, width, height }: PreparedNode["node"]) => ({ x: x + width / 2, y: y + height / 2 });

const whenBoth = <T>(p: T | undefined, q: T | undefined, score: (p: T, q: T) => number) =>
  p !== undefined && q !== undefined ? score(p, q) : UNKNOWN;

export function kindSimilarity(a: NodeKind, b: NodeKind): number {
  return KIND[a][b];
}

const mediaSimilarity = (p: string | undefined, q: string | undefined) => {
  if (p && q) return p === q ? 1 : 0.15;

  return 0;
};

const containerSimilarity = (a: PreparedNode, b: PreparedNode) => {
  if (a.subtree.length === 0 && b.subtree.length === 0) return 0.3;

  const { dice, containment } = overlap(a.subtreeSet, b.subtreeSet);

  return Math.max(dice, 0.85 * containment);
};

export function contentSimilarity(a: PreparedNode, b: PreparedNode): number {
  if (a.node.media || b.node.media) return mediaSimilarity(a.node.media, b.node.media);

  if (a.text && b.text) return compareText(a.features, b.features);

  if (a.text || b.text) return 0.08;

  return containerSimilarity(a, b);
}

export function geometrySimilarity(a: PreparedNode, b: PreparedNode): number {
  const from = centreOf(a.node);
  const to = centreOf(b.node);
  const position = Math.exp(-Math.hypot(from.x - to.x, from.y - to.y) / 0.25);

  const stretch =
    logRatio(a.node.width + SIZE_EPSILON, b.node.width + SIZE_EPSILON) +
    logRatio(a.node.height + SIZE_EPSILON, b.node.height + SIZE_EPSILON);
  const size = Math.exp(-stretch / 1.5);

  return 0.6 * position + 0.4 * size;
}

export function colorSimilarity(p: Rgba | undefined, q: Rgba | undefined): number {
  if (!p || !q) return p === q ? 1 : UNKNOWN;

  const alpha = p[3];
  const distance = Math.hypot((p[0] - q[0]) * alpha, (p[1] - q[1]) * alpha, (p[2] - q[2]) * alpha, (p[3] - q[3]) * 255);

  return 1 - Math.min(1, distance / COLOR_RANGE);
}

const fontSizeSimilarity = (p: number, q: number) => Math.exp(-logRatio(p, q) * 2);

const fontWeightSimilarity = (p: number, q: number) => 1 - Math.min(1, Math.abs(p - q) / 500);

const radiusSimilarity = (p: number, q: number) => Math.exp(-Math.abs(Math.min(p, RADIUS_CAP) - Math.min(q, RADIUS_CAP)) / 8);

export function styleSimilarity(a: PreparedNode, b: PreparedNode): number {
  const p = a.node;
  const q = b.node;

  const scores = {
    color: colorSimilarity(p.color, q.color),
    background: colorSimilarity(p.background, q.background),
    fontSize: whenBoth(p.fontSize || undefined, q.fontSize || undefined, fontSizeSimilarity),
    fontWeight: whenBoth(p.fontWeight || undefined, q.fontWeight || undefined, fontWeightSimilarity),
    radius: whenBoth(p.radius, q.radius, radiusSimilarity),
  };

  const weighted = (Object.keys(STYLE_WEIGHTS) as (keyof typeof STYLE_WEIGHTS)[]).reduce(
    (total, key) => total + STYLE_WEIGHTS[key] * scores[key],
    0,
  );

  return weighted / STYLE_TOTAL;
}

export function baseSimilarity(a: PreparedNode, b: PreparedNode, style = styleSimilarity(a, b)): number {
  const kind = kindSimilarity(a.node.kind, b.node.kind);
  const content = contentSimilarity(a, b);
  const gate = 0.35 + 0.65 * Math.min(1, content / 0.6);
  const looks = (WEIGHTS.geometry * geometrySimilarity(a, b) + WEIGHTS.style * style) * gate;
  const score = WEIGHTS.kind * kind + WEIGHTS.content * content + looks;

  return kind < IMPLAUSIBLE_KIND ? score * 0.5 : score;
}
