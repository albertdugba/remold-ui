"use client";

import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Progress } from "@base-ui/react/progress";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Separator } from "@base-ui/react/separator";
import { Tooltip } from "@base-ui/react/tooltip";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  HelpCircleIcon,
  InformationCircleIcon,
  Tick02Icon,
  UserCheck01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";

import { Odometer } from "./odometer";
import { useMeasuredSize } from "./use-measured-size";
import { useScript } from "./use-script";

type Face = "button" | "sheet" | "saving" | "done";
type Answer = "going" | "maybe" | "no";

interface Option {
  id: Answer;
  label: string;
  detail: string;
  icon: IconSvgElement;
}

const OPTIONS: Option[] = [
  {
    id: "going",
    label: "Going",
    detail: "Save me a spot",
    icon: UserCheck01Icon,
  },
  {
    id: "maybe",
    label: "Maybe",
    detail: "Remind me closer to the day",
    icon: HelpCircleIcon,
  },
  {
    id: "no",
    label: "Can’t go",
    detail: "Let the host know",
    icon: UserRemove01Icon,
  },
];

const EVENT = {
  name: "DevCongress December Meetup",
  when: "Saturday 19 December",
  where: "Accra Digital Centre",
  month: "Dec",
  day: "19",
};
const GOING = 38;
const SPOTS = 50;
const SAVING_FOR = 1300;

const RESULTS: Record<Answer, { mark: IconSvgElement; title: string; line: string }> = {
  going: {
    mark: Tick02Icon,
    title: "You’re in",
    line: `Spot #${GOING + 1} of ${SPOTS}`,
  },
  maybe: {
    mark: HelpCircleIcon,
    title: "Marked as maybe",
    line: "We’ll check in closer to the meetup",
  },
  no: {
    mark: UserRemove01Icon,
    title: "Thanks for letting them know",
    line: "The host can offer your spot to someone else",
  },
};

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
const QUICK = { duration: 0.14 };
const ROUND = { borderRadius: 999 };

const PALETTE = [
  "[--rsvp-surface:#ffffff] [--rsvp-well:#f4f4f5] [--rsvp-line:rgb(24_24_27/0.08)] [--rsvp-ink:#18181b] [--rsvp-muted:#71717a] [--rsvp-good:#16a34a]",
  "dark:[--rsvp-surface:#1f1f23] dark:[--rsvp-well:#2a2a2f] dark:[--rsvp-line:rgb(255_255_255/0.08)] dark:[--rsvp-ink:#fafafa] dark:[--rsvp-muted:#a1a1aa] dark:[--rsvp-good:#22c55e]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rsvp-ink)";
const PANEL = "grid w-[min(340px,calc(100vw-64px))] gap-3 p-4";
const UNCHECKED_RING = "shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--rsvp-ink)_22%,transparent)]";

const part = (delay = 0) => ({
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay },
  },
  exit: { opacity: 0, y: -4, transition: QUICK },
});

function MainButton({ face, wide, onClick }: { face: Face; wide?: boolean; onClick: () => void }) {
  const label =
    face === "done" ? "Done" : face === "saving" ? "Saving" : face === "sheet" ? "Confirm" : "RSVP";
  return (
    <Button
      data-face={face}
      data-wide={wide || undefined}
      className={`relative grid h-[52px] cursor-pointer place-items-center overflow-clip border-0 bg-(--rsvp-ink) px-[26px] text-[15px] font-semibold whitespace-nowrap text-(--rsvp-surface) transition-[background-color] duration-300 data-disabled:cursor-default data-wide:w-full data-[face=done]:bg-(--rsvp-well) data-[face=done]:text-(--rsvp-ink) ${FOCUS}`}
      disabled={face === "saving"}
      onClick={onClick}
      render={
        <motion.button
          layoutId="rsvp-main"
          style={ROUND}
          whileTap={{ scale: face === "saving" ? 1 : 0.97 }}
        />
      }
    >
      <motion.span layout className="inline-block">
        <Remold.Text>{label}</Remold.Text>
      </motion.span>
      {face === "saving" && (
        <Progress.Root className="absolute right-[18px] bottom-[9px] left-[18px]" value={null} aria-label="Saving your answer">
          <Progress.Track className="h-[3px] overflow-hidden rounded-[2px] bg-[color-mix(in_oklab,var(--rsvp-surface)_22%,transparent)]">
            <Progress.Indicator className="h-full w-2/5 animate-indeterminate rounded-[2px] bg-(--rsvp-surface) motion-reduce:w-full motion-reduce:animate-none" />
          </Progress.Track>
        </Progress.Root>
      )}
    </Button>
  );
}

