/**
 * A small builder for benchmark pages: nested elements with boxes in pixels and a hidden
 * ground-truth key. The matcher only ever sees the `MatchNode`s; the keys are for scoring.
 *
 * Keys:
 *   "k"        this element is k (the same k on both pages is the same element)
 *   "from:k"   (new page) one of the parts old element k split into
 *   "into:k"   (old page) one of the parts that merged into new element k
 */
import type { MatchNode, NodeKind, Rgba } from "../nodes";

export type Rect = readonly [x: number, y: number, width: number, height: number];

export interface Style {
  color?: Rgba;
  background?: Rgba;
  fontSize?: number;
  fontWeight?: number;
  radius?: number;
}

export interface Element {
  key: string;
  kind: NodeKind;
  text: string;
  media?: string;
  rect: Rect;
  style: Style;
  children: Element[];
}

const TEXT: Style = { color: [20, 27, 38, 1], fontSize: 15, fontWeight: 400 };
const HEADING: Style = { color: [20, 27, 38, 1], fontSize: 24, fontWeight: 700 };
const CONTROL: Style = { color: [255, 255, 255, 1], background: [14, 124, 114, 1], fontSize: 14, fontWeight: 600, radius: 8 };
const BOX: Style = { background: [255, 255, 255, 1], radius: 12 };

export const box = (key: string, rect: Rect, children: Element[] = [], style: Style = {}): Element => ({
  key,
  kind: "box",
  text: "",
  rect,
  style: { ...BOX, ...style },
  children,
});
export const text = (key: string, value: string, rect: Rect, style: Style = {}): Element => ({
  key,
  kind: "text",
  text: value,
  rect,
  style: { ...TEXT, ...style },
  children: [],
});
export const heading = (key: string, value: string, rect: Rect, style: Style = {}): Element => ({
  key,
  kind: "heading",
  text: value,
  rect,
  style: { ...HEADING, ...style },
  children: [],
});
export const control = (key: string, value: string, rect: Rect, style: Style = {}): Element => ({
  key,
  kind: "control",
  text: value,
  rect,
  style: { ...CONTROL, ...style },
  children: [],
});
export const media = (key: string, id: string, rect: Rect): Element => ({
  key,
  kind: "media",
  text: "",
  media: id,
  rect,
  style: {},
  children: [],
});

export interface Page {
  nodes: MatchNode[];
  /** Ground-truth key of each node, by index. */
  keys: string[];
}

/** Flatten elements into a node list (parents first), measuring boxes in units of `width`. */
export function page(width: number, roots: Element[]): Page {
  const nodes: MatchNode[] = [];
  const keys: string[] = [];
  const visit = (el: Element, parent: number) => {
    const [x, y, w, h] = el.rect;
    const index = nodes.length;
    nodes.push({
      kind: el.kind,
      text: el.text,
      ...(el.media === undefined ? {} : { media: el.media }),
      x: x / width,
      y: y / width,
      width: w / width,
      height: h / width,
      parent,
      ...el.style,
    });
    keys.push(el.key);
    for (const child of el.children) visit(child, index);
  };
  for (const root of roots) visit(root, -1);
  return { nodes, keys };
}

/** The correct relations between two pages, as "i>j" strings (including parts of splits and merges). */
export function truth(a: Page, b: Page): Set<string> {
  const indexA = new Map<string, number>();
  const indexB = new Map<string, number>();
  a.keys.forEach((k, i) => indexA.set(k, i));
  b.keys.forEach((k, j) => indexB.set(k, j));
  const relations = new Set<string>();
  for (const [k, i] of indexA) {
    const j = indexB.get(k);
    if (j !== undefined) relations.add(`${i}>${j}`);
  }
  b.keys.forEach((k, j) => {
    const i = k.startsWith("from:") ? indexA.get(k.slice(5)) : undefined;
    if (i !== undefined) relations.add(`${i}>${j}`);
  });
  a.keys.forEach((k, i) => {
    const j = k.startsWith("into:") ? indexB.get(k.slice(5)) : undefined;
    if (j !== undefined) relations.add(`${i}>${j}`);
  });
  return relations;
}
