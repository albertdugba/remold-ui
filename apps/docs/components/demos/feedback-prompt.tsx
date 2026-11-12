"use client";
import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Loading03Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useEffect, useId, useRef, type Ref } from "react";
import { useMeasuredSize } from "./use-measured-size";
import { typing, useScene } from "./use-scene";

export type Rating = "up" | "down";

const SIZE = { type: "spring" as const, duration: 0.5, bounce: 0.1 };
const SETTLE = { type: "spring" as const, duration: 0.38, bounce: 0 };
const FLY = { type: "spring" as const, duration: 0.55, bounce: 0.22 };

const REASONS: Record<Rating, string[]> = {
  up: ["Clear", "Accurate", "Good examples", "Saved me time"],
  down: ["Hard to follow", "Missing info", "Inaccurate", "Too long"],
};

const TITLES: Record<Rating, string> = {
  up: "What helped most?",
  down: "What was off?",
};

export interface FeedbackPromptProps {
  rating: Rating | null;
  onRatingChange: (rating: Rating | null) => void;
  reasons: string[];
  onReasonsChange: (reasons: string[]) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  sending?: boolean;
  sent: boolean;
  onSend: () => void;
  question?: string;
}

type Phase = "idle" | "form" | "thanks";
type Size = { width: number; height: number } | null;

const EXIT = { duration: 0.1, ease: "easeOut" as const };

function fadeIn(reduced: boolean, delay = 0) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.12 },
    };
  }

  return {
    initial: { opacity: 0, y: 4, scale: 0.98, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.98, filter: "blur(3px)", transition: EXIT },
    transition: { ...SETTLE, delay, layout: SETTLE },
  };
}

function useCardSize(size: Size, radiusTarget: number, reduced: boolean) {
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const radius = useMotionValue(24);
  const sized = useRef(false);

  useEffect(() => {
    if (!size) return;

    if (!sized.current || reduced) {
      width.set(size.width);
      height.set(size.height);
      radius.set(radiusTarget);
      sized.current = true;
      return;
    }

    const springs = [
      animate(width, size.width, SIZE),
      animate(height, size.height, SIZE),
      animate(radius, radiusTarget, SIZE),
    ];
    return () => springs.forEach((spring) => spring.stop());
  }, [size, radiusTarget, reduced, width, height, radius]);

  return { width, height, borderRadius: radius };
}

const PALETTE = [
  "[--fbp-surface:#ffffff] [--fbp-ink:#0a0a0b] [--fbp-muted:#71717a] [--fbp-well:#f4f4f5] [--fbp-line:rgb(10_10_11/0.08)]",
  "[--fbp-good:#16a34a] [--fbp-good-soft:#dcfce7] [--fbp-bad:#dc2626] [--fbp-bad-soft:#fee2e2]",
  "dark:[--fbp-surface:#1f1f23] dark:[--fbp-ink:#fafafa] dark:[--fbp-muted:#a1a1aa] dark:[--fbp-well:#2a2a2f] dark:[--fbp-line:rgb(255_255_255/0.1)]",
  "dark:[--fbp-good:#4ade80] dark:[--fbp-good-soft:rgb(74_222_128/0.16)] dark:[--fbp-bad:#f87171] dark:[--fbp-bad-soft:rgb(248_113_113/0.16)]",
].join(" ");

const RING = "focus-visible:shadow-[0_0_0_2px_var(--fbp-surface),0_0_0_4px_var(--fbp-ink)]";
const QUESTION = "text-[14px] font-medium tracking-[-0.005em]";
const DIM = "transition-opacity duration-200 group-has-[[data-sending]]/card:opacity-55";
const THUMB_LOOK = {
  plain: "size-[30px] [&_svg]:size-[17px]",
  head: "size-[30px] bg-(--fbp-good-soft) text-(--fbp-good) data-[rating=down]:bg-(--fbp-bad-soft) data-[rating=down]:text-(--fbp-bad) [&_svg]:size-[17px]",
  done: "size-7 bg-(--fbp-good) text-white [&_svg]:size-3.5",
};

