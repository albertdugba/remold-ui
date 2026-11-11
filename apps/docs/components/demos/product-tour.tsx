"use client";

import {
  Add01Icon,
  Analytics01Icon,
  Cancel01Icon,
  DashboardSquare01Icon,
  HelpCircleIcon,
  Search01Icon,
  Settings01Icon,
  Share08Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold, useTour } from "@remold-ui/react";
import { useEffect, useId, useRef, useState, type CSSProperties, type Ref, type RefObject } from "react";
import useMeasure, { type RectReadOnly } from "react-use-measure";

import { Frame } from "./frame";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

export type Target = "new" | "search" | "revenue" | "chart" | "reports" | "share";
type Side = "top" | "right" | "bottom" | "left";
type Box = { x: number; y: number; width: number; height: number };
type Size = { width: number; height: number };

/** A stop on the tour. It points at the `Remold.Tour.Target` with its `name`; a step with no target sits in the middle. */
export interface Step {
  name: string;
  title: string;
  body: string;
  /** Which side of its target the tip opens on. */
  side?: Side;
}

const STEPS: Step[] = [
  {
    name: "welcome",
    title: "Welcome to Orbit",
    body: "A quick look round, about a minute. Use the arrow keys, or close it any time.",
  },
  {
    name: "new",
    side: "bottom",
    title: "Start with a report",
    body: "Pick a template or start blank. Reports refresh on their own as new data comes in.",
  },
  {
    name: "search",
    side: "bottom",
    title: "Find anything",
    body: "Search reports, customers and settings from one place. Press / from anywhere.",
  },
  {
    name: "revenue",
    side: "bottom",
    title: "Your numbers at a glance",
    body: "Each card compares with last month, so you see what moved before you dig in.",
  },
  {
    name: "chart",
    side: "top",
    title: "Spot the trend",
    body: "Twelve weeks of revenue, week by week. This one is your best yet.",
  },
  {
    name: "reports",
    side: "right",
    title: "Everything you've saved",
    body: "Reports you and your team save land here, with a badge until you open them.",
  },
  {
    name: "share",
    side: "left",
    title: "Bring your team",
    body: "Invite people to view or edit. Everyone sees the same numbers, live.",
  },
  {
    name: "done",
    title: "That's the tour",
    body: "Find it again under Help whenever you need it. Now, that first report.",
  },
];

const TIP = { width: 260, height: 172 };
const GAP = 30;
const EDGE = 12;
const PAD = 6;
const SPRING = { duration: 0.6, bounce: 0.14 };

const FACING: Record<Side, { from: Side; to: Side }> = {
  top: { from: "top", to: "bottom" },
  bottom: { from: "bottom", to: "top" },
  left: { from: "left", to: "right" },
  right: { from: "right", to: "left" },
};

const NAV = [
  { icon: DashboardSquare01Icon, label: "Overview", on: true },
  { icon: Analytics01Icon, label: "Reports" },
  { icon: UserGroupIcon, label: "Customers" },
  { icon: Settings01Icon, label: "Settings" },
];

const KPIS = [
  { label: "Revenue", value: "$48.2k", delta: "+12.4%" },
  { label: "Active users", value: "3,120", delta: "+4.1%" },
  { label: "Churn", value: "1.8%", delta: "−0.3%" },
];

const WEEKS = [26.1, 28.4, 27.2, 31.9, 30.6, 34.8, 33.1, 37.5, 36.2, 41.8, 40.3, 48.2];
const CHART = { top: 50, bottom: 20 };
const WEEK_LABELS = [
  { week: 0, label: "Aug 18" },
  { week: 4, label: "Sep 15" },
  { week: 8, label: "Oct 13" },
];

const heightOf = (value: number) => ((CHART.top - value) / (CHART.top - CHART.bottom)) * 100;

const LINE = WEEKS.map((week, index) => {
  const x = (index / (WEEKS.length - 1)) * 100;
  return `${index ? "L" : "M"}${x.toFixed(2)} ${heightOf(week).toFixed(2)}`;
}).join(" ");

