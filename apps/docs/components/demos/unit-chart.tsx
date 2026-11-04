"use client";

import { Remold } from "@remold-ui/react";
import { MotionConfig, motion } from "motion/react";
import { useMemo } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./unit-chart.css";

const PER_DOT = 25;
const GAP = 2.4;
const COLS = 8;
const PLANS = ["Free", "Pro", "Team"];
const VIEWS = {
  plan: PLANS,
  region: ["Europe", "Americas", "Asia-Pacific", "Africa"],
  channel: ["Search", "Referral", "Social", "Partners"],
};
type View = keyof typeof VIEWS;
const COLORS = ["var(--uc-free)", "var(--uc-pro)", "var(--uc-team)"];
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.2 };

/** Which share a customer falls in, from a fixed pseudo-random roll, so the made-up data is the same every time. */
function bucket(i: number, salt: number, cuts: number[]) {
  const x = Math.sin(i * 3 + salt) * 10000;
  return cuts.findIndex((cut) => (x - Math.floor(x)) * 100 < cut);
}

/** 240 made-up customers, each one dot. Every grouping lays out this same list, so dot `i` is always customer `i`. */
const CUSTOMERS = Array.from({ length: 240 }, (_, index) => ({
  plan: bucket(index, 1, [50, 82, 100]),
  region: bucket(index, 2, [34, 62, 86, 100]),
  channel: bucket(index, 3, [40, 64, 88, 100]),
}));

/** The chart's frame. Fitting it, rather than each layout's bounds, keeps columns growing in place. */
const FRAME = { width: 100, height: 42 };

/** Each group is a column stacked from the bottom, plans in bands, centred in an equal share of the width. */
function layout(view: View) {
  const slot = 100 / VIEWS[view].length;
  const seen = VIEWS[view].map(() => 0);
  const order = CUSTOMERS.map((c, index) => ({ c, i: index })).sort((a, b) => b.c.plan - a.c.plan);
  const points = new Array(CUSTOMERS.length);
  for (const { c, i } of order) {
    const k = seen[c[view]]++;
    points[i] = { x: (c[view] + 0.5) * slot + ((k % COLS) - (COLS - 1) / 2) * GAP, y: 41 - Math.floor(k / COLS) * GAP, tone: c.plan / 2 };
  }
  return points;
}

const BEATS = [
  { view: "plan" as View, ms: 2200 },
  { view: "region" as View, ms: 2400 },
  { view: "channel" as View, ms: 2400 },
];

const fromBeat = (step: number) => BEATS[step]!.view;

export function UnitChartDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state: view, take } = scene;
  const points = useMemo(() => layout(view), [view]);
  const groups = VIEWS[view];

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={scene.ref}
        className="uc not-prose"
        aria-label="Customers"
      >
        <header className="uc-head">
          <div>
            <span role="heading" aria-level={3} className="uc-title">
              Customers
            </span>
            <span className="uc-sub">6,000 in total · 1 dot = {PER_DOT}</span>
          </div>
          <div className="uc-views" role="radiogroup" aria-label="Group by">
            <motion.span className="uc-thumb" initial={false} animate={{ x: `${Object.keys(VIEWS).indexOf(view) * 100}%` }} transition={POP} />
            {(Object.keys(VIEWS) as View[]).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} className="uc-view" onClick={() => take(v)}>
                {v[0]!.toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <div className="uc-stage">
          <Remold.Particles
            className="uc-canvas"
            shape={{ points }}
            palette={COLORS}
            radius={2.6}
            fit={FRAME}
            padding={0}
            pointer={false}
            pairing="index"
            label={`Customers by ${view}`}
          />
        </div>

        <ol className="uc-groups" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
          {groups.map((name, g) => (
            <li key={`${view}-${name}`}>
              <span>{name}</span>
              <Odometer value={(CUSTOMERS.filter((c) => c[view] === g).length * PER_DOT).toLocaleString("en-GB")} />
            </li>
          ))}
        </ol>

        <div className="uc-legend">
          {PLANS.map((plan, index) => (
            <span key={plan} data-plan={index}>
              {plan}
            </span>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
