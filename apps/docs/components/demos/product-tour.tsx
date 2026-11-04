"use client";

import { HugeiconsIcon } from "@hugeicons/react";
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
import { Remold } from "@remold-ui/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";

/*
 * A product tour over a small analytics app. A spotlight dims the app and cuts out one control at
 * a time, springing from each to the next; a line runs from the control to the tip that explains
 * it. The tip is the help button itself: it grows out of the corner when the tour starts and
 * folds back into it at the end.
 */

type Target = "new" | "search" | "revenue" | "share";
type Side = "top" | "right" | "bottom" | "left";

interface Step {
  target: Target;
  title: string;
  body: string;
  /** Which side of the target the tip sits on. */
  side: Side;
}

const STEPS: Step[] = [
  { target: "new", title: "Start with a report", body: "Pick a template or start blank. Reports refresh on their own as new data comes in.", side: "bottom" },
  { target: "search", title: "Find anything", body: "Search reports, customers and settings from one place. Press / from anywhere.", side: "bottom" },
  { target: "revenue", title: "Your numbers at a glance", body: "Each card compares with last month. Open one to see what moved it, day by day.", side: "bottom" },
  { target: "share", title: "Bring your team", body: "Invite people to view or edit. Everyone sees the same numbers, live.", side: "left" },
];
const LAST = STEPS.length - 1;

interface State {
  /** The step on screen, or -1 when the tour is folded away into the help button. */
  step: number;
}

const BEATS = [
  { step: -1, ms: 1500 },
  { step: 0, ms: 2600 },
  { step: 1, ms: 2400 },
  { step: 2, ms: 2400 },
  { step: 3, ms: 2600 },
] as const;

const fromBeat = (index: number): State => ({ step: BEATS[index]!.step });

/** The tip's size, so it can be placed beside its target before it's drawn. */
const TIP = { width: 260, height: 172 };
/** Space between a target and its tip, and between the tip and the window's edge. */
const GAP = 30;
const EDGE = 12;
/** How far the spotlight reaches past its target. */
const PAD = 6;
const SPRING = { duration: 0.6, bounce: 0.14 };

/** Keyboard focus on any control in the demo: a ring in the accent. */
const FOCUS = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pt-accent)";
/** A metric card in the app. */
const KPI = "grid gap-0.5 rounded-xl px-3 py-[11px] shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]";

type Box = { x: number; y: number; width: number; height: number };

/** Where the tip goes: on the step's side of the target, kept inside the window. */
function place(target: Box, side: Side, bounds: { width: number; height: number }): { x: number; y: number } {
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;
  const spot = {
    top: { x: cx - TIP.width / 2, y: target.y - PAD - GAP - TIP.height },
    bottom: { x: cx - TIP.width / 2, y: target.y + target.height + PAD + GAP },
    left: { x: target.x - PAD - GAP - TIP.width, y: cy - TIP.height / 2 },
    right: { x: target.x + target.width + PAD + GAP, y: cy - TIP.height / 2 },
  }[side];
  const clamp = (v: number, max: number) => Math.max(EDGE, Math.min(max - EDGE, v));
  return { x: clamp(spot.x, bounds.width - TIP.width), y: clamp(spot.y, bounds.height - TIP.height) };
}

/** The side of the target a line leaves from, and the side of the tip it arrives at. */
const FACING: Record<Side, { from: Side; to: Side }> = {
  top: { from: "top", to: "bottom" },
  bottom: { from: "bottom", to: "top" },
  left: { from: "left", to: "right" },
  right: { from: "right", to: "left" },
};

/** Weekly revenue for the chart, as a share of the tallest week. */
const WEEKS = [38, 44, 41, 52, 49, 58, 55, 63, 61, 72, 69, 80];
const PEAK = Math.max(...WEEKS);

interface ProductTourDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function ProductTourDemo({ framed = true, playing }: ProductTourDemoProps) {
  const { ref, state, take, live } = useScene(BEATS, fromBeat, playing);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const help = useRef<HTMLButtonElement>(null);
  const [boxes, setBoxes] = useState<{ bounds: { width: number; height: number }; of: Partial<Record<Target, Box>> } | null>(null);

