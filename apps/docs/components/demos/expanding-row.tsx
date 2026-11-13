"use client";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { useState } from "react";

interface Plan {
  title: string;
  time: string;
  place: string;
  note: string;
}

const PLANS: Plan[] = [
  {
    title: "Design review",
    time: "10:00",
    place: "Studio B",
    note: "Onboarding, round two. Bring the three options we cut last week.",
  },
  {
    title: "Lunch with Efua",
    time: "12:30",
    place: "Kōji, Osu",
    note: "A table for two by the window. It's her turn to pay.",
  },
  {
    title: "Dentist",
    time: "16:15",
    place: "Ridge Dental",
    note: "Ask about the night guard. The card is on file, so nothing to pay.",
  },
];

const THEME =
  "[--xr-ink:#0a0a0b] [--xr-muted:#71717a] [--xr-surface:#ffffff] [--xr-well:#f4f4f5] dark:[--xr-ink:#fafafa] dark:[--xr-muted:#a1a1aa] dark:[--xr-surface:#18181b] dark:[--xr-well:#26262b]";

const ITEM =
  "w-full cursor-pointer rounded-[14px] border-0 text-left text-(--xr-ink) outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--xr-ink)]";

function PlanItem({ plan, open, onToggle }: { plan: Plan; open: boolean; onToggle: () => void }) {
  if (!open) {
    return (
      <button type="button" aria-expanded={false} onClick={onToggle} className={`${ITEM} flex h-12 items-center justify-between bg-transparent px-3 hover:bg-(--xr-well)`}>
        <span className="text-[14px] font-medium">{plan.title}</span>
        <span className="text-[12.5px] text-(--xr-muted) tabular-nums">{plan.time}</span>
      </button>
    );
  }

  return (
    <button type="button" aria-expanded onClick={onToggle} className={`${ITEM} grid gap-1 bg-(--xr-well) px-3 py-3.5`}>
      <span className="flex items-center justify-between">
        <span className="text-[17px] font-semibold tracking-[-0.01em]">{plan.title}</span>
        <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} className="text-(--xr-muted)" aria-hidden="true" />
      </span>
      <span className="text-[13px] text-(--xr-muted)">
        <span className="tabular-nums">{plan.time}</span> · {plan.place}
      </span>
      <span className="mt-1.5 text-[14px] leading-[1.45]">{plan.note}</span>
    </button>
  );
}

export function ExpandingRowDemo() {
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  return (
    <div className={`not-prose grid w-full place-items-center font-sans antialiased ${THEME}`}>
      <Remold.Morph trigger={openTitle} className="grid h-[320px] w-[380px] max-w-full place-items-center">
        <section className="w-full rounded-[22px] bg-(--xr-surface) p-2" aria-label="Today">
          <header className="flex items-center gap-2 px-3 pt-1.5 pb-2.5 text-(--xr-ink)">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Today</span>
            <span className="rounded-full bg-(--xr-well) px-[7px] text-[12px] leading-5 font-medium text-(--xr-muted) tabular-nums">
              {PLANS.length}
            </span>
          </header>
          {PLANS.map((plan) => (
            <PlanItem
              key={plan.title}
              plan={plan}
              open={plan.title === openTitle}
              onToggle={() => setOpenTitle(plan.title === openTitle ? null : plan.title)}
            />
          ))}
        </section>
      </Remold.Morph>
    </div>
  );
}
