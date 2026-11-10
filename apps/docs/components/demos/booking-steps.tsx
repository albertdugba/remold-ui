"use client";
import { Button } from "@base-ui/react/button";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CalendarAdd01Icon,
  Clock01Icon,
  Hospital01Icon,
  Loading03Icon,
  Location01Icon,
  StethoscopeIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useMeasuredSize } from "./use-measured-size";
import { useScene } from "./use-scene";
import "./booking-steps.css";

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
      className="bks-pick"
      style={{ borderRadius: radius }}
      transition={transition}
    />
  );
}

function Host() {
  return (
    <>
      <header className="bks-host">
        <img
          src={`https://api.dicebear.com/9.x/notionists/svg?seed=${DOCTOR.seed}&backgroundColor=${DOCTOR.tint}`}
          alt=""
          width={52}
          height={52}
          draggable={false}
        />
        <span className="bks-host-copy">
          <span className="bks-host-kicker">Book an appointment with</span>
          <span className="bks-host-name">{DOCTOR.name}</span>
          <span className="bks-host-role">{DOCTOR.role}</span>
        </span>
      </header>

      <div className="bks-meta">
        <span>
          <HugeiconsIcon icon={Hospital01Icon} strokeWidth={1.8} />
          {PLACE}
        </span>
        <span>
          <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.8} />
          In person
        </span>
      </div>
    </>
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
    <div className="bks-done" role="status">
      <motion.span
        className="bks-done-badge"
        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.35, delay: 0.12 }}
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} />
      </motion.span>
      <span className="bks-done-title">You&rsquo;re booked</span>
      <span className="bks-done-detail">
        {day}, {time} – {until}. We&rsquo;ll text you a reminder the day before.
      </span>
      <button type="button" className="bks-ghost">
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
    <div className="bks-review">
      <ul className="bks-lines">
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
        className="bks-book"
        onClick={() => phase === "choosing" && onBook()}
        aria-busy={phase === "booking" || undefined}
        aria-disabled={phase === "booking" || undefined}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {phase === "booking" ? (
            <motion.span
              key="spinner"
              className="bks-spinner"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={SETTLE}
            >
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} />
              <span className="bks-sr">Booking</span>
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
    body: ReactNode,
    disabled = false,
  ) => (
    <Radio.Root key={value} value={value} disabled={disabled} className={className}>
      {values[slot] === value && surface(slot, radius)}
      <span className="bks-option-body">{body}</span>
    </Radio.Root>
  );

  const slotChips = SLOTS.map(({ key, label }, index) => {
    const value = values[key];
    const filled = value !== undefined && step !== index;

    return (
      <span key={key} role="listitem" className="bks-slot">
        {filled ? (
          <button
            type="button"
            className="bks-chip"
            disabled={phase !== "choosing"}
            aria-label={`${label}: ${value}. Change`}
            onClick={() => onStepChange(index)}
          >
            {surface(key, 999)}
            <motion.span
              className="bks-chip-text"
              initial={reduced ? false : { opacity: 0, filter: "blur(3px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ ...SETTLE, delay: 0.22 }}
            >
              {value}
            </motion.span>
          </button>
        ) : (
          <span
            className="bks-placeholder"
            data-active={(step === index && phase === "choosing") || undefined}
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
          className="bks-visits"
          aria-label="Visit"
          value={visit ?? null}
          onValueChange={(value) => onChoose("visit", value as string)}
        >
          {VISITS.map((item) =>
            option(
              "visit",
              item.value,
              18,
              "bks-visit",
              <>
                <span className="bks-visit-name">{item.value}</span>
                <span className="bks-visit-note">{item.note}</span>
              </>,
            ),
          )}
        </RadioGroup>
      )}

      {step === 1 && (
        <RadioGroup
          className="bks-days"
          aria-label="Day"
          value={day ?? null}
          onValueChange={(value) => onChoose("day", value as string)}
        >
          {DAYS.map((item) =>
            option(
              "day",
              item.value,
              18,
              "bks-day",
              <>
                <span className="bks-day-weekday">{item.weekday}</span>
                <span className="bks-day-date">{item.date}</span>
                <span className="bks-day-free">{item.free ? `${item.free} free` : "Full"}</span>
              </>,
              item.free === 0,
            ),
          )}
        </RadioGroup>
      )}

      {step === 2 && (
        <RadioGroup
          className="bks-times"
          aria-label={`Time on ${day}`}
          value={time ?? null}
          onValueChange={(value) => onChoose("time", value as string)}
        >
          {TIMES.map((item) =>
            option(
              "time",
              item.value,
              14,
              "bks-time",
              <span className="bks-time-text">{item.value}</span>,
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
    <section className="bks" aria-label={`Book an appointment with ${DOCTOR.name}`}>
      <LayoutGroup id={id}>
        <Host />

        <div className="bks-slots" role="list" aria-label="Your booking">
          {slotChips}
        </div>

        <motion.div
          className="bks-panel"
          initial={false}
          animate={size ? { height: size.height } : undefined}
          transition={reduced ? { duration: 0 } : SIZE}
        >
          <div ref={content} className="bks-panel-content">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={phase === "booked" ? "booked" : step}
                className="bks-step"
                {...enter}
                transition={SETTLE}
              >
                {phase === "booked" ? (
                  <Booked day={day} time={time} until={until} reduced={reduced} />
                ) : (
                  <>
                    <span className="bks-step-head">
                      <span className="bks-step-count">
                        {step < 3 ? `Step ${step + 1} of 3` : "Almost done"}
                      </span>
                      <span className="bks-step-title">{TITLES[step]}</span>
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
    <div ref={ref} className="bks-demo not-prose">
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
