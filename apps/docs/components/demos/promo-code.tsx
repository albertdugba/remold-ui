"use client";

import { Field } from "@base-ui/react/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Loading03Icon, Ticket01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, MotionConfig, motion, useAnimate } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type Ref, type RefObject } from "react";
import { Odometer } from "./odometer";
import { typing, useScene } from "./use-scene";
import "./form-kit.css";
import "./promo-code.css";

const CODES: Record<string, { off: number; label: string } | { expired: true }> = {
  SAVE20: { off: 0.2, label: "20% off" },
  WELCOME10: { off: 0.1, label: "10% off" },
  SUMMER: { expired: true },
};

const SHOWING = {
  title: "Prison Break",
  episode: "Season 4",
  when: "Thu 24 Dec · 8:15 pm",
  where: "Cineworld · Screen 4",
  row: "F",
  seats: [7, 8],
  poster:
    "https://static.wikia.nocookie.net/prisonbreak/images/8/89/Prison-break-season-4-cast-promotional.jpg/revision/latest?cb=20080829043733",
};

const SEATS = SHOWING.seats.length;
const PRICE = 13.5;
const SUBTOTAL = SEATS * PRICE;
const FEE = 1.5;
const CHECKING_FOR = 550;
const TOTAL_AFTER = 260;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.25 };
const QUICK = { duration: 0.14 };
const BLUR_OUT = { opacity: 0, filter: "blur(4px)", transition: QUICK };
const PART = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
  shown: { opacity: 1, scale: 1, filter: "blur(0px)" },
};
const SAVED = {
  initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.8, filter: "blur(4px)", transition: QUICK },
};
const FIELD = { height: 48, radius: 14 };
const CHIP = { height: 36, radius: 18 };
const DISCOUNT_PART = {
  initial: { opacity: 0, x: -8, filter: "blur(4px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ...SPRING, delay: 0.18 } },
  exit: BLUR_OUT,
};

const money = (amount: number) => `£${amount.toFixed(2)}`;

export interface PromoCodeProps {
  draft: string;
  onDraftChange: (draft: string) => void;
  applied: string | null;
  onAppliedChange: (code: string | null) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

type Offer = (typeof CODES)[string];

function TicketLines({ discount }: { discount: number }) {
  return (
    <>
      <header className="prm-poster">
        <img src={SHOWING.poster} alt="" draggable={false} />
        <span className="prm-poster-text">
          <span className="prm-episode">{SHOWING.episode}</span>
          <h3 className="prm-title">{SHOWING.title}</h3>
          <span>
            {SHOWING.when} · {SHOWING.where}
          </span>
        </span>
      </header>

      <dl className="prm-lines">
        <div className="prm-seats">
          <dt>
            <span className="prm-seat-row" aria-hidden="true">
              {SHOWING.seats.map((seat) => (
                <span key={seat} className="prm-seat">
                  {SHOWING.row}
                  {seat}
                </span>
              ))}
            </span>
            <span className="prm-seat-text">
              <b>{SEATS} × Standard</b>
              <span>
                Row {SHOWING.row} · {money(PRICE)} each
              </span>
            </span>
          </dt>
          <dd>{money(SUBTOTAL)}</dd>
        </div>

        <div className="prm-fee">
          <dt>Booking fee</dt>
          <dd>{money(FEE)}</dd>
        </div>

        <AnimatePresence initial={false}>
          {discount > 0 && (
            <motion.div
              key="discount"
              className="prm-discount"
              initial={{ height: 0 }}
              animate={{ height: "auto", transition: { ...SPRING, delay: 0.14 } }}
              exit={{ height: 0, transition: { ...SPRING, bounce: 0 } }}
            >
              <motion.dt {...DISCOUNT_PART}>Discount</motion.dt>
              <motion.dd {...DISCOUNT_PART}>−{money(discount)}</motion.dd>
            </motion.div>
          )}
        </AnimatePresence>
      </dl>
    </>
  );
}

function AppliedChip({
  code,
  offer,
  onRemove,
  ref,
}: {
  code: string | null;
  offer: Offer | undefined;
  onRemove: () => void;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div
      ref={ref}
      className="prm-chip"
      initial="hidden"
      animate="shown"
      exit={BLUR_OUT}
      transition={{ staggerChildren: 0.045, delayChildren: 0.1 }}
    >
      <motion.span
        variants={{
          hidden: { opacity: 0, scale: 0.5, rotate: -25 },
          shown: { opacity: 1, scale: 1, rotate: 0 },
        }}
      >
        <HugeiconsIcon icon={Ticket01Icon} className="prm-ticket" strokeWidth={1.8} aria-hidden="true" />
      </motion.span>
      <motion.i variants={PART} className="prm-cut" aria-hidden="true" />
      <motion.b variants={PART}>{code}</motion.b>
      <motion.span variants={PART} className="prm-chip-label">
        {offer && "label" in offer && offer.label}
      </motion.span>
      <motion.button
        type="button"
        variants={PART}
        whileTap={{ scale: 0.88 }}
        aria-label={`Remove ${code}`}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}

function ApplyButton({
  checking,
  disabled,
  onApply,
}: {
  checking: boolean;
  disabled: boolean;
  onApply: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="prm-apply"
      disabled={disabled}
      aria-busy={checking || undefined}
      whileTap={{ scale: 0.96 }}
      onClick={onApply}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={String(checking)}
          className="prm-apply-label"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(3px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={BLUR_OUT}
        >
          {checking ? (
            <HugeiconsIcon
              icon={Loading03Icon}
              className="prm-spin"
              strokeWidth={2.2}
              aria-label="Checking"
            />
          ) : (
            "Apply"
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function CodeEntry({
  draft,
  checking,
  focusOnMount,
  onDraftChange,
  onApply,
  ref,
}: {
  draft: string;
  checking: boolean;
  focusOnMount: RefObject<boolean>;
  onDraftChange: (draft: string) => void;
  onApply: () => void;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div
      ref={ref}
      className="prm-entry"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay: 0.06 } }}
      exit={BLUR_OUT}
    >
      <Field.Control
        ref={(node: HTMLInputElement | null) => {
          if (node && focusOnMount.current) node.focus({ preventScroll: true });
          focusOnMount.current = false;
        }}
        className="fk-input prm-input"
        placeholder="Promo code"
        aria-label="Promo code"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        readOnly={checking}
        onChange={(event) => onDraftChange(event.target.value.toUpperCase())}
        onKeyDown={(event) => event.key === "Enter" && onApply()}
      />
      <ApplyButton checking={checking} disabled={!draft.trim()} onApply={onApply} />
    </motion.div>
  );
}

function Total({ discount }: { discount: number }) {
  const saved = discount > 0;

  return (
    <div className="prm-total">
      <span className="prm-total-label">
        Total
        <AnimatePresence initial={false}>
          {saved && (
            <motion.span key="saved" className="prm-saved" {...SAVED}>
              Saved {money(discount)}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="prm-total-value">
        <s className="prm-was" data-shown={saved || undefined}>
          {money(SUBTOTAL + FEE)}
        </s>
        <b>
          <Odometer value={money(SUBTOTAL + FEE - discount)} />
        </b>
      </span>
    </div>
  );
}

function errorFor(code: string, offer: Offer | undefined) {
  if (!offer) return `“${code}” isn’t a code we know.`;
  if ("expired" in offer) return `“${code}” ended on 31 August.`;
  return null;
}

export function PromoCode({
  draft,
  onDraftChange,
  applied,
  onAppliedChange,
  error,
  onErrorChange,
}: PromoCodeProps) {
  const [shaker, animate] = useAnimate<HTMLDivElement>();
  const [checking, setChecking] = useState(false);
  const [totalOn, setTotalOn] = useState(false);
  const refocus = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);

  const offer = applied ? CODES[applied] : undefined;
  const discount = offer && "off" in offer ? SUBTOTAL * offer.off : 0;
  const on = discount > 0;

  useEffect(() => {
    const timer = setTimeout(() => setTotalOn(on), on ? TOTAL_AFTER : 0);
    return () => clearTimeout(timer);
  }, [on]);

  useLayoutEffect(() => {
    if (!box.current || !shaker.current) return;

    const width = on && chip.current ? chip.current.offsetWidth : shaker.current.offsetWidth;
    const size = on ? CHIP : FIELD;
    void animate(box.current, { width, height: size.height, borderRadius: size.radius }, SPRING);
  }, [on, animate, shaker]);

  useEffect(() => {
    if (error) void animate(shaker.current, { x: [0, -6, 5, -3, 1, 0] }, { duration: 0.36 });
  }, [error, animate, shaker]);

  const apply = () => {
    const code = draft.trim();
    if (!code || checking) return;

    onErrorChange(null);
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      const problem = errorFor(code, CODES[code]);
      if (problem) onErrorChange(problem);
      else onAppliedChange(code);
    }, CHECKING_FOR);
  };

  const onDraft = (next: string) => {
    onDraftChange(next);
    if (error) onErrorChange(null);
  };

  const remove = () => {
    refocus.current = true;
    onAppliedChange(null);
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <section className="fk prm" aria-label="Your cinema tickets">
        <TicketLines discount={discount} />

        <Field.Root invalid={error !== null} className="prm-field">
          <div ref={shaker} className="prm-shaker">
            <div
              ref={box}
              className="prm-box"
              data-state={on ? "applied" : "entry"}
              data-invalid={error ? "" : undefined}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {on ? (
                  <AppliedChip key="chip" ref={chip} code={applied} offer={offer} onRemove={remove} />
                ) : (
                  <CodeEntry
                    key="entry"
                    draft={draft}
                    checking={checking}
                    focusOnMount={refocus}
                    onDraftChange={onDraft}
                    onApply={apply}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="error"
                className="prm-error"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: { ...SPRING, bounce: 0 } }}
              >
                <Field.Error className="fk-error" match>
                  {error}
                </Field.Error>
              </motion.div>
            )}
          </AnimatePresence>
        </Field.Root>

        <Total discount={totalOn && on ? discount : 0} />
      </section>
    </MotionConfig>
  );
}

interface State {
  draft: string;
  applied: string | null;
  error: string | null;
}

const BEATS: readonly (State & { ms: number })[] = [
  { draft: "", applied: null, error: null, ms: 900 },
  ...typing("SUMMER", (draft) => ({ draft, applied: null, error: null }), { every: 90, hold: 900 }),
  { draft: "SUMMER", applied: null, error: "“SUMMER” ended on 31 August.", ms: 1600 },
  ...typing("SAVE20", (draft) => ({ draft, applied: null, error: null }), { every: 90, hold: 800 }),
  { draft: "SAVE20", applied: "SAVE20", error: null, ms: 3000 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function PromoCodeDemo({ playing }: { playing?: boolean } = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage prm-stage not-prose">
      <PromoCode
        draft={state.draft}
        onDraftChange={(draft) => takeOver((current) => ({ ...current, draft }))}
        applied={state.applied}
        onAppliedChange={(applied) =>
          takeOver((current) => ({ ...current, applied, draft: applied ? current.draft : "" }))
        }
        error={state.error}
        onErrorChange={(error) => takeOver((current) => ({ ...current, error }))}
      />
    </div>
  );
}
