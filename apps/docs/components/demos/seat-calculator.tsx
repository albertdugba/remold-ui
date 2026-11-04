"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon, MinusSignIcon, CheckIcon } from "@hugeicons/core-free-icons";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./seat-calculator.css";

interface Tier {
  name: string;
  from: number;
  /** Per seat, per month, billed monthly. Null means it's priced by talking to sales. */
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

/**
 * The slider isn't linear: each tier gets a fair share of the track, so 1–10 seats is as easy to
 * pick as 50–150. Positions run 0–1000; these are the seat counts at the bends.
 */
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

const tierOf = (seats: number) => [...TIERS].reverse().find((t) => seats >= t.from)!;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** The faces that fill the team row; past the last one, a count. */
const FACES = ["Ama Mensah", "Kwame Owusu", "Efua Addo", "Esi Ofori", "Kofi Agyeman", "Yaw Darko", "Abena Osei", "Kojo Amponsah"];
const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=${["e0e7ff", "fce7f3", "d1fae5", "fef3c7"][name.length % 4]}`;

interface State {
  seats: number;
  yearly: boolean;
}

const BEATS: readonly (State & { ms: number })[] = [
  { seats: 6, yearly: false, ms: 1500 },
  { seats: 14, yearly: false, ms: 1400 },
  { seats: 32, yearly: false, ms: 1400 },
  { seats: 64, yearly: false, ms: 1600 },
  { seats: 64, yearly: true, ms: 2000 },
  { seats: 180, yearly: true, ms: 2300 },
  { seats: 24, yearly: false, ms: 1600 },
];

const fromBeat = (step: number): State => ({ seats: BEATS[step]!.seats, yearly: BEATS[step]!.yearly });

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.15 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.35 };

interface SeatCalculatorDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function SeatCalculatorDemo({ playing }: SeatCalculatorDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const id = useId();
  const { seats, yearly } = state;

  const tier = tierOf(seats);
  const custom = tier.price === null;
  const perSeat = tier.price === null ? 0 : tier.price * (yearly ? 1 - YEARLY_OFF : 1);
  const monthly = perSeat * seats;
  const full = (tier.price ?? 0) * seats;
  const saving = (full - monthly) * 12;
  const features = TIERS.filter((t) => t.from <= tier.from).flatMap((t) => t.adds.map((f) => ({ f, tier: t.name })));
  const shown = Math.min(seats, 4);
  const more = seats - shown;

  const setSeats = (n: number) => take((current) => ({ ...current, seats: Math.max(1, Math.min(999, Math.round(n))) }));

  return (
    <section ref={scene.ref} className="sc not-prose" aria-label="Pricing calculator">
      <div className="sc-top">
        <span className="sc-label">
          <b>How big is your team?</b>
          <span>Pay only for the seats you use</span>
        </span>
        <NumberField.Root value={seats} onValueChange={(v) => v !== null && setSeats(v)} min={1} max={999} className="sc-number">
          <NumberField.Group className="sc-number-group">
            <NumberField.Decrement className="sc-step" aria-label="One fewer seat">
              <HugeiconsIcon icon={MinusSignIcon} aria-hidden="true" />
            </NumberField.Decrement>
            <NumberField.Input className="sc-number-input" aria-label="Seats" />
            <NumberField.Increment className="sc-step" aria-label="One more seat">
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            </NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>
      </div>

      <Slider.Root
        className="sc-slider"
        value={positionOf(seats)}
        onValueChange={(v) => setSeats(seatsAt(Array.isArray(v) ? v[0]! : v))}
        min={0}
        max={STOPS}
        aria-label="Seats"
      >
        <Slider.Control className="sc-control">
          <Slider.Track className="sc-track">
            <Slider.Indicator className="sc-indicator" />
            {TIERS.slice(1).map((t) => (
              <span
                key={t.name}
                className="sc-tick"
                data-reached={seats >= t.from || undefined}
                style={{ left: percentOf(t.from) }}
                aria-hidden="true"
              />
            ))}
            <Slider.Thumb className="sc-thumb" aria-label="Seats" getAriaValueText={() => `${seats} seats`}>
              <span className="sc-bubble" aria-hidden="true">
                <Odometer value={String(seats)} />
              </span>
            </Slider.Thumb>
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="sc-tiers" aria-hidden="true">
        {TIERS.map((t, index) => (
          <span
            key={t.name}
            data-active={t === tier || undefined}
            style={{ left: percentOf(t.from) }}
            data-first={index === 0 || undefined}
          >
            {t.name}
          </span>
        ))}
      </div>

      <div className="sc-team" aria-label={`${seats} people`}>
        <span className="sc-faces">
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
                className="sc-more"
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
        <LayoutGroup id={id}>
          <ToggleGroup
            className="sc-billing"
            value={[yearly ? "yearly" : "monthly"]}
            onValueChange={(v) => v.length && take((current) => ({ ...current, yearly: v[0] === "yearly" }))}
            aria-label="Billing"
          >
            {(["monthly", "yearly"] as const).map((b) => (
              <Toggle key={b} value={b} className="sc-bill">
                {(b === "yearly") === yearly && (
                  <motion.span layoutId="bill" className="sc-bill-pill" transition={SPRING} aria-hidden="true" />
                )}
                <span className="sc-bill-label">
                  {b === "monthly" ? "Monthly" : "Yearly"}
                  {b === "yearly" && <em>−20%</em>}
                </span>
              </Toggle>
            ))}
          </ToggleGroup>
        </LayoutGroup>
      </div>

      <div className="sc-plan" data-tier={tier.name}>
        <div className="sc-plan-head">
          <span className="sc-plan-name">
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
                className="sc-save"
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

        <div className="sc-price">
          <AnimatePresence initial={false} mode="popLayout">
            {custom ? (
              <motion.span
                key="custom"
                className="sc-custom"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={SPRING}
              >
                Let's talk
              </motion.span>
            ) : (
              <motion.span
                key="price"
                className="sc-amount"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={SPRING}
              >
                <AnimatePresence initial={false}>
                  {yearly && (
                    <motion.s
                      className="sc-was"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={SPRING}
                    >
                      {money(full)}
                    </motion.s>
                  )}
                </AnimatePresence>
                <Odometer value={money(monthly)} className="sc-big" />
                <span className="sc-per">/ month</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="sc-detail">
          {custom
            ? "Volume pricing, a custom contract and help moving your team over."
            : `${money(perSeat)} per seat · billed ${yearly ? `yearly at ${money(monthly * 12)}` : "monthly"}`}
        </p>

        <ul className="sc-features">
          <AnimatePresence initial={false}>
            {features.map(({ f, tier: from }) => (
              <motion.li
                key={f}
                data-new={from === tier.name && from !== "Starter" ? "" : undefined}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRING}
              >
                <span className="sc-feature">
                  <motion.span
                    className="sc-check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...POP, delay: 0.12 }}
                  >
                    <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
                  </motion.span>
                  {f}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <motion.button type="button" className="sc-cta" whileTap={{ scale: 0.98 }}>
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
    </section>
  );
}
