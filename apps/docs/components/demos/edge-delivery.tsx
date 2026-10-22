"use client";
/**
 * How a file gets from your app to people around the world, as one line-art scene in five
 * steps: it's uploaded to storage, turned into smaller sizes, copied out to edge servers, and
 * served to people from the one nearest them. Every step is a scene layout, so the picture
 * springs from one to the next: the file arcs into the storage tray, its three sizes split off
 * it through the optimiser, copies fly out to each edge, and requests flow to phones nearby.
 *
 * HTML labels sit over the scene and follow it every frame, the numbers along the top change in
 * place with `Remold.Text`, and the steps along the bottom are real buttons. The region,
 * the cities and the numbers are made up.
 */
import { extrude, type LayoutBox, type SceneLink } from "@remold-ui/canvas";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/** What each part is called. Text only: the scene draws no provider's logos or artwork. */
export interface Names {
  /** Where the file is stored, such as "S3 bucket". */
  bucket: string;
  /** The region it's stored in, such as "eu-west-1". */
  region: string;
  /** What makes the smaller sizes, such as "Lambda · resize". */
  optimiser: string;
  /** The servers near people, such as "CloudFront edges". */
  edges: string;
}

/** Ready-made names for common providers. */
export const PROVIDERS = {
  aws: { bucket: "S3 bucket", region: "eu-west-1", optimiser: "Lambda · resize", edges: "CloudFront edges" },
  gcp: { bucket: "Cloud Storage", region: "europe-west2", optimiser: "Cloud Run · resize", edges: "Cloud CDN" },
  cloudflare: { bucket: "R2 bucket", region: "Western Europe", optimiser: "Worker · resize", edges: "Cloudflare edge" },
  generic: { bucket: "Storage", region: "eu-west", optimiser: "Optimiser", edges: "Edge servers" },
} satisfies Record<string, Names>;

interface Stage {
  id: string;
  name: string;
  /** One sentence, read out and shown under the scene. */
  caption: (names: Names) => string;
  stats: [string, string][];
}

const STAGES: Stage[] = [
  {
    id: "upload",
    name: "Upload",
    caption: (n) => `hero.jpg goes straight from the browser to the ${n.bucket} in ${n.region}, with a signed upload link.`,
    stats: [
      ["Stored", "1 file"],
      ["Size", "4.2 MB"],
      ["Served from", "—"],
    ],
  },
  {
    id: "optimise",
    name: "Optimise",
    caption: (n) =>
      `${n.optimiser.split(" · ")[0]} turns the original into three sizes in AVIF, and the ${n.bucket} keeps the original too.`,
    stats: [
      ["Stored", "4 files"],
      ["Size", "4.2 MB → 180 KB"],
      ["Served from", "—"],
    ],
  },
  {
    id: "distribute",
    name: "Distribute",
    caption: (n) => `The first request in each city copies the right size from the ${n.bucket} to the edge server there.`,
    stats: [
      ["Stored", "4 files"],
      ["Cached at", "4 edges"],
      ["Served from", "Origin"],
    ],
  },
  {
    id: "serve",
    name: "Serve",
    caption: () => "Everyone after that gets the file from the server nearest them, in a few milliseconds.",
    stats: [
      ["Cache hit rate", "98.6%"],
      ["Median time", "14 ms"],
      ["Served from", "Edge"],
    ],
  },
  {
    id: "update",
    name: "Update",
    caption: () => "A new version is ready to go up. Every edge drops its old copy first, so nobody gets a stale file.",
    stats: [
      ["Stored", "v1 → v2"],
      ["Cached at", "0 edges"],
      ["Served from", "Origin"],
    ],
  },
];

const EDGES = [
  { id: "lhr", code: "LHR" },
  { id: "iad", code: "IAD" },
  { id: "sin", code: "SIN" },
  { id: "syd", code: "SYD" },
];
const SIZES = ["sm", "md", "lg"] as const;

/* Positions on the floor: `h` runs left to right on screen, `v` from back to front. */
const P = (h: number, v: number) => ({ x: (h + 120 + v) * 0.72, y: (-(h + 120) + v) * 0.72 });
const box = (h: number, v: number, width: number, depth: number, extra: Partial<LayoutBox> = {}): LayoutBox => {
  const c = P(h, v);
  return { x: c.x - width / 2, y: c.y - depth / 2, width, depth, ...extra };
};

/**
 * Turns an outline drawn the usual way up (x right, y down) so it faces the viewer in the scene,
 * whose floor runs diagonally across the screen. Takes absolute M, L and C commands only.
 */
