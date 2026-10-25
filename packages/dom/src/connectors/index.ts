/**
 * Connectors: lines between elements that stay attached while the elements move.
 *
 * Mark an element with `data-rm-anchor="id"`, and mark another with `data-rm-link="id"` to draw
 * a line from the anchor to it: a folder to each file inside, a comment to each reply. The lines
 * live in an SVG laid over the content and are rebuilt every frame from where the elements are
 * on screen right now, so they follow a `transition()` (or anything else) the whole way instead
 * of jumping at the end. A new line draws itself in; a line whose element leaves draws itself
 * back out from where it last was.
 *
 * Each line can also say, on the linked element, where it leaves and arrives
 * (`data-rm-from-side`, `data-rm-to-side`), carry a label (`data-rm-label`) and an arrowhead
 * (`data-rm-arrow`), and send pulses along itself (`data-rm-pulse`: `"loop"` for a steady flow,
 * or any other value to send one pulse each time the value changes, after `data-rm-pulse-delay`
 * seconds).
 */
import { parsePath, pointAt, springs, toCubics, value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import { resolveReducedMotion, type ReducedMotion } from "../accessibility";
import { IGNORE_ATTRIBUTE } from "../snapshot";
import { frames, type FrameLoop } from "../frames";
import { containerScale } from "../transition";

/** Names an element so lines can start from it. */
export const ANCHOR_ATTRIBUTE = "data-rm-anchor";
/** Draws a line to this element from the anchor it names. */
export const LINK_ATTRIBUTE = "data-rm-link";
/** Copied onto the line drawn to this element as `data-line`, so a line can be styled by state. */
export const LINE_ATTRIBUTE = "data-rm-line";
/** Which side of the anchor the line leaves from: top, bottom, left or right. */
export const FROM_SIDE_ATTRIBUTE = "data-rm-from-side";
/** Which side of the linked element the line arrives at. */
export const TO_SIDE_ATTRIBUTE = "data-rm-to-side";
/** Text shown halfway along the line. */
export const LABEL_ATTRIBUTE = "data-rm-label";
/** An arrowhead where the line arrives (`"false"` turns off one the connectors add to every line). */
export const ARROW_ATTRIBUTE = "data-rm-arrow";
/** `"loop"` for pulses that keep flowing, or any other value to send one pulse each time it changes. */
export const PULSE_ATTRIBUTE = "data-rm-pulse";
/** Seconds to wait before a one-off pulse sets off, to send pulses along a path in turn. */
export const PULSE_DELAY_ATTRIBUTE = "data-rm-pulse-delay";

export type ConnectorSide = "top" | "bottom" | "left" | "right";

export type ConnectorShape = "elbow" | "curve" | "straight";

export interface ConnectorOptions {
  /**
   * `"elbow"` goes straight down from the anchor, then turns across into the element with a
   * rounded corner: file trees and comment threads. `"curve"` is one smooth bend. Default "elbow".
   */
  shape?: ConnectorShape;
  /** The elbow's corner radius, in pixels. Default 12. */
  radius?: number;
  /**
   * Where a line meets the linked element: the middle of its `"left"` edge (trees, threads; also
   * called `"side"`), its `"top"` (a timeline or a list of steps), `"right"` or `"bottom"`.
   * Default "side". A line can set its own with `data-rm-to-side`.
   */
  end?: "side" | ConnectorSide;
  /** Where lines leave the anchor. Default "bottom". A line can set its own with `data-rm-from-side`. */
  from?: ConnectorSide;
  /** Put an arrowhead on every line where it arrives. Default false. */
  arrow?: boolean;
  /**
   * Pulses: how long one takes to travel the line (seconds), how much of the line it covers
   * (0 to 1), and for `"loop"` lines how often one sets off (seconds). Default
   * `{ duration: 1.2, length: 0.22, every: 2.4 }`. Pulses pause off screen and with reduced motion.
   */
  pulse?: { duration?: number; length?: number; every?: number };
  /** Space between each end of a line and the element it touches, in pixels. Default 4. */
  gap?: number;
  /** How lines draw in and out. Default `springs.smooth`. */
  spring?: SpringConfig;
  /** `"user"` (default) follows the system setting; with reduced motion lines appear and go at once. */
  reducedMotion?: ReducedMotion;
  /** The frame loop to run on. Defaults to the page's shared loop. */
  loop?: FrameLoop;
}

export interface Connectors {
  /** Redraw now, for changes the connectors can't see (a canvas resizing, say). */
  update(): void;
  /** Stop watching and remove every line. */
  destroy(): void;
}

interface End {
  x: number;
  y: number;
}

/**
 * The path from `from` (below the anchor) to `to` (beside the element). Elbows go down, then
 * across; when the element isn't below and to the right (mid-flight, say) they fall back to a
 * curve, which looks right any way round.
 */
export function connectorPath({
  from,
  to,
  shape = "elbow",
  radius = 12,
}: {
  from: End;
  to: End;
  shape?: ConnectorShape;
  radius?: number;
}): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const { x: fx, y: fy } = from;
  const { x: tx, y: ty } = to;
  if (shape === "straight") return `M${r2(fx)} ${r2(fy)}L${r2(tx)} ${r2(ty)}`;
  if (shape === "elbow" && tx > fx && ty > fy) {
    const r = Math.max(0, Math.min(radius, tx - fx, ty - fy));
    return `M${r2(fx)} ${r2(fy)}V${r2(ty - r)}Q${r2(fx)} ${r2(ty)} ${r2(fx + r)} ${r2(ty)}H${r2(tx)}`;
  }
  return `M${r2(fx)} ${r2(fy)}C${r2(fx)} ${r2(fy + (ty - fy) * 0.6)} ${r2(fx + (tx - fx) * 0.4)} ${r2(ty)} ${r2(tx)} ${r2(ty)}`;
}