function SheetHeader({ closeDisabled, onClose }: { closeDisabled: boolean; onClose: () => void }) {
  return (
    <motion.header className="flex items-start gap-2.5" {...part(0.02)}>
      <span
        className="grid h-12 w-11 flex-none place-content-center place-items-center overflow-clip rounded-xl bg-(--rsvp-well) leading-none"
        aria-hidden="true"
      >
        <span className="text-[10.5px] font-bold tracking-[0.06em] text-[#e5484d] uppercase">{EVENT.month}</span>
        <b className="mt-[3px] text-[19px] font-bold tracking-[-0.02em]">{EVENT.day}</b>
      </span>
      <span className="grid flex-1 leading-[1.3] [&>span]:text-[12.5px] [&>span]:text-(--rsvp-muted)">
        <b className="text-[14px] font-[650]">{EVENT.name}</b>
        <span>{EVENT.when}</span>
        <span>{EVENT.where}</span>
      </span>
      <Button
        className={`grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-(--rsvp-well) p-0 text-(--rsvp-muted) data-disabled:cursor-default data-disabled:opacity-40 max-[480px]:-mt-1.5 max-[480px]:-mr-1.5 max-[480px]:size-11 ${FOCUS}`}
        aria-label="Close"
        disabled={closeDisabled}
        onClick={onClose}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} className="size-[15px]" aria-hidden="true" />
      </Button>
    </motion.header>
  );
}

function SpotsLeft() {
  return (
    <motion.div className="flex items-center justify-between rounded-[14px] bg-(--rsvp-well) px-3 py-2.5" {...part(0.05)}>
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-(--rsvp-muted)">
        {SPOTS - GOING} spots left
        <Tooltip.Root>
          <Tooltip.Trigger
            className={`grid cursor-help place-items-center border-0 bg-transparent p-0 text-inherit ${FOCUS}`}
            aria-label="About this event"
          >
            <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="rounded-lg bg-[var(--rsvp-ink,#18181b)] px-[9px] py-1.5 font-sans text-[12px] font-medium text-white transition-[opacity,scale] duration-150 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0">
                Demo RSVP for the DevCongress December meetup at the Accra Digital Centre. The attendance
                figures are placeholders.
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </span>
      <b className="text-[15px] font-[650] tracking-[-0.01em] tabular-nums">{GOING} going</b>
    </motion.div>
  );
}

