"use client";
import { Tabs } from "@base-ui/react/tabs";
import { useRemoldMorph } from "@remold-ui/react";
import { useState } from "react";
import { Frame } from "./frame";

const FEATURES = ["Unlimited projects", "Version history", "Priority support"];

const PLANS = {
  monthly: { price: 24, note: "Billed every month" },
  yearly: { price: 19, note: "Billed $228 every year" },
} as const;

type Billing = keyof typeof PLANS;

const TAB =
  "flex-1 cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 py-1.5 text-fd-muted-foreground data-active:bg-fd-background data-active:text-fd-foreground data-active:shadow-[0_1px_2px_rgb(0_0_0/0.08)]";

export function LibraryMorphDemo({ framed = true }: { framed?: boolean }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const { ref } = useRemoldMorph(billing);

  const body = (
    <Tabs.Root
      ref={ref}
      className="grid w-[min(100%,320px)] gap-4 rounded-[14px] border border-solid border-fd-border bg-fd-background p-4 text-[14px]"
      value={billing}
      onValueChange={(value) => setBilling(value as Billing)}
    >
      <Tabs.List className="flex gap-1 rounded-[9px] bg-fd-muted p-[3px]">
        <Tabs.Tab className={TAB} value="monthly">
          Monthly
        </Tabs.Tab>
        <Tabs.Tab className={TAB} value="yearly">
          Yearly
        </Tabs.Tab>
      </Tabs.List>
      {(Object.keys(PLANS) as Billing[]).map((key) => (
        <Tabs.Panel key={key} value={key} className="grid gap-1">
          <div className="flex items-center gap-2">
            <strong className="text-[15px]">Pro</strong>
            {key === "yearly" && (
              <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[12px] font-medium text-[#15803d] dark:bg-[rgb(74_222_128/0.15)] dark:text-[#4ade80]">
                Save 20%
              </span>
            )}
          </div>
          <p className="m-0 mt-1 text-[32px] font-semibold tracking-[-0.02em]">
            ${PLANS[key].price}
            <span className="ml-1 text-[14px] font-normal tracking-normal text-fd-muted-foreground">/ month</span>
          </p>
          <p className="m-0 text-fd-muted-foreground">{PLANS[key].note}</p>
          <ul className="m-0 mt-3 grid list-none gap-1.5 border-t border-solid border-fd-border px-0 pt-3 pb-0">
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