const FOCUS =
  "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pt-accent)";

const ROOT = [
  "w-[680px] max-w-full font-sans text-[13px] text-zinc-900 dark:text-zinc-50",
  "[--pt-ring:rgb(255_255_255/0.9)] [--pt-line:rgb(255_255_255/0.75)]",
  "[--pt-spring:linear(0,0.18_6%,0.56_14%,0.86_22%,1.02_31%,1.06_38%,1.04_46%,1.005_58%,0.997_70%,1)]",
].join(" ");

const STAGE = [
  "group/tour relative isolate h-[430px] overflow-hidden rounded-[18px] bg-white dark:bg-[#1c1c20]",
  "[&_.rm-connector]:stroke-(--pt-line) [&_.rm-connector]:[stroke-dasharray:var(--pt-dash)]",
  "[&_.rm-connector]:[stroke-linecap:round] [&_.rm-connector]:[stroke-width:1.5] [&>svg]:z-3 [&>svg]:text-(--pt-line)",
].join(" ");

const SPOTLIGHT = [
  "pointer-events-none absolute top-0 left-0 z-2 rounded-[14px] opacity-0 group-data-touring/tour:opacity-100",
  "shadow-[0_0_0_1.5px_var(--pt-ring),0_0_0_6px_color-mix(in_oklab,var(--pt-accent)_28%,transparent),0_0_0_200vmax_var(--pt-dim)]",
  "transition-[transform,width,height,opacity] duration-[620ms,620ms,620ms,300ms]",
  "ease-[var(--pt-spring),var(--pt-spring),var(--pt-spring),ease]",
  "motion-reduce:transition-opacity motion-reduce:duration-200 motion-reduce:ease-[ease]",
].join(" ");

const TIP_SURFACE = [
  "pointer-events-auto absolute right-3.5 bottom-3.5",
  "data-open:right-auto data-open:bottom-auto data-open:grid data-open:gap-1.5 data-open:rounded-2xl",
  "data-open:bg-white data-open:px-3.5 data-open:pt-3.5 data-open:pb-3 dark:data-open:bg-[#1c1c20]",
].join(" ");

const KPI =
  "grid gap-0.5 rounded-lg px-3 py-2 not-first:border-l not-first:border-zinc-200/70 dark:not-first:border-white/[0.07]";

const QUIET_BUTTON = "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-[#2c2c31] dark:hover:text-zinc-50";

function placeTip(target: Box, side: Side, bounds: Size) {
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;

  const spot = {
    top: { x: centerX - TIP.width / 2, y: target.y - PAD - GAP - TIP.height },
    bottom: { x: centerX - TIP.width / 2, y: target.y + target.height + PAD + GAP },
    left: { x: target.x - PAD - GAP - TIP.width, y: centerY - TIP.height / 2 },
    right: { x: target.x + target.width + PAD + GAP, y: centerY - TIP.height / 2 },
  }[side];

  const clamp = (value: number, max: number) => Math.max(EDGE, Math.min(max - EDGE, value));
  return { x: clamp(spot.x, bounds.width - TIP.width), y: clamp(spot.y, bounds.height - TIP.height) };
}

