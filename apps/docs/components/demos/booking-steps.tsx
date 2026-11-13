"use client";
import { Button } from "@base-ui/react/button";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CalendarAdd01Icon,
  Clock01Icon,
  Loading03Icon,
  Location01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useMeasuredSize } from "./use-measured-size";
import { useScene } from "./use-scene";

const SETTLE = { type: "spring" as const, duration: 0.38, bounce: 0 };
const FLY = { type: "spring" as const, duration: 0.55, bounce: 0.16 };
const SIZE = { type: "spring" as const, duration: 0.5, bounce: 0.08 };

const VISITS = [
  { value: "Check-up", minutes: 20, note: "20 min · Routine" },
  { value: "Follow-up", minutes: 15, note: "15 min · After a visit" },
  { value: "Consultation", minutes: 30, note: "30 min · Something new" },
];

const DAYS = [
  { value: "Mon 17 Nov", weekday: "Mon", date: "17", free: 3 },
  { value: "Tue 18 Nov", weekday: "Tue", date: "18", free: 0 },
  { value: "Wed 19 Nov", weekday: "Wed", date: "19", free: 5 },
  { value: "Thu 20 Nov", weekday: "Thu", date: "20", free: 4 },
  { value: "Fri 21 Nov", weekday: "Fri", date: "21", free: 2 },
];

const TIMES = [
  { value: "9:30 am", free: true },
  { value: "10:00 am", free: false },
  { value: "11:30 am", free: true },
  { value: "1:00 pm", free: true },
  { value: "2:30 pm", free: true },
  { value: "4:00 pm", free: false },
];

const SLOTS = [
  { key: "visit", label: "Visit" },
  { key: "day", label: "Day" },
  { key: "time", label: "Time" },
] as const;

type Slot = (typeof SLOTS)[number]["key"];

const TITLES = ["What's the visit for?", "Which day suits you?", "Pick a time", "Look it over"];

const DOCTOR = {
  name: "Dr. Efua Asante",
  role: "General practitioner",
  seed: "Efua%20Asante",
  tint: "bae6fd",
};
const PLACE = "Ridge Hospital, Accra";

type Transition = { duration: number } | typeof FLY;

function endTime(time: string | undefined, minutes: number) {
  if (!time) return "";

  const [clock, half] = time.split(" ");
  const [hours, mins] = clock!.split(":").map(Number);
  const total = hours! * 60 + mins! + minutes;
  const hour = Math.floor(total / 60);
  const shownHour = hour > 12 ? hour - 12 : hour;

  return `${shownHour}:${String(total % 60).padStart(2, "0")} ${hour >= 12 && half === "am" ? "pm" : half}`;
}

function PickSurface({
  layoutId,
  radius,
  transition,
}: {
  layoutId: string;
  radius: number;
  transition: Transition;
}) {
  return (
    <motion.span
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 bg-(--bks-ink)"
      style={{ borderRadius: radius }}
      transition={transition}
    />
  );
}

const PALETTE = [
  "[--bks-surface:#ffffff] [--bks-ink:#0a0a0b] [--bks-soft:#3f3f46] [--bks-muted:#71717a] [--bks-faint:#a1a1aa] [--bks-well:#f4f4f5]",
  "[--bks-dash:rgb(10_10_11/0.28)] [--bks-good:#16a34a]",
  "dark:[--bks-surface:#18181b] dark:[--bks-ink:#fafafa] dark:[--bks-soft:#d4d4d8] dark:[--bks-muted:#a1a1aa] dark:[--bks-faint:#71717a] dark:[--bks-well:#27272a]",
  "dark:[--bks-dash:rgb(255_255_255/0.32)] dark:[--bks-good:#4ade80]",
].join(" ");

const RING = "focus-visible:shadow-[0_0_0_2px_var(--bks-surface),0_0_0_4px_var(--bks-ink)]";
const OPTION = `group/opt relative cursor-pointer border-0 bg-(--bks-well) p-0 text-(--bks-ink) outline-none transition-[background-color,color,scale] duration-200 active:scale-[0.97] not-data-checked:not-data-disabled:hover:bg-[color-mix(in_oklab,var(--bks-well)_86%,var(--bks-ink))] data-checked:text-(--bks-surface) data-disabled:cursor-default data-disabled:opacity-45 ${RING}`;
const PILL = "relative grid h-9 place-items-center rounded-full px-2 text-[13px] whitespace-nowrap";