function faceViewer(d: string) {
  const points: [number, number][] = [];
  d.replace(/(-?[\d.]+)[ ,](-?[\d.]+)/g, (_, u: string, w: string) => (points.push([(+u + +w) / Math.SQRT2, (-+u + +w) / Math.SQRT2]), ""));
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const [sx, sy] = [100 / (Math.max(...xs) - x0), 100 / (Math.max(...ys) - y0)];
  let i = 0;
  const path = d.replace(/(-?[\d.]+)[ ,](-?[\d.]+)/g, () => {
    const [x, y] = points[i++]!;
    return `${((x - x0) * sx).toFixed(2)} ${((y - y0) * sy).toFixed(2)}`;
  });
  return { path, aspect: sy / sx };
}

const APP = { h: -520, v: 10 };
const CLOUD = { h: -150, v: 5 };
const STORE = { h: -215, v: 30 };
const OPT = { h: -70, v: -20 };
const EDGE_H = 175;
const USER_H = 320;
const edgeV = (i: number) => -210 + i * 140;

const CLOUD_HEIGHT = 5;
const BUCKET = { width: 132, depth: 132, height: 50 };
/** The bucket's floor, inside its well. */
const BUCKET_FLOOR = CLOUD_HEIGHT + BUCKET.height * 0.28;
const FILE = { width: 44, depth: 54, height: 5 };
const CHIP = { width: 26, depth: 32, height: 4 };

// A laptop: a base, and a screen standing at its back edge whose face fills up as it uploads.
const laptop = extrude({ ink: true, radius: 0.1, decal: { icon: "M4 6h16v9H4ZM9 18h6", size: 44, weight: 1.4, at: [0, 0.1], text: "" } });
const screen = extrude({ ink: true, radius: 0.04 });
// The region: a cloud-shaped platform the storage and the optimiser stand on.
const cloudShape = faceViewer(
  "M22 92C9 92 2 82 2 71C2 60 10 51 21 50C22 32 36 19 54 19C70 19 82 30 86 44C95 46 100 55 100 67C100 81 90 92 76 92Z",
);
const cloud = extrude({ ink: "#d4d4d8", shape: { path: cloudShape.path }, sides: "flat", top: "#fafafa", shadow: false });
// The bucket: a round tub with a deep well, whose band rises as it fills.
const bucket = extrude({ ink: true, shape: "ellipse", sides: "flat", well: { inset: 0.09, depth: 0.72 } });
// The optimiser: a chip with its pins.
const optimiser = extrude({
  ink: true,
  radius: 0.16,
  sides: "flat",
  decal: {
    icon: "M7 7h10v10H7ZM10 10h4v4h-4ZM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4",
    size: 40,
    weight: 1.4,
    text: "",
  },
});
// An edge server: a round puck with its city's code.
const edge = (code: string) => extrude({ ink: true, shape: "ellipse", sides: "flat", decal: { text: code, size: 13, color: "#71717a" } });
// A page with its corner folded over and lines of text.
const page = extrude({
  ink: true,
  radius: 0,
  shape: { path: "M0 0H70L100 30V100H0Z" },
  decal: { icon: "M16.8 0V7.2H24M4 11H14M4 14.5H20M4 18H20M4 21.5H15", fit: "stretch", weight: 1.3, text: "" },
});
const chip = page;
// A phone lying flat: rounded body, a notch line at the top.
const phone = extrude({ ink: true, radius: 0.35, shadow: false, decal: { icon: "M9 3h6", size: 26, at: [0, -0.38], weight: 2, text: "" } });

export interface EdgeDeliveryProps {
  /** The colour of the file, its copies and the light along the routes. */
  accent?: string;
  /** Step through the story while on screen, until someone takes over. */
  autoplay?: boolean;
  /** Milliseconds per step while playing. */
  every?: number;
  /** Show the numbers along the top. */
  showStats?: boolean;
  /** The height of the scene in pixels. */
  height?: number;
  /** Whose names to use for the parts. Text only, no logos. */
  provider?: keyof typeof PROVIDERS;
  /** Your own names for any of the parts; they win over `provider`. */
  names?: Partial<Names>;
}

