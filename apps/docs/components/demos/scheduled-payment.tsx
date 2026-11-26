"use client";

import { Switch } from "@base-ui/react/switch";
import {
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
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { createContext, type KeyboardEvent, type ReactNode, useContext, useEffect, useId, useState } from "react";
import { DayPicker } from "react-day-picker";
import { useMeasuredHeight } from "./use-measured-height";
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

type Patch = Partial<ScheduleValue>;

const TODAY = "2026-11-18";
const BALANCE = 4210.08;
const PEEK = 7;
const SWITCHING_FOR = 650;
const PHASE_TIME = { saving: 800, done: 2200 };

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

// A view reopened just after its exit has nothing to return to without a resting state, and stays invisible.
const SHOWN = { opacity: 1, filter: "blur(0px)", transition: QUICK };
const GONE = { opacity: 0, filter: "blur(4px)", transition: QUICK };

const rise = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.97, y: 4, filter: "blur(3px)" },
  animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { ...ARRIVE, delay: Math.min(delay, 0.1) } },
  exit: GONE,
});

const THEME = [
  "[--sp-shell:#efefef] [--sp-card:#ffffff] [--sp-ink:#111111] [--sp-muted:#757575] [--sp-faint:#c7c7c7]",
  "[--sp-line:rgb(0_0_0/0.07)] [--sp-hover:#f4f4f4] [--sp-good:#15803d] [--sp-bad:#dc2626] [--sp-accent:var(--sp-ink)] [--sp-on-accent:var(--sp-card)]",
  "dark:[--sp-shell:#171717] dark:[--sp-card:#1f1f1f] dark:[--sp-ink:#f4f4f4] dark:[--sp-muted:#a3a3a3]",
  "dark:[--sp-faint:#4a4a4a] dark:[--sp-line:rgb(255_255_255/0.07)] dark:[--sp-hover:#2a2a2a] dark:[--sp-good:#4ade80] dark:[--sp-bad:#f87171]",
  "[--sp-glass:rgb(255_255_255/0.82)] [--sp-glass-line:rgb(0_0_0/0.05)] dark:[--sp-glass:rgb(255_255_255/0.07)] dark:[--sp-glass-line:rgb(255_255_255/0.08)]",
].join(" ");

const RING = "focus-visible:ring-2 focus-visible:ring-(--sp-ink) focus-visible:ring-offset-2";
const TEXT = "inline-block whitespace-nowrap";
const FLAT = "bg-transparent shadow-[0_0_0_1px_transparent,0_1px_2px_transparent]";
const GLASS =
  "bg-(--sp-glass) shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_0_0_1px_var(--sp-glass-line),0_10px_28px_-14px_rgb(0_0_0/0.22)] backdrop-blur-xl backdrop-saturate-150 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_var(--sp-glass-line),0_10px_28px_-14px_rgb(0_0_0/0.6)]";

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

const ScriptedHoverContext = createContext<string | null>(null);

function useChangedRecently(value: unknown, duration: number) {
  const [recently, setRecently] = useState(false);

  useEffect(() => {
    setRecently(true);

    const timer = setTimeout(() => setRecently(false), duration);

    return () => clearTimeout(timer);
  }, [value, duration]);

  return recently;
}

function Strong({ children }: { children: ReactNode }) {
  return <b className="font-semibold text-(--sp-ink)">{children}</b>;
}

const BUTTON_ICONS: Record<Phase, IconSvgElement> = { edit: ArrowRight01Icon, saving: Loading03Icon, done: Tick02Icon };
const SETTING_ICONS: Record<Setting, IconSvgElement> = { date: Calendar03Icon, repeat: RepeatIcon, ends: StopCircleIcon };

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

function amountCharacters(raw: string) {
  const text = formatAmount(raw);
  const point = text.includes(".") ? text.indexOf(".") : text.length;
  let digit = 0;

  if (!text) return [{ key: "zero", character: "0" }];

  return [...text].map((character, index) => {
    if (character === ",") return { key: `comma-${point - index}`, character };
    if (character === ".") return { key: "point", character };

    return { key: `digit-${digit++}-${character}`, character };
  });
}

