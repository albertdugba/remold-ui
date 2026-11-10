"use client";
import { Tabs } from "@base-ui/react/tabs";
import { useRemoldMorph } from "@remold-ui/react";
import { useState } from "react";
import { Frame } from "./frame";
import "./library-morph.css";

const FEATURES = ["Unlimited projects", "Version history", "Priority support"];

const PLANS = {
  monthly: { price: 24, note: "Billed every month" },
  yearly: { price: 19, note: "Billed $228 every year" },
} as const;

type Billing = keyof typeof PLANS;

export function LibraryMorphDemo({ framed = true }: { framed?: boolean }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const { ref } = useRemoldMorph(billing);

  const body = (
    <Tabs.Root
      ref={ref}
      className="rm-plan"
      value={billing}
      onValueChange={(value) => setBilling(value as Billing)}
    >
      <Tabs.List className="rm-plan-tabs">
        <Tabs.Tab className="rm-plan-tab" value="monthly">
          Monthly
        </Tabs.Tab>
        <Tabs.Tab className="rm-plan-tab" value="yearly">
          Yearly
        </Tabs.Tab>
      </Tabs.List>
      {(Object.keys(PLANS) as Billing[]).map((key) => (
        <Tabs.Panel key={key} value={key} className="rm-plan-panel">
          <div className="rm-plan-head">
            <strong className="rm-plan-name">Pro</strong>
            {key === "yearly" && <span className="rm-plan-badge">Save 20%</span>}
          </div>
          <p className="rm-plan-price">
            ${PLANS[key].price}
            <span>/ month</span>
          </p>
          <p className="rm-plan-note">{PLANS[key].note}</p>
          <ul className="rm-plan-features">
            {FEATURES.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
