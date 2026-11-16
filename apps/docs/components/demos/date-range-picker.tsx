"use client";

import { Button } from "@base-ui/react/button";
import { Popover } from "@base-ui/react/popover";
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { LayoutGroup, MotionConfig, motion, useAnimate, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { Odometer } from "./odometer";
import { usePortalContainer } from "./portal-container";

export interface DateRangeValue {
  from: Date;
  to: Date;
}

export interface DateRangePreset {
  label: string;
  range: (today: Date) => DateRangeValue;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onValueChange: (value: DateRangeValue) => void;
  today?: Date;
  presets?: readonly DateRangePreset[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  boundary?: Element | null;
}

interface Draft {
  from: Date;
  to?: Date;
}

const DAY = 86_400_000;
const ROOMY = 660;
const SPRING = { type: "spring" as const, duration: 0.4, bounce: 0.16 };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };

const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const monthOf = (date: Date, shift = 0) => new Date(date.getFullYear(), date.getMonth() + shift, 1);
const shift = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const stamp = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const apart = (from: Date, to: Date) => Math.round((stamp(to) - stamp(from)) / DAY);
const same = (one: Date | undefined, other: Date | undefined) => Boolean(one && other && stamp(one) === stamp(other));

const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const FULL = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export function rangeLabel({ from, to }: { from: Date; to?: Date }) {
  if (!to || same(from, to)) return FULL.format(from);

  return `${(from.getFullYear() === to.getFullYear() ? SHORT : FULL).format(from)} – ${FULL.format(to)}`;
}

const days = (amount: number) => `${amount} ${amount === 1 ? "day" : "days"}`;

export const PRESETS: readonly DateRangePreset[] = [
  { label: "Today", range: (today) => ({ from: today, to: today }) },
  { label: "Yesterday", range: (today) => ({ from: shift(today, -1), to: shift(today, -1) }) },
  { label: "Last 7 days", range: (today) => ({ from: shift(today, -6), to: today }) },
  { label: "Last 30 days", range: (today) => ({ from: shift(today, -29), to: today }) },
  { label: "This month", range: (today) => ({ from: monthOf(today), to: today }) },
  { label: "Last month", range: (today) => ({ from: monthOf(today, -1), to: shift(monthOf(today), -1) }) },
];

const TOKENS = [
  "[--drp-ink:#0a0a0b] [--drp-muted:#6c6c75] [--drp-faint:#a1a1aa] [--drp-surface:#ffffff] [--drp-raised:#ffffff] [--drp-well:#f1f1f3] [--drp-hover:#e6e6ea] [--drp-line:rgb(10_10_11/0.08)]",
  "[--drp-shadow:0_24px_48px_-16px_rgb(0_0_0/0.24),0_0_0_1px_rgb(10_10_11/0.06)]",
  "dark:[--drp-ink:#fafafa] dark:[--drp-muted:#a1a1aa] dark:[--drp-faint:#71717a] dark:[--drp-surface:#1f1f23] dark:[--drp-raised:#26262b] dark:[--drp-well:#34343a] dark:[--drp-hover:#404047] dark:[--drp-line:rgb(255_255_255/0.1)]",
  "dark:[--drp-shadow:0_24px_48px_-16px_rgb(0_0_0/0.7),0_0_0_1px_rgb(255_255_255/0.08)]",
  "font-sans",
].join(" ");

const RING = "outline-none focus-visible:shadow-[0_0_0_2px_var(--drp-raised),0_0_0_4px_var(--drp-ink)]";
const EASE = "transition-[background-color,color,scale] duration-150 ease-out motion-reduce:transition-none";
const ROUND = `grid size-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-(--drp-muted) not-disabled:hover:bg-(--drp-well) not-disabled:hover:text-(--drp-ink) not-disabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-35 [&_svg]:size-4 ${EASE} ${RING}`;

interface Painted {
  low: Date | null;
  high: Date | null;
  sweep: number;
  group: string;
}

const Paint = createContext<Painted>({ low: null, high: null, sweep: 0, group: "" });

function Day({ day, modifiers, className: _className, children, ...props }: DayButtonProps) {
  const button = useRef<HTMLButtonElement>(null);
  const { low, high, sweep, group } = useContext(Paint);
  const reduced = useReducedMotion();
  const date = day.date;
  const first = same(date, low ?? undefined);
  const last = same(date, high ?? undefined);
  const span = low && high ? apart(low, high) : 0;
  const along = low ? apart(low, date) : -1;
  const inside = span > 0 && along >= 0 && along <= span;
  const edge = first || last;

  useEffect(() => {
    if (modifiers.focused) button.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={button}
      {...props}
      data-edge={edge || undefined}
      data-today={modifiers.today || undefined}
      className="group/day relative grid h-8 w-full cursor-pointer place-items-center border-0 bg-transparent p-0 font-sans text-[13px] text-(--drp-ink) tabular-nums outline-none disabled:cursor-default disabled:text-(--drp-faint) data-edge:font-semibold data-edge:text-(--drp-surface)"
    >
      {inside && (
        <motion.span
          key={sweep}
          data-first={first || undefined}
          data-last={last || undefined}
          data-opens={date.getDay() === 1 || date.getDate() === 1 || undefined}
          data-closes={date.getDay() === 0 || shift(date, 1).getDate() === 1 || undefined}
          className="absolute inset-y-0 right-0 left-0 origin-left bg-(--drp-well) data-closes:rounded-r-full data-first:left-1/2 data-first:rounded-none data-last:right-1/2 data-last:rounded-none data-opens:rounded-l-full"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ ...SETTLE, duration: 0.22, delay: sweep ? Math.min(along, 30) * 0.012 : 0 }}
        />
      )}
      {first && <motion.span layoutId={`${group}-from`} className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-(--drp-ink)" style={{ borderRadius: 999 }} transition={SPRING} />}
      {last && !first && (
        <motion.span
          layoutId={`${group}-to`}
          className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-(--drp-ink)"
          style={{ borderRadius: 999 }}
          transition={SPRING}
        />
      )}
      {!edge && (
        <span className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 rounded-full transition-[background-color,box-shadow] duration-150 ease-out group-hover/day:group-enabled/day:bg-(--drp-hover) group-focus-visible/day:shadow-[inset_0_0_0_2px_var(--drp-ink)] motion-reduce:transition-none" />
      )}
      {edge && <span className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 rounded-full group-focus-visible/day:shadow-[0_0_0_2px_var(--drp-raised),0_0_0_4px_var(--drp-ink)]" />}
      <span className="relative">{children}</span>
      {modifiers.today && <span className="absolute bottom-[5px] left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-current" aria-hidden="true" />}
    </button>
  );
}

const PARTS = { DayButton: Day };

const CLASSES = {
  root: "relative",
  months: "flex gap-6",
  month: "grid gap-1",
  month_caption: "sr-only",
  month_grid: "w-[224px] border-collapse",
  weekdays: "",
  weekday: "h-8 w-8 p-0 text-center text-[12px] font-medium text-(--drp-muted)",
  week: "",
  day: "p-0 py-px text-center",
  hidden: "invisible",
};

function useWide(boundary: Element | null | undefined) {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const room = boundary ?? document.documentElement;
    const read = () => setWide(room.clientWidth >= ROOMY);
    const observer = new ResizeObserver(read);

    read();
    observer.observe(room);

    return () => observer.disconnect();
  }, [boundary]);

  return wide;
}

