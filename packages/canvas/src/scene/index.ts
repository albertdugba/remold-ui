import { createMorph, type Point3, type SpringConfig } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { fitCamera, iso, projector, type Camera, type Projector } from "../camera";
import { fitCanvas, type CanvasSize } from "../canvas-size";
import { paintOrder, pointInPolygon, projectOutline, silhouette } from "../geometry";
import { parseColor, unitPath } from "../extrude";
import { routeOnFloor } from "../links";
import { palettes } from "../object-looks";
import { createDescription } from "./description";
import { attachInput } from "./input";
import { paintLayer, type Layer } from "./layers";
import { paintLink } from "./link-paint";
import { updatePoints } from "./points";
import { alphaOf, boxOf, channel, createObject, portCenter, QUICK, resolvePalette, shapeOf } from "./objects";
import type { Channel, LayoutBox, LinkState, ObjectState, PointState, PointsOptions, Scene, SceneLayout, SceneOptions } from "./types";

export type {
  AnchorPort,
  LayoutBox,
  LinkRoute,
  PointsOptions,
  Scene,
  SceneLayout,
  SceneLink,
  SceneObject,
  SceneOptions,
  ScenePort,
} from "./types";

const DEFAULT_SPRING: SpringConfig = { duration: 0.8, bounce: 0.18 };
const HOVER_LIFT = 14;
const FOCUS_LIFT = 26;
const FOCUS_DIM = 0.3;
const HIT_ALPHA = 0.3;

function cameraTarget(layout: SceneLayout, size: CanvasSize): Camera {
  if (layout.camera !== "fit") return iso(layout.camera);

  return fitCamera(
    Object.values(layout.objects).filter((box) => (box.opacity ?? 1) > 0),
    size,
  );
}

function checkLinks(options: SceneOptions, ids: ReadonlySet<string>) {
  for (const link of options.links ?? []) {
    if (!ids.has(link.from) || !ids.has(link.to)) throw new RangeError(`scene: link ${link.from} → ${link.to} names an unknown object`);
  }
}

const shownIn = (layouts: readonly string[] | undefined, name: string) => !layouts || layouts.includes(name);

function screenEdge(points: readonly { x: number; y: number }[], left: boolean) {
  const best = points.reduce<{ x: number; y: number } | undefined>(
    (edge, point) => (edge === undefined || (left ? point.x < edge.x : point.x > edge.x) ? point : edge),
    points[0],
  );

  return best ? { x: best.x, y: best.y } : null;
}