function Thumb({
  which,
  layoutId,
  look,
  check = false,
  reduced,
}: {
  which: Rating;
  layoutId: string;
  look: keyof typeof THUMB_LOOK;
  check?: boolean;
  reduced: boolean;
}) {
  const icon = check ? Tick02Icon : which === "up" ? ThumbsUpIcon : ThumbsDownIcon;

  return (
    <motion.span
      layoutId={layoutId}
      layout="position"
      data-rating={which}
      className={`grid flex-none place-items-center rounded-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round] ${THUMB_LOOK[look]}`}
      transition={reduced ? { duration: 0 } : FLY}
    >
      <Remold.Icon icon={<HugeiconsIcon icon={icon} />} strokeWidth={1.8} />
    </motion.span>
  );
}

function SendButton({ sending, reduced }: { sending: boolean; reduced: boolean }) {
  return (
    <Button
      type="submit"
      className={`grid h-8 min-w-[68px] cursor-pointer place-items-center rounded-full border-0 bg-(--fbp-ink) px-[15px] text-[13.5px] font-semibold text-(--fbp-surface) outline-none transition-[scale] duration-150 active:scale-[0.96] data-sending:cursor-progress ${RING}`}
      data-sending={sending || undefined}
      aria-busy={sending || undefined}
      aria-disabled={sending || undefined}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {sending ? (
          <motion.span
            key="spinner"
            className="grid place-items-center [&_svg]:size-4 [&_svg]:animate-spin motion-reduce:[&_svg]:[animation-duration:2.4s]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={SETTLE}
          >
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} />
            <span className="sr-only">Sending</span>
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(3px)" }}
            transition={SETTLE}
          >
            Send
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

function FeedbackForm({
  id,
  rating,
  reasons,
  comment,
  sending,
  reduced,
  onClose,
  onReasonsChange,
  onCommentChange,
  onSubmit,
  ref,
}: {
  id: string;
  rating: Rating;
  reasons: string[];
  comment: string;
  sending: boolean;
  reduced: boolean;
  onClose: () => void;
  onReasonsChange: (reasons: string[]) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  ref?: Ref<HTMLFormElement>;
}) {
  return (
    <motion.form
      ref={ref}
      className="grid gap-3.5 p-3"
      aria-labelledby={`${id}-title`}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(3px)", transition: EXIT }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!sending) onSubmit();
      }}
    >
      <div className="flex items-center gap-2.5">
        <Thumb which={rating} layoutId={`${id}-thumb-${rating}`} look="head" reduced={reduced} />
        <motion.h3
          id={`${id}-title`}
          className="m-0 flex-1 text-[14px] font-semibold tracking-[-0.01em]"
          {...fadeIn(reduced, 0.08)}
        >
          {TITLES[rating]}
        </motion.h3>
        <motion.span {...fadeIn(reduced, 0.12)}>
          <Button
            type="button"
            className={`grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--fbp-muted) outline-none transition-[background-color,opacity] duration-150 group-has-[[data-sending]]/card:opacity-55 hover:bg-(--fbp-well) hover:text-(--fbp-ink) focus-visible:shadow-[0_0_0_2px_var(--fbp-ink)] [&_svg]:size-[15px]`}
            disabled={sending}
            aria-label="Close"
            onClick={onClose}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
        </motion.span>
      </div>

      <ToggleGroup
        disabled={sending}
        multiple
        value={reasons}
        onValueChange={(next) => onReasonsChange(next as string[])}
        className={`flex flex-wrap gap-1.5 ${DIM}`}
        aria-label="Reasons"
      >
        {REASONS[rating].map((reason, index) => (
          <Toggle
            key={reason}
            value={reason}
            data-part="reason"
            className="group/reason inline-flex h-[30px] cursor-pointer items-center rounded-full border-0 bg-transparent px-3 text-[13px] font-medium text-(--fbp-ink) shadow-[inset_0_0_0_1px_var(--fbp-line)] outline-none [transition:background-color_0.18s,color_0.18s,box-shadow_0.18s,padding_0.22s_cubic-bezier(0.32,0.72,0,1)] not-data-pressed:hover:bg-(--fbp-well) focus-visible:shadow-[0_0_0_2px_var(--fbp-surface),0_0_0_4px_var(--fbp-ink)]! data-pressed:bg-(--fbp-ink) data-pressed:pl-2.5 data-pressed:text-(--fbp-surface) data-pressed:shadow-[inset_0_0_0_1px_var(--fbp-ink)] motion-reduce:transition-none"
            render={
              <motion.button type="button" layout="position" {...fadeIn(reduced, 0.12 + index * 0.035)} />
            }
          >
            <span
              className="mr-0 grid w-0 place-items-center overflow-hidden opacity-0 [transition:width_0.22s_cubic-bezier(0.32,0.72,0,1),margin-right_0.22s_cubic-bezier(0.32,0.72,0,1),opacity_0.18s] group-data-pressed/reason:mr-[5px] group-data-pressed/reason:w-3 group-data-pressed/reason:opacity-100 motion-reduce:transition-none [&_svg]:size-3 [&_svg]:flex-none"
              aria-hidden="true"
            >
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} />
            </span>
            {reason}
          </Toggle>
        ))}
      </ToggleGroup>

      <motion.div {...fadeIn(reduced, 0.24)}>
        <Field.Root className={`grid ${DIM}`}>
          <Field.Label className="sr-only">Tell us more</Field.Label>
          <Field.Control
            className="min-h-[76px] w-full resize-none rounded-[14px] border-[1.8px] border-solid border-transparent bg-(--fbp-well) px-3 py-2.5 text-[14px] leading-[1.45] text-(--fbp-ink) outline-none transition-[border-color,background-color] duration-[180ms] placeholder:text-(--fbp-muted) focus:border-(--fbp-ink) focus:bg-(--fbp-surface)"
            readOnly={sending}
            placeholder="Tell us more (optional)"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            render={<textarea rows={3} />}
          />
        </Field.Root>
      </motion.div>

      <motion.div className="flex items-center justify-between gap-3" {...fadeIn(reduced, 0.28)}>
        <span className="pl-0.5 text-[12px] text-(--fbp-muted)">Anonymous · helps us fix this page</span>
        <SendButton sending={sending} reduced={reduced} />
      </motion.div>
    </motion.form>
  );
}

