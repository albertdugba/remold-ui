"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame } from "./frame";

const roundedSheet = "M30 12H78L98 32V104Q98 112 90 112H30Q22 112 22 104V20Q22 12 30 12Z";

const STATES = [
  {
    id: "review",
    label: "In review",
    detail: "3 comments to resolve",
    accent: "stroke-violet-600 dark:stroke-violet-400",
    lines: "M40 50H76M40 64H70M40 78H62",
    mark: "M76 84a10 10 0 1 0 0.1 0",
  },
  {
    id: "ready",
    label: "Ready to ship",
    detail: "All checks passed",
    accent: "stroke-emerald-600 dark:stroke-emerald-400",
    lines: "M40 50H78M40 64H72M40 78H66",
    mark: "M67 84l6 6 13-15",
  },
  {
    id: "blocked",
    label: "Needs attention",
    detail: "One check needs fixing",
    accent: "stroke-orange-600 dark:stroke-orange-400",
    lines: "M40 50H76M40 64H68M40 78H58",
    mark: "M73 76v10M73 92h.01",
  },
] as const;

type Status = (typeof STATES)[number];

export function ReleaseStatusDemo({ framed = true }: { framed?: boolean }) {
  const [state, setState] = useState<Status["id"]>("review");
  const current = STATES.find((item) => item.id === state)!;

  const body = (
    <div className="grid w-full justify-items-center gap-3.5 px-[18px] pt-6 pb-[18px]">
      <div className="grid grid-cols-[112px_auto] items-center gap-4 max-[440px]:grid-cols-[92px_auto] max-[440px]:gap-2.5" aria-live="polite">
        <Remold.PathGroup
          className="h-[116px] w-[112px] overflow-visible max-[440px]:h-24 max-[440px]:w-[92px]"
          viewBox="0 0 120 124"
          role="img"
          aria-label={`Release status: ${current.label}`}
          spring={{ duration: 0.46, bounce: 0.16 }}
          paths={[
            { id: "sheet", path: roundedSheet, className: `fill-[var(--color-fd-card)] ${current.accent}`, strokeWidth: 2.5 },
            { id: "fold", path: "M78 12V32H98", className: "stroke-[var(--color-fd-muted-foreground)]", fill: "none", strokeWidth: 3 },
            { id: "lines", path: current.lines, className: "stroke-[var(--color-fd-muted-foreground)]", fill: "none", strokeWidth: 4, strokeLinecap: "round" },
            { id: "mark", path: current.mark, className: current.accent, fill: "none", strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" },
          ]}
        />
        <div className="grid min-w-[140px] gap-1">
          <strong className="text-base tracking-[-0.01em] text-[var(--color-fd-foreground)]">{current.label}</strong>
          <span className="text-[13px] text-[var(--color-fd-muted-foreground)]">{current.detail}</span>
        </div>
      </div>
      <ToggleGroup
        className="inline-flex max-w-full overflow-auto rounded-[9px] border border-[var(--color-fd-border)] bg-[var(--color-fd-muted)] p-[3px] [&_button]:whitespace-nowrap [&_button]:rounded-md [&_button]:px-[9px] [&_button]:py-1.5 [&_button]:text-xs [&_button]:text-[var(--color-fd-muted-foreground)] [&_button[data-pressed]]:bg-[var(--color-fd-background)] [&_button[data-pressed]]:text-[var(--color-fd-foreground)] [&_button[data-pressed]]:shadow-[0_1px_2px_rgb(0_0_0_/_0.08)]"
        aria-label="Release status"
        value={[state]}
        onValueChange={(values) => values[0] && setState(values[0] as Status["id"])}
      >
        {STATES.map((item) => (
          <Toggle key={item.id} value={item.id} aria-label={item.label}>
            {item.label.replace(" to ship", "")}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
