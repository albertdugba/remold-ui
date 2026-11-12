"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Remold } from "@remold-ui/react/canvas";
import { MotionConfig, motion } from "motion/react";
import { useMemo, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

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
      <section
        ref={ref}
        className="not-prose grid w-[min(100%,440px)] gap-5 rounded-3xl bg-(--uc-surface) p-7 font-sans text-(--uc-ink) [--uc-free:#a5b4fc] [--uc-ink:#18181b] [--uc-muted:#71717a] [--uc-pro:#4f46e5] [--uc-soft:#f4f4f5] [--uc-surface:#ffffff] [--uc-team:#db2777] dark:[--uc-free:#4c4f8f] dark:[--uc-ink:#fafafa] dark:[--uc-muted:#a1a1aa] dark:[--uc-pro:#818cf8] dark:[--uc-soft:#27272a] dark:[--uc-surface:#1c1c1f] dark:[--uc-team:#f472b6]"
        aria-label="Customers"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <span role="heading" aria-level={3} className="block text-[16px] font-semibold tracking-[-0.015em]">
              Customers
            </span>
            <span className="text-[13px] whitespace-nowrap text-(--uc-muted)">6,000 in total · 1 dot = {PER_DOT}</span>
          </div>
          <ToggleGroup
            className="relative grid grid-cols-3 rounded-xl bg-(--uc-soft) p-[3px]"
            aria-label="Group by"
            value={[view]}
            onValueChange={(values) => values[0] && setView(values[0] as View)}
          >
            <motion.span
              className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-[9px] bg-(--uc-surface) shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
              initial={false}
              animate={{ x: `${Object.keys(VIEWS).indexOf(view) * 100}%` }}
              transition={POP}
            />
            {(Object.keys(VIEWS) as View[]).map((option) => (
              <Toggle
                key={option}
                value={option}
                className="relative h-[30px] cursor-pointer border-0 bg-transparent px-2.5 text-[13px] font-[550] text-(--uc-muted) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--uc-pro) data-pressed:text-(--uc-ink)"
              >
                {option[0]!.toUpperCase() + option.slice(1)}
              </Toggle>
            ))}
          </ToggleGroup>
        </header>

        <div className="aspect-[100/42]">
          <Remold.Particles
            className="block size-full"
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

        <ol
          className="m-0 -mt-2 grid list-none p-0 [&>li]:grid [&>li]:justify-items-center [&>li]:gap-0.5 [&>li]:text-[15px] [&>li]:font-semibold [&>li]:tabular-nums [&>li>span:first-child]:text-[12px] [&>li>span:first-child]:font-normal [&>li>span:first-child]:text-(--uc-muted)"
          style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
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

        <div className="flex gap-4 border-t border-solid border-(--uc-soft) pt-4 text-[13px]">
          {PLANS.map((plan, index) => (
            <span
              key={plan}
              data-plan={index}
              className="before:mr-1.5 before:inline-block before:size-2 before:rounded-full before:bg-(--uc-free) before:content-[''] data-[plan=1]:before:bg-(--uc-pro) data-[plan=2]:before:bg-(--uc-team)"
            >
              {plan}
            </span>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}

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