function Host() {
  return (
    <header className="flex items-center gap-3">
      <img
        className="flex-none rounded-full"
        src={`https://api.dicebear.com/9.x/notionists/svg?seed=${DOCTOR.seed}&backgroundColor=${DOCTOR.tint}`}
        alt=""
        width={48}
        height={48}
        draggable={false}
      />
      <span className="grid min-w-0 gap-px">
        <span className="truncate text-[17px] leading-[1.25] font-[650] tracking-[-0.02em]">{DOCTOR.name}</span>
        <span className="truncate text-[13px] text-(--bks-muted)">
          {DOCTOR.role} · {PLACE}
        </span>
      </span>
    </header>
  );
}

function Booked({
  day,
  time,
  until,
  reduced,
}: {
  day?: string;
  time?: string;
  until: string;
  reduced: boolean;
}) {
  return (
    <div className="grid justify-items-center gap-1.5 px-2 pt-4 pb-1.5 text-center" role="status">
      <motion.span
        className="mb-2 grid size-14 place-items-center rounded-full bg-(--bks-good) text-white [&_svg]:size-[26px]"
        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.35, delay: 0.12 }}
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} />
      </motion.span>
      <span className="text-[20px] font-[650] tracking-[-0.02em]">You&rsquo;re booked</span>
      <span className="max-w-[270px] text-[13.5px] leading-[1.45] text-(--bks-muted)">
        {day}, {time} – {until}. We&rsquo;ll text you a reminder the day before.
      </span>
      <button
        type="button"
        className="mt-2.5 inline-flex h-10 cursor-pointer items-center gap-[7px] rounded-full border-0 bg-(--bks-well) px-4 text-[13.5px] font-semibold text-(--bks-ink) outline-none focus-visible:shadow-[0_0_0_2px_var(--bks-ink)] [&_svg]:size-4"
      >
        <HugeiconsIcon icon={CalendarAdd01Icon} strokeWidth={1.8} />
        Add to calendar
      </button>
    </div>
  );
}

function Review({
  visit,
  day,
  time,
  until,
  phase,
  reduced,
  onBook,
}: {
  visit?: string;
  day?: string;
  time?: string;
  until: string;
  phase: BookingPhase;
  reduced: boolean;
  onBook: () => void;
}) {
  return (
    <div className="grid gap-3.5">
      <ul className="m-0 grid list-none rounded-[20px] bg-(--bks-well) px-4 py-2 [&_svg]:size-[18px] [&_svg]:flex-none [&_svg]:text-(--bks-muted) [&>li]:flex [&>li]:min-h-10 [&>li]:items-center [&>li]:gap-3 [&>li]:font-medium [&>li]:text-(--bks-soft)">
        <li>
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.8} />
          {day}
        </li>
        <li>
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.8} />
          {time} – {until} · {visit}
        </li>
        <li>
          <HugeiconsIcon icon={Location01Icon} strokeWidth={1.8} />
          {PLACE}, Outpatients
        </li>
      </ul>

      <Button
        className={`grid h-[52px] cursor-pointer place-items-center rounded-full border-0 bg-(--bks-ink) text-[15px] font-[650] text-(--bks-surface) outline-none transition-[scale] duration-150 active:scale-[0.98] aria-busy:cursor-progress ${RING}`}
        onClick={() => phase === "choosing" && onBook()}
        aria-busy={phase === "booking" || undefined}
        aria-disabled={phase === "booking" || undefined}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {phase === "booking" ? (
            <motion.span
              key="spinner"
              className="grid place-items-center [&_svg]:size-[19px] [&_svg]:animate-spin motion-reduce:[&_svg]:[animation-duration:2.4s]"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={SETTLE}
            >
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} />
              <span className="sr-only">Booking</span>
            </motion.span>
          ) : (
            <motion.span key="label" exit={{ opacity: 0, filter: "blur(3px)" }} transition={SETTLE}>
              Confirm booking
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </div>
  );
}

export type BookingPhase = "choosing" | "booking" | "booked";

export interface BookingStepsProps {
  step: number;
  onStepChange: (step: number) => void;
  visit?: string;
  day?: string;
  time?: string;
  onChoose: (slot: Slot, value: string) => void;
  phase: BookingPhase;
  onBook: () => void;
}

