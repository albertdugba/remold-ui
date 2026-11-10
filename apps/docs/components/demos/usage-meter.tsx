"use client";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  DatabaseIcon,
  FlashIcon,
  GlobeIcon,
  InformationCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Meter } from "@base-ui/react/meter";
import { Tooltip } from "@base-ui/react/tooltip";
import { AnimatePresence, motion } from "motion/react";
import { Odometer } from "./odometer";
import type { Ref } from "react";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./usage-meter.css";
import { usePortalContainer } from "./portal-container";

type Plan = "pro" | "scale";

const PLANS: Record<Plan, { name: string; price: number; limits: Record<Metric, number> }> = {
  pro: { name: "Pro", price: 49, limits: { api: 100_000, storage: 10, seats: 5, bandwidth: 100 } },
  scale: { name: "Scale", price: 199, limits: { api: 500_000, storage: 50, seats: 20, bandwidth: 1000 } },
};

type Metric = "api" | "storage" | "seats" | "bandwidth";

const METRICS: { id: Metric; label: string; unit: string; icon: IconSvgElement; tip: string }[] = [
  {
    id: "api",
    label: "API requests",
    unit: "",
    icon: FlashIcon,
    tip: "Over the limit, requests cost $2 per 1,000.",
  },
  {
    id: "bandwidth",
    label: "Bandwidth",
    unit: " GB",
    icon: GlobeIcon,
    tip: "Data served from the edge this month.",
  },
  {
    id: "storage",
    label: "Storage",
    unit: " GB",
    icon: DatabaseIcon,
    tip: "Files, images and database backups.",
  },
  {
    id: "seats",
    label: "Seats",
    unit: "",
    icon: UserGroupIcon,
    tip: "People in your workspace, invited or active.",
  },
];

const DAYS = 31;
const usedBy = (day: number): Record<Metric, number> => ({
  api: day * 3600,
  bandwidth: Math.round(day * 2.1),
  storage: Math.round((4.2 + day * 0.1) * 10) / 10,
  seats: 4,
});
const OVERAGE = 2 / 1000;

const tone = (ratio: number) => (ratio >= 1 ? "over" : ratio >= 0.85 ? "low" : undefined);
const format = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

export interface UsageMeterValue {
  day: number;
  plan: Plan;
}

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.15 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.35 };

export interface UsageMeterProps {
  /** The day of the month and the plan. */
  value?: UsageMeterValue;
  defaultValue?: UsageMeterValue;
  onValueChange?: (value: UsageMeterValue) => void;
  ref?: Ref<HTMLElement>;
}

