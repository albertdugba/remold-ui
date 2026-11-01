/**
 * Turning a piece of the page into dots.
 *
 * The element is painted onto a scratch canvas as it looks (its background boxes, its text and
 * its images, each where the browser laid it out), and that picture is sampled like any image.
 * With a palette, every dot keeps the colour it was sampled from, so a red icon stays red and grey
 * text stays grey when the row breaks apart.
 */
import type { CloudPoint, SampleOptions } from "@remold-ui/core";
import { resolveColors } from "./css-colors";
import { createScratchContext, sampleImagePoints } from "./sampling";

export interface ElementSampleOptions extends SampleOptions {
  /**
   * Measure from this element, in its CSS pixels: usually the box an overlay canvas covers, so the
   * dots land on the element beneath them. Default: the element itself.
   */
  relativeTo?: Element;
  /** Colours to sort dots into, as tones: any CSS colours, `var(--name)` included. Use the same palette with `particles()`. */
  palette?: readonly string[];
  /** Canvas pixels per CSS pixel to draw at. More gives cleaner small text. Default 2. */
  resolution?: number;
  /**
   * Whether the element's own background becomes dots too. Turn it off for a row or a card that's
   * the same colour as what it sits on, so only what's drawn on it breaks apart. Default true.
   */
  background?: boolean;
}

/**
 * Points over `element` as it looks: its background boxes, text and images, in place. They come
 * back in `relativeTo`'s CSS pixels, corrected for any CSS transform scaling the page around it.
 * Opacity is ignored, so an element can be faded out the moment its dots take over; `display:
 * none` and `visibility: hidden` parts are left out. So are images from other origins that don't
 * allow it, since the canvas can't read them.
 */
export function sampleElementPoints(element: Element, options: ElementSampleOptions = {}): CloudPoint[] {
  const origin = (options.relativeTo ?? element).getBoundingClientRect();
  const own = element.getBoundingClientRect();
  const relativeTo = options.relativeTo ?? element;
  // Client rects shrink with a scaled ancestor; layout sizes don't. Their ratio undoes the scale.
  const scale = relativeTo instanceof HTMLElement && relativeTo.offsetWidth > 0 && origin.width > 0 ? relativeTo.offsetWidth / origin.width : 1;
  const resolution = options.resolution ?? 2;
  if (!(resolution > 0)) throw new RangeError(`sampleElementPoints: resolution must be positive, got ${resolution}`);
  const width = Math.ceil(own.width * scale * resolution);
  const height = Math.ceil(own.height * scale * resolution);
  if (width === 0 || height === 0) return [];

  const painting = { element, own, ratio: scale * resolution, width, height, background: options.background ?? true };
  let context = paint({ ...painting, images: true });
  try {
    context.getImageData(0, 0, 1, 1);
  } catch {
    // A cross-origin image tainted the canvas. Paint again without images.
    context = paint({ ...painting, images: false });
  }

  const { relativeTo: _, resolution: __, background: ___, palette, ...sample } = options;
  const left = (own.left - origin.left) * scale;
  const top = (own.top - origin.top) * scale;
  return sampleImagePoints(context.canvas, { ...sample, palette: palette && resolveColors(palette, relativeTo) }).map((p) => ({
    ...p,
    x: left + p.x / resolution,
    y: top + p.y / resolution,
  }));
}

function paint({
  element,
  own,
  ratio,
  width,
  height,
  images,
  background,
}: {
  element: Element;
  own: DOMRect;
  ratio: number;
  width: number;
  height: number;
  images: boolean;
  background: boolean;
}): CanvasRenderingContext2D {
  const context = createScratchContext({ width, height });
  // Draw in client coordinates; the transform maps them onto the scratch canvas.
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

function unseen(element: Element): boolean {
  const style = getComputedStyle(element);
  return style.display === "none" || style.visibility === "hidden";
}

function paintBox(context: CanvasRenderingContext2D, element: Element, { images, background }: { images: boolean; background: boolean }): void {
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return;
  if (background && style.backgroundColor && !/^(transparent|rgba\(.*,\s*0\))$/.test(style.backgroundColor)) {
    context.fillStyle = style.backgroundColor;
    context.beginPath();
    context.roundRect(box.left, box.top, box.width, box.height, Math.min(Number.parseFloat(style.borderTopLeftRadius) || 0, box.width / 2, box.height / 2));
    context.fill();
  }
  if (images && element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0) {
    context.drawImage(element, box.left, box.top, box.width, box.height);
  }
}

function paintText(context: CanvasRenderingContext2D, node: Text): void {
  const parent = node.parentElement;
  if (!parent || !node.data.trim()) return;
  const style = getComputedStyle(parent);
  context.save();
  // Text cut off by its box (an ellipsis, a scroller) is cut off here too.
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

/** The text node as the lines it's laid out on, each with where it starts. */
function linesOf(node: Text): { text: string; left: number; middle: number }[] {
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = range.getClientRects();
  if (rects.length === 0) return [];
  if (rects.length === 1) {
    const rect = rects[0]!;
    return [{ text: node.data.replace(/\s+/g, " ").trim(), left: rect.left, middle: rect.top + rect.height / 2 }];
  }

  // Wrapped: walk the characters and start a new line wherever the next one drops down.
  const lines: { text: string; left: number; middle: number; top: number }[] = [];
  for (let i = 0; i < node.data.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) continue;
    const line = lines.at(-1);
    if (!line || rect.top - line.top > rect.height / 2) lines.push({ text: node.data[i]!, left: rect.left, middle: rect.top + rect.height / 2, top: rect.top });
    else line.text += node.data[i];
  }
  return lines.map(({ text, left, middle }) => ({ text: text.replace(/\s+/g, " ").trim(), left, middle }));
}

/** Where `element` sits in `relativeTo`, in `relativeTo`'s CSS pixels, undoing any scaled ancestor. */
export function boxIn(element: Element, relativeTo: Element): { x: number; y: number; width: number; height: number } {
  const outer = relativeTo.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  const k = relativeTo instanceof HTMLElement && relativeTo.offsetWidth > 0 && outer.width > 0 ? relativeTo.offsetWidth / outer.width : 1;
  return { x: (inner.left - outer.left) * k, y: (inner.top - outer.top) * k, width: inner.width * k, height: inner.height * k };
}
