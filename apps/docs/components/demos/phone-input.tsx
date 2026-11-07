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
import { Combobox } from "@base-ui/react/combobox";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  CA: { name: "Canada", flag: "🇨🇦", dial: "+1", format: "(###) ###-####", example: "(416) 555-0132" },
  FR: { name: "France", flag: "🇫🇷", dial: "+33", format: "# ## ## ## ##", example: "6 12 34 56 78" },
  IN: { name: "India", flag: "🇮🇳", dial: "+91", format: "##### #####", example: "98765 43210" },
  AU: { name: "Australia", flag: "🇦🇺", dial: "+61", format: "### ### ###", example: "412 345 678" },
  KE: { name: "Kenya", flag: "🇰🇪", dial: "+254", format: "### ### ###", example: "712 345 678" },
  ZA: { name: "South Africa", flag: "🇿🇦", dial: "+27", format: "## ### ####", example: "82 123 4567" },
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
  while (next < digits.length) {
    out.push({ key: `d${next}`, char: digits[next]!, digit: true });
    next++;
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
  const reduced = useReducedMotion();
  const portal = usePortalContainer();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const c = COUNTRIES[country];
  const chars = characters(digits, c.format);
  const complete = digits.length === capacity(c.format);

  return (
    <Field.Root className="fk phn">
      <Field.Label className="fk-label">Phone number</Field.Label>
      <div className="fk-box phn-box" data-focused={focused || undefined}>
        <Combobox.Root items={Object.keys(COUNTRIES) as Country[]} value={country} inputValue={query} onInputValueChange={setQuery} onOpenChange={() => setQuery("")} itemToStringLabel={(code) => `${COUNTRIES[code].name} ${COUNTRIES[code].dial} ${code}`} onValueChange={(next) => { if (next) onCountryChange(next); setQuery(""); }}>
          <Combobox.Trigger className="phn-country" aria-label={`Country, ${c.name}, ${c.dial}`}>
            <span className="phn-flag" aria-hidden="true">
              {c.flag}
            </span>
            <span className="relative inline-grid overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span key={country} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -12 }} transition={{ duration: 0.2 }} className="col-start-1 row-start-1">{c.dial}</motion.span>
              </AnimatePresence>
            </span>
            <span className="phn-chevron">
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
            </span>
          </Combobox.Trigger>
          <Combobox.Portal container={portal}>
            <Combobox.Positioner sideOffset={8} align="start" className="z-50">
              <Combobox.Popup className="fk-popup phn-popup" render={<motion.div initial={{ opacity: 0, scale: reduced ? 1 : 0.94, y: reduced ? 0 : -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={reduced ? { duration: 0.1 } : { type: "spring", duration: 0.38, bounce: 0.18 }} />}>
                <div className="px-4 pb-3 pt-4">
                  <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">Country & region</span><span className="text-[11px] text-zinc-500">Dialing code</span></div>
                  <div className="relative"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-400"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
                  <Combobox.Input aria-label="Search countries" placeholder="Search name or +code" className="h-11 w-full rounded-xl bg-zinc-100 pl-9 pr-3 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-zinc-800 dark:text-white" />
                  </div>
                </div>
                <Combobox.Empty className="p-4 text-sm text-zinc-500">No matching country</Combobox.Empty>
                <Combobox.List className="phn-country-list">
                  {(code: Country) => (
                    <Combobox.Item key={code} value={code} className="phn-choice">
                      <motion.span aria-hidden="true" className="phn-choice-flag" initial={{ opacity: 0, scale: reduced ? 1 : 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22, delay: reduced ? 0 : Math.min(Object.keys(COUNTRIES).indexOf(code), 5) * 0.025 }}>{COUNTRIES[code].flag}</motion.span>
                      <motion.span className="min-w-0 flex-1" initial={{ opacity: 0, x: reduced ? 0 : -7 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: reduced ? 0 : Math.min(Object.keys(COUNTRIES).indexOf(code), 5) * 0.025 }}><span className="block text-[13px] font-medium">{COUNTRIES[code].name}</span><span className="mt-0.5 block text-[10px] tracking-wider text-zinc-400">{code}</span></motion.span>
                      <span className="text-xs tabular-nums text-zinc-500">{COUNTRIES[code].dial}</span>
                      <span className="phn-check-slot"><Combobox.ItemIndicator className="phn-check">
                        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} />
                      </Combobox.ItemIndicator></span>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>

        <span className="phn-rule" aria-hidden="true" />

        <span className="phn-number" onPointerDown={(event) => {
          if (event.target !== input.current) {
            event.preventDefault();
            input.current?.focus();
          }
        }}>
          <span className="phn-drawn" aria-hidden="true" style={{ visibility: focused ? "hidden" : "visible" }}>
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
            placeholder={c.example}
            value={digits}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              let next = event.target.value.replace(/\D/g, "");
              // A pasted number with its country code: drop the code.
              const dial = c.dial.slice(1);
              if (next.length > capacity(c.format) && next.startsWith(dial)) next = next.slice(dial.length);
              // A national trunk zero isn't part of the international number.
              if (country !== "US" && country !== "CA" && next.startsWith("0")) next = next.slice(1);
              onDigitsChange(next.slice(0, 15));
            }}
          />
        </span>
      </div>
      <Field.Description className="fk-description phn-help" data-complete={complete || undefined}>
        {digits.length > capacity(c.format) ? "Check the number length for this country." : complete ? `${c.dial} ${chars.map((x) => x.char).join("")}` : `${c.name} · Enter your national number`}
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
        onCountryChange={(country) => take((current) => ({ ...current, country }))}
        digits={state.digits}
        onDigitsChange={(digits) => take((current) => ({ ...current, digits }))}
      />
    </div>
  );
}
