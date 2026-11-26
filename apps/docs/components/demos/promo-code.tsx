"use client";

import { Field } from "@base-ui/react/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Loading03Icon, Ticket01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type Ref, type RefObject } from "react";
import { Odometer } from "./odometer";
import { FK_ERROR, FK_STAGE, FORM_KIT } from "./form-kit";
import { useFocusAfterChange } from "./use-focus-after-change";
import { typing, useScene } from "./use-scene";

const CODES: Record<string, { off: number; label: string } | { expired: true }> = {
  FRIDAY50: { off: 0.5, label: "50% off" },
  SAVE20: { off: 0.2, label: "20% off" },
  WELCOME10: { off: 0.1, label: "10% off" },
  SUMMER: { expired: true },
};

const EVENT = {
  kind: "Live jazz",
  title: "Highlife Nights",
  when: "Sat 12 Dec · Doors 7:00 pm",
  where: "Jazz Cafe, Camden",
  section: "Stalls",
  row: "F",
  seats: [7, 8],
};

const SEATS = EVENT.seats.length;
const PRICE = 24;
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

const TICKET_MASK = {
  mask: [
    "radial-gradient(circle 10px at 0 calc(100% - 76px), transparent 9.5px, #000 10px) left / 51% 100% no-repeat",
    "radial-gradient(circle 10px at 100% calc(100% - 76px), transparent 9.5px, #000 10px) right / 51% 100% no-repeat",
  ].join(", "),
};
const POSTER =
  "bg-[#ffe3c2] bg-[repeating-radial-gradient(circle_at_100%_0%,rgb(255_255_255/0.55)_0_2px,transparent_2px_15px),linear-gradient(135deg,#ffe9c9,#ffd0b5_55%,#f9c3d6)]";
const GOOD_INK = "text-[color-mix(in_oklab,var(--fk-good)_85%,var(--fk-ink))]";

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

function Instruments() {
  return (
    <svg viewBox="0 0 356 168" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
      <g fill="#fff" fillOpacity="0.8" stroke="#fff" strokeOpacity="0.8" strokeWidth="2.2" strokeLinecap="round">
        <g transform="translate(58 44)">
          <ellipse rx="5" ry="3.8" transform="rotate(-20)" stroke="none" />
          <ellipse cx="17" cy="-4" rx="5" ry="3.8" transform="rotate(-20 17 -4)" stroke="none" />
          <path d="M4.4 -1.4V-22l17 -4V-5.4" fill="none" />
          <path d="M4.4 -22l17 -4" fill="none" strokeWidth="4.4" strokeLinecap="butt" />
        </g>
        <g transform="translate(26 70) scale(0.8)">
          <ellipse rx="5" ry="3.8" transform="rotate(-20)" stroke="none" />
          <path d="M4.4 -1.4V-22c6 2 9 6 8 12" fill="none" />
        </g>
        <g transform="translate(238 26) scale(0.85)">
          <ellipse rx="5" ry="3.8" transform="rotate(-20)" stroke="none" />
          <path d="M4.4 -1.4V-22c6 2 9 6 8 12" fill="none" />
        </g>
      </g>

      <g transform="translate(112 51) rotate(-20) scale(0.95)">
        <rect x="32" y="22" width="40" height="17" rx="8.5" fill="none" stroke="#c96a22" strokeWidth="4" />
        <path d="M82 17.5C95 17.5 104 12 112 3V38C104 29 95 23.5 82 23.5Z" fill="#e58a37" />
        <ellipse cx="112" cy="20.5" rx="3.2" ry="17.5" fill="#b2591a" />
        <rect x="9" y="17.5" width="76" height="6" rx="3" fill="#e58a37" />
        <path d="M10 17.5L3 15V26L10 23.5Z" fill="#b2591a" />
        {[40, 50, 60].map((x) => (
          <g key={x}>
            <rect x={x} y="7" width="6" height="30" rx="3" fill="#c96a22" />
            <circle cx={x + 3} cy="5.5" r="3.6" fill="#fff3da" />
          </g>
        ))}
      </g>

      <g transform="translate(250 12) rotate(9) scale(1.06)">
        <path d="M61 26C61 9 50 4 39 9" fill="none" stroke="#b87420" strokeWidth="6" strokeLinecap="round" />
        <path d="M40 8.5L28 14" fill="none" stroke="#3b1d2a" strokeWidth="5" strokeLinecap="round" />
        <path d="M57 22H66L70 98C72 127 36 131 24 108L6 72L40 66L36 96C38 108 53 108 55 96Z" fill="#d6922f" />
        <ellipse cx="23" cy="69" rx="17.5" ry="5.5" transform="rotate(-10 23 69)" fill="#8f5413" />
        <path d="M66.5 30L69.5 96" fill="none" stroke="#f3c877" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
        {[38, 52, 66, 80].map((y, index) => (
          <circle key={y} cx={61 + index * 0.7} cy={y} r="3.4" fill="#fff3da" />
        ))}
        <circle cx="25" cy="90" r="4.2" fill="#fff3da" />
      </g>
    </svg>
  );
}

