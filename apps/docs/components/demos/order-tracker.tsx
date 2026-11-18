"use client";

import { Clock01Icon, MinusSignIcon, PlusSignIcon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IllustratedStory, StoryFrame, type StoryStage } from "./illustrated-story";
import { useScene } from "./use-scene";

export const ORDER_STAGES: readonly StoryStage[] = [
  {
    id: "preparing",
    label: "Preparing",
    motion: { part: "origin-[76%_47%] animate-lid-rattle", soft: "animate-steam-puff" },
    title: "Preparing your order",
    line: "Aunty Muni is cooking it · arrives 12:45",
    art: {
      soft: "M60 18c-5 6 5 10 0 18h5c5-8-5-12 0-18Z M76 10c-5 7 5 12 0 22h5c5-10-5-15 0-22Z M92 18c-5 6 5 10 0 18h5c5-8-5-12 0-18Z",
      ink: "M44 62h72v28a16 16 0 0 1 -16 16H60a16 16 0 0 1 -16 -16Z M30 67h14v9H30Z M116 67h14v9h-14Z M52 108h56v4H52Z",
      sheen: "M50 66h7v24a11 11 0 0 0 5 10h-4a14 14 0 0 1 -8 -12Z",
      brand: "M44 76h72v6H44Z",
      light: "M44 62h72v2.5H44Z",
      top: "M38 59a42 11 0 0 1 84 0v2H38Z M74 44h12a2 2 0 0 1 2 2v4H72v-4a2 2 0 0 1 2 -2Z",
      topLight: "M48 55a34 8 0 0 1 22 -5v2.5a32 7 0 0 0 -20 4.5Z",
    },
  },
  {
    id: "ready",
    label: "Ready",
    motion: { body: "animate-bag-hop", part: "origin-[50%_40%] animate-handle-swing" },
    title: "Ready for pickup",
    line: "Kojo is collecting it · arrives 12:45",
    art: {
      soft: "M98 24h18v30H98Z",
      ink: "M46 50h68l4 52a6 6 0 0 1 -6 6H48a6 6 0 0 1 -6 -6Z",
      sheen: "M48 54h9l-2 50h-5a4 4 0 0 1 -4 -4Z",
      brand: "M66 80a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z",
      light: "M72 80l3-3l3 3l7-7l3 3l-10 10Z M48 50h66v2.5H48Z",
      top: "M64 51v-9a16 16 0 0 1 32 0v9h-6v-9a10 10 0 0 0 -20 0v9Z",
      topLight: "M93 34h9v13h-9Z",
    },
  },
  {
    id: "riding",
    label: "On the way",
    motion: { body: "animate-scooter-bump", soft: "animate-speed-rush" },
    title: "On the way",
    line: "Kojo is 6 minutes away · arrives 12:44",
    art: {
      soft: "M10 52h20a2 2 0 0 1 0 4H10Z M4 66h24a2 2 0 0 1 0 4H4Z M12 80h16a2 2 0 0 1 0 4H12Z",
      ink: "M38 98a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z M100 98a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z M44 82h56l14-38h10l-15 44a6 6 0 0 1 -6 4H44Z M48 72h28a4 4 0 0 1 0 8H48Z",
      sheen: "M46 84h50v3H46Z M97 86a15 15 0 0 1 28 2h-4a11 11 0 0 0 -20 -2Z",
      brand: "M42 38h32a3 3 0 0 1 3 3v27H39v-27a3 3 0 0 1 3 -3Z",
      light: "M39 50h38v4H39Z M118 50h6v5h-6Z",
      top: "M112 40h18a3 3 0 0 1 0 6h-18Z",
      topLight: "M47 98a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z M109 98a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z",
    },
  },
  {
    id: "delivered",
    label: "Delivered",
    motion: { body: "animate-story-land", part: "origin-[45%_74%] animate-door-swing", soft: "animate-story-rise" },
    title: "Delivered",
    line: "Left at your door at 12:43. Enjoy!",
    art: {
      soft: "M100 16a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z M106 6a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z",
      ink: "M44 62h72v40a6 6 0 0 1 -6 6H50a6 6 0 0 1 -6 -6Z M32 64l48-35l48 35Z M100 32h10v20l-10-7Z",
      sheen: "M40 60l40-29v6l-33 23Z",
      brand: "M22 24a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z M96 92h14l2 16H94Z",
      light: "M52 74h14v12H52Z M29 24l3-3l3 3l7-7l3 3l-10 10Z",
      top: "M84 95h2.5v2.5H84Z",
      topLight: "M72 80a8 8 0 0 1 16 0v28H72Z",
    },
  },
];