function AnswerOptions({
  answer,
  disabled,
  onChange,
}: {
  answer: Answer;
  disabled: boolean;
  onChange: (answer: Answer) => void;
}) {
  return (
    <RadioGroup
      className="grid gap-0.5"
      aria-label="Your answer"
      value={answer}
      disabled={disabled}
      onValueChange={(value) => onChange(value as Answer)}
    >
      {OPTIONS.map((option, index) => (
        <Radio.Root
          key={option.id}
          nativeButton
          value={option.id}
          className={`relative flex h-[54px] cursor-pointer touch-manipulation items-center gap-[11px] rounded-[14px] border-0 bg-transparent pr-3 pl-2.5 text-left text-inherit [-webkit-tap-highlight-color:transparent] after:pointer-events-none after:absolute after:right-3 after:z-2 after:size-5 after:rounded-full after:shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--rsvp-ink)_22%,transparent)] after:transition-shadow after:duration-160 after:ease-out after:content-[''] data-checked:after:shadow-[inset_0_0_0_6px_var(--rsvp-ink)] [&>*]:relative [&>*]:z-1 [&>span]:pointer-events-none`}
          render={<motion.button type="button" {...part(0.08 + index * 0.035)} />}
        >
          {answer === option.id && (
            <motion.span layoutId="rsvp-pick" className="absolute! inset-0 z-0! rounded-[14px] bg-(--rsvp-well)" />
          )}
          <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-(--rsvp-surface) shadow-[inset_0_0_0_1px_var(--rsvp-line)]">
            <HugeiconsIcon icon={option.icon} strokeWidth={1.8} className="size-[17px]" aria-hidden="true" />
          </span>
          <span className="grid flex-1 leading-[1.3]">
            <b className="text-[13.5px] font-semibold">{option.label}</b>
            <span className="text-[12px] text-(--rsvp-muted)">{option.detail}</span>
          </span>
          <Radio.Indicator className="hidden" />
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

function RemindCheckbox({
  checked,
  disabled,
  dimmed,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  dimmed: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox.Root
      nativeButton
      data-disabled={dimmed || undefined}
      className="group/remind flex min-h-11 w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-3 pt-0.5 pb-1 text-left text-[12.5px] text-(--rsvp-muted) data-disabled:cursor-default data-disabled:opacity-45"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      render={<motion.button type="button" {...part(0.2)} />}
    >
      <span
        className={`pointer-events-none grid size-[18px] flex-none place-items-center rounded-md bg-(--rsvp-surface) ${UNCHECKED_RING} transition-[background-color,box-shadow] duration-150 group-data-checked/remind:bg-(--rsvp-ink) group-data-checked/remind:shadow-none`}
        aria-hidden="true"
      >
        <Checkbox.Indicator className="grid size-3 place-items-center text-(--rsvp-surface)">
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} className="block size-3" aria-hidden="true" />
        </Checkbox.Indicator>
      </span>
      <span>Remind me an hour before</span>
    </Checkbox.Root>
  );
}

function Summary({ answer, going, reminder }: { answer: Answer; going: number; reminder: boolean }) {
  const result = RESULTS[answer];
  const lines = [
    { term: "Event", detail: EVENT.name },
    { term: "When", detail: EVENT.when },
    { term: "Where", detail: EVENT.where },
    { term: "Going", detail: <Odometer value={String(going)} /> },
    { term: "Reminder", detail: reminder ? "An hour before" : "None" },
  ];

  return (
    <>
      <motion.span
        data-answer={answer}
        className="mt-2 grid size-[52px] place-items-center rounded-full bg-(--rsvp-good) text-white data-[answer=maybe]:bg-[#f59e0b] data-[answer=no]:bg-(--rsvp-muted) [&_svg]:size-[26px]"
        initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0, transition: { ...SPRING, bounce: 0.4, delay: 0.08 } }}
        exit={{ opacity: 0, scale: 0.8, transition: QUICK }}
      >
        <HugeiconsIcon icon={result.mark} strokeWidth={2.4} aria-hidden="true" />
      </motion.span>

      <motion.div className="grid gap-0.5" {...part(0.12)}>
        <b className="text-[22px] font-[650] tracking-[-0.02em]">{result.title}</b>
        <span className="text-[13px] text-(--rsvp-muted)">{result.line}</span>
      </motion.div>

      <motion.dl
        className="my-1 grid w-full rounded-2xl bg-(--rsvp-well) px-3.5 py-1 text-left text-[13px] [&_dd]:m-0 [&_dd]:font-[550] [&_dt]:text-(--rsvp-muted)"
        {...part(0.18)}
      >
        {lines.map((line, index) => (
          <Fragment key={line.term}>
            {index > 0 && <Separator className="h-px bg-(--rsvp-line)" />}
            <div className="flex justify-between gap-3 py-2.5">
              <dt>{line.term}</dt>
              <dd>{line.detail}</dd>
            </div>
          </Fragment>
        ))}
      </motion.dl>
    </>
  );
}

export function EventRsvpDemo({ playing }: { playing?: boolean } = {}) {
  const [face, setFace] = useState<Face>("button");
  const [answer, setAnswer] = useState<Answer>("going");
  const [remind, setRemind] = useState(true);
  const [going, setGoing] = useState(GOING);
  const tray = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [content, size] = useMeasuredSize<HTMLDivElement>();

  const open = face === "sheet" || face === "saving";
  const saving = face === "saving";

  useEffect(() => () => clearTimeout(timer.current), []);

  const confirm = () => {
    setFace("saving");
    timer.current = setTimeout(() => {
      setFace("done");
      timer.current = setTimeout(() => setGoing(answer === "going" ? GOING + 1 : GOING), 450);
    }, SAVING_FOR);
  };

  const reset = () => {
    setFace("button");
    setGoing(GOING);
  };

  const press = () => {
    if (face === "button") setFace("sheet");
    else if (face === "sheet") confirm();
    else if (face === "done") reset();
  };

  const live = useScript(tray, playing, [
    [1300, () => setFace("sheet")],
    [700, () => setAnswer("maybe")],
    [700, () => setAnswer("going")],
    [SAVING_FOR + 2400, confirm],
    [
      1200,
      () => {
        reset();
        setRemind(true);
      },
    ],
  ]);

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <Tooltip.Provider delay={250}>
        <div className={`not-prose grid min-h-[560px] w-full place-items-center font-sans text-(--rsvp-ink) ${PALETTE}`}>
          <motion.div
            ref={tray}
            data-face={face}
            className="relative overflow-clip bg-(--rsvp-surface) data-[face=button]:bg-transparent"
            initial={false}
            animate={
              size
                ? { width: size.width, height: size.height, borderRadius: face === "button" ? 26 : 28 }
                : undefined
            }
          >
            <div ref={content} className="relative w-max">
              <AnimatePresence mode="popLayout" initial={false}>
                {open && (
                  <motion.div
                    key="sheet"
                    className={PANEL}
                    role="group"
                    aria-label={`RSVP to ${EVENT.name}`}
                  >
                    <SheetHeader closeDisabled={saving || live} onClose={() => setFace("button")} />
                    <SpotsLeft />
                    <AnswerOptions answer={answer} disabled={saving} onChange={setAnswer} />
                    <RemindCheckbox
                      checked={remind && answer !== "no"}
                      disabled={saving || answer === "no"}
                      dimmed={answer === "no"}
                      onChange={setRemind}
                    />
                    <MainButton face={face} wide onClick={press} />
                  </motion.div>
                )}

                {face === "done" && (
                  <motion.div key="done" className={`${PANEL} justify-items-center text-center`} role="status">
                    <Summary answer={answer} going={going} reminder={remind && answer !== "no"} />
                    <MainButton face={face} wide onClick={press} />
                  </motion.div>
                )}

                {face === "button" && (
                  <motion.div key="button" className="grid">
                    <MainButton face={face} onClick={press} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </Tooltip.Provider>
    </MotionConfig>
  );
}