/** A usage meter for the month so far: API calls and seats against the plan, with a projection and an upgrade. */
export function UsageMeter({
  value,
  defaultValue = { day: 16, plan: "pro" },
  onValueChange,
  ref,
}: UsageMeterProps) {
  const [usage, setUsage] = useControllableState({ value, defaultValue, onValueChange });
  const portal = usePortalContainer();

  const plan = PLANS[usage.plan];
  const used = usedBy(usage.day);
  const projectedApi = Math.round((used.api / usage.day) * DAYS);
  const overage = Math.max(0, projectedApi - plan.limits.api) * OVERAGE;
  const bill = plan.price + overage;
  const over = used.api >= plan.limits.api;
  const upgraded = usage.plan === "scale";

  return (
    <Tooltip.Provider delay={250}>
      <section ref={ref} className="um um-layer not-prose" aria-label="Usage this month">
        <header className="um-head">
          <span className="um-title">
            <b>Usage</b>
            <span className="um-plan" data-plan={usage.plan}>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={plan.name}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={POP}
                >
                  {plan.name}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
          <span className="um-cycle">
            Resets in <Odometer value={String(DAYS - usage.day)} /> days
          </span>
        </header>
        <div className="um-month" aria-hidden="true">
          <motion.span initial={false} animate={{ scaleX: usage.day / DAYS }} transition={SPRING} />
        </div>

        <ul className="um-rows">
          {METRICS.map(({ id, label, unit, icon: Icon, tip }) => {
            const limit = plan.limits[id];
            const value = used[id];
            const ratio = value / limit;
            const status = tone(ratio);
            return (
              <li key={id} className="um-row" data-tone={status}>
                <Meter.Root
                  value={Math.min(value, limit)}
                  max={limit}
                  className="um-meter"
                  getAriaValueText={() => `${format(value)}${unit} of ${format(limit)}${unit}`}
                >
                  <div className="um-row-top">
                    <Meter.Label className="um-label">
                      <HugeiconsIcon icon={Icon} aria-hidden="true" />
                      {label}
                    </Meter.Label>
                    <Tooltip.Root>
                      <Tooltip.Trigger className="um-info" aria-label={`About ${label}`}>
                        <HugeiconsIcon icon={InformationCircleIcon} aria-hidden="true" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={portal}>
                        <Tooltip.Positioner className="um-layer" sideOffset={6}>
                          <Tooltip.Popup className="um-tip">{tip}</Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    <AnimatePresence initial={false}>
                      {status && (
                        <motion.span
                          key={status}
                          className="um-flag"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                          transition={POP}
                        >
                          {status === "over" ? "Over limit" : "Running low"}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="um-value">
                      <Odometer value={format(value)} />
                      <span className="um-of">
                        {unit} / {format(limit)}
                        {unit}
                      </span>
                    </span>
                  </div>
                  <Meter.Track className="um-track">
                    <Meter.Indicator className="um-fill" />
                  </Meter.Track>
                </Meter.Root>
              </li>
            );
          })}
        </ul>

        <AnimatePresence initial={false}>
          {(over || upgraded) && (
            <motion.div
              key="banner"
              className="um-banner-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {upgraded ? (
                  <motion.div
                    key="done"
                    className="um-banner"
                    data-tone="good"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={SPRING}
                  >
                    <span>
                      <b>You're on Scale.</b> The new limits apply straight away.
                    </span>
                    <button
                      type="button"
                      className="um-link"
                      onClick={() => setUsage((current) => ({ ...current, plan: "pro" }))}
                    >
                      Undo
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="over"
                    className="um-banner"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={SPRING}
                  >
                    <span>
                      <b>You've used all your API requests.</b> Extra ones are billed at $2 per 1,000.
                    </span>
                    <motion.button
                      type="button"
                      className="um-upgrade"
                      onClick={() => setUsage((current) => ({ ...current, plan: "scale" }))}
                      whileTap={{ scale: 0.96 }}
                    >
                      Upgrade
                      <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden="true" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="um-bill">
          <div className="um-bill-top">
            <span>Projected bill</span>
            <Odometer value={`$${Math.round(bill)}`} className="um-bill-total" />
          </div>
          <ul className="um-lines">
            <li>
              <span>{plan.name} plan</span>
              <Odometer value={`$${plan.price}`} />
            </li>
            <AnimatePresence initial={false}>
              {overage > 0 && (
                <motion.li
                  key="overage"
                  data-tone="over"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING}
                >
                  <span>API overage · {format(projectedApi - plan.limits.api)} requests</span>
                  <Odometer value={`+$${Math.round(overage)}`} />
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
        </footer>
      </section>
    </Tooltip.Provider>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (UsageMeterValue & { ms: number })[] = [
  { day: 16, plan: "pro", ms: 1500 },
  { day: 21, plan: "pro", ms: 1300 },
  { day: 25, plan: "pro", ms: 1500 },
  { day: 28, plan: "pro", ms: 2400 },
  { day: 28, plan: "scale", ms: 3000 },
];

const fromBeat = (step: number): UsageMeterValue => ({ day: BEATS[step]!.day, plan: BEATS[step]!.plan });

interface UsageMeterDemoProps {
  playing?: boolean;
}

export function UsageMeterDemo({ playing }: UsageMeterDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <UsageMeter ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
