/**
 * Filled SVG artwork that reshapes: a landing-page emblem, a chart whose area morphs between
 * ranges with different numbers of points, and soft background blobs. Each is one
 * `<Remold.Icon>` per path; nothing here is keyed or hand-tweened.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented, Switch } from "../ui/controls";

/** A smooth path through `points` (Catmull-Rom, written as cubic curves). Closed joins the ends. */
function smoothPath(points: readonly [number, number][], closed = false): string {
  const n = points.length;
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]!;
  const r = (v: number) => Math.round(v * 10) / 10;
  let d = `M${r(points[0]![0])} ${r(points[0]![1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${r(x1 + (x2 - x0) / 6)} ${r(y1 + (y2 - y0) / 6)} ${r(x2 - (x3 - x1) / 6)} ${r(y2 - (y3 - y1) / 6)} ${r(x2)} ${r(y2)}`;
  }
  return closed ? `${d}Z` : d;
}

/** Repeatable pseudo-random numbers, so every visit draws the same shapes. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The emblem: filled shapes on a 100 × 100 grid. */

const EMBLEMS = {
  Listen: "M28 72a12 10 0 1 0 24 0a12 10 0 1 0 -24 0Z M62 64a12 10 0 1 0 24 0a12 10 0 1 0 -24 0Z M46 72V26L86 16V64H80V30L52 37V72Z",
  Shop: "M22 36H78L72 86H28Z M38 36V30a12 12 0 0 1 24 0v6h-6v-6a6 6 0 0 0-12 0v6Z",
  Measure: "M18 80V56H32V80Z M40 80V40H54V80Z M62 80V24H76V80Z M14 86H86V91H14Z",
  Talk: "M18 22h64a8 8 0 0 1 8 8v32a8 8 0 0 1-8 8H46l-18 15v-15H18a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z",
  Create: "M50 10l10 28h30l-24 18 9 29-25-18-25 18 9-29-24-18h30Z",
} as const;
type Emblem = keyof typeof EMBLEMS;
const EMBLEM_NAMES = Object.keys(EMBLEMS) as Emblem[];

/** Gradients for this file's artwork. Rendered once for the whole site; paths refer to them by id. */
export function SvgGradients() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="rm-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ac8fa" />
          <stop offset="0.5" stopColor="#0071e3" />
          <stop offset="1" stopColor="#bf5af2" />
        </linearGradient>
        <linearGradient id="rm-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0071e3" stopOpacity="0.28" />
          <stop offset="1" stopColor="#0071e3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rm-blob-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#64d2ff" />
          <stop offset="1" stopColor="#0a84ff" />
        </linearGradient>
        <linearGradient id="rm-blob-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bf5af2" />
          <stop offset="1" stopColor="#ff6482" />
        </linearGradient>
        <linearGradient id="rm-blob-c" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#30d158" />
          <stop offset="1" stopColor="#64d2ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function EmblemDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [name, setName] = useState<Emblem>("Listen");
  // On its own page it cycles until you pick a shape.
  const [cycling, setCycling] = useState(true);
  useAutoplay(autoplay || (!preview && cycling), 2400, () =>
    setName((n) => EMBLEM_NAMES[(EMBLEM_NAMES.indexOf(n) + 1) % EMBLEM_NAMES.length]!),
  );

  return (
    <div className="demo-panel">
      <div className="emblem-stage">
        <Remold.Icon
          className="emblem"
          d={EMBLEMS[name]}
          viewBox="0 0 100 100"
          fill="url(#rm-brand)"
          spring={springs.bouncy}
          match={{ padding: "collapse" }}
          loop={loop}
          reducedMotion={reducedMotion}
          role="img"
          aria-label={`${name} emblem`}
        />
      </div>
      {!preview && (
        <Segmented
          label="Emblem"
          options={EMBLEM_NAMES}
          value={name}
          onChange={(n) => {
            setCycling(false);
            setName(n);
          }}
        />
      )}
    </div>
  );
}