  // Measure every target against the window once, and again whenever the window resizes, so each
  // step's spotlight and tip can be placed in the same render that changes the step.
  const measure = useCallback(() => {
    const frame = root.current;
    if (!frame) return;
    const origin = frame.getBoundingClientRect();
    const of: Partial<Record<Target, Box>> = {};
    // The targets are the anchors the tip's line can run to: every one but the tip itself.
    for (const el of frame.querySelectorAll<HTMLElement>("[data-rm-anchor]")) {
      const name = el.dataset.rmAnchor as Target | "tip";
      if (name === "tip") continue;
      const r = el.getBoundingClientRect();
      of[name] = { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
    }
    setBoxes({ bounds: { width: origin.width, height: origin.height }, of });
  }, []);

  useLayoutEffect(() => {
    measure();
    const frame = root.current;
    if (!frame || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measure]);

  const { step } = state;
  const touring = step >= 0;
  const current = touring ? STEPS[step]! : null;

  // Focus follows the tour: onto Next as it opens, back to the help button as it folds away.
  const wasTouring = useRef(touring);
  useEffect(() => {
    if (live || wasTouring.current === touring) return;
    wasTouring.current = touring;
    (touring ? next.current : help.current)?.focus({ preventScroll: true });
  }, [touring, live]);

  const go = (to: number) => take({ step: to > LAST ? -1 : Math.max(-1, to) });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!touring) return;
    if (event.key === "ArrowRight") go(step + 1);
    else if (event.key === "ArrowLeft" && step > 0) go(step - 1);
    else if (event.key === "Escape") go(-1);
    else return;
    event.preventDefault();
  };

  const target = current && boxes?.of[current.target];
  const spot = target
    ? { x: target.x - PAD, y: target.y - PAD, width: target.width + PAD * 2, height: target.height + PAD * 2 }
    : // Folded away: the spotlight opens wide past every edge, so nothing is dimmed.
      { x: -40, y: -40, width: (boxes?.bounds.width ?? 640) + 80, height: (boxes?.bounds.height ?? 420) + 80 };
  const tip = current && target && boxes ? place(target, current.side, boxes.bounds) : null;
  const facing = current ? FACING[current.side] : null;

