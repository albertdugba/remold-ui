"use client";
/**
 * `<Customize name="integrations-hub" />`: the live component with a panel of its settings under it.
 * Every change shows at once; Reset puts the defaults back; Copy code gives the JSX for exactly
 * these settings. The settings come from the component's `<name>.controls.ts`.
 */
import { Check, Copy, RotateCcw } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Stage } from "../stage";
import { codeFor, defaultsOf, formatValue, type Control, type Customizable, type Values } from "./controls";
import { CUSTOMIZABLE } from "./registry";
import { Code } from "../code";

const row = "flex h-10 items-center justify-between gap-3 rounded-lg bg-fd-secondary px-3 text-[13px]";
const focusWithin = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fd-primary";

function NumberControl({
  control,
  value,
  onChange,
}: {
  control: Extract<Control, { type: "number" }>;
  value: number;
  onChange: (v: number) => void;
}) {
  const share = ((value - control.min) / (control.max - control.min)) * 100;
  return (
    <label className={`relative block h-10 overflow-hidden rounded-lg bg-fd-secondary text-[13px] ${focusWithin}`}>
      {/* The fill is the value: drag anywhere on the row. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 border-r-2 border-fd-foreground/25 bg-fd-foreground/[0.07]"
        style={{ width: `${share}%` }}
      />
      <span className="pointer-events-none relative flex h-full items-center justify-between px-3">
        <span>{control.label}</span>
        <span className="tabular-nums text-fd-muted-foreground">{formatValue(control, value)}</span>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step ?? 1}
        value={value}
        aria-label={control.label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </label>
  );
}

function ToggleControl({ control, value, onChange }: { control: Control; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={row}>
      <span>{control.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={control.label}
        onClick={() => onChange(!value)}
        className="relative h-5 w-9 rounded-full bg-fd-border transition-colors aria-checked:bg-fd-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-fd-background shadow transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}

function ColorControl({ control, value, onChange }: { control: Control; value: string; onChange: (v: string) => void }) {
  return (
    <label className={`${row} cursor-pointer ${focusWithin}`}>
      <span>{control.label}</span>
      <span className="flex items-center gap-2 font-mono text-[12px] text-fd-muted-foreground">
        {value}
        <span className="relative size-5 overflow-hidden rounded-md ring-1 ring-fd-border" style={{ background: value }}>
          <input
            type="color"
            value={value}
            aria-label={control.label}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
      </span>
    </label>
  );
}

function SelectControl({
  control,
  value,
  onChange,
}: {
  control: Extract<Control, { type: "select" }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={row} role="group" aria-label={control.label}>
      <span>{control.label}</span>
      <span className="flex gap-0.5 rounded-md bg-fd-background p-0.5">
        {control.options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className="rounded px-2 py-0.5 text-[12px] text-fd-muted-foreground aria-pressed:bg-fd-accent aria-pressed:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-primary"
          >
            {option}
          </button>
        ))}
      </span>
    </div>
  );
}

/** `code` is the component's source for the stage's Code view (usually `<Source demo="…" />`). */
export function Customize({ name, code, width, wide }: { name: string; code?: ReactNode; width?: number; wide?: boolean }) {
  const entry = CUSTOMIZABLE[name];
  if (!entry) throw new Error(`Customize: no settings registered for "${name}"`);
  const { Component, meta } = entry as unknown as { Component: ComponentType<Record<string, unknown>>; meta: Customizable };
  const defaults = defaultsOf(meta.controls);
  const [values, setValues] = useState<Values>(defaults);
  const [copied, setCopied] = useState(false);
  const changed = Object.keys(defaults).some((key) => values[key] !== defaults[key]);
  const set = (key: string) => (value: Values[string]) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <div className="not-prose my-6">
      <Stage name={name} code={code} width={width} wide={wide}>
        <Component key={meta.remount ? JSON.stringify(values) : undefined} {...values} />
      </Stage>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h3 className="m-0 text-xl font-semibold tracking-tight">Customize</h3>
        <span className="flex gap-2">
          <button
            type="button"
            disabled={!changed}
            onClick={() => setValues(defaults)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border px-3 py-1.5 text-[13px] text-fd-muted-foreground enabled:hover:text-fd-foreground disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(codeFor(meta, values));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border px-3 py-1.5 text-[13px] hover:bg-fd-accent"
          >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </span>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-fd-border bg-fd-card p-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(meta.controls).map(([key, control]) => {
          const value = values[key]!;
          if (control.type === "number") return <NumberControl key={key} control={control} value={value as number} onChange={set(key)} />;
          if (control.type === "toggle") return <ToggleControl key={key} control={control} value={value as boolean} onChange={set(key)} />;
          if (control.type === "color") return <ColorControl key={key} control={control} value={value as string} onChange={set(key)} />;
          return <SelectControl key={key} control={control} value={value as string} onChange={set(key)} />;
        })}
      </div>

      <Code code={codeFor(meta, values)} lang="tsx" className="mt-3" />
    </div>
  );
}