function AmountDigits({ value, caret, selected }: { value: string; caret: boolean; selected: boolean }) {
  return (
    <span
      className="relative inline-flex items-baseline rounded-[10px] transition-[background-color] duration-150 ease-out data-selected:bg-(--sp-ink)/10"
      data-selected={selected || undefined}
      aria-hidden="true"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {amountCharacters(value).map(({ key, character }) => (
          <motion.span
            key={key}
            layout="position"
            className={`inline-block ${key === "zero" ? "text-(--sp-faint)" : ""}`}
            initial={{ opacity: 0, y: "40%", filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: "-30%", filter: "blur(3px)", transition: { duration: 0.12 } }}
            transition={ARRIVE}
          >
            {character}
          </motion.span>
        ))}
      </AnimatePresence>

      {caret && (
        <motion.span
          layout="position"
          transition={ARRIVE}
          className="ml-[3px] inline-block h-[44px] w-[3px] animate-caret-blink self-center rounded-full bg-(--sp-ink) motion-reduce:animate-none"
        />
      )}
    </span>
  );
}

function AmountInput({ value, over, disabled, onChange }: { value: string; over: boolean; disabled: boolean; onChange: (value: string) => void }) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(false);

  const keepCaretAtEnd = (field: HTMLInputElement) => {
    const end = field.value.length;
    const all = end > 0 && field.selectionStart === 0 && field.selectionEnd === end;

    setSelected(all);

    if (!all && (field.selectionStart !== end || field.selectionEnd !== end)) field.setSelectionRange(end, end);
  };

  return (
    <label htmlFor={id} className="grid min-w-0 flex-1 cursor-text gap-1.5 max-[370px]:self-stretch">
      <span className="text-[12.5px] font-medium text-(--sp-muted)">Amount</span>

      <span
        className="relative flex h-14 items-baseline text-[52px] leading-[52px] font-semibold tracking-[-0.04em] tabular-nums transition-colors duration-150 data-over:text-(--sp-bad)"
        data-over={over || undefined}
      >
        <span className="mr-1 text-[28px] tracking-[-0.02em] text-(--sp-muted)">£</span>

        <AmountDigits value={value} caret={focused && !disabled && !selected} selected={focused && selected} />

        <input
          id={id}
          value={formatAmount(value)}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={over || undefined}
          aria-label="Amount in pounds"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setSelected(false);
          }}
          onSelect={(event) => keepCaretAtEnd(event.currentTarget)}
          onChange={(event) => {
            setSelected(false);
            onChange(cleanAmount(event.target.value));
          }}
          className="absolute inset-0 w-full cursor-text border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent outline-none selection:bg-transparent"
        />
      </span>
    </label>
  );
}

function ScheduleSwitch({ checked, disabled, onCheckedChange }: { checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
  const id = useId();

  const tile = checked
    ? `bg-(--sp-hover) shadow-[0_1px_2px_transparent] ${disabled ? "" : "group-hover/switch:bg-[color-mix(in_oklab,var(--sp-hover),var(--sp-ink)_6%)]"}`
    : "bg-(--sp-card) shadow-[0_1px_2px_rgb(0_0_0/0.06)]";

  return (
    <label
      htmlFor={id}
      className={`group/switch flex cursor-pointer items-center gap-3 rounded-[20px] py-3 pr-3.5 pl-3 transition-[background-color] duration-150 ease-out has-disabled:cursor-default ${checked || disabled ? "" : "hover:bg-(--sp-hover)"}`}
    >
      <span
        className={`grid size-9 flex-none place-items-center rounded-[10px] max-[370px]:hidden transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${tile}`}
        aria-hidden="true"
      >
        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.8} className="size-[18px]" />
      </span>

      <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-0.5">
        <span className="text-[14px] font-semibold">Schedule for later</span>

        <Remold.Text className="text-[12.5px] whitespace-nowrap text-(--sp-muted) max-[480px]:hidden">
          {checked ? "Choose when it goes, and if it repeats" : "Off · sends right away"}
        </Remold.Text>

        <Remold.Text className="hidden overflow-x-clip text-[12.5px] whitespace-nowrap text-(--sp-muted) max-[480px]:block">
          {checked ? "Set a date and repeat" : "Off · sends right away"}
        </Remold.Text>
      </span>

      <Switch.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className={`relative flex h-6 w-[42px] flex-none cursor-pointer items-center rounded-full border-0 bg-(--sp-faint) p-[3px] transition-[background-color] duration-200 ease-out outline-none data-checked:bg-(--sp-accent) data-disabled:cursor-default data-disabled:opacity-60 ${RING}`}
      >
        <Switch.Thumb className="block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.22)] transition-[translate,width] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-active/switch:w-[22px] data-checked:translate-x-[18px] group-active/switch:data-checked:translate-x-[14px] motion-reduce:transition-none dark:data-checked:bg-(--sp-card)" />
      </Switch.Root>
    </label>
  );
}

