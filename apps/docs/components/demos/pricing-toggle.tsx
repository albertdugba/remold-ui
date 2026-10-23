"use client";
/**
 * A plan's price, monthly and yearly. The switch's thumb moves across, the price's digits roll to
 * the new amount (`Remold.Text`), the line under it changes and a "Save 20%" badge arrives beside
 * the price (`Remold.Layout`). The card keeps its size either way.
 *
 * It plays a short scene while it's on screen. Touch it and it's yours: choose Monthly or Yearly.
 */
import { Remold } from "@remold-ui/react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./pricing-toggle.css";

type Billing = "monthly" | "yearly";

const PLAN = {
  monthly: { price: "$24", note: "Billed monthly" },
  yearly: { price: "$19", note: "$228 billed once a year" },
} as const;

/** Long rests on each price: the change is quick, reading it takes a moment. */
const BEATS: readonly { billing: Billing; ms: number }[] = [
  { billing: "monthly", ms: 2400 },
  { billing: "yearly", ms: 3000 },
];

const fromBeat = (step: number) => BEATS[step]!.billing;

const SPRING = { duration: 0.45, bounce: 0.1 };

interface PricingToggleDemoProps {
  framed?: boolean;
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function PricingToggleDemo({ framed = true, playing }: PricingToggleDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const billing = scene.state;
  const plan = PLAN[billing];

  const body = (
    <section ref={scene.ref} className="pt" data-billing={billing} aria-label="Pricing demo">
      <Remold.Layout trigger={billing} spring={SPRING} className="pt-stack">
        <div className="pt-switch" role="radiogroup" aria-label="Billing">
          {/* The thumb sits in the chosen half's grid cell, so switching is a layout change. */}
          <span className="pt-thumb" style={{ gridColumn: billing === "monthly" ? 1 : 2 }} aria-hidden="true" />
          {(["monthly", "yearly"] as const).map((option, i) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={billing === option}
              className="pt-option"
              style={{ gridColumn: i + 1 }}
              onClick={() => scene.take(option)}
            >
              {option === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>

        <article className="pt-card">
          <p className="pt-name">Pro</p>
          <p className="pt-for">For teams shipping every week</p>
          <p className="pt-price">
            <Remold.Text className="pt-amount">{plan.price}</Remold.Text>
            <span className="pt-per">/ month</span>
            {billing === "yearly" && <span className="pt-save">Save 20%</span>}
          </p>
          <span key={plan.note} className="pt-note">
            {plan.note}
          </span>
          <span className="pt-cta">Start 14-day trial</span>
        </article>
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
