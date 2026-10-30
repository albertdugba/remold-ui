/**
 * Reading the page: turn the elements a person would perceive into `MatchNode`s for the matcher.
 *
 * Kept: anything with its own text, media (images, SVG, canvas, video, background images),
 * controls, and painted boxes (a background, border or shadow). Invisible wrappers are skipped,
 * and their children are attached to the nearest kept ancestor instead.
 */
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

/**
 * Elements whose letters `morphText` animates, mapped to the hidden span holding their current text.
 * They're read as one piece of text, and their letter spans are left to the morph.
 */
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

/** The element's own visible text, and whether that text already covers all its children. */
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
  // "Total: <b>€154</b>" reads as one piece of text, so inline children with no paint of their
  // own are folded into the parent.
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

/**
 * Read the perceivable elements inside `root`. Positions are measured from the root's top-left
 * and divided by the root's width, so differently sized layouts are comparable.
 */
export function readNodes(root: Element): PageSnapshot {
  const nodes: MatchNode[] = [];
  const elements: HTMLElement[] = [];
  const boxes: PixelBox[] = [];
  const rootBox = root.getBoundingClientRect();
  const unit = rootBox.width || 1;

  const visit = (el: Element, parent: number) => {
    if (el.hasAttribute(IGNORE_ATTRIBUTE)) return;

    const style = getComputedStyle(el);
    // parseFloat, not Number: an empty value must not read as fully transparent.
    if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) === 0) return;

    const tag = el.tagName.toUpperCase();
    const isMedia = MEDIA.has(tag) || style.backgroundImage.includes("url(");
    const role = el.getAttribute("role") ?? "";
    const isControl = CONTROL.has(tag) || CONTROL_ROLES.has(role);
    const { text, coversChildren } = isMedia ? { text: "", coversChildren: true } : ownText(el);
    const label = collapse(el.getAttribute("aria-label") ?? el.getAttribute("alt") ?? "");
    const rect = el.getBoundingClientRect();
    const visible = rect.width * rect.height >= 4;
    const keep = visible && (text !== "" || isMedia || isControl || isPainted(style));

    let self = parent;

    if (keep) {
      const heading = /^H[1-6]$/.test(tag) || role === "heading";
      // A label names a control or an image. On a container (a section called "Now playing") it's a
      // landmark for screen readers, not content: the container stays a box, so it can be matched as one.
      const shown = text || (isControl || isMedia ? label : "");
      const kind: NodeKind = isMedia ? "media" : heading ? "heading" : isControl ? "control" : shown ? "text" : "box";

      self = nodes.length;
      nodes.push({
        kind,
        text: shown,
        ...(isMedia ? { media: mediaIdentity(el, style) } : {}),
        x: (rect.left - rootBox.left) / unit,
        y: (rect.top - rootBox.top) / unit,
        width: rect.width / unit,
        height: rect.height / unit,
        parent,
        color: parseColor(style.color),
        background: parseColor(style.backgroundColor),
        fontSize: Number.parseFloat(style.fontSize) || 16,
        fontWeight: Number.parseFloat(style.fontWeight) || 400,
        radius: drawnRadius(el as HTMLElement, style, rect.width, rect.height),
      });
      elements.push(el as HTMLElement);
      boxes.push({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    // Media and folded text are leaves: what's inside them is already accounted for.
    if (isMedia || coversChildren) return;

    for (const child of el.children) visit(child, self);
  };

  for (const child of root.children) visit(child, -1);

  return { nodes, elements, boxes };
}

/**
 * The corner radius as drawn. CSS shrinks a radius that's too big for the box (`rounded-full` is
 * 9999px), so the written value would make a pill spring from 9999 and only show a corner at the
 * very end. Clamped to half the box's own size, like the browser does.
 */
function drawnRadius(el: HTMLElement, style: CSSStyleDeclaration, rectWidth: number, rectHeight: number): number {
  const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
  // offsetWidth ignores transforms (a box caught mid-flight); the measured box is the fallback.
  const width = el.offsetWidth || rectWidth;
  const height = el.offsetHeight || rectHeight;

  if (!radius || !width || !height) return radius;

  return Math.min(radius, width / 2, height / 2);
}
