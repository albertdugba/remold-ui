/**
 * Live scenes: named objects drawn with looks, arranged by named layouts. Switching layout
 * springs every object and the camera to their new places, from wherever they are, keeping
 * momentum. Pieces lift on hover, focus on tap, and the whole scene turns when dragged.
 *
 * ```ts
 * const s = scene(canvas, {
 *   label: "How the packages fit together",
 *   objects: { core: { look: "plate", label: "core" }, react: { look: "chip", label: "react" } },
 *   layouts: {
 *     stacked: { camera: { yaw: 45, pitch: 60 }, objects: { core: { x: -150, y: -150, width: 300, depth: 300 }, react: { x: -40, y: 220, width: 80, depth: 80 } } },
 *     diagram: { camera: "fit", objects: { core: { x: 0, y: 0, width: 300, depth: 200 }, react: { x: 0, y: 260, width: 90, depth: 56 } } },
 *   },
 * });
 * s.to("diagram");
 * ```
 */
import {
  createMorph,
  deceleration,
  matchPoints,
  project,
  value,
  velocityTracker,
  type AnimatedValue,
  type MatchPointsOptions,
  type Morph,
  type Point3,
  type SpringConfig,
} from "@remold-ui/core";
import { routeOnFloor } from "../links";
import { frames, prefersReducedMotion, type FrameLoop, type ReducedMotion } from "@remold-ui/dom";
import { fitCamera, iso, projector, type Camera, type Projector } from "../camera";
import { fitCanvas, type CanvasSize } from "../canvas-size";
import { paintOrder, pointInPolygon, projectOutline, silhouette, type Box3 } from "../geometry";
import { parseColor, unitPath } from "../extrude";
import { looks, palettes, type Look, type LookName, type Palette, type PaletteName } from "../object-looks";

export interface SceneObject {
  look: LookName | Look;
  label?: string;
  /** Read to screen-reader users when the object is focused. */
  description?: string;
  palette?: PaletteName | Palette;
  /** Whether it lifts, focuses and is reachable by keyboard. Default true (false for "grid"). */
  interactive?: boolean;
}

/** Where an object sits in one layout. Floor units; z is up. */
export interface LayoutBox {
  x: number;
  y: number;
  z?: number;
  width: number;
  depth: number;
  /** Thickness or height. Defaults to the look's own. */
  height?: number;
  /** 0 hides the object in this layout. Default 1. */
  opacity?: number;
  /**
   * How full the object is, from 0 to 1, for looks that hold something (such as
   * `extrude({ glass: true })`). It springs between layouts like the rest. Default 0.
   */
  fill?: number;
  /**
   * How see-through the object is, from 0 (solid) to 1 (only its ink edges left), for looks that
   * draw edges (such as `extrude({ ink: true })`). Unlike `opacity`, the outline stays. Default 0.
   */
  ghost?: number;
  /**
   * The colour of what the object holds in this layout (see `fill`), as hex or `rgb()`. It springs
   * from one layout's colour to the next. Leave it out to keep the current one.
   */
  color?: string;
  /**
   * Seconds to wait before the object sets off for this layout, to stagger arrivals (envelopes
   * landing one after another) and exits. Ignored with reduced motion. Default 0.
   */
  delay?: number;
  /**
   * Seconds after the object sets off before its `opacity` changes, so it can appear or vanish
   * once it has landed (say, hidden as a lid closes over it) while everything else moves at once.
   * Ignored with reduced motion. Default 0.
   */
  fadeDelay?: number;
  /**
   * Travel to this layout's place on an arc that rises this many floor units at its highest,
   * like something lifted and set down elsewhere, instead of in a straight line. Default 0.
   */
  arc?: number;
  /** Replaces the object's label in this layout. */
  label?: string;
  /**
   * The object's outline in this layout, as SVG path data, for looks that can change shape (such
   * as `extrude()`). Between layouts the outline morphs. Leave it out to keep the current one.
   */
  shape?: string;
}

export interface SceneLayout {
  /** A camera, or "fit" for a top-down diagram that fits the canvas. Default: isometric. */
  camera?: Partial<Camera> | "fit";
  objects: Record<string, LayoutBox>;
  /** Shown to screen-reader users while this layout is on screen. */
  caption?: string;
}

/** A named place on an object for links and DOM overlays. */
export type ScenePort = "center" | "top" | "left" | "right" | "front" | "back";
/**
 * How a link runs. Links are routed on the floor, in the scene's own space, and then drawn in
 * perspective: they leave each object from the middle of the side that faces the other one and
 * meet the floor at a right angle, so they read as lines laid on the ground.
 *
 * - `curve` (the default): one smooth bend out of one side and into the other.
 * - `orthogonal`: straight runs along the floor's axes, with rounded corners.
 * - `straight`: the shortest line between the two sides.
 * - `auto`: the same as `curve`.
 *
 * Objects stacked one above the other are joined by a straight vertical line instead.
 */
