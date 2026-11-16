"use client";
import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { FK_STAGE, FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

export interface Diner {
  id: string;
  name: string;
}

export interface SplitAmountValue {
  people: string[];
  tip: number;
}

export interface SplitAmountProps {
  value?: SplitAmountValue;
  defaultValue?: SplitAmountValue;
  onValueChange?: (value: SplitAmountValue, details: ChangeDetails) => void;
  diners?: Diner[];
  onRequest?: (shares: { id: string; amount: number }[]) => void;
  ref?: Ref<HTMLDivElement>;
}

const DINERS: Diner[] = [
  { id: "you", name: "You" },
  { id: "ama", name: "Ama Owusu" },
  { id: "kofi", name: "Kofi Mensah" },
  { id: "efua", name: "Efua Asante" },
  { id: "yaw", name: "Yaw Boateng" },
];

const TIPS = [0, 10, 15, 20];
const SUBTOTAL = 11_000;
const SENT_FOR = 1800;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.14 };

const STAGE = 300;
const CENTRE = STAGE / 2;
const TABLE = 70;
const RING = 14;
const SEATS = 122;
const GAP = 0.035;
const BENCH_Y = STAGE + 72;
const BENCH_STEP = 66;
const FIELD_HEIGHT = BENCH_Y + 54;

const HUES = [
  { tone: "#6366f1", soft: "e0e7ff" },
  { tone: "#f59e0b", soft: "fef3c7" },
  { tone: "#10b981", soft: "d1fae5" },
  { tone: "#ec4899", soft: "fce7f3" },
  { tone: "#0ea5e9", soft: "e0f2fe" },
] as const;

