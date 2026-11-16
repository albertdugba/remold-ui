"use client";
import { OTPField } from "@base-ui/react/otp-field";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type FocusEvent, type Ref } from "react";

export interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  describedBy?: string;
  label?: string;
  className?: string;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
}

const SLIDE = { type: "spring" as const, duration: 0.35, bounce: 0.2 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.35 };
const LEAVE = { duration: 0.12, ease: "easeOut" as const };

const radiusOf = (index: number, length: number) =>
  index === 0 ? "26px 16px 16px 26px" : index === length - 1 ? "16px 26px 26px 16px" : "16px 16px 16px 16px";

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
  const id = useId();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState<number | null>(null);

  return (
    <OTPField.Root
      length={length}
      value={value}
      onValueChange={(next) => onChange(next)}
      disabled={disabled}
      validationType="numeric"
      data-invalid={invalid || undefined}
      data-cf-root=""
      className={`${className ?? ""} relative flex gap-2 rounded-full py-2.5 text-[var(--cf-ink)] [--cf-bad:#dc2626] [--cf-bad-bg:#fef2f2] [--cf-cell:#f1f1f1] [--cf-ink:#18181b] dark:[--cf-bad:#f87171] dark:[--cf-bad-bg:rgb(248_113_113_/_0.14)] dark:[--cf-cell:#3a3a40] dark:[--cf-ink:#fafafa] data-[invalid]:[&_.cf-cell]:bg-[var(--cf-bad-bg)] data-[invalid]:[&_.cf-cell]:text-[var(--cf-bad)]`}
    >
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      {Array.from({ length }, (_, index) => {
        const digit = value[index];
        const radius = radiusOf(index, length);

        return (
          <span
            key={index}
            className="cf-cell relative grid h-[52px] w-[42px] shrink-0 place-items-center bg-[var(--cf-cell)] text-[22px] font-semibold tabular-nums transition-[background-color,color] duration-150 ease-out first-of-type:w-[46px] last-of-type:w-[46px] motion-reduce:transition-none"
            style={{ borderRadius: radius }}
            data-filled={digit ? "" : undefined}
          >
            {index === focused && !disabled && (
              <motion.span
                layoutId={`${id}-ring`}
                className="pointer-events-none absolute inset-0 grid place-items-center shadow-[inset_0_0_0_2px_var(--cf-ink)] in-data-[invalid]:shadow-[inset_0_0_0_2px_var(--cf-bad)]"
                style={{ borderRadius: radius }}
                transition={reduced ? { duration: 0 } : SLIDE}
                aria-hidden="true"
              >
                {!digit && <span className="h-6 w-0.5 rounded-full bg-[var(--cf-ink)] motion-safe:animate-pulse in-data-[invalid]:bg-[var(--cf-bad)]" />}
              </motion.span>
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {digit && (
                <motion.span
                  key={`${index}-${digit}`}
                  className="pointer-events-none relative"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={reduced ? { opacity: 0, transition: LEAVE } : { opacity: 0, y: -6, scale: 0.8, filter: "blur(4px)", transition: LEAVE }}
                  transition={POP}
                  aria-hidden="true"
                >
                  {digit}
                </motion.span>
              )}
            </AnimatePresence>
            <OTPField.Input
              ref={index === 0 ? inputRef : undefined}
              aria-labelledby={index === 0 ? `${id}-label` : undefined}
              aria-label={index === 0 ? undefined : `Digit ${index + 1} of ${length}`}
              aria-describedby={describedBy}
              className="absolute inset-0 size-full cursor-text rounded-[inherit] border-0 bg-transparent p-0 text-center text-base text-transparent caret-transparent outline-none selection:bg-transparent selection:text-transparent"
              onFocus={(event) => {
                setFocused(index);
                onFocus?.(event);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.closest("[data-cf-root]")?.contains(event.relatedTarget)) setFocused(null);
              }}
            />
          </span>
        );
      })}
    </OTPField.Root>
  );
}
