"use client";
/**
 * The revenue card at the top of every SaaS dashboard. Switch between 7, 30 and 90 days and the
 * chart line doesn't redraw: it reshapes into the new range. The MRR rolls like a counter, and the
 * change badge rolls too, its arrow turning between up and down. Scrub along the chart and a dot
 * rides the line while the headline shows that day.
 *
 * Built with Base UI (toggle group) and Motion; the chart line and the badge arrow reshape with
 * Remold's `createMorph`. It plays a short scene while it's on screen. Touch it and it's yours.
 * The numbers are made up.
 */
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { MorphIcon, useMorphPath } from "./morph-icon";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./revenue-card.css";

type Range = "7d" | "30d" | "90d";

interface Series {
  label: string;
  /** Days between points. */
  step: number;
  values: number[];
  signups: number[];
  stats: { added: number; churned: number; customers: number };
}

/** A believable curve from one value to another: a trend, some weekly wobble, and an optional dip. */
function curve(n: number, from: number, to: number, wobble: number, dip = 0) {
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return from;
    if (i === n - 1) return to;
    const t = i / (n - 1);
    const noise = Math.sin(i * 1.7) * wobble + Math.sin(i * 0.43) * wobble * 1.6;
    return Math.round(from + (to - from) * t + noise - dip * Math.sin(Math.PI * t) ** 2);
  });
}
const signups = (n: number, seed: number) => Array.from({ length: n }, (_, i) => 6 + ((i * 7 + seed) % 13));

const SERIES: Record<Range, Series> = {
  "7d": {
    label: "7 days",
    step: 1,
    values: curve(7, 46_900, 48_290, 120),
    signups: signups(7, 3),
    stats: { added: 1_640, churned: 250, customers: 1_284 },
  },
  "30d": {
    label: "30 days",
    step: 1,
    values: curve(30, 42_960, 48_290, 260),
    signups: signups(30, 5),
    stats: { added: 6_420, churned: 1_090, customers: 1_284 },
  },
  "90d": {
    label: "90 days",
    step: 3,
    values: curve(30, 49_850, 48_290, 300, 4_200),
    signups: signups(30, 11),
    stats: { added: 14_380, churned: 15_940, customers: 1_284 },
  },
};
const RANGES = Object.keys(SERIES) as Range[];

/** The chart's own coordinates; the SVG stretches to fit and the line keeps its weight. */
const W = 300;
const H = 120;
const PAD = 12;

function points(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  return values.map((v, i) => [(i / (values.length - 1)) * W, PAD + (1 - (v - lo) / span) * (H - PAD * 2)] as const);
}

