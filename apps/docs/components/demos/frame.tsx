"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactNode } from "react";

export const DEMO_BUTTON =
  "cursor-pointer rounded-lg border border-solid border-fd-border bg-fd-background px-3 py-1.5 text-[13px] hover:bg-fd-accent disabled:opacity-40 in-[.dark-stage]:border-white/16 in-[.dark-stage]:bg-white/6! in-[.dark-stage]:text-[#f4f4f5] max-[560px]:min-h-9";

const FRAME =
  "rm-demo not-prose my-6 flex justify-center rounded-xl border border-solid border-fd-border bg-fd-card px-5 py-8 in-[[role=tabpanel]]:m-0 in-[[role=tabpanel]]:rounded-none in-[[role=tabpanel]]:border-0 max-[560px]:my-4 max-[560px]:rounded-[0.65rem] max-[560px]:px-3 max-[560px]:py-4";

export function Frame({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return <div className={`${FRAME} ${tone === "dark" ? "dark-stage" : ""}`}>{children}</div>;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (T | { value: T; label: string })[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      className="inline-flex max-w-full flex-wrap justify-center rounded-lg border border-solid border-fd-border bg-fd-background p-0.5 in-[.dark-stage]:border-white/14 in-[.dark-stage]:bg-white/6"
      aria-label={label}
      value={[value]}
      onValueChange={(values) => {
        const picked = values[0];
        if (picked) onChange(picked as T);
      }}
    >
      {options.map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <Toggle
            key={item.value}
            value={item.value}
            className="cursor-pointer rounded-md px-2.5 py-1 text-[13px] text-fd-muted-foreground aria-pressed:bg-fd-accent aria-pressed:font-medium aria-pressed:text-fd-foreground in-[.dark-stage]:text-white/70 in-[.dark-stage]:aria-pressed:bg-white/90! in-[.dark-stage]:aria-pressed:text-[#111]! max-[560px]:min-h-9"
          >
            {item.label}
          </Toggle>
        );
      })}
    </ToggleGroup>
  );
}