export const emblem: Example = {
  id: "emblem",
  category: "SVG",
  title: "Morphing emblem",
  summary: "A filled, gradient mark that reshapes between symbols: note, bag, chart, bubble, star.",
  headline: (
    <>
      One mark,
      <br />
      many meanings.
    </>
  ),
  lead: "A landing-page emblem that becomes whatever the section is about. Each part of the old shape flows into the nearest part of the new one, with a little bounce, instead of fading through nothing.",
  tries: [
    "Watch it cycle, then pick a shape. Every piece flows into the nearest piece of the next shape.",
    "Pick shapes quickly. Each morph starts from the shape on screen, so it never jumps.",
    "Turn on Slow motion to see the outline split and merge.",
  ],
  code: `
<Remold.Icon
  d={emblems[name]}
  viewBox="0 0 100 100"
  fill="url(#brand)"
  spring={springs.bouncy}
  match={{ padding: "collapse" }}
/>
`,
  uses: [{ name: "Remold.Icon", role: "Morphs one filled path into the next; works for icons and illustrations alike." }],
  frame: "panel",
  Demo: EmblemDemo,
};

/* A chart whose line and area morph between ranges. */

const CHART = { width: 600, height: 220 };
const RANGES = {
  Week: { points: 7, seed: 3, total: "$48.2K", change: "+12.4% on last week" },
  Month: { points: 30, seed: 11, total: "$203.9K", change: "+8.1% on last month" },
  Year: { points: 12, seed: 29, total: "$2.41M", change: "+31.6% on last year" },
} as const;
type Range = keyof typeof RANGES;

function series(range: Range): [number, number][] {
  const { points, seed } = RANGES[range];
  const next = random(seed);
  let level = 0.45;
  return Array.from({ length: points }, (_, i) => {
    level = Math.max(0.12, Math.min(0.9, level + (next() - 0.4) * 0.3));
    return [(i / (points - 1)) * CHART.width, CHART.height - level * CHART.height] as [number, number];
  });
}

const CHART_PATHS = Object.fromEntries(
  (Object.keys(RANGES) as Range[]).map((range) => {
    const line = smoothPath(series(range));
    return [range, { line, area: `${line}L${CHART.width} ${CHART.height}L0 ${CHART.height}Z` }];
  }),
) as Record<Range, { line: string; area: string }>;

function ChartDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [range, setRange] = useState<Range>("Week");
  useAutoplay(autoplay, 2200, () => setRange((r) => (r === "Week" ? "Month" : r === "Month" ? "Year" : "Week")));
  const paths = CHART_PATHS[range];
  const shared = {
    viewBox: `0 0 ${CHART.width} ${CHART.height}`,
    preserveAspectRatio: "none",
    spring: springs.smooth,
    loop,
    reducedMotion,
  };

  return (
    <div className="demo-panel">
      <div className="surface chart-card">
        <div className="chart-head">
          <div>
            <p className="chart-label">Revenue</p>
            <Remold.Text className="chart-total" loop={loop} reducedMotion={reducedMotion}>
              {RANGES[range].total}
            </Remold.Text>
            <Remold.Text className="chart-change" loop={loop} reducedMotion={reducedMotion}>
              {RANGES[range].change}
            </Remold.Text>
          </div>
          <Segmented label="Range" options={["Week", "Month", "Year"] as const} value={range} onChange={setRange} />
        </div>
        <div className="chart-plot" role="img" aria-label={`Revenue over the last ${range.toLowerCase()}: ${RANGES[range].total}`}>
          <Remold.Icon {...shared} d={paths.area} fill="url(#rm-area)" />
          <Remold.Icon
            {...shared}
            d={paths.line}
            fill="none"
            stroke="#0071e3"
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </div>
      </div>
    </div>
  );
}

