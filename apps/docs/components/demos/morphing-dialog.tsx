"use client";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, RepeatIcon, Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { typing, useScene } from "./use-scene";

const SURFACE = { type: "spring" as const, duration: 0.5, bounce: 0.12 };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };

const INK = "#0a0a0b";
const PAPER = "#ffffff";

const COLOURS = {
  light: { button: INK, sheet: PAPER },
  dark: { button: "#fafafa", sheet: "#1f1f23" },
};

const SURFACE_CLASS = "pointer-events-none absolute inset-0";
const FIELD = "grid gap-[7px]";
const LABEL = "text-[13px] font-medium text-(--mdg-ink)";
const BUTTON =
  "grid h-9 cursor-pointer place-items-center rounded-full border-0 px-4 text-[13.5px] font-semibold whitespace-nowrap outline-none transition-[background-color,opacity,scale] duration-150 not-disabled:active:scale-[0.97] focus-visible:shadow-[0_0_0_2px_var(--mdg-surface),0_0_0_4px_var(--mdg-ink)] disabled:cursor-default disabled:opacity-40";

function useColours() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark ? COLOURS.dark : COLOURS.light;
}

const FREQUENCIES = ["Daily", "Weekdays", "Weekly", "Monthly"] as const;
type Frequency = (typeof FREQUENCIES)[number];

export interface Habit {
  name: string;
  frequency: Frequency;
  surface?: number;
}

export interface MorphingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  frequency: Frequency;
  onFrequencyChange: (frequency: Frequency) => void;
  creating: boolean;
  onCreate: () => void;
  surface: number;
  container?: HTMLElement | null;
  modal?: boolean;
}

