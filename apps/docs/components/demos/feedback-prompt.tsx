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
import "./feedback-prompt.css";

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
  /** The feedback is on its way: the card locks and Send shows a spinner until `sent`. */
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

function Thumb({
  which,
  layoutId,
  check = false,
  reduced,
}: {
  which: Rating;
  layoutId: string;
  check?: boolean;
  reduced: boolean;
}) {
  const icon = check ? Tick02Icon : which === "up" ? ThumbsUpIcon : ThumbsDownIcon;

  return (
    <motion.span
      layoutId={layoutId}
      layout="position"
      className="fbp-thumb"
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
      className="fbp-send"
      data-sending={sending || undefined}
      aria-busy={sending || undefined}
      aria-disabled={sending || undefined}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {sending ? (
          <motion.span
            key="spinner"
            className="fbp-spinner"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={SETTLE}
          >
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} />
            <span className="fbp-sr">Sending</span>
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
      className="fbp-form"
      aria-labelledby={`${id}-title`}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(3px)", transition: EXIT }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!sending) onSubmit();
      }}
    >
      <div className="fbp-head">
        <Thumb which={rating} layoutId={`${id}-thumb-${rating}`} reduced={reduced} />
        <motion.h3 id={`${id}-title`} className="fbp-title" {...fadeIn(reduced, 0.08)}>
          {TITLES[rating]}
        </motion.h3>
        <motion.span {...fadeIn(reduced, 0.12)}>
          <Button type="button" className="fbp-close" disabled={sending} aria-label="Close" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
        </motion.span>
      </div>

      <ToggleGroup
        disabled={sending}
        multiple
        value={reasons}
        onValueChange={(next) => onReasonsChange(next as string[])}
        className="fbp-reasons"
        aria-label="Reasons"
      >
        {REASONS[rating].map((reason, index) => (
          <Toggle
            key={reason}
            value={reason}
            data-part="reason"
            className="fbp-reason"
            render={
              <motion.button type="button" layout="position" {...fadeIn(reduced, 0.12 + index * 0.035)} />
            }
          >
            <span className="fbp-reason-tick" aria-hidden="true">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} />
            </span>
            {reason}
          </Toggle>
        ))}
      </ToggleGroup>

      <motion.div {...fadeIn(reduced, 0.24)}>
        <Field.Root className="fbp-field">
          <Field.Label className="fbp-sr">Tell us more</Field.Label>
          <Field.Control
            className="fbp-comment"
            readOnly={sending}
            placeholder="Tell us more (optional)"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            render={<textarea rows={3} />}
          />
        </Field.Root>
      </motion.div>

      <motion.div className="fbp-foot" {...fadeIn(reduced, 0.28)}>
        <span className="fbp-note">Anonymous · helps us fix this page</span>
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
    <div className="fbp">
      <LayoutGroup id={id}>
        <motion.div
          ref={root}
          className="fbp-card"
          data-phase={phase}
          data-rating={rating ?? undefined}
          tabIndex={-1}
          style={cardStyle}
          onKeyDown={(event) => event.key === "Escape" && phase === "form" && rate(null)}
        >
          <div ref={content} className="fbp-content" data-phase={phase}>
            <AnimatePresence initial={false} mode="popLayout">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  className="fbp-idle"
                  role="group"
                  aria-labelledby={`${id}-question`}
                  {...fadeIn(reduced)}
                >
                  <span id={`${id}-question`} className="fbp-question">
                    {question}
                  </span>
                  <span className="fbp-divider" aria-hidden="true" />
                  {(["up", "down"] as const).map((which) => (
                    <Button
                      key={which}
                      data-rating={which}
                      className="fbp-rate"
                      aria-label={which === "up" ? "Yes, it helped" : "No, it didn't help"}
                      onClick={() => rate(which)}
                    >
                      <Thumb which={which} layoutId={`${id}-thumb-${which}`} reduced={reduced} />
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
                <motion.div key="thanks" className="fbp-thanks" {...fadeIn(reduced)}>
                  <Thumb which={rating} layoutId={`${id}-thumb-${rating}`} check reduced={reduced} />
                  <motion.span className="fbp-question" {...fadeIn(reduced, 0.1)}>
                    Thanks for the feedback
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </LayoutGroup>

      <p className="fbp-sr" role="status">
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
    <div ref={ref} className="fbp-demo not-prose">
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
