import { normalizeText, textFeatures, tokenize, type TextFeatures } from "./text";

/** What sort of thing an element is, as a person would perceive it. */
export type NodeKind = "heading" | "text" | "control" | "media" | "box";

/** A colour as [red, green, blue, alpha], with channels 0–255 and alpha 0–1. */
export type Rgba = readonly [number, number, number, number];

export interface MatchNode {
  kind: NodeKind;
  /** Visible text, or the accessible label for things like icon buttons. */
  text: string;
  /** An identity for an image or icon, such as a hash of its source. */
  media?: string;
  /** The element's box relative to the root, divided by the root's width, so different screen sizes compare. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Index of the nearest ancestor in the same list, or -1. */
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

export interface PreparedNode {
  node: MatchNode;
  index: number;
  text: string;
  tokens: string[];
  subtree: string[];
  subtreeSet: Set<string>;
  features: TextFeatures;
  significant: string[];
  significantSet: Set<string>;
  children: number[];
  hasContent: boolean;
}

const DIGIT = /\d/;

const isSignificant = (token: string) => token.length >= 2 || DIGIT.test(token);

function checkParent(node: MatchNode, index: number) {
  if (!Number.isInteger(node.parent) || node.parent < -1 || node.parent >= index) {
    throw new RangeError(`match: node ${index} has parent ${node.parent}; parents must come before children`);
  }
}

function prepareOne(node: MatchNode, index: number): PreparedNode {
  checkParent(node, index);

  const text = normalizeText(node.text);
  const tokens = tokenize(text);
  const significant = tokens.filter(isSignificant);

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
}

export function prepare(nodes: readonly MatchNode[]): PreparedNode[] {
  const prepared = nodes.map(prepareOne);

  for (const entry of prepared) {
    if (entry.node.parent >= 0) prepared[entry.node.parent]!.children.push(entry.index);
  }

  for (const entry of [...prepared].reverse()) {
    const own = entry.node.media ? [...entry.tokens, `#${entry.node.media}`] : entry.tokens;
    const inside = entry.children.flatMap((child) => prepared[child]!.subtree);
    const subtree = new Set([...own, ...inside]);

    entry.subtree = [...subtree];
    entry.subtreeSet = subtree;
  }

  return prepared;
}

export function ancestors(nodes: readonly PreparedNode[], index: number, limit = 3): number[] {
  const found: number[] = [];

  for (let parent = nodes[index]!.node.parent; parent >= 0 && found.length < limit; parent = nodes[parent]!.node.parent) {
    found.push(parent);
  }

  return found;
}

export function descendants(nodes: readonly PreparedNode[], index: number): number[] {
  const found: number[] = [];
  const stack = [...nodes[index]!.children];

  while (stack.length > 0) {
    const child = stack.pop()!;

    found.push(child);
    stack.push(...nodes[child]!.children);
  }

  return found;
}
