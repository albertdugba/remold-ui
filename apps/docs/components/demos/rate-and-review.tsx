"use client";

import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useFocusAfterChange } from "./use-focus-after-change";
import { useMeasuredHeight } from "./use-measured-height";
import { useScript } from "./use-script";
import { useTimeout } from "./use-timeout";

export type ReviewStage = "rate" | "write" | "posting" | "posted";

export interface ReviewValue {
  stage: ReviewStage;
  rating: number;
  tags: string[];
  text: string;
}

export interface ReviewedItem {
  name: string;
  image: string;
  detail: string;
}

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
const FLIGHT = { type: "spring" as const, duration: 0.6, bounce: 0.18 };
const POP = { type: "spring" as const, duration: 0.35, bounce: 0.5 };
const QUICK = { duration: 0.14 };
const CARD_PADDING = 16;
const STARS = [1, 2, 3, 4, 5];
const WORDS = ["Not for me", "Could be better", "It's okay", "Really good", "Loved it"];
const EMPTY: ReviewValue = { stage: "rate", rating: 0, tags: [], text: "" };

const PALETTE = [
  "[--rr-surface:#ffffff] [--rr-well:#f3f4f4] [--rr-ink:#0f1111] [--rr-muted:#565959] [--rr-edge:#d5d9d9] [--rr-photo:#ece6dc]",
  "[--rr-star:#ffa41c] [--rr-star-edge:#de7921] [--rr-action:#ffd814] [--rr-action-hover:#f7ca00] [--rr-on-action:#0f1111] [--rr-link:#007185]",
  "dark:[--rr-surface:#1f1f23] dark:[--rr-well:#2a2a2f] dark:[--rr-ink:#fafafa] dark:[--rr-muted:#a1a1aa] dark:[--rr-edge:rgb(255_255_255/0.18)] dark:[--rr-photo:#2b2925]",
  "dark:[--rr-star-edge:#ffa41c] dark:[--rr-link:#6cc7d9]",
  "font-sans text-[14px] leading-[1.4] text-(--rr-ink) antialiased",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rr-link)";
const BUTTON = `inline-flex h-10 cursor-pointer items-center justify-center rounded-full border-0 px-4 text-[14px] font-medium transition-[background-color,opacity] duration-150 ease-out motion-reduce:transition-none ${FOCUS}`;
const QUIET_LINK = `cursor-pointer rounded-full border-0 bg-transparent px-1 text-[13px] font-medium text-(--rr-link) underline-offset-2 hover:underline ${FOCUS}`;

const part = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.94, filter: "blur(6px)", transition: QUICK },
});

function eyebrowFor(review: ReviewValue, item: ReviewedItem) {
  if (review.stage === "rate") return item.detail;
  if (review.stage === "posted") return "Your review";

  return WORDS[review.rating - 1]!;
}