const NORMAL: Record<ConnectorSide, End> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const vertical = (side: ConnectorSide) => side === "top" || side === "bottom";
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A polyline with its corners rounded to `radius` (no more than half of either side of a corner). */
function rounded(input: End[], radius: number): string {
  const points: End[] = [];
  for (const p of input) {
    const last = points[points.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    const before = points[points.length - 2];
    if (before && last && Math.abs((last.x - before.x) * (p.y - before.y) - (last.y - before.y) * (p.x - before.x)) < 0.01) points.pop();
    points.push(p);
  }
  let d = `M${r2(points[0]!.x)} ${r2(points[0]!.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1]!, points[i]!, points[i + 1]!];
    const r = Math.max(0, Math.min(radius, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2));
    const towards = (p: End, q: End, k: number) => {
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      return {
        x: p.x + ((q.x - p.x) / len) * k,
        y: p.y + ((q.y - p.y) / len) * k,
      };
    };
    const enter = towards(b, a, r);
    const leave = towards(b, c, r);
    d += `L${r2(enter.x)} ${r2(enter.y)}Q${r2(b.x)} ${r2(b.y)} ${r2(leave.x)} ${r2(leave.y)}`;
  }
  const last = points[points.length - 1]!;
  return `${d}L${r2(last.x)} ${r2(last.y)}`;
}

/**
 * The path between any two sides: `from` leaves its anchor through `fromSide`, `to` arrives
 * through `toSide`. Elbows run at right angles with rounded corners (one corner when one side is
 * vertical and the other horizontal, two when they face the same way); curves bend smoothly out
 * of one side and into the other. When an elbow would have to double back (mid-flight, say), it
 * falls back to a curve.
 */
export function connectorRoute({
  from,
  fromSide,
  to,
  toSide,
  shape = "elbow",
  radius = 12,
}: {
  from: End;
  fromSide: ConnectorSide;
  to: End;
  toSide: ConnectorSide;
  shape?: ConnectorShape;
  radius?: number;
}): string {
  if (shape === "straight") return `M${r2(from.x)} ${r2(from.y)}L${r2(to.x)} ${r2(to.y)}`;
  const out = NORMAL[fromSide];
  const back = NORMAL[toSide];
  if (shape === "elbow") {
    const elbow = elbowRoute({ from, fromSide, to, toSide, out, back, radius });
    if (elbow) return elbow;
  }
  return curveRoute({ from, to, out, back });
}

function elbowRoute({
  from,
  fromSide,
  to,
  toSide,
  out,
  back,
  radius,
}: {
  from: End;
  fromSide: ConnectorSide;
  to: End;
  toSide: ConnectorSide;
  out: End;
  back: End;
  radius: number;
}): string | null {
  if (vertical(fromSide) !== vertical(toSide)) {
    const corner = vertical(fromSide) ? { x: from.x, y: to.y } : { x: to.x, y: from.y };
    return goesForward({ from, to: corner, direction: out }) && goesForward({ from: to, to: corner, direction: back })
      ? rounded([from, corner, to], radius)
      : null;
  }
  const corners = sameAxisCorners({ from, to, vertical: vertical(fromSide) });
  return goesForward({ from, to: corners[0]!, direction: out }) && goesForward({ from: to, to: corners[1]!, direction: back })
    ? rounded([from, ...corners, to], radius)
    : null;
}

function sameAxisCorners({ from, to, vertical: isVertical }: { from: End; to: End; vertical: boolean }): [End, End] {
  const middle = isVertical ? (from.y + to.y) / 2 : (from.x + to.x) / 2;
  return isVertical
    ? [
        { x: from.x, y: middle },
        { x: to.x, y: middle },
      ]
    : [
        { x: middle, y: from.y },
        { x: middle, y: to.y },
      ];
}

function goesForward({ from, to, direction }: { from: End; to: End; direction: End }): boolean {
  return (to.x - from.x) * direction.x + (to.y - from.y) * direction.y >= 0;
}

function curveRoute({ from, to, out, back }: { from: End; to: End; out: End; back: End }): string {
  const reach = Math.max(24, Math.hypot(to.x - from.x, to.y - from.y) * 0.4);
  return `M${r2(from.x)} ${r2(from.y)}C${r2(from.x + out.x * reach)} ${r2(from.y + out.y * reach)} ${r2(to.x + back.x * reach)} ${r2(
    to.y + back.y * reach,
  )} ${r2(to.x)} ${r2(to.y)}`;
}

/** The point `t` of the way along a path (by length), for labels. */
export function pointAlong(d: string, t: number): End {
  const samples: End[] = [];
  for (const sub of toCubics(parsePath(d))) for (const c of sub.segments) for (let k = 0; k <= 12; k++) samples.push(pointAt(c, k / 12));
  if (samples.length === 0) return { x: 0, y: 0 };
  const lengths = [0];
  for (let i = 1; i < samples.length; i++)
    lengths.push(lengths[i - 1]! + Math.hypot(samples[i]!.x - samples[i - 1]!.x, samples[i]!.y - samples[i - 1]!.y));
  const goal = lengths[lengths.length - 1]! * Math.max(0, Math.min(1, t));
  const i = Math.max(
    1,
    lengths.findIndex((l) => l >= goal),
  );
  const [a, b] = [samples[i - 1]!, samples[i] ?? samples[i - 1]!];
  const span = lengths[i]! - lengths[i - 1]! || 1;
  const k = (goal - lengths[i - 1]!) / span;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** Where on an element's box a side's middle is, `gap` pixels out. */
function sidePoint(box: DOMRect, side: ConnectorSide, gap: number): End {
  if (side === "top") return { x: box.left + box.width / 2, y: box.top - gap };
  if (side === "bottom") return { x: box.left + box.width / 2, y: box.bottom + gap };
  if (side === "left") return { x: box.left - gap, y: box.top + box.height / 2 };
  return { x: box.right + gap, y: box.top + box.height / 2 };
}

const SIDES = new Set<string>(["top", "bottom", "left", "right"]);
const sideOf = (raw: string | null, fallback: ConnectorSide): ConnectorSide => (raw && SIDES.has(raw) ? (raw as ConnectorSide) : fallback);

interface Pulse {
  path: SVGPathElement;
  /** The last value seen, so a change sends a pulse. */
  token: string | null;
  /** Seconds since a one-off pulse was sent (negative while it waits), or null when none is running. */
  since: number | null;
}

interface Line {
  label: SVGTextElement | null;
  pulse: Pulse | null;
  /** Where in the order of lines it was made: staggers looping pulses so they don't all set off at once. */
  index: number;
  path: SVGPathElement;
  /** 0 → 1 as the line draws in; back to 0 as it leaves. */
  drawn: AnimatedValue;
  d: string;
  leaving: boolean;
}

const SVG = "http://www.w3.org/2000/svg";

let markers = 0;

/**
 * Draw connector lines inside `root` onto `svg`, an element laid over `root` (absolutely
 * positioned, the same size). The SVG is marked as ignored, so transitions don't animate it.
 */
export function connectors(root: HTMLElement, svg: SVGSVGElement, options: ConnectorOptions = {}): Connectors {
  const shape = options.shape ?? "elbow";
  const radius = options.radius ?? 12;
  const gap = options.gap ?? 4;
  const end: ConnectorSide = options.end === undefined || options.end === "side" ? "left" : options.end;
  const fromDefault: ConnectorSide = options.from ?? "bottom";
  const spring = options.spring ?? springs.smooth;
  const loop = options.loop ?? { add: frames };
  const pulseDuration = options.pulse?.duration ?? 1.2;
  const pulseLength = options.pulse?.length ?? 0.22;
  const pulseEvery = options.pulse?.every ?? 2.4;
  const reduced = () => resolveReducedMotion(options.reducedMotion);
  svg.setAttribute(IGNORE_ATTRIBUTE, "");
  svg.setAttribute("aria-hidden", "true");

  const arrowId = `rm-arrow-${++markers}`;
  const defs = document.createElementNS(SVG, "defs");
  const marker = document.createElementNS(SVG, "marker");
  for (const [k, v] of Object.entries({
    id: arrowId,
    viewBox: "0 0 10 10",
    refX: "8",
    refY: "5",
    markerWidth: "7",
    markerHeight: "7",
    markerUnits: "userSpaceOnUse",
    orient: "auto-start-reverse",
  }))
    marker.setAttribute(k, v);
  const head = document.createElementNS(SVG, "path");
  for (const [k, v] of Object.entries({
    d: "M1 1L8 5L1 9",
    fill: "none",
    stroke: "context-stroke",
    "stroke-width": "1.6",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }))
    head.setAttribute(k, v);
  marker.append(head);
  defs.append(marker);
  svg.append(defs);
  const labels = document.createElementNS(SVG, "g");
  labels.setAttribute("class", "rm-connector-labels");
  svg.append(labels);
  /** Lines and pulses go under the labels. */
  const under = (el: SVGElement) => svg.insertBefore(el, labels);

  const lines = new Map<string, Line>();
  let made = 0;
  let clock = 0;
  let onScreen = true;
  let first = true;
  let stop: (() => void) | null = null;
  let still = 0;
  let destroyed = false;
  let targetsDirty = true;
  let targets = new Map<string, { from: Element; to: Element }>();

  /** Inside something the transition ignores (its own exit layer, say), so not part of the content. */
  const ignored = (el: Element) => {
    const hidden = el.closest(`[${IGNORE_ATTRIBUTE}]`);
    return hidden !== null && hidden !== root && root.contains(hidden);
  };

  /** Lines that should exist now, by a key that survives the element being rebuilt. */
  function scanTargets(): Map<string, { from: Element; to: Element }> {
    const anchors = new Map<string, Element>();
    for (const el of root.querySelectorAll(`[${ANCHOR_ATTRIBUTE}]`)) {
      if (!ignored(el)) anchors.set(el.getAttribute(ANCHOR_ATTRIBUTE)!, el);
    }
    const out = new Map<string, { from: Element; to: Element }>();
    root.querySelectorAll(`[${LINK_ATTRIBUTE}]`).forEach((to, i) => {
      if (ignored(to)) return;
      const from = anchors.get(to.getAttribute(LINK_ATTRIBUTE)!);
      if (!from) return;
      const key = `${to.getAttribute(LINK_ATTRIBUTE)}→${to.getAttribute(ANCHOR_ATTRIBUTE) ?? `#${i}`}`;
      out.set(key, { from, to });
    });
    return out;
  }

  const connectorAttributes = new Set([
    ANCHOR_ATTRIBUTE,
    LINK_ATTRIBUTE,
    FROM_SIDE_ATTRIBUTE,
    TO_SIDE_ATTRIBUTE,
    LINE_ATTRIBUTE,
    LABEL_ATTRIBUTE,
    ARROW_ATTRIBUTE,
    PULSE_ATTRIBUTE,
    PULSE_DELAY_ATTRIBUTE,
    IGNORE_ATTRIBUTE,
  ]);

  function show(line: Line) {
    const p = Math.max(0, Math.min(1, line.drawn.current));
    if (p >= 1) {
      line.path.removeAttribute("stroke-dasharray");
      line.path.removeAttribute("stroke-dashoffset");
      line.path.removeAttribute("data-rm-drawing");
    } else {
      line.path.setAttribute("stroke-dasharray", "1 1");
      line.path.setAttribute("stroke-dashoffset", String(1 - p));
      line.path.setAttribute("data-rm-drawing", "");
    }
    if (line.label) line.label.setAttribute("opacity", String(p));
  }

  /** Make or update the line's label: text halfway along, with a halo so it reads over the line. */
  function labelLine(line: Line, text: string | null) {
    if (!text) {
      line.label?.remove();
      line.label = null;
      return;
    }
    if (!line.label) {
      const label = document.createElementNS(SVG, "text");
      label.setAttribute("class", "rm-connector-label");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("fill", "currentColor");
      label.setAttribute("font-size", "11");
      label.setAttribute("style", "paint-order: stroke; stroke: var(--rm-label-halo, #fff); stroke-width: 4px; stroke-linejoin: round");
      labels.append(label);
      line.label = label;
    }
    if (line.label.textContent !== text) line.label.textContent = text;
    const at = pointAlong(line.d, 0.5);
    line.label.setAttribute("x", String(r2(at.x)));
    line.label.setAttribute("y", String(r2(at.y)));
  }

  /**
   * Pulses: a short dash that runs along the line. Returns true while one is on its way (or for
   * looping lines, always), so the loop keeps going.
   */
  function pulseLine(line: Line, to: Element, dt: number): boolean {
    const raw = to.getAttribute(PULSE_ATTRIBUTE);
    if (raw === null || reduced()) {
      line.pulse?.path.remove();
      line.pulse = null;
      return false;
    }
    if (!line.pulse) {
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("class", "rm-connector-pulse");
      path.setAttribute("pathLength", "1");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-dasharray", `${pulseLength} 2`);
      path.setAttribute("opacity", "0");
      under(path);
      line.pulse = { path, token: raw, since: null };
    }
    const pulse = line.pulse;
    pulse.path.setAttribute("d", line.d);
    let progress: number | null = null;
    if (raw === "loop") {
      const time = (clock + line.index * 0.37 * pulseEvery) % pulseEvery;
      progress = time / pulseDuration;
    } else {
      if (raw !== pulse.token) {
        pulse.token = raw;
        pulse.since = -Number(to.getAttribute(PULSE_DELAY_ATTRIBUTE) ?? 0);
      }
      if (pulse.since !== null) {
        pulse.since += dt;
        progress = pulse.since / pulseDuration;
        if (progress > 1) pulse.since = null;
      }
    }
    const visible = progress !== null && progress >= 0 && progress <= 1 && line.drawn.current >= 0.99;
    pulse.path.setAttribute("opacity", visible ? "1" : "0");
    if (visible) pulse.path.setAttribute("stroke-dashoffset", String(r2(pulseLength - progress! * (1 + pulseLength) * 100) / 100));
    if (raw === "loop") return onScreen;
    return pulse.since !== null;
  }

  /** Rebuild every line from the elements' boxes. Returns true if anything changed or is moving. */
  function draw(dt: number): boolean {
    clock += dt;
    const frame = svg.getBoundingClientRect();
    const scale = containerScale(root);
    const local = (p: End) => ({
      x: (p.x - frame.left) / scale,
      y: (p.y - frame.top) / scale,
    });
    let changed = false;
    if (targetsDirty) {
      targets = scanTargets();
      targetsDirty = false;
    }
    const now = targets;

    for (const [key, { from, to }] of now) {
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      if (a.width * a.height === 0 || b.width * b.height === 0) continue;
      const fromSide = sideOf(to.getAttribute(FROM_SIDE_ATTRIBUTE), fromDefault);
      const toSide = sideOf(to.getAttribute(TO_SIDE_ATTRIBUTE), end);
      const start = local(sidePoint(a, fromSide, gap));
      const finish = local(sidePoint(b, toSide, gap));
      const d =
        fromSide === "bottom" && toSide === "left"
          ? connectorPath({ from: start, to: finish, shape, radius })
          : connectorRoute({
              from: start,
              fromSide,
              to: finish,
              toSide,
              shape,
              radius,
            });
      let line = lines.get(key);
      if (!line) {
        const path = document.createElementNS(SVG, "path");
        path.setAttribute("class", "rm-connector");
        path.setAttribute("pathLength", "1");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        under(path);
        line = {
          path,
          drawn: value(first || reduced() ? 1 : 0, {
            spring,
            precision: 0.002,
          }),
          d: "",
          leaving: false,
          label: null,
          pulse: null,
          index: made++,
        };
        if (line.drawn.current < 1) line.drawn.to(1);
        lines.set(key, line);
        changed = true;
      } else if (line.leaving) {
        line.leaving = false;
        if (reduced()) line.drawn.set(1);
        else line.drawn.to(1);
      }
      if (d !== line.d) {
        line.d = d;
        line.path.setAttribute("d", d);
        changed = true;
      }
      const state = to.getAttribute(LINE_ATTRIBUTE);
      if (state !== line.path.getAttribute("data-line")) {
        if (state === null) line.path.removeAttribute("data-line");
        else line.path.setAttribute("data-line", state);
      }
      const arrowAttr = to.getAttribute(ARROW_ATTRIBUTE);
      const wantsArrow = arrowAttr === null ? options.arrow === true : arrowAttr !== "false";
      const arrowShown = wantsArrow && line.drawn.current >= 0.98 && !line.leaving;
      if (arrowShown !== line.path.hasAttribute("marker-end")) {
        if (arrowShown) line.path.setAttribute("marker-end", `url(#${arrowId})`);
        else line.path.removeAttribute("marker-end");
      }
      labelLine(line, to.getAttribute(LABEL_ATTRIBUTE));
      if (pulseLine(line, to, dt)) changed = true;
    }

    for (const [key, line] of lines) {
      if (!now.has(key) && !line.leaving) {
        line.leaving = true;
        line.path.removeAttribute("marker-end");
        line.pulse?.path.remove();
        line.pulse = null;
        if (reduced()) line.drawn.set(0);
        else line.drawn.to(0);
      }
      if (line.drawn.step(dt)) changed = true;
      show(line);
      if (line.leaving && line.drawn.current <= 0.001) {
        line.path.remove();
        line.label?.remove();
        lines.delete(key);
      }
    }
    first = false;
    return changed;
  }

  const tick = (dt: number) => {
    if (destroyed) return false;
    if (draw(dt)) still = 0;
    else still++;
    const keepGoing = still < 3;
    if (!keepGoing) stop = null;
    return keepGoing;
  };
  const wake = () => {
    if (destroyed) return;
    still = 0;
    if (!stop) stop = loop.add(tick);
  };

  draw(0);
  if ([...lines.values()].some((l) => l.pulse)) wake();
  const watch =
    typeof MutationObserver === "function"
      ? new MutationObserver((records) => {
          const contentChanged = records.filter((record) => !svg.contains(record.target));
          if (contentChanged.length === 0) return;
          if (
            contentChanged.some(
              (record) =>
                record.type === "childList" ||
                (record.type === "attributes" && connectorAttributes.has(record.attributeName ?? "")),
            )
          ) {
            targetsDirty = true;
          }
          wake();
        })
      : null;
  watch?.observe(root, { subtree: true, childList: true, attributes: true });
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(wake) : null;
  resize?.observe(root);
  const sight =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry?.isIntersecting ?? true;
          if (onScreen) wake();
        })
      : null;
  sight?.observe(root);

  return {
    update: wake,
    destroy() {
      destroyed = true;
      stop?.();
      watch?.disconnect();
      resize?.disconnect();
      sight?.disconnect();
      for (const line of lines.values()) {
        line.path.remove();
        line.label?.remove();
        line.pulse?.path.remove();
      }
      lines.clear();
      defs.remove();
      labels.remove();
    },
  };
}
