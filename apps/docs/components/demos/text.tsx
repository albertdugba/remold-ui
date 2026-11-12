"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, Segmented, DEMO_BUTTON } from "./frame";

const STATUSES = ["Uploading 3 files", "Uploading 2 files", "Processing", "Upload complete"];

export function StatusDemo() {
  const [index, setIndex] = useState(0);

  return (
    <Frame>
      <div className="grid justify-items-center gap-4">
        <Remold.Text className="text-[22px] font-semibold tracking-[-0.02em]">{STATUSES[index]!}</Remold.Text>
        <button
          type="button"
          className={DEMO_BUTTON}
          onClick={() => setIndex((current) => (current + 1) % STATUSES.length)}
        >
          Next status
        </button>
      </div>
    </Frame>
  );
}

const PLANS = {
  Monthly: { price: "£12", per: "per month", note: "Billed monthly" },
  Yearly: { price: "£120", per: "per year", note: "Two months free" },
} as const;

export function PriceDemo({ framed = true, index }: { framed?: boolean; index?: number }) {
  const [chosenBilling, setBilling] = useState<keyof typeof PLANS>("Monthly");

  const billing = index === undefined ? chosenBilling : (["Monthly", "Yearly"] as const)[index % 2]!;
  const plan = PLANS[billing];

  const body = (
    <div className="grid justify-items-center gap-1.5 text-center">
      {index === undefined && (
        <Segmented
          label="Billing"
          value={billing}
          onChange={setBilling}
          options={["Monthly", "Yearly"] as const}
        />
      )}
      <p className="mt-2.5 text-[13px] font-semibold text-[var(--color-fd-muted-foreground)]">Team</p>
      <p className="flex items-baseline gap-2 text-[44px] font-bold tracking-[-0.03em] tabular-nums">
        <Remold.Text>{plan.price}</Remold.Text>
        <Remold.Text className="text-[15px] font-medium tracking-normal text-[var(--color-fd-muted-foreground)]">
          {plan.per}
        </Remold.Text>
      </p>
      <Remold.Text className="text-[13px] text-[var(--color-fd-muted-foreground)]">{plan.note}</Remold.Text>
    </div>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