export function BookingSteps({
  step,
  onStepChange,
  visit,
  day,
  time,
  onChoose,
  phase,
  onBook,
}: BookingStepsProps) {
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const [content, size] = useMeasuredSize<HTMLDivElement>();

  const values: Record<Slot, string | undefined> = { visit, day, time };
  const fly = reduced ? { duration: 0 } : FLY;
  const minutes = VISITS.find((item) => item.value === visit)?.minutes ?? 20;
  const until = endTime(time, minutes);

  const enter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 20, filter: "blur(5px)" },
        animate: { opacity: 1, x: 0, filter: "blur(0px)" },
        exit: { opacity: 0, x: -20, filter: "blur(5px)", transition: { duration: 0.16 } },
      };

  const surface = (slot: Slot, radius: number) => (
    <PickSurface layoutId={`${id}-pick-${slot}`} radius={radius} transition={fly} />
  );

  const option = (
    slot: Slot,
    value: string,
    radius: number,
    className: string,
    bodyClassName: string,
    body: ReactNode,
    disabled = false,
  ) => (
    <Radio.Root key={value} value={value} disabled={disabled} className={`${OPTION} ${className}`}>
      {values[slot] === value && surface(slot, radius)}
      <span className={`relative grid h-full ${bodyClassName}`}>{body}</span>
    </Radio.Root>
  );

  const slotChips = SLOTS.map(({ key, label }, index) => {
    const value = values[key];
    const filled = value !== undefined && step !== index;

    return (
      <span key={key} role="listitem" className="grid">
        {filled ? (
          <button
            type="button"
            className={`${PILL} cursor-pointer border-0 bg-transparent font-semibold text-(--bks-surface) outline-none focus-visible:shadow-[0_0_0_2px_var(--bks-well),0_0_0_4px_var(--bks-ink)] disabled:cursor-default`}
            disabled={phase !== "choosing"}
            aria-label={`${label}: ${value}. Change`}
            onClick={() => onStepChange(index)}
          >
            {surface(key, 999)}
            <motion.span
              className="relative"
              initial={reduced ? false : { opacity: 0, filter: "blur(3px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ ...SETTLE, delay: 0.22 }}
            >
              {value}
            </motion.span>
          </button>
        ) : (
          <span
            data-active={(step === index && phase === "choosing") || undefined}
            className={`${PILL} font-medium text-(--bks-faint) transition-colors duration-200 data-active:text-(--bks-ink)`}
          >
            {label}
          </span>
        )}
      </span>
    );
  });

  const choices = (
    <>
      {step === 0 && (
        <RadioGroup
          className="grid gap-2"
          aria-label="Visit"
          value={visit ?? null}
          onValueChange={(value) => onChoose("visit", value as string)}
        >
          {VISITS.map((item) =>
            option(
              "visit",
              item.value,
              18,
              "h-[62px] rounded-[18px]",
              "content-center justify-items-start gap-0.5 px-4 text-left",
              <>
                <span className="text-[15px] font-[650] tracking-[-0.015em]">{item.value}</span>
                <span className="text-[12.5px] text-(--bks-muted) transition-colors duration-200 group-data-checked/opt:text-white/65">
                  {item.note}
                </span>
              </>,
            ),
          )}
        </RadioGroup>
      )}

      {step === 1 && (
        <RadioGroup
          className="grid grid-cols-5 gap-1.5"
          aria-label="Day"
          value={day ?? null}
          onValueChange={(value) => onChoose("day", value as string)}
        >
          {DAYS.map((item) =>
            option(
              "day",
              item.value,
              18,
              "h-[86px] rounded-[18px]",
              "content-center justify-items-center gap-0.5",
              <>
                <span className="text-[12px] font-semibold text-(--bks-muted) transition-colors duration-200 group-data-checked/opt:text-white/70">
                  {item.weekday}
                </span>
                <span className="text-[22px] font-[650] tracking-[-0.03em] group-data-disabled/opt:text-(--bks-muted)">
                  {item.date}
                </span>
                <span className="text-[11px] font-semibold text-(--bks-good) transition-colors duration-200 group-data-checked/opt:text-white/70 group-data-disabled/opt:text-(--bks-muted)">
                  {item.free ? `${item.free} free` : "Full"}
                </span>
              </>,
              item.free === 0,
            ),
          )}
        </RadioGroup>
      )}

      {step === 2 && (
        <RadioGroup
          className="grid grid-cols-3 gap-2"
          aria-label={`Time on ${day}`}
          value={time ?? null}
          onValueChange={(value) => onChoose("time", value as string)}
        >
          {TIMES.map((item) =>
            option(
              "time",
              item.value,
              14,
              "h-12 rounded-[14px] data-disabled:text-(--bks-muted) data-disabled:line-through data-disabled:decoration-(--bks-dash)",
              "place-items-center",
              <span className="text-[14px] font-semibold tabular-nums">{item.value}</span>,
              !item.free,
            ),
          )}
        </RadioGroup>
      )}

      {step === 3 && (
        <Review
          visit={visit}
          day={day}
          time={time}
          until={until}
          phase={phase}
          reduced={reduced}
          onBook={onBook}
        />
      )}
    </>
  );

  return (
    <section
      className={`grid w-[min(100%,380px)] gap-5 rounded-[32px] bg-(--bks-surface) p-5 text-[14px] tracking-[-0.006em] text-(--bks-ink) ${PALETTE}`}
      aria-label={`Book an appointment with ${DOCTOR.name}`}
    >
      <LayoutGroup id={id}>
        <Host />

        <div className="grid grid-cols-3 gap-1.5 rounded-full bg-(--bks-well) p-1.5" role="list" aria-label="Your booking">
          {slotChips}
        </div>

        <motion.div
          className="-mx-1 overflow-hidden px-1"
          initial={false}
          animate={size ? { height: size.height } : undefined}
          transition={reduced ? { duration: 0 } : SIZE}
        >
          <div ref={content} className="relative pb-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={phase === "booked" ? "booked" : step}
                className="grid gap-3.5"
                {...enter}
                transition={SETTLE}
              >
                {phase === "booked" ? (
                  <Booked day={day} time={time} until={until} reduced={reduced} />
                ) : (
                  <>
                    <span className="grid gap-0.5">
                      <span className="text-[12.5px] font-medium text-(--bks-muted)">
                        {step < 3 ? `Step ${step + 1} of 3` : "Almost done"}
                      </span>
                      <span className="text-[17px] font-[650] tracking-[-0.02em]">{TITLES[step]}</span>
                    </span>
                    {choices}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </LayoutGroup>
    </section>
  );
}

interface State {
  step: number;
  visit?: string;
  day?: string;
  time?: string;
  phase: BookingPhase;
}

const BEAT = 320;
const REQUEST = 1000;

const A: State = { step: 0, phase: "choosing" };
const BEATS: readonly (State & { ms: number })[] = [
  { ...A, ms: 1400 },
  { ...A, visit: "Check-up", ms: 550 },
  { ...A, step: 1, visit: "Check-up", ms: 1300 },
  { ...A, step: 1, visit: "Check-up", day: "Thu 20 Nov", ms: 550 },
  { ...A, step: 2, visit: "Check-up", day: "Thu 20 Nov", ms: 1300 },
  { ...A, step: 2, visit: "Check-up", day: "Thu 20 Nov", time: "2:30 pm", ms: 550 },
  { ...A, step: 3, visit: "Check-up", day: "Thu 20 Nov", time: "2:30 pm", ms: 1700 },
  { step: 3, visit: "Check-up", day: "Thu 20 Nov", time: "2:30 pm", phase: "booking", ms: REQUEST },
  { step: 3, visit: "Check-up", day: "Thu 20 Nov", time: "2:30 pm", phase: "booked", ms: 3000 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const STILL: State = { step: 2, visit: "Check-up", day: "Thu 20 Nov", phase: "choosing" };

interface BookingStepsDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function BookingStepsDemo({ playing, preview }: BookingStepsDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver, live } = scene;
  const state = preview && !playing ? STILL : scene.state;
  const advance = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(advance.current), []);

  useEffect(() => {
    if (live || preview || state.phase !== "booking") return;
    const timer = setTimeout(() => takeOver((current) => ({ ...current, phase: "booked" })), REQUEST);
    return () => clearTimeout(timer);
  }, [state.phase, live, preview, takeOver]);

  return (
    <div ref={ref} className="not-prose grid w-full place-items-center font-sans antialiased">
      <BookingSteps
        step={state.step}
        onStepChange={(step) => takeOver((current) => ({ ...current, step }))}
        visit={state.visit}
        day={state.day}
        time={state.time}
        onChoose={(slot, value) => {
          takeOver((current) => ({ ...current, [slot]: value }));
          clearTimeout(advance.current);
          advance.current = setTimeout(
            () =>
              takeOver((current) => {
                const unfilled = [current.visit, current.day, current.time].findIndex(
                  (choice) => choice === undefined,
                );
                return { ...current, step: unfilled === -1 ? 3 : unfilled };
              }),
            BEAT,
          );
        }}
        phase={state.phase}
        onBook={() => takeOver((current) => ({ ...current, phase: "booking" }))}
      />
    </div>
  );
}
