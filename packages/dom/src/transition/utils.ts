import { value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import type { PixelBox } from "../snapshot";

export type MotionMode = "box" | "text" | "enter";

export interface MotionChannels {
  x?: AnimatedValue;
  y?: AnimatedValue;
  width?: AnimatedValue;
  height?: AnimatedValue;
  scale?: AnimatedValue;
  radius?: AnimatedValue;
  opacity?: AnimatedValue;
  rise?: AnimatedValue;
}

export interface MotionRecord {
  el: HTMLElement;
  mode: MotionMode;
  layout: PixelBox;
  visual: PixelBox;
  channels: MotionChannels;
  origin: { x: number; y: number };
  zoom: number;
  anchor: MotionRecord | null;
  depth: number;
  saved: Record<"translate" | "scale" | "opacity" | "borderRadius" | "boxShadow", string>;
  /**
   * The element's box-shadow split around its lengths, so they can be divided by the scale each
   * frame: otherwise a 1px ring or border-like shadow thins to nothing while the box is squeezed.
   */
  shadow: ShadowTemplate | null;
  marks: string[];
  /** Seconds this element holds where it starts before it moves, when the change is choreographed. */
  delay: number;
}

/** A box-shadow as text pieces and the pixel lengths between them: `[text, px, text, px, …, text]`. */
export interface ShadowTemplate {
  text: string[];
  lengths: number[];
}

const LENGTH = /(-?\d*\.?\d+)px/g;

/** Splits a computed box-shadow around its pixel lengths; `null` when there's nothing to correct. */
export function parseShadow(value: string): ShadowTemplate | null {
  if (!value || value === "none") return null;

  const text: string[] = [];
  const lengths: number[] = [];
  let last = 0;

  for (const m of value.matchAll(LENGTH)) {
    text.push(value.slice(last, m.index));
    lengths.push(Number.parseFloat(m[1]!));
    last = m.index! + m[0].length;
  }
  text.push(value.slice(last));

  return lengths.some((n) => n !== 0) ? { text, lengths } : null;
}

/** The shadow with every length divided by `scale`, so it looks the same size on the scaled box. */
export function scaledShadow(template: ShadowTemplate, scale: number): string {
  let out = template.text[0]!;

  for (let i = 0; i < template.lengths.length; i++) {
    out += `${(template.lengths[i]! / scale).toFixed(3)}px${template.text[i + 1]!}`;
  }
  return out;
}

export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function createChannel({
  from,
  to,
  spring,
  precision,
  velocity = 0,
}: {
  from: number;
  to: number;
  spring: SpringConfig;
  precision: number;
  velocity?: number;
}): AnimatedValue {
  const animation = value(from, { spring, precision });
  animation.to(to, { velocity });
  return animation;
}

export function snapshotClones(root: Element): Map<Element, Element> {
  const clones = new Map<Element, Element>();
  const copy = root.cloneNode(true) as Element;
  const stack: [Element, Element][] = [[root, copy]];
  while (stack.length > 0) {
    const [original, clone] = stack.pop()!;
    clones.set(original, clone);
    for (let index = 0; index < original.children.length && index < clone.children.length; index++) {
      stack.push([original.children[index]!, clone.children[index]!]);
    }
  }
  return clones;
}

export function parseOrigin({ element, box }: { element: HTMLElement; box: PixelBox }): { x: number; y: number } {
  const [originX, originY] = getComputedStyle(element)
    .transformOrigin.split(" ")
    .map((value) => Number.parseFloat(value));
  return {
    x: Number.isFinite(originX) ? originX! : box.width / 2,
    y: Number.isFinite(originY) ? originY! : box.height / 2,
  };
}

export function containerScale(root: HTMLElement): number {
  const layoutWidth = root.offsetWidth;
  const scale = layoutWidth > 0 ? root.getBoundingClientRect().width / layoutWidth : 1;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function depthOf({ element, root }: { element: Element; root: Element }): number {
  let depth = 0;
  for (let parent = element.parentElement; parent && parent !== root; parent = parent.parentElement) depth++;
  return depth;
}

export function allChannels(channels: MotionChannels): AnimatedValue[] {
  return Object.values(channels) as AnimatedValue[];
}

export function computeVisual(record: MotionRecord): void {
  const { channels, layout } = record;
  if (record.mode === "box") {
    record.visual = {
      x: channels.x!.current,
      y: channels.y!.current,
      width: Math.max(0.5, channels.width!.current),
      height: Math.max(0.5, channels.height!.current),
    };
    return;
  }
  if (record.mode === "text") {
    const scale = Math.max(0.02, channels.scale!.current);
    record.visual = {
      x: channels.x!.current,
      y: channels.y!.current,
      width: layout.width * scale,
      height: layout.height * scale,
    };
    return;
  }
  const anchor = record.anchor;
  const x = anchor ? anchor.visual.x + ((layout.x - anchor.layout.x) * anchor.visual.width) / Math.max(0.5, anchor.layout.width) : layout.x;
  const y = anchor
    ? anchor.visual.y + ((layout.y - anchor.layout.y) * anchor.visual.height) / Math.max(0.5, anchor.layout.height)
    : layout.y;
  record.visual = {
    x,
    y: y + (channels.rise?.current ?? 0),
    width: layout.width,
    height: layout.height,
  };
}

export function applyRecord(record: MotionRecord): void {
  const layout = record.layout;
  const visual = record.visual;
  let localVisual = visual;
  const anchor = record.anchor;
  if (anchor) {
    const scaleX = anchor.layout.width / anchor.visual.width;
    const scaleY = anchor.layout.height / anchor.visual.height;
    localVisual = {
      x: anchor.layout.x + (visual.x - anchor.visual.x) * scaleX,
      y: anchor.layout.y + (visual.y - anchor.visual.y) * scaleY,
      width: visual.width * scaleX,
      height: visual.height * scaleY,
    };
  }
  const scaleX = localVisual.width / Math.max(0.5, layout.width);
  const scaleY = localVisual.height / Math.max(0.5, layout.height);
  const translateX = (localVisual.x - layout.x - record.origin.x * record.zoom * (1 - scaleX)) / record.zoom;
  const translateY = (localVisual.y - layout.y - record.origin.y * record.zoom * (1 - scaleY)) / record.zoom;
  const style = record.el.style;
  const isIdentity =
    Math.abs(translateX) < 0.01 && Math.abs(translateY) < 0.01 && Math.abs(scaleX - 1) < 1e-4 && Math.abs(scaleY - 1) < 1e-4;
  if (isIdentity) {
    style.translate = record.saved.translate;
    style.scale = record.saved.scale;
  } else {
    style.translate = `${translateX.toFixed(2)}px ${translateY.toFixed(2)}px`;
    style.scale = `${scaleX.toFixed(4)} ${scaleY.toFixed(4)}`;
  }
  if (record.channels.radius) {
    const radius = Math.max(0, record.channels.radius.current);
    style.borderRadius = `${((radius * layout.width) / visual.width).toFixed(2)}px / ${((radius * layout.height) / visual.height).toFixed(
      2,
    )}px`;
  }
  if (record.shadow) {
    const scale = Math.sqrt(Math.max(1e-3, scaleX) * Math.max(1e-3, scaleY));
    style.boxShadow = isIdentity ? record.saved.boxShadow : scaledShadow(record.shadow, scale);
  }
  if (record.channels.opacity) style.opacity = Math.min(1, Math.max(0, record.channels.opacity.current)).toFixed(3);
}

export function restoreRecord(record: MotionRecord): void {
  const style = record.el.style;
  style.translate = record.saved.translate;
  style.scale = record.saved.scale;
  style.opacity = record.saved.opacity;
  style.borderRadius = record.saved.borderRadius;
  style.boxShadow = record.saved.boxShadow;
  for (const mark of record.marks) record.el.removeAttribute(mark);
}

/** Pixels a record has to travel: how far its box moves plus how much it grows or shrinks. */
export function travelOf(record: MotionRecord): number {
  const c = record.channels;
  const gap = (v?: AnimatedValue) => (v ? Math.abs(v.target - v.current) : 0);
  return Math.hypot(gap(c.x), gap(c.y)) + Math.max(gap(c.width), gap(c.height));
}

/** Moving less than this is a nudge, not a flight: nothing is lifted for it. */
const LIFT_FROM = 12;

/**
 * Raises elements above their neighbours while they fly, farthest on top, and returns a function
 * that puts everything back. Every element between a mover and the root is raised too: a parent
 * that is positioned, or animating (a stacking context while it moves), would otherwise keep the
 * child under that parent's siblings. z-index only works on positioned boxes and flex or grid
 * items, so a plain block is made `position: relative` (which doesn't move it), unless something
 * absolutely positioned inside would then be placed against it instead.
 */
export function liftMovers(ordered: readonly MotionRecord[], root: HTMLElement): () => void {
  const movers = ordered
    .filter((r) => r.mode === "box" && travelOf(r) > LIFT_FROM)
    .sort((p, q) => travelOf(p) - travelOf(q));
  const levels = new Map<HTMLElement, number>();
  movers.forEach((record, rank) => {
    for (let el: HTMLElement | null = record.el; el && el !== root; el = el.parentElement) {
      levels.set(el, Math.max(levels.get(el) ?? 0, rank + 1));
    }
  });
  const touched: { el: HTMLElement; zIndex: string; position: string }[] = [];
  for (const [el, level] of levels) {
    const style = getComputedStyle(el);
    const own = Number.parseInt(style.zIndex, 10);
    if (Number.isFinite(own) && own >= level) continue;
    let position = el.style.position;
    if (!style.position || style.position === "static") {
      const parent = el.parentElement ? getComputedStyle(el.parentElement).display : "";
      if (!/flex|grid/.test(parent)) {
        if (holdsPlacedChildren(el)) continue;
        position = "relative";
      }
    }
    touched.push({ el, zIndex: el.style.zIndex, position: el.style.position });
    el.style.position = position;
    el.style.zIndex = String(level);
  }
  return () => {
    for (const t of touched) {
      t.el.style.zIndex = t.zIndex;
      t.el.style.position = t.position;
    }
    touched.length = 0;
  };
}

/** True when something inside is placed against its nearest positioned ancestor (checked shallowly). */
function holdsPlacedChildren(el: Element): boolean {
  const all = el.getElementsByTagName("*");
  const limit = Math.min(all.length, 300);
  for (let i = 0; i < limit; i++) {
    const position = getComputedStyle(all[i]!).position;
    if (position === "absolute") return true;
  }
  return all.length > limit;
}