function Stars({ rating, big, disabled, onRate }: { rating: number; big?: boolean; disabled?: boolean; onRate: (rating: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? rating;

  return (
    <RadioGroup
      aria-label="Rating"
      value={rating ? String(rating) : ""}
      disabled={disabled}
      onValueChange={(value) => onRate(Number(value))}
      className={`flex ${big ? "gap-1.5" : "gap-0.5"}`}
      onPointerLeave={() => setHovered(null)}
    >
      {STARS.map((star) => {
        const filled = star <= shown;

        return (
          <Radio.Root
            key={star}
            nativeButton
            value={String(star)}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}, ${WORDS[star - 1]}`}
            onPointerEnter={(event) => event.pointerType === "mouse" && !disabled && setHovered(star)}
            className={`grid cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit disabled:cursor-default ${big ? "size-12" : "size-[18px]"} ${FOCUS}`}
            render={<motion.button type="button" whileTap={disabled ? undefined : { scale: 0.88 }} />}
          >
            <motion.span layoutId={`rr-star-${star}`} transition={{ ...FLIGHT, delay: (star - 1) * 0.025 }} className="grid">
              <motion.span className="grid" animate={{ scale: filled ? 1 : 0.9 }} transition={{ ...POP, delay: hovered === null ? (star - 1) * 0.035 : 0 }}>
                <HugeiconsIcon
                  icon={StarIcon}
                  strokeWidth={1.6}
                  className={`${big ? "size-[34px]" : "size-[15px]"} transition-[color,fill] duration-150 ease-out ${filled ? "fill-(--rr-star) text-(--rr-star-edge)" : "fill-transparent text-(--rr-star-edge)"}`}
                  aria-hidden="true"
                />
              </motion.span>
            </motion.span>
            <Radio.Indicator className="hidden" />
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}

function RateStage({ rating, onRate }: { rating: number; onRate: (rating: number) => void }) {
  return (
    <motion.div key="rate" className="grid justify-items-center gap-3 pt-1 pb-2" exit={{ opacity: 0, transition: QUICK }}>
      <p className="m-0 text-[17px] font-semibold tracking-[-0.015em]">How did it turn out?</p>
      <Stars rating={rating} big onRate={onRate} />
    </motion.div>
  );
}

function WriteStage({
  review,
  tags,
  onChange,
  onCancel,
  onPost,
}: {
  review: ReviewValue;
  tags: string[];
  onChange: (patch: Partial<ReviewValue>) => void;
  onCancel: () => void;
  onPost: () => void;
}) {
  const posting = review.stage === "posting";

  return (
    <motion.div key="write" className="grid grid-cols-[minmax(0,1fr)] gap-3" exit={{ opacity: 0, filter: "blur(4px)", transition: QUICK }}>
      <motion.div {...part(0.2)}>
        <ToggleGroup multiple aria-label="Quick notes" value={review.tags} disabled={posting} onValueChange={(next) => onChange({ tags: next as string[] })} className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Toggle
              key={tag}
              value={tag}
              render={<motion.button whileTap={{ scale: 0.96 }} />}
              className={`h-8 cursor-pointer rounded-full border-0 bg-(--rr-surface) px-3 text-[13px] font-medium text-(--rr-ink) shadow-[inset_0_0_0_1px_var(--rr-edge)] transition-[background-color,box-shadow,color] duration-150 ease-out data-pressed:bg-[color-mix(in_oklab,var(--rr-link)_9%,var(--rr-surface))] data-pressed:text-(--rr-link) data-pressed:shadow-[inset_0_0_0_1.5px_var(--rr-link)] motion-reduce:transition-none ${FOCUS}`}
            >
              {tag}
            </Toggle>
          ))}
        </ToggleGroup>
      </motion.div>

      <motion.div {...part(0.25)}>
        <Field.Root className="grid">
          <Field.Label className="sr-only">Your review</Field.Label>
          <Field.Control
            value={review.text}
            onValueChange={(text) => onChange({ text })}
            disabled={posting}
            placeholder="What should other buyers know?"
            render={<textarea rows={4} />}
            className="resize-none rounded-[12px] border-0 bg-(--rr-surface) px-3.5 py-3 text-[14.5px] leading-[1.45] text-(--rr-ink) shadow-[inset_0_0_0_1px_var(--rr-edge)] outline-none placeholder:text-(--rr-muted)"
          />
        </Field.Root>
      </motion.div>

      <motion.div {...part(0.3)} className="flex justify-end gap-1.5">
        <Button className={`${BUTTON} bg-(--rr-surface) text-(--rr-ink) shadow-[inset_0_0_0_1px_var(--rr-edge)] hover:bg-(--rr-well)`} disabled={posting} onClick={onCancel}>
          Not now
        </Button>

        <Button
          className={`${BUTTON} min-w-[112px] bg-(--rr-action) text-(--rr-on-action) hover:bg-(--rr-action-hover) disabled:opacity-70`}
          disabled={posting}
          onClick={onPost}
          render={<motion.button whileTap={{ scale: 0.97 }} />}
        >
          <Remold.Text>{posting ? "Posting" : "Post review"}</Remold.Text>
        </Button>
      </motion.div>
    </motion.div>
  );
}

function PostedStage({ review, onEdit }: { review: ReviewValue; onEdit: () => void }) {
  return (
    <motion.div key="posted" className="grid grid-cols-[minmax(0,1fr)] gap-2.5" exit={{ opacity: 0, transition: QUICK }}>
      {review.text && (
        <motion.p {...part(0.06)} className="m-0 text-[15px] leading-[1.5] text-pretty">
          “{review.text}”
        </motion.p>
      )}

      <motion.div {...part(0.1)} className="flex items-start justify-between gap-3">
        {review.tags.length ? (
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {review.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-(--rr-well) px-2.5 py-[3px] text-[12px] font-medium text-(--rr-muted)">
                {tag}
              </span>
            ))}
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-[12.5px] text-(--rr-muted)">Posted just now</span>
        )}

        <Button data-rr-edit="" className={`flex-none ${QUIET_LINK}`} onClick={onEdit}>
          Edit
        </Button>
      </motion.div>
    </motion.div>
  );
}

export interface RateAndReviewProps {
  item: ReviewedItem;
  tags: string[];
  value?: ReviewValue;
  defaultValue?: ReviewValue;
  onValueChange?: (value: ReviewValue, details: ChangeDetails) => void;
}

export function RateAndReview({ item, tags, value, defaultValue = EMPTY, onValueChange }: RateAndReviewProps) {
  const [review, setReview] = useControllableState<ReviewValue>({ value, defaultValue, onValueChange });
  const root = useRef<HTMLElement>(null);
  const [measure, height] = useMeasuredHeight();
  const { stage, rating } = review;
  const writing = stage === "write" || stage === "posting";

  useFocusAfterChange(root, stage, (element) => element.querySelector<HTMLElement>(stage === "write" ? "textarea" : stage === "posted" ? "[data-rr-edit]" : "[role=radio]"));

  const update = (patch: Partial<ReviewValue>) => setReview({ ...review, ...patch });

  const rate = (next: number) => {
    announce(`${next} out of 5, ${WORDS[next - 1]}`);
    update({ rating: next, stage: stage === "rate" ? "write" : stage });
  };

  const post = () => {
    announce("Posting your review");
    update({ stage: "posting" });
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <motion.section
        ref={root}
        aria-label={`Review ${item.name}`}
        initial={false}
        animate={{ height: height === null ? "auto" : height + CARD_PADDING * 2 }}
        className={`box-border w-[min(100%,360px)] overflow-clip rounded-[28px] bg-(--rr-surface) p-4 ${PALETTE}`}
      >
        <LayoutGroup id="rate-and-review">
          <div ref={measure} className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <header className="flex items-center gap-3">
              <img src={item.image} alt="" draggable={false} className="size-12 flex-none rounded-[14px] bg-(--rr-photo) object-cover" />
              <span className="grid min-w-0 flex-1 gap-px">
                <span className="truncate text-[12.5px] text-(--rr-muted)">
                  <Remold.Text>{eyebrowFor(review, item)}</Remold.Text>
                </span>
                <strong className="truncate text-[15px] font-semibold tracking-[-0.01em]">{item.name}</strong>
              </span>

              {stage !== "rate" && (
                <span className="flex-none">
                  <Stars rating={rating} disabled={stage !== "write"} onRate={rate} />
                </span>
              )}
            </header>

            <AnimatePresence initial={false} mode="popLayout">
              {stage === "rate" && <RateStage key="rate" rating={rating} onRate={rate} />}
              {writing && <WriteStage key="write" review={review} tags={tags} onChange={update} onCancel={() => setReview(EMPTY)} onPost={post} />}
              {stage === "posted" && <PostedStage key="posted" review={review} onEdit={() => update({ stage: "write" })} />}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </motion.section>
    </MotionConfig>
  );
}

const JACKET: ReviewedItem = { name: "Waxed field jacket", image: "/returns-field-jacket.jpg", detail: "Delivered on 12 November" };
const TAGS = ["Fits well", "Warm enough", "Great pockets", "Runs small"];
const TEXT = "Sturdy, warm, and the pockets swallow everything.";
const POSTING_TIME = 900;
const WRITTEN: ReviewValue = { stage: "write", rating: 5, tags: ["Fits well", "Great pockets"], text: "" };

export function RateAndReviewDemo({ playing }: { playing?: boolean } = {}) {
  const shell = useRef<HTMLDivElement>(null);
  const [review, setReview] = useState(EMPTY);
  const posting = useTimeout();

  const change = (next: ReviewValue) => {
    setReview(next);

    if (next.stage === "posting") {
      posting.schedule(() => {
        announce("Review posted");
        setReview((current) => (current.stage === "posting" ? { ...current, stage: "posted" } : current));
      }, POSTING_TIME);
    } else {
      posting.cancel();
    }
  };

  useScript(shell, playing, [
    [1500, () => change(EMPTY)],
    [800, () => change({ ...EMPTY, stage: "write", rating: 5 })],
    [600, () => change({ ...EMPTY, stage: "write", rating: 5, tags: ["Fits well"] })],
    [700, () => change(WRITTEN)],
    ...[...TEXT].map((_, index) => [index === TEXT.length - 1 ? 900 : 34, () => change({ ...WRITTEN, text: TEXT.slice(0, index + 1) })] as const),
    [POSTING_TIME + 2800, () => change({ ...WRITTEN, text: TEXT, stage: "posting" })],
  ]);

  return (
    <div ref={shell} className="not-prose grid min-h-[460px] w-full place-items-center py-4">
      <RateAndReview item={JACKET} tags={TAGS} value={review} onValueChange={change} />
    </div>
  );
}
