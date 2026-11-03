"use client";
/**
 * A phone number field that formats as you type. Each digit rises into place, and the spaces,
 * brackets and dashes of the country's format appear as the number reaches them. Change the country
 * and the same digits regroup into the new format, the separators sliding to their new places
 * rather than the number being rewritten.
 *
 * Built on Base UI's Field and Select. A real input sits under the drawn number, so typing, pasting
 * and autofill all work; Motion moves the digits and separators.
 */
import { Field } from "@base-ui/react/field";
import { Select } from "@base-ui/react/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { usePortalContainer } from "./portal-container";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./phone-input.css";

/** Each country's national format: `#` is a digit, anything else is a separator. */
const COUNTRIES = {
  GH: { name: "Ghana", flag: "🇬🇭", dial: "+233", format: "## ### ####", example: "24 412 3456" },
  NG: { name: "Nigeria", flag: "🇳🇬", dial: "+234", format: "### ### ####", example: "803 123 4567" },
  GB: { name: "United Kingdom", flag: "🇬🇧", dial: "+44", format: "#### ######", example: "7700 900123" },
  US: { name: "United States", flag: "🇺🇸", dial: "+1", format: "(###) ###-####", example: "(415) 555-0132" },
} as const;

type Country = keyof typeof COUNTRIES;

const DIGIT = { type: "spring" as const, duration: 0.34, bounce: 0.16 };
const SLIDE = { type: "spring" as const, duration: 0.45, bounce: 0.12 };

/**
 * What to draw: the digits so far, with the format's separators up to the last digit. Digits are
 * keyed by their index so they stay put; separators by their order and character, so when the
 * format changes a space that exists in both slides to its new place.
 */
function characters(digits: string, format: string) {
  const out: { key: string; char: string; digit: boolean }[] = [];
  let next = 0;
  let separators = 0;
  for (let i = 0; i < format.length && next < digits.length; i++) {
    const slot = format[i]!;
    if (slot === "#") {
      out.push({ key: `d${next}`, char: digits[next]!, digit: true });
      next++;
    } else {
      out.push({ key: `s${separators++}${slot}`, char: slot, digit: false });
    }
  }
  return out;
}

const capacity = (format: string) => [...format].filter((c) => c === "#").length;

export interface PhoneInputProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  /** The national number, digits only. */
  digits: string;
  onDigitsChange: (digits: string) => void;
}

export function PhoneInput({ country, onCountryChange, digits, onDigitsChange }: PhoneInputProps) {
  const portal = usePortalContainer();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const c = COUNTRIES[country];
  const chars = characters(digits, c.format);
  const complete = digits.length === capacity(c.format);

  return (
    <Field.Root className="fk phn">
      <Field.Label className="fk-label">Phone number</Field.Label>
      <div className="fk-box phn-box" data-focused={focused || undefined}>
        <Select.Root value={country} onValueChange={(next) => next && onCountryChange(next as Country)}>
          <Select.Trigger className="phn-country" aria-label={`Country, ${c.name}`}>
            <span className="phn-flag" aria-hidden="true">
              {c.flag}
            </span>
            <Select.Value>{() => c.dial}</Select.Value>
            <Select.Icon className="phn-chevron">
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal container={portal}>
            <Select.Positioner sideOffset={6} alignItemWithTrigger={false} align="start">
              <Select.Popup className="fk-popup phn-popup">
                <Select.List>
                  {(Object.keys(COUNTRIES) as Country[]).map((code) => (
                    <Select.Item key={code} value={code} className="fk-option">
                      <span aria-hidden="true">{COUNTRIES[code].flag}</span>
                      <Select.ItemText>{COUNTRIES[code].name}</Select.ItemText>
                      <span className="fk-option-note">{COUNTRIES[code].dial}</span>
                      <Select.ItemIndicator className="phn-check">
                        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <span className="phn-rule" aria-hidden="true" />

        <span className="phn-number" onPointerDown={(e) => {
          if (e.target !== input.current) {
            e.preventDefault();
            input.current?.focus();
          }
        }}>
          <span className="phn-drawn" aria-hidden="true">
            {digits.length === 0 && <span className="phn-placeholder">{c.example}</span>}
            <AnimatePresence initial={false} mode="popLayout">
              {chars.map(({ key, char, digit }) => (
                <motion.span
                  key={key}
                  layout="position"
                  className="phn-char"
                  data-separator={!digit || undefined}
                  initial={digit ? { y: "40%", opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={digit ? { y: "40%", opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                  transition={digit ? DIGIT : SLIDE}
                >
                  {char}
                </motion.span>
              ))}
            </AnimatePresence>
            {focused && <motion.span layout="position" className="phn-caret" transition={SLIDE} />}
          </span>
          <Field.Control
            ref={input}
            className="phn-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={digits}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              let next = e.target.value.replace(/\D/g, "");
              // A pasted number with its country code: drop the code.
              const dial = c.dial.slice(1);
              if (next.length > capacity(c.format) && next.startsWith(dial)) next = next.slice(dial.length);
              // A national trunk zero isn't part of the international number.
              if (country !== "US" && next.startsWith("0")) next = next.slice(1);
              onDigitsChange(next.slice(0, capacity(c.format)));
            }}
          />
        </span>
      </div>
      <Field.Description className="fk-description phn-help" data-complete={complete || undefined}>
        {complete ? `${c.dial} ${chars.map((x) => x.char).join("")}` : "We’ll text a code to confirm it."}
      </Field.Description>
    </Field.Root>
  );
}

interface State {
  country: Country;
  digits: string;
}

const BEATS: readonly (State & { ms: number })[] = [
  { country: "GH", digits: "", ms: 900 },
  { country: "GH", digits: "2", ms: 180 },
  { country: "GH", digits: "24", ms: 180 },
  { country: "GH", digits: "244", ms: 180 },
  { country: "GH", digits: "2441", ms: 180 },
  { country: "GH", digits: "24412", ms: 180 },
  { country: "GH", digits: "244123", ms: 180 },
  { country: "GH", digits: "2441234", ms: 180 },
  { country: "GH", digits: "24412345", ms: 180 },
  { country: "GH", digits: "244123456", ms: 1800 },
  { country: "NG", digits: "244123456", ms: 1600 },
  { country: "GB", digits: "244123456", ms: 1600 },
  { country: "US", digits: "244123456", ms: 2000 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface PhoneInputDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function PhoneInputDemo({ playing }: PhoneInputDemoProps = {}) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <PhoneInput
        country={state.country}
        onCountryChange={(country) => take((s) => ({ ...s, country }))}
        digits={state.digits}
        onDigitsChange={(digits) => take((s) => ({ ...s, digits }))}
      />
    </div>
  );
}
