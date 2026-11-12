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
import { FK_DESCRIPTION, FK_STAGE, FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

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

const FLAG = "grid w-[22px] flex-none place-items-center text-[20px] leading-none";
const POPUP = [
  "[--fk-surface:#ffffff] [--fk-well:#f4f4f5] [--fk-ink:#0a0a0b] [--fk-muted:#71717a] [--fk-faint:#b4b4bd] [--fk-line:rgb(10_10_11/0.08)]",
  "dark:[--fk-surface:#1c1c1f] dark:[--fk-well:#2a2a2f] dark:[--fk-ink:#fafafa] dark:[--fk-muted:#a1a1aa] dark:[--fk-faint:#5b5b64] dark:[--fk-line:rgb(255_255_255/0.08)]",
  "flex max-h-[min(340px,var(--available-height,70dvh))] w-(--anchor-width) flex-col overflow-hidden rounded-[18px] border border-solid border-(--fk-line) bg-(--fk-surface) font-sans text-[14px] text-(--fk-ink) antialiased outline-none",
  "shadow-[0_0_0_0.5px_rgb(0_0_0/0.02),0_2px_4px_rgb(0_0_0/0.04),0_12px_24px_-6px_rgb(0_0_0/0.08),0_32px_64px_-16px_rgb(0_0_0/0.14)] dark:shadow-[0_24px_48px_-20px_rgb(0_0_0/0.7)]",
  "[clip-path:inset(-80px_-80px_-100px_-80px_round_18px)] [transition:clip-path_0.42s_cubic-bezier(0.32,0.72,0,1),transform_0.42s_cubic-bezier(0.32,0.72,0,1),opacity_0.2s_ease-out]",
  "data-starting-style:[clip-path:inset(-80px_-80px_100%_-80px_round_18px)] data-starting-style:[transform:translateY(-6px)] data-starting-style:opacity-40",
  "data-ending-style:[clip-path:inset(-80px_-80px_100%_-80px_round_18px)] data-ending-style:[transform:translateY(-6px)] data-ending-style:opacity-0",
  "data-ending-style:[transition:clip-path_0.2s_cubic-bezier(0.4,0,1,1),transform_0.2s_cubic-bezier(0.4,0,1,1),opacity_0.2s_ease-in]",
  "motion-reduce:transition-none",
].join(" ");
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
      data-country=""
      className="my-[1.8px] ml-[1.8px] inline-flex flex-none cursor-pointer touch-manipulation items-center gap-2 rounded-l-[14px] border-0 border-r border-solid border-(--fk-line) bg-transparent pr-3 pl-4 text-[15px] font-semibold text-(--fk-ink) outline-none transition-colors duration-150 [--tint:color-mix(in_oklab,var(--fk-ink)_3.5%,transparent)] hover:bg-(--tint) focus-visible:bg-(--tint) focus-visible:outline-none! data-popup-open:bg-(--tint)"
      aria-label={`Country, ${current.name}, ${current.dial}`}
    >
      <span className={`${FLAG} [&>span]:[grid-area:1/1]`} aria-hidden="true">
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

      <motion.span
        layout="position"
        transition={SLIDE}
        className="inline-grid overflow-hidden tabular-nums [&>span]:[grid-area:1/1]"
      >
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
        className="grid text-(--fk-muted)"
        layout="position"
        animate={{ rotate: open ? 180 : 0 }}
        transition={SETTLE}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-[13px]" />
      </motion.span>
    </Combobox.Trigger>
  );
}