export function EdgeDelivery({
  accent = "#2563eb",
  autoplay: play = true,
  every = 3200,
  showStats = true,
  height = 440,
  provider = "aws",
  names: own,
}: EdgeDeliveryProps) {
  const names: Names = { ...PROVIDERS[provider], ...own };
  const autoplay = useAutoplay(STAGES.length, { every, autoStart: play });
  const { setPlaying, setStep } = autoplay;
  useEffect(() => setPlaying(play), [play, setPlaying]);
  const stage = STAGES[autoplay.step]!;

  // Smaller below 600 px wide, so the whole trip stays in view. Scenes read their layouts once,
  // so a new scale remounts the scene (the `key` below).
  const [fit, scale] = useFit(600);
  const scene = useMemo(() => buildScene(accent, 1.2 * scale, names), [accent, scale, names.bucket, names.region]);

  // HTML labels that sit over their objects and follow them every frame.
  const actions = useRef<Remold.Scene.Actions | null>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const [ready, setReady] = useState(false);
  const follow = useCallback(() => {
    const a = actions.current;
    if (!a) return;
    for (const [id, el] of labels.current) {
      const below = el.dataset.below === "";
      const point = a.anchor(id, below ? "front" : "back");
      if (point)
        el.style.transform = below
          ? `translate(${point.x}px, ${point.y + 14}px) translate(-50%, 0)`
          : `translate(${point.x}px, ${point.y - 18}px) translate(-50%, -100%)`;
    }
    setReady(true);
  }, []);
  const label = (id: string) => (el: HTMLElement | null) => {
    if (el) labels.current.set(id, el);
    else labels.current.delete(id);
  };

  // [object, text, highlighted, below the object]
  // One accent pill for what's happening now; the rest are quiet names under things.
  const now: Record<string, [string, string]> = {
    upload: ["orig", "hero.jpg · 4.2 MB"],
    optimise: ["opt", `${names.optimiser} · 3 sizes`],
    distribute: ["lhr", "Copied to 4 edges"],
    serve: ["user0", "14 ms"],
    update: ["orig", "hero.jpg · v2"],
  };
  const [nowOn, nowText] = now[stage.id]!;
  const pills: [string, string, boolean, boolean][] = [
    ["app", "Your app", false, true],
    ["store", `${names.bucket} · ${names.region}`, false, true],
    ["syd", names.edges, false, true],
    [nowOn, nowText, true, false],
  ];

  return (
    <div
      ref={autoplay.ref}
      style={{ "--ed-accent": accent } as CSSProperties}
      className="not-prose my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white font-sans text-zinc-900"
    >
      {showStats && (
        <dl className="m-0 grid grid-cols-3 border-b border-zinc-100">
          {stage.stats.map(([name, value], i) => (
            <div key={i} className="grid gap-0.5 border-r border-zinc-100 px-4 py-3 last:border-r-0">
              <Remold.Text render={<dt />} className="text-[11.5px] text-zinc-500">
                {name}
              </Remold.Text>
              <Remold.Text render={<dd />} className="m-0 text-[15px] font-semibold tracking-[-0.01em] tabular-nums">
                {value}
              </Remold.Text>
            </div>
          ))}
        </dl>
      )}

      <div ref={fit} className="relative" style={{ height: Math.round(height * Math.max(0.62, scale)) }}>
        <Remold.Scene
          key={scale}
          className="absolute inset-0 h-full w-full"
          label="A file's trip from your app to storage, through the optimiser, out to edge servers and on to people's phones."
          objects={scene.objects}
          layouts={scene.layouts}
          links={scene.links}
          layout={stage.id}
          palette="sketch"
          interact={{ tap: false, hover: false, keyboard: false }}
          actionsRef={actions}
          onDraw={follow}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
        >
          {pills
            .filter(([, , solid]) => solid || scale > 0.8)
            .map(([id, text, solid, below]) => (
              <div key={solid ? "now" : id} ref={label(id)} data-below={below ? "" : undefined} className="absolute top-0 left-0">
                <Remold.Text
                  className={
                    solid
                      ? "inline-block rounded-full bg-[var(--ed-accent)] px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-white shadow-sm"
                      : "inline-block font-mono text-[10.5px] tracking-[0.06em] whitespace-nowrap text-zinc-500 uppercase"
                  }
                >
                  {text}
                </Remold.Text>
              </div>
            ))}
        </div>
      </div>

      <div className="grid gap-3 border-t border-zinc-100 px-4 py-3.5">
        <p
          key={stage.id}
          className="m-0 min-h-[2.6em] animate-[ed-in_.4s_ease-out] text-[13.5px] leading-relaxed text-zinc-600 motion-reduce:animate-none"
          aria-live="polite"
        >
          {stage.caption(names)}
        </p>
        <style>{"@keyframes ed-in{from{opacity:0;transform:translateY(3px)}}"}</style>
        <div className="flex flex-wrap items-center gap-1.5">
          <div role="tablist" aria-label="Step" className="flex flex-wrap gap-1">
            {STAGES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === autoplay.step}
                onClick={() => setStep(i)}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-[12.5px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ed-accent)] aria-selected:border-transparent aria-selected:bg-[var(--ed-accent)] aria-selected:text-white"
              >
                <span className="tabular-nums opacity-60">{i + 1}</span>
                {s.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            {...autoplay.toggleProps}
            className="ml-auto rounded-full px-3 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-[var(--ed-accent)]"
          >
            {autoplay.playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** How much to shrink the scene so it fits: 1 at `design` pixels wide or more, in steps of 0.05. */
function useFit(design: number) {
  const [scale, setScale] = useState(1);
  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const measure = () => setScale(Math.min(1, Math.round((el.clientWidth / design) * 20) / 20) || 1);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    },
    [design],
  );
  return [ref, scale] as const;
}

/** Every object, and one layout per step. Built once per accent colour and size. */
function buildScene(accent: string, zoom: number, names: Names) {
  const objects = {
    cloud: { look: cloud, label: "", description: `The cloud region, ${names.region}`, interactive: false },
    app: { look: laptop, label: "", description: "Your app" },
    screen: { look: screen, label: "", interactive: false },
    store: { look: bucket, label: "", description: names.bucket },
    opt: { look: optimiser, label: "", description: "The optimiser" },
    ...Object.fromEntries(EDGES.map((e) => [e.id, { look: edge(e.code), label: "", description: `${e.code} edge server` }])),
    ...Object.fromEntries(EDGES.map((_, i) => [`user${i}`, { look: phone, label: "", interactive: false }])),
    orig: { look: page, label: "", interactive: false },
    ...Object.fromEntries(SIZES.map((s) => [s, { look: page, label: "", interactive: false }])),
    ...Object.fromEntries(EDGES.map((e) => [`copy-${e.id}`, { look: chip, label: "", interactive: false }])),
  };

  // Where things rest.
  const APP_BASE = { width: 150, depth: 104, height: 8 };
  const onApp = (extra: Partial<LayoutBox> = {}) =>
    box(APP.h + 4, APP.v + 14, FILE.width, FILE.depth, { z: APP_BASE.height, height: FILE.height, ...extra });
  const inStore = (dh: number, dv: number, z: number, size = FILE, extra: Partial<LayoutBox> = {}) =>
    box(STORE.h + dh, STORE.v + dv, size.width, size.depth, { z: BUCKET_FLOOR + z, height: size.height, ...extra });
  const small = (k: number) => ({ width: FILE.width * (0.7 - k * 0.12), depth: FILE.depth * (0.7 - k * 0.12), height: 4 });
  const sizeIn = (k: number, extra: Partial<LayoutBox> = {}) => inStore(18 - k * 4, -16 + k * 16, 7 + k * 6, small(k), extra);
  const sizeOnOpt = (k: number, extra: Partial<LayoutBox> = {}) => {
    const sz = small(k);
    return box(OPT.h - 26 + k * 26, OPT.v + 4, sz.width, sz.depth, { z: CLOUD_HEIGHT + 30, height: sz.height, ...extra });
  };
  const copyAt = (i: number, extra: Partial<LayoutBox> = {}) =>
    box(EDGE_H, edgeV(i), CHIP.width, CHIP.depth, { z: 16, height: CHIP.height, ...extra });
  const ORIG = () => inStore(-8, 4, 0);

  const base = (): Record<string, LayoutBox> => {
    const app = box(APP.h, APP.v, APP_BASE.width, APP_BASE.depth, { height: APP_BASE.height });
    return {
      cloud: box(CLOUD.h, CLOUD.v, 470, 470 / cloudShape.aspect, { height: CLOUD_HEIGHT }),
      app,
      // The screen stands along the base's back edge.
      screen: { x: app.x, y: app.y, z: APP_BASE.height, width: APP_BASE.width, depth: 5, height: 92, color: accent, fill: 0 },
      store: box(STORE.h, STORE.v, BUCKET.width, BUCKET.depth, { z: CLOUD_HEIGHT, height: BUCKET.height, color: accent, fill: 0.3 }),
      opt: box(OPT.h, OPT.v, 96, 96, { z: CLOUD_HEIGHT, height: 24, color: accent, fill: 0 }),
      ...Object.fromEntries(EDGES.map((e, i) => [e.id, box(EDGE_H, edgeV(i), 70, 70, { height: 16, color: accent, fill: 0 })])),
      ...Object.fromEntries(EDGES.map((_, i) => [`user${i}`, box(USER_H, edgeV(i) + 4, 32, 54, { height: 5, color: accent, fill: 0 })])),
    };
  };

  const layouts: Record<string, { camera: { zoom: number }; objects: Record<string, LayoutBox>; caption: string }> = {};
  const add = (id: string, objects: Record<string, LayoutBox>) => {
    layouts[id] = { camera: { zoom }, caption: STAGES.find((s) => s.id === id)!.caption(names), objects };
  };

  // 1. Upload: the screen fills as the file arcs from the laptop into the bucket. Its sizes and copies wait, hidden, inside it.
  {
    const o = base();
    o.screen = { ...o.screen!, fill: 1 };
    o.orig = { ...ORIG(), color: accent, fill: 1, arc: 150 };
    o.store = { ...o.store!, fill: 0.45, delay: 0.35 };
    SIZES.forEach((s) => (o[s] = { ...ORIG(), opacity: 0, color: accent, fill: 1 }));
    EDGES.forEach((e) => (o[`copy-${e.id}`] = inStore(-8, 4, 0, CHIP, { opacity: 0, color: accent, fill: 1 })));
    add("upload", o);
  }
  // 2. Optimise: three sizes split off the original and stand on the optimiser, which lights up.
  {
    const o = base();
    o.store = { ...o.store!, fill: 0.45 };
    o.opt = { ...o.opt!, fill: 1 };
    o.orig = { ...ORIG(), color: accent, fill: 1 };
    SIZES.forEach((s, k) => (o[s] = sizeOnOpt(k, { color: accent, fill: 1, arc: 90, delay: k * 0.12 })));
    EDGES.forEach((e) => (o[`copy-${e.id}`] = inStore(-8, 4, 0, CHIP, { opacity: 0, color: accent, fill: 1 })));
    add("optimise", o);
  }
  // 3. Distribute: the sizes go back into the bucket, which fills higher, and a copy flies out to every edge.
  {
    const o = base();
    o.store = { ...o.store!, fill: 0.7 };
    o.orig = { ...ORIG(), color: accent, fill: 1 };
    SIZES.forEach((s, k) => (o[s] = sizeIn(k, { color: accent, fill: 1, arc: 70 })));
    EDGES.forEach((e, i) => {
      o[e.id] = { ...o[e.id]!, fill: 0.5, delay: 0.25 + i * 0.12 };
      o[`copy-${e.id}`] = copyAt(i, { color: accent, fill: 1, arc: 160, delay: i * 0.12 });
    });
    add("distribute", o);
  }
  // 4. Serve: every edge is lit and sends the file on to the phones beside it.
  {
    const o = base();
    o.store = { ...o.store!, fill: 0.7 };
    o.orig = { ...ORIG(), color: accent, fill: 1 };
    SIZES.forEach((s, k) => (o[s] = sizeIn(k, { color: accent, fill: 1 })));
    EDGES.forEach((e, i) => {
      o[e.id] = { ...o[e.id]!, fill: 1 };
      o[`copy-${e.id}`] = copyAt(i, { z: 22, color: accent, fill: 1 });
      o[`user${i}`] = { ...o[`user${i}`]!, fill: 1, delay: 0.2 + i * 0.1 };
    });
    add("serve", o);
  }
  // 5. Update: the new version waits on the laptop, the old sizes fade to outlines, and every edge's copy is cleared.
  {
    const o = base();
    o.store = { ...o.store!, fill: 0.3 };
    o.orig = onApp({ color: accent, fill: 1, arc: 110 });
    SIZES.forEach((s, k) => (o[s] = sizeIn(k, { ghost: 1, fill: 0 })));
    EDGES.forEach((e, i) => {
      o[`copy-${e.id}`] = copyAt(i, { z: 70, opacity: 0, delay: i * 0.08 });
    });
    add("update", o);
  }

  const links: SceneLink[] = [
    { from: "app", to: "store", flow: true, layouts: ["upload", "update"] },
    { from: "store", to: "opt", flow: true, layouts: ["optimise"] },
    ...EDGES.map((e) => ({ from: "store", to: e.id, flow: true, layouts: ["distribute"] })),
    ...EDGES.map((e, i) => ({ from: e.id, to: `user${i}`, flow: true, layouts: ["serve"] })),
  ];

  return { objects, layouts, links };
}

/** The name the docs pages use. */
export const EdgeDeliveryDemo = EdgeDelivery;