function statusText(phase: Phase, sending: boolean) {
  if (phase === "thanks") return "Thanks for the feedback. It was sent.";
  if (sending) return "Sending your feedback";
  return "";
}

export function FeedbackPrompt({
  rating,
  onRatingChange,
  reasons,
  onReasonsChange,
  comment,
  onCommentChange,
  sending = false,
  sent,
  onSend,
  question = "Was this helpful?",
}: FeedbackPromptProps) {
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [content, size] = useMeasuredSize<HTMLDivElement>();

  const phase: Phase = sent ? "thanks" : rating ? "form" : "idle";
  const cardStyle = useCardSize(size, phase === "form" ? 20 : 24, reduced);

  const interacted = useRef(false);
  const lastRating = useRef<Rating | null>(null);

  useEffect(() => {
    if (!interacted.current) return;

    const card = root.current;
    if (!card) return;

    let target: HTMLElement | null = card;
    if (phase === "form") target = card.querySelector<HTMLElement>("[data-part=reason]");
    if (phase === "idle")
      target = card.querySelector<HTMLElement>(`[data-rating=${lastRating.current ?? "up"}]`);
    target?.focus({ preventScroll: true });
  }, [phase]);

  const rate = (next: Rating | null) => {
    interacted.current = true;
    if (next) lastRating.current = next;
    onRatingChange(next);
  };

  const send = () => {
    interacted.current = true;
    onSend();
  };

  return (
    <div
      className={`relative inline-flex font-sans text-[14px] text-(--fbp-ink) antialiased ${PALETTE}`}
    >
      <LayoutGroup id={id}>
        <motion.div
          ref={root}
          className="group/card relative overflow-hidden rounded-3xl bg-(--fbp-surface) shadow-[inset_0_0_0_1px_var(--fbp-line),0_1px_2px_rgb(0_0_0/0.03),0_4px_14px_-8px_rgb(0_0_0/0.08)] outline-none"
          data-phase={phase}
          data-rating={rating ?? undefined}
          tabIndex={-1}
          style={cardStyle}
          onKeyDown={(event) => event.key === "Escape" && phase === "form" && rate(null)}
        >
          <div
            ref={content}
            data-phase={phase}
            className="absolute top-1/2 left-1/2 w-max -translate-x-1/2 -translate-y-1/2 data-[phase=form]:w-[340px]"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  className="flex h-12 items-center gap-0.5 pr-1.5 pl-[18px] whitespace-nowrap"
                  role="group"
                  aria-labelledby={`${id}-question`}
                  {...fadeIn(reduced)}
                >
                  <span id={`${id}-question`} className={QUESTION}>
                    {question}
                  </span>
                  <span className="mr-2 ml-3.5 h-5 w-px bg-(--fbp-line)" aria-hidden="true" />
                  {(["up", "down"] as const).map((which) => (
                    <Button
                      key={which}
                      data-rating={which}
                      className={`grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--fbp-muted) outline-none transition-[background-color,color,scale] duration-150 active:scale-[0.92] data-[rating=down]:hover:bg-(--fbp-bad-soft) data-[rating=down]:hover:text-(--fbp-bad) data-[rating=up]:hover:bg-(--fbp-good-soft) data-[rating=up]:hover:text-(--fbp-good) ${RING}`}
                      aria-label={which === "up" ? "Yes, it helped" : "No, it didn't help"}
                      onClick={() => rate(which)}
                    >
                      <Thumb which={which} layoutId={`${id}-thumb-${which}`} look="plain" reduced={reduced} />
                    </Button>
                  ))}
                </motion.div>
              )}

              {phase === "form" && rating && (
                <FeedbackForm
                  key="form"
                  id={id}
                  rating={rating}
                  reasons={reasons}
                  comment={comment}
                  sending={sending}
                  reduced={reduced}
                  onClose={() => rate(null)}
                  onReasonsChange={onReasonsChange}
                  onCommentChange={onCommentChange}
                  onSubmit={send}
                />
              )}

              {phase === "thanks" && rating && (
                <motion.div
                  key="thanks"
                  className="flex h-12 items-center gap-2.5 pr-[18px] pl-2.5 whitespace-nowrap"
                  {...fadeIn(reduced)}
                >
                  <Thumb which={rating} layoutId={`${id}-thumb-${rating}`} look="done" check reduced={reduced} />
                  <motion.span className={QUESTION} {...fadeIn(reduced, 0.1)}>
                    Thanks for the feedback
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </LayoutGroup>

      <p className="sr-only" role="status">
        {statusText(phase, sending)}
      </p>
    </div>
  );
}

