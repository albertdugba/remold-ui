import { frames, prefersReducedMotion } from "@remold-ui/dom";
import type { Box3 } from "../geometry";
import { looks, type Look } from "../object-looks";
import { routeOnFloor } from "../links";
import { scene as createScene, type LayoutBox, type Scene, type SceneLayout, type SceneLink } from "../scene";
import { createClock } from "./clock";
import { paintBadge, paintCountdown, paintHighlight, paintLinkState, paintLit, paintNodeLabel, paintPacket, paintSideLabel } from "./paint";
import { easeInOut, outAndBack, pointAlong, type Point } from "./path";
import type { CountdownOptions, Diagram, DiagramColors, DiagramLink, DiagramNode, DiagramOptions, LightState, LinkState, NodeStatus, SendOptions } from "./types";

export type { CountdownOptions, Diagram, DiagramColors, DiagramLink, DiagramNode, DiagramOptions, LightState, LinkState, NodeStatus, SendOptions } from "./types";
export { story, type Story, type StoryOptions } from "./story";
export { lineSkin, skins, type DiagramSkin, type LineSkinOptions } from "./skins";

const LIVE = "live";
const DEFAULT_SIZE = 120;
const SEND_SECONDS = 0.9;
const POP_SECONDS = 0.22;
const FADE_SECONDS = 0.25;
const LABEL_GAP = 18;
const COUNTDOWN_GAP = 20;

const DEFAULT_COLORS: DiagramColors = {
  ok: "22, 163, 74",
  error: "220, 38, 38",
  pending: "217, 119, 6",
  packet: "79, 70, 229",
  packetText: "#ffffff",
  label: "#18181b",
  surface: "255, 255, 255",
};

interface NodeState {
  spec: DiagramNode;
  at: readonly [number, number];
  z: number;
  arc: number;
  label: string;
  hidden: boolean;
  shownAt: number;
  status: NodeStatus;
  statusAt: number;
  countdown: { ends: number; format: (seconds: number) => string } | null;
  lit: Exclude<LightState, null> | null;
  litAt: number;
}

interface Packet {
  from: string;
  to: string;
  start: number;
  duration: number;
  turns: boolean;
  label?: string;
  color: string;
}

const toSceneLink = (link: DiagramLink): SceneLink => ("from" in link ? { ...link } : { from: link[0], to: link[1] });

const footprint = (size: DiagramNode["size"]): readonly [number, number] =>
  typeof size === "number" ? [size, size] : (size ?? [DEFAULT_SIZE, DEFAULT_SIZE]);

const clamp01 = (amount: number) => Math.max(0, Math.min(1, amount));

function freshNode(spec: DiagramNode): NodeState {
  return {
    spec,
    at: spec.at,
    z: spec.z ?? 0,
    arc: 0,
    label: spec.label ?? "",
    hidden: spec.hidden ?? false,
    shownAt: Number.NEGATIVE_INFINITY,
    status: null,
    statusAt: 0,
    countdown: null,
    lit: null,
    litAt: Number.NEGATIVE_INFINITY,
  };
}

function boxFor(node: NodeState): LayoutBox {
  const [width, depth] = footprint(node.spec.size);

  return {
    x: node.at[0] - width / 2,
    y: node.at[1] - depth / 2,
    z: node.z,
    width,
    depth,
    height: node.spec.height,
    opacity: node.hidden ? 0 : 1,
    arc: node.arc,
  };
}

function cameraFor(camera: DiagramOptions["camera"]): SceneLayout["camera"] {
  if (camera === "flat") return "fit";

  return camera === "iso" || camera === undefined ? undefined : camera;
}

function checkNodes(options: DiagramOptions) {
  if (Object.keys(options.nodes).length === 0) throw new RangeError("diagram: at least one node is required");
}

function corners(box: Box3, z: number, scene: Scene): Point[] {
  return [
    scene.project(box.x, box.y, z),
    scene.project(box.x + box.width, box.y, z),
    scene.project(box.x + box.width, box.y + box.depth, z),
    scene.project(box.x, box.y + box.depth, z),
  ];
}

