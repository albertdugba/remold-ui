import type { CloudPoint, SampleOptions } from "@remold-ui/core";
import { resolveColors } from "./css-colors";
import { createScratchContext, sampleImagePoints } from "./sampling";

export interface ElementSampleOptions extends SampleOptions {
  relativeTo?: Element;
  palette?: readonly string[];
  resolution?: number;
  background?: boolean;
}

interface Painting {
  element: Element;
  own: DOMRect;
  ratio: number;
  width: number;
  height: number;
  background: boolean;
}

interface Line {
  text: string;
  left: number;
  middle: number;
}

const DEFAULT_RESOLUTION = 2;
const TRANSPARENT = /^(transparent|rgba\(.*,\s*0\))$/;
const WHITESPACE = /\s+/g;

const tidy = (text: string) => text.replace(WHITESPACE, " ").trim();

function scaleOf(relativeTo: Element, outer: DOMRect): number {
  return relativeTo instanceof HTMLElement && relativeTo.offsetWidth > 0 && outer.width > 0 ? relativeTo.offsetWidth / outer.width : 1;
}

function unseen(element: Element): boolean {
  const style = getComputedStyle(element);

  return style.display === "none" || style.visibility === "hidden";
}

function fillBackground(context: CanvasRenderingContext2D, style: CSSStyleDeclaration, box: DOMRect) {
  if (!style.backgroundColor || TRANSPARENT.test(style.backgroundColor)) return;

  const radius = Math.min(Number.parseFloat(style.borderTopLeftRadius) || 0, box.width / 2, box.height / 2);

  context.fillStyle = style.backgroundColor;
  context.beginPath();
  context.roundRect(box.left, box.top, box.width, box.height, radius);
  context.fill();
}

function paintBox(context: CanvasRenderingContext2D, element: Element, { images, background }: { images: boolean; background: boolean }): void {
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();

  if (box.width === 0 || box.height === 0) return;

  if (background) fillBackground(context, style, box);

  if (images && element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0) {
    context.drawImage(element, box.left, box.top, box.width, box.height);
  }
}

function lettersByLine(node: Text, range: Range): (Line & { top: number })[] {
  const lines: (Line & { top: number })[] = [];

  for (let index = 0; index < node.data.length; index++) {
    range.setStart(node, index);
    range.setEnd(node, index + 1);

    const rect = range.getBoundingClientRect();

    if (rect.width === 0) continue;

    const line = lines.at(-1);

    if (!line || rect.top - line.top > rect.height / 2) {
      lines.push({ text: node.data[index]!, left: rect.left, middle: rect.top + rect.height / 2, top: rect.top });
    } else {
      line.text += node.data[index];
    }
  }

  return lines;
}

function linesOf(node: Text): Line[] {
  const range = document.createRange();

  range.selectNodeContents(node);

  const rects = range.getClientRects();

  if (rects.length === 0) return [];

  if (rects.length === 1) {
    const rect = rects[0]!;

    return [{ text: tidy(node.data), left: rect.left, middle: rect.top + rect.height / 2 }];
  }

  return lettersByLine(node, range).map(({ text, left, middle }) => ({ text: tidy(text), left, middle }));
}

function paintText(context: CanvasRenderingContext2D, node: Text): void {
  const parent = node.parentElement;

  if (!parent || !node.data.trim()) return;

  const style = getComputedStyle(parent);

  context.save();

  if (style.overflow !== "visible") {
    const box = parent.getBoundingClientRect();

    context.beginPath();
    context.rect(box.left, box.top, box.width, box.height);
    context.clip();
  }

  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.fillStyle = style.color;

  if ("letterSpacing" in context && style.letterSpacing !== "normal") context.letterSpacing = style.letterSpacing;

  for (const line of linesOf(node)) context.fillText(line.text, line.left, line.middle);

  context.restore();
}

function paint({ element, own, ratio, width, height, background }: Painting, images: boolean): CanvasRenderingContext2D {
  const context = createScratchContext({ width, height });

  context.setTransform(ratio, 0, 0, ratio, -own.left * ratio, -own.top * ratio);
  context.textBaseline = "middle";

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node instanceof Element && unseen(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });

  for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) {
    if (node instanceof Text) paintText(context, node);
    else if (node instanceof Element) paintBox(context, node, { images, background: background || node !== element });
  }

  return context;
}

function paintReadable(painting: Painting): CanvasRenderingContext2D {
  const context = paint(painting, true);

  try {
    context.getImageData(0, 0, 1, 1);

    return context;
  } catch {
    return paint(painting, false);
  }
}

export function sampleElementPoints(element: Element, options: ElementSampleOptions = {}): CloudPoint[] {
  const relativeTo = options.relativeTo ?? element;
  const origin = relativeTo.getBoundingClientRect();
  const own = element.getBoundingClientRect();
  const scale = scaleOf(relativeTo, origin);
  const resolution = options.resolution ?? DEFAULT_RESOLUTION;

  if (!(resolution > 0)) throw new RangeError(`sampleElementPoints: resolution must be positive, got ${resolution}`);

  const width = Math.ceil(own.width * scale * resolution);
  const height = Math.ceil(own.height * scale * resolution);

  if (width === 0 || height === 0) return [];

  const context = paintReadable({ element, own, ratio: scale * resolution, width, height, background: options.background ?? true });
  const { relativeTo: _, resolution: __, background: ___, palette, ...sample } = options;
  const left = (own.left - origin.left) * scale;
  const top = (own.top - origin.top) * scale;
  const points = sampleImagePoints(context.canvas, { ...sample, palette: palette && resolveColors(palette, relativeTo) });

  return points.map((point) => ({ ...point, x: left + point.x / resolution, y: top + point.y / resolution }));
}

export function boxIn(element: Element, relativeTo: Element): { x: number; y: number; width: number; height: number } {
  const outer = relativeTo.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  const scale = scaleOf(relativeTo, outer);

  return { x: (inner.left - outer.left) * scale, y: (inner.top - outer.top) * scale, width: inner.width * scale, height: inner.height * scale };
}