export const chart: Example = {
  id: "chart",
  category: "SVG",
  title: "Morphing chart",
  summary: "A line and its shaded area reshape between a week, a month and a year, even with different point counts.",
  headline: (
    <>
      Charts that move
      <br />
      between ranges.
    </>
  ),
  lead: "Week has seven points, month thirty and year twelve. The line doesn't care: each version is a path, and Remold reshapes one into the next so the trend you were looking at bends into the new one.",
  tries: [
    "Switch Week, Month and Year. The line and its shaded area reshape together.",
    "Switch quickly. A new range starts from the shape on screen.",
    "Turn on Reduce motion: the chart cross-fades between ranges instead.",
  ],
  code: `
<Remold.Icon viewBox="0 0 600 220" d={areaPath(data)} fill="url(#fade)" />
<Remold.Icon viewBox="0 0 600 220" d={linePath(data)} stroke="#0071e3" fill="none" />
`,
  uses: [
    { name: "Remold.Icon", role: "The line and the shaded area: any path, at any size, not only icons." },
    { name: "Remold.Text", role: "The total and the change underneath it." },
  ],
  frame: "panel",
  Demo: ChartDemo,
};

/* Soft background blobs that slowly reshape. */

const BLOB_FILLS = ["url(#rm-blob-a)", "url(#rm-blob-b)", "url(#rm-blob-c)"];
const BLOB_CENTRES: [number, number][] = [
  [92, 96],
  [130, 84],
  [110, 124],
];

function blob(seed: number, layer: number): string {
  const next = random(seed * 7 + layer);
  const [cx, cy] = BLOB_CENTRES[layer]!;
  const count = 6 + Math.floor(next() * 3);
  return smoothPath(
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 46 + next() * 26;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as [number, number];
    }),
    true,
  );
}

const BLOB_SPRING = { duration: 1.6, bounce: 0.1 };

function BlobsDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [seed, setSeed] = useState(1);
  const [drifting, setDrifting] = useState(true);
  useAutoplay(autoplay || (!preview && drifting), 2000, () => setSeed((s) => s + 1));

  return (
    <div className="demo-panel">
      <div className="blobs">
        {BLOB_FILLS.map((fill, layer) => (
          <Remold.Icon
            key={fill}
            className="blob"
            viewBox="0 0 220 210"
            d={blob(seed, layer)}
            fill={fill}
            spring={BLOB_SPRING}
            loop={loop}
            reducedMotion={reducedMotion}
            aria-hidden="true"
          />
        ))}
      </div>
      {!preview && (
        <div className="blob-controls">
          <button type="button" className="pill-button" onClick={() => setSeed((s) => s + 1)}>
            Reshape
          </button>
          <Switch checked={drifting} onChange={setDrifting}>
            Keep drifting
          </Switch>
        </div>
      )}
    </div>
  );
}

export const blobs: Example = {
  id: "blobs",
  category: "SVG",
  title: "Ambient blobs",
  summary: "Layered gradient shapes that drift from one form to the next, for a calm hero background.",
  headline: (
    <>
      Backgrounds
      <br />
      that breathe.
    </>
  ),
  lead: "Three soft shapes, each a smooth path with six to eight points, generated from a seed. Every couple of seconds they get new shapes, often with a different number of points, and spring slowly into them.",
  tries: [
    "Press Reshape. Each blob springs into its new outline, even when the point count changes.",
    "Press Reshape several times quickly: the blobs carry their speed into each new shape.",
    "Turn Keep drifting off and on.",
  ],
  code: `
<Remold.Icon
  d={blobPath(seed)}
  viewBox="0 0 220 210"
  fill="url(#blue)"
  spring={{ duration: 1.6, bounce: 0.1 }}
/>
`,
  uses: [{ name: "Remold.Icon", role: "Each blob, morphing to a newly generated outline with a slow spring." }],
  frame: "panel",
  Demo: BlobsDemo,
};

/** An arc of a circle centred on (cx, cy), from `from` to `to` turns (0 is twelve o'clock, clockwise). */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const point = (t: number) => {
    const a = t * Math.PI * 2 - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  // A whole circle is two half arcs: one arc can't start and end at the same point.
  if (to - from >= 0.999) return `M${point(0)}A${r} ${r} 0 1 1 ${point(0.5)}A${r} ${r} 0 1 1 ${point(0)}`;
  return `M${point(from)}A${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${point(to)}`;
}

/* A donut chart whose segments reshape between periods. */