const COLORS =
  "[--ils-ink:#191919] [--ils-brand:#ff3008] [--ils-soft:#ffd3c6] [--ils-track:#f3e7e2] dark:[--ils-ink:#f4efec] dark:[--ils-brand:#ff5a36] dark:[--ils-soft:#5c3328] dark:[--ils-track:#3d2e29]";
const SPIN = "animate-[spin_0.45s_linear_infinite]";


export interface OrderTrackerProps {
  stage: number;
  onStageChange?: (stage: number) => void;
  live?: boolean;
}

export function OrderTracker({ stage, onStageChange, live }: OrderTrackerProps) {
  const id = ORDER_STAGES[stage]!.id;
  const riding = id === "riding";
  const delivered = id === "delivered";

  return (
    <IllustratedStory
      colors={COLORS}
      label="Order status"
      stages={ORDER_STAGES}
      stage={stage}
      onStageChange={onStageChange}
      live={live}
      under={
        <StoryFrame shown={riding}>
          <line
            x1="0"
            y1="113"
            x2="160"
            y2="113"
            className={`stroke-(--ils-soft) [stroke-dasharray:10_8] [stroke-linecap:round] [stroke-width:1.6] ${riding ? "animate-road-dash" : ""}`}
          />
        </StoryFrame>
      }
      extras={
        <StoryFrame
          shown={riding}
          className="[&_g]:origin-center [&_g]:[transform-box:fill-box] [&_path]:fill-none [&_path]:stroke-(--ils-light) [&_path]:opacity-55 [&_path]:[stroke-linecap:round] [&_path]:[stroke-width:1.4]"
        >
          <g className={riding ? SPIN : ""}>
            <path d="M50 89v18M41 98h18M43.6 91.6l12.8 12.8M56.4 91.6l-12.8 12.8" />
          </g>
          <g className={riding ? SPIN : ""}>
            <path d="M112 89v18M103 98h18M105.6 91.6l12.8 12.8M118.4 91.6l-12.8 12.8" />
          </g>
        </StoryFrame>
      }
      over={
        <StoryFrame shown={delivered}>
          <circle
            cx="36"
            cy="24"
            r="14"
            className={`origin-[36px_24px] fill-none stroke-(--ils-brand) [stroke-width:2] [transform-box:view-box] ${delivered ? "animate-story-ping" : ""}`}
          />
        </StoryFrame>
      }
    />
  );
}

type Phase = "menu" | "placing" | "sending" | "tracking";

export interface OrderValue {
  phase: Phase;
  quantity: number;
  stage: number;
}

export interface OrderFlowProps {
  value: OrderValue;
  onValueChange: (value: OrderValue) => void;
  live?: boolean;
}

const PRICE = 14;
const PHOTO = "/images/food/waakye.jpg";
const LAST_STAGE = ORDER_STAGES.length - 1;
const ART = { width: 160, height: 128 };
const ART_VIEW_BOX = `0 0 ${ART.width} ${ART.height}`;
const POT = ORDER_STAGES[0]!.art.ink!;

const TIMING = { placing: 650, sending: 640, stage: 3200, handOver: 200, reshapeDelay: 70 };
const SURFACE = { type: "spring" as const, duration: 0.55, bounce: 0.14 };
const RESHAPE = { duration: 0.42, bounce: 0.22 };
const LIFT = { duration: 0.42, ease: [0.32, 0.72, 0, 1] as const };
const SETTLE = { duration: 0.28, ease: "easeOut" as const };