function lookOf(look: DiagramNode["look"]): Look {
  if (look === undefined) return looks.plate;

  return typeof look === "string" ? looks[look] : look;
}

/** A scene you tell a story with: send packets, mark nodes ok or failing, count down, reroute. */
export function diagram(canvas: HTMLCanvasElement, options: DiagramOptions): Diagram {
  checkNodes(options);

  const skin = options.skin;
  const style = skin?.style ?? "solid";
  const colors: DiagramColors = { ...DEFAULT_COLORS, ...options.colors, ...skin?.colors };
  const loop = options.loop ?? { add: frames };
  const reduced = () => options.reducedMotion === "always" || (options.reducedMotion !== "never" && prefersReducedMotion());
  const clock = createClock();
  const links = (options.links ?? []).map(toSceneLink);
  const nodes = new Map(Object.entries(options.nodes).map(([id, spec]) => [id, freshNode(spec)]));

  let packets: Packet[] = [];
  let linkStates = new Map<SceneLink, Exclude<LinkState, null>>();
  let running = false;
  let destroyed = false;
  let mounted = false;
  let highlighted: { id: string; since: number } | null = null;
  let onScreen = true;
  const lookFor = (spec: DiagramNode) => (skin ? skin.look(spec.look ?? "plate") : lookOf(spec.look));
  const drawnLooks = new Map(Object.entries(options.nodes).map(([id, spec]) => [id, lookFor(spec)]));

  const layout = (): SceneLayout => ({
    camera: cameraFor(options.camera),
    objects: Object.fromEntries([...nodes].map(([id, node]) => [id, boxFor(node)])),
  });

  const view = createScene(canvas, {
    objects: Object.fromEntries(
      Object.entries(options.nodes).map(([id, spec]) => [
        id,
        {
          look: drawnLooks.get(id)!,
          palette: skin ? undefined : spec.palette,
          label: "",
          interactive: false,
        },
      ]),
    ),
    layouts: { [LIVE]: layout() },
    links,
    label: options.label,
    palette: skin?.palette ?? options.palette,
    spring: options.spring,
    reducedMotion: options.reducedMotion,
    loop: options.loop,
    maxPixelRatio: options.maxPixelRatio,
    interact: { drag: false },
    onDraw: () => paintOverlay(),
  });

  function paintLights(ctx: CanvasRenderingContext2D) {
    for (const [id, node] of nodes) {
      const box = node.lit && !node.hidden ? view.box(id) : null;
      const look = drawnLooks.get(id);

      if (!node.lit || !box || !look) continue;

      const top = look.outline(box).map((point) => view.project(point.x, point.y, box.z + box.height));
      const alpha = reduced() ? 1 : clamp01((clock.now - node.litAt) / FADE_SECONDS);

      paintLit(ctx, top, node.lit === "error" ? colors.error : colors.packet, alpha);
    }
  }

  function paintHighlighted(ctx: CanvasRenderingContext2D) {
    const box = highlighted ? view.box(highlighted.id) : null;
    const look = highlighted ? drawnLooks.get(highlighted.id) : undefined;

    if (!highlighted || !box || !look) return;

    const outline = look.outline(box);
    const ring = (z: number) => outline.map((point) => view.project(point.x, point.y, z));
    const alpha = reduced() ? 1 : clamp01((clock.now - highlighted.since) / FADE_SECONDS);

    paintHighlight(ctx, ring(box.z + box.height), ring(box.z), colors.packet, alpha);
  }

  function nodeOf(id: string): NodeState {
    const node = nodes.get(id);

    if (!node) throw new RangeError(`diagram: unknown node "${id}"`);

    return node;
  }

  function linkBetween(from: string, to: string): { link: SceneLink; reversed: boolean } {
    nodeOf(from);
    nodeOf(to);

    const link = links.find((candidate) => (candidate.from === from && candidate.to === to) || (candidate.from === to && candidate.to === from));

    if (!link) throw new RangeError(`diagram: no link between "${from}" and "${to}"`);

    return { link, reversed: link.from !== from };
  }

  function screenRoute(from: string, to: string): Point[] {
    const { link, reversed } = linkBetween(from, to);
    const start = view.box(link.from);
    const end = view.box(link.to);

    if (!start || !end) return [];

    const points = routeOnFloor(start, end, link).points.map((point) => view.project(point.x, point.y, point.z));

    return reversed ? points.reverse() : points;
  }

  const pixelRatio = () => {
    const width = canvas.getBoundingClientRect().width;

    return width > 0 ? canvas.width / width : 1;
  };

  function labelAlpha(node: NodeState) {
    const shown = clamp01((clock.now - node.shownAt) / FADE_SECONDS);

    return node.hidden ? 0 : reduced() ? 1 : shown;
  }

  function paintLabels(ctx: CanvasRenderingContext2D) {
    for (const [id, node] of nodes) {
      const box = view.box(id);

      if (!box) continue;

      if (node.spec.labelSide === "right") {
        const middle = corners(box, box.z + box.height / 2, view);
        const right = middle.reduce((best, point) => (point.x > best.x ? point : best));

        paintSideLabel(ctx, right, node.label, labelAlpha(node), colors, style);
        continue;
      }

      const base = corners(box, box.z, view);
      const centre = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z);
      const bottom = Math.max(...base.map((point) => point.y));

      paintNodeLabel(ctx, { x: centre.x, y: bottom + LABEL_GAP }, node.label, labelAlpha(node), colors, style);
    }
  }

  function paintMarks(ctx: CanvasRenderingContext2D) {
    for (const [id, node] of nodes) {
      const box = view.box(id);

      if (!box || node.hidden) continue;

      const top = corners(box, box.z + box.height, view);
      const right = top.reduce((best, point) => (point.x > best.x ? point : best));
      const highest = Math.min(...top.map((point) => point.y));
      const centre = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height);

      if (node.status) {
        const pop = reduced() ? 1 : clamp01((clock.now - node.statusAt) / POP_SECONDS);

        paintBadge(ctx, { at: right, status: node.status, pop, time: clock.now, still: reduced(), style }, colors);
      }

      if (node.countdown) {
        const left = Math.max(0, Math.ceil(node.countdown.ends - clock.now - 1e-6));

        paintCountdown(ctx, { x: centre.x, y: highest - COUNTDOWN_GAP }, node.countdown.format(left), colors, style);
      }
    }
  }

  function packetProgress(packet: Packet) {
    const amount = clamp01((clock.now - packet.start) / packet.duration);

    if (reduced()) return packet.turns ? 0 : 1;

    return packet.turns ? outAndBack(amount) : easeInOut(amount);
  }

  function paintTraffic(ctx: CanvasRenderingContext2D) {
    for (const [link, state] of linkStates) paintLinkState(ctx, screenRoute(link.from, link.to), state, colors, style);

    for (const packet of packets) {
      paintPacket(ctx, pointAlong(screenRoute(packet.from, packet.to), packetProgress(packet)), packet.label, packet.color, colors, style);
    }
  }

  function paintOverlay() {
    const ctx = canvas.getContext("2d");

    if (!ctx || destroyed || !mounted) return;

    const ratio = pixelRatio();

    ctx.save();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintTraffic(ctx);
    paintLights(ctx);
    paintHighlighted(ctx);
    paintLabels(ctx);
    paintMarks(ctx);
    ctx.restore();
  }

  const fading = () =>
    (highlighted !== null && clock.now - highlighted.since < FADE_SECONDS) ||
    [...nodes.values()].some(
      (node) => clock.now - node.shownAt < FADE_SECONDS || clock.now - node.statusAt < POP_SECONDS || clock.now - node.litAt < FADE_SECONDS,
    );

  const pulsing = () => !reduced() && [...nodes.values()].some((node) => node.status === "error" && !node.hidden);

  const busy = () => !clock.paused && (clock.waiting || packets.length > 0 || fading() || pulsing());

  const tick = (seconds: number): boolean => {
    if (destroyed || !onScreen) {
      running = false;
      return false;
    }

    clock.advance(seconds);
    view.render();
    running = busy();

    return running;
  };

  function wake() {
    if (destroyed) return;

    view.render();

    if (running || !busy()) return;

    running = true;
    loop.add(tick);
  }

  function travel(from: string, to: string, turns: boolean, sendOptions: SendOptions = {}): Promise<void> {
    linkBetween(from, to);

    const duration = Math.max(0.05, sendOptions.duration ?? SEND_SECONDS);
    const packet: Packet = { from, to, start: clock.now, duration, turns, label: sendOptions.label, color: sendOptions.color ?? colors.packet };
    const arrival = clock.after(duration);

    packets = [...packets, packet];
    wake();

    return arrival.finally(() => {
      packets = packets.filter((candidate) => candidate !== packet);
      view.render();
    });
  }

  function relayout() {
    view.set(LIVE, layout());
    wake();
  }

  function setVisible(id: string, visible: boolean) {
    const node = nodeOf(id);

    if (node.hidden === !visible) return;

    node.hidden = !visible;
    node.shownAt = visible ? clock.now : node.shownAt;
    relayout();
  }

  async function countdown(id: string, seconds: number, countdownOptions: CountdownOptions = {}): Promise<void> {
    const node = nodeOf(id);
    const done = clock.after(seconds);

    node.countdown = { ends: clock.now + seconds, format: countdownOptions.format ?? ((left) => `${left}s`) };
    wake();

    try {
      await done;
    } finally {
      node.countdown = null;
      view.render();
    }
  }

  function reset() {
    clock.cancel();
    packets = [];
    linkStates = new Map();
    highlighted = null;

    for (const [id, node] of nodes) nodes.set(id, freshNode(node.spec));

    relayout();
  }

  const watcher =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry?.isIntersecting ?? true;

          if (onScreen) wake();
        })
      : null;

  watcher?.observe(canvas);
  mounted = true;
  view.render();

  return {
    scene: view,

    get paused() {
      return clock.paused;
    },

    send: (from, to, sendOptions) => travel(from, to, false, sendOptions),

    bounce: (from, to, sendOptions) => travel(from, to, true, sendOptions),

    status(id, status) {
      const node = nodeOf(id);

      node.status = status;
      node.statusAt = clock.now;
      wake();
    },

    link(from, to, state) {
      const { link } = linkBetween(from, to);
      const next = new Map(linkStates);

      if (state) next.set(link, state);
      else next.delete(link);

      linkStates = next;
      wake();
    },

    countdown,

    relabel(id, label) {
      nodeOf(id).label = label;
      view.render();
    },

    show: (id) => setVisible(id, true),

    hide: (id) => setVisible(id, false),

    move(id, at, moveOptions) {
      const node = nodeOf(id);

      node.at = at;
      node.arc = moveOptions?.arc ?? 0;
      relayout();
    },

    lift(id, z) {
      nodeOf(id).z = z;
      relayout();
    },

    light(ids, state) {
      const picked = (typeof ids === "string" ? [ids] : ids).map(nodeOf);

      for (const node of picked) {
        if (node.lit === state) continue;

        node.lit = state;
        node.litAt = clock.now;
      }

      wake();
    },

    highlight(id) {
      if (id !== null) nodeOf(id);

      highlighted = id === null ? null : { id, since: clock.now };
      wake();
    },

    wait(seconds) {
      const done = clock.after(seconds);

      wake();

      return done;
    },

    reset,

    pause() {
      clock.pause();
    },

    resume() {
      clock.resume();
      wake();
    },

    destroy() {
      destroyed = true;
      watcher?.disconnect();
      clock.cancel();
      view.destroy();
    },
  };
}
