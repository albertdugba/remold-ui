"use client";
/** The frame every live demo sits in, and the small controls the demos share. */
import type { ReactNode } from "react";
import "./frame.css";

export function Frame({ children, tone = "light", compact = false }: { children: ReactNode; tone?: "light" | "dark"; compact?: boolean }) {
  return <div className={`rm-demo not-prose${tone === "dark" ? " dark-stage" : ""}${compact ? " compact" : ""}`}>{children}</div>;
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
    <div className="rm-segmented" role="group" aria-label={label}>
      {options.map((o) => {
        const item = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
