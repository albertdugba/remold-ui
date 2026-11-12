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
  keys: string[];
}

export function page(width: number, roots: Element[]): Page {
  const nodes: MatchNode[] = [];
  const keys: string[] = [];
  const visit = (element: Element, parent: number) => {
    const [x, y, boxWidth, boxHeight] = element.rect;
    const index = nodes.length;

    nodes.push({
      kind: element.kind,
      text: element.text,
      ...(element.media === undefined ? {} : { media: element.media }),
      x: x / width,
      y: y / width,
      width: boxWidth / width,
      height: boxHeight / width,
      parent,
      ...element.style,
    });
    keys.push(element.key);
    for (const child of element.children) visit(child, index);
  };

  for (const root of roots) visit(root, -1);

  return { nodes, keys };
}

const indexByKey = (keys: readonly string[]) => new Map(keys.map((key, index) => [key, index]));

const partOf = (key: string, prefix: string) => (key.startsWith(prefix) ? key.slice(prefix.length) : undefined);

export function truth(a: Page, b: Page): Set<string> {
  const indexA = indexByKey(a.keys);
  const indexB = indexByKey(b.keys);

  const same = [...indexA].flatMap(([key, from]) => {
    const to = indexB.get(key);

    return to === undefined ? [] : [`${from}>${to}`];
  });

  const splits = b.keys.flatMap((key, to) => {
    const whole = partOf(key, "from:");
    const from = whole === undefined ? undefined : indexA.get(whole);

    return from === undefined ? [] : [`${from}>${to}`];
  });

  const merges = a.keys.flatMap((key, from) => {
    const whole = partOf(key, "into:");
    const to = whole === undefined ? undefined : indexB.get(whole);

    return to === undefined ? [] : [`${from}>${to}`];
  });

  return new Set([...same, ...splits, ...merges]);
}