function TicketLines({ discount }: { discount: number }) {
  return (
    <>
      <header className={`relative -mx-3.5 -mt-3.5 mb-0.5 grid h-[172px] content-end overflow-clip rounded-[18px] px-4 py-3.5 text-[#2a1a12] ${POSTER}`}>
        <Instruments />

        <span className="relative grid gap-1">
          <span className="text-[11px] font-bold tracking-[0.1em] text-[#b0481c] uppercase">
            {EVENT.kind} · {EVENT.where}
          </span>
          <h3 className="m-0 text-[26px] leading-[1.05] font-extrabold tracking-[-0.03em]">{EVENT.title}</h3>
          <span className="text-[12.5px] font-medium text-[#2a1a12]/70">{EVENT.when}</span>
        </span>
      </header>

      <dl className="m-0 grid text-[13.5px]">
        <div className="flex items-center justify-between pb-3">
          <dt className="flex min-w-0 items-center gap-3 text-(--fk-ink)">
            <span className="flex gap-1" aria-hidden="true">
              {EVENT.seats.map((seat) => (
                <span
                  key={seat}
                  className="grid h-8 w-[30px] place-items-center rounded-[10px_10px_6px_6px] bg-(--fk-ink) pb-1 text-[11px] font-bold tracking-[0.02em] text-(--fk-surface) shadow-[inset_0_-5px_0_color-mix(in_oklab,var(--fk-surface)_18%,transparent)]"
                >
                  {EVENT.row}
                  {seat}
                </span>
              ))}
            </span>
            <span className="grid min-w-0 gap-px">
              <b className="text-[13.5px] font-semibold">{SEATS} × {EVENT.section}</b>
              <span className="text-[12px] whitespace-nowrap text-(--fk-muted)">
                Row {EVENT.row} · {money(PRICE)} each
              </span>
            </span>
          </dt>
          <dd className="m-0 text-[14px] font-semibold tabular-nums">{money(SUBTOTAL)}</dd>
        </div>

        <div className="flex justify-between border-t border-solid border-(--fk-line) pt-3">
          <dt className="text-(--fk-muted)">Booking fee</dt>
          <dd className="m-0 tabular-nums">{money(FEE)}</dd>
        </div>

        <AnimatePresence initial={false}>
          {discount > 0 && (
            <motion.div
              key="discount"
              className={`flex justify-between overflow-clip [&>*]:flex [&>*]:items-center [&>*]:gap-1.5 [&>*]:pt-2 [&>*]:font-semibold ${GOOD_INK}`}
              initial={{ height: 0 }}
              animate={{ height: "auto", transition: { ...SPRING, delay: 0.14 } }}
              exit={{ height: 0, transition: { ...SPRING, bounce: 0 } }}
            >
              <motion.dt {...DISCOUNT_PART}>Discount</motion.dt>
              <motion.dd className="m-0 tabular-nums" {...DISCOUNT_PART}>−{money(discount)}</motion.dd>
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
      className="flex flex-none items-center gap-2 pr-1 pl-3 text-[13px] whitespace-nowrap text-[color-mix(in_oklab,var(--fk-good)_78%,var(--fk-ink))] [&>*]:grid"
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
        <HugeiconsIcon icon={Ticket01Icon} className="size-4" strokeWidth={1.8} aria-hidden="true" />
      </motion.span>
      <motion.i
        variants={PART}
        className="h-4 w-0 border-l-[1.5px] border-dashed border-[color-mix(in_oklab,var(--fk-good)_45%,transparent)]"
        aria-hidden="true"
      />
      <motion.b variants={PART} className="font-bold tracking-[0.06em]">
        {code}
      </motion.b>
      <motion.span variants={PART} className="opacity-80">
        {offer && "label" in offer && offer.label}
      </motion.span>
      <motion.button
        type="button"
        variants={PART}
        whileTap={{ scale: 0.88 }}
        className="size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit hover:bg-[color-mix(in_oklab,var(--fk-good)_16%,transparent)] focus-visible:-outline-offset-2! focus-visible:outline-current! [&_svg]:size-3.5"
        aria-label={`Remove ${code}`}
        data-promo-remove=""
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
      className="grid h-9 min-w-[72px] flex-none cursor-pointer place-items-center rounded-[9px] border-0 bg-(--fk-ink) px-4 text-[13px] font-semibold text-(--fk-surface) shadow-[0_1px_2px_rgb(0_0_0/0.12)] transition-[background-color,color,box-shadow] duration-200 disabled:cursor-default disabled:bg-(--fk-well-strong) disabled:text-(--fk-muted) disabled:shadow-none"
      disabled={disabled}
      aria-busy={checking || undefined}
      whileTap={{ scale: 0.96 }}
      onClick={onApply}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={String(checking)}
          className="grid [grid-area:1/1]"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(3px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={BLUR_OUT}
        >
          {checking ? (
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 animate-spin motion-reduce:animate-none"
              strokeWidth={2.2}
              role="img"
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
      className="flex min-w-0 flex-1 items-center gap-2 self-stretch py-1.5 pr-1.5 pl-4"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay: 0.06 } }}
      exit={BLUR_OUT}
    >
      <Field.Control
        ref={(node: HTMLInputElement | null) => {
          if (node && focusOnMount.current) node.focus({ preventScroll: true });
          focusOnMount.current = false;
        }}
        className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-semibold tracking-[0.08em] text-(--fk-ink) outline-none placeholder:font-[450] placeholder:tracking-normal placeholder:text-(--fk-muted)"
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
    <div className="relative mt-1.5 flex h-[54px] items-center justify-between pt-5 text-[14px] font-semibold before:absolute before:-top-px before:-right-2.5 before:-left-2.5 before:h-0.5 before:rounded-[1px] before:bg-[repeating-linear-gradient(90deg,color-mix(in_oklab,var(--fk-ink)_16%,transparent)_0_7px,transparent_7px_12px)] before:content-['']">
      <span className="inline-flex items-center gap-2">
        Total
        <AnimatePresence initial={false}>
          {saved && (
            <motion.span
              key="saved"
              className={`rounded-full bg-[color-mix(in_oklab,var(--fk-good)_13%,transparent)] px-2 py-[3px] text-[11.5px] font-[650] whitespace-nowrap ${GOOD_INK}`}
              {...SAVED}
            >
              Saved {money(discount)}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="inline-flex items-baseline gap-2">
        <s
          aria-hidden={!saved}
          data-shown={saved || undefined}
          className="relative translate-x-1.5 text-[13px] font-[450] text-(--fk-muted) no-underline opacity-0 [transition:opacity_0.25s,translate_0.4s_cubic-bezier(0.32,0.72,0,1)] after:absolute after:inset-x-[-1px] after:top-[55%] after:h-[1.5px] after:origin-left after:scale-x-0 after:bg-current after:transition-[scale] after:duration-300 after:ease-[cubic-bezier(0.32,0.72,0,1)] after:content-[''] data-shown:translate-x-0 data-shown:opacity-100 data-shown:after:scale-x-100 data-shown:after:delay-180 motion-reduce:transition-none motion-reduce:after:transition-none"
        >
          <span className="sr-only">Was </span>
          {money(SUBTOTAL + FEE)}
        </s>
        <b className="text-[26px] font-[650] tracking-[-0.025em]">
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
  const [status, setStatus] = useState("");
  const [swaps, setSwaps] = useState(0);
  const reduced = useReducedMotion();
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
    if (error && !reduced) void animate(shaker.current, { x: [0, -6, 5, -3, 1, 0] }, { duration: 0.36 });
  }, [error, reduced, animate, shaker]);

  useFocusAfterChange(box, swaps, (field) => field.querySelector<HTMLElement>("[data-promo-remove]"));

  const apply = () => {
    const code = draft.trim();
    if (!code || checking) return;

    onErrorChange(null);
    setStatus("");
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      const found = CODES[code];
      const problem = errorFor(code, found);
      if (problem) {
        setStatus(problem);
        onErrorChange(problem);
      } else {
        if (found && "off" in found)
          setStatus(`${code} applied, ${found.label}. Total ${money(SUBTOTAL + FEE - SUBTOTAL * found.off)}.`);
        onAppliedChange(code);
      }
    }, CHECKING_FOR);
  };

  const onDraft = (next: string) => {
    onDraftChange(next);
    if (error) onErrorChange(null);
  };

  const remove = () => {
    refocus.current = true;
    setStatus(`${applied} removed. Total ${money(SUBTOTAL + FEE)}.`);
    onAppliedChange(null);
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <section
        className={`grid w-[min(100%,372px)] gap-4 rounded-[26px] bg-(--fk-surface) p-[22px] ${FORM_KIT}`}
        style={TICKET_MASK}
        aria-label="Your tickets"
      >
        <TicketLines discount={discount} />

        <Field.Root invalid={error !== null} className="grid">
          <div ref={shaker} className="grid h-12 items-center justify-items-start">
            <div
              ref={box}
              data-tone={on ? "applied" : error ? "invalid" : undefined}
              className="group/box relative flex h-12 w-full items-center overflow-clip rounded-[14px] bg-(--fk-well) shadow-[inset_0_0_0_1px_transparent] transition-[background-color,box-shadow] duration-300 data-[tone=applied]:bg-[color-mix(in_oklab,var(--fk-good)_12%,var(--fk-surface))]! data-[tone=applied]:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--fk-good)_30%,transparent)]! data-[tone=invalid]:bg-[color-mix(in_oklab,var(--fk-bad)_8%,var(--fk-surface))]! data-[tone=invalid]:shadow-none!"
            >
              <AnimatePresence
                initial={false}
                mode="popLayout"
                onExitComplete={() => setSwaps((count) => count + 1)}
              >
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
                className="overflow-clip"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: { ...SPRING, bounce: 0 } }}
              >
                <Field.Error className={`pt-2 ${FK_ERROR}`} match>
                  {error}
                </Field.Error>
              </motion.div>
            )}
          </AnimatePresence>
        </Field.Root>

        <Total discount={totalOn && on ? discount : 0} />

        <p className="sr-only" role="status">
          {status}
        </p>
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
  ...typing("FRIDAY50", (draft) => ({ draft, applied: null, error: null }), { every: 90, hold: 800 }),
  { draft: "FRIDAY50", applied: "FRIDAY50", error: null, ms: 3000 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function PromoCodeDemo({ playing }: { playing?: boolean } = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className={FK_STAGE}>
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
