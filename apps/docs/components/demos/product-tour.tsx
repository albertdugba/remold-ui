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
import { Remold } from "@remold-ui/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from "react";

import { Frame } from "./frame";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

type Target = "new" | "search" | "revenue" | "share";
type Side = "top" | "right" | "bottom" | "left";
type Box = { x: number; y: number; width: number; height: number };
type Size = { width: number; height: number };

interface Step {
  target: Target;
  title: string;
  body: string;
  side: Side;
}

const STEPS: Step[] = [
  {
    target: "new",
    title: "Start with a report",
    body: "Pick a template or start blank. Reports refresh on their own as new data comes in.",
    side: "bottom",
  },
  {
    target: "search",
    title: "Find anything",
    body: "Search reports, customers and settings from one place. Press / from anywhere.",
    side: "bottom",
  },
  {
    target: "revenue",
    title: "Your numbers at a glance",
    body: "Each card compares with last month. Open one to see what moved it, day by day.",
    side: "bottom",
  },
  {
    target: "share",
    title: "Bring your team",
    body: "Invite people to view or edit. Everyone sees the same numbers, live.",
    side: "left",
  },
];

const LAST = STEPS.length - 1;

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
  "[--pt-accent:#6d4aff] [--pt-dim:rgb(14_12_28/0.52)] dark:[--pt-accent:#a48bff] dark:[--pt-dim:rgb(0_0_0/0.6)]",
  "[--pt-spring:linear(0,0.18_6%,0.56_14%,0.86_22%,1.02_31%,1.06_38%,1.04_46%,1.005_58%,0.997_70%,1)]",
].join(" ");

const STAGE = [
  "group/tour relative isolate h-[430px] overflow-hidden rounded-[18px] bg-white dark:bg-[#1c1c20]",
  "[&_.rm-connector]:stroke-white/75 [&_.rm-connector]:[stroke-dasharray:2_4]",
  "[&_.rm-connector]:[stroke-linecap:round] [&_.rm-connector]:[stroke-width:1.5] [&>svg]:z-3 [&>svg]:text-white",
].join(" ");