  const body = (
    <section
      ref={ref}
      // The accent, the spring the spotlight moves on, and the dim round it, shared by the parts below.
      className="w-[680px] max-w-full font-sans text-[13px] text-zinc-900 [--pt-accent:#6d4aff] [--pt-dim:rgb(14_12_28/0.52)] [--pt-spring:linear(0,0.18_6%,0.56_14%,0.86_22%,1.02_31%,1.06_38%,1.04_46%,1.005_58%,0.997_70%,1)] dark:text-zinc-50 dark:[--pt-accent:#a48bff] dark:[--pt-dim:rgb(0_0_0/0.6)]"
      aria-label="Product tour demo"
    >
      <Remold.Connectors
        shape="curve"
        gap={6}
        // The app window. The line from a target to its tip is drawn over the dim, as a white dotted lead.
        className="group/tour relative isolate h-[430px] overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1px_rgb(24_24_27/0.08),0_24px_60px_-20px_rgb(24_24_27/0.22)] dark:bg-[#1c1c20] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_24px_60px_-20px_rgb(24_24_27/0.22)] [&_.rm-connector]:stroke-white/75 [&_.rm-connector]:[stroke-dasharray:2_4] [&_.rm-connector]:[stroke-linecap:round] [&_.rm-connector]:[stroke-width:1.5] [&>svg]:z-3 [&>svg]:text-white"
        ref={root}
        onKeyDown={onKeyDown}
        data-touring={touring || undefined}
      >
        {/* The app being toured. */}
        <div className="grid h-full grid-cols-[150px_1fr]" inert={touring || undefined}>
          <aside className="grid content-start gap-0.5 bg-zinc-50 px-2.5 py-4 shadow-[1px_0_0_rgb(24_24_27/0.08)] dark:bg-[#232327] dark:shadow-[1px_0_0_rgb(255_255_255/0.08)]">
            <span className="flex items-center gap-2 px-2 pb-3.5 text-[14px] font-[650] tracking-[-0.01em]">
              <span className="size-[18px] rounded-md bg-[conic-gradient(from_210deg,#6d4aff,#c084fc,#f472b6,#6d4aff)]" aria-hidden="true" />
              Orbit
            </span>
            {[
              { icon: DashboardSquare01Icon, label: "Overview", on: true },
              { icon: Analytics01Icon, label: "Reports" },
              { icon: UserGroupIcon, label: "Customers" },
              { icon: Settings01Icon, label: "Settings" },
            ].map((item) => (
              <span
                key={item.label}
                className="flex h-8 items-center gap-[9px] rounded-lg px-2 text-zinc-500 data-on:bg-white data-on:font-medium data-on:text-zinc-900 data-on:shadow-[0_0_0_1px_rgb(24_24_27/0.08),0_1px_2px_rgb(24_24_27/0.05)] dark:text-zinc-400 dark:data-on:bg-[#1c1c20] dark:data-on:text-zinc-50 dark:data-on:shadow-[0_0_0_1px_rgb(255_255_255/0.08)] [&_svg]:size-4"
                data-on={item.on || undefined}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={1.7} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </aside>

          <main className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-3.5 px-[18px] pt-4 pb-[18px]">
            <header className="flex items-center gap-2">
              <h3 className="m-0 flex-1 text-[16px] font-[650] tracking-[-0.015em]">Overview</h3>
              <Remold.Anchor name="search" render={<label className="flex h-8 w-[150px] items-center gap-[7px] rounded-[9px] bg-zinc-100 pr-1.5 pl-2.5 text-zinc-400 dark:bg-[#2c2c31] dark:text-zinc-500 [&_svg]:size-[15px]" />}
              >
                <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} aria-hidden="true" />
                <span className="flex-1">Search…</span>
                <kbd className="rounded-[5px] bg-white px-1.5 py-px font-mono text-[11px] leading-[1.4] shadow-[0_0_0_1px_rgb(24_24_27/0.08)] dark:bg-[#1c1c20] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">/</kbd>
              </Remold.Anchor>
              <Remold.Anchor name="share" render={
                  <button
                    type="button"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 font-medium whitespace-nowrap shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] [&_svg]:size-[15px] ${FOCUS}`}
                  />
                }
              >
                <HugeiconsIcon icon={Share08Icon} strokeWidth={1.8} aria-hidden="true" />
                Share
              </Remold.Anchor>
              <Remold.Anchor name="new" render={
                  <button
                    type="button"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-zinc-900 px-3 font-medium whitespace-nowrap text-white dark:bg-zinc-50 dark:text-[#1c1c20] [&_svg]:size-[15px] ${FOCUS}`}
                  />
                }
              >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
                New report
              </Remold.Anchor>
            </header>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Revenue", value: "$48.2k", delta: "+12.4%" },
                { label: "Active users", value: "3,120", delta: "+4.1%" },
                { label: "Churn", value: "1.8%", delta: "−0.3%" },
              ].map((kpi, index) => {
                const parts = (
                  <>
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
                    <span className="text-[18px] font-[650] tracking-[-0.02em] tabular-nums">{kpi.value}</span>
                    <span className="text-[11.5px] font-medium text-green-700 dark:text-green-400">{kpi.delta}</span>
                  </>
                );
                // The first card is a tour target.
                return index === 0 ? (
                  <Remold.Anchor key={kpi.label} name="revenue" render={<div className={KPI} />}>
                    {parts}
                  </Remold.Anchor>
                ) : (
                  <div key={kpi.label} className={KPI}>
                    {parts}
                  </div>
                );
              })}
            </div>

            <figure className="m-0 grid min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-xl px-3 pt-3 text-(--pt-accent) shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
              <figcaption className="flex justify-between text-[12px] text-zinc-500 dark:text-zinc-400">
                <span>Revenue, last 12 weeks</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">$412,900</span>
              </figcaption>
              {/* Twelve weeks as bars, this week in full colour. */}
              <span className="flex min-h-0 items-end gap-1.5 py-3" aria-hidden="true">
                {WEEKS.map((week, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-[5px_5px_2px_2px] bg-current/22 data-now:bg-current"
                    style={{ height: `${(week / PEAK) * 100}%` }}
                    data-now={index === WEEKS.length - 1 || undefined}
                  />
                ))}
              </span>
            </figure>
          </main>
        </div>

        {/* The spotlight: a window cut in a dimmed sheet, springing from one target to the next. */}
        <div
          className="pointer-events-none absolute top-0 left-0 z-2 rounded-[14px] opacity-0 shadow-[0_0_0_1.5px_rgb(255_255_255/0.9),0_0_0_6px_rgb(109_74_255/0.28),0_0_0_200vmax_var(--pt-dim)] transition-[transform,width,height,opacity] duration-[620ms,620ms,620ms,300ms] ease-[var(--pt-spring),var(--pt-spring),var(--pt-spring),ease] group-data-touring/tour:opacity-100 motion-reduce:transition-opacity motion-reduce:duration-200 motion-reduce:ease-[ease]"
          aria-hidden="true"
          style={{ transform: `translate(${spot.x}px, ${spot.y}px)`, width: spot.width, height: spot.height }}
        />

        {/* The tip and the help button are one element: it grows out of the corner into the tip, and folds back. */}
        <Remold.Layout trigger={[step, Math.round(tip?.x ?? 0), Math.round(tip?.y ?? 0)]} spring={SPRING} className="pointer-events-none absolute inset-0 z-4">
          <Remold.Anchor
            name="tip"
            linkTo={current?.target ?? null}
            fromSide={facing?.from}
            toSide={facing?.to}
            pulse={step}
            render={
              <div
                className="pointer-events-auto absolute right-3.5 bottom-3.5 data-open:right-auto data-open:bottom-auto data-open:grid data-open:gap-1.5 data-open:rounded-2xl data-open:bg-white data-open:px-3.5 data-open:pt-3.5 data-open:pb-3 data-open:shadow-[0_0_0_1px_rgb(24_24_27/0.08),0_18px_40px_-12px_rgb(14_12_28/0.4)] dark:data-open:bg-[#1c1c20] dark:data-open:shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_18px_40px_-12px_rgb(14_12_28/0.4)]"
                data-open={touring || undefined}
                role={touring ? "dialog" : undefined}
                aria-labelledby={touring ? `${id}-title` : undefined}
                aria-describedby={touring ? `${id}-body` : undefined}
                style={tip ? { left: tip.x, top: tip.y, width: TIP.width } : undefined}
              />
            }
          >
            {current ? (
              <>
                <div className="flex items-center justify-between">
                  <Remold.Text className="text-[11.5px] font-semibold tracking-[0.02em] text-(--pt-accent)">{`${step + 1} of ${STEPS.length}`}</Remold.Text>
                  <button
                    type="button"
                    className={`-mt-1 -mr-1 grid size-6 place-items-center rounded-[7px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-[#2c2c31] dark:hover:text-zinc-50 [&_svg]:size-3.5 ${FOCUS}`}
                    aria-label="End tour" onClick={() => go(-1)}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
                <Remold.Text id={`${id}-title`} className="text-[15px] font-[650] tracking-[-0.015em]">
                  {current.title}
                </Remold.Text>
                <Remold.Text id={`${id}-body`} className="min-h-[3.9em] leading-[1.45] text-zinc-500 dark:text-zinc-400">
                  {current.body}
                </Remold.Text>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {/* Progress: the current step stretches into a bar, the ones done stay filled. */}
                  <span className="flex flex-1 gap-1" aria-hidden="true">
                    {STEPS.map((entry, index) => (
                      <span
                        key={entry.target}
                        className="h-1.5 w-1.5 rounded-[3px] bg-zinc-100 shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] transition-[width,background-color] duration-[400ms,250ms] ease-(--pt-spring) data-done:bg-(--pt-accent)/45 data-done:shadow-none data-on:w-[18px] data-on:bg-(--pt-accent) data-on:shadow-none motion-reduce:transition-none dark:bg-[#2c2c31] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
                        data-on={index === step || undefined}
                        data-done={index < step || undefined}
                      />
                    ))}
                  </span>
                  {step > 0 && (
                    <button
                      type="button"
                      className={`h-[30px] rounded-[9px] px-3 font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-[#2c2c31] dark:hover:text-zinc-50 ${FOCUS}`}
                      onClick={() => go(step - 1)}>
                      Back
                    </button>
                  )}
                  <button
                    ref={next}
                    type="button"
                    className={`h-[30px] rounded-[9px] bg-(--pt-accent) px-3 font-medium text-white ${FOCUS}`}
                    onClick={() => go(step + 1)}>
                    <Remold.Text>{step === LAST ? "Finish" : "Next"}</Remold.Text>
                  </button>
                </div>
              </>
            ) : (
              <button
                ref={help}
                type="button"
                className={`inline-flex h-9 items-center gap-[7px] rounded-full bg-zinc-900 pr-3.5 pl-[11px] font-medium text-white shadow-[0_8px_20px_-6px_rgb(14_12_28/0.45)] dark:bg-zinc-50 dark:text-[#1c1c20] [&_svg]:size-[17px] ${FOCUS}`}
                onClick={() => go(0)}>
                <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={1.8} aria-hidden="true" />
                <span>Take the tour</span>
              </button>
            )}
          </Remold.Anchor>
        </Remold.Layout>
      </Remold.Connectors>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
