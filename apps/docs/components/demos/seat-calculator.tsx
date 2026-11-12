"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon, MinusSignIcon, CheckIcon } from "@hugeicons/core-free-icons";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

interface Tier {
  name: string;
  from: number;
  price: number | null;
  adds: string[];
}

const TIERS: Tier[] = [
  { name: "Starter", from: 1, price: 14, adds: ["Unlimited projects", "Real-time collaboration"] },
  { name: "Team", from: 10, price: 12, adds: ["Admin roles and permissions"] },
  { name: "Business", from: 50, price: 10, adds: ["SSO and SAML", "Audit log"] },
  { name: "Enterprise", from: 150, price: null, adds: ["A dedicated success manager"] },
];

const YEARLY_OFF = 0.2;

const BENDS: [number, number][] = [
  [0, 1],
  [250, 10],
  [550, 50],
  [850, 150],
  [1000, 200],
];
const STOPS = 1000;

const seatsAt = (position: number) => {
  for (let i = 1; i < BENDS.length; i++) {
    const [p1, s1] = BENDS[i]!;
    const [p0, s0] = BENDS[i - 1]!;
    if (position <= p1) return Math.round(s0 + ((position - p0) / (p1 - p0)) * (s1 - s0));
  }
  return BENDS[BENDS.length - 1]![1];
};

const positionOf = (seats: number) => {
  for (let i = 1; i < BENDS.length; i++) {
    const [p1, s1] = BENDS[i]!;
    const [p0, s0] = BENDS[i - 1]!;
    if (seats <= s1) return p0 + ((seats - s0) / (s1 - s0)) * (p1 - p0);
  }
  return STOPS;
};
const percentOf = (seats: number) => `${(positionOf(seats) / STOPS) * 100}%`;

const tierOf = (seats: number) => [...TIERS].reverse().find((candidate) => seats >= candidate.from)!;
const money = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;

