"use client";
/**
 * A promo code field in an order summary. Type a code and apply it: the field springs down into a
 * small green chip, a ticket, the code and what it's worth, while the discount line opens under the
 * subtotal and the total rolls down to the new price. A code that doesn't work gives the field a
 * small shake and says why, keeping what you typed.
 *
 * Built on Base UI's Field (its invalid state and error) and Input. The field and the chip are one
 * box: Motion springs its size, and its contents are scale-corrected so nothing stretches while it
 * shrinks. The total rolls with the Odometer.
 */
import { Field } from "@base-ui/react/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Ticket01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useRef } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./promo-code.css";

const CODES: Record<string, { off: number; label: string } | { expired: true }> = {
  SAVE20: { off: 0.2, label: "20% off" },
  WELCOME10: { off: 0.1, label: "10% off" },
  SUMMER: { expired: true },
};

const SUBTOTAL = 84;
const SHIPPING = 6;

/** One spring for the box, the discount line and everything else that changes shape. */
const MORPH = { type: "spring" as const, duration: 0.5, bounce: 0.1 };
const FADE = { duration: 0.18 };
const money = (n: number) => `$${n.toFixed(2)}`;

export interface PromoCodeProps {
  draft: string;
  onDraftChange: (draft: string) => void;
  /** The applied code, or null. */
  applied: string | null;
  onAppliedChange: (code: string | null) => void;
  /** Why the last attempt failed, or null. */
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

export function PromoCode({ draft, onDraftChange, applied, onAppliedChange, error, onErrorChange }: PromoCodeProps) {
  // The shake goes on a plain wrapper, never on the box whose size is springing.
  const [shaker, animate] = useAnimate<HTMLDivElement>();
  const offer = applied ? CODES[applied] : null;
  const off = offer && "off" in offer ? Math.round(SUBTOTAL * offer.off * 100) / 100 : 0;
  const total = SUBTOTAL + SHIPPING - off;
  const label = offer && "label" in offer ? offer.label : "";
  const on = off > 0;

  const lastError = useRef(error);
  useEffect(() => {
    if (error && error !== lastError.current && shaker.current) void animate(shaker.current, { x: [0, -5, 4, -2, 1, 0] }, { duration: 0.32 });
    lastError.current = error;
  }, [error, animate, shaker]);

  const apply = () => {
    const code = draft.trim().toUpperCase();
    if (!code) return;
    const found = CODES[code];
    if (!found) return onErrorChange(`“${code}” isn’t a code we know.`);
    if ("expired" in found) return onErrorChange(`“${code}” ended on 31 August.`);
    onErrorChange(null);
    onAppliedChange(code);
  };

  return (
    <div className="fk prm">
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={MORPH}
            >
              <dt>Discount</dt>
              <dd>−{money(off)}</dd>
            </motion.div>
          )}
        </AnimatePresence>
      </dl>

      <Field.Root invalid={error !== null} className="prm-field">
        <div ref={shaker} className="prm-shaker">
          {/* One box: full-width field, then the chip. Its size springs; its contents fade in place. */}
          <motion.div
            layout
            className="prm-box"
            data-state={on ? "applied" : "entry"}
            data-invalid={error ? "" : undefined}
            transition={MORPH}
            style={{ borderRadius: on ? 10 : 12 }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {on ? (
                <motion.div
                  key="chip"
                  layout="position"
                  className="prm-chip"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { ...FADE, delay: 0.12 } }}
                  exit={{ opacity: 0, transition: FADE }}
                >
                  <HugeiconsIcon icon={Ticket01Icon} strokeWidth={1.8} className="prm-ticket" />
                  <b>{applied}</b>
                  <span>{label}</span>
                  <button type="button" aria-label={`Remove ${applied}`} onClick={() => onAppliedChange(null)}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="entry"
                  layout="position"
                  className="prm-entry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { ...FADE, delay: 0.12 } }}
                  exit={{ opacity: 0, transition: FADE }}
                >
                  <Field.Control
                    className="fk-input prm-input"
                    placeholder="Promo code"
                    aria-label="Promo code"
                    autoComplete="off"
                    spellCheck={false}
                    value={draft}
                    onChange={(e) => {
                      onDraftChange(e.target.value.toUpperCase());
                      if (error) onErrorChange(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        apply();
                      }
                    }}
                  />
                  <button type="button" className="prm-apply" disabled={!draft.trim()} onClick={apply}>
                    Apply
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        <AnimatePresence initial={false}>
          {error && (
            <motion.div key="error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={MORPH}>
              <Field.Error className="fk-error prm-error" match>
                {error}
              </Field.Error>
            </motion.div>
          )}
        </AnimatePresence>
      </Field.Root>

      <div className="prm-total">
        <span>Total</span>
        <span className="prm-total-value">
          <s className="prm-was" data-shown={on || undefined}>
            {money(SUBTOTAL + SHIPPING)}
          </s>
          <b>
            <Odometer value={money(total)} />
          </b>
        </span>
      </div>
    </div>
  );
}

interface State {
  draft: string;
  applied: string | null;
  error: string | null;
}

const BEATS: readonly (State & { ms: number })[] = [
  { draft: "", applied: null, error: null, ms: 900 },
  { draft: "SUMMER", applied: null, error: null, ms: 900 },
  { draft: "SUMMER", applied: null, error: "“SUMMER” ended on 31 August.", ms: 1600 },
  { draft: "SAVE", applied: null, error: null, ms: 300 },
  { draft: "SAVE20", applied: null, error: null, ms: 800 },
  { draft: "SAVE20", applied: "SAVE20", error: null, ms: 3000 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface PromoCodeDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function PromoCodeDemo({ playing }: PromoCodeDemoProps = {}) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <PromoCode
        draft={state.draft}
        onDraftChange={(draft) => take((s) => ({ ...s, draft }))}
        applied={state.applied}
        onAppliedChange={(applied) => take((s) => ({ ...s, applied, draft: applied ? s.draft : "" }))}
        error={state.error}
        onErrorChange={(error) => take((s) => ({ ...s, error }))}
      />
    </div>
  );
}
