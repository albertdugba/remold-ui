/**
 * The feature sheet: what the matcher knows about each element.
 *
 * Plain data, so it can come from a live page (`@remold-ui/dom` builds it), a server render,
 * a canvas scene or a test. The matcher never sees ids, keys, class names or tags.
 */
import { normalizeText, textFeatures, tokenize, type TextFeatures } from "./text";

/** What sort of thing an element is, as a person would perceive it. */
export type NodeKind = "heading" | "text" | "control" | "media" | "box";

/** A colour as [red, green, blue, alpha], with channels 0–255 and alpha 0–1. */
export type Rgba = readonly [number, number, number, number];

export interface MatchNode {
  kind: NodeKind;
  /** Visible text, or the accessible label for things like icon buttons. "" if none. */
  text: string;
  /** An identity for an image or icon, such as a hash of its source. Omit if not media. */
  media?: string;
  /**
   * The element's box relative to the root, divided by the root's width, so that layouts of
   * different sizes (desktop and mobile) are comparable.
   */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Index of the nearest ancestor in the same list, or -1. Parents must come before children. */
  parent: number;
  color?: Rgba;
  background?: Rgba;
  /** In pixels. */
  fontSize?: number;
  /** 100–900. */
  fontWeight?: number;
  /** Corner radius in pixels. */
  radius?: number;
}

/** A node with everything the matcher derives from the list, computed once. */
export interface PreparedNode {
  node: MatchNode;
  index: number;
  /** Normalised text. */
  text: string;
  tokens: string[];
  /** Tokens of the node and everything inside it, plus "#media" markers. */
  subtree: string[];
  /** The same, as a set, for comparing containers. */
  subtreeSet: Set<string>;
  /** The text's comparison features, worked out once for every pair it takes part in. */
  features: TextFeatures;
  /** Tokens that identify content (2+ characters, or any with a digit), and the same as a set. */
  significant: string[];
  significantSet: Set<string>;
  children: number[];
  /** True when the node itself carries content (text or media), so it can vote for its relatives. */
  hasContent: boolean;
}

/** Check the list and derive children and subtree content. Throws on a malformed tree. */
export function prepare(nodes: readonly MatchNode[]): PreparedNode[] {
  const prepared = nodes.map((node, index): PreparedNode => {
    if (!Number.isInteger(node.parent) || node.parent < -1 || node.parent >= index) {
      throw new RangeError(`match: node ${index} has parent ${node.parent}; parents must come before children`);
    }
    const text = normalizeText(node.text);
    const tokens = tokenize(text);
    const significant = tokens.filter((t) => t.length >= 2 || /\d/.test(t));
    return {
      node,
      index,
      text,
      tokens,
      significant,
      significantSet: new Set(significant),
      subtree: [],
      subtreeSet: new Set(),
      features: textFeatures(text),
      children: [],
      hasContent: text !== "" || Boolean(node.media),
    };
  });
  for (const p of prepared) {
    if (p.node.parent >= 0) prepared[p.node.parent]!.children.push(p.index);
  }
  // Children always come after their parent, so walking backwards sees every child first.
  for (let i = prepared.length - 1; i >= 0; i--) {
    const p = prepared[i]!;
    const subtree = new Set(p.tokens);
    if (p.node.media) subtree.add(`#${p.node.media}`);
    for (const c of p.children) for (const t of prepared[c]!.subtree) subtree.add(t);
    p.subtree = [...subtree];
    p.subtreeSet = subtree;
  }
  return prepared;
}

/** Up to `limit` ancestors, nearest first. */
export function ancestors(nodes: readonly PreparedNode[], index: number, limit = 3): number[] {
  const out: number[] = [];
  let p = nodes[index]!.node.parent;
  while (p >= 0 && out.length < limit) {
    out.push(p);
    p = nodes[p]!.node.parent;
  }
  return out;
}

/** Every node inside `index`, at any depth. */
export function descendants(nodes: readonly PreparedNode[], index: number): number[] {
  const out: number[] = [];
  const stack = [...nodes[index]!.children];
  while (stack.length > 0) {
    const c = stack.pop()!;
    out.push(c);
    stack.push(...nodes[c]!.children);
  }
  return out;
}
