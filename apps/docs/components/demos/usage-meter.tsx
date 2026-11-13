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
    tip: "Over the limit, requests cost £2 per 1,000.",
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
  value?: UsageMeterValue;
  defaultValue?: UsageMeterValue;
  onValueChange?: (value: UsageMeterValue) => void;
  ref?: Ref<HTMLElement>;
}

const TOKENS = [
  "[--um-surface:#ffffff] [--um-panel:#f7f7f8] [--um-track:#efeff1] [--um-line:rgb(24_24_27/0.08)] [--um-ink:#18181b] [--um-on-ink:#fafafa] [--um-muted:#71717a] [--um-quiet:#a1a1aa]",
  "[--um-fill:#4f46e5] [--um-low:#d97706] [--um-over:#dc2626] [--um-good:#059669]",
  "dark:[--um-surface:#1f1f23] dark:[--um-panel:#26262b] dark:[--um-track:#2e2e33] dark:[--um-line:rgb(255_255_255/0.08)] dark:[--um-ink:#fafafa] dark:[--um-on-ink:#18181b] dark:[--um-muted:#a1a1aa] dark:[--um-quiet:#71717a]",
  "dark:[--um-fill:#818cf8] dark:[--um-low:#fbbf24] dark:[--um-over:#f87171] dark:[--um-good:#34d399]",
  "font-sans",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--um-fill)";
