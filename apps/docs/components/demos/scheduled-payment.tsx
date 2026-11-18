"use client";

import { Switch } from "@base-ui/react/switch";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Loading03Icon,
  RepeatIcon,
  StopCircleIcon,
  Tick02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DayPicker } from "react-day-picker";
import { useScene } from "./use-scene";

type Phase = "edit" | "saving" | "done";
type View = "date" | "calendar" | "repeat" | "custom" | "ends";
type Setting = "date" | "repeat" | "ends";

export type ScheduleValue = {
  amount: string;
  scheduled: boolean;
  stack: View[];
  date: string;
  repeat: string;
  ends: string;
  phase: Phase;
};

const TODAY = "2026-11-18";
const BALANCE = 4210.08;
const PEEK = 7;

const daysFromToday = (days: number) => new Date(Date.parse(`${TODAY}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const QUICK_DATES = [
  { label: "Tomorrow", value: daysFromToday(1) },
  { label: "Next Monday", value: daysFromToday(5) },
  { label: "In two weeks", value: daysFromToday(14) },
  { label: "1st of the month", value: "2026-12-01" },
];
const REPEATS = ["Never", "Every week", "Every 2 weeks", "Every month"];
const CUSTOM_REPEATS = ["Every 3 months", "Every 6 months", "Every year"];
const ENDS = ["Never", "After 6 payments", "After 12 payments"];

const TITLES: Record<View, string> = {
  date: "Start date",
  calendar: "Pick a date",
  repeat: "Repeats",
  custom: "Custom",
  ends: "Ends",
};

const SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.12 };
const SWAP = { type: "spring" as const, duration: 0.26, bounce: 0 };
const ARRIVE = { type: "spring" as const, duration: 0.36, bounce: 0.18 };
const HOVER = { type: "spring" as const, stiffness: 520, damping: 40, mass: 0.6 };
const QUICK = { duration: 0.09, ease: "easeOut" as const };

const rise = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.97, y: 4, filter: "blur(3px)" },
  animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { ...ARRIVE, delay: Math.min(delay, 0.1) } },
  exit: { opacity: 0, filter: "blur(4px)", transition: QUICK },
});

const THEME = [
  "[--sp-bg:#f4f4f4] [--sp-shell:#efefef] [--sp-card:#ffffff] [--sp-ink:#111111] [--sp-muted:#757575] [--sp-faint:#c7c7c7]",
  "[--sp-line:rgb(0_0_0/0.07)] [--sp-hover:#f4f4f4] [--sp-good:#15803d] [--sp-bad:#dc2626] [--sp-accent:var(--sp-ink)] [--sp-on-accent:var(--sp-card)]",
  "dark:[--sp-bg:#121212] dark:[--sp-shell:#171717] dark:[--sp-card:#1f1f1f] dark:[--sp-ink:#f4f4f4] dark:[--sp-muted:#a3a3a3]",
  "dark:[--sp-faint:#4a4a4a] dark:[--sp-line:rgb(255_255_255/0.07)] dark:[--sp-hover:#2a2a2a] dark:[--sp-good:#4ade80] dark:[--sp-bad:#f87171]",
].join(" ");

const shortDate = (value: string) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const cleanAmount = (input: string) => {
  const digits = input.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = digits.split(".");
  const integer = whole.replace(/^0+(?=\d)/, "").slice(0, 6);
  return digits.includes(".") ? `${integer || "0"}.${rest.join("").slice(0, 2)}` : integer;
};

const formatAmount = (raw: string) => {
  if (!raw) return "";
  const [whole = "", pence] = raw.split(".");
  const grouped = Number(whole || 0).toLocaleString("en-GB");
  return pence === undefined ? grouped : `${grouped}.${pence}`;
};

const pounds = (amount: number, alwaysPence = false) =>
  `£${amount.toLocaleString("en-GB", { minimumFractionDigits: alwaysPence || !Number.isInteger(amount) ? 2 : 0, maximumFractionDigits: 2 })}`;

function amountCharacters(raw: string) {
  if (!raw) return [{ key: "zero", character: "0", placeholder: true }];
  const [whole = "", pence] = raw.split(".");
  const characters: { key: string; character: string; placeholder?: boolean }[] = [];
  [...whole].forEach((character, index) => {
    const placesLeft = whole.length - index - 1;
    characters.push({ key: `digit-${index}-${character}`, character });
    if (placesLeft > 0 && placesLeft % 3 === 0) characters.push({ key: `comma-${placesLeft}`, character: "," });
  });
  if (pence !== undefined) {
    characters.push({ key: "point", character: "." });
    [...pence].forEach((character, index) => characters.push({ key: `pence-${index}-${character}`, character }));
  }
  return characters;
}

const ScriptedHoverContext = createContext<string | null>(null);

function useContentHeight() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!element) {
      setHeight(null);
      return;
    }
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    setHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, height] as const;
}

function SwapText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`relative inline-grid [&>*]:[grid-area:1/1] ${className}`}>
      <AnimatePresence initial={false}>
        <motion.span
          key={children}
          className="whitespace-nowrap"
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
          transition={SWAP}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ButtonLabel({ children }: { children: string }) {
  const measure = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    setWidth(measure.current?.offsetWidth);
  }, [children]);

  return (
    <motion.span
      className="relative inline-grid grid-cols-[minmax(0,1fr)] justify-items-center [&>*]:[grid-area:1/1]"
      initial={false}
      animate={width === undefined ? undefined : { width }}
      transition={SWAP}
    >
      <span ref={measure} className="invisible absolute whitespace-nowrap" aria-hidden="true">
        {children}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={children}
          className="whitespace-nowrap"
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
          transition={SWAP}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

function ButtonIcon({ phase }: { phase: Phase }) {
  const reduced = useReducedMotion();
  const rotate = useMotionValue(0);

  useEffect(() => {
    if (phase !== "saving") {
      const upright = Math.ceil(rotate.get() / 360) * 360;
      const settle = animate(rotate, upright, SWAP);
      return () => settle.stop();
    }
    const turns = 100;
    const spin = animate(rotate, rotate.get() + turns * 360, { duration: turns * (reduced ? 2.4 : 0.8), ease: "linear" });
    return () => spin.stop();
  }, [phase, reduced, rotate]);

  return (
    <motion.span className="grid size-4 [&_svg]:size-4" style={{ rotate }}>
      <Remold.Icon icon={<HugeiconsIcon icon={BUTTON_ICONS[phase]} />} strokeWidth={2.4} aria-hidden="true" />
    </motion.span>
  );
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: SWAP, opacity: { duration: 0.15, ease: "easeOut" } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AmountInput({ value, over, disabled, onChange }: { value: string; over: boolean; disabled: boolean; onChange: (value: string) => void }) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <label htmlFor={id} className="grid min-w-0 cursor-text gap-1.5">
      <span className="text-[12.5px] font-medium text-(--sp-muted)">Amount</span>
      <span
        className="relative flex h-9 items-baseline text-[36px] leading-9 font-semibold tracking-[-0.04em] tabular-nums transition-colors duration-150 data-over:text-(--sp-bad)"
        data-over={over || undefined}
      >
        <span className="mr-0.5 text-[22px] tracking-[-0.02em] text-(--sp-muted)">£</span>
        <span className="relative inline-flex items-baseline" aria-hidden="true">
          <AnimatePresence initial={false} mode="popLayout">
            {amountCharacters(value).map(({ key, character, placeholder }) => (
              <motion.span
                key={key}
                layout="position"
                className={`inline-block ${placeholder ? "text-(--sp-faint)" : ""}`}
                initial={{ opacity: 0, y: "40%", filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: "-30%", filter: "blur(3px)", transition: { duration: 0.12 } }}
                transition={ARRIVE}
              >
                {character}
              </motion.span>
            ))}
          </AnimatePresence>
          {focused && !disabled && (
            <motion.span
              layout="position"
              transition={ARRIVE}
              className="ml-[3px] inline-block h-[30px] w-[2.5px] animate-caret-blink self-center rounded-full bg-(--sp-ink) motion-reduce:animate-none"
            />
          )}
        </span>
        <input
          id={id}
          value={formatAmount(value)}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={over || undefined}
          aria-label="Amount in pounds"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(cleanAmount(event.target.value))}
          className="absolute inset-0 w-full cursor-text border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent outline-none selection:bg-transparent"
        />
      </span>
    </label>
  );
}

function ScheduleSwitch({ checked, disabled, onCheckedChange }: { checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const id = useId();
  const thumbWidth = pressed && !reduced ? 22 : 18;

  return (
    <label
      htmlFor={id}
      className={`group/switch flex cursor-pointer items-center gap-3 rounded-[20px] py-3 pr-3.5 pl-3 transition-[background-color] duration-150 ease-out has-disabled:cursor-default ${checked || disabled ? "" : "hover:bg-(--sp-hover)"}`}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      <span
        className={`grid size-9 flex-none place-items-center rounded-[10px] transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${checked ? `bg-(--sp-hover) shadow-[0_1px_2px_transparent] ${disabled ? "" : "group-hover/switch:bg-[color-mix(in_oklab,var(--sp-hover),var(--sp-ink)_6%)]"}` : "bg-(--sp-card) shadow-[0_1px_2px_rgb(0_0_0/0.06)]"}`}
        aria-hidden="true"
      >
        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.8} className="size-[18px]" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[14px] font-semibold">Schedule for later</span>
        <SwapText className="text-[12.5px] text-(--sp-muted)">{checked ? "Choose when it goes, and if it repeats" : "Off · sends right away"}</SwapText>
      </span>
      <Switch.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative flex h-6 w-[42px] flex-none cursor-pointer items-center rounded-full border-0 bg-(--sp-faint) p-[3px] transition-[background-color] duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-(--sp-ink) focus-visible:ring-offset-2 data-checked:bg-(--sp-accent) data-disabled:cursor-default data-disabled:opacity-60"
      >
        <Switch.Thumb
          className="block h-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.22)] dark:data-checked:bg-(--sp-card)"
          render={
            <motion.span
              initial={false}
              animate={{ width: thumbWidth, x: checked ? 36 - thumbWidth : 0 }}
              transition={reduced ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.18 }}
            />
          }
        />
      </Switch.Root>
    </label>
  );
}

function SettingRow({
  setting,
  label,
  value,
  icon,
  index,
  disabled,
  onOpen,
}: {
  setting: Setting;
  label: string;
  value: string;
  icon: IconSvgElement;
  index: number;
  disabled: boolean;
  onOpen: () => void;
}) {
  const scripted = useContext(ScriptedHoverContext) === setting;

  return (
    <motion.button
      {...rise(index * 0.025)}
      type="button"
      disabled={disabled}
      onClick={onOpen}
      data-hovered={scripted || undefined}
      className="group flex h-12 w-full cursor-pointer items-center gap-3 border-0 border-t border-solid border-(--sp-line) bg-transparent px-3.5 text-left text-[14px] text-(--sp-ink) transition-[background-color] duration-150 ease-out hover:bg-(--sp-ink)/4 disabled:cursor-default data-hovered:bg-(--sp-ink)/4"
    >
      <HugeiconsIcon
        icon={icon}
        strokeWidth={1.9}
        className="size-[17px] flex-none text-(--sp-muted) transition-colors duration-150 group-hover:text-(--sp-ink) group-data-hovered:text-(--sp-ink)"
        aria-hidden="true"
      />
      <span className="flex-1">
        <motion.span layoutId={`title-${setting}`} className="inline-block text-(--sp-muted)">
          {label}
        </motion.span>
      </span>
      <span className="flex items-center gap-1.5 font-semibold">
        <SwapText className="justify-items-end">{value}</SwapText>
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-3.5 text-(--sp-muted)" aria-hidden="true" />
      </span>
    </motion.button>
  );
}

const HoverContext = createContext<{ hovered: string | null; setHovered: (key: string | null) => void }>({
  hovered: null,
  setHovered: () => {},
});

function HoverList({ label, children }: { label: string; children: ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const scripted = useContext(ScriptedHoverContext);

  return (
    <HoverContext.Provider value={{ hovered: hovered ?? scripted, setHovered }}>
      <div role="radiogroup" aria-label={label} className="px-1.5 pb-1.5" onPointerLeave={() => setHovered(null)}>
        {children}
      </div>
    </HoverContext.Provider>
  );
}

function ListItem({
  id,
  index,
  label,
  detail,
  picked = false,
  opens,
  onPress,
}: {
  id: string;
  index: number;
  label: string;
  detail?: string;
  picked?: boolean;
  opens?: View;
  onPress: () => void;
}) {
  const { hovered, setHovered } = useContext(HoverContext);

  return (
    <motion.button
      {...rise(0.04 + index * 0.02)}
      whileTap={{ scale: 0.98 }}
      type="button"
      role={opens ? undefined : "radio"}
      aria-checked={opens ? undefined : picked}
      onClick={onPress}
      onPointerEnter={() => setHovered(id)}
      onFocus={() => setHovered(id)}
      className="relative flex h-9 w-full cursor-pointer items-center gap-3 rounded-[8px] border-0 bg-transparent px-2.5 text-left text-[14px] text-(--sp-ink) outline-none data-[opens]:font-medium"
      data-opens={opens || undefined}
    >
      <AnimatePresence>
        {hovered === id && (
          <motion.span
            layoutId="hovered-item"
            className="pointer-events-none absolute inset-0 rounded-[8px] bg-(--sp-hover)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ layout: HOVER, opacity: { duration: 0.12 } }}
          />
        )}
      </AnimatePresence>
      <span className="relative flex-1">
        {opens ? (
          <motion.span layoutId={`title-${opens}`} className="inline-block">
            {label}
          </motion.span>
        ) : (
          label
        )}
      </span>
      {detail && <span className="relative text-[13px] text-(--sp-muted) tabular-nums">{detail}</span>}
      <span className="relative grid w-5 place-items-center">
        {opens ? (
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-4 text-(--sp-muted)" aria-hidden="true" />
        ) : (
          picked && (
            <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { ...SPRING, delay: 0.12 } }} className="grid">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} className="size-4" aria-hidden="true" />
            </motion.span>
          )
        )}
      </span>
    </motion.button>
  );
}

function Divider() {
  return <div className="mx-3 my-1 h-px bg-(--sp-line)" />;
}

const toDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
};

const toValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const CALENDAR_CLASSES = {
  root: "relative",
  months: "grid",
  month: "grid gap-1",
  month_caption: "flex h-8 items-center px-2 text-[13px] font-semibold",
  nav: "absolute top-0 right-0 flex gap-1",
  button_previous:
    "grid size-8 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent transition-colors duration-150 hover:bg-(--sp-hover) disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
  button_next:
    "grid size-8 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent transition-colors duration-150 hover:bg-(--sp-hover) disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
  chevron: "size-4 fill-(--sp-muted)",
  month_grid: "w-full border-collapse",
  weekday: "h-7 p-0 text-center text-[11.5px] font-semibold text-(--sp-muted)",
  day: "p-0 py-0.5 text-center",
  day_button:
    "mx-auto grid size-8 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent text-[13.5px] text-(--sp-ink) tabular-nums transition-colors duration-150 hover:bg-(--sp-hover)",
  selected: "[&>button]:bg-(--sp-ink) [&>button]:font-semibold [&>button]:text-(--sp-card) [&>button]:hover:bg-(--sp-ink)",
  today: "[&>button]:font-semibold",
  disabled: "[&>button]:cursor-default [&>button]:text-(--sp-faint) [&>button]:hover:bg-transparent",
  outside: "invisible",
};

function MonthCalendar({ value, onPick }: { value: string; onPick: (date: string) => void }) {
  const firstDay = toDate(daysFromToday(1));

  return (
    <motion.div className="px-3 pb-3" {...rise(0.06)}>
      <DayPicker
        mode="single"
        required
        selected={toDate(value)}
        onSelect={(date) => onPick(toValue(date))}
        defaultMonth={toDate(value)}
        today={toDate(TODAY)}
        startMonth={firstDay}
        endMonth={new Date(firstDay.getFullYear(), firstDay.getMonth() + 5)}
        disabled={{ before: firstDay }}
        weekStartsOn={1}
        formatters={{ formatWeekdayName: (date) => date.toLocaleDateString("en-GB", { weekday: "narrow" }) }}
        classNames={CALENDAR_CLASSES}
      />
    </motion.div>
  );
}

function StackEdges({ depth }: { depth: number }) {
  const visible = Math.min(depth, 2);

  return (
    <AnimatePresence initial={false}>
      {Array.from({ length: visible }, (_, index) => {
        const level = visible - index;

        return (
          <motion.span
            key={`edge-${index}`}
            aria-hidden="true"
            className="absolute h-8 rounded-t-[14px] shadow-[inset_0_0_0_1px_var(--sp-line)]"
            style={{
              top: index * PEEK,
              left: level * 10,
              right: level * 10,
              background: `color-mix(in oklab, var(--sp-card) ${100 - level * 30}%, var(--sp-bg))`,
            }}
            initial={{ opacity: 0, y: PEEK }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: PEEK }}
            transition={SPRING}
          />
        );
      })}
    </AnimatePresence>
  );
}

const BUTTON_ICONS: Record<Phase, IconSvgElement> = { edit: ArrowRight01Icon, saving: Loading03Icon, done: Tick02Icon };

function buttonLabel(value: ScheduleValue) {
  if (value.phase === "saving") return value.scheduled ? "Scheduling" : "Paying";
  if (value.phase === "done") return value.scheduled ? "Scheduled" : "Paid";
  return value.scheduled ? "Schedule payment" : "Pay now";
}

export function ScheduledPayment({ value, onValueChange }: { value: ScheduleValue; onValueChange: (value: ScheduleValue) => void }) {
  const group = useId();
  const [content, height] = useContentHeight();
  const [switching, setSwitching] = useState(false);
  const busy = value.phase !== "edit";
  const view: View | "settings" = value.stack.at(-1) ?? "settings";
  const total = Number(value.amount || 0);
  const over = total > BALANCE;
  const blocked = total <= 0 || over;

  const update = (patch: Partial<ScheduleValue>) => onValueChange({ ...value, ...patch });
  const open = (next: View) => !value.stack.includes(next) && update({ stack: [...value.stack, next] });
  const back = () => update({ stack: value.stack.slice(0, -1) });
  const choose = (patch: Partial<ScheduleValue>) => update({ ...patch, stack: [] });

  useEffect(() => {
    setSwitching(true);
    const timer = setTimeout(() => setSwitching(false), 650);
    return () => clearTimeout(timer);
  }, [view]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || value.stack.length === 0) return;
    event.preventDefault();
    back();
  };

  const repeats = value.repeat === "Never" ? "" : `, then ${value.repeat.toLowerCase()}`;
  const ends = value.repeat === "Never" || value.ends === "Never" ? "" : ` for ${value.ends.replace("After ", "").toLowerCase()}`;
  const customRepeat = CUSTOM_REPEATS.includes(value.repeat);
  const quickDate = QUICK_DATES.some((option) => option.value === value.date);

  const views: Record<View, ReactNode> = {
    date: (
      <HoverList label="Start date">
        {QUICK_DATES.map((option, index) => (
          <ListItem
            key={option.value}
            id={option.value}
            index={index}
            label={option.label}
            detail={shortDate(option.value)}
            picked={value.date === option.value}
            onPress={() => choose({ date: option.value })}
          />
        ))}
        <Divider />
        <ListItem id="calendar" index={QUICK_DATES.length} label="Pick a date" detail={quickDate ? undefined : shortDate(value.date)} opens="calendar" onPress={() => open("calendar")} />
      </HoverList>
    ),
    calendar: <MonthCalendar value={value.date} onPick={(date) => choose({ date })} />,
    repeat: (
      <HoverList label="Repeats">
        {REPEATS.map((option, index) => (
          <ListItem key={option} id={option} index={index} label={option} picked={value.repeat === option} onPress={() => choose({ repeat: option })} />
        ))}
        <Divider />
        <ListItem
          id="custom"
          index={REPEATS.length}
          label="Custom"
          detail={customRepeat ? value.repeat.replace("Every ", "") : undefined}
          opens="custom"
          onPress={() => open("custom")}
        />
      </HoverList>
    ),
    custom: (
      <HoverList label="Custom repeat">
        {CUSTOM_REPEATS.map((option, index) => (
          <ListItem key={option} id={option} index={index} label={option} picked={value.repeat === option} onPress={() => choose({ repeat: option })} />
        ))}
      </HoverList>
    ),
    ends: (
      <HoverList label="Ends">
        {ENDS.map((option, index) => (
          <ListItem key={option} id={option} index={index} label={option} picked={value.ends === option} onPress={() => choose({ ends: option })} />
        ))}
      </HoverList>
    ),
  };

  const settings = (
    <div>
      <SettingRow setting="date" index={0} label="Start date" value={shortDate(value.date)} icon={Calendar03Icon} disabled={busy} onOpen={() => open("date")} />
      <SettingRow setting="repeat" index={1} label="Repeats" value={value.repeat} icon={RepeatIcon} disabled={busy} onOpen={() => open("repeat")} />
      <Reveal show={value.repeat !== "Never"}>
        <SettingRow setting="ends" index={2} label="Ends" value={value.ends} icon={StopCircleIcon} disabled={busy} onOpen={() => open("ends")} />
      </Reveal>
      <motion.p className="m-0 border-0 border-t border-solid border-(--sp-line) px-3.5 pt-3 pb-1.5 text-[13px] leading-[1.5] text-(--sp-muted)" {...rise(0.06)}>
        Bentil gets <b className="font-semibold text-(--sp-ink)">{pounds(total)}</b> on{" "}
        <b className="font-semibold text-(--sp-ink)">
          <SwapText>{shortDate(value.date)}</SwapText>
        </b>
        {repeats}
        {ends}.
      </motion.p>
    </div>
  );

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <LayoutGroup id={group}>
        <section
          className={`grid w-[min(100%,448px)] rounded-[26px] bg-(--sp-shell) p-1.5 font-sans text-(--sp-ink) antialiased ${THEME}`}
          aria-label="Pay rent"
          onKeyDown={onKeyDown}
        >
          <div className="grid overflow-hidden rounded-[21px] bg-(--sp-card) shadow-[0_1px_2px_rgb(0_0_0/0.05),0_0_0_1px_rgb(0_0_0/0.035)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.05)]">
            <header className="flex items-center gap-3 px-5 pt-5">
              <img
                className="size-9 rounded-full bg-[#e7e4dc]"
                src="https://api.dicebear.com/9.x/notionists/svg?seed=Bentil%20Andoh&backgroundColor=e7e4dc"
                alt=""
                draggable={false}
              />
              <span className="grid flex-1 gap-px">
                <span className="text-[14.5px] font-semibold">Pay Bentil Andoh</span>
                <span className="text-[12.5px] text-(--sp-muted)">Rent · Current account •• 4410</span>
              </span>
              <button
                type="button"
                aria-label="Pay from Personal account"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] border-0 bg-(--sp-hover) pr-2 pl-2.5 text-[13px] font-medium text-(--sp-ink) transition-colors duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--sp-hover),var(--sp-ink)_6%)]"
              >
                <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.9} className="size-3.5 text-(--sp-muted)" aria-hidden="true" />
                Personal
                <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2.2} className="size-3.5 text-(--sp-muted)" aria-hidden="true" />
              </button>
            </header>

            <div className="flex items-end justify-between gap-3 px-5 pt-6 pb-5">
              <AmountInput value={value.amount} over={over} disabled={busy} onChange={(amount) => update({ amount })} />
              <span className="grid min-w-[112px] flex-none justify-items-end pb-1 text-[12.5px] leading-[1.4] text-(--sp-muted) tabular-nums">
                <SwapText className={`justify-items-end ${over ? "text-(--sp-bad)" : ""}`}>{over ? "Not enough funds" : "Balance after"}</SwapText>
                <span className={`font-medium transition-colors duration-150 ${over ? "text-(--sp-bad)" : "text-(--sp-ink)"}`}>
                  {over ? `${pounds(BALANCE, true)} available` : pounds(BALANCE - total, true)}
                </span>
              </span>
            </div>

            <div className="mx-5 mb-5 grid">
              <div
                className={`rounded-[20px] transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${value.scheduled ? "bg-transparent shadow-[0_0_0_1px_var(--sp-line)]" : "bg-(--sp-hover)/60 shadow-[0_0_0_1px_transparent]"}`}
              >
                <ScheduleSwitch
                  checked={value.scheduled}
                  disabled={busy}
                  onCheckedChange={(scheduled) => update({ scheduled, stack: [], date: value.date <= TODAY ? daysFromToday(1) : value.date })}
                />

                <AnimatePresence initial={false}>
                  {value.scheduled && (
                    <motion.div className="overflow-hidden" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0, transition: SWAP }}>
                      <motion.div
                        className="origin-top px-1.5 pb-1.5"
                        initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: ARRIVE }}
                        exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeOut" } }}
                      >
                        <motion.div className="relative" initial={false} animate={{ paddingTop: Math.min(value.stack.length, 2) * PEEK }} transition={SPRING}>
                          <StackEdges depth={value.stack.length} />
                          <motion.div
                            className={`relative overflow-hidden rounded-[14px] transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${view === "settings" ? "bg-transparent shadow-[0_0_0_1px_transparent,0_1px_2px_transparent]" : "bg-(--sp-card) shadow-[0_0_0_1px_var(--sp-line),0_1px_2px_rgb(0_0_0/0.06)]"}`}
                            initial={false}
                            animate={{ height: height ?? "auto" }}
                            transition={switching ? SPRING : { duration: 0 }}
                          >
                            <div ref={content}>
                              <AnimatePresence initial={false} mode="popLayout">
                                <motion.div
                                  key={view}
                                  role={view === "settings" ? undefined : "group"}
                                  aria-label={view === "settings" ? undefined : TITLES[view]}
                                  initial={false}
                                  exit={{ opacity: 0, filter: "blur(4px)", transition: QUICK }}
                                >
                                  {view === "settings" ? (
                                    settings
                                  ) : (
                                    <>
                                      <div className="flex h-12 items-center gap-2 px-2.5">
                                        <motion.button
                                          {...rise(0.02)}
                                          type="button"
                                          onClick={back}
                                          aria-label="Back"
                                          whileTap={{ scale: 0.92 }}
                                          className="grid size-7 cursor-pointer place-items-center rounded-[8px] border-0 bg-(--sp-hover) text-(--sp-ink)"
                                        >
                                          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-4" aria-hidden="true" />
                                        </motion.button>
                                        <motion.span layoutId={`title-${view}`} className="text-[14px] font-semibold">
                                          {TITLES[view]}
                                        </motion.span>
                                      </div>
                                      {views[view]}
                                    </>
                                  )}
                                </motion.div>
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Reveal show={!value.scheduled}>
                <p className="m-0 px-1 pt-3 text-[13px] leading-[1.5] text-(--sp-muted)">
                  Bentil gets <b className="font-semibold text-(--sp-ink)">{pounds(total)}</b> in a few seconds.
                </p>
              </Reveal>
            </div>
          </div>

          <footer className="flex items-center gap-3 px-3.5 pt-2.5 pb-1">
            <span className="min-w-0 flex-1 truncate text-[13px] text-(--sp-muted)">
              Paying from <b className="font-semibold text-(--sp-ink)">Personal</b>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => update({ stack: [], scheduled: false, repeat: "Never", ends: "Never", date: daysFromToday(1) })}
              className="h-9 cursor-pointer rounded-[9px] border-0 bg-transparent px-3 text-[13.5px] font-medium text-(--sp-muted) transition-colors duration-150 ease-out hover:bg-(--sp-card)/70 hover:text-(--sp-ink) disabled:cursor-default disabled:opacity-50"
            >
              Cancel
            </button>
            <motion.button
              type="button"
              onClick={() => !busy && !blocked && update({ stack: [], phase: "saving" })}
              aria-disabled={busy || blocked || undefined}
              whileTap={busy || blocked ? undefined : { scale: 0.97 }}
              data-phase={value.phase}
              className="grid h-9 w-[178px] flex-none px-4 cursor-pointer place-items-center overflow-hidden rounded-[9px] border-0 bg-(--sp-accent) text-[13.5px] font-semibold text-(--sp-on-accent) shadow-[0_1px_2px_rgb(0_0_0/0.1)] transition-[background-color,color] duration-300 ease-out hover:brightness-[0.97] aria-disabled:cursor-default aria-disabled:opacity-40 data-[phase=done]:bg-(--sp-good) data-[phase=done]:text-white"
            >
              <span className="flex items-center gap-1.5">
                <ButtonLabel>{buttonLabel(value)}</ButtonLabel>
                <ButtonIcon phase={value.phase} />
              </span>
            </motion.button>
          </footer>
        </section>
      </LayoutGroup>
    </MotionConfig>
  );
}

const START: ScheduleValue = { amount: "1200", scheduled: false, stack: [], date: daysFromToday(1), repeat: "Never", ends: "Never", phase: "edit" };
const PICKED = "2026-11-25";

const ON: ScheduleValue = { ...START, scheduled: true };
const DATES: ScheduleValue = { ...ON, stack: ["date"] };
const DATED: ScheduleValue = { ...ON, date: PICKED };
const REPEAT: ScheduleValue = { ...DATED, stack: ["repeat"] };
const MONTHLY: ScheduleValue = { ...DATED, repeat: "Every month" };
const PASS = 260;
const HOLD = 500;

const BEATS: readonly (ScheduleValue & { ms: number; hover?: string })[] = [
  { ...START, ms: 1400 },
  { ...ON, ms: 900 },
  { ...ON, hover: "date", ms: HOLD },
  { ...DATES, ms: 600 },
  ...QUICK_DATES.map((option) => ({ ...DATES, hover: option.value, ms: PASS })),
  { ...DATES, hover: "calendar", ms: HOLD },
  { ...ON, stack: ["date", "calendar"], ms: 1500 },
  { ...DATED, ms: 800 },
  { ...DATED, hover: "repeat", ms: HOLD },
  { ...REPEAT, ms: 600 },
  ...REPEATS.map((option) => ({ ...REPEAT, hover: option, ms: option === MONTHLY.repeat ? HOLD : PASS })),
  { ...MONTHLY, ms: 1400 },
  { ...MONTHLY, phase: "saving", ms: 800 },
  { ...MONTHLY, phase: "done", ms: 2200 },
];

const beatAt = (step: number): ScheduleValue => {
  const { ms: _ms, hover: _hover, ...state } = BEATS[step]!;
  return { ...state, stack: [...state.stack] };
};

export function ScheduledPaymentDemo({ playing }: { playing?: boolean; preview?: boolean } = {}) {
  const scene = useScene(BEATS, beatAt, playing);
  const { state: value, takeOver, live } = scene;
  const hovered = live ? (BEATS[scene.step]?.hover ?? null) : null;

  useEffect(() => {
    if (live || value.phase === "edit") return;
    const timer = setTimeout(
      () => takeOver((current) => ({ ...current, phase: current.phase === "saving" ? "done" : "edit" })),
      value.phase === "saving" ? 800 : 2200,
    );
    return () => clearTimeout(timer);
  }, [live, value.phase, takeOver]);

  return (
    <div ref={scene.ref} className="not-prose grid w-full place-items-center py-6">
      <ScriptedHoverContext.Provider value={hovered}>
        <ScheduledPayment value={value} onValueChange={takeOver} />
      </ScriptedHoverContext.Provider>
    </div>
  );
}
