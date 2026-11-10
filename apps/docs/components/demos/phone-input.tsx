"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Field } from "@base-ui/react/field";
import { ArrowDown01Icon, Cancel01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type Ref,
  type RefObject,
} from "react";

import { usePortalContainer } from "./portal-container";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./phone-input.css";

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
type CountryInfo = (typeof COUNTRIES)[Country];
type Character = { key: string; char: string; digit: boolean };

const CODES = Object.keys(COUNTRIES) as Country[];

const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };
const DIGIT = { type: "spring" as const, duration: 0.32, bounce: 0.1 };
const SLIDE = { type: "spring" as const, duration: 0.4, bounce: 0 };
const POP = { type: "spring" as const, duration: 0.35, bounce: 0.3 };
const LABEL_SCALE = 0.75;
const BLUR_IN = { opacity: 0, filter: "blur(4px)" };
const SHARP = { opacity: 1, filter: "blur(0px)" };
const FADE = { opacity: 0 };

function characters(digits: string, format: string) {
  const out: Character[] = [];
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

const capacity = (format: string) => [...format].filter((slot) => slot === "#").length;

function nationalDigits(typed: string, country: Country) {
  const { dial, format } = COUNTRIES[country];
  let digits = typed.replace(/\D/g, "");

  const dialDigits = dial.slice(1);
  if (digits.length > capacity(format) && digits.startsWith(dialDigits))
    digits = digits.slice(dialDigits.length);
  if (country !== "US" && country !== "CA" && digits.startsWith("0")) digits = digits.slice(1);

  return digits.slice(0, 15);
}

function useNotch(trigger: RefObject<HTMLElement | null>, box: RefObject<HTMLElement | null>) {
  const [notch, setNotch] = useState({ at: 0, lift: 30 });

  useEffect(() => {
    const country = trigger.current;
    const field = box.current;
    if (!country || !field) return;

    const measure = () => setNotch({ at: country.offsetWidth, lift: field.offsetHeight / 2 });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(country);
    observer.observe(field);
    return () => observer.disconnect();
  }, [trigger, box]);

  return notch;
}

function useCenterChosen(list: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      const scroller = list.current;
      const chosen = scroller?.querySelector<HTMLElement>("[data-selected]");
      if (!scroller || !chosen) return;
      scroller.scrollTop = chosen.offsetTop - scroller.clientHeight / 2 + chosen.offsetHeight / 2;
    });

    return () => cancelAnimationFrame(frame);
  }, [list, open]);
}

function CountryTrigger({
  country,
  open,
  reduced,
  ref,
}: {
  country: Country;
  open: boolean;
  reduced: boolean;
  ref: Ref<HTMLButtonElement>;
}) {
  const current = COUNTRIES[country];

  return (
    <Combobox.Trigger
      ref={ref}
      className="phn-country"
      aria-label={`Country, ${current.name}, ${current.dial}`}
    >
      <span className="phn-flag" aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={country}
            initial={reduced ? FADE : { ...BLUR_IN, scale: 0.5 }}
            animate={{ ...SHARP, scale: 1 }}
            exit={reduced ? FADE : { ...BLUR_IN, scale: 0.5 }}
            transition={SETTLE}
          >
            {current.flag}
          </motion.span>
        </AnimatePresence>
      </span>

      <motion.span layout="position" transition={SLIDE} className="phn-dial">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={current.dial}
            initial={reduced ? FADE : { ...BLUR_IN, y: 10 }}
            animate={{ ...SHARP, y: 0 }}
            exit={reduced ? FADE : { ...BLUR_IN, y: -10 }}
            transition={SETTLE}
          >
            {current.dial}
          </motion.span>
        </AnimatePresence>
      </motion.span>

      <motion.span
        className="phn-chevron"
        layout="position"
        animate={{ rotate: open ? 180 : 0 }}
        transition={SETTLE}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
      </motion.span>
    </Combobox.Trigger>
  );
}

