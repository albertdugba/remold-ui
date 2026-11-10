"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Remold } from "@remold-ui/react/canvas";
import { MotionConfig, motion } from "motion/react";
import { useMemo, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
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
export type UnitChartView = keyof typeof VIEWS;
type View = UnitChartView;
const COLORS = ["var(--uc-free)", "var(--uc-pro)", "var(--uc-team)"];
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.2 };

function bucket(index: number, salt: number, cuts: number[]) {
  const roll = Math.sin(index * 3 + salt) * 10000;
  return cuts.findIndex((cut) => (roll - Math.floor(roll)) * 100 < cut);
}

const CUSTOMERS = Array.from({ length: 240 }, (_, index) => ({
  plan: bucket(index, 1, [50, 82, 100]),
  region: bucket(index, 2, [34, 62, 86, 100]),
  channel: bucket(index, 3, [40, 64, 88, 100]),
}));

const FRAME = { width: 100, height: 42 };

function layout(view: View) {
  const slot = 100 / VIEWS[view].length;
  const seen = VIEWS[view].map(() => 0);
  const order = CUSTOMERS.map((customer, index) => ({ customer, index })).sort(
    (a, b) => b.customer.plan - a.customer.plan,
  );
  const points = new Array(CUSTOMERS.length);
  for (const { customer, index } of order) {
    const place = seen[customer[view]]++;
    points[index] = {
      x: (customer[view] + 0.5) * slot + ((place % COLS) - (COLS - 1) / 2) * GAP,
      y: 41 - Math.floor(place / COLS) * GAP,
      tone: customer.plan / 2,
    };
  }
  return points;
}

export interface UnitChartProps {
  /** How the customers are grouped. */
  value?: UnitChartView;
  defaultValue?: UnitChartView;
  onValueChange?: (view: UnitChartView) => void;
  ref?: Ref<HTMLElement>;
}

export function UnitChart({ value, defaultValue = "plan", onValueChange, ref }: UnitChartProps) {
  const [view, setView] = useControllableState({ value, defaultValue, onValueChange });
  const points = useMemo(() => layout(view), [view]);
  const groups = VIEWS[view];

  return (
    <MotionConfig reducedMotion="user">
      <section ref={ref} className="uc not-prose" aria-label="Customers">
        <header className="uc-head">
          <div>
            <span role="heading" aria-level={3} className="uc-title">
              Customers
            </span>
            <span className="uc-sub">6,000 in total · 1 dot = {PER_DOT}</span>
          </div>
          <ToggleGroup
            className="uc-views"
            aria-label="Group by"
            value={[view]}
            onValueChange={(values) => values[0] && setView(values[0] as View)}
          >
            <motion.span
              className="uc-thumb"
              initial={false}
              animate={{ x: `${Object.keys(VIEWS).indexOf(view) * 100}%` }}
              transition={POP}
            />
            {(Object.keys(VIEWS) as View[]).map((option) => (
              <Toggle key={option} value={option} className="uc-view">
                {option[0]!.toUpperCase() + option.slice(1)}
              </Toggle>
            ))}
          </ToggleGroup>
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
          {groups.map((name, group) => (
            <li key={`${view}-${name}`}>
              <span>{name}</span>
              <Odometer
                value={(
                  CUSTOMERS.filter((customer) => customer[view] === group).length * PER_DOT
                ).toLocaleString("en-GB")}
              />
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

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS = [
  { view: "plan" as View, ms: 2200 },
  { view: "region" as View, ms: 2400 },
  { view: "channel" as View, ms: 2400 },
];

const fromBeat = (step: number) => BEATS[step]!.view;

export function UnitChartDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <UnitChart ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