function Sidebar({ measure }: { measure: MeasureRefs }) {
  return (
    <aside className="grid content-start gap-0.5 border-r border-zinc-200/70 px-2.5 py-4 max-sm:hidden dark:border-white/[0.07]">
      <span className="flex items-center gap-2 px-2 pb-3.5 text-[14px] font-[650] tracking-[-0.01em]">
        <span
          className="grid size-[22px] place-items-center rounded-md bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-50 dark:text-[#1c1c20]"
          aria-hidden="true"
        >
          O
        </span>
        Orbit
      </span>

      {NAV.map((item) => {
        const content = (
          <>
            <HugeiconsIcon icon={item.icon} strokeWidth={1.7} aria-hidden="true" />
            {item.label}
          </>
        );
        return item.label === "Reports" ? (
          <Remold.Tour.Target
            key={item.label}
            ref={measure.reports}
            name="reports"
            render={<Remold.Anchor name="reports" render={<span className={`${NAV_ITEM} group/nav`} />} />}
          >
            {content}
            <span className="ml-auto flex-none scale-50 rounded-full whitespace-nowrap bg-(--pt-accent) px-1.5 text-[10px] leading-4 font-semibold text-white opacity-0 transition-[scale,opacity] delay-300 duration-[400ms,200ms] ease-(--pt-spring) group-data-rm-active/nav:scale-100 group-data-rm-active/nav:opacity-100 motion-reduce:transition-none">
              3 new
            </span>
          </Remold.Tour.Target>
        ) : (
          <span key={item.label} className={NAV_ITEM} data-on={item.on || undefined}>
            {content}
          </span>
        );
      })}
    </aside>
  );
}

type MeasureRefs = Record<Target, (element: HTMLElement | null) => void>;

const NAV_ITEM =
  "flex h-8 items-center gap-[9px] rounded-lg px-2 text-zinc-500 data-on:bg-zinc-100 data-on:font-medium data-on:text-zinc-900 dark:text-zinc-400 dark:data-on:bg-white/[0.07] dark:data-on:text-zinc-50 [&_svg]:size-4";

const QUERY = "churn by plan";

/** While its step shows, the search field types a query, so you see what it's for. */
function SearchText() {
  const { step } = useTour();
  const active = step === "search";
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!active) {
      setTyped(0);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setTyped((count) => Math.min(QUERY.length, count + 1)), 70);
    }, 550);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [active]);

  if (!typed) return <span className="flex-1 max-sm:hidden">Search…</span>;
  return (
    <span className="flex flex-1 items-center truncate text-zinc-900 max-sm:hidden dark:text-zinc-50">
      {QUERY.slice(0, typed)}
      <span className="ml-px h-3.5 w-px animate-pulse bg-(--pt-accent)" aria-hidden="true" />
    </span>
  );
}

function DashboardHeader({ measure }: { measure: MeasureRefs }) {
  return (
    <header className="flex items-center gap-2">
      <span className="grid flex-1 leading-tight">
        <h3 className="m-0 text-[15px] font-[650] tracking-[-0.015em]">Overview</h3>
        <span className="text-[11.5px] text-zinc-500 dark:text-zinc-400">Last 30 days</span>
      </span>

      <Remold.Tour.Target
        ref={measure.search}
        name="search"
        render={
          <Remold.Anchor
            name="search"
            render={
              <label
                className="flex h-8 w-[150px] items-center gap-[7px] rounded-[9px] bg-zinc-100 pr-1.5 pl-2.5 text-zinc-400 max-sm:w-8 max-sm:justify-center max-sm:px-0 dark:bg-[#2c2c31] dark:text-zinc-500 [&_svg]:size-[15px]"
              />
            }
          />
        }
      >
        <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} aria-hidden="true" />
        <SearchText />
        <kbd className="rounded-[5px] bg-white px-1.5 py-px font-mono text-[11px] leading-[1.4] text-zinc-500 max-sm:hidden dark:bg-[#1c1c20]">
          /
        </kbd>
      </Remold.Tour.Target>

      <Remold.Tour.Target
        ref={measure.share}
        name="share"
        render={
          <Remold.Anchor
            name="share"
            render={
              <button
                type="button"
                className={`group/share inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-zinc-100 px-3 font-medium whitespace-nowrap max-sm:px-2.5 dark:bg-[#2c2c31] [&_svg]:size-[15px] ${FOCUS}`}
              />
            }
          />
        }
      >
        <span
          className="-mr-1.5 flex w-0 overflow-hidden transition-[width,margin] delay-300 duration-500 ease-(--pt-spring) group-data-rm-active/share:mr-0 group-data-rm-active/share:w-[30px] motion-reduce:transition-none"
          aria-hidden="true"
        >
          {["#f59e0b", "#10b981"].map((color, index) => (
            <span
              key={color}
              className="grid size-[18px] flex-none place-items-center rounded-full text-[8.5px] font-bold text-white shadow-[0_0_0_1.5px_white] not-first:-ml-1.5 dark:shadow-[0_0_0_1.5px_#2c2c31]"
              style={{ background: color }}
            >
              {index ? "KO" : "AM"}
            </span>
          ))}
        </span>
        <HugeiconsIcon icon={Share08Icon} strokeWidth={1.8} aria-hidden="true" />
        <span className="max-sm:sr-only">Share</span>
      </Remold.Tour.Target>

      <Remold.Tour.Target
        ref={measure.new}
        name="new"
        render={
          <Remold.Anchor
            name="new"
            render={
              <button
                type="button"
                className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-zinc-900 px-3 font-medium whitespace-nowrap text-white dark:bg-zinc-50 dark:text-[#1c1c20] [&_svg]:size-[15px] ${FOCUS}`}
              />
            }
          />
        }
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
        New<span className="max-sm:hidden"> report</span>
      </Remold.Tour.Target>
    </header>
  );
}