function CountrySearch({ query, reduced }: { query: string; reduced: boolean }) {
  return (
    <motion.div
      className="phn-search"
      initial={reduced ? false : { opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.22, delay: 0.06 }}
    >
      <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="phn-search-icon" />
      <Combobox.Input
        aria-label="Search countries"
        placeholder="Search country or code"
        className="phn-search-input"
      />

      <AnimatePresence initial={false}>
        {query && (
          <Combobox.Clear
            className="phn-search-clear"
            aria-label="Clear search"
            render={
              <motion.button
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={SETTLE}
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} />
          </Combobox.Clear>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CountryOption({
  code,
  index,
  highlighted,
  highlightId,
  reduced,
}: {
  code: Country;
  index: number;
  highlighted: boolean;
  highlightId: string;
  reduced: boolean;
}) {
  const country = COUNTRIES[code];

  return (
    <Combobox.Item
      value={code}
      className="phn-choice"
      render={<motion.div layout="position" transition={SETTLE} />}
    >
      {highlighted && <motion.span layoutId={highlightId} className="phn-highlight" transition={SETTLE} />}

      <motion.span
        className="phn-choice-body"
        initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(3px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: reduced ? 0 : 0.05 + Math.min(index, 8) * 0.02 }}
      >
        <span className="phn-choice-flag" aria-hidden="true">
          {country.flag}
        </span>
        <span className="phn-choice-name">{country.name}</span>
        <span className="phn-choice-dial">{country.dial}</span>
        <span className="phn-check-slot">
          <Combobox.ItemIndicator
            className="phn-check"
            render={
              <motion.span
                initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={POP}
              />
            }
          >
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} />
          </Combobox.ItemIndicator>
        </span>
      </motion.span>
    </Combobox.Item>
  );
}

function CountryPopup({
  open,
  anchor,
  query,
  highlighted,
  reduced,
}: {
  open: boolean;
  anchor: RefObject<HTMLDivElement | null>;
  query: string;
  highlighted: Country | undefined;
  reduced: boolean;
}) {
  const portal = usePortalContainer();
  const id = useId();
  const list = useRef<HTMLDivElement>(null);

  useCenterChosen(list, open);

  return (
    <Combobox.Portal container={portal}>
      <Combobox.Positioner anchor={anchor} sideOffset={8} align="start" className="phn-positioner">
        <Combobox.Popup className="phn-popup">
          <CountrySearch query={query} reduced={reduced} />

          <Combobox.Empty className="phn-empty">
            <motion.span
              initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={SETTLE}
            >
              No country matches “{query}”
            </motion.span>
          </Combobox.Empty>

          <Combobox.List ref={list} className="phn-list" render={<motion.div layoutScroll />}>
            {(code: Country, index: number) => (
              <CountryOption
                key={code}
                code={code}
                index={index}
                highlighted={highlighted === code}
                highlightId={`${id}-highlight`}
                reduced={reduced}
              />
            )}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

function DrawnNumber({
  chars,
  placeholder,
  caret,
  reduced,
}: {
  chars: Character[];
  placeholder: string | null;
  caret: boolean;
  reduced: boolean;
}) {
  return (
    <span className="phn-drawn" aria-hidden="true">
      <AnimatePresence initial={false}>
        {placeholder && (
          <motion.span
            key={placeholder}
            className="phn-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2 }}
          >
            {placeholder}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="popLayout">
        {chars.map(({ key, char, digit }) => {
          const hidden = digit ? { ...BLUR_IN, y: "45%" } : { opacity: 0, scale: 0.5 };

          return (
            <motion.span
              key={key}
              layout="position"
              className="phn-char"
              data-separator={!digit || undefined}
              initial={reduced ? FADE : hidden}
              animate={{ ...SHARP, y: 0, scale: 1 }}
              exit={reduced ? FADE : { ...hidden, transition: { duration: 0.12 } }}
              transition={digit ? DIGIT : SLIDE}
            >
              {char}
            </motion.span>
          );
        })}
      </AnimatePresence>

      {caret && <motion.span layout="position" className="phn-caret" transition={SLIDE} />}
    </span>
  );
}

function helpFor(current: CountryInfo, chars: Character[], complete: boolean, tooLong: boolean) {
  if (tooLong) return "Check the number length for this country";
  if (complete) return `${current.dial} ${chars.map((slot) => slot.char).join("")}`;
  return `${current.name} · enter your national number`;
}

export interface PhoneInputProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  /** The national number, digits only. */
  digits: string;
  onDigitsChange: (digits: string) => void;
}

export function PhoneInput({ country, onCountryChange, digits, onDigitsChange }: PhoneInputProps) {
  const reduced = useReducedMotion() ?? false;
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const notch = useNotch(trigger, box);

  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState<Country | undefined>();

  const current = COUNTRIES[country];
  const chars = characters(digits, current.format);
  const complete = digits.length === capacity(current.format);
  const tooLong = digits.length > capacity(current.format);
  const raised = focused || digits.length > 0;
  const help = helpFor(current, chars, complete, tooLong);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setQuery("");
    if (next) setHighlighted(country);
  };

  const focusInput = (event: PointerEvent) => {
    if (event.target === input.current) return;
    event.preventDefault();
    input.current?.focus();
  };

  return (
    <Field.Root className="fk phn" invalid={tooLong}>
      <div
        ref={box}
        className="phn-box"
        data-focused={focused || undefined}
        data-open={open || undefined}
        data-complete={complete || undefined}
        style={{ "--phn-notch-at": `${notch.at}px` } as CSSProperties}
      >
        <fieldset className="phn-outline" aria-hidden="true" data-notched={raised || undefined}>
          <legend>
            <span>Phone number</span>
          </legend>
        </fieldset>

        <Combobox.Root
          items={CODES}
          autoHighlight
          value={country}
          open={open}
          onOpenChange={onOpenChange}
          inputValue={query}
          onInputValueChange={setQuery}
          onItemHighlighted={(code) => setHighlighted(code ?? undefined)}
          itemToStringLabel={(code) => `${COUNTRIES[code].name} ${COUNTRIES[code].dial} ${code}`}
          onValueChange={(next) => {
            if (next) onCountryChange(next);
            setQuery("");
          }}
        >
          <CountryTrigger ref={trigger} country={country} open={open} reduced={reduced} />
          <CountryPopup open={open} anchor={box} query={query} highlighted={highlighted} reduced={reduced} />
        </Combobox.Root>

        <span className="phn-main">
          <Field.Label
            className="phn-label"
            data-raised={raised || undefined}
            render={
              <motion.label
                initial={false}
                animate={raised ? { y: -notch.lift, scale: LABEL_SCALE } : { y: 0, scale: 1 }}
                transition={reduced ? { duration: 0 } : SETTLE}
              />
            }
          >
            Phone number
          </Field.Label>

          <span className="phn-number" onPointerDown={focusInput}>
            <DrawnNumber
              chars={chars}
              placeholder={raised && digits.length === 0 ? current.example : null}
              caret={focused}
              reduced={reduced}
            />

            <Field.Control
              ref={input}
              className="phn-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              aria-label={`Phone number, ${current.name}`}
              value={digits}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) => onDigitsChange(nationalDigits(event.target.value, country))}
            />
          </span>
        </span>
      </div>

      <Field.Description
        className="fk-description phn-help"
        data-complete={complete || undefined}
        data-invalid={tooLong || undefined}
      >
        <Remold.Text aria-hidden="true">{help}</Remold.Text>
        <span className="fk-sr">
          {complete || tooLong ? help : `${help}. For example, ${current.example}.`}
        </span>
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
  playing?: boolean;
  preview?: boolean;
}

const STILL: State = { country: "GB", digits: "7700900123" };

export function PhoneInputDemo({ playing, preview }: PhoneInputDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver } = scene;
  const state = preview && !playing ? STILL : scene.state;
  return (
    <div ref={ref} className="fk-stage not-prose">
      <PhoneInput
        country={state.country}
        onCountryChange={(country) => takeOver((current) => ({ ...current, country }))}
        digits={state.digits}
        onDigitsChange={(digits) => takeOver((current) => ({ ...current, digits }))}
      />
    </div>
  );
}
