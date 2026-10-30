"use client";

import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import type { ReactNode } from "react";
import "./frame.css";

export function Frame({
  children,
  tone = "light",
  compact = false,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  return (
    <div
      className={`rm-demo not-prose${tone === "dark" ? " dark-stage" : ""}${
        compact ? " compact" : ""
      }`}
    >
      {children}
    </div>
  );
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
      className="rm-segmented"
      aria-label={label}
      value={[value]}
      onValueChange={(values) => {
        const next = values[0];

        if (next) onChange(next as T);
      }}
    >
      {options.map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;

        return (
          <Toggle key={item.value} value={item.value}>
            {item.label}
          </Toggle>
        );
      })}
    </ToggleGroup>
  );
}