interface State {
  rating: Rating | null;
  reasons: string[];
  comment: string;
  sending: boolean;
  sent: boolean;
}

const REQUEST = 1100;

const OPEN: State = { rating: "down", reasons: [], comment: "", sending: false, sent: false };
const PICKED: State = { ...OPEN, reasons: ["Missing info"] };

const BEATS: readonly (State & { ms: number })[] = [
  { rating: null, reasons: [], comment: "", sending: false, sent: false, ms: 1500 },
  { ...OPEN, ms: 1100 },
  { ...PICKED, ms: 700 },
  ...typing("An example with real dates would help", (comment) => ({ ...PICKED, comment }), {
    every: 45,
    hold: 900,
  }),
  { ...PICKED, comment: "An example with real dates would help", sending: true, ms: REQUEST },
  { ...PICKED, comment: "An example with real dates would help", sent: true, ms: 2600 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const STILL: State = { ...PICKED, comment: "An example with real dates would help" };

interface FeedbackPromptDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function FeedbackPromptDemo({ playing, preview }: FeedbackPromptDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver, live } = scene;
  const state = preview && !playing ? STILL : scene.state;

  useEffect(() => {
    if (live || preview || !state.sent) return;
    const timer = setTimeout(
      () => takeOver({ rating: null, reasons: [], comment: "", sending: false, sent: false }),
      3200,
    );
    return () => clearTimeout(timer);
  }, [state.sent, live, preview, takeOver]);

  useEffect(() => {
    if (live || preview || !state.sending) return;
    const timer = setTimeout(
      () => takeOver((current) => ({ ...current, sending: false, sent: true })),
      REQUEST,
    );
    return () => clearTimeout(timer);
  }, [state.sending, live, preview, takeOver]);

  return (
    <div ref={ref} className="not-prose grid min-h-[380px] w-full place-items-center">
      <FeedbackPrompt
        rating={state.rating}
        onRatingChange={(rating) =>
          takeOver({ rating, reasons: [], comment: "", sending: false, sent: false })
        }
        reasons={state.reasons}
        onReasonsChange={(reasons) => takeOver((current) => ({ ...current, reasons }))}
        comment={state.comment}
        onCommentChange={(comment) => takeOver((current) => ({ ...current, comment }))}
        sending={state.sending}
        sent={state.sent}
        onSend={() => takeOver((current) => ({ ...current, sending: true }))}
      />
    </div>
  );
}
