"use client";
/** The inspector's fields, shared by both studios. */
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactNode } from "react";

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <span className="st-label">{label}</span>
      <span className="st-control">{children}</span>
    </div>
  );
}

export function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <NumberField.Root className="st-num" value={Math.round(value)} step={1} largeStep={10} onValueChange={(v) => v !== null && onChange(v)}>
      <NumberField.ScrubArea className="st-num-label">
        <label>{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Input className="st-num-input" aria-label={label} />
    </NumberField.Root>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="st-row">
      <span className="st-label">{label}</span>
      <Slider.Root className="st-slider" value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0]! : v)}>
        <Slider.Control className="st-slider-control">
          <Slider.Track className="st-slider-track">
            <Slider.Indicator className="st-slider-fill" />
            <Slider.Thumb className="st-slider-thumb" aria-label={label} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className="st-value">{format(value)}</span>
    </div>
  );
}

export function Choice({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <ToggleGroup className="st-choice" value={[value]} onValueChange={(v) => v[0] && onChange(v[0])}>
      {options.map((o) => (
        <Toggle key={o.value} value={o.value} className="st-choice-item">
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
