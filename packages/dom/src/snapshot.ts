import type { MatchNode, NodeKind } from "@remold-ui/core";
import { parseColor } from "./snapshot/color";

export { parseColor } from "./snapshot/color";

/** A box in viewport pixels, as `getBoundingClientRect` reports it. */
export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageSnapshot {
  /** One entry per kept element, parents before children. */
  nodes: MatchNode[];
  /** The element behind each node, by index. */
  elements: HTMLElement[];
  /** Each element's box in viewport pixels at the time of reading, by index. */
  boxes: PixelBox[];
}

/** Elements with this attribute (and everything inside) are ignored. */
export const IGNORE_ATTRIBUTE = "data-rm-ignore";

/** An element's media identity, in place of one read from its content. */
export const MEDIA_ATTRIBUTE = "data-rm-media";

export const morphedText = new WeakMap<Element, HTMLElement>();

const PHRASING = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "SMALL",
  "CODE",
  "A",
  "SPAN",
  "MARK",
  "ABBR",
  "TIME",
  "SUB",
  "SUP",
  "BR",
  "KBD",
  "S",
  "U",
]);
const CONTROL = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"]);
const CONTROL_ROLES = new Set(["button", "switch", "tab", "link", "checkbox", "radio", "menuitem", "option"]);
const MEDIA = new Set(["IMG", "SVG", "CANVAS", "VIDEO", "PICTURE", "IFRAME"]);

/** A short, stable fingerprint of a string (FNV-1a), used as a media identity. */
export function fingerprint(value: string): string {
  let h = 2166136261;

  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

function mediaIdentity(el: Element, style: CSSStyleDeclaration): string {
  const own = el.getAttribute(MEDIA_ATTRIBUTE);
  if (own) return fingerprint(own);

  const tag = el.tagName.toUpperCase();

  if (tag === "IMG") {
    const img = el as HTMLImageElement;

    return fingerprint(img.currentSrc || img.src);
  }
  if (tag === "SVG") return fingerprint(collapse(el.innerHTML));

  if (tag === "VIDEO") return fingerprint((el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).poster);

  if (style.backgroundImage.includes("url(")) return fingerprint(style.backgroundImage);

  return fingerprint(tag);
}

function isPainted(style: CSSStyleDeclaration): boolean {
  const background = parseColor(style.backgroundColor);
  const borderWidth =
    (Number.parseFloat(style.borderTopWidth) || 0) +
    (Number.parseFloat(style.borderRightWidth) || 0) +
    (Number.parseFloat(style.borderBottomWidth) || 0) +
    (Number.parseFloat(style.borderLeftWidth) || 0);
  const border = borderWidth > 0 && parseColor(style.borderTopColor)[3] + parseColor(style.borderLeftColor)[3] > 0.05;
  const shadow = Boolean(style.boxShadow) && style.boxShadow !== "none";

  return background[3] > 0.04 || border || shadow;
}

function ownText(el: Element): { text: string; coversChildren: boolean } {
  const reader = morphedText.get(el);

  if (reader) return { text: collapse(reader.textContent ?? ""), coversChildren: true };

  const tag = el.tagName.toUpperCase();

  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    const field = el as HTMLInputElement;

    return {
      text: collapse(field.value || field.placeholder || ""),
      coversChildren: true,
    };
  }
  let direct = "";

  for (const n of el.childNodes) if (n.nodeType === 3) direct += n.textContent ?? "";
  const children = [...el.children];
  const inlineOnly =
    children.length > 0 &&
    children.every((c) => {
      if (!PHRASING.has(c.tagName.toUpperCase())) return false;
      const s = getComputedStyle(c);
      return !isPainted(s) && (s.display === "" || s.display.startsWith("inline"));
    });
  if (inlineOnly && collapse(direct)) return { text: collapse(el.textContent ?? ""), coversChildren: true };

  return { text: collapse(direct), coversChildren: false };
}

const MIN_AREA = 4;
const HEADING = /^H[1-6]$/;

const isHidden = (style: CSSStyleDeclaration) =>
  style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) === 0;

interface Frame {
  left: number;
  top: number;
  unit: number;
}

interface Reading {
  isMedia: boolean;
  coversChildren: boolean;
  keep: boolean;
  rect: DOMRect;
  node: (parent: number, frame: Frame) => MatchNode;
}

function kindOf(tag: string, role: string, isMedia: boolean, isControl: boolean, shown: string): NodeKind {
  if (isMedia) return "media";

  if (HEADING.test(tag) || role === "heading") return "heading";

  if (isControl) return "control";

  return shown ? "text" : "box";
}

function readElement(element: Element, style: CSSStyleDeclaration): Reading {
  const tag = element.tagName.toUpperCase();
  const isMedia = MEDIA.has(tag) || style.backgroundImage.includes("url(");
  const role = element.getAttribute("role") ?? "";
  const isControl = CONTROL.has(tag) || CONTROL_ROLES.has(role);
  const { text, coversChildren } = isMedia ? { text: "", coversChildren: true } : ownText(element);
  const rect = element.getBoundingClientRect();
  const keep = rect.width * rect.height >= MIN_AREA && (text !== "" || isMedia || isControl || isPainted(style));

  const node = (parent: number, { left, top, unit }: Frame): MatchNode => {
    const label = collapse(element.getAttribute("aria-label") ?? element.getAttribute("alt") ?? "");
    const shown = text || (isControl || isMedia ? label : "");

    return {
      kind: kindOf(tag, role, isMedia, isControl, shown),
      text: shown,
      ...(isMedia ? { media: mediaIdentity(element, style) } : {}),
      x: (rect.left - left) / unit,
      y: (rect.top - top) / unit,
      width: rect.width / unit,
      height: rect.height / unit,
      parent,
      color: parseColor(style.color),
      background: parseColor(style.backgroundColor),
      fontSize: Number.parseFloat(style.fontSize) || 16,
      fontWeight: Number.parseFloat(style.fontWeight) || 400,
      radius: drawnRadius(element as HTMLElement, style, rect.width, rect.height),
    };
  };

  return { isMedia, coversChildren, keep, rect, node };
}

/** Read the perceivable elements inside `root`. */
export function readNodes(root: Element): PageSnapshot {
  const nodes: MatchNode[] = [];
  const elements: HTMLElement[] = [];
  const boxes: PixelBox[] = [];
  const rootBox = root.getBoundingClientRect();
  const frame: Frame = { left: rootBox.left, top: rootBox.top, unit: rootBox.width || 1 };

  const visit = (element: Element, parent: number) => {
    if (element.hasAttribute(IGNORE_ATTRIBUTE)) return;

    const style = getComputedStyle(element);

    if (isHidden(style)) return;

    const reading = readElement(element, style);
    const self = reading.keep ? nodes.length : parent;

    if (reading.keep) {
      const { rect } = reading;

      nodes.push(reading.node(parent, frame));
      elements.push(element as HTMLElement);
      boxes.push({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    }

    if (reading.isMedia || reading.coversChildren) return;

    for (const child of element.children) visit(child, self);
  };

  for (const child of root.children) visit(child, -1);

  return { nodes, elements, boxes };
}

function drawnRadius(el: HTMLElement, style: CSSStyleDeclaration, rectWidth: number, rectHeight: number): number {
  const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
  const width = el.offsetWidth || rectWidth;
  const height = el.offsetHeight || rectHeight;

  if (!radius || !width || !height) return radius;

  return Math.min(radius, width / 2, height / 2);
}
