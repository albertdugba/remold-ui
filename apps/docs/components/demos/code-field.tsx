"use client";
/**
 * A one-time code field: a row of cells over one real input, so typing, pasting and one-time-code
 * autofill all work. Shared by the sign-in card (`otp-input`) and the two-factor setup
 * (`two-factor`), so both ask for a code the same way.
 *
 * `invalid` turns the cells red in place, digits kept, for a code that didn't work.
 */
import type { FocusEvent, Ref } from "react";
import "./code-field.css";

export interface CodeFieldProps {
  value: string;
  /** Called with digits only, at most `length` of them. */
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** The id of the text that says where the code comes from. */
  describedBy?: string;
  label?: string;
  className?: string;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
}

export function CodeField({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  inputRef,
  describedBy,
  label = "Six-digit code",
  className,
  onFocus,
}: CodeFieldProps) {
  return (
    <label
      className={className ? `cf ${className}` : "cf"}
      data-invalid={invalid || undefined}
    >
      <input
        ref={inputRef}
        className="cf-input"
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, length))
        }
        onFocus={onFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        aria-describedby={describedBy}
        aria-label={label}
        aria-invalid={invalid || undefined}
        tabIndex={disabled ? -1 : 0}
      />
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className="cf-cell"
          data-filled={i < value.length ? "" : undefined}
          data-next={!disabled && i === value.length ? "" : undefined}
          aria-hidden="true"
        >
          {value[i] ?? ""}
        </span>
      ))}
    </label>
  );
}
