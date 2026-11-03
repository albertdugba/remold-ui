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
import "./product-tour.css";

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

const fromBeat = (i: number): State => ({ step: BEATS[i]!.step });

/** The tip's size, so it can be placed beside its target before it's drawn. */
const TIP = { width: 260, height: 172 };
/** Space between a target and its tip, and between the tip and the window's edge. */
const GAP = 30;
const EDGE = 12;
/** How far the spotlight reaches past its target. */
const PAD = 6;
const SPRING = { duration: 0.6, bounce: 0.14 };

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

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!touring) return;
    if (e.key === "ArrowRight") go(step + 1);
    else if (e.key === "ArrowLeft" && step > 0) go(step - 1);
    else if (e.key === "Escape") go(-1);
    else return;
    e.preventDefault();
  };

  const target = current && boxes?.of[current.target];
  const spot = target
    ? { x: target.x - PAD, y: target.y - PAD, width: target.width + PAD * 2, height: target.height + PAD * 2 }
    : // Folded away: the spotlight opens wide past every edge, so nothing is dimmed.
      { x: -40, y: -40, width: (boxes?.bounds.width ?? 640) + 80, height: (boxes?.bounds.height ?? 420) + 80 };
  const tip = current && target && boxes ? place(target, current.side, boxes.bounds) : null;
  const facing = current ? FACING[current.side] : null;

  const body = (
    <section ref={ref} className="pt" aria-label="Product tour demo">
      <Remold.Connectors shape="curve" gap={6} className="pt-window" ref={root} onKeyDown={onKeyDown} data-touring={touring || undefined}>
        {/* The app being toured. */}
        <div className="pt-app" inert={touring || undefined}>
          <aside className="pt-side">
            <span className="pt-brand">
              <span className="pt-logo" aria-hidden="true" />
              Orbit
            </span>
            {[
              { icon: DashboardSquare01Icon, label: "Overview", on: true },
              { icon: Analytics01Icon, label: "Reports" },
              { icon: UserGroupIcon, label: "Customers" },
              { icon: Settings01Icon, label: "Settings" },
            ].map((item) => (
              <span key={item.label} className="pt-nav" data-on={item.on || undefined}>
                <HugeiconsIcon icon={item.icon} strokeWidth={1.7} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </aside>

          <main className="pt-main">
            <header className="pt-top">
              <h3>Overview</h3>
              <Remold.Anchor name="search" render={<label className="pt-search" />}>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} aria-hidden="true" />
                <span>Search…</span>
                <kbd>/</kbd>
              </Remold.Anchor>
              <Remold.Anchor name="share" render={<button type="button" className="pt-ghost" />}>
                <HugeiconsIcon icon={Share08Icon} strokeWidth={1.8} aria-hidden="true" />
                Share
              </Remold.Anchor>
              <Remold.Anchor name="new" render={<button type="button" className="pt-primary" />}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} aria-hidden="true" />
                New report
              </Remold.Anchor>
            </header>

            <div className="pt-kpis">
              {[
                { label: "Revenue", value: "$48.2k", delta: "+12.4%" },
                { label: "Active users", value: "3,120", delta: "+4.1%" },
                { label: "Churn", value: "1.8%", delta: "−0.3%" },
              ].map((kpi, i) => {
                const parts = (
                  <>
                    <span className="pt-kpi-label">{kpi.label}</span>
                    <span className="pt-kpi-value">{kpi.value}</span>
                    <span className="pt-kpi-delta">{kpi.delta}</span>
                  </>
                );
                // The first card is a tour target.
                return i === 0 ? (
                  <Remold.Anchor key={kpi.label} name="revenue" render={<div className="pt-kpi" />}>
                    {parts}
                  </Remold.Anchor>
                ) : (
                  <div key={kpi.label} className="pt-kpi">
                    {parts}
                  </div>
                );
              })}
            </div>

            <figure className="pt-chart">
              <figcaption>
                <span>Revenue, last 12 weeks</span>
                <span className="pt-chart-total">$412,900</span>
              </figcaption>
              <span className="pt-bars" aria-hidden="true">
                {WEEKS.map((week, i) => (
                  <span key={i} style={{ height: `${(week / PEAK) * 100}%` }} data-now={i === WEEKS.length - 1 || undefined} />
                ))}
              </span>
            </figure>
          </main>
        </div>

        {/* The spotlight: a window cut in a dimmed sheet, springing from one target to the next. */}
        <div
          className="pt-spot"
          aria-hidden="true"
          style={{ transform: `translate(${spot.x}px, ${spot.y}px)`, width: spot.width, height: spot.height }}
        />

        {/* The tip and the help button are one element: it grows out of the corner into the tip, and folds back. */}
        <Remold.Layout trigger={[step, Math.round(tip?.x ?? 0), Math.round(tip?.y ?? 0)]} spring={SPRING} className="pt-layer">
          <Remold.Anchor
            name="tip"
            linkTo={current?.target ?? null}
            fromSide={facing?.from}
            toSide={facing?.to}
            pulse={step}
            render={
              <div
                className="pt-shell"
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
                <div className="pt-tip-head">
                  <Remold.Text className="pt-count">{`${step + 1} of ${STEPS.length}`}</Remold.Text>
                  <button type="button" className="pt-close" aria-label="End tour" onClick={() => go(-1)}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
                <Remold.Text id={`${id}-title`} className="pt-title">
                  {current.title}
                </Remold.Text>
                <Remold.Text id={`${id}-body`} className="pt-body">
                  {current.body}
                </Remold.Text>
                <div className="pt-tip-foot">
                  <span className="pt-dots" aria-hidden="true">
                    {STEPS.map((s, i) => (
                      <span key={s.target} data-on={i === step || undefined} data-done={i < step || undefined} />
                    ))}
                  </span>
                  {step > 0 && (
                    <button type="button" className="pt-back" onClick={() => go(step - 1)}>
                      Back
                    </button>
                  )}
                  <button ref={next} type="button" className="pt-next" onClick={() => go(step + 1)}>
                    <Remold.Text>{step === LAST ? "Finish" : "Next"}</Remold.Text>
                  </button>
                </div>
              </>
            ) : (
              <button ref={help} type="button" className="pt-help" onClick={() => go(0)}>
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