const THEME =
  "[--fo-ink:#191919] [--fo-muted:#6b6560] [--fo-line:#efe7e3] [--fo-card:#ffffff] [--fo-tile:#faf5f2] [--fo-brand:#ff3008] dark:[--fo-ink:#f4efec] dark:[--fo-muted:#a8a09b] dark:[--fo-line:#3d2e29] dark:[--fo-card:#1c1715] dark:[--fo-tile:#261e1b] dark:[--fo-brand:#ff5a36]";

const STEP_BUTTON =
  "grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-(--fo-card) text-(--fo-ink) shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--fo-line)] transition-[background-color] duration-150 ease-out hover:bg-(--fo-tile) active:scale-[0.94] disabled:cursor-default disabled:opacity-40";

const pounds = (value: number) => `£${value.toFixed(2)}`;

const pillPath = (x: number, y: number, width: number, height: number) => {
  const radius = height / 2;
  return `M${x + radius} ${y}h${width - height}a${radius} ${radius} 0 0 1 0 ${height}h${height - width}a${radius} ${radius} 0 0 1 0 ${-height}Z`;
};

function Stepper({ quantity, disabled, onChange }: { quantity: number; disabled: boolean; onChange: (quantity: number) => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-(--fo-tile) p-1">
      <button type="button" className={STEP_BUTTON} disabled={disabled || quantity <= 1} onClick={() => onChange(quantity - 1)} aria-label="One fewer">
        <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      </button>
      <Remold.Text className="min-w-4 text-center text-[14px] font-semibold tabular-nums text-(--fo-ink)" aria-live="polite">
        {String(quantity)}
      </Remold.Text>
      <button type="button" className={STEP_BUTTON} disabled={disabled || quantity >= 9} onClick={() => onChange(quantity + 1)} aria-label="One more">
        <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}

function Details({ quantity, total, busy, onQuantity }: { quantity: number; total: string; busy: boolean; onQuantity: (quantity: number) => void }) {
  return (
    <div className="grid gap-3.5 px-5 pt-4">
      <div className="flex items-center gap-2 text-[12px] text-(--fo-muted)">
        <span className="font-semibold text-(--fo-ink)">Aunty Muni</span>
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={StarIcon} className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          4.8
        </span>
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={Clock01Icon} className="size-3" aria-hidden="true" />
          25–35 min
        </span>
      </div>
      <div className="grid gap-1">
        <h3 className="m-0 text-[19px] leading-tight font-[650] tracking-[-0.015em] text-(--fo-ink)">Waakye special</h3>
        <p className="m-0 text-[13px] leading-snug text-(--fo-muted)">Rice and beans with spaghetti, gari, wele, boiled egg, fried plantain and shito.</p>
      </div>
      <div className="flex items-center justify-between">
        <Stepper quantity={quantity} disabled={busy} onChange={onQuantity} />
        <Remold.Text className="text-[17px] font-[650] tabular-nums text-(--fo-ink)">{total}</Remold.Text>
      </div>
    </div>
  );
}

function Card({
  value,
  total,
  leaving,
  button,
  onValueChange,
}: {
  value: OrderValue;
  total: string;
  leaving: boolean;
  button: RefObject<HTMLButtonElement | null>;
  onValueChange: (value: OrderValue) => void;
}) {
  const busy = value.phase === "placing" || value.phase === "sending";

  return (
    <article className="relative w-[min(100%,360px)] text-left">
      <motion.span
        layoutId="fo-sheet"
        className="absolute inset-0"
        style={{ borderRadius: 26 }}
        initial={{ backgroundColor: "var(--fo-ink)" }}
        animate={{ backgroundColor: "var(--fo-card)", opacity: leaving ? 0 : 1, scale: leaving ? 0.96 : 1 }}
        transition={{ layout: SURFACE, backgroundColor: { duration: 0.35, ease: "easeOut" }, default: { duration: 0.2, ease: "easeOut" } }}
      />
      <motion.div
        className="relative"
        initial={{ opacity: 0, filter: "blur(6px)", scale: 0.97 }}
        animate={{ opacity: leaving ? 0 : 1, filter: leaving ? "blur(6px)" : "blur(0px)", scale: leaving ? 0.97 : 1 }}
        transition={leaving ? { duration: 0.14, ease: "easeOut" } : { ...SETTLE, delay: 0.18 }}
      >
        <div className="relative h-[210px] overflow-hidden rounded-t-[26px] bg-[#16300f]">
          <img
            src={PHOTO}
            alt="Waakye on a banana leaf with spaghetti, gari, boiled egg, fried plantain, salad, meat, stew and shito"
            className="size-full scale-[1.22] object-cover object-[50%_58%]"
            draggable={false}
          />
          <span className="absolute top-3.5 left-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-(--fo-brand) shadow-[0_1px_2px_rgb(0_0_0/0.08)] backdrop-blur-sm">
            Most ordered
          </span>
        </div>
        <Details quantity={value.quantity} total={total} busy={busy} onQuantity={(quantity) => onValueChange({ ...value, quantity })} />
      </motion.div>
      <motion.div
        className="relative p-5 pt-3.5"
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: 0.24 }}
      >
        <motion.button
          ref={button}
          type="button"
          disabled={busy}
          onClick={() => onValueChange({ ...value, phase: "placing" })}
          whileTap={busy ? undefined : { scale: 0.97 }}
          data-hidden={leaving || undefined}
          className="relative grid h-12 w-full cursor-pointer place-items-center rounded-full border-0 bg-(--fo-brand) p-0 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(255_48_8/0.6)] disabled:cursor-default data-hidden:opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fo-brand)"
        >
          <span className="flex items-center gap-2">
            <Remold.Text>{busy ? "Placing your order" : `Order · ${total}`}</Remold.Text>
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
          </span>
        </motion.button>
      </motion.div>
    </article>
  );
}