const money = (cents: number) => `£${(cents / 100).toFixed(2)}`;
const face = (name: string, soft: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=${soft}`;

function shares(total: number, count: number): number[] {
  if (!count) return [];
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

export function SplitAmount({
  value,
  defaultValue = { people: ["you"], tip: 15 },
  onValueChange,
  diners = DINERS,
  onRequest,
  ref,
}: SplitAmountProps) {
  const [split, setSplit] = useControllableState({ value, defaultValue, onValueChange });
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();

  useEffect(() => () => clearTimeout(sentTimer.current), []);

  const paying = diners.filter((diner) => diner.id === "you" || split.people.includes(diner.id));
  const total = Math.round(SUBTOTAL * (1 + split.tip / 100));
  const each = shares(total, paying.length);
  const owed = each.reduce((sum, amount, index) => (paying[index]!.id === "you" ? sum : sum + amount), 0);
  const others = paying.length - 1;

  const choose = (people: string[]) => {
    setSent(false);
    setSplit((current) => ({ ...current, people: ["you", ...people.filter((person) => person !== "you")] }));
  };

  const request = () => {
    onRequest?.(
      paying
        .map((diner, index) => ({ id: diner.id, amount: each[index]! }))
        .filter((share) => share.id !== "you"),
    );
    setSent(true);
    announce("Requests sent");
    clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSent(false), SENT_FOR);
  };

  const slice = paying.length ? 360 / paying.length : 360;
  const seatAngle = (index: number) => 90 + index * slice;
  const hueOf = (diner: Diner) => HUES[Math.max(0, diners.indexOf(diner)) % HUES.length]!;
  const benched = diners.filter((diner) => !paying.includes(diner));
  const placeOf = (diner: Diner) => {
    const seat = paying.indexOf(diner);

    if (seat >= 0) {
      const angle = (seatAngle(seat) * Math.PI) / 180;

      return { x: CENTRE + Math.cos(angle) * SEATS, y: CENTRE + Math.sin(angle) * SEATS };
    }

    const spot = benched.indexOf(diner);

    return { x: CENTRE + (spot - (benched.length - 1) / 2) * BENCH_STEP, y: BENCH_Y };
  };
  const gap = paying.length > 1 ? GAP : 0;

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div ref={ref} className={`grid w-[min(100%,380px)] gap-5 rounded-[32px] bg-(--fk-surface) p-6 ${FORM_KIT}`}>
        <header className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Dinner at Buka</span>
          <span className="inline-flex items-baseline gap-1 text-[13px] text-(--fk-muted)">
            <Odometer value={money(total)} /> total
          </span>
        </header>

        <div className="relative mx-auto w-[300px]" style={{ height: FIELD_HEIGHT }}>
          <svg viewBox={`0 0 ${STAGE} ${STAGE}`} className="absolute inset-x-0 top-0 size-[300px] overflow-visible" aria-hidden="true">
            <circle
              cx={CENTRE}
              cy={CENTRE}
              r={TABLE - RING / 2 - 6}
              className="fill-[color-mix(in_oklab,#d6b48c_16%,var(--fk-surface))] dark:fill-[color-mix(in_oklab,#d6b48c_10%,var(--fk-surface))]"
            />
            <circle cx={CENTRE} cy={CENTRE} r={TABLE} fill="none" strokeWidth={RING} className="stroke-(--fk-well)" />
            <AnimatePresence initial={false}>
              {paying.map((diner, index) => (
                <motion.circle
                  key={diner.id}
                  cx={CENTRE}
                  cy={CENTRE}
                  r={TABLE}
                  fill="none"
                  strokeWidth={RING}
                  strokeLinecap="round"
                  stroke={hueOf(diner).tone}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  initial={{ pathLength: 0, rotate: seatAngle(index), opacity: 0 }}
                  animate={{
                    pathLength: Math.max(0.001, 1 / paying.length - gap),
                    rotate: seatAngle(index) - slice / 2 + (gap * 360) / 2,
                    opacity: 1,
                  }}
                  exit={{ pathLength: 0, opacity: 0, transition: { ...SPRING, bounce: 0 } }}
                />
              ))}
            </AnimatePresence>
          </svg>

          <div className="pointer-events-none absolute top-[150px] left-1/2 grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 text-center">
            <Odometer value={money(each[0] ?? 0)} className="text-[30px] font-semibold tracking-[-0.03em]" />
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-(--fk-muted)">
              <span className="size-2 rounded-full" style={{ background: hueOf(paying.find((diner) => diner.id === "you") ?? diners[0]!).tone }} aria-hidden="true" />
              {others === 0 ? "Just you so far" : `Your share of ${paying.length}`}
            </span>
          </div>

          <ToggleGroup
            multiple
            className="contents"
            aria-label="Who's splitting"
            value={paying.map((diner) => diner.id)}
            onValueChange={(people) => choose(people as string[])}
          >
            {diners.map((diner) => {
              const included = paying.includes(diner);
              const firstName = diner.name.split(" ")[0];
              const place = placeOf(diner);
              const hue = hueOf(diner);

              return (
                <Toggle
                  key={diner.id}
                  value={diner.id}
                  disabled={diner.id === "you"}
                  aria-label={diner.id === "you" ? "You" : `Split with ${diner.name}`}
                  className="group/diner absolute top-0 left-0 -mt-6 -ml-[30px] grid w-[60px] cursor-pointer justify-items-center gap-1.5 rounded-[14px] border-0 bg-transparent p-0 outline-none focus-visible:shadow-[0_0_0_2px_var(--fk-surface),0_0_0_4px_var(--fk-ink)] data-disabled:cursor-default"
                  style={{ "--seat": hue.tone } as CSSProperties}
                  render={<motion.button type="button" initial={false} animate={place} />}
                >
                  <motion.span
                    className="relative block"
                    animate={{ scale: included ? 1 : 0.88 }}
                    whileTap={diner.id === "you" ? undefined : { scale: 0.82 }}
                  >
                    <img
                      className="block rounded-full bg-(--fk-well) opacity-45 grayscale transition-[opacity,filter,box-shadow] duration-200 ease-out group-data-pressed/diner:opacity-100 group-data-pressed/diner:shadow-[0_0_0_2.5px_var(--fk-surface),0_0_0_4.5px_var(--seat)] group-data-pressed/diner:grayscale-0 motion-reduce:transition-none"
                      src={face(diner.name, hue.soft)}
                      alt=""
                      width={48}
                      height={48}
                      draggable={false}
                    />
                    {diner.id !== "you" && (
                      <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-(--fk-surface)">
                        <span className="grid size-4 place-items-center rounded-full bg-(--fk-well-strong) text-(--fk-muted) transition-colors duration-200 ease-out group-data-pressed/diner:bg-(--seat) group-data-pressed/diner:text-white motion-reduce:transition-none">
                          <Remold.Icon
                            icon={<HugeiconsIcon icon={included ? Tick02Icon : Add01Icon} />}
                            strokeWidth={2.6}
                            className="size-2.5"
                          />
                        </span>
                      </span>
                    )}
                  </motion.span>
                  <span className="text-[12px] font-medium text-(--fk-muted) transition-colors duration-200 ease-out group-data-pressed/diner:text-(--fk-ink) motion-reduce:transition-none">
                    {firstName}
                  </span>
                </Toggle>
              );
            })}
          </ToggleGroup>

          <AnimatePresence initial={false}>
            {benched.length > 0 && (
              <motion.span
                key="bench"
                className="absolute inset-x-0 text-center text-[11.5px] font-medium tracking-[0.02em] text-(--fk-muted) uppercase"
                style={{ top: BENCH_Y - 46 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Tap to add
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[13.5px] font-medium">Tip</span>
          <ToggleGroup
            className="flex h-9 rounded-full bg-(--fk-well) p-[3px]"
            aria-label="Tip"
            value={[String(split.tip)]}
            onValueChange={(values) =>
              values[0] && setSplit((current) => ({ ...current, tip: Number(values[0]) }))
            }
          >
            {TIPS.map((tip) => (
              <Toggle
                key={tip}
                value={String(tip)}
                className="relative min-w-[52px] cursor-pointer rounded-full border-0 bg-transparent px-2.5 text-[13px] font-medium text-(--fk-muted) outline-none transition-colors duration-200 ease-out focus-visible:shadow-[0_0_0_2px_var(--fk-ink)] data-pressed:text-(--fk-ink)"
              >
                {split.tip === tip && (
                  <motion.span
                    layoutId={`${id}-tip`}
                    className="absolute inset-0 rounded-full bg-(--fk-surface) dark:bg-(--fk-well-strong)"
                  />
                )}
                <span className="relative">{tip ? `${tip}%` : "None"}</span>
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <Button
          className="grid h-12 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-(--fk-ink) text-[14.5px] font-semibold text-(--fk-surface) outline-none transition-[opacity,scale] duration-150 ease-out focus-visible:shadow-[0_0_0_2px_var(--fk-surface),0_0_0_4px_var(--fk-ink)] enabled:active:scale-[0.98] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
          disabled={others === 0}
          onClick={request}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={sent ? "sent" : "ask"}
              className="inline-flex items-center gap-1.5 whitespace-nowrap [&_svg]:size-4"
              initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(3px)", transition: { duration: 0.12 } }}
            >
              {sent ? (
                <>
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} aria-hidden="true" />
                  Requests sent
                </>
              ) : others === 0 ? (
                "Tap a seat to split"
              ) : (
                <>
                  Request <Odometer value={money(owed)} /> from{" "}
                  {others === 1 ? "1 person" : `${others} people`}
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
        <p className="sr-only" aria-live="polite">
          {`${paying.length === 1 ? "Just you" : `${paying.length} people`}, ${money(each[0] ?? 0)} each.`}
        </p>
      </div>
    </MotionConfig>
  );
}

const BEATS: readonly (SplitAmountValue & { ms: number })[] = [
  { people: ["you", "ama"], tip: 15, ms: 1400 },
  { people: ["you", "ama", "kofi"], tip: 15, ms: 1400 },
  { people: ["you", "ama", "kofi", "efua"], tip: 15, ms: 1500 },
  { people: ["you", "ama", "kofi", "efua"], tip: 20, ms: 1500 },
  { people: ["you", "ama", "efua"], tip: 20, ms: 2400 },
];

const fromBeat = (step: number): SplitAmountValue => ({ people: BEATS[step]!.people, tip: BEATS[step]!.tip });

export function SplitAmountDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <div className={FK_STAGE}>
      <SplitAmount ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />
    </div>
  );
}
