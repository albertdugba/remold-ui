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
import "./event-rsvp.css";

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
  when: "December · Date and time TBC",
  where: "Ghana · Venue TBC",
  month: "Dec",
  day: "—",
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

const part = (delay = 0) => ({
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay },
  },
  exit: { opacity: 0, y: -4, transition: QUICK },
});

function MainButton({ face, onClick }: { face: Face; onClick: () => void }) {
  const label =
    face === "done" ? "Done" : face === "saving" ? "Saving" : face === "sheet" ? "Confirm" : "RSVP";
  return (
    <Button
      className="rsvp-main"
      data-face={face}
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
      <motion.span layout className="rsvp-main-label">
        <Remold.Text>{label}</Remold.Text>
      </motion.span>
      {face === "saving" && (
        <Progress.Root className="rsvp-progress" value={null} aria-label="Saving your answer">
          <Progress.Track className="rsvp-progress-track">
            <Progress.Indicator className="rsvp-progress-bar" />
          </Progress.Track>
        </Progress.Root>
      )}
    </Button>
  );
}

function SheetHeader({ closeDisabled, onClose }: { closeDisabled: boolean; onClose: () => void }) {
  return (
    <motion.header className="rsvp-head" {...part(0.02)}>
      <span className="rsvp-date" aria-hidden="true">
        <span>{EVENT.month}</span>
        <b>{EVENT.day}</b>
      </span>
      <span className="rsvp-head-copy">
        <b>{EVENT.name}</b>
        <span>{EVENT.when}</span>
        <span>{EVENT.where}</span>
      </span>
      <Button className="rsvp-close" aria-label="Close" disabled={closeDisabled} onClick={onClose}>
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} aria-hidden="true" />
      </Button>
    </motion.header>
  );
}

function SpotsLeft() {
  return (
    <motion.div className="rsvp-count" {...part(0.05)}>
      <span className="rsvp-count-label">
        {SPOTS - GOING} spots left
        <Tooltip.Root>
          <Tooltip.Trigger className="rsvp-info" aria-label="About the evening">
            <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} aria-hidden="true" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="rsvp-tooltip">
                Demo RSVP for the DevCongress December meetup in Ghana. Date, venue, and attendance figures
                are placeholders.
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </span>
      <b>{GOING} going</b>
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
      className="rsvp-options"
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
          className="rsvp-option"
          render={<motion.button type="button" {...part(0.08 + index * 0.035)} />}
        >
          {answer === option.id && <motion.span layoutId="rsvp-pick" className="rsvp-pick" />}
          <span className="rsvp-option-icon">
            <HugeiconsIcon icon={option.icon} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="rsvp-option-copy">
            <b>{option.label}</b>
            <span>{option.detail}</span>
          </span>
          <Radio.Indicator className="rsvp-radio-dot" />
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
      className="rsvp-remind"
      data-disabled={dimmed || undefined}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      render={<motion.button type="button" {...part(0.2)} />}
    >
      <span className="rsvp-checkbox-box" aria-hidden="true">
        <Checkbox.Indicator className="rsvp-checkbox-mark">
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} aria-hidden="true" />
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
    { term: "Going", detail: <Odometer value={String(going)} /> },
    { term: "Reminder", detail: reminder ? "An hour before" : "None" },
  ];

  return (
    <>
      <motion.span
        className="rsvp-mark"
        initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0, transition: { ...SPRING, bounce: 0.4, delay: 0.08 } }}
        exit={{ opacity: 0, scale: 0.8, transition: QUICK }}
      >
        <HugeiconsIcon icon={result.mark} strokeWidth={2.4} aria-hidden="true" />
      </motion.span>

      <motion.div className="rsvp-done-head" {...part(0.12)}>
        <b>{result.title}</b>
        <span>{result.line}</span>
      </motion.div>

      <motion.dl className="rsvp-lines" {...part(0.18)}>
        {lines.map((line, index) => (
          <Fragment key={line.term}>
            {index > 0 && <Separator className="rsvp-separator" />}
            <div>
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
        <div className="rsvp-stage not-prose">
          <motion.div
            ref={tray}
            className="rsvp"
            data-face={face}
            initial={false}
            animate={
              size
                ? { width: size.width, height: size.height, borderRadius: face === "button" ? 26 : 28 }
                : undefined
            }
          >
            <div ref={content} className="rsvp-content">
              <AnimatePresence mode="popLayout" initial={false}>
                {open && (
                  <motion.div
                    key="sheet"
                    className="rsvp-face rsvp-sheet"
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
                    <MainButton face={face} onClick={press} />
                  </motion.div>
                )}

                {face === "done" && (
                  <motion.div key="done" className="rsvp-face rsvp-done" data-answer={answer} role="status">
                    <Summary answer={answer} going={going} reminder={remind && answer !== "no"} />
                    <MainButton face={face} onClick={press} />
                  </motion.div>
                )}

                {face === "button" && (
                  <motion.div key="button" className="rsvp-face">
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