/** An isometric scene whose objects spring between named layouts. */
export function scene(canvas: HTMLCanvasElement, options: SceneOptions): Scene {
  const layoutNames = Object.keys(options.layouts);

  if (layoutNames.length === 0) throw new RangeError("scene: at least one layout is required");

  const spring = options.spring ?? DEFAULT_SPRING;
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

  const camera = {
    yaw: channel(45, spring, 0.01),
    pitch: channel(60, spring, 0.01),
    zoom: channel(1, spring, 0.001),
    centerX: channel(0, spring),
    centerY: channel(0, spring),
  };

  const view = (): Projector =>
    projector(
      { yaw: camera.yaw.current, pitch: camera.pitch.current, zoom: camera.zoom.current, centerX: camera.centerX.current, centerY: camera.centerY.current },
      size,
    );

  const firstLayout = options.layouts[current]!;
  const objects = Object.keys(options.objects).map((id) => createObject(id, options, current, spring, basePalette));
  const byId = new Map(objects.map((object) => [object.id, object]));

  checkLinks(options, new Set(byId.keys()));

  const links: LinkState[] = (options.links ?? []).map((spec) => ({
    spec,
    opacity: channel(shownIn(spec.layouts, current) ? 1 : 0, QUICK, 0.005),
  }));

  let points: PointState[] = [];
  let pointPalette = basePalette;

  const description = createDescription(canvas, options.label, interact.keyboard);

  const describe = () => {
    const object = focused ? byId.get(focused) : undefined;
    const caption = options.layouts[current]!.caption ?? "";

    description.textContent = object ? [object.label, object.description].filter(Boolean).join(": ") : `${current}. ${caption}`.trim();
  };

  const allChannels = (): Channel[] => [
    ...Object.values(camera),
    ...objects.flatMap((object) => [...Object.values(object.c), object.outline.t]),
    ...links.map((link) => link.opacity),
    ...points.flatMap((point) => [point.x, point.y, point.z, point.size]),
  ];

  const flowing = () => !reduced() && links.some((link) => link.spec.flow && link.opacity.current > 0.02);

  const go = (target: Channel, to: number) => (reduced() ? target.set(to) : target.to(to));

  const startDue = (object: ObjectState): boolean => {
    let waiting = false;

    if (object.pending) {
      if (object.pending.at <= time) {
        const { start } = object.pending;

        object.pending = null;
        start();
      } else {
        waiting = true;
      }
    }

    if (object.fade) {
      if (object.fade.at <= time) {
        object.c.opacity.to(object.fade.to);
        object.fade = null;
      } else {
        waiting = true;
      }
    }

    return waiting;
  };

  const tick = (dt: number): boolean => {
    if (destroyed) return false;

    time += dt;

    let moving = false;

    for (const object of objects) {
      if ((object.pending || object.fade) && startDue(object)) moving = true;
    }

    for (const animated of allChannels()) if (animated.step(dt)) moving = true;

    points = points.filter((point) => !(point.leaving && point.size.settled));

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

  let changed = true;
  let cache: { under: HTMLCanvasElement; over: HTMLCanvasElement } | null = null;

  const layerScene = () => ({ objects, points, pointPalette });

  const paintInto = (target: CanvasRenderingContext2D, which: Layer, projection: Projector) =>
    paintLayer(target, which, projection, size.pixelRatio, layerScene());

  function drawLinks(projection: Projector, pass: "floor" | "risers" = "floor"): void {
    if (!ctx) return;

    links.forEach((link, index) => {
      const from = byId.get(link.spec.from)!;
      const to = byId.get(link.spec.to)!;
      const alpha = link.opacity.current * Math.min(alphaOf(from), alphaOf(to));

      if (alpha < 0.02) return;

      const route = routeOnFloor(boxOf(from), boxOf(to), link.spec);

      if (route.riser !== (pass === "risers")) return;

      paintLink(ctx, projection, size.pixelRatio, basePalette, { spec: link.spec, points: route.points, alpha, index, time, flowing: !reduced() });
    });
  }

  const paintAll = (projection: Projector) => {
    paintInto(ctx, "under", projection);
    drawLinks(projection);
    paintInto(ctx, "over", projection);
    drawLinks(projection, "risers");
  };

  function buildCache(projection: Projector): { under: HTMLCanvasElement; over: HTMLCanvasElement } | null {
    const layer = (which: Layer) => {
      const layerCanvas = document.createElement("canvas");

      layerCanvas.width = canvas.width;
      layerCanvas.height = canvas.height;

      const target = layerCanvas.getContext("2d");

      if (!target) return null;

      paintInto(target, which, projection);

      return layerCanvas;
    };

    const under = layer("under");
    const over = layer("over");

    return under && over ? { under, over } : null;
  }

  function drawFrame(): void {
    if (!ctx || destroyed) return;

    const projection = view();

    if (changed) {
      changed = false;
      cache = null;
      ctx.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      paintAll(projection);
      return;
    }

    if (!cache || cache.under.width !== canvas.width || cache.under.height !== canvas.height) cache = buildCache(projection);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!cache) {
      paintAll(projection);
      return;
    }

    ctx.drawImage(cache.under, 0, 0);
    drawLinks(projection);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cache.over, 0, 0);
    drawLinks(projection, "risers");
  }

  function draw(): void {
    drawFrame();

    if (!destroyed) options.onDraw?.();
  }

  function applyCamera(target: Camera, instant: boolean): void {
    const yaw = target.yaw + 360 * Math.round((camera.yaw.current - target.yaw) / 360);
    const set = (animated: Channel, to: number) => (instant || reduced() ? animated.set(to) : animated.to(to));

    set(camera.yaw, yaw);
    set(camera.pitch, target.pitch);
    set(camera.zoom, target.zoom);
    set(camera.centerX, target.centerX);
    set(camera.centerY, target.centerY);
  }

  function emphasise(): void {
    for (const object of objects) {
      const hover = object.id === hovered && object.interactive;
      const picked = object.id === focused;

      go(object.c.lift, picked ? FOCUS_LIFT : hover ? HOVER_LIFT : 0);
      go(object.c.glow, picked || hover ? 1 : 0);
      go(object.c.dim, focused && !picked && object.interactive ? FOCUS_DIM : 1);
    }

    describe();
    wake();
  }

  function reshape(object: ObjectState, shape: string): void {
    const settled = !object.outline.morph || object.outline.t.settled;
    const from = (settled ? object.outline.target : shapeOf(object)) ?? object.look.path;

    object.outline.target = shape;

    if (!from || !object.look.path) {
      object.outline.morph = null;
      return;
    }

    object.outline.morph = createMorph(unitPath({ path: from }), unitPath({ path: shape }));
    object.outline.t.set(0);
    go(object.outline.t, 1);
  }

  function recolor(object: ObjectState, color: string) {
    const [red, green, blue] = parseColor(color);

    go(object.c.red, red);
    go(object.c.green, green);
    go(object.c.blue, blue);
  }

  function moveTo(object: ObjectState, box: LayoutBox): void {
    const { c } = object;

    if (box.shape !== undefined && box.shape !== object.outline.target) reshape(object, box.shape);

    const arc = reduced() ? 0 : (box.arc ?? 0);

    object.travel = arc > 0 ? { fromX: c.x.current, fromY: c.y.current, toX: box.x, toY: box.y, arc } : null;
    go(c.x, box.x);
    go(c.y, box.y);
    go(c.z, box.z ?? 0);
    go(c.width, box.width);
    go(c.depth, box.depth);
    go(c.height, box.height ?? object.look.defaultHeight);

    const fadeDelay = reduced() ? 0 : Math.max(0, box.fadeDelay ?? 0);

    if (fadeDelay > 0) object.fade = { at: time + fadeDelay, to: box.opacity ?? 1 };
    else go(c.opacity, box.opacity ?? 1);

    go(c.fill, Math.max(0, Math.min(1, box.fill ?? 0)));
    go(c.ghost, Math.max(0, Math.min(1, box.ghost ?? 0)));

    if (box.color !== undefined) recolor(object, box.color);
  }

  function placeObject(object: ObjectState, layout: SceneLayout) {
    const box = layout.objects[object.id];

    object.pending = null;
    object.fade = null;

    if (!box) {
      go(object.c.opacity, 0);
      return;
    }

    object.label = box.label ?? options.objects[object.id]!.label ?? "";

    const start = () => moveTo(object, box);
    const delay = reduced() ? 0 : Math.max(0, box.delay ?? 0);

    if (delay > 0) object.pending = { at: time + delay, start };
    else start();
  }

  function to(name: string): void {
    const layout = options.layouts[name];

    if (!layout) throw new RangeError(`scene: unknown layout "${name}"`);

    current = name;

    for (const object of objects) placeObject(object, layout);

    for (const link of links) go(link.opacity, shownIn(link.spec.layouts, name) ? 1 : 0);

    applyCamera(cameraTarget(layout, size), false);

    if (focused && !layout.objects[focused]) focused = null;

    emphasise();
  }

  function setFocus(id: string | null, byUser: boolean): void {
    if (id !== null && !byId.get(id)?.interactive) throw new RangeError(`scene: "${id}" is not an interactive object`);

    if (id === focused) return;

    focused = id;
    emphasise();

    if (byUser) options.onFocusChange?.(focused);
  }

  function setPoints(list: readonly Point3[], pointOptions: PointsOptions = {}): void {
    pointPalette = resolvePalette(pointOptions.palette, basePalette);
    points = updatePoints(points, list, pointOptions, { go, spring, reduced: reduced() });
    wake();
  }

  function hitTest(point: { x: number; y: number }): string | null {
    const projection = view();
    const candidates = objects.filter((object) => object.interactive && alphaOf(object) > HIT_ALPHA).map((object) => ({ object, ...boxOf(object) }));

    for (const item of paintOrder(candidates, projection).reverse()) {
      const outline = item.object.look.outline(item);

      if (pointInPolygon(point, silhouette({ outline, z0: item.z, z1: item.z + item.height, view: projection }))) return item.object.id;
    }

    return null;
  }

  const readingOrder = () => {
    const projection = view();

    return objects
      .filter((object) => object.interactive && alphaOf(object) > HIT_ALPHA)
      .map((object) => {
        const point = portCenter(object);

        return { object, at: projection.project(point.x, point.y, point.z) };
      })
      .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
      .map((entry) => entry.object.id);
  };

  const input = attachInput({
    canvas,
    interact,
    yaw: camera.yaw,
    size: () => size,
    reduced,
    hitTest,
    readingOrder,
    focused: () => focused,
    hovered: () => hovered,
    setFocus,
    setHovered: (id) => {
      hovered = id;
      emphasise();
    },
    wake,
  });

  const resize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });

          if (options.layouts[current]!.camera === "fit") applyCamera(cameraTarget(options.layouts[current]!, size), true);

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

  applyCamera(cameraTarget(firstLayout, size), true);
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

    focus: (id) => setFocus(id, false),

    points: setPoints,

    box(id) {
      const object = byId.get(id);

      return object ? boxOf(object) : null;
    },

    anchor(id, port = "top") {
      const object = byId.get(id);

      if (!object) return null;

      const projection = view();

      if (port === "screen-left" || port === "screen-right") {
        const box = boxOf(object);

        return screenEdge(projectOutline(object.look.outline(box), box.z + box.height / 2, projection), port === "screen-left");
      }

      const target = portCenter(object, port);

      return projection.project(target.x, target.y, target.z);
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
      input.destroy();
      canvas.removeAttribute("aria-describedby");
      description.remove();
    },
  };
}
