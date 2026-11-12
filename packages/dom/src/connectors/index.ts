import { parsePath, pointAt, springs, toCubics, value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import { resolveReducedMotion, type ReducedMotion } from "../accessibility";
import { IGNORE_ATTRIBUTE } from "../snapshot";
import { frames, type FrameLoop } from "../frames";
import { containerScale } from "../transition";

export const ANCHOR_ATTRIBUTE = "data-rm-anchor";
export const LINK_ATTRIBUTE = "data-rm-link";
export const LINE_ATTRIBUTE = "data-rm-line";
export const FROM_SIDE_ATTRIBUTE = "data-rm-from-side";
export const TO_SIDE_ATTRIBUTE = "data-rm-to-side";
export const LABEL_ATTRIBUTE = "data-rm-label";
export const ARROW_ATTRIBUTE = "data-rm-arrow";
export const PULSE_ATTRIBUTE = "data-rm-pulse";
export const PULSE_DELAY_ATTRIBUTE = "data-rm-pulse-delay";

export type ConnectorSide = "top" | "bottom" | "left" | "right";

export type ConnectorShape = "elbow" | "curve" | "straight";

export interface ConnectorOptions {
  shape?: ConnectorShape;
  radius?: number;
  end?: "side" | ConnectorSide;
  from?: ConnectorSide;
  arrow?: boolean;
  pulse?: { duration?: number; length?: number; every?: number };
  gap?: number;
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

export interface Connectors {
  update(): void;
  destroy(): void;
}

interface End {
  x: number;
  y: number;
}

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
  token: string | null;
  since: number | null;
}

interface Line {
  label: SVGTextElement | null;
  pulse: Pulse | null;
  index: number;
  path: SVGPathElement;
  drawn: AnimatedValue;
  d: string;
  leaving: boolean;
}

interface Target {
  from: Element;
  to: Element;
}

interface PulseTiming {
  duration: number;
  length: number;
  every: number;
}

const SVG = "http://www.w3.org/2000/svg";
const STILL_FRAMES = 3;
const DRAWN_PRECISION = 0.002;
const ARROW_THRESHOLD = 0.98;
const PULSE_THRESHOLD = 0.99;
const GONE = 0.001;
const LOOP_OFFSET = 0.37;

const ARROW_MARKER = {
  viewBox: "0 0 10 10",
  refX: "8",
  refY: "5",
  markerWidth: "7",
  markerHeight: "7",
  markerUnits: "userSpaceOnUse",
  orient: "auto-start-reverse",
};

const ARROW_HEAD = {
  d: "M1 1L8 5L1 9",
  fill: "none",
  stroke: "context-stroke",
  "stroke-width": "1.6",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

const LINE_PATH = {
  class: "rm-connector",
  pathLength: "1",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

const LABEL_TEXT = {
  class: "rm-connector-label",
  "text-anchor": "middle",
  "dominant-baseline": "middle",
  fill: "currentColor",
  "font-size": "11",
  style: "paint-order: stroke; stroke: var(--rm-label-halo, #fff); stroke-width: 4px; stroke-linejoin: round",
};

const CONNECTOR_ATTRIBUTES = new Set([
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

let markers = 0;

function svgElement<Tag extends keyof SVGElementTagNameMap>(tag: Tag, attributes: Record<string, string>): SVGElementTagNameMap[Tag] {
  const element = document.createElementNS(SVG, tag);

  for (const [name, attribute] of Object.entries(attributes)) element.setAttribute(name, attribute);

  return element;
}

function arrowDefs(id: string): SVGDefsElement {
  const defs = document.createElementNS(SVG, "defs");
  const marker = svgElement("marker", { id, ...ARROW_MARKER });

  marker.append(svgElement("path", ARROW_HEAD));
  defs.append(marker);

  return defs;
}

const pulsePath = (length: number) =>
  svgElement("path", {
    class: "rm-connector-pulse",
    pathLength: "1",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2.5",
    "stroke-linecap": "round",
    "stroke-dasharray": `${length} 2`,
    opacity: "0",
  });

function setOrRemove(element: Element, name: string, attribute: string | null) {
  if (attribute === null) element.removeAttribute(name);
  else element.setAttribute(name, attribute);
}

function isIgnored(element: Element, root: HTMLElement): boolean {
  const hidden = element.closest(`[${IGNORE_ATTRIBUTE}]`);

  return hidden !== null && hidden !== root && root.contains(hidden);
}

function scanTargets(root: HTMLElement): Map<string, Target> {
  const anchors = new Map<string, Element>();

  for (const element of root.querySelectorAll(`[${ANCHOR_ATTRIBUTE}]`)) {
    if (!isIgnored(element, root)) anchors.set(element.getAttribute(ANCHOR_ATTRIBUTE)!, element);
  }

  const targets = new Map<string, Target>();

  root.querySelectorAll(`[${LINK_ATTRIBUTE}]`).forEach((to, index) => {
    if (isIgnored(to, root)) return;

    const from = anchors.get(to.getAttribute(LINK_ATTRIBUTE)!);

    if (!from) return;

    targets.set(`${to.getAttribute(LINK_ATTRIBUTE)}→${to.getAttribute(ANCHOR_ATTRIBUTE) ?? `#${index}`}`, { from, to });
  });

  return targets;
}

function showProgress(line: Line) {
  const progress = Math.max(0, Math.min(1, line.drawn.current));
  const { path } = line;

  if (progress >= 1) {
    path.removeAttribute("stroke-dasharray");
    path.removeAttribute("stroke-dashoffset");
    path.removeAttribute("data-rm-drawing");
  } else {
    path.setAttribute("stroke-dasharray", "1 1");
    path.setAttribute("stroke-dashoffset", String(1 - progress));
    path.setAttribute("data-rm-drawing", "");
  }

  if (line.label) line.label.setAttribute("opacity", String(progress));
}

function placeLabel(line: Line, text: string, group: SVGGElement) {
  if (!line.label) {
    line.label = svgElement("text", LABEL_TEXT);
    group.append(line.label);
  }

  if (line.label.textContent !== text) line.label.textContent = text;

  const at = pointAlong(line.d, 0.5);

  line.label.setAttribute("x", String(r2(at.x)));
  line.label.setAttribute("y", String(r2(at.y)));
}

function triggeredProgress(pulse: Pulse, raw: string, to: Element, dt: number, timing: PulseTiming): number | null {
  if (raw !== pulse.token) {
    pulse.token = raw;
    pulse.since = -Number(to.getAttribute(PULSE_DELAY_ATTRIBUTE) ?? 0);
  }

  if (pulse.since === null) return null;

  pulse.since += dt;

  const progress = pulse.since / timing.duration;

  if (progress > 1) pulse.since = null;

  return progress;
}

function loopProgress(line: Line, clock: number, timing: PulseTiming): number {
  return ((clock + line.index * LOOP_OFFSET * timing.every) % timing.every) / timing.duration;
}

function showPulse(line: Line, pulse: Pulse, progress: number | null, length: number) {
  const visible = progress !== null && progress >= 0 && progress <= 1 && line.drawn.current >= PULSE_THRESHOLD;

  pulse.path.setAttribute("opacity", visible ? "1" : "0");

  if (visible) pulse.path.setAttribute("stroke-dashoffset", String(r2(length - progress! * (1 + length) * 100) / 100));
}

function removePulse(line: Line) {
  line.pulse?.path.remove();
  line.pulse = null;
}

export function connectors(root: HTMLElement, svg: SVGSVGElement, options: ConnectorOptions = {}): Connectors {
  const shape = options.shape ?? "elbow";
  const radius = options.radius ?? 12;
  const gap = options.gap ?? 4;
  const end: ConnectorSide = options.end === undefined || options.end === "side" ? "left" : options.end;
  const fromDefault: ConnectorSide = options.from ?? "bottom";
  const spring = options.spring ?? springs.smooth;
  const loop = options.loop ?? { add: frames };
  const timing: PulseTiming = {
    duration: options.pulse?.duration ?? 1.2,
    length: options.pulse?.length ?? 0.22,
    every: options.pulse?.every ?? 2.4,
  };
  const reduced = () => resolveReducedMotion(options.reducedMotion);

  svg.setAttribute(IGNORE_ATTRIBUTE, "");
  svg.setAttribute("aria-hidden", "true");

  const arrowId = `rm-arrow-${++markers}`;
  const defs = arrowDefs(arrowId);
  const labels = svgElement("g", { class: "rm-connector-labels" });

  svg.append(defs);
  svg.append(labels);

  const under = (element: SVGElement) => svg.insertBefore(element, labels);
  const lines = new Map<string, Line>();

  let made = 0;
  let clock = 0;
  let onScreen = true;
  let first = true;
  let stop: (() => void) | null = null;
  let still = 0;
  let destroyed = false;
  let targetsDirty = true;
  let targets = new Map<string, Target>();

  const animate = (drawn: AnimatedValue, to: number) => (reduced() ? drawn.set(to) : drawn.to(to));

  function labelLine(line: Line, text: string | null) {
    if (text) {
      placeLabel(line, text, labels);
      return;
    }

    line.label?.remove();
    line.label = null;
  }

  function pulseLine(line: Line, to: Element, dt: number): boolean {
    const raw = to.getAttribute(PULSE_ATTRIBUTE);

    if (raw === null || reduced()) {
      removePulse(line);
      return false;
    }

    if (!line.pulse) {
      const path = pulsePath(timing.length);

      under(path);
      line.pulse = { path, token: raw, since: null };
    }

    const pulse = line.pulse;

    pulse.path.setAttribute("d", line.d);

    const progress = raw === "loop" ? loopProgress(line, clock, timing) : triggeredProgress(pulse, raw, to, dt, timing);

    showPulse(line, pulse, progress, timing.length);

    return raw === "loop" ? onScreen : pulse.since !== null;
  }

  function newLine(): Line {
    const path = svgElement("path", LINE_PATH);

    under(path);

    const line: Line = {
      path,
      drawn: value(first || reduced() ? 1 : 0, { spring, precision: DRAWN_PRECISION }),
      d: "",
      leaving: false,
      label: null,
      pulse: null,
      index: made++,
    };

    if (line.drawn.current < 1) line.drawn.to(1);

    return line;
  }

  function pathBetween(from: Element, to: Element, frame: DOMRect, scale: number): string | null {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();

    if (a.width * a.height === 0 || b.width * b.height === 0) return null;

    const local = (point: End) => ({ x: (point.x - frame.left) / scale, y: (point.y - frame.top) / scale });
    const fromSide = sideOf(to.getAttribute(FROM_SIDE_ATTRIBUTE), fromDefault);
    const toSide = sideOf(to.getAttribute(TO_SIDE_ATTRIBUTE), end);
    const start = local(sidePoint(a, fromSide, gap));
    const finish = local(sidePoint(b, toSide, gap));

    if (fromSide === "bottom" && toSide === "left") return connectorPath({ from: start, to: finish, shape, radius });

    return connectorRoute({ from: start, fromSide, to: finish, toSide, shape, radius });
  }

  function syncArrow(line: Line, to: Element) {
    const attribute = to.getAttribute(ARROW_ATTRIBUTE);
    const wantsArrow = attribute === null ? options.arrow === true : attribute !== "false";
    const shown = wantsArrow && line.drawn.current >= ARROW_THRESHOLD && !line.leaving;

    if (shown !== line.path.hasAttribute("marker-end")) setOrRemove(line.path, "marker-end", shown ? `url(#${arrowId})` : null);
  }

  function lineFor(key: string): { line: Line; created: boolean } {
    const existing = lines.get(key);

    if (!existing) {
      const line = newLine();

      lines.set(key, line);

      return { line, created: true };
    }

    if (existing.leaving) {
      existing.leaving = false;
      animate(existing.drawn, 1);
    }

    return { line: existing, created: false };
  }

  function updateLine(key: string, { from, to }: Target, frame: DOMRect, scale: number, dt: number): boolean {
    const d = pathBetween(from, to, frame, scale);

    if (d === null) return false;

    const { line, created } = lineFor(key);
    let changed = created;

    if (d !== line.d) {
      line.d = d;
      line.path.setAttribute("d", d);
      changed = true;
    }

    const state = to.getAttribute(LINE_ATTRIBUTE);

    if (state !== line.path.getAttribute("data-line")) setOrRemove(line.path, "data-line", state);

    syncArrow(line, to);
    labelLine(line, to.getAttribute(LABEL_ATTRIBUTE));

    return pulseLine(line, to, dt) || changed;
  }

  function retire(line: Line) {
    line.leaving = true;
    line.path.removeAttribute("marker-end");
    removePulse(line);
    animate(line.drawn, 0);
  }

  function stepLines(current: ReadonlyMap<string, Target>, dt: number): boolean {
    let changed = false;

    for (const [key, line] of lines) {
      if (!current.has(key) && !line.leaving) retire(line);

      if (line.drawn.step(dt)) changed = true;

      showProgress(line);

      if (line.leaving && line.drawn.current <= GONE) {
        line.path.remove();
        line.label?.remove();
        lines.delete(key);
      }
    }

    return changed;
  }

  function draw(dt: number): boolean {
    clock += dt;

    const frame = svg.getBoundingClientRect();
    const scale = containerScale(root);

    if (targetsDirty) {
      targets = scanTargets(root);
      targetsDirty = false;
    }

    const current = targets;
    let changed = false;

    for (const [key, target] of current) {
      if (updateLine(key, target, frame, scale, dt)) changed = true;
    }

    if (stepLines(current, dt)) changed = true;

    first = false;

    return changed;
  }

  const tick = (dt: number) => {
    if (destroyed) return false;

    still = draw(dt) ? 0 : still + 1;

    const keepGoing = still < STILL_FRAMES;

    if (!keepGoing) stop = null;

    return keepGoing;
  };

  const wake = () => {
    if (destroyed) return;

    still = 0;

    if (!stop) stop = loop.add(tick);
  };

  const touchesConnectors = (records: MutationRecord[]) =>
    records.some(
      (record) => record.type === "childList" || (record.type === "attributes" && CONNECTOR_ATTRIBUTES.has(record.attributeName ?? "")),
    );

  draw(0);

  if ([...lines.values()].some((line) => line.pulse)) wake();

  const watch =
    typeof MutationObserver === "function"
      ? new MutationObserver((records) => {
          const outside = records.filter((record) => !svg.contains(record.target));

          if (outside.length === 0) return;

          if (touchesConnectors(outside)) targetsDirty = true;

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