function OrderAgain({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={{ ...SURFACE, delay: 0.5 }}
      className="relative cursor-pointer rounded-full border-0 bg-transparent px-5 py-2.5 text-[13.5px] font-semibold text-(--fo-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fo-ink)"
    >
      <motion.span layoutId="fo-sheet" className="absolute inset-0 bg-(--fo-ink)" style={{ borderRadius: 999 }} transition={{ layout: SURFACE }} />
      <span className="relative">Order again</span>
    </motion.button>
  );
}

interface Morph {
  box: { left: number; top: number; width: number; height: number };
  pill: string;
}

function useButtonToPot(sending: boolean, tracking: boolean, reduced: boolean | null) {
  const cell = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const tracker = useRef<HTMLDivElement>(null);
  const [morph, setMorph] = useState<Morph | null>(null);
  const [shaped, setShaped] = useState(false);

  useLayoutEffect(() => {
    const art = tracker.current?.querySelector<HTMLElement>("[role=img]");
    if (!sending || reduced || !cell.current || !button.current || !art) return;
    const area = cell.current.getBoundingClientRect();
    const from = button.current.getBoundingClientRect();
    const to = art.getBoundingClientRect();
    const scale = to.width / ART.width;
    setMorph({
      box: { left: to.left - area.left, top: to.top - area.top, width: to.width, height: to.height },
      pill: pillPath((from.left - to.left) / scale, (from.top - to.top) / scale, from.width / scale, from.height / scale),
    });
    setShaped(false);
    const timer = setTimeout(() => setShaped(true), TIMING.reshapeDelay);
    return () => clearTimeout(timer);
  }, [sending, reduced]);

  useEffect(() => {
    if (sending) return;
    const timer = setTimeout(() => setMorph(null), tracking ? TIMING.handOver : 0);
    return () => clearTimeout(timer);
  }, [sending, tracking]);

  return { cell, button, tracker, morph, shaped };
}

function PotMorph({ morph, shaped }: { morph: Morph; shaped: boolean }) {
  return (
    <motion.svg
      className="pointer-events-none absolute overflow-visible"
      style={morph.box}
      viewBox={ART_VIEW_BOX}
      animate={shaped ? { y: [0, -10, 0], scale: [1, 1.05, 1] } : { y: 0, scale: 0.97 }}
      transition={shaped ? LIFT : { duration: 0.08 }}
      aria-hidden="true"
    >
      <Remold.Icon
        path={shaped ? POT : morph.pill}
        viewBox={ART_VIEW_BOX}
        spring={RESHAPE}
        className={`overflow-visible transition-[color] duration-300 ease-out ${shaped ? "text-(--fo-ink)" : "text-(--fo-brand)"}`}
        fill="currentColor"
      />
    </motion.svg>
  );
}