const WRAP = "@max-[400px]:flex-wrap @max-[400px]:gap-y-0.5";
const PUSH_RIGHT = "@max-[400px]:ml-auto @max-[400px]:text-[12px]";
const BANNER = `mt-3.5 flex items-center gap-2.5 rounded-xl py-2.5 pr-2.5 pl-3 text-[12.5px] leading-[1.45] text-(--um-ink) ${WRAP} [&_b]:font-semibold [&_b]:text-(--um-ink) [&>span]:flex-1 [&>span]:text-(--um-muted)`;

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
      <section
        ref={ref}
        className={`not-prose @container grid w-[min(100%,420px)] rounded-[22px] bg-(--um-surface) p-[18px] text-(--um-ink) @max-[400px]:p-3.5 ${TOKENS}`}
        aria-label="Usage this month"
      >
        <header className={`flex items-center justify-between gap-2.5 ${WRAP}`}>
          <span className="flex items-center gap-2 text-[15px]">
            <b>Usage</b>
            <span
              data-plan={usage.plan}
              className="inline-grid rounded-md bg-[color-mix(in_oklab,var(--um-fill)_14%,transparent)] px-2 py-0.5 text-[11.5px] font-bold text-(--um-fill) transition-colors duration-300 data-[plan=scale]:bg-[color-mix(in_oklab,var(--um-good)_15%,transparent)] data-[plan=scale]:text-(--um-good)"
            >
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
          <span className={`inline-flex items-baseline gap-1 text-[12px] text-(--um-muted) ${PUSH_RIGHT}`}>
            Resets in <Odometer value={String(DAYS - usage.day)} /> days
          </span>
        </header>
        <div className="mt-2.5 h-[3px] overflow-hidden rounded-[2px] bg-(--um-track)" aria-hidden="true">
          <motion.span
            className="block h-full origin-left bg-(--um-quiet)"
            initial={false} animate={{ scaleX: usage.day / DAYS }} transition={SPRING} />
        </div>

        <ul className="m-0 mt-4 grid list-none gap-3.5 p-0">
          {METRICS.map(({ id, label, unit, icon: Icon, tip }) => {
            const limit = plan.limits[id];
            const value = used[id];
            const ratio = value / limit;
            const status = tone(ratio);
            return (
              <li key={id} className="group/row" data-tone={status}>
                <Meter.Root
                  value={Math.min(value, limit)}
                  max={limit}
                  className="grid gap-[7px]"
                  getAriaValueText={() => `${format(value)}${unit} of ${format(limit)}${unit}`}
                >
                  <div className={`flex min-h-5 items-center gap-1.5 ${WRAP}`}>
                    <Meter.Label className="inline-flex items-center gap-[7px] text-[13px] font-medium whitespace-nowrap">
                      <HugeiconsIcon icon={Icon} className="size-3.5 text-(--um-muted)" aria-hidden="true" />
                      {label}
                    </Meter.Label>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        className={`grid size-[18px] cursor-help place-items-center rounded-full border-0 bg-transparent p-0 text-(--um-quiet) ${FOCUS}`}
                        aria-label={`About ${label}`}
                      >
                        <HugeiconsIcon icon={InformationCircleIcon} className="size-[13px]" aria-hidden="true" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={portal}>
                        <Tooltip.Positioner className={TOKENS} sideOffset={6}>
                          <Tooltip.Popup className="max-w-[220px] origin-(--transform-origin) rounded-lg bg-(--um-ink) px-[9px] py-1.5 text-[12px] leading-[1.4] text-(--um-on-ink) [transition:opacity_0.14s,transform_0.18s] data-ending-style:[transform:scale(0.92)] data-ending-style:opacity-0 data-starting-style:[transform:scale(0.92)] data-starting-style:opacity-0">
                            {tip}
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    <AnimatePresence initial={false}>
                      {status && (
                        <motion.span
                          key={status}
                          className="h-[18px] rounded-[5px] bg-[color-mix(in_oklab,var(--um-low)_15%,transparent)] px-1.5 text-[10.5px] leading-[18px] font-bold whitespace-nowrap text-(--um-low) group-data-[tone=over]/row:bg-[color-mix(in_oklab,var(--um-over)_14%,transparent)] group-data-[tone=over]/row:text-(--um-over)"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                          transition={POP}
                        >
                          {status === "over" ? "Over limit" : "Running low"}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className={`ml-auto inline-flex items-baseline text-[12.5px] font-semibold whitespace-nowrap ${PUSH_RIGHT}`}>
                      <Odometer value={format(value)} />
                      <span className="font-medium text-(--um-quiet)">
                        {unit} / {format(limit)}
                        {unit}
                      </span>
                    </span>
                  </div>
                  <Meter.Track className="relative h-1.5 overflow-hidden rounded-[3px] bg-(--um-track)">
                    <Meter.Indicator className="h-full rounded-[inherit] bg-(--um-fill) [transition:width_0.7s_cubic-bezier(0.25,1.1,0.4,1),background-color_0.3s] group-data-[tone=low]/row:bg-(--um-low) group-data-[tone=over]/row:bg-[repeating-linear-gradient(-45deg,var(--um-over)_0_6px,color-mix(in_oklab,var(--um-over)_75%,#fff)_6px_12px)] group-data-[tone=over]/row:bg-size-[17px_17px] motion-safe:group-data-[tone=over]/row:animate-march" />
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
              className="overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {upgraded ? (
                  <motion.div
                    key="done"
                    className={`${BANNER} bg-[color-mix(in_oklab,var(--um-good)_11%,transparent)]`}
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
                      className={`flex-none cursor-pointer border-0 bg-transparent p-1 text-[12.5px] font-semibold text-(--um-ink) underline decoration-(--um-line) underline-offset-[3px] ${FOCUS}`}
                      onClick={() => setUsage((current) => ({ ...current, plan: "pro" }))}
                    >
                      Undo
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="over"
                    className={`${BANNER} bg-[color-mix(in_oklab,var(--um-over)_9%,transparent)]`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={SPRING}
                  >
                    <span>
                      <b>You've used all your API requests.</b> Extra ones are billed at £2 per 1,000.
                    </span>
                    <motion.button
                      type="button"
                      className={`inline-flex h-[30px] flex-none cursor-pointer items-center gap-1 rounded-[9px] border-0 bg-(--um-ink) px-[11px] text-[12.5px] font-semibold text-(--um-on-ink) [&_svg]:size-3.5 ${FOCUS}`}
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

        <footer className="mt-3.5 rounded-[14px] bg-(--um-panel) px-3.5 py-3">
          <div className="flex items-baseline justify-between text-[12.5px] font-medium text-(--um-muted)">
            <span>Projected bill</span>
            <Odometer
              value={`£${Math.round(bill)}`}
              className="text-[24px] font-bold tracking-[-0.02em] text-(--um-ink)"
            />
          </div>
          <ul className="m-0 mt-1.5 grid list-none p-0 [&>li]:flex [&>li]:justify-between [&>li]:overflow-hidden [&>li]:text-[12px] [&>li]:leading-[22px] [&>li]:text-(--um-muted) [&>li[data-tone=over]]:text-(--um-over) @max-[400px]:[&>li]:h-auto @max-[400px]:[&>li]:flex-wrap @max-[400px]:[&>li]:gap-y-0.5 @max-[400px]:[&>li]:overflow-visible @max-[400px]:[&>li]:py-0.5 @max-[400px]:[&>li]:leading-[1.4]">
            <li>
              <span>{plan.name} plan</span>
              <Odometer value={`£${plan.price}`} />
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
                  <Odometer value={`+£${Math.round(overage)}`} />
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
        </footer>
      </section>
    </Tooltip.Provider>
  );
}

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