const SOURCES = [
  { name: "Search", colour: "#0071e3" },
  { name: "Direct", colour: "#5ac8fa" },
  { name: "Social", colour: "#bf5af2" },
  { name: "Email", colour: "#34c759" },
];
const PERIODS = { Week: [42, 28, 18, 12], Month: [35, 30, 25, 10], Year: [52, 20, 13, 15] } as const;
type Period = keyof typeof PERIODS;

function DonutDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [period, setPeriod] = useState<Period>("Week");
  useAutoplay(autoplay, 2000, () => setPeriod((p) => (p === "Week" ? "Month" : p === "Month" ? "Year" : "Week")));
  const shares = PERIODS[period];
  let start = 0;
  const segments = shares.map((share, i) => {
    const from = start;
    start += share / 100;
    return { ...SOURCES[i]!, share, d: arc(100, 100, 72, from + 0.004, start - 0.004) };
  });

  return (
    <div className="demo-panel">
      <div className="surface donut-card">
        <div className="chart-head">
          <p className="chart-label">Where visitors came from</p>
          <Segmented label="Period" options={["Week", "Month", "Year"] as const} value={period} onChange={setPeriod} />
        </div>
        <div className="donut-body">
          <div className="donut" role="img" aria-label={segments.map((s) => `${s.name} ${s.share}%`).join(", ")}>
            {segments.map((s) => (
              <Remold.Icon
                key={s.name}
                viewBox="0 0 200 200"
                d={s.d}
                fill="none"
                stroke={s.colour}
                strokeWidth={26}
                spring={springs.smooth}
                loop={loop}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
          <ul className="donut-legend">
            {segments.map((s) => (
              <li key={s.name}>
                <i style={{ background: s.colour }} />
                {s.name}
                <Remold.Text loop={loop} reducedMotion={reducedMotion}>
                  {`${s.share}%`}
                </Remold.Text>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export const donut: Example = {
  id: "donut",
  category: "SVG",
  title: "Donut chart",
  summary: "Each segment's arc grows and shrinks to its new share while the legend's figures change in place.",
  headline: (
    <>
      Shares that slide
      <br />
      into place.
    </>
  ),
  lead: "Each segment is one arc path. When the period changes, every arc reshapes to its new start and end, so you can see which source grew at whose expense. The percentages in the legend change digit by digit alongside.",
  tries: [
    "Switch Week to Month: Social grows and Search gives way.",
    "Switch to Year: Search takes over half the ring.",
    "Switch quickly: each arc carries on from where it is.",
  ],
  code: `
{segments.map((s) => (
  <Remold.Icon key={s.name} viewBox="0 0 200 200"
    d={arc(s.from, s.to)} stroke={s.colour} strokeWidth={26} fill="none" />
))}
`,
  uses: [
    { name: "Remold.Icon", role: "Each segment's arc, reshaping to its new share." },
    { name: "Remold.Text", role: "The percentages in the legend." },
  ],
  frame: "panel",
  Demo: DonutDemo,
};

/* A progress ring that turns into a tick, or a cross. */

const GLYPHS = {
  upload: "M24 31V17M18.5 22.5L24 17l5.5 5.5",
  done: "M16.5 24.5l5 5 10-11",
  failed: "M18.5 18.5l11 11M29.5 18.5l-11 11",
};
const STEPS_RING: { progress: number; glyph: keyof typeof GLYPHS; label: string; tone?: string }[] = [
  { progress: 1, glyph: "upload", label: "Upload report.pdf" },
  { progress: 0.18, glyph: "upload", label: "Uploading · 18%", tone: "busy" },
  { progress: 0.52, glyph: "upload", label: "Uploading · 52%", tone: "busy" },
  { progress: 0.86, glyph: "upload", label: "Uploading · 86%", tone: "busy" },
  { progress: 1, glyph: "done", label: "Uploaded", tone: "done" },
  { progress: 1, glyph: "failed", label: "Upload failed", tone: "error" },
];

function ProgressDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [step, setStep] = useState(0);
  useAutoplay(autoplay, 1100, () => setStep((s) => (s + 1) % STEPS_RING.length));
  const now = STEPS_RING[step]!;
  return (
    <div className="demo-panel">
      <button type="button" className="progress" data-tone={now.tone} onClick={() => setStep((s) => (s + 1) % STEPS_RING.length)}>
        <Remold.Icon
          className="progress-ring"
          viewBox="0 0 48 48"
          d={`${arc(24, 24, 19, 0, now.progress)}${GLYPHS[now.glyph]}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          spring={springs.snappy}
          loop={loop}
          reducedMotion={reducedMotion}
          aria-hidden="true"
        />
        <Remold.Text className="progress-label" aria-live="polite" loop={loop} reducedMotion={reducedMotion}>
          {now.label}
        </Remold.Text>
      </button>
    </div>
  );
}

export const progress: Example = {
  id: "progress",
  category: "SVG",
  title: "Progress ring",
  summary: "A ring that fills as a file uploads, then closes into a tick, or crosses out if it failed.",
  headline: (
    <>
      From waiting
      <br />
      to done, in one shape.
    </>
  ),
  lead: "The ring and the glyph inside it are one path. While the upload runs, the ring's arc grows; when it finishes, the arrow folds into a tick, or into a cross if it failed. Nothing is swapped, so there's never a blank frame between states.",
  tries: [
    "Press the ring to step through the upload. The arc grows from 18% to 86%.",
    "Step on to Uploaded: the arrow folds into a tick as the ring closes.",
    "Step on to Upload failed: the tick becomes a cross.",
  ],
  code: `
<Remold.Icon
  viewBox="0 0 48 48"
  d={ringArc(progress) + glyphs[state]}
  stroke="currentColor"
  fill="none"
/>
`,
  uses: [
    { name: "Remold.Icon", role: "The ring and its glyph as one path: arc, arrow, tick, cross." },
    { name: "Remold.Text", role: "The label and percentage." },
  ],
  frame: "panel",
  Demo: ProgressDemo,
};

/* A mark made of stable, independently morphing pieces. */
const SIGNALS = {
  Listen: ["M22 65a28 28 0 1 1 56 0", "M35 65a15 15 0 1 1 30 0", "M48 76h4"],
  Send: ["M18 48L82 20 62 80 48 58Z", "M48 58L82 20", "M18 48l30 10"],
  Done: ["M18 52l20 20 44-46", "M18 52l20 20", "M38 72l44-46"],
} as const;
type Signal = keyof typeof SIGNALS;

function PathGroupDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [signal, setSignal] = useState<Signal>("Listen");
  useAutoplay(autoplay, 2200, () => setSignal((s) => (s === "Listen" ? "Send" : s === "Send" ? "Done" : "Listen")));
  return (
    <div className="demo-panel">
      <div className="emblem-stage">
        <Remold.PathGroup
          className="path-group"
          viewBox="0 0 100 100"
          loop={loop}
          reducedMotion={reducedMotion}
          fill="none"
          stroke="url(#rm-brand)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label={`${signal} signal`}
          role="img"
          paths={SIGNALS[signal].map((d, i) => ({ id: `part-${i}`, d }))}
        />
      </div>
      <Segmented label="Signal" options={["Listen", "Send", "Done"] as const} value={signal} onChange={setSignal} />
    </div>
  );
}

export const pathGroup: Example = {
  id: "path-group",
  category: "SVG",
  title: "Multi-part signal",
  summary: "Three independent strokes hold their identity while a signal becomes a paper plane, then a tick.",
  headline: (
    <>
      Several paths,
      <br />
      one idea.
    </>
  ),
  lead: "A mark can be more than one path. Give each part a stable id and PathGroup lets every stroke carry its own motion into the next state.",
  tries: [
    "Switch states quickly: each stroke continues from its visible position.",
    "Watch the three parts retain their identity instead of being replaced as one picture.",
  ],
  code: `<Remold.PathGroup viewBox="0 0 100 100" paths={parts.map((d, i) => ({ id: \`part-\${i}\`, d }))} />`,
  uses: [{ name: "Remold.PathGroup", role: "Keeps several stable SVG parts together while each path morphs." }],
  frame: "panel",
  Demo: PathGroupDemo,
};