export function OrderFlow({ value, onValueChange, live }: OrderFlowProps) {
  const reduced = useReducedMotion();
  const sending = value.phase === "sending";
  const tracking = value.phase === "tracking";
  const total = pounds(PRICE * value.quantity);
  const { cell, button, tracker, morph, shaped } = useButtonToPot(sending, tracking, reduced);

  return (
    <div ref={cell} className={`relative grid min-h-[460px] w-[min(100%,380px)] place-items-center [&>*]:[grid-area:1/1] ${THEME}`}>
      <AnimatePresence initial={false}>
        {!tracking && (
          <motion.div key="card" className="grid w-full justify-items-center" exit={{ opacity: 0, transition: { duration: 0.01 } }}>
            <Card value={value} total={total} leaving={sending && !reduced} button={button} onValueChange={onValueChange} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {(sending || tracking) && (
          <motion.div
            key="tracker"
            ref={tracker}
            className="grid w-full justify-items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: tracking ? 1 : 0 }}
            exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.16, ease: "easeOut" } }}
            transition={{ duration: tracking ? 0.2 : 0, ease: "easeOut" }}
            aria-hidden={!tracking || undefined}
          >
            <span className="rounded-full bg-(--fo-tile) px-3 py-1 text-[12px] font-semibold text-(--fo-muted) tabular-nums">
              {value.quantity} × Waakye · {total}
            </span>
            <OrderTracker stage={value.stage} onStageChange={(stage) => onValueChange({ ...value, stage })} live={live} />
            <AnimatePresence initial={false}>
              {tracking && value.stage === LAST_STAGE && (
                <OrderAgain key="again" onClick={() => onValueChange({ phase: "menu", quantity: value.quantity, stage: 0 })} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {morph && <PotMorph morph={morph} shaped={shaped} />}
    </div>
  );
}

const BEATS: readonly (OrderValue & { ms: number })[] = [
  { phase: "menu", quantity: 1, stage: 0, ms: 1800 },
  { phase: "menu", quantity: 2, stage: 0, ms: 1400 },
  { phase: "placing", quantity: 2, stage: 0, ms: TIMING.placing },
  { phase: "sending", quantity: 2, stage: 0, ms: TIMING.sending },
  { phase: "tracking", quantity: 2, stage: 0, ms: 3200 },
  { phase: "tracking", quantity: 2, stage: 1, ms: 2800 },
  { phase: "tracking", quantity: 2, stage: 2, ms: 3000 },
  { phase: "tracking", quantity: 2, stage: 3, ms: 3600 },
];

const fromBeat = (step: number): OrderValue => {
  const { ms: _ms, ...value } = BEATS[step]!;
  return value;
};

function nextStep(value: OrderValue): { ms: number; next: OrderValue } | null {
  if (value.phase === "placing") return { ms: TIMING.placing, next: { ...value, phase: "sending" } };
  if (value.phase === "sending") return { ms: TIMING.sending, next: { ...value, phase: "tracking", stage: 0 } };
  if (value.phase === "tracking" && value.stage < LAST_STAGE) return { ms: TIMING.stage, next: { ...value, stage: value.stage + 1 } };
  return null;
}

export function OrderTrackerDemo({ playing }: { playing?: boolean; preview?: boolean } = {}) {
  const { ref, state, takeOver, live } = useScene(BEATS, fromBeat, playing, true);

  useEffect(() => {
    const step = nextStep(state);
    if (live || !step) return;
    const timer = setTimeout(() => takeOver(step.next), step.ms);
    return () => clearTimeout(timer);
  }, [live, state, takeOver]);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className="not-prose grid w-full place-items-center px-4 py-8">
        <OrderFlow value={state} onValueChange={takeOver} live={live} />
      </div>
    </MotionConfig>
  );
}
