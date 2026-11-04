"use client";

import { Field } from "@base-ui/react/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Loading03Icon, Ticket01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, MotionConfig, motion, useAnimate } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Odometer } from "./odometer";
import { typing, useScene } from "./use-scene";
import "./form-kit.css";
import "./promo-code.css";

const CODES: Record<string, { off: number; label: string } | { expired: true }> = {
  SAVE20: { off: 0.2, label: "20% off" },
  WELCOME10: { off: 0.1, label: "10% off" },
  SUMMER: { expired: true },
};

const SUBTOTAL = 84;
const SHIPPING = 6;
const CHECKING_FOR = 550;
const TOTAL_AFTER = 260;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.25 };
const QUICK = { duration: 0.14 };
const BLUR_OUT = { opacity: 0, filter: "blur(4px)", transition: QUICK };
const PART = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
  shown: { opacity: 1, scale: 1, filter: "blur(0px)" },
};
const DISCOUNT_PART = {
  initial: { opacity: 0, x: -8, filter: "blur(4px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ...SPRING, delay: 0.18 } },
  exit: BLUR_OUT,
};

const money = (amount: number) => `$${amount.toFixed(2)}`;

export interface PromoCodeProps {
  draft: string;
  onDraftChange: (draft: string) => void;
  applied: string | null;
  onAppliedChange: (code: string | null) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

export function PromoCode({ draft, onDraftChange, applied, onAppliedChange, error, onErrorChange }: PromoCodeProps) {
  const [shaker, animate] = useAnimate<HTMLDivElement>();
  const [checking, setChecking] = useState(false);
  const [totalOn, setTotalOn] = useState(false);
  const refocus = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);

  const offer = applied ? CODES[applied] : undefined;
  const off = offer && "off" in offer ? SUBTOTAL * offer.off : 0;
  const on = off > 0;

  useEffect(() => {
    const timer = setTimeout(() => setTotalOn(on), on ? TOTAL_AFTER : 0);
    return () => clearTimeout(timer);
  }, [on]);

  useLayoutEffect(() => {
    if (!box.current || !shaker.current) return;
    const width = on && chip.current ? chip.current.offsetWidth : shaker.current.offsetWidth;
    void animate(box.current, { width, height: on ? 38 : 46, borderRadius: on ? 19 : 12 }, SPRING);
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
      const found = CODES[code];
      if (!found) onErrorChange(`“${code}” isn’t a code we know.`);
      else if ("expired" in found) onErrorChange(`“${code}” ended on 31 August.`);
      else onAppliedChange(code);
    }, CHECKING_FOR);
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <section className="fk prm" aria-label="Order summary">
        <h3 className="prm-title">Order summary</h3>
        <dl className="prm-lines">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(SUBTOTAL)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{money(SHIPPING)}</dd>
          </div>
          <AnimatePresence initial={false}>
            {on && (
              <motion.div
                key="discount"
                className="prm-discount"
                initial={{ height: 0 }}
                animate={{ height: "auto", transition: { ...SPRING, delay: 0.14 } }}
                exit={{ height: 0, transition: { ...SPRING, bounce: 0 } }}
              >
                <motion.dt {...DISCOUNT_PART}>Discount · {applied}</motion.dt>
                <motion.dd {...DISCOUNT_PART}>−{money(off)}</motion.dd>
              </motion.div>
            )}
          </AnimatePresence>
        </dl>

        <Field.Root invalid={error !== null} className="prm-field">
          <div ref={shaker} className="prm-shaker">
            <div ref={box} className="prm-box" data-state={on ? "applied" : "entry"} data-invalid={error ? "" : undefined}>
              <AnimatePresence initial={false} mode="popLayout">
                {on ? (
                  <motion.div
                    key="chip"
                    ref={chip}
                    className="prm-chip"
                    initial="hidden"
                    animate="shown"
                    exit={BLUR_OUT}
                    transition={{ staggerChildren: 0.045, delayChildren: 0.1 }}
                  >
                    <motion.span variants={{ hidden: { opacity: 0, scale: 0.5, rotate: -25 }, shown: { opacity: 1, scale: 1, rotate: 0 } }}>
                      <HugeiconsIcon icon={Ticket01Icon} className="prm-ticket" strokeWidth={1.8} aria-hidden="true" />
                    </motion.span>
                    <motion.b variants={PART}>{applied}</motion.b>
                    <motion.span variants={PART} className="prm-chip-label">
                      {offer && "label" in offer && offer.label}
                    </motion.span>
                    <motion.button
                      type="button"
                      variants={PART}
                      whileTap={{ scale: 0.88 }}
                      aria-label={`Remove ${applied}`}
                      onClick={() => {
                        refocus.current = true;
                        onAppliedChange(null);
                      }}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} aria-hidden="true" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="entry"
                    className="prm-entry"
                    initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay: 0.06 } }}
                    exit={BLUR_OUT}
                  >
                    <Field.Control
                      ref={(node: HTMLInputElement | null) => {
                        if (node && refocus.current) node.focus({ preventScroll: true });
                        refocus.current = false;
                      }}
                      className="fk-input prm-input"
                      placeholder="Promo code"
                      aria-label="Promo code"
                      autoComplete="off"
                      spellCheck={false}
                      value={draft}
                      readOnly={checking}
                      onChange={(event) => {
                        onDraftChange(event.target.value.toUpperCase());
                        if (error) onErrorChange(null);
                      }}
                      onKeyDown={(event) => event.key === "Enter" && apply()}
                    />
                    <motion.button type="button" className="prm-apply" disabled={!draft.trim()} aria-busy={checking || undefined} whileTap={{ scale: 0.96 }} onClick={apply}>
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={String(checking)}
                          className="prm-apply-label"
                          initial={{ opacity: 0, scale: 0.8, filter: "blur(3px)" }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={BLUR_OUT}
                        >
                          {checking ? <HugeiconsIcon icon={Loading03Icon} className="prm-spin" strokeWidth={2.2} aria-label="Checking" /> : "Apply"}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
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

        <div className="prm-total">
          <span>Total</span>
          <span className="prm-total-value">
            <s className="prm-was" data-shown={(totalOn && on) || undefined}>
              {money(SUBTOTAL + SHIPPING)}
            </s>
            <b>
              <Odometer value={money(SUBTOTAL + SHIPPING - (totalOn && on ? off : 0))} />
            </b>
          </span>
        </div>
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
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <PromoCode
        draft={state.draft}
        onDraftChange={(draft) => take((current) => ({ ...current, draft }))}
        applied={state.applied}
        onAppliedChange={(applied) => take((current) => ({ ...current, applied, draft: applied ? current.draft : "" }))}
        error={state.error}
        onErrorChange={(error) => take((current) => ({ ...current, error }))}
      />
    </div>
  );
}