export function MorphingDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  frequency,
  onFrequencyChange,
  creating,
  onCreate,
  surface,
  container,
  modal = true,
}: MorphingDialogProps) {
  const colours = useColours();
  const reduced = useReducedMotion();
  const id = useId();
  const canCreate = name.trim().length > 0 && !creating;
  const nameField = useRef<HTMLInputElement>(null);

  const fade = (delay = 0) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, y: 6, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { ...SETTLE, delay },
        };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} modal={modal}>
      <Dialog.Trigger
        data-open={open || undefined}
        className="relative inline-grid h-9 cursor-pointer rounded-full border-0 bg-transparent pr-[15px] pl-3 text-[13.5px] font-semibold text-white outline-none focus-visible:shadow-[0_0_0_2px_var(--mdg-surface),0_0_0_4px_var(--mdg-ink)] dark:text-[#0a0a0b]"
      >
        {!open && (
          <motion.span
            layoutId={`mdg-surface-${surface}`}
            className={SURFACE_CLASS}
            initial={false}
            style={{ borderRadius: 999, backgroundColor: colours.button }}
            transition={reduced ? { duration: 0 } : SURFACE}
          />
        )}
        <motion.span
          className="relative inline-flex items-center gap-1.5 whitespace-nowrap [&_svg]:size-[15px]"
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: open ? 0.08 : 0.2, delay: open ? 0 : 0.18 }}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2.2} />
          New habit
        </motion.span>
      </Dialog.Trigger>

      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[rgb(10_10_11/0.18)] backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-300 ease-out in-data-mdg-stage:absolute in-data-mdg-stage:-inset-[2000px] in-data-mdg-stage:bg-[rgb(10_10_11/0.14)] data-ending-style:opacity-0 data-ending-style:backdrop-blur-none data-starting-style:opacity-0 data-starting-style:backdrop-blur-none motion-reduce:transition-opacity motion-reduce:duration-150" />
        <Dialog.Popup
          className="fixed inset-0 z-41 m-auto h-fit w-[min(400px,calc(100%-32px))] text-(--mdg-ink) outline-none in-data-mdg-stage:absolute"
          aria-describedby={`${id}-description`}
          initialFocus={modal ? nameField : false}
        >
          <motion.span
            layoutId={`mdg-surface-${surface}`}
            className={`${SURFACE_CLASS} shadow-[0_0_0_1px_var(--mdg-line),0_2px_4px_rgb(0_0_0/0.04),0_24px_48px_-16px_rgb(0_0_0/0.22)]`}
            animate={{ backgroundColor: [colours.button, colours.sheet] }}
            style={{ borderRadius: 28 }}
            transition={reduced ? { duration: 0 } : { ...SURFACE, backgroundColor: { duration: 0.25 } }}
          />
          <form
            className="relative grid gap-[18px] p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (canCreate) onCreate();
            }}
          >
            <motion.div className="flex items-start gap-3" {...fade(0.22)}>
              <span
                className="grid size-[38px] flex-none place-items-center rounded-[14px] bg-(--mdg-well) text-(--mdg-ink) [&_svg]:size-[19px]"
                aria-hidden="true"
              >
                <HugeiconsIcon icon={RepeatIcon} strokeWidth={1.8} />
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <Dialog.Title className="m-0 text-[15px] font-semibold tracking-[-0.01em]">New habit</Dialog.Title>
                <Dialog.Description
                  id={`${id}-description`}
                  className="m-0 text-[13px] leading-[1.4] text-(--mdg-muted)"
                >
                  Name it and pick how often. Reminders can come later.
                </Dialog.Description>
              </span>
              <Dialog.Close
                className="-mt-1 -mr-1 grid size-[30px] flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--mdg-muted) outline-none transition-colors duration-150 hover:bg-(--mdg-well) hover:text-(--mdg-ink) focus-visible:shadow-[0_0_0_2px_var(--mdg-ink)] [&_svg]:size-[15px]"
                aria-label="Close"
                disabled={creating}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Dialog.Close>
            </motion.div>

            <motion.div {...fade(0.26)}>
              <Field.Root className={FIELD}>
                <Field.Label className={LABEL}>Habit</Field.Label>
                <Field.Control
                  ref={nameField}
                  className="h-[42px] rounded-2xl border-[1.8px] border-solid border-(--mdg-input-line) bg-(--mdg-surface) px-3 text-[15px] text-(--mdg-ink) outline-none transition-[border-color] duration-[180ms] placeholder:text-(--mdg-muted) focus:border-(--mdg-ink)"
                  placeholder="What do you want to do?"
                  autoComplete="off"
                  value={name}
                  readOnly={creating}
                  onChange={(event) => onNameChange(event.target.value)}
                />
              </Field.Root>
            </motion.div>

            <motion.div className={FIELD} {...fade(0.3)}>
              <span className={LABEL} id={`${id}-frequency`}>
                How often
              </span>
              <ToggleGroup
                className="grid grid-cols-4 gap-0.5 rounded-2xl bg-(--mdg-well) p-[3px]"
                aria-labelledby={`${id}-frequency`}
                value={[frequency]}
                disabled={creating}
                onValueChange={(next) => {
                  const picked = (next as Frequency[])[0];
                  if (picked) onFrequencyChange(picked);
                }}
              >
                {FREQUENCIES.map((option) => (
                  <Toggle
                    key={option}
                    value={option}
                    className="relative h-[34px] cursor-pointer rounded-[13px] border-0 bg-transparent p-0 text-[13px] font-medium text-(--mdg-muted) outline-none transition-colors duration-[180ms] focus-visible:shadow-[inset_0_0_0_2px_var(--mdg-ink)] data-pressed:text-(--mdg-ink)"
                  >
                    {frequency === option && (
                      <motion.span
                        layoutId={`${id}-frequency`}
                        className="absolute inset-0 rounded-[inherit] bg-(--mdg-surface) shadow-[0_0_0_1px_var(--mdg-line),0_1px_2px_rgb(0_0_0/0.06)]"
                        transition={reduced ? { duration: 0 } : SETTLE}
                      />
                    )}
                    <span className="relative">{option}</span>
                  </Toggle>
                ))}
              </ToggleGroup>
            </motion.div>

            <motion.div className="flex justify-end gap-2 pt-0.5" {...fade(0.34)}>
              <Dialog.Close
                className={`${BUTTON} min-w-[78px] bg-transparent text-(--mdg-muted) enabled:hover:bg-(--mdg-well) enabled:hover:text-(--mdg-ink)`}
                disabled={creating}
              >
                Cancel
              </Dialog.Close>
              <Button
                type="submit"
                className={`${BUTTON} min-w-32 bg-(--mdg-ink) text-(--mdg-surface) aria-busy:cursor-progress aria-busy:opacity-100!`}
                disabled={!name.trim()}
                aria-busy={creating || undefined}
                aria-disabled={creating || undefined}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {creating ? (
                    <motion.span
                      key="spinner"
                      className="grid place-items-center [&_svg]:size-4 [&_svg]:animate-spin motion-reduce:[&_svg]:[animation-duration:2.4s]"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0 }}
                      transition={SETTLE}
                    >
                      <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} />
                      <span className="sr-only">Adding</span>
                    </motion.span>
                  ) : (
                    <motion.span key="label" exit={{ opacity: 0, filter: "blur(3px)" }} transition={SETTLE}>
                      Add habit
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HabitRow({ habit, fresh }: { habit: Habit; fresh: boolean }) {
  const colours = useColours();
  const reduced = useReducedMotion();
  return (
    <motion.li
      className="relative"
      data-fresh={fresh || undefined}
      layout="position"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={SETTLE}
    >
      {habit.surface !== undefined ? (
        <motion.span
          layoutId={`mdg-surface-${habit.surface}`}
          className={SURFACE_CLASS}
          initial={false}
          style={{ borderRadius: 14, backgroundColor: colours.sheet }}
          transition={reduced ? { duration: 0 } : SURFACE}
        />
      ) : (
        <span className={`${SURFACE_CLASS} rounded-[14px]`} />
      )}
      <motion.span
        className="relative flex h-12 items-center gap-3 px-3"
        initial={fresh && !reduced ? { opacity: 0, filter: "blur(4px)" } : false}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: fresh ? 0.28 : 0 }}
      >
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{habit.name}</span>
        <span className="text-[12.5px] text-(--mdg-muted)">{habit.frequency}</span>
        {fresh && (
          <span className="h-5 rounded-full bg-[#dcfce7] px-[7px] text-[11px] leading-5 font-semibold text-[#15803d]">
            New
          </span>
        )}
      </motion.span>
    </motion.li>
  );
}