const SPOTLIGHT = [
  "pointer-events-none absolute top-0 left-0 z-2 rounded-[14px] opacity-0 group-data-touring/tour:opacity-100",
  "shadow-[0_0_0_1.5px_rgb(255_255_255/0.9),0_0_0_6px_rgb(109_74_255/0.28),0_0_0_200vmax_var(--pt-dim)]",
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

function spotlightAround(target: Box | null | undefined, bounds: Size | undefined): Box {
  if (target) {
    return {
      x: target.x - PAD,
      y: target.y - PAD,
      width: target.width + PAD * 2,
      height: target.height + PAD * 2,
    };
  }

  return { x: -40, y: -40, width: (bounds?.width ?? 640) + 80, height: (bounds?.height ?? 420) + 80 };
}

function useTargetBoxes(root: RefObject<HTMLElement | null>) {
  const [boxes, setBoxes] = useState<{ bounds: Size; of: Partial<Record<Target, Box>> } | null>(null);

  const measure = useCallback(() => {
    const frame = root.current;
    if (!frame) return;

    const origin = frame.getBoundingClientRect();
    const of: Partial<Record<Target, Box>> = {};

    for (const anchor of frame.querySelectorAll<HTMLElement>("[data-rm-anchor]")) {
      const name = anchor.dataset.rmAnchor as Target | "tip";
      if (name === "tip") continue;

      const rect = anchor.getBoundingClientRect();
      of[name] = {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      };
    }

    setBoxes({ bounds: { width: origin.width, height: origin.height }, of });
  }, [root]);

  useLayoutEffect(() => {
    measure();

    const frame = root.current;
    if (!frame || typeof ResizeObserver !== "function") return;

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measure, root]);

  return boxes;
}

function Sidebar() {
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

      {NAV.map((item) => (
        <span
          key={item.label}
          className="flex h-8 items-center gap-[9px] rounded-lg px-2 text-zinc-500 data-on:bg-zinc-100 data-on:font-medium data-on:text-zinc-900 dark:text-zinc-400 dark:data-on:bg-white/[0.07] dark:data-on:text-zinc-50 [&_svg]:size-4"
          data-on={item.on || undefined}
        >
          <HugeiconsIcon icon={item.icon} strokeWidth={1.7} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </aside>
  );
}

function DashboardHeader() {
  return (
    <header className="flex items-center gap-2">
      <span className="grid flex-1 leading-tight">
        <h3 className="m-0 text-[15px] font-[650] tracking-[-0.015em]">Overview</h3>
        <span className="text-[11.5px] text-zinc-500 dark:text-zinc-400">Last 30 days</span>
      </span>

      <Remold.Anchor
        name="search"
        render={
          <label className="flex h-8 w-[150px] items-center gap-[7px] rounded-[9px] bg-zinc-100 pr-1.5 pl-2.5 text-zinc-400 max-sm:w-8 max-sm:justify-center max-sm:px-0 dark:bg-[#2c2c31] dark:text-zinc-500 [&_svg]:size-[15px]" />
        }
      >
        <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} aria-hidden="true" />
        <span className="flex-1 max-sm:hidden">Search…</span>
        <kbd className="rounded-[5px] bg-white px-1.5 py-px font-mono text-[11px] leading-[1.4] text-zinc-500 max-sm:hidden dark:bg-[#1c1c20]">
          /
        </kbd>
      </Remold.Anchor>

      <Remold.Anchor
        name="share"
        render={
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-zinc-100 px-3 font-medium whitespace-nowrap max-sm:px-2.5 dark:bg-[#2c2c31] [&_svg]:size-[15px] ${FOCUS}`}
          />
        }
      >
        <HugeiconsIcon icon={Share08Icon} strokeWidth={1.8} aria-hidden="true" />
        <span className="max-sm:sr-only">Share</span>
      </Remold.Anchor>

      <Remold.Anchor
        name="new"
        render={
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-zinc-900 px-3 font-medium whitespace-nowrap text-white dark:bg-zinc-50 dark:text-[#1c1c20] [&_svg]:size-[15px] ${FOCUS}`}
          />
        }
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
        New<span className="max-sm:hidden"> report</span>
      </Remold.Anchor>
    </header>
  );
}

function Kpis() {
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
              <span className="text-[11.5px] font-medium tabular-nums text-green-700 dark:text-green-400">
                {kpi.delta}
              </span>
            </span>
          </>
        );

        return index === 0 ? (
          <Remold.Anchor key={kpi.label} name="revenue" render={<div className={KPI} />}>
            {content}
          </Remold.Anchor>
        ) : (
          <div key={kpi.label} className={KPI}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart() {
  return (
    <figure className="m-0 grid min-h-0 grid-rows-[auto_1fr_auto] gap-2 border-t border-zinc-200/70 pt-3.5 dark:border-white/[0.07]">
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
          className="absolute size-2 -translate-1/2 rounded-full bg-zinc-900 shadow-[0_0_0_3px_white] dark:bg-zinc-50 dark:shadow-[0_0_0_3px_#1c1c20]"
          style={{ left: "calc(100% - 36px)", top: `${heightOf(WEEKS.at(-1)!)}%` }}
        />
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
    </figure>
  );
}

function Dashboard({ inert }: { inert: boolean }) {
  return (
    <div className="grid h-full grid-cols-[150px_1fr] max-sm:grid-cols-1" inert={inert || undefined}>
      <Sidebar />

      <main className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-3.5 px-[18px] pt-4 pb-[18px] max-sm:px-3.5">
        <DashboardHeader />
        <Kpis />
        <RevenueChart />
      </main>
    </div>
  );
}

function TipContent({
  step,
  titleId,
  bodyId,
  nextRef,
  onGo,
}: {
  step: number;
  titleId: string;
  bodyId: string;
  nextRef: RefObject<HTMLButtonElement | null>;
  onGo: (step: number) => void;
}) {
  const current = STEPS[step]!;

  return (
    <>
      <div className="flex items-center justify-between">
        <Remold.Text className="text-[11.5px] font-semibold tracking-[0.02em] text-(--pt-accent)">
          {`${step + 1} of ${STEPS.length}`}
        </Remold.Text>
        <button
          type="button"
          className={`-mt-1 -mr-1 grid size-6 place-items-center rounded-[7px] text-zinc-400 dark:text-zinc-500 [&_svg]:size-3.5 ${QUIET_BUTTON} ${FOCUS}`}
          aria-label="End tour"
          onClick={() => onGo(-1)}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <Remold.Text id={titleId} className="text-[15px] font-[650] tracking-[-0.015em]">
        {current.title}
      </Remold.Text>
      <Remold.Text id={bodyId} className="min-h-[3.9em] leading-[1.45] text-zinc-500 dark:text-zinc-400">
        {current.body}
      </Remold.Text>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="flex flex-1 gap-1" aria-hidden="true">
          {STEPS.map((entry, index) => (
            <span
              key={entry.target}
              className="h-1.5 w-1.5 rounded-[3px] bg-zinc-200 transition-[width,background-color] duration-[400ms,250ms] ease-(--pt-spring) data-done:bg-(--pt-accent)/45 data-on:w-[18px] data-on:bg-(--pt-accent) motion-reduce:transition-none dark:bg-[#2c2c31]"
              data-on={index === step || undefined}
              data-done={index < step || undefined}
            />
          ))}
        </span>

        {step > 0 && (
          <button
            type="button"
            className={`h-[30px] rounded-[9px] px-3 font-medium text-zinc-500 dark:text-zinc-400 ${QUIET_BUTTON} ${FOCUS}`}
            onClick={() => onGo(step - 1)}
          >
            Back
          </button>
        )}

        <button
          ref={nextRef}
          type="button"
          className={`h-[30px] rounded-[9px] bg-(--pt-accent) px-3 font-medium text-white ${FOCUS}`}
          onClick={() => onGo(step + 1)}
        >
          <Remold.Text>{step === LAST ? "Finish" : "Next"}</Remold.Text>
        </button>
      </div>
    </>
  );
}

export interface ProductTourProps {
  /** The step on screen, or -1 when the tour is folded away into the help button. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (step: number, details: ChangeDetails) => void;
  /** Moves focus onto Next as the tour opens, and back to the help button as it folds away. */
  moveFocus?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/** A product tour over a dashboard: a spotlight and a tip spring from one control to the next. */
export function ProductTour({
  value,
  defaultValue = -1,
  onValueChange,
  moveFocus = true,
  ref,
}: ProductTourProps) {
  const [step, setStep] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  const boxes = useTargetBoxes(root);

  const touring = step >= 0;
  const current = touring ? STEPS[step]! : null;
  const target = current && boxes?.of[current.target];
  const spot = spotlightAround(target, boxes?.bounds);
  const tip = current && target && boxes ? placeTip(target, current.side, boxes.bounds) : null;
  const facing = current ? FACING[current.side] : null;

  const wasTouring = useRef(touring);
  useEffect(() => {
    if (!moveFocus || wasTouring.current === touring) return;
    wasTouring.current = touring;
    (touring ? nextRef.current : helpRef.current)?.focus({ preventScroll: true });
  }, [touring, moveFocus]);

  const go = (to: number) => setStep(to > LAST ? -1 : Math.max(-1, to));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!touring) return;

    if (event.key === "ArrowRight") go(step + 1);
    else if (event.key === "ArrowLeft" && step > 0) go(step - 1);
    else if (event.key === "Escape") go(-1);
    else return;

    event.preventDefault();
  };

  return (
    <section ref={ref} className={ROOT} aria-label="Product tour demo">
      <Remold.Connectors
        ref={root}
        shape="curve"
        gap={6}
        className={STAGE}
        onKeyDown={onKeyDown}
        data-touring={touring || undefined}
      >
        <Dashboard inert={touring} />

        <div
          className={SPOTLIGHT}
          aria-hidden="true"
          style={{ transform: `translate(${spot.x}px, ${spot.y}px)`, width: spot.width, height: spot.height }}
        />

        <Remold.Morph
          trigger={[step, Math.round(tip?.x ?? 0), Math.round(tip?.y ?? 0)]}
          spring={SPRING}
          className="pointer-events-none absolute inset-0 z-4"
        >
          <Remold.Anchor
            name="tip"
            linkTo={current?.target ?? null}
            fromSide={facing?.from}
            toSide={facing?.to}
            pulse={step}
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
              <TipContent
                step={step}
                titleId={`${id}-title`}
                bodyId={`${id}-body`}
                nextRef={nextRef}
                onGo={go}
              />
            ) : (
              <button
                ref={helpRef}
                type="button"
                className={`inline-flex h-9 items-center gap-[7px] rounded-full bg-zinc-900 pr-3.5 pl-[11px] font-medium text-white dark:bg-zinc-50 dark:text-[#1c1c20] [&_svg]:size-[17px] ${FOCUS}`}
                onClick={() => go(0)}
              >
                <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={1.8} aria-hidden="true" />
                <span>Take the tour</span>
              </button>
            )}
          </Remold.Anchor>
        </Remold.Morph>
      </Remold.Connectors>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS = [
  { step: -1, ms: 1500 },
  { step: 0, ms: 2600 },
  { step: 1, ms: 2400 },
  { step: 2, ms: 2400 },
  { step: 3, ms: 2600 },
] as const;

const fromBeat = (index: number): number => BEATS[index]!.step;

interface ProductTourDemoProps {
  framed?: boolean;
  playing?: boolean;
}

export function ProductTourDemo({ framed = true, playing }: ProductTourDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);

  const element = (
    <ProductTour
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      moveFocus={!scene.live}
    />
  );

  return framed ? <Frame>{element}</Frame> : element;
}
