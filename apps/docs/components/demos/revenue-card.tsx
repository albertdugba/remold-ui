"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown02Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type PointerEvent, type Ref } from "react";
import { useMorphPath } from "./use-morph-path";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./revenue-card.css";

type Range = "7d" | "30d" | "90d";

interface Series {
  label: string;
  step: number;
  values: number[];
  signups: number[];
  stats: { added: number; churned: number; customers: number };
}

function curve(count: number, from: number, to: number, wobble: number, dip = 0) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return from;
    if (index === count - 1) return to;
    const progress = index / (count - 1);
    const noise = Math.sin(index * 1.7) * wobble + Math.sin(index * 0.43) * wobble * 1.6;
    return Math.round(from + (to - from) * progress + noise - dip * Math.sin(Math.PI * progress) ** 2);
  });
}
const signups = (count: number, seed: number) =>
  Array.from({ length: count }, (_, index) => 6 + ((index * 7 + seed) % 13));

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

const W = 300;
const H = 120;
const PAD = 12;

function points(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  return values.map(
    (value, index) =>
      [(index / (values.length - 1)) * W, PAD + (1 - (value - lo) / span) * (H - PAD * 2)] as const,
  );
}

function smooth(pts: readonly (readonly [number, number])[]) {
  let path = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path += `C${c1[0]!.toFixed(2)} ${c1[1]!.toFixed(2)} ${c2[0]!.toFixed(2)} ${c2[1]!.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return path;
}

const TODAY = new Date(2026, 9, 27);
const dateOf = (series: Series, index: number) => {
  const date = new Date(TODAY);
  date.setDate(date.getDate() - (series.values.length - 1 - index) * series.step);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const money = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;

export interface RevenueCardValue {
  range: Range;
  /** The point being scrubbed, or null when the headline shows today. */
  hover: number | null;
}

const RESHAPE = { type: "spring" as const, duration: 0.8, bounce: 0.12 };
const FOLLOW = { type: "spring" as const, duration: 0.3, bounce: 0.1 };

export interface RevenueCardProps {
  /** The range shown, and the point being scrubbed. */
  value?: RevenueCardValue;
  defaultValue?: RevenueCardValue;
  onValueChange?: (value: RevenueCardValue) => void;
  ref?: Ref<HTMLElement>;
}

/** A revenue card with a range switch and a chart you can scrub, by pointer or arrow keys. */
export function RevenueCard({
  value,
  defaultValue = { range: "30d", hover: null },
  onValueChange,
  ref,
}: RevenueCardProps) {
  const [view, setView] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const chartRef = useRef<HTMLDivElement>(null);

  const series = SERIES[view.range];
  const pts = points(series.values);
  const line = smooth(pts);
  const linePath = useMorphPath(line, RESHAPE);
  const areaPath = useMorphPath(`${line}L${W} ${H}L0 ${H}Z`, RESHAPE);

  const last = series.values.length - 1;
  const at = view.hover ?? last;
  const amount = series.values[at]!;
  const change = (amount - series.values[0]!) / series.values[0]!;
  const up = change >= 0;
  const [x, y] = pts[at]!;

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const box = chartRef.current!.getBoundingClientRect();
    const across = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const hovered = Math.round(across * last);
    if (hovered !== view.hover) setView((current) => ({ ...current, hover: hovered }));
  };

  const onKey = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    setView((current) => ({
      ...current,
      hover: Math.min(last, Math.max(0, (current.hover ?? last) + step)),
    }));
  };

  return (
    <section ref={ref} className="rv not-prose" aria-label="Monthly recurring revenue">
      <header className="rv-head">
        <span className="rv-label">Monthly recurring revenue</span>
        <LayoutGroup id={id}>
          <ToggleGroup
            className="rv-ranges"
            value={[view.range]}
            onValueChange={(values) =>
              values.length && setView(() => ({ range: values[0] as Range, hover: null }))
            }
            aria-label="Range"
          >
            {RANGES.map((option) => (
              <Toggle key={option} value={option} className="rv-range">
                {option === view.range && (
                  <motion.span layoutId="range" className="rv-range-pill" transition={FOLLOW} />
                )}
                <span>{option.toUpperCase()}</span>
              </Toggle>
            ))}
          </ToggleGroup>
        </LayoutGroup>
      </header>

      <div className="rv-figure">
        <Odometer value={money(amount)} className="rv-mrr" />
        <span className="rv-badge" data-down={up ? undefined : ""}>
          <Remold.Icon
            icon={<HugeiconsIcon icon={up ? ArrowUp02Icon : ArrowDown02Icon} />}
            strokeWidth={2.6}
          />
          <Odometer value={`${Math.abs(change * 100).toFixed(1)}%`} />
        </span>
      </div>
      <p className="rv-sub">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={view.hover === null ? `vs-${view.range}` : `on-${at}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {view.hover === null
              ? `vs ${series.label} ago`
              : `${dateOf(series, at)} · ${series.signups[at]} new customers`}
          </motion.span>
        </AnimatePresence>
      </p>

      <div
        ref={chartRef}
        className="rv-chart"
        role="img"
        tabIndex={0}
        aria-label={`Revenue over ${series.label}, ${up ? "up" : "down"} ${Math.abs(change * 100).toFixed(1)} percent`}
        onPointerMove={scrub}
        onPointerDown={scrub}
        onPointerLeave={() => view.hover !== null && setView((current) => ({ ...current, hover: null }))}
        onKeyDown={onKey}
        onBlur={() => view.hover !== null && setView((current) => ({ ...current, hover: null }))}
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

        <AnimatePresence>
          {view.hover !== null && (
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

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (RevenueCardValue & { ms: number })[] = [
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

const fromBeat = (step: number): RevenueCardValue => ({
  range: BEATS[step]!.range,
  hover: BEATS[step]!.hover,
});

interface RevenueCardDemoProps {
  playing?: boolean;
}

export function RevenueCardDemo({ playing }: RevenueCardDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <RevenueCard ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