function Kpis({ measure }: { measure: MeasureRefs }) {
  return (
    <div className="-mx-3 grid grid-cols-3">
      {KPIS.map((kpi, index) => {
        const content = (
          <>
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[20px] font-[650] tracking-[-0.025em] tabular-nums max-sm:text-[17px]">
                {kpi.value}
              </span>
              <span
                className={`rounded-full text-[11.5px] font-medium tabular-nums text-green-700 dark:text-green-400 ${
                  index === 0
                    ? "transition-[background-color,padding] delay-300 duration-500 ease-(--pt-spring) group-data-rm-active/kpi:bg-green-100 group-data-rm-active/kpi:px-1.5 motion-reduce:transition-none dark:group-data-rm-active/kpi:bg-green-400/15"
                    : ""
                }`}
              >
                {kpi.delta}
              </span>
            </span>
          </>
        );

        return index === 0 ? (
          <Remold.Tour.Target
            key={kpi.label}
            ref={measure.revenue}
            name="revenue"
            render={<Remold.Anchor name="revenue" render={<div className={`${KPI} group/kpi`} />} />}
          >
            {content}
          </Remold.Tour.Target>
        ) : (
          <div key={kpi.label} className={KPI}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart({ measure }: { measure: MeasureRefs }) {
  return (
    <Remold.Tour.Target
      ref={measure.chart}
      name="chart"
      render={
        <Remold.Anchor
          name="chart"
          render={
            <figure className="group/chart m-0 grid min-h-0 grid-rows-[auto_1fr_auto] gap-2 border-t border-zinc-200/70 pt-3.5 dark:border-white/[0.07]" />
          }
        />
      }
    >
      <figcaption className="flex items-baseline justify-between text-[12px] text-zinc-500 dark:text-zinc-400">
        <span>Weekly revenue</span>
        <span>
          <b className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">$412,900</b> in 12 weeks
        </span>
      </figcaption>

      <span className="relative min-h-0" aria-hidden="true">
        {[50, 40, 30].map((value) => (
          <span
            key={value}
            className="absolute inset-x-0 flex items-center gap-2 text-[10.5px] text-zinc-400 tabular-nums dark:text-zinc-500"
            style={{ top: `${heightOf(value)}%` }}
          >
            <span className="h-px flex-1 border-t border-dashed border-zinc-200 dark:border-white/10" />
            <span className="w-7 -translate-y-px text-right">${value}k</span>
          </span>
        ))}

        <svg
          className="absolute inset-y-0 right-9 left-0 h-full w-[calc(100%-36px)] overflow-visible text-zinc-900 dark:text-zinc-50"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={LINE}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <span
          className="absolute size-2 -translate-1/2 rounded-full bg-zinc-900 shadow-[0_0_0_3px_white] transition-[background-color,box-shadow] delay-300 duration-300 group-data-rm-active/chart:bg-(--pt-accent) group-data-rm-active/chart:shadow-[0_0_0_3px_white,0_0_0_7px_color-mix(in_oklab,var(--pt-accent)_25%,transparent)] dark:bg-zinc-50 dark:shadow-[0_0_0_3px_#1c1c20]"
          style={{ left: "calc(100% - 36px)", top: `${heightOf(WEEKS.at(-1)!)}%` }}
        />
        <span
          className="absolute origin-top-right -translate-x-[calc(100%+6px)] translate-y-2.5 scale-90 rounded-lg bg-zinc-900 px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 transition-[scale,opacity] delay-500 duration-[450ms,200ms] ease-(--pt-spring) group-data-rm-active/chart:scale-100 group-data-rm-active/chart:opacity-100 motion-reduce:transition-none dark:bg-zinc-50 dark:text-[#1c1c20]"
          style={{ left: "calc(100% - 36px)", top: `${heightOf(WEEKS.at(-1)!)}%` }}
        >
          <b className="font-semibold tabular-nums">$48.2k</b> · best week yet
        </span>
      </span>

      <span className="relative h-3.5 text-[10.5px] text-zinc-400 dark:text-zinc-500" aria-hidden="true">
        {WEEK_LABELS.map(({ week, label }) => (
          <span
            key={label}
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap first:translate-x-0"
            style={{ left: `calc((100% - 36px) * ${week / (WEEKS.length - 1)})` }}
          >
            {label}
          </span>
        ))}
      </span>
    </Remold.Tour.Target>
  );
}

function Dashboard({ inert, measure }: { inert: boolean; measure: MeasureRefs }) {
  return (
    <div className="grid h-full grid-cols-[150px_1fr] max-sm:grid-cols-1" inert={inert || undefined}>
      <Sidebar measure={measure} />

      <main className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-3.5 px-[18px] pt-4 pb-[18px] max-sm:px-3.5">
        <DashboardHeader measure={measure} />
        <Kpis measure={measure} />
        <RevenueChart measure={measure} />
      </main>
    </div>
  );
}

const DASH = { dotted: "2 4", dashed: "6 5", solid: "none" } as const;

/** A box relative to the stage, once both have been measured. */
const relativeTo = (stage: RectReadOnly, element: RectReadOnly): Box | null =>
  stage.width && element.width
    ? { x: element.left - stage.left, y: element.top - stage.top, width: element.width, height: element.height }
    : null;

function TipContent({
  steps,
  titleId,
  bodyId,
  nextRef,
}: {
  steps: readonly Step[];
  titleId: string;
  bodyId: string;
  nextRef: RefObject<HTMLButtonElement | null>;
}) {
  const tour = useTour();
  const current = steps[tour.index]!;

  return (
    <>
      <div className="flex items-center justify-between">
        <Remold.Text className="text-[11.5px] font-semibold tracking-[0.02em] text-(--pt-accent)">
          {`${tour.index + 1} of ${tour.count}`}
        </Remold.Text>
        <Remold.Tour.Close
          className={`-mt-1 -mr-1 grid size-6 place-items-center rounded-[7px] text-zinc-400 dark:text-zinc-500 [&_svg]:size-3.5 ${QUIET_BUTTON} ${FOCUS}`}
          aria-label="End tour"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
        </Remold.Tour.Close>
      </div>

      <Remold.Text id={titleId} className="text-[15px] font-[650] tracking-[-0.015em]">
        {current.title}
      </Remold.Text>
      <Remold.Text id={bodyId} className="min-h-[3.9em] leading-[1.45] text-zinc-500 dark:text-zinc-400">
        {current.body}
      </Remold.Text>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="flex flex-1 gap-1" aria-hidden="true">
          {steps.map((entry, index) => (
            <span
              key={entry.name}
              className="h-1.5 w-1.5 rounded-[3px] bg-zinc-200 transition-[width,background-color] duration-[400ms,250ms] ease-(--pt-spring) data-done:bg-(--pt-accent)/45 data-on:w-[18px] data-on:bg-(--pt-accent) motion-reduce:transition-none dark:bg-[#2c2c31]"
              data-on={index === tour.index || undefined}
              data-done={index < tour.index || undefined}
            />
          ))}
        </span>

        <Remold.Tour.Previous
          className={`h-[30px] rounded-[9px] px-3 font-medium text-zinc-500 data-rm-disabled:hidden dark:text-zinc-400 ${QUIET_BUTTON} ${FOCUS}`}
        >
          Back
        </Remold.Tour.Previous>

        <Remold.Tour.Next
          ref={nextRef}
          className={`h-[30px] rounded-[9px] bg-(--pt-accent) px-3 font-medium text-white ${FOCUS}`}
        >
          <Remold.Text>{tour.last ? "Finish" : "Next"}</Remold.Text>
        </Remold.Tour.Next>
      </div>
    </>
  );
}

function HelpButton({ helpRef }: { helpRef: RefObject<HTMLButtonElement | null> }) {
  const tour = useTour();
  return (
    <button
      ref={helpRef}
      type="button"
      className={`inline-flex h-9 items-center gap-[7px] rounded-full bg-zinc-900 pr-3.5 pl-[11px] font-medium text-white dark:bg-zinc-50 dark:text-[#1c1c20] [&_svg]:size-[17px] ${FOCUS}`}
      onClick={() => tour.start()}
    >
      <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={1.8} aria-hidden="true" />
      <span>Take the tour</span>
    </button>
  );
}

export interface ProductTourProps {
  /** The step on screen, or -1 when the tour is folded away into the help button. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (step: number, details: ChangeDetails) => void;
  /** What each step points at and says. Defaults to four steps over the dashboard. */
  steps?: readonly Step[];
  /** The colour of the step count, the dots, Next and the glow round the spotlight. Defaults to `#7c5cff`. */
  accent?: string;
  /** How dark the app gets around the spotlight, from 0 (not at all: just a ring) to 1. Defaults to `0.55`. */
  dim?: number;
  /** Draw the line from the tip to the control it explains. Defaults to `true`. */
  connector?: boolean;
  /** The line's colour. Defaults to white over a dim app, and the accent over a bright one. */
  connectorColor?: string;
  connectorStyle?: keyof typeof DASH;
  connectorShape?: "curve" | "elbow" | "straight";
  /** Send a light along the line each step. Defaults to `true`. */
  pulse?: boolean;
  /** Moves focus onto Next as the tour opens and back to the help button as it folds away, and lets the keyboard drive it. */
  moveFocus?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/** A product tour over a dashboard: a spotlight and a tip spring from one control to the next. */
export function ProductTour({
  value,
  defaultValue = -1,
  onValueChange,
  steps = STEPS,
  accent = "#7c5cff",
  dim = 0.55,
  connector = true,
  connectorColor,
  connectorStyle = "dotted",
  connectorShape = "curve",
  pulse = true,
  moveFocus = true,
  ref,
}: ProductTourProps) {
  const [step, setStep] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const nextRef = useRef<HTMLButtonElement>(null);
  const helpRef = useRef<HTMLButtonElement>(null);

  const [stageRef, stage] = useMeasure();
  const [newRef, newBox] = useMeasure();
  const [searchRef, searchBox] = useMeasure();
  const [revenueRef, revenueBox] = useMeasure();
  const [chartRef, chartBox] = useMeasure();
  const [reportsRef, reportsBox] = useMeasure();
  const [shareRef, shareBox] = useMeasure();
  const measure: MeasureRefs = {
    new: newRef,
    search: searchRef,
    revenue: revenueRef,
    chart: chartRef,
    reports: reportsRef,
    share: shareRef,
  };
  const measured: Record<string, RectReadOnly> = {
    new: newBox,
    search: searchBox,
    revenue: revenueBox,
    chart: chartBox,
    reports: reportsBox,
    share: shareBox,
  };

  const stepNames = steps.map((entry) => entry.name);
  const touring = step >= 0;
  const current = touring ? steps[step]! : null;
  const side = current?.side ?? "bottom";
  const box = current && measured[current.name];
  const target = box ? relativeTo(stage, box) : null;
  const tip = !current
    ? null
    : target
      ? placeTip(target, side, stage)
      : { x: (stage.width - TIP.width) / 2, y: (stage.height - TIP.height) / 2 };
  const facing = target ? FACING[side] : null;

  const wasTouring = useRef(touring);
  useEffect(() => {
    if (!moveFocus || wasTouring.current === touring) return;
    wasTouring.current = touring;
    (touring ? nextRef.current : helpRef.current)?.focus({ preventScroll: true });
  }, [touring, moveFocus]);

  const bright = dim < 0.25;
  const look = {
    "--pt-accent": accent,
    "--pt-dim": `rgb(10 10 20 / ${dim})`,
    ...(bright && { "--pt-ring": "var(--pt-accent)" }),
    "--pt-line": connectorColor ?? (bright ? "var(--pt-accent)" : undefined),
    "--pt-dash": DASH[connectorStyle],
  } as CSSProperties;

  return (
    <section ref={ref} className={ROOT} style={look} aria-label="Product tour demo">
      <Remold.Tour.Root
        steps={stepNames}
        step={touring ? stepNames[step]! : null}
        onStepChange={(name) => setStep(name === null ? -1 : stepNames.indexOf(name))}
        keyboard={moveFocus}
        scrollIntoView={false}
      >
        <Remold.Connectors
          ref={stageRef}
          shape={connectorShape}
          gap={6}
          className={STAGE}
          data-touring={touring || undefined}
        >
          <Dashboard inert={touring} measure={measure} />

          <Remold.Tour.Spotlight className={SPOTLIGHT} padding={PAD} />

          <Remold.Morph
            trigger={[step, Math.round(tip?.x ?? 0), Math.round(tip?.y ?? 0)]}
            spring={SPRING}
            className="pointer-events-none absolute inset-0 z-4"
          >
            <Remold.Anchor
              name="tip"
              linkTo={connector && target ? current!.name : null}
              fromSide={facing?.from}
              toSide={facing?.to}
              pulse={connector && pulse && target ? step : undefined}
              render={
                <div
                  className={TIP_SURFACE}
                  data-open={touring || undefined}
                  role={touring ? "dialog" : undefined}
                  aria-labelledby={touring ? `${id}-title` : undefined}
                  aria-describedby={touring ? `${id}-body` : undefined}
                  style={tip ? { left: tip.x, top: tip.y, width: TIP.width } : undefined}
                />
              }
            >
              {touring ? (
                <TipContent steps={steps} titleId={`${id}-title`} bodyId={`${id}-body`} nextRef={nextRef} />
              ) : (
                <HelpButton helpRef={helpRef} />
              )}
            </Remold.Anchor>
          </Remold.Morph>
        </Remold.Connectors>
      </Remold.Tour.Root>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS = [
  { step: -1, ms: 1500 },
  { step: 0, ms: 2400 },
  { step: 1, ms: 2400 },
  { step: 2, ms: 2800 },
  { step: 3, ms: 2400 },
  { step: 4, ms: 2600 },
  { step: 5, ms: 2400 },
  { step: 6, ms: 2600 },
  { step: 7, ms: 2400 },
] as const;

const fromBeat = (index: number): number => BEATS[index]!.step;

/** The look, from `ProductTourProps`: the docs' configurator passes these through. */
export type ProductTourLook = Pick<
  ProductTourProps,
  "accent" | "dim" | "connector" | "connectorColor" | "connectorStyle" | "connectorShape" | "pulse"
>;

interface ProductTourDemoProps extends ProductTourLook {
  framed?: boolean;
  playing?: boolean;
}

export function ProductTourDemo({ framed = true, playing, ...look }: ProductTourDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);

  const element = (
    <ProductTour
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      moveFocus={!scene.live}
      {...look}
    />
  );

  return framed ? <Frame>{element}</Frame> : element;
}