const FACES = [
  "Ama Mensah",
  "Kwame Owusu",
  "Efua Addo",
  "Esi Ofori",
  "Kofi Agyeman",
  "Yaw Darko",
  "Abena Osei",
  "Kojo Amponsah",
];
const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=${["e0e7ff", "fce7f3", "d1fae5", "fef3c7"][name.length % 4]}`;

export interface SeatCalculatorValue {
  seats: number;
  yearly: boolean;
}

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.15 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.35 };

export interface SeatCalculatorProps {
  value?: SeatCalculatorValue;
  defaultValue?: SeatCalculatorValue;
  onValueChange?: (value: SeatCalculatorValue) => void;
  ref?: Ref<HTMLElement>;
}

const RISE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: SPRING,
};

function priceFor(tier: Tier, seats: number, yearly: boolean) {
  const perSeat = tier.price === null ? 0 : tier.price * (yearly ? 1 - YEARLY_OFF : 1);
  const monthly = perSeat * seats;
  const full = (tier.price ?? 0) * seats;
  return { perSeat, monthly, full, saving: (full - monthly) * 12 };
}

function featuresUpTo(tier: Tier) {
  return TIERS.filter((included) => included.from <= tier.from).flatMap((included) =>
    included.adds.map((feature) => ({ feature, tier: included.name })),
  );
}

const PALETTE = [
  "[--sc-surface:#ffffff] [--sc-panel:#f7f7f8] [--sc-field:#f1f1f3] [--sc-line:rgb(24_24_27/0.08)] [--sc-ink:#18181b] [--sc-on-ink:#fafafa] [--sc-muted:#71717a] [--sc-quiet:#a1a1aa]",
  "[--sc-accent:#4f46e5] [--sc-accent-soft:#eef2ff] [--sc-good:#059669] [--sc-good-soft:#d1fae5]",
  "dark:[--sc-surface:#1f1f23] dark:[--sc-panel:#26262b] dark:[--sc-field:#2e2e33] dark:[--sc-line:rgb(255_255_255/0.08)] dark:[--sc-ink:#fafafa] dark:[--sc-on-ink:#18181b] dark:[--sc-muted:#a1a1aa] dark:[--sc-quiet:#71717a]",
  "dark:[--sc-accent:#818cf8] dark:[--sc-accent-soft:rgb(129_140_248/0.16)] dark:[--sc-good:#34d399] dark:[--sc-good-soft:rgb(52_211_153/0.14)]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sc-accent)";
const STEP = `grid h-[30px] w-7 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-(--sc-muted) hover:bg-(--sc-surface) hover:text-(--sc-ink) [&_svg]:size-3.5 ${FOCUS}`;

function SeatInput({ seats, onChange }: { seats: number; onChange: (seats: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="grid gap-0.5 text-[14.5px]">
        <b>How big is your team?</b>
        <span className="text-[12.5px] text-(--sc-muted)">Pay only for the seats you use</span>
      </span>
      <NumberField.Root
        value={seats}
        onValueChange={(value) => value !== null && onChange(value)}
        min={1}
        max={999}
      >
        <NumberField.Group className="flex h-[34px] items-center rounded-[10px] bg-(--sc-field) p-0.5">
          <NumberField.Decrement className={STEP} aria-label="One fewer seat">
            <HugeiconsIcon icon={MinusSignIcon} aria-hidden="true" />
          </NumberField.Decrement>
          <NumberField.Input
            className="h-[30px] w-11 border-0 bg-transparent text-center text-[14px] font-semibold text-(--sc-ink) tabular-nums outline-none"
            aria-label="Seats"
          />
          <NumberField.Increment className={STEP} aria-label="One more seat">
            <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
    </div>
  );
}

function SeatSlider({
  seats,
  tier,
  onChange,
}: {
  seats: number;
  tier: Tier;
  onChange: (seats: number) => void;
}) {
  return (
    <>
      <Slider.Root
        className="group/slider mt-[34px]"
        value={positionOf(seats)}
        onValueChange={(value) => onChange(seatsAt(Array.isArray(value) ? value[0]! : value))}
        min={0}
        max={STOPS}
        aria-label="Seats"
      >
        <Slider.Control className="flex h-[22px] cursor-pointer touch-none items-center">
          <Slider.Track className="relative h-1.5 w-full rounded-[3px] bg-(--sc-field)">
            <Slider.Indicator className="rounded-[inherit] bg-[linear-gradient(90deg,var(--sc-accent),color-mix(in_oklab,var(--sc-accent)_70%,#ec4899))] [transition:width_0.55s_cubic-bezier(0.2,0.8,0.2,1),inset-inline-start_0.55s_cubic-bezier(0.2,0.8,0.2,1)] group-data-dragging/slider:transition-none!" />
            {TIERS.slice(1).map((step) => (
              <span
                key={step.name}
                className="absolute top-1/2 h-2.5 w-0.5 -translate-1/2 rounded-[1px] bg-(--sc-quiet) opacity-60 transition-[background-color] duration-300 data-reached:bg-white data-reached:opacity-90"
                data-reached={seats >= step.from || undefined}
                style={{ left: percentOf(step.from) }}
                aria-hidden="true"
              />
            ))}
            <Slider.Thumb
              className="size-[22px] rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_2px_8px_rgb(0_0_0/0.18)] outline-none [transition:left_0.55s_cubic-bezier(0.2,0.8,0.2,1),inset-inline-start_0.55s_cubic-bezier(0.2,0.8,0.2,1),transform_0.2s] has-focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--sc-accent)_35%,transparent),0_2px_8px_rgb(0_0_0/0.18)] group-data-dragging/slider:[transform:scale(1.12)] group-data-dragging/slider:transition-none!"
              aria-label="Seats"
              getAriaValueText={() => `${seats} seats`}
            >
              <span
                className="absolute bottom-[calc(100%+8px)] left-1/2 grid h-6 min-w-[34px] origin-bottom place-items-center rounded-[7px] bg-(--sc-ink) px-[7px] text-[12.5px] font-semibold text-(--sc-on-ink) [transform:translateX(-50%)] [transition:transform_0.2s_cubic-bezier(0.2,0.9,0.3,1.3)] after:absolute after:top-full after:left-1/2 after:size-2 after:rounded-[1px] after:bg-inherit after:[transform:translate(-50%,-50%)_rotate(45deg)] after:content-[''] group-data-dragging/slider:[transform:translateX(-50%)_scale(1.12)]"
                aria-hidden="true"
              >
                <Odometer value={String(seats)} />
              </span>
            </Slider.Thumb>
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>

      <div className="relative mt-2 h-4" aria-hidden="true">
        {TIERS.map((option, index) => (
          <span
            key={option.name}
            data-active={option === tier || undefined}
            data-first={index === 0 || undefined}
            className="absolute top-0 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap text-(--sc-quiet) transition-colors duration-250 data-active:font-semibold data-active:text-(--sc-accent) data-first:translate-x-0"
            style={{ left: percentOf(option.from) }}
          >
            {option.name}
          </span>
        ))}
      </div>
    </>
  );
}

function TeamFaces({ seats }: { seats: number }) {
  const shown = Math.min(seats, 4);
  const more = seats - shown;

  return (
    <span className="flex min-h-8 min-w-0 items-center [&_img]:relative [&_img]:-mr-2.5 [&_img]:size-7 [&_img]:flex-none [&_img]:rounded-full [&_img]:shadow-[0_0_0_2px_var(--sc-surface)] [&_img:last-of-type]:mr-0">
      <AnimatePresence initial={false} mode="popLayout">
        {FACES.slice(0, shown).map((name, index) => (
          <motion.img
            key={name}
            src={face(name)}
            alt=""
            width={28}
            height={28}
            draggable={false}
            layout="position"
            style={{ zIndex: FACES.length - index }}
            initial={{ opacity: 0, scale: 0.4, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.15 } }}
            transition={POP}
          />
        ))}
        {more > 0 && (
          <motion.span
            key="more"
            className="relative ml-1 inline-flex h-7 items-center rounded-full bg-(--sc-field) pr-[9px] pl-[13px] text-[12px] font-semibold text-(--sc-muted)"
            layout="position"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={POP}
          >
            +<Odometer value={String(more)} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function BillingToggle({ yearly, onChange }: { yearly: boolean; onChange: (yearly: boolean) => void }) {
  const id = useId();

  return (
    <LayoutGroup id={id}>
      <ToggleGroup
        className="flex flex-none rounded-[10px] bg-(--sc-field) p-[3px]"
        value={[yearly ? "yearly" : "monthly"]}
        onValueChange={(values) => values.length && onChange(values[0] === "yearly")}
        aria-label="Billing"
      >
        {(["monthly", "yearly"] as const).map((billing) => (
          <Toggle
            key={billing}
            value={billing}
            className="relative h-7 cursor-pointer rounded-lg border-0 bg-transparent px-2.5 text-[12.5px] font-semibold text-(--sc-muted) transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--sc-accent) data-pressed:text-(--sc-ink)"
          >
            {(billing === "yearly") === yearly && (
              <motion.span
                layoutId="bill"
                className="absolute inset-0 rounded-[inherit] bg-(--sc-surface) shadow-[0_1px_3px_rgb(0_0_0/0.1)]"
                transition={SPRING}
                aria-hidden="true"
              />
            )}
            <span className="relative inline-flex items-center gap-[5px]">
              {billing === "monthly" ? "Monthly" : "Yearly"}
              {billing === "yearly" && <em className="text-[11px] text-(--sc-good) not-italic">−20%</em>}
            </span>
          </Toggle>
        ))}
      </ToggleGroup>
    </LayoutGroup>
  );
}

function Plan({ tier, seats, yearly }: { tier: Tier; seats: number; yearly: boolean }) {
  const custom = tier.price === null;
  const { perSeat, monthly, full, saving } = priceFor(tier, seats, yearly);
  const detail = custom
    ? "Volume pricing, a custom contract and help moving your team over."
    : `${money(perSeat)} per seat · billed ${yearly ? `yearly at ${money(monthly * 12)}` : "monthly"}`;

  return (
    <div className="mt-3.5 grid rounded-[18px] bg-(--sc-panel) p-4" data-tier={tier.name}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span className="inline-grid text-[13px] font-bold tracking-[0.02em] text-(--sc-accent) uppercase">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={tier.name}
              initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
              transition={SPRING}
            >
              {tier.name}
            </motion.span>
          </AnimatePresence>
        </span>

        <AnimatePresence initial={false}>
          {yearly && !custom && saving > 0 && (
            <motion.span
              className="inline-flex h-6 items-center gap-1 rounded-full bg-(--sc-good-soft) px-[9px] text-[12px] font-semibold text-(--sc-good)"
              initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={POP}
            >
              Save <Odometer value={money(saving)} /> a year
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-1.5 grid min-h-12">
        <AnimatePresence initial={false} mode="popLayout">
          {custom ? (
            <motion.span key="custom" className="text-[38px] leading-[1.15] font-bold tracking-[-0.03em]" {...RISE}>
              Let's talk
            </motion.span>
          ) : (
            <motion.span key="price" className="inline-flex items-baseline gap-2" {...RISE}>
              <AnimatePresence initial={false}>
                {yearly && (
                  <motion.s
                    className="inline-block overflow-hidden text-[18px] font-medium whitespace-nowrap text-(--sc-quiet)"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={SPRING}
                  >
                    {money(full)}
                  </motion.s>
                )}
              </AnimatePresence>
              <Odometer value={money(monthly)} className="text-[42px] font-bold tracking-[-0.03em]" />
              <span className="text-[14px] text-(--sc-muted)">/ month</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className="m-0 mt-1 min-h-5 text-[12.5px] text-(--sc-muted)">{detail}</p>

      <ul className="m-0 mt-3 grid list-none border-t border-solid border-(--sc-line) px-0 pt-3 pb-0">
        <AnimatePresence initial={false}>
          {featuresUpTo(tier).map(({ feature, tier: from }) => (
            <motion.li
              key={feature}
              data-new={from === tier.name && from !== "Starter" ? "" : undefined}
              className="group/feature overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
            >
              <span className="flex items-center gap-[9px] py-[3px] text-[13px]">
                <motion.span
                  className="grid size-[17px] flex-none place-items-center rounded-full bg-(--sc-ink) text-(--sc-on-ink) group-data-new/feature:bg-(--sc-accent) group-data-new/feature:text-white [&_svg]:size-[11px] [&_svg]:[stroke-width:3]"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...POP, delay: 0.12 }}
                >
                  <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
                </motion.span>
                {feature}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <motion.button
        type="button"
        className={`mt-3.5 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-(--sc-ink) text-[14px] font-semibold text-(--sc-on-ink) [&_svg]:size-4 [&>span]:inline-grid ${FOCUS}`}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={custom ? "sales" : "trial"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING}
          >
            {custom ? "Contact sales" : "Start a 14-day trial"}
          </motion.span>
        </AnimatePresence>
        <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
      </motion.button>
    </div>
  );
}

export function SeatCalculator({
  value,
  defaultValue = { seats: 6, yearly: false },
  onValueChange,
  ref,
}: SeatCalculatorProps) {
  const [pricing, setPricing] = useControllableState({ value, defaultValue, onValueChange });
  const { seats, yearly } = pricing;
  const tier = tierOf(seats);

  const setSeats = (count: number) =>
    setPricing((current) => ({ ...current, seats: Math.max(1, Math.min(999, Math.round(count))) }));

  const setYearly = (next: boolean) => setPricing((current) => ({ ...current, yearly: next }));

  return (
    <section
      ref={ref}
      className={`not-prose grid w-[min(100%,420px)] rounded-3xl bg-(--sc-surface) p-[18px] font-sans text-(--sc-ink) ${PALETTE}`}
      aria-label="Pricing calculator"
    >
      <SeatInput seats={seats} onChange={setSeats} />
      <SeatSlider seats={seats} tier={tier} onChange={setSeats} />

      <div className="mt-4 flex min-w-0 items-center justify-between gap-2.5" aria-label={`${seats} people`}>
        <TeamFaces seats={seats} />
        <BillingToggle yearly={yearly} onChange={setYearly} />
      </div>

      <Plan tier={tier} seats={seats} yearly={yearly} />
    </section>
  );
}

const BEATS: readonly (SeatCalculatorValue & { ms: number })[] = [
  { seats: 6, yearly: false, ms: 1500 },
  { seats: 14, yearly: false, ms: 1400 },
  { seats: 32, yearly: false, ms: 1400 },
  { seats: 64, yearly: false, ms: 1600 },
  { seats: 64, yearly: true, ms: 2000 },
  { seats: 180, yearly: true, ms: 2300 },
  { seats: 24, yearly: false, ms: 1600 },
];

const fromBeat = (step: number): SeatCalculatorValue => ({
  seats: BEATS[step]!.seats,
  yearly: BEATS[step]!.yearly,
});

interface SeatCalculatorDemoProps {
  playing?: boolean;
}

export function SeatCalculatorDemo({ playing }: SeatCalculatorDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <SeatCalculator ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