/** A port, or the object's furthest point left or right on screen. */
export type AnchorPort = ScenePort | "screen-left" | "screen-right";

export type LinkRoute = "straight" | "orthogonal" | "curve" | "auto";

export interface SceneLink {
  from: string;
  to: string;
  fromPort?: ScenePort;
  toPort?: ScenePort;
  /** Default "curve". See `LinkRoute`. */
  route?: LinkRoute;
  arrow?: "start" | "end" | "both";
  label?: string;
  dashed?: boolean;
  /** Dots travel along the link (paused with reduced motion). */
  flow?: boolean;
  /** Layouts the link appears in. Default: all. */
  layouts?: string[];
}

export interface SceneOptions {
  objects: Record<string, SceneObject>;
  layouts: Record<string, SceneLayout>;
  links?: SceneLink[];
  /** The first layout. Default: the first one listed. */
  initial?: string;
  /** The canvas's accessible name. */
  label?: string;
  palette?: PaletteName | Palette;
  /** Which interactions are on. All default to true. */
  interact?: { hover?: boolean; tap?: boolean; drag?: boolean; keyboard?: boolean };
  /** Default `{ duration: 0.8, bounce: 0.18 }`. */
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
  /** Called when the user focuses an object (tap or keyboard) or clears focus. Not called for `focus()`. */
  onFocusChange?: (id: string | null) => void;
  /**
   * Called after every frame is drawn, while anything moves: the moment to move HTML laid over
   * the canvas (labels, tooltips) to `anchor()` positions, so they follow the scene exactly.
   */
  onDraw?: () => void;
}

export interface PointsOptions {
  /** Edge length of each cube, in floor units. Default 20. */
  size?: number;
  palette?: PaletteName | Palette;
  match?: MatchPointsOptions;
}

export interface Scene {
  readonly layout: string;
  readonly focused: string | null;
  /** Spring to another layout. Throws on an unknown name. */
  to(layout: string): void;
  /** Focus an object (lift it, dim the rest), or clear focus with null. */
  focus(id: string | null): void;
  /**
   * Show a cloud of cubes. Calling again morphs keylessly: each new point is paired with the
   * nearest old one, unpaired old points shrink away, and new ones grow in.
   */
  points(points: readonly Point3[], options?: PointsOptions): void;
  /** The object's current (animated) box in floor units, or null if it's unknown. */
  box(id: string): Box3 | null;
  /** Where the centre of the object's top face is on the canvas, in CSS pixels: for tooltips. */
  /**
   * Where a named place on an object is on the canvas, in CSS pixels. Besides the ports,
   * `"screen-left"` and `"screen-right"` are the points of the object's outline furthest left and
   * right on screen, halfway up: where a leader line from a label at the side should stop.
   */
  anchor(id: string, port?: AnchorPort): { x: number; y: number } | null;
  /** The frontmost interactive object at a canvas point (CSS pixels), or null. */
  pick(x: number, y: number): string | null;
  /** Redraw now. */
  render(): void;
  /** Stop animating, remove listeners and the description element. */
  destroy(): void;
}

/* Internal state */

type Channel = AnimatedValue;
const CHANNELS = [
  "x",
  "y",
  "z",
  "width",
  "depth",
  "height",
  "opacity",
  "fill",
  "ghost",
  "red",
  "green",
  "blue",
  "lift",
  "glow",
  "dim",
] as const;
type ObjectChannels = Record<(typeof CHANNELS)[number], Channel>;

interface ObjectState {
  id: string;
  /** Whether any layout gives the object a colour; until then its look picks its own. */
  colored: boolean;
  /** A move waiting out its place's `delay`: run when the scene's clock reaches `at`. */
  pending: { at: number; start: () => void } | null;
  /** An opacity change waiting out its `fadeDelay`. */
  fade: { at: number; to: number } | null;
  /** The current move's arc: where it set off from, where it's going, and how high it rises. */
  travel: { fromX: number; fromY: number; toX: number; toY: number; arc: number } | null;
  look: Look;
  /** The outline's morph: from where it was to the layout's `shape`, at `t` (0 → 1). */
  outline: { morph: Morph | null; target: string | null; t: Channel };
  palette: Palette;
  label: string;
  description: string;
  interactive: boolean;
  c: ObjectChannels;
}

interface PointState {
  x: Channel;
  y: Channel;
  z: Channel;
  size: Channel;
  leaving: boolean;
}

const QUICK: SpringConfig = { duration: 0.35, bounce: 0.1 };
const DRAG_THRESHOLD = 10;
const DEGREES_PER_PIXEL = 0.35;