export function DateRangePicker({ value, onValueChange, today: now, presets = PRESETS, open: controlled, onOpenChange, boundary }: DateRangePickerProps) {
  const [today] = useState(() => startOf(now ?? new Date()));
  const wide = useWide(boundary);
  const shown = wide ? 2 : 1;
  const portal = usePortalContainer();
  const group = useId();
  const reduced = useReducedMotion();
  const [own, setOwn] = useState(false);
  const [draft, setDraft] = useState<Draft>(value);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => monthOf(value.to, 1 - shown));
  const [sweep, setSweep] = useState(0);
  const [grid, slide] = useAnimate<HTMLDivElement>();
  const heading = useRef(0);
  const open = controlled ?? own;
  const last = monthOf(today, 1 - shown);

  const setOpen = (next: boolean) => {
    if (next) {
      setDraft(value);
      setHovered(null);
      setMonth(monthOf(value.to, 1 - shown));
    }

    setOwn(next);
    onOpenChange?.(next);
  };

  const turn = (next: Date) => {
    const target = next > last ? last : next;

    if (stamp(target) === stamp(month)) return;

    heading.current = target > month ? 1 : -1;
    setMonth(target);
  };

  useLayoutEffect(() => {
    const way = heading.current;

    heading.current = 0;

    if (!way || reduced || !grid.current) return;

    slide(grid.current, { x: [way * 26, 0], opacity: [0, 1] }, { type: "spring", duration: 0.4, bounce: 0 });
  }, [month, reduced, grid, slide]);

  const tentative = draft.to ?? (hovered && hovered <= today ? hovered : draft.from);
  const low = tentative < draft.from ? tentative : draft.from;
  const high = tentative < draft.from ? draft.from : tentative;
  const complete = draft.to !== undefined;
  const length = apart(low, high) + 1;
  const preset = complete ? presets.find((item) => same(item.range(today).from, draft.from) && same(item.range(today).to, draft.to)) : undefined;

  const pick = (date: Date) => {
    if (complete) setDraft({ from: date });
    else setDraft(date < draft.from ? { from: date, to: draft.from } : { from: draft.from, to: date });

    setHovered(null);
  };

  const choose = (item: DateRangePreset) => {
    const next = item.range(today);

    setDraft(next);
    setSweep((current) => current + 1);
    setHovered(null);
    turn(monthOf(next.to, 1 - shown));
  };

  const apply = () => {
    if (!draft.to) return;

    onValueChange({ from: draft.from, to: draft.to });
    announce(`Showing ${rangeLabel(draft)}`);
    setOpen(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <Popover.Root open={open} onOpenChange={(next) => setOpen(next)}>
        <Popover.Trigger
          className={`flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-(--drp-well) pr-3 pl-3.5 font-sans text-[13.5px] font-medium text-(--drp-ink) hover:bg-(--drp-hover) active:scale-[0.97] data-popup-open:bg-(--drp-hover) [&_svg]:size-4 [&_svg]:flex-none [&_svg]:text-(--drp-muted) ${TOKENS} ${EASE} ${RING}`}
        >
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.9} aria-hidden="true" />
          <Remold.Text className="inline-block whitespace-nowrap">{rangeLabel(value)}</Remold.Text>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} aria-hidden="true" />
        </Popover.Trigger>

        <Popover.Portal container={portal}>
          <Popover.Positioner className={`${TOKENS} z-50`} side="bottom" align="end" sideOffset={8} collisionPadding={12} collisionBoundary={boundary ?? undefined} collisionAvoidance={{ side: "flip", align: "shift" }}>
            <Popover.Popup
              aria-label="Choose a date range"
              initialFocus={() => grid.current?.querySelector<HTMLElement>('button[tabindex="0"]') ?? true}
              className="origin-(--transform-origin) rounded-[24px] bg-(--drp-raised) p-3 text-(--drp-ink) shadow-(--drp-shadow) outline-none transition-[opacity,scale] duration-200 ease-out data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none"
            >
              <LayoutGroup id={group}>
                <div data-wide={wide || undefined} className="grid gap-3 data-wide:flex data-wide:gap-4">
                  <ul data-wide={wide || undefined} className="m-0 flex w-[224px] list-none flex-wrap gap-1 p-0 data-wide:w-[124px] data-wide:flex-col data-wide:flex-nowrap data-wide:gap-0.5" aria-label="Quick ranges">
                    {presets.map((item) => {
                      const active = item === preset;

                      return (
                        <li key={item.label} className="grid">
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => choose(item)}
                            data-wide={wide || undefined}
                            className={`relative h-8 cursor-pointer rounded-full border-0 bg-transparent px-3 text-left font-sans text-[13px] font-medium whitespace-nowrap text-(--drp-muted) hover:text-(--drp-ink) aria-pressed:text-(--drp-ink) data-wide:h-9 data-wide:rounded-[12px] ${EASE} ${RING}`}
                          >
                            {active && <motion.span layoutId="preset" className="absolute inset-0 bg-(--drp-well)" style={{ borderRadius: wide ? 12 : 999 }} transition={SPRING} />}
                            <span className="relative">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="grid gap-1">
                    <div className="flex h-9 items-center gap-1">
                      <button type="button" aria-label="Earlier months" onClick={() => turn(monthOf(month, -1))} className={ROUND}>
                        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                      <div className="flex flex-1 gap-6" aria-hidden="true">
                        {Array.from({ length: shown }, (_, index) => (
                          <span key={index} className="flex-1 text-center text-[14px] font-semibold">
                            <Remold.Text className="inline-block whitespace-nowrap">{MONTH.format(monthOf(month, index))}</Remold.Text>
                          </span>
                        ))}
                      </div>
                      <button type="button" aria-label="Later months" disabled={month >= last} onClick={() => turn(monthOf(month, 1))} className={ROUND}>
                        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="overflow-hidden">
                      <div ref={grid}>
                        <Paint.Provider value={{ low, high, sweep, group }}>
                          <DayPicker
                            mode="range"
                            selected={{ from: draft.from, to: draft.to }}
                            onSelect={(_, date) => pick(date)}
                            month={month}
                            onMonthChange={turn}
                            numberOfMonths={shown}
                            endMonth={today}
                            today={today}
                            disabled={{ after: today }}
                            weekStartsOn={1}
                            fixedWeeks
                            hideNavigation
                            onDayMouseEnter={(date) => setHovered(date)}
                            onDayMouseLeave={() => setHovered(null)}
                            onDayFocus={(date) => setHovered(date)}
                            classNames={CLASSES}
                            components={PARTS}
                          />
                        </Paint.Provider>
                      </div>
                    </div>
                  </div>
                </div>
              </LayoutGroup>

              <div className="mt-2 flex items-center gap-2 border-0 border-t border-solid border-(--drp-line) pt-3 pl-1.5">
                <p className="m-0 min-w-0 flex-1 truncate text-[13px] text-(--drp-muted)" role="status">
                  <Remold.Text className="inline-block whitespace-nowrap">{complete ? `${rangeLabel(draft)} · ${days(length)}` : "Now pick the last day"}</Remold.Text>
                </p>
                <Popover.Close className={`h-9 flex-none cursor-pointer rounded-full border-0 bg-transparent px-3.5 font-sans text-[13.5px] font-semibold text-(--drp-muted) hover:bg-(--drp-well) hover:text-(--drp-ink) active:scale-[0.97] ${EASE} ${RING}`}>
                  Cancel
                </Popover.Close>
                <Button
                  onClick={apply}
                  disabled={!complete}
                  className={`h-9 flex-none cursor-pointer rounded-full border-0 bg-(--drp-ink) px-4 font-sans text-[13.5px] font-semibold text-(--drp-surface) not-disabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-40 ${EASE} ${RING}`}
                >
                  Apply
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </MotionConfig>
  );
}

const TODAY = new Date(2026, 10, 19);
const START: DateRangeValue = { from: shift(TODAY, -6), to: TODAY };
const POUNDS = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const takings = (date: Date) => {
  const seed = Math.sin(stamp(date) / DAY) * 10_000;

  return 420 + Math.round((seed - Math.floor(seed)) * 980);
};

export function DateRangePickerDemo() {
  const [range, setRange] = useState(START);
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const length = apart(range.from, range.to) + 1;
  const total = Array.from({ length }, (_, index) => takings(shift(range.from, index))).reduce((sum, amount) => sum + amount, 0);

  return (
    <div ref={(node) => setFrame(node?.closest<HTMLElement>(".rm-stage-preview") ?? node)} className={`not-prose grid min-h-[520px] w-full content-start justify-items-center font-sans antialiased ${TOKENS}`}>
      <section className="grid w-[min(100%,420px)] gap-4 rounded-[28px] bg-(--drp-surface) p-5 text-(--drp-ink)" aria-label="Sales">
        <header className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-[15.5px] font-semibold tracking-[-0.01em]">Sales</h2>
          <DateRangePicker value={range} onValueChange={setRange} today={TODAY} boundary={frame} />
        </header>
        <div className="grid gap-1">
          <p className="m-0 text-[34px] leading-none font-semibold tracking-[-0.03em]">
            <Odometer value={POUNDS.format(total)} />
          </p>
          <p className="m-0 text-[13.5px] text-(--drp-muted)">
            <Remold.Text className="inline-block whitespace-nowrap">{`Taken over ${days(length)}`}</Remold.Text>
          </p>
        </div>
      </section>
    </div>
  );
}