function SettingRow({ setting, value, disabled, onOpen }: { setting: Setting; value: string; disabled: boolean; onOpen: (view: View) => void }) {
  const scripted = useContext(ScriptedHoverContext) === setting;
  const index = Object.keys(SETTING_ICONS).indexOf(setting);

  return (
    <motion.button
      {...rise(index * 0.025)}
      type="button"
      disabled={disabled}
      onClick={() => onOpen(setting)}
      data-hovered={scripted || undefined}
      className={`group flex h-12 w-full cursor-pointer items-center gap-3 border-0 border-t border-solid border-(--sp-line) bg-transparent px-3.5 max-[480px]:gap-2.5 max-[480px]:px-3 text-left text-[14px] text-(--sp-ink) transition-[background-color] duration-150 ease-out hover:bg-(--sp-ink)/4 disabled:cursor-default data-hovered:bg-(--sp-ink)/4 ${RING}`}
    >
      <HugeiconsIcon
        icon={SETTING_ICONS[setting]}
        strokeWidth={1.9}
        className="size-[17px] flex-none text-(--sp-muted) transition-colors duration-150 group-hover:text-(--sp-ink) group-data-hovered:text-(--sp-ink) max-[370px]:hidden"
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1 whitespace-nowrap">
        <motion.span layoutId={`title-${setting}`} className="inline-block text-(--sp-muted)">
          {TITLES[setting]}
        </motion.span>
      </span>

      <span className="flex flex-none items-center gap-1.5 font-semibold">
        <Remold.Text className={TEXT}>{value}</Remold.Text>
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
      className={`relative flex h-9 w-full cursor-pointer items-center gap-3 rounded-[8px] border-0 bg-transparent px-2.5 max-[480px]:gap-2 max-[480px]:px-2 text-left text-[14px] text-(--sp-ink) outline-none data-[opens]:font-medium ${RING}`}
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

      <span className="relative min-w-0 flex-1 whitespace-nowrap">
        {opens ? (
          <motion.span layoutId={`title-${opens}`} className="inline-block">
            {label}
          </motion.span>
        ) : (
          label
        )}
      </span>

      {detail && <span className="relative flex-none text-[13px] text-(--sp-muted) tabular-nums max-[370px]:hidden">{detail}</span>}

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

function Options({
  label,
  options,
  picked,
  onPick,
  children,
}: {
  label: string;
  options: string[];
  picked: string;
  onPick: (option: string) => void;
  children?: ReactNode;
}) {
  return (
    <HoverList label={label}>
      {options.map((option, index) => (
        <ListItem key={option} id={option} index={index} label={option} picked={picked === option} onPress={() => onPick(option)} />
      ))}

      {children}
    </HoverList>
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

const MONTH_BUTTON = `grid size-8 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent transition-colors duration-150 hover:bg-(--sp-hover) disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent ${RING}`;

const CALENDAR_CLASSES = {
  root: "relative",
  months: "grid grid-cols-[minmax(0,1fr)]",
  month: "grid grid-cols-[minmax(0,1fr)] gap-1",
  month_caption: "flex h-8 items-center px-2 text-[13px] font-semibold",
  nav: "absolute top-0 right-0 flex gap-1",
  button_previous: MONTH_BUTTON,
  button_next: MONTH_BUTTON,
  chevron: "size-4 fill-(--sp-muted)",
  month_grid: "w-full table-fixed border-collapse",
  weekday: "h-7 p-0 text-center text-[11.5px] font-semibold text-(--sp-muted)",
  day: "p-0 py-0.5 text-center",
  day_button:
    "mx-auto grid aspect-square w-full max-w-8 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent p-0 text-[13.5px] text-(--sp-ink) tabular-nums transition-colors duration-150 hover:bg-(--sp-hover) focus-visible:ring-2 focus-visible:ring-(--sp-ink)",
  selected: "[&>button]:bg-(--sp-ink) [&>button]:font-semibold [&>button]:text-(--sp-card) [&>button]:hover:bg-(--sp-ink)",
  today: "[&>button]:font-semibold",
  disabled: "[&>button]:cursor-default [&>button]:text-(--sp-faint) [&>button]:hover:bg-transparent",
  outside: "invisible",
};

function MonthCalendar({ value, onPick }: { value: string; onPick: (date: string) => void }) {
  const firstDay = toDate(daysFromToday(1));

  return (
    <motion.div className="px-3 pb-3 max-[480px]:px-1.5" {...rise(0.06)}>
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

function Choices({ view, value, onChoose, onOpen }: { view: View; value: ScheduleValue; onChoose: (patch: Patch) => void; onOpen: (view: View) => void }) {
  if (view === "calendar") return <MonthCalendar value={value.date} onPick={(date) => onChoose({ date })} />;

  if (view === "custom") return <Options label="Custom repeat" options={CUSTOM_REPEATS} picked={value.repeat} onPick={(repeat) => onChoose({ repeat })} />;

  if (view === "ends") return <Options label="Ends" options={ENDS} picked={value.ends} onPick={(ends) => onChoose({ ends })} />;

  if (view === "repeat") {
    const custom = CUSTOM_REPEATS.includes(value.repeat);

    return (
      <Options label="Repeats" options={REPEATS} picked={value.repeat} onPick={(repeat) => onChoose({ repeat })}>
        <Divider />
        <ListItem
          id="custom"
          index={REPEATS.length}
          label="Custom"
          detail={custom ? value.repeat.replace("Every ", "") : undefined}
          opens="custom"
          onPress={() => onOpen("custom")}
        />
      </Options>
    );
  }

  const quick = QUICK_DATES.some((option) => option.value === value.date);

  return (
    <HoverList label="Start date">
      {QUICK_DATES.map((option, index) => (
        <ListItem
          key={option.value}
          id={option.value}
          index={index}
          label={option.label}
          detail={shortDate(option.value)}
          picked={value.date === option.value}
          onPress={() => onChoose({ date: option.value })}
        />
      ))}

      <Divider />
      <ListItem id="calendar" index={QUICK_DATES.length} label="Pick a date" detail={quick ? undefined : shortDate(value.date)} opens="calendar" onPress={() => onOpen("calendar")} />
    </HoverList>
  );
}

function ChoicesHeader({ view, onBack }: { view: View; onBack: () => void }) {
  return (
    <div className="flex h-12 items-center gap-2 px-2.5">
      <motion.button
        {...rise(0.02)}
        type="button"
        onClick={onBack}
        aria-label="Back"
        whileTap={{ scale: 0.92 }}
        className={`grid size-8 cursor-pointer place-items-center rounded-[10px] border-0 bg-(--sp-hover) text-(--sp-ink) ${RING}`}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-4" aria-hidden="true" />
      </motion.button>

      <motion.span layoutId={`title-${view}`} className="text-[14px] font-semibold">
        {TITLES[view]}
      </motion.span>
    </div>
  );
}

function Settings({ value, total, disabled, onOpen }: { value: ScheduleValue; total: number; disabled: boolean; onOpen: (view: View) => void }) {
  const repeats = value.repeat === "Never" ? "" : `, then ${value.repeat.toLowerCase()}`;
  const ends = value.repeat === "Never" || value.ends === "Never" ? "" : ` for ${value.ends.replace("After ", "").toLowerCase()}`;

  return (
    <div>
      <SettingRow setting="date" value={shortDate(value.date)} disabled={disabled} onOpen={onOpen} />
      <SettingRow setting="repeat" value={value.repeat} disabled={disabled} onOpen={onOpen} />

      <Reveal show={value.repeat !== "Never"}>
        <SettingRow setting="ends" value={value.ends} disabled={disabled} onOpen={onOpen} />
      </Reveal>

      <motion.p className="m-0 border-0 border-t border-solid border-(--sp-line) px-3.5 pt-3 pb-1.5 text-[13px] leading-[1.5] text-(--sp-muted)" {...rise(0.06)}>
        Bentil gets <Strong>{pounds(total)}</Strong> on{" "}
        <Strong>
          <Remold.Text className={TEXT}>{shortDate(value.date)}</Remold.Text>
        </Strong>
        {repeats}
        {ends}.
      </motion.p>
    </div>
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
            className="absolute h-8 rounded-t-[14px] bg-(--sp-glass) shadow-[inset_0_0_0_1px_var(--sp-glass-line)] backdrop-blur-md"
            style={{
              top: index * PEEK,
              left: level * 10,
              right: level * 10,
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

function Stack({
  value,
  total,
  disabled,
  onOpen,
  onBack,
  onChoose,
}: {
  value: ScheduleValue;
  total: number;
  disabled: boolean;
  onOpen: (view: View) => void;
  onBack: () => void;
  onChoose: (patch: Patch) => void;
}) {
  const [content, height] = useMeasuredHeight();
  const view = value.stack.at(-1) ?? "settings";
  const switching = useChangedRecently(view, SWITCHING_FOR);
  const depth = value.stack.length;

  return (
    <motion.div className="relative" initial={false} animate={{ paddingTop: Math.min(depth, 2) * PEEK }} transition={SPRING}>
      <StackEdges depth={depth} />

      <motion.div
        className={`relative overflow-hidden rounded-[14px] transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${view === "settings" ? FLAT : GLASS}`}
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
              animate={SHOWN}
              exit={GONE}
            >
              {view === "settings" ? (
                <Settings value={value} total={total} disabled={disabled} onOpen={onOpen} />
              ) : (
                <>
                  <ChoicesHeader view={view} onBack={onBack} />
                  <Choices view={view} value={value} onChoose={onChoose} onOpen={onOpen} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Payee() {
  return (
    <header className="flex items-center gap-3 px-5 pt-5 max-[480px]:px-4">
      <img
        className="size-9 rounded-full bg-[#e7e4dc]"
        src="https://api.dicebear.com/9.x/notionists/svg?seed=Bentil%20Andoh&backgroundColor=e7e4dc"
        alt=""
        draggable={false}
      />

      <span className="grid min-w-0 flex-1 gap-px">
        <span className="truncate text-[14.5px] font-semibold">Pay Bentil Andoh</span>
        <span className="truncate text-[12.5px] text-(--sp-muted)">
          Rent · <span className="max-[480px]:hidden">Current account </span>•• 4410
        </span>
      </span>

      <button
        type="button"
        aria-label="Pay from Personal account"
        className={`flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-[9px] border-0 bg-(--sp-hover) px-2.5 text-[13px] font-medium text-(--sp-ink) transition-colors duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--sp-hover),var(--sp-ink)_6%)] ${RING}`}
      >
        <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.9} className="size-3.5 text-(--sp-muted)" aria-hidden="true" />
        <span className="max-[480px]:hidden">Personal</span>
      </button>
    </header>
  );
}

function Balance({ total, over }: { total: number; over: boolean }) {
  return (
    <span className="grid min-w-[112px] flex-none justify-items-end pb-1 text-[12.5px] leading-[1.4] text-(--sp-muted) tabular-nums max-[370px]:justify-items-start max-[370px]:pb-0">
      <Remold.Text className={`${TEXT} ${over ? "text-(--sp-bad)" : ""}`}>{over ? "Not enough funds" : "Balance after"}</Remold.Text>

      <span className={`font-medium transition-colors duration-150 ${over ? "text-(--sp-bad)" : "text-(--sp-ink)"}`}>
        {over ? `${pounds(BALANCE, true)} available` : pounds(BALANCE - total, true)}
      </span>
    </span>
  );
}

function buttonLabel(value: ScheduleValue) {
  if (value.phase === "saving") return value.scheduled ? "Scheduling" : "Paying";
  if (value.phase === "done") return value.scheduled ? "Scheduled" : "Paid";

  return value.scheduled ? "Schedule payment" : "Pay now";
}

function PayButton({ value, disabled, onPay }: { value: ScheduleValue; disabled: boolean; onPay: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onPay()}
      aria-disabled={disabled || undefined}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      data-phase={value.phase}
      className={`grid h-9 w-[178px] flex-none px-4 cursor-pointer place-items-center overflow-hidden max-[480px]:w-auto max-[480px]:min-w-0 max-[480px]:flex-1 max-[480px]:px-3 rounded-[9px] border-0 bg-(--sp-accent) text-[13.5px] font-semibold text-(--sp-on-accent) shadow-[0_1px_2px_rgb(0_0_0/0.1)] transition-[background-color,color] duration-300 ease-out hover:brightness-[0.97] aria-disabled:cursor-default aria-disabled:opacity-40 data-[phase=done]:bg-(--sp-good) data-[phase=done]:text-white ${RING}`}
    >
      <span className="flex items-center gap-1.5">
        <Remold.Text className={TEXT}>{buttonLabel(value)}</Remold.Text>

        <span className={`grid size-4 [&_svg]:size-4 ${value.phase === "saving" ? "animate-spin motion-reduce:[animation-duration:2.4s]" : ""}`}>
          <Remold.Icon icon={<HugeiconsIcon icon={BUTTON_ICONS[value.phase]} />} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </span>
    </motion.button>
  );
}

export function ScheduledPayment({ value, onValueChange }: { value: ScheduleValue; onValueChange: (value: ScheduleValue) => void }) {
  const group = useId();
  const busy = value.phase !== "edit";
  const total = Number(value.amount || 0);
  const over = total > BALANCE;
  const blocked = total <= 0 || over;

  const update = (patch: Patch) => onValueChange({ ...value, ...patch });

  const open = (next: View) => {
    if (!value.stack.includes(next)) update({ stack: [...value.stack, next] });
  };

  const back = () => update({ stack: value.stack.slice(0, -1) });

  const choose = (patch: Patch) => update({ ...patch, stack: [] });

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || value.stack.length === 0) return;

    event.preventDefault();
    back();
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <LayoutGroup id={group}>
        <section
          className={`grid w-[min(100%,448px)] grid-cols-[minmax(0,1fr)] rounded-[26px] bg-(--sp-shell) p-1.5 font-sans text-(--sp-ink) antialiased ${THEME}`}
          aria-label="Pay rent"
          onKeyDown={onKeyDown}
        >
          <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[21px] border border-white/20 bg-white/75 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_0_0_1px_rgb(0_0_0/0.035),0_6px_14px_rgb(0_0_0/0.06)] backdrop-blur-lg dark:border-white/8 dark:bg-white/6 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.05),0_6px_14px_rgb(0_0_0/0.35)]">
            <Payee />

            <div className="flex items-end justify-between gap-3 px-5 pt-6 pb-5 max-[480px]:px-4 max-[370px]:flex-col max-[370px]:items-start">
              <AmountInput value={value.amount} over={over} disabled={busy} onChange={(amount) => update({ amount })} />
              <Balance total={total} over={over} />
            </div>

            <div className="mx-5 mb-5 grid grid-cols-[minmax(0,1fr)] max-[480px]:mx-3 max-[480px]:mb-3">
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
                        <Stack value={value} total={total} disabled={busy} onOpen={open} onBack={back} onChoose={choose} />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Reveal show={!value.scheduled}>
                <p className="m-0 px-1 pt-3 text-[13px] leading-[1.5] text-(--sp-muted)">
                  Bentil gets <Strong>{pounds(total)}</Strong> in a few seconds.
                </p>
              </Reveal>
            </div>
          </div>

          <footer className="flex items-center gap-3 px-3.5 pt-2.5 pb-1 max-[480px]:gap-2 max-[480px]:px-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-(--sp-muted) max-[480px]:hidden">
              Paying from <Strong>Personal</Strong>
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={() => update({ stack: [], scheduled: false, repeat: "Never", ends: "Never", date: daysFromToday(1) })}
              className={`h-9 flex-none cursor-pointer rounded-[9px] border-0 bg-transparent px-3 text-[13.5px] font-medium text-(--sp-muted) max-[480px]:px-2.5 transition-colors duration-150 ease-out hover:bg-(--sp-card)/70 hover:text-(--sp-ink) disabled:cursor-default disabled:opacity-50 ${RING}`}
            >
              Cancel
            </button>

            <PayButton value={value} disabled={busy || blocked} onPay={() => update({ stack: [], phase: "saving" })} />
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
  { ...MONTHLY, phase: "saving", ms: PHASE_TIME.saving },
  { ...MONTHLY, phase: "done", ms: PHASE_TIME.done },
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
      PHASE_TIME[value.phase],
    );

    return () => clearTimeout(timer);
  }, [live, value.phase, takeOver]);

  return (
    <div ref={scene.ref} className="not-prose grid w-full grid-cols-[minmax(0,1fr)] place-items-center py-6">
      <ScriptedHoverContext.Provider value={hovered}>
        <ScheduledPayment value={value} onValueChange={takeOver} />
      </ScriptedHoverContext.Provider>
    </div>
  );
}