function CountrySearch({ query, reduced }: { query: string; reduced: boolean }) {
  return (
    <motion.div
      className="relative flex h-[50px] flex-none items-center gap-2.5 border-b border-solid border-(--fk-line) pr-3 pl-4"
      initial={reduced ? false : { opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.22, delay: 0.06 }}
    >
      <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-4 flex-none text-(--fk-muted)" />
      <Combobox.Input
        aria-label="Search countries"
        placeholder="Search country or code"
        className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] text-(--fk-ink) outline-none placeholder:text-(--fk-muted)"
      />

      <AnimatePresence initial={false}>
        {query && (
          <Combobox.Clear
            className="grid size-[22px] flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--fk-well) p-0 text-(--fk-muted) [&_svg]:size-[11px]"
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
      className="group/choice relative block cursor-pointer touch-manipulation rounded-xl outline-none"
      render={<motion.div layout="position" transition={SETTLE} />}
    >
      {highlighted && <motion.span
          layoutId={highlightId}
          className="absolute inset-0 rounded-[inherit] bg-(--fk-well)"
          transition={SETTLE}
        />}

      <motion.span
        className="relative flex h-11 items-center gap-3 px-3"
        initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(3px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: reduced ? 0 : 0.05 + Math.min(index, 8) * 0.02 }}
      >
        <span className={FLAG} aria-hidden="true">
          {country.flag}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium group-data-selected/choice:font-semibold">
          {country.name}
        </span>
        <span className="min-w-10 text-right text-[13.5px] text-(--fk-muted) tabular-nums">{country.dial}</span>
        <span className="grid w-4 flex-none place-items-center">
          <Combobox.ItemIndicator
            className="grid size-4 place-items-center rounded-full bg-(--fk-ink) text-(--fk-surface) [&_svg]:size-2.5"
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
      <Combobox.Positioner anchor={anchor} sideOffset={8} align="start" className="z-50 outline-none">
        <Combobox.Popup className={POPUP}>
          <CountrySearch query={query} reduced={reduced} />

          <Combobox.Empty className="text-[13.5px] text-(--fk-muted) not-empty:grid not-empty:place-items-center not-empty:px-4 not-empty:pt-7 not-empty:pb-[30px]">
            <motion.span
              initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={SETTLE}
            >
              No country matches “{query}”
            </motion.span>
          </Combobox.Empty>

          <Combobox.List
            ref={list}
            className="min-h-0 overflow-y-auto overscroll-contain p-1.5 [mask-image:linear-gradient(to_bottom,transparent,#000_10px,#000_calc(100%-14px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            render={<motion.div layoutScroll />}
          >
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
    <span
      className="relative inline-flex items-center text-[17px] font-semibold tracking-[0.01em] whitespace-pre"
      aria-hidden="true"
    >
      <AnimatePresence initial={false}>
        {placeholder && (
          <motion.span
            key={placeholder}
            className="pointer-events-none absolute left-0 font-[450] text-(--fk-muted)"
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
              data-separator={!digit || undefined}
              className="inline-block data-separator:min-w-[0.32em] data-separator:text-center data-separator:text-(--fk-muted)"
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

      {caret && (
        <motion.span
          layout="position"
          className="ml-px h-[19px] w-[1.5px] animate-caret-blink rounded-[1px] bg-(--fk-ink) motion-reduce:animate-none"
          transition={SLIDE}
        />
      )}
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
  const outlineTone = tooLong ? "bad" : focused || open ? "ink" : undefined;
  const labelTone = raised ? (tooLong ? "bad" : "ink") : undefined;
  const helpTone = tooLong ? "bad" : complete ? "ink" : undefined;

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
    <Field.Root className={`grid w-[min(100%,400px)] gap-2 ${FORM_KIT}`} invalid={tooLong}>
      <div
        ref={box}
        className="group/box relative flex h-[54px] items-stretch rounded-2xl bg-(--fk-surface)"
        style={{ "--notch-at": `${notch.at}px` } as CSSProperties}
      >
        <fieldset
          data-tone={outlineTone}
          data-notched={raised || undefined}
          className="group/outline pointer-events-none absolute inset-0 m-0 min-w-0 rounded-[inherit] border-[1.8px] border-solid border-(--fk-line) py-0 pr-0 pl-[calc(var(--notch-at,0px)+11px)] transition-[border-color] duration-[180ms] group-has-[[data-country]:focus-visible]/box:border-(--fk-ink) data-[tone=ink]:border-(--fk-ink) data-[tone=bad]:border-(--fk-bad)!"
          aria-hidden="true"
        >
          <legend className="invisible block h-0 w-auto max-w-[0.01px] p-0 text-[12px] leading-0 font-medium whitespace-nowrap transition-[max-width] duration-50 ease-out group-data-notched/outline:max-w-full group-data-notched/outline:delay-40 group-data-notched/outline:duration-120">
            <span className="inline-block px-[5px]">Phone number</span>
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

        <span className="relative flex min-w-0 flex-1 items-center pr-3.5 pl-4">
          <Field.Label
            data-tone={labelTone}
            className="absolute top-1/2 left-4 -mt-2.5 h-5 origin-left cursor-text text-[16px] leading-5 font-[450] whitespace-nowrap text-(--fk-muted) transition-colors duration-[180ms] data-[tone=bad]:font-medium data-[tone=bad]:text-(--fk-bad) data-[tone=ink]:font-medium data-[tone=ink]:text-(--fk-ink)"
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

          <span className="relative flex h-6 min-w-0 flex-1 cursor-text items-center overflow-hidden" onPointerDown={focusInput}>
            <DrawnNumber
              chars={chars}
              placeholder={raised && digits.length === 0 ? current.example : null}
              caret={focused}
              reduced={reduced}
            />

            <Field.Control
              ref={input}
              className="absolute inset-0 w-full border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent opacity-0 outline-none"
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
        data-tone={helpTone}
        className={`px-0.5 transition-colors duration-200 data-[tone=bad]:font-[550] data-[tone=bad]:text-(--fk-bad) data-[tone=ink]:font-medium data-[tone=ink]:text-(--fk-ink) ${FK_DESCRIPTION}`}
      >
        <Remold.Text aria-hidden="true">{help}</Remold.Text>
        <span className="sr-only">
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

const STILL: State = { country: "GB", digits: "7700900123" };

export function PhoneInputDemo({ playing, preview }: { playing?: boolean; preview?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver } = scene;
  const state = preview && !playing ? STILL : scene.state;
  return (
    <div ref={ref} className={FK_STAGE}>
      <PhoneInput
        country={state.country}
        onCountryChange={(country) => takeOver((current) => ({ ...current, country }))}
        digits={state.digits}
        onDigitsChange={(digits) => takeOver((current) => ({ ...current, digits }))}
      />
    </div>
  );
}
