"use client";
/**
 * A one-time code field: a row of cells over one real input, so typing, pasting and one-time-code
 * autofill all work. Shared by the sign-in card (`otp-input`) and the two-factor setup
 * (`two-factor`), so both ask for a code the same way.
 *
 * `invalid` turns the cells red in place, digits kept, for a code that didn't work.
 */
import type { FocusEvent, Ref } from "react";

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
      className={`${className ?? ""} relative flex cursor-text gap-2 rounded-full py-2.5 text-[var(--cf-ink)] [--cf-bad:#dc2626] [--cf-bad-bg:#fef2f2] [--cf-cell:#f1f1f1] [--cf-ink:#18181b] dark:[--cf-bad:#f87171] dark:[--cf-bad-bg:rgb(248_113_113_/_0.14)] dark:[--cf-cell:#3a3a40] dark:[--cf-ink:#fafafa] data-[invalid]:[&_.cf-cell]:bg-[var(--cf-bad-bg)] data-[invalid]:[&_.cf-cell]:text-[var(--cf-bad)]`}
      data-invalid={invalid || undefined}
    >
      <input
        ref={inputRef}
        className="absolute inset-0 z-[1] w-full border-0 bg-transparent text-base text-transparent caret-transparent outline-0"
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
          className={`cf-cell grid h-[52px] w-[42px] shrink-0 place-items-center rounded-2xl bg-[var(--cf-cell)] text-[22px] font-semibold tabular-nums transition-[box-shadow,background-color,color] duration-150 first:w-[46px] first:rounded-l-[26px] first:rounded-r-2xl last:w-[46px] last:rounded-r-[26px] last:rounded-l-2xl data-[next]:shadow-[inset_0_0_0_2px_var(--cf-ink)]`}
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