const STARTING: Habit[] = [
  { name: "Morning run", frequency: "Daily" },
  { name: "Read 20 pages", frequency: "Weekdays" },
];

interface State {
  open: boolean;
  name: string;
  frequency: Frequency;
  creating: boolean;
  made: Habit[];
}

const REQUEST = 1000;

const CLOSED: State = { open: false, name: "", frequency: "Daily", creating: false, made: [] };
const OPEN: State = { ...CLOSED, open: true };
const NAMED: State = { ...OPEN, name: "Call Mum" };

const BEATS: readonly (State & { ms: number })[] = [
  { ...CLOSED, ms: 1400 },
  { ...OPEN, ms: 900 },
  ...typing("Call Mum", (name) => ({ ...OPEN, name }), { every: 70, hold: 500 }),
  { ...NAMED, frequency: "Weekly", ms: 900 },
  { ...NAMED, frequency: "Weekly", creating: true, ms: REQUEST },
  { ...CLOSED, made: [{ name: "Call Mum", frequency: "Weekly", surface: 0 }], ms: 2800 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const STILL: State = { ...CLOSED, made: [{ name: "Call Mum", frequency: "Weekly", surface: 0 }] };

interface MorphingDialogDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function MorphingDialogDemo({ playing, preview }: MorphingDialogDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver, live } = scene;
  const state = preview && !playing ? STILL : scene.state;
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (live || preview || !state.creating) return;
    const timer = setTimeout(
      () =>
        takeOver((current) => ({
          ...CLOSED,
          frequency: current.frequency,
          made: [
            { name: current.name.trim(), frequency: current.frequency, surface: current.made.length },
            ...current.made,
          ],
        })),
      REQUEST,
    );
    return () => clearTimeout(timer);
  }, [state.creating, live, preview, takeOver]);

  const habits = [...state.made, ...STARTING];

  return (
    <div ref={ref} className="not-prose grid w-full place-items-center font-sans antialiased">
      <div
        ref={setStage}
        data-mdg-stage=""
        className="grid min-h-[460px] w-full place-items-center text-[14px] text-(--mdg-ink) [--mdg-ink:#0a0a0b] [--mdg-input-line:rgb(10_10_11/0.12)] [--mdg-line:rgb(10_10_11/0.08)] [--mdg-muted:#71717a] [--mdg-surface:#ffffff] [--mdg-well:#f4f4f5] dark:[--mdg-ink:#fafafa] dark:[--mdg-input-line:rgb(255_255_255/0.14)] dark:[--mdg-line:rgb(255_255_255/0.1)] dark:[--mdg-muted:#a1a1aa] dark:[--mdg-surface:#1f1f23] dark:[--mdg-well:#2a2a2f]"
      >
        <LayoutGroup>
          <section className="w-[min(100%,380px)] rounded-[22px] bg-(--mdg-surface) p-2" aria-label="Habits">
            <header className="flex items-center justify-between gap-3 pt-1.5 pr-1.5 pb-2.5 pl-2.5">
              <span className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
                Habits{" "}
                <span className="inline-grid h-5 min-w-[22px] place-items-center rounded-full bg-(--mdg-well) px-1.5 text-[12px] font-semibold text-(--mdg-muted) tabular-nums">
                  {habits.length}
                </span>
              </span>
              <span onPointerDownCapture={() => setModal(true)} onKeyDownCapture={() => setModal(true)}>
                <MorphingDialog
                  open={state.open}
                  onOpenChange={(open) => takeOver((current) => ({ ...current, open, creating: false }))}
                  name={state.name}
                  onNameChange={(name) => takeOver((current) => ({ ...current, name }))}
                  frequency={state.frequency}
                  onFrequencyChange={(frequency) => takeOver((current) => ({ ...current, frequency }))}
                  creating={state.creating}
                  onCreate={() => takeOver((current) => ({ ...current, creating: true }))}
                  surface={state.made.length}
                  container={stage}
                  modal={modal}
                />
              </span>
            </header>
            <ul className="m-0 grid list-none gap-1 p-0">
              <AnimatePresence initial={false}>
                {habits.map((habit, index) => (
                  <HabitRow
                    key={habit.name + (habit.surface ?? "")}
                    habit={habit}
                    fresh={habit.surface !== undefined && index === 0}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        </LayoutGroup>
      </div>
    </div>
  );
}
