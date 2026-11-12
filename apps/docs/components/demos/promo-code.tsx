"use client";

import { Field } from "@base-ui/react/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Loading03Icon, Ticket01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, MotionConfig, motion, useAnimate } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type Ref, type RefObject } from "react";
import { Odometer } from "./odometer";
import { FK_ERROR, FK_STAGE, FORM_KIT } from "./form-kit";
import { typing, useScene } from "./use-scene";

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

const TICKET_MASK = {
  mask: [
    "radial-gradient(circle 10px at 0 calc(100% - 76px), transparent 9.5px, #000 10px) left / 51% 100% no-repeat",
    "radial-gradient(circle 10px at 100% calc(100% - 76px), transparent 9.5px, #000 10px) right / 51% 100% no-repeat",
  ].join(", "),
};
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

function TicketLines({ discount }: { discount: number }) {
  return (
    <>
      <header className="relative -mx-3.5 -mt-3.5 mb-0.5 grid h-[196px] overflow-clip rounded-[18px] bg-[#16222b] text-white after:absolute after:inset-0 after:bg-[linear-gradient(to_top,rgb(0_0_0/0.82),rgb(0_0_0/0.2)_60%,transparent_85%)] after:content-['']">
        <img
          src={SHOWING.poster}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover object-[center_30%] select-none"
        />
        <span className="relative z-1 grid gap-0.5 self-end px-4 py-3.5">
          <span className="text-[11px] font-bold tracking-[0.1em] text-[#ffc98a] uppercase">{SHOWING.episode}</span>
          <h3 className="m-0 text-[24px] leading-[1.1] font-extrabold tracking-[-0.03em]">{SHOWING.title}</h3>
          <span className="text-[12.5px] font-medium text-white/80">
            {SHOWING.when} · {SHOWING.where}
          </span>
        </span>
      </header>

      <dl className="m-0 grid text-[13.5px]">
        <div className="flex items-center justify-between pb-1.5">
          <dt className="flex min-w-0 items-center gap-3 text-(--fk-ink)">
            <span className="flex gap-1" aria-hidden="true">
              {SHOWING.seats.map((seat) => (
                <span
                  key={seat}
                  className="grid h-8 w-[30px] place-items-center rounded-[10px_10px_6px_6px] bg-(--fk-ink) pb-1 text-[11px] font-bold tracking-[0.02em] text-(--fk-surface) shadow-[inset_0_-5px_0_color-mix(in_oklab,var(--fk-surface)_18%,transparent)]"
                >
                  {SHOWING.row}
                  {seat}
                </span>
              ))}
            </span>
            <span className="grid min-w-0 gap-px">
              <b className="text-[13.5px] font-semibold">{SEATS} × Standard</b>
              <span className="text-[12px] whitespace-nowrap text-(--fk-muted)">
                Row {SHOWING.row} · {money(PRICE)} each
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
      className="grid h-9 min-w-[72px] flex-none cursor-pointer place-items-center rounded-[9px] border-0 bg-(--fk-ink) px-4 text-[13px] font-semibold text-(--fk-surface) shadow-[0_1px_2px_rgb(0_0_0/0.12)] transition-[background-color,color,box-shadow] duration-200 disabled:cursor-default disabled:bg-(--fk-well-strong) disabled:text-(--fk-muted) disabled:shadow-none group-focus-within/box:disabled:bg-(--fk-well)!"
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
        className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-semibold tracking-[0.08em] text-(--fk-ink) outline-none placeholder:font-[450] placeholder:tracking-normal placeholder:text-(--fk-faint)"
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
          data-shown={saved || undefined}
          className="relative translate-x-1.5 text-[13px] font-[450] text-(--fk-muted) no-underline opacity-0 [transition:opacity_0.25s,translate_0.4s_cubic-bezier(0.32,0.72,0,1)] after:absolute after:inset-x-[-1px] after:top-[55%] after:h-[1.5px] after:origin-left after:scale-x-0 after:bg-current after:transition-[scale] after:duration-300 after:ease-[cubic-bezier(0.32,0.72,0,1)] after:content-[''] data-shown:translate-x-0 data-shown:opacity-100 data-shown:after:scale-x-100 data-shown:after:delay-180 motion-reduce:transition-none motion-reduce:after:transition-none"
        >
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
      <section
        className={`grid w-[min(100%,372px)] gap-4 rounded-[26px] bg-(--fk-surface) p-[22px] ${FORM_KIT}`}
        style={TICKET_MASK}
        aria-label="Your cinema tickets"
      >
        <TicketLines discount={discount} />

        <Field.Root invalid={error !== null} className="grid">
          <div ref={shaker} className="grid h-12 items-center justify-items-start">
            <div
              ref={box}
              data-tone={on ? "applied" : error ? "invalid" : undefined}
              className="group/box relative flex h-12 w-full items-center overflow-clip rounded-[14px] bg-(--fk-well) shadow-[inset_0_0_0_1px_transparent] transition-[background-color,box-shadow] duration-300 focus-within:bg-(--fk-surface) focus-within:shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--fk-ink)_85%,transparent),0_0_0_4px_color-mix(in_oklab,var(--fk-ink)_7%,transparent)] data-[tone=applied]:bg-[color-mix(in_oklab,var(--fk-good)_12%,var(--fk-surface))]! data-[tone=applied]:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--fk-good)_30%,transparent)]! data-[tone=invalid]:bg-[color-mix(in_oklab,var(--fk-bad)_8%,var(--fk-surface))]! data-[tone=invalid]:shadow-none!"
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