/** A smooth line through the points (Catmull-Rom, as cubic Béziers). */
function smooth(pts: readonly (readonly [number, number])[]) {
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0]!.toFixed(2)} ${c1[1]!.toFixed(2)} ${c2[0]!.toFixed(2)} ${c2[1]!.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

const TODAY = new Date(2026, 9, 27);
const dateOf = (series: Series, i: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - (series.values.length - 1 - i) * series.step);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Two strokes each: an arrow's shaft and head, pointing up or down. */
const UP = "M12 19V5M5.5 11.5L12 5l6.5 6.5";
const DOWN = "M12 5v14M5.5 12.5L12 19l6.5-6.5";

interface State {
  range: Range;
  /** The point being scrubbed, or null when the headline shows today. */
  hover: number | null;
}

const BEATS: readonly (State & { ms: number })[] = [
  { range: "30d", hover: null, ms: 1800 },
  { range: "30d", hover: 6, ms: 380 },
  { range: "30d", hover: 13, ms: 380 },
  { range: "30d", hover: 21, ms: 380 },
  { range: "30d", hover: 27, ms: 800 },
  { range: "30d", hover: null, ms: 700 },
  { range: "90d", hover: null, ms: 2300 },
  { range: "7d", hover: null, ms: 1700 },
  { range: "7d", hover: 3, ms: 1300 },
  { range: "7d", hover: null, ms: 900 },
];

const fromBeat = (step: number): State => ({ range: BEATS[step]!.range, hover: BEATS[step]!.hover });

const RESHAPE = { type: "spring" as const, duration: 0.8, bounce: 0.12 };
const FOLLOW = { type: "spring" as const, duration: 0.3, bounce: 0.1 };

interface RevenueCardDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function RevenueCardDemo({ playing }: RevenueCardDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const id = useId();
  const chart = useRef<HTMLDivElement>(null);

  const series = SERIES[state.range];
  const pts = points(series.values);
  const line = smooth(pts);
  const linePath = useMorphPath(line, RESHAPE);
  const areaPath = useMorphPath(`${line}L${W} ${H}L0 ${H}Z`, RESHAPE);

  const last = series.values.length - 1;
  const at = state.hover ?? last;
  const value = series.values[at]!;
  const change = (value - series.values[0]!) / series.values[0]!;
  const up = change >= 0;
  const [x, y] = pts[at]!;

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const box = chart.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const i = Math.round(t * last);
    if (i !== state.hover) take((s) => ({ ...s, hover: i }));
  };

  const onKey = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    take((s) => ({ ...s, hover: Math.min(last, Math.max(0, (s.hover ?? last) + step)) }));
  };

  return (
    <section ref={scene.ref} className="rv not-prose" aria-label="Monthly recurring revenue">
      <header className="rv-head">
        <span className="rv-label">Monthly recurring revenue</span>
        <LayoutGroup id={id}>
          <ToggleGroup
            className="rv-ranges"
            value={[state.range]}
            onValueChange={(v) => v.length && take(() => ({ range: v[0] as Range, hover: null }))}
            aria-label="Range"
          >
            {RANGES.map((r) => (
              <Toggle key={r} value={r} className="rv-range">
                {r === state.range && <motion.span layoutId="range" className="rv-range-pill" transition={FOLLOW} />}
                <span>{r.toUpperCase()}</span>
              </Toggle>
            ))}
          </ToggleGroup>
        </LayoutGroup>
      </header>

      <div className="rv-figure">
        <Odometer value={money(value)} className="rv-mrr" />
        <span className="rv-badge" data-down={up ? undefined : ""}>
          <MorphIcon d={up ? UP : DOWN} strokeWidth={2.6} />
          <Odometer value={`${Math.abs(change * 100).toFixed(1)}%`} />
        </span>
      </div>
      <p className="rv-sub">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={state.hover === null ? `vs-${state.range}` : `on-${at}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {state.hover === null
              ? `vs ${series.label} ago`
              : `${dateOf(series, at)} · ${series.signups[at]} new customers`}
          </motion.span>
        </AnimatePresence>
      </p>

      <div
        ref={chart}
        className="rv-chart"
        role="img"
        tabIndex={0}
        aria-label={`Revenue over ${series.label}, ${up ? "up" : "down"} ${Math.abs(change * 100).toFixed(1)} percent`}
        onPointerMove={scrub}
        onPointerDown={scrub}
        onPointerLeave={() => state.hover !== null && take((s) => ({ ...s, hover: null }))}
        onKeyDown={onKey}
        onBlur={() => state.hover !== null && take((s) => ({ ...s, hover: null }))}
        data-down={up ? undefined : ""}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="rv-stop-top" />
              <stop offset="100%" className="rv-stop-bottom" />
            </linearGradient>
          </defs>
          <motion.path d={areaPath} fill={`url(#${id}-fill)`} />
          <motion.path d={linePath} className="rv-line" />
        </svg>

        {/* The scrubber lives in HTML on top, so the dot stays round however the chart stretches */}
        <AnimatePresence>
          {state.hover !== null && (
            <motion.div
              key="scrub"
              className="rv-scrub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, left: `${(x / W) * 100}%` }}
              exit={{ opacity: 0 }}
              transition={FOLLOW}
            >
              <span className="rv-rule" />
              <motion.span className="rv-dot" animate={{ top: `${(y / H) * 100}%` }} transition={FOLLOW} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="rv-axis" aria-hidden="true">
        <span>{dateOf(series, 0)}</span>
        <span>Today</span>
      </div>

      <dl className="rv-stats">
        <div>
          <dt>New MRR</dt>
          <dd>
            <Odometer value={`+${money(series.stats.added)}`} />
          </dd>
        </div>
        <div>
          <dt>Churned</dt>
          <dd data-down="">
            <Odometer value={`−${money(series.stats.churned)}`} />
          </dd>
        </div>
        <div>
          <dt>Customers</dt>
          <dd>
            <Odometer value={series.stats.customers.toLocaleString("en-US")} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