const resolvePalette = (p: PaletteName | Palette | undefined, fallback: Palette): Palette =>
  p === undefined ? fallback : typeof p === "string" ? palettes[p] : p;

export function scene(canvas: HTMLCanvasElement, options: SceneOptions): Scene {
  const layoutNames = Object.keys(options.layouts);
  if (layoutNames.length === 0) throw new RangeError("scene: at least one layout is required");
  const spring = options.spring ?? { duration: 0.8, bounce: 0.18 };
  const loop = options.loop ?? { add: frames };
  const interact = { hover: true, tap: true, drag: true, keyboard: true, ...options.interact };
  const reduced = () => options.reducedMotion === "always" || (options.reducedMotion !== "never" && prefersReducedMotion());
  const basePalette = resolvePalette(options.palette, palettes.violet);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("scene: canvas 2D context is not available");

  let size: CanvasSize = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });
  let current = options.initial ?? layoutNames[0]!;
  if (!options.layouts[current]) throw new RangeError(`scene: unknown initial layout "${current}"`);
  let focused: string | null = null;
  let hovered: string | null = null;
  let time = 0;
  let running = false;
  let destroyed = false;
  let visible = true;

  const ch = (v: number, s: SpringConfig = spring, precision = 0.05) => value(v, { spring: s, precision });
  const camera = { yaw: ch(45, spring, 0.01), pitch: ch(60, spring, 0.01), zoom: ch(1, spring, 0.001), centerX: ch(0), centerY: ch(0) };
  const view = (): Projector =>
    projector(
      {
        yaw: camera.yaw.current,
        pitch: camera.pitch.current,
        zoom: camera.zoom.current,
        centerX: camera.centerX.current,
        centerY: camera.centerY.current,
      },
      size,
    );

  /* Objects */

  const firstLayout = options.layouts[current]!;
  const objects: ObjectState[] = Object.entries(options.objects).map(([id, spec]) => {
    const look = typeof spec.look === "string" ? looks[spec.look] : spec.look;
    const box = firstLayout.objects[id];
    const height = box?.height ?? look.defaultHeight;
    const quick = new Set(["lift", "glow", "dim"]);
    // The colour it starts with: this layout's, or failing that the first any layout gives, so
    // nothing fades in from black.
    const firstColor =
      box?.color ??
      Object.values(options.layouts)
        .map((l) => l.objects[id]?.color)
        .find((c) => c !== undefined);
    const [red, green, blue] = firstColor ? parseColor(firstColor) : [0, 0, 0];
    const initial: Record<(typeof CHANNELS)[number], number> = {
      x: box?.x ?? 0,
      y: box?.y ?? 0,
      z: box?.z ?? 0,
      width: box?.width ?? 0,
      depth: box?.depth ?? 0,
      height,
      opacity: box ? box.opacity ?? 1 : 0,
      fill: box?.fill ?? 0,
      ghost: box?.ghost ?? 0,
      red,
      green,
      blue,
      lift: 0,
      glow: 0,
      dim: 1,
    };
    const c = Object.fromEntries(
      CHANNELS.map((k) => [
        k,
        ch(initial[k], quick.has(k) || k === "opacity" ? QUICK : spring, k === "opacity" || quick.has(k) ? 0.005 : 0.05),
      ]),
    ) as ObjectChannels;
    return {
      id,
      colored: firstColor !== undefined,
      pending: null,
      fade: null,
      travel: null,
      look,
      outline: { morph: null, target: box?.shape ?? null, t: ch(1, spring, 0.001) },
      palette: resolvePalette(spec.palette, basePalette),
      label: box?.label ?? spec.label ?? "",
      description: spec.description ?? "",
      interactive: spec.interactive ?? !(look.background || look.passive),
      c,
    };
  });
  const byId = new Map(objects.map((o) => [o.id, o]));

  for (const link of options.links ?? []) {
    if (!byId.has(link.from) || !byId.has(link.to)) throw new RangeError(`scene: link ${link.from} → ${link.to} names an unknown object`);
  }
  const links = (options.links ?? []).map((spec) => ({
    spec,
    opacity: ch(!spec.layouts || spec.layouts.includes(current) ? 1 : 0, QUICK, 0.005),
  }));

  let points: PointState[] = [];
  let pointPalette = basePalette;

  /** How high the object rides above its spring's z right now, part way along an arc. */
  const arcLift = (o: ObjectState): number => {
    const t = o.travel;
    if (!t || t.arc === 0) return 0;
    const total = Math.hypot(t.toX - t.fromX, t.toY - t.fromY);
    if (total < 1) return 0;
    const left = Math.hypot(t.toX - o.c.x.current, t.toY - o.c.y.current);
    const p = Math.max(0, Math.min(1, 1 - left / total));
    return t.arc * 4 * p * (1 - p);
  };
  const boxOf = (o: ObjectState): Box3 => ({
    x: o.c.x.current,
    y: o.c.y.current,
    z: o.c.z.current + o.c.lift.current + arcLift(o),
    width: Math.max(1, o.c.width.current),
    depth: Math.max(1, o.c.depth.current),
    height: Math.max(0, o.c.height.current),
  });
  /** The object's outline right now: part way through a morph, or the layout's shape. */
  const shapeOf = (o: ObjectState): string | undefined =>
    o.outline.morph ? o.outline.morph.d(o.outline.t.current) : o.outline.target ?? undefined;
  /** The object's colour right now, part way between layouts, or undefined if no layout gives one. */
  const colorOf = (o: ObjectState): string | undefined => {
    if (!o.colored) return undefined;
    const c = (v: Channel) => Math.round(Math.max(0, Math.min(255, v.current)));
    return `rgb(${c(o.c.red)}, ${c(o.c.green)}, ${c(o.c.blue)})`;
  };
  const alphaOf = (o: ObjectState) => Math.max(0, Math.min(1, o.c.opacity.current)) * o.c.dim.current;
  const portCenter = (o: ObjectState, port: ScenePort = "top") => {
    const b = boxOf(o);
    const center = { x: b.x + b.width / 2, y: b.y + b.depth / 2, z: b.z + b.height / 2 };
    if (port === "top") return { ...center, z: b.z + b.height };
    if (port === "left") return { ...center, x: b.x };
    if (port === "right") return { ...center, x: b.x + b.width };
    if (port === "front") return { ...center, y: b.y + b.depth };
    if (port === "back") return { ...center, y: b.y };
    return center;
  };

  /* Accessibility */

  const description = document.createElement("p");
  description.id = `rm-scene-${Math.random().toString(36).slice(2, 9)}`;
  description.setAttribute("aria-live", "polite");
  Object.assign(description.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
  });
  canvas.after(description);
  canvas.setAttribute("aria-describedby", description.id);
  if (options.label) canvas.setAttribute("aria-label", options.label);
  if (interact.keyboard) {
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-roledescription", "interactive scene");
  } else {
    canvas.setAttribute("role", "img");
  }
  const describe = () => {
    const o = focused ? byId.get(focused) : undefined;
    const caption = options.layouts[current]!.caption ?? "";
    description.textContent = o ? [o.label, o.description].filter(Boolean).join(": ") : `${current}. ${caption}`.trim();
  };

  /* Animation */

  const allChannels = (): Channel[] => [
    ...Object.values(camera),
    ...objects.flatMap((o) => [...Object.values(o.c), o.outline.t]),
    ...links.map((l) => l.opacity),
    ...points.flatMap((p) => [p.x, p.y, p.z, p.size]),
  ];
  const flowing = () => !reduced() && links.some((l) => l.spec.flow && l.opacity.current > 0.02);

  const go = (v: Channel, target: number) => (reduced() ? v.set(target) : v.to(target));

  const tick = (dt: number): boolean => {
    if (destroyed) return false;
    time += dt;
    // Moves (and fades) whose delay is up start now.
    let waiting = false;
    for (const o of objects) {
      if (!o.pending && !o.fade) continue;
      if (o.pending) {
        if (o.pending.at <= time) {
          const { start } = o.pending;
          o.pending = null;
          start();
        } else waiting = true;
      }
      if (o.fade) {
        if (o.fade.at <= time) {
          o.c.opacity.to(o.fade.to);
          o.fade = null;
        } else waiting = true;
      }
    }
    let moving = waiting;
    for (const c of allChannels()) if (c.step(dt)) moving = true;
    points = points.filter((p) => !(p.leaving && p.size.settled));
    // Only the flow dots move: the solids are reused from the cached layers.
    if (moving || camera.yaw.held) changed = true;
    draw();
    running = moving || camera.yaw.held || (flowing() && visible);
    return running;
  };
  const wake = () => {
    if (destroyed) return;
    changed = true;
    draw();
    if (running) return;
    running = true;
    loop.add(tick);
  };

  /* Drawing */

  /*
   * Drawing is in three layers: scenery under the links, the links, and the solids over them.
   * While something moves, every frame draws all three. When only the dots on flowing links move,
   * the two object layers are drawn once into offscreen canvases and copied each frame, so a
   * resting scene with live links costs a couple of image copies instead of every solid's
   * gradients and glow.
   */
  let changed = true;
  let cache: { under: HTMLCanvasElement; over: HTMLCanvasElement } | null = null;

  /** Draw a frame, then let anything laid over the canvas follow it. */
  function draw(): void {
    drawFrame();
    if (!destroyed) options.onDraw?.();
  }

  function drawFrame(): void {
    if (!ctx || destroyed) return;
    const v = view();
    const ratio = size.pixelRatio;
    if (changed) {
      changed = false;
      cache = null;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      paintLayer(ctx, "under", v);
      drawLinks(v);
      paintLayer(ctx, "over", v);
      drawLinks(v, "risers");
      return;
    }
    if (!cache || cache.under.width !== canvas.width || cache.under.height !== canvas.height) cache = buildCache(v);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!cache) {
      paintLayer(ctx, "under", v);
      drawLinks(v);
      paintLayer(ctx, "over", v);
      drawLinks(v, "risers");
      return;
    }
    ctx.drawImage(cache.under, 0, 0);
    drawLinks(v);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cache.over, 0, 0);
    drawLinks(v, "risers");
  }

  function buildCache(v: Projector): { under: HTMLCanvasElement; over: HTMLCanvasElement } | null {
    const layer = (which: "under" | "over") => {
      const c = document.createElement("canvas");
      c.width = canvas.width;
      c.height = canvas.height;
      const target = c.getContext("2d");
      if (!target) return null;
      paintLayer(target, which, v);
      return c;
    };
    const under = layer("under");
    const over = layer("over");
    return under && over ? { under, over } : null;
  }

  /** Scenery (`under`) or the solids and point cubes (`over`), drawn onto `target`. */
  function paintLayer(target: CanvasRenderingContext2D, which: "under" | "over", v: Projector): void {
    const ratio = size.pixelRatio;
    target.setTransform(ratio, 0, 0, ratio, 0, 0);
    const context = { ctx: target, view: v, pixelRatio: ratio };
    const visibleObjects = objects.filter((o) => alphaOf(o) > 0.01);

    if (which === "under") {
      for (const o of visibleObjects.filter((o) => o.look.background)) {
        target.globalAlpha = alphaOf(o);
        o.look.draw(context, {
          box: boxOf(o),
          label: o.label,
          palette: o.palette,
          glow: o.c.glow.current,
          shape: shapeOf(o),
          fill: o.c.fill.current,
          ghost: o.c.ghost.current,
          color: colorOf(o),
        });
      }
      target.globalAlpha = 1;
      return;
    }

    type Item = { x: number; y: number; z: number; width: number; depth: number; height: number; paint: () => void; front?: () => void };
    const items: Item[] = visibleObjects
      .filter((o) => !o.look.background)
      .map((o) => {
        const box = boxOf(o);
        const state = () => ({
          box,
          label: o.label,
          palette: o.palette,
          glow: o.c.glow.current,
          shape: shapeOf(o),
          fill: o.c.fill.current,
          ghost: o.c.ghost.current,
          color: colorOf(o),
        });
        const front = o.look.drawFront?.bind(o.look);
        return {
          ...box,
          paint: () => {
            target.globalAlpha = alphaOf(o);
            o.look.draw(context, state());
          },
          front: front
            ? () => {
                target.globalAlpha = alphaOf(o);
                front(context, state());
              }
            : undefined,
        };
      });
    for (const p of points) {
      const s = Math.max(0, p.size.current);
      if (s < 0.5) continue;
      const box: Box3 = { x: p.x.current - s / 2, y: p.y.current - s / 2, z: p.z.current, width: s, depth: s, height: s };
      items.push({
        ...box,
        paint: () => {
          target.globalAlpha = 1;
          looks.tower.draw(context, { box, label: "", palette: pointPalette, glow: 0 });
        },
      });
    }
    // Things resting inside a container are painted just after it, then its front walls go over
    // them: what's below the rim stays hidden, whatever order depth alone would give.
    const containers = items.filter((i) => i.front);
    const holder = new Map<Item, Item>();
    for (const item of items) {
      if (item.front) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.depth / 2;
      let best: Item | null = null;
      for (const c of containers) {
        const inside =
          cx > c.x && cx < c.x + c.width && cy > c.y && cy < c.y + c.depth && item.z >= c.z - 0.5 && item.z < c.z + c.height - 0.5;
        if (inside && (!best || c.width * c.depth < best.width * best.depth)) best = c;
      }
      if (best) holder.set(item, best);
    }
    const held = new Map<Item, Item[]>();
    for (const [item, c] of holder) held.set(c, [...(held.get(c) ?? []), item]);
    for (const item of paintOrder(
      items.filter((i) => !holder.has(i)),
      v,
    )) {
      item.paint();
      const inside = held.get(item);
      if (inside) for (const thing of paintOrder(inside, v)) thing.paint();
      if (inside && item.front) item.front();
    }
    target.globalAlpha = 1;
  }

  /** A link's route on the floor, in scene space, from the two objects' current boxes. */
  const routeLink = (l: (typeof links)[number]) => routeOnFloor(boxOf(byId.get(l.spec.from)!), boxOf(byId.get(l.spec.to)!), l.spec);
  type Point2 = { x: number; y: number };

  /**
   * Draws the links. Floor links go under the solids, so objects cover the ends that run behind
   * them; risers between stacked objects go over (`pass: "risers"`).
   */
  function drawLinks(v: Projector, pass: "floor" | "risers" = "floor"): void {
    if (!ctx) return;
    const ratio = size.pixelRatio;
    links.forEach((l, i) => {
      const a = byId.get(l.spec.from)!;
      const b = byId.get(l.spec.to)!;
      const alpha = l.opacity.current * Math.min(alphaOf(a), alphaOf(b));
      if (alpha < 0.02) return;
      const { points, riser } = routeLink(l);
      if (riser !== (pass === "risers")) return;
      const screen = points.map((p) => v.project(p.x, p.y, p.z));

      // Lengths along the line on screen, so flowing dots move at an even speed.
      const lengths = [0];
      for (let k = 1; k < screen.length; k++)
        lengths.push(lengths[k - 1]! + Math.hypot(screen[k]!.x - screen[k - 1]!.x, screen[k]!.y - screen[k - 1]!.y));
      const total = lengths[lengths.length - 1]!;
      if (total < 1) return;
      const at = (t: number): Point2 & { angle: number } => {
        const want = t * total;
        let k = 1;
        while (k < lengths.length - 1 && lengths[k]! < want) k++;
        const p0 = screen[k - 1]!;
        const p1 = screen[k]!;
        const span = lengths[k]! - lengths[k - 1]! || 1;
        const f = (want - lengths[k - 1]!) / span;
        return { x: p0.x + (p1.x - p0.x) * f, y: p0.y + (p1.y - p0.y) * f, angle: Math.atan2(p1.y - p0.y, p1.x - p0.x) };
      };

      ctx.save();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${basePalette.line}, ${0.55 * alpha})`;
      ctx.lineWidth = 1.25;
      ctx.setLineDash(l.spec.dashed ? [4, 5] : []);
      ctx.beginPath();
      ctx.moveTo(screen[0]!.x, screen[0]!.y);
      for (let k = 1; k < screen.length; k++) ctx.lineTo(screen[k]!.x, screen[k]!.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(${basePalette.line}, ${0.85 * alpha})`;
      const arrow = (point: Point2, angle: number) => {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x - Math.cos(angle - 0.45) * 7, point.y - Math.sin(angle - 0.45) * 7);
        ctx.lineTo(point.x - Math.cos(angle + 0.45) * 7, point.y - Math.sin(angle + 0.45) * 7);
        ctx.closePath();
        ctx.fill();
      };
      if (l.spec.arrow === "end" || l.spec.arrow === "both") arrow(screen[screen.length - 1]!, at(0.999).angle);
      if (l.spec.arrow === "start" || l.spec.arrow === "both") arrow(screen[0]!, at(0.001).angle + Math.PI);
      if (l.spec.label) {
        const middle = at(0.5);
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(l.spec.label, middle.x, middle.y - 7);
      }
      if (l.spec.flow && !reduced()) {
        for (let k = 0; k < 2; k++) {
          const f = (time * 0.32 + i * 0.21 + k * 0.5) % 1;
          ctx.fillStyle = `rgba(${basePalette.glow}, ${0.95 * alpha * Math.sin(f * Math.PI)})`;
          const point = at(f);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  /* Layouts and focus */

  function cameraTarget(layout: SceneLayout): Camera {
    if (layout.camera === "fit") {
      const boxes = Object.values(layout.objects).filter((b) => (b.opacity ?? 1) > 0);
      return fitCamera(boxes, size);
    }
    return iso(layout.camera);
  }

  function applyCamera(target: Camera, instant: boolean): void {
    // Turn the short way round, even after the scene has been spun by hand.
    const yaw = target.yaw + 360 * Math.round((camera.yaw.current - target.yaw) / 360);
    const set = (c: Channel, t: number) => (instant || reduced() ? c.set(t) : c.to(t));
    set(camera.yaw, yaw);
    set(camera.pitch, target.pitch);
    set(camera.zoom, target.zoom);
    set(camera.centerX, target.centerX);
    set(camera.centerY, target.centerY);
  }

  function emphasise(): void {
    for (const o of objects) {
      const on = o.id === hovered && o.interactive;
      const picked = o.id === focused;
      go(o.c.lift, picked ? 26 : on ? 14 : 0);
      go(o.c.glow, picked || on ? 1 : 0);
      go(o.c.dim, focused && !picked && o.interactive ? 0.3 : 1);
    }
    describe();
    wake();
  }

  function to(name: string): void {
    const layout = options.layouts[name];
    if (!layout) throw new RangeError(`scene: unknown layout "${name}"`);
    current = name;
    for (const o of objects) {
      const box = layout.objects[o.id];
      if (!box) {
        o.pending = null;
        o.fade = null;
        go(o.c.opacity, 0);
        continue;
      }
      o.label = box.label ?? options.objects[o.id]!.label ?? "";
      const start = () => moveTo(o, box);
      // A newer layout replaces any move still waiting to start.
      o.pending = null;
      o.fade = null;
      const delay = reduced() ? 0 : Math.max(0, box.delay ?? 0);
      if (delay > 0) o.pending = { at: time + delay, start };
      else start();
    }
    for (const l of links) go(l.opacity, !l.spec.layouts || l.spec.layouts.includes(name) ? 1 : 0);
    applyCamera(cameraTarget(layout), false);
    if (focused && !layout.objects[focused]) focused = null;
    emphasise();
  }

  /** Send one object to its place in a layout. */
  function moveTo(o: ObjectState, box: LayoutBox): void {
    if (box.shape !== undefined && box.shape !== o.outline.target) reshape(o, box.shape);
    const arc = reduced() ? 0 : box.arc ?? 0;
    o.travel = arc > 0 ? { fromX: o.c.x.current, fromY: o.c.y.current, toX: box.x, toY: box.y, arc } : null;
    go(o.c.x, box.x);
    go(o.c.y, box.y);
    go(o.c.z, box.z ?? 0);
    go(o.c.width, box.width);
    go(o.c.depth, box.depth);
    go(o.c.height, box.height ?? o.look.defaultHeight);
    const fadeDelay = reduced() ? 0 : Math.max(0, box.fadeDelay ?? 0);
    if (fadeDelay > 0) o.fade = { at: time + fadeDelay, to: box.opacity ?? 1 };
    else go(o.c.opacity, box.opacity ?? 1);
    go(o.c.fill, Math.max(0, Math.min(1, box.fill ?? 0)));
    go(o.c.ghost, Math.max(0, Math.min(1, box.ghost ?? 0)));
    if (box.color !== undefined) {
      const [r, g, b] = parseColor(box.color);
      go(o.c.red, r);
      go(o.c.green, g);
      go(o.c.blue, b);
    }
  }

  /** Morph an object's outline from wherever it is now to `shape`. */
  function reshape(o: ObjectState, shape: string): void {
    const from = shapeOf(o) ?? o.look.path;
    o.outline.target = shape;
    if (!from || !o.look.path) {
      o.outline.morph = null;
      return;
    }
    // Both ends in the same 100 × 100 box, so the morph changes the outline, not its size.
    o.outline.morph = createMorph(unitPath({ path: from }), unitPath({ path: shape }));
    o.outline.t.set(0);
    go(o.outline.t, 1);
  }

  /** Focus from code: no callback, the caller already knows. */
  function focus(id: string | null): void {
    setFocus(id, false);
  }

  /** Focus from the user (tap or keyboard): reported through `onFocusChange`. */
  function setFocus(id: string | null, byUser: boolean): void {
    if (id !== null && !byId.get(id)?.interactive) throw new RangeError(`scene: "${id}" is not an interactive object`);
    if (id === focused) return;
    focused = id;
    emphasise();
    if (byUser) options.onFocusChange?.(focused);
  }

  function setPoints(list: readonly Point3[], pointOptions: PointsOptions = {}): void {
    const edge = pointOptions.size ?? 20;
    pointPalette = resolvePalette(pointOptions.palette, basePalette);
    const live = points.filter((p) => !p.leaving);
    const matches = matchPoints(
      live.map((p) => ({ x: p.x.target, y: p.y.target, z: p.z.target })),
      list,
      pointOptions.match,
    );
    for (const [i, j] of matches.pairs) {
      const p = live[i]!;
      const q = list[j]!;
      go(p.x, q.x);
      go(p.y, q.y);
      go(p.z, q.z ?? 0);
      go(p.size, edge);
    }
    for (const i of matches.leaving) {
      const p = live[i]!;
      p.leaving = true;
      go(p.size, 0);
    }
    for (const j of matches.arriving) {
      const q = list[j]!;
      const p: PointState = { x: ch(q.x), y: ch(q.y), z: ch(q.z ?? 0), size: ch(0, spring, 0.05), leaving: false };
      go(p.size, edge);
      points.push(p);
    }
    if (reduced()) points = points.filter((p) => !p.leaving);
    wake();
  }

  /* Pointer and keyboard */

  /** A pointer position in the canvas's own CSS pixels, even inside a scaled container. */
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const sx = r.width > 0 ? size.width / r.width : 1;
    const sy = r.height > 0 ? size.height / r.height : 1;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  /** The frontmost interactive object under a point, using the same silhouettes that are drawn. */
  function hitTest(point: { x: number; y: number }): string | null {
    const v = view();
    const candidates = objects.filter((o) => o.interactive && alphaOf(o) > 0.3).map((o) => ({ o, ...boxOf(o) }));
    for (const item of paintOrder(candidates, v).reverse()) {
      const outline = item.o.look.outline(item);
      if (pointInPolygon(point, silhouette({ outline, z0: item.z, z1: item.z + item.height, view: v }))) return item.o.id;
    }
    return null;
  }

  const tracker = velocityTracker();
  let drag: { x: number; yaw: number; moved: boolean } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    if (!interact.drag && !interact.tap) return;
    try {
      // Capture keeps the drag going outside the canvas. It throws if the pointer is already
      // gone (cancelled, or a synthetic event), which must not break the interaction.
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Dragging still works inside the canvas without capture.
    }
    drag = { x: e.clientX, yaw: camera.yaw.current, moved: false };
    tracker.reset();
    tracker.add(e.timeStamp, camera.yaw.current);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (drag && interact.drag) {
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD) {
        drag.moved = true;
        camera.yaw.hold();
      }
      if (drag.moved) {
        camera.yaw.set(drag.yaw + dx * DEGREES_PER_PIXEL);
        tracker.add(e.timeStamp, camera.yaw.current);
        wake();
      }
      return;
    }
    if (!interact.hover) return;
    const id = hitTest(local(e));
    canvas.style.cursor = id ? "pointer" : "";
    if (id !== hovered) {
      hovered = id;
      emphasise();
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!drag) return;
    if (drag.moved) {
      // Let go with a flick and the scene keeps turning, coming to rest where the flick would coast.
      const velocity = tracker.velocity(e.timeStamp);
      camera.yaw.release({
        velocity: reduced() ? 0 : velocity,
        target: camera.yaw.current + (reduced() ? 0 : project(velocity, deceleration.fast)),
      });
      wake();
    } else if (interact.tap) {
      const id = hitTest(local(e));
      setFocus(id && id !== focused ? id : null, true);
    }
    drag = null;
  };
  const onPointerLeave = () => {
    if (hovered) {
      hovered = null;
      emphasise();
    }
  };

  /** Interactive objects in reading order: top to bottom, then left to right on screen. */
  const readingOrder = () => {
    const v = view();
    return objects
      .filter((o) => o.interactive && alphaOf(o) > 0.3)
      .map((o) => {
        const point = portCenter(o);
        return { o, at: v.project(point.x, point.y, point.z) };
      })
      .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
      .map((x) => x.o.id);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!interact.keyboard) return;
    const order = readingOrder();
    if (order.length === 0) return;
    const index = focused ? order.indexOf(focused) : -1;
    let next: string | null | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = order[(index + 1) % order.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = order[(index - 1 + order.length) % order.length];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    else if (e.key === "Escape") next = null;
    else return;
    e.preventDefault();
    setFocus(next ?? null, true);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("keydown", onKeyDown);
  if (interact.drag) canvas.style.touchAction = "pan-y";

  const resize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });
          // A fitted diagram re-fits at once; springing it on every resize would wobble.
          if (options.layouts[current]!.camera === "fit") applyCamera(cameraTarget(options.layouts[current]!), true);
          changed = true;
          draw();
        })
      : null;
  resize?.observe(canvas);
  const intersection =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (visible && flowing()) wake();
        })
      : null;
  intersection?.observe(canvas);

  applyCamera(cameraTarget(firstLayout), true);
  describe();
  draw();
  if (flowing()) wake();

  return {
    get layout() {
      return current;
    },
    get focused() {
      return focused;
    },
    to,
    focus,
    points: setPoints,
    box(id) {
      const o = byId.get(id);
      return o ? boxOf(o) : null;
    },
    anchor(id, port = "top") {
      const o = byId.get(id);
      if (!o) return null;
      const v = view();
      if (port === "screen-left" || port === "screen-right") {
        const box = boxOf(o);
        const points = projectOutline(o.look.outline(box), box.z + box.height / 2, v);
        let best = points[0];
        for (const p of points) if (best === undefined || (port === "screen-left" ? p.x < best.x : p.x > best.x)) best = p;
        return best ? { x: best.x, y: best.y } : null;
      }
      const t = portCenter(o, port);
      return v.project(t.x, t.y, t.z);
    },
    pick: (x, y) => hitTest({ x, y }),
    render() {
      changed = true;
      draw();
    },
    destroy() {
      destroyed = true;
      resize?.disconnect();
      intersection?.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeAttribute("aria-describedby");
      description.remove();
    },
  };
}
