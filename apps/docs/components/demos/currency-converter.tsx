"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUpDownIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Combobox } from "@base-ui/react/combobox";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, motion, useAnimate } from "motion/react";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useScene } from "./use-scene";
import "./currency-converter.css";

const CURRENCIES = {
  GBP: { name: "British Pound", flag: "🇬🇧", decimals: 2, perUsd: 0.7848 },
  USD: { name: "US Dollar", flag: "🇺🇸", decimals: 2, perUsd: 1 },
  EUR: { name: "Euro", flag: "🇪🇺", decimals: 2, perUsd: 0.921 },
  GHS: { name: "Ghanaian Cedi", flag: "🇬🇭", decimals: 2, perUsd: 15.36 },
  JPY: { name: "Japanese Yen", flag: "🇯🇵", decimals: 0, perUsd: 149.3 },
  NGN: { name: "Nigerian Naira", flag: "🇳🇬", decimals: 2, perUsd: 1540 },
} as const;

type Code = keyof typeof CURRENCIES;
type Side = "send" | "get";
type Key = "back" | "." | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

const CODES = Object.keys(CURRENCIES) as Code[];
const SIDES = [
  { side: "send", label: "You send", prompt: "Currency you are converting from" },
  { side: "get", label: "Recipient gets", prompt: "Currency you are converting to" },
] as const;

const FEE = 0.0045;
const INSTANT = new Set<Code>(["GBP", "USD", "EUR", "JPY"]);

const LAYOUT_SPRING = { duration: 0.6, bounce: 0.14 };
const DIGIT_SPRING = { type: "spring" as const, duration: 0.38, bounce: 0.16 };
const SWAP_SPRING = { type: "spring" as const, duration: 0.55, bounce: 0.15 };
const HIGHLIGHT_SPRING = { type: "spring" as const, duration: 0.28, bounce: 0.12 };
const FADE = { duration: 0.18 };

interface State {
  from: Code;
  to: Code;
  raw: string;
  side: Side;
  refused: number;
}

interface Quote {
  send: number;
  get: number;
  fee: number;
  rate: number;
}

const BEATS: readonly (State & { ms: number })[] = [
  { from: "GBP", to: "USD", raw: "1000", side: "send", refused: 0, ms: 1600 },
  { from: "GBP", to: "USD", raw: "2500", side: "send", refused: 0, ms: 1700 },
  { from: "USD", to: "GBP", raw: "2500", side: "send", refused: 0, ms: 2000 },
  { from: "USD", to: "EUR", raw: "2500", side: "send", refused: 0, ms: 2200 },
];

function fromBeat(step: number): State {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
}

const codeOf = (s: State, side: Side) => (side === "send" ? s.from : s.to);
const amountOf = (q: Quote, side: Side) => (side === "send" ? q.send : q.get);
const otherSide = (side: Side): Side => (side === "send" ? "get" : "send");

function roundTo(n: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function quote(s: State): Quote {
  const from = CURRENCIES[s.from];
  const to = CURRENCIES[s.to];
  const rate = to.perUsd / from.perUsd;
  const typed = Number(s.raw || 0);
  const send = s.side === "send" ? typed : typed / ((1 - FEE) * rate);
  const fee = send * FEE;
  const get = s.side === "send" ? (send - fee) * rate : typed;
  return {
    send: roundTo(Math.max(0, send), from.decimals),
    get: roundTo(Math.max(0, get), to.decimals),
    fee: roundTo(Math.max(0, fee), from.decimals),
    rate,
  };
}

function asRaw(n: number, decimals: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  return decimals === 0 ? String(Math.round(n)) : n.toFixed(decimals);
}

function press(raw: string, key: Key, decimals: number): string | false | null {
  if (key === "back") return raw.slice(0, -1);
  if (key === ".") {
    if (decimals === 0) return false;
    if (raw.includes(".")) return null;
    return raw ? `${raw}.` : "0.";
  }
  const [whole = "", cents] = raw.split(".");
  if (cents !== undefined && cents.length >= decimals) return false;
  if (cents === undefined && whole.replace(/^0+/, "").length >= 7) return false;
  return raw === "0" ? key : raw + key;
}

function sanitize(text: string, decimals: number) {
  const [whole = "", ...rest] = text.replace(/[^\d.]/g, "").split(".");
  const head = whole.replace(/^0+(?=\d)/, "").slice(0, 7);
  if (decimals === 0 || rest.length === 0) return head;
  return `${head || "0"}.${rest.join("").slice(0, decimals)}`;
}

function retarget(s: State, side: Side): State {
  if (s.side === side) return s;
  const decimals = CURRENCIES[codeOf(s, side)].decimals;
  return { ...s, side, raw: asRaw(amountOf(quote(s), side), decimals) };
}

function swap(s: State): State {
  return { ...s, from: s.to, to: s.from };
}

function choose(s: State, side: Side, code: Code): State {
  if (code === codeOf(s, otherSide(side))) return swap(s);
  const raw = s.side === side && CURRENCIES[code].decimals === 0 ? (s.raw.split(".")[0] ?? "") : s.raw;
  return { ...s, [side === "send" ? "from" : "to"]: code, raw };
}

function characters(raw: string, decimals: number | null) {
  const source = decimals === null ? raw : Number(raw || 0).toFixed(decimals);
  if (!source) return [{ key: "zero", char: "0", muted: true }];
  const [whole = "", cents] = source.split(".");
  const body = whole.replace(/^0+(?=\d)/, "") || "0";
  const out: { key: string; char: string; muted?: boolean }[] = [];
  [...body].forEach((char, i) => {
    const place = body.length - i - 1;
    out.push({ key: `d${place}-${char}`, char });
    if (place > 0 && place % 3 === 0) out.push({ key: `c${place}`, char: "," });
  });
  if (cents !== undefined) {
    out.push({ key: "dot", char: "." });
    [...cents].forEach((char, i) => out.push({ key: `f${i}-${char}`, char }));
  }
  return out;
}

function rateLabel(rate: number) {
  const digits = rate >= 10 ? rate.toFixed(2) : rate.toFixed(4);
  const [whole = "0", frac = ""] = digits.split(".");
  return `${Number(whole).toLocaleString("en-US")}.${frac}`;
}

function arrives(from: Code, to: Code) {
  return INSTANT.has(from) && INSTANT.has(to) ? "in seconds" : "by tomorrow";
}

function matches(code: Code, query: string) {
  const q = query.trim().toLowerCase();
  return !q || code.toLowerCase().includes(q) || CURRENCIES[code].name.toLowerCase().includes(q);
}

function keyOf(event: KeyboardEvent): Key | null {
  if (event.key === "Backspace") return "back";
  return /^[0-9.]$/.test(event.key) ? (event.key as Key) : null;
}

function Digits({ raw, decimals, caret, size = "lg" }: { raw: string; decimals: number | null; caret?: boolean; size?: "lg" | "sm" }) {
  const large = size === "lg";
  return (
    <span className="fx-digits" data-size={size}>
      <AnimatePresence initial={false} mode="popLayout">
        {characters(raw, decimals).map(({ key, char, muted }) => (
          <motion.span
            key={key}
            layout="position"
            className="fx-char"
            data-muted={muted || undefined}
            initial={large ? { y: "55%", opacity: 0, filter: "blur(4px)" } : { y: "80%", opacity: 0 }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={large ? { y: "-45%", opacity: 0, filter: "blur(4px)", transition: FADE } : { y: "-70%", opacity: 0, transition: FADE }}
            transition={DIGIT_SPRING}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>
      {caret && <span className="fx-caret" aria-hidden="true" />}
    </span>
  );
}

function Fade({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span className="fx-stack">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE}>
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Flag({ code }: { code: Code }) {
  return (
    <span className="fx-flag" aria-hidden="true">
      {CURRENCIES[code].flag}
    </span>
  );
}

interface AmountProps {
  side: Side;
  label: string;
  text: string;
  decimals: number | null;
  field: string;
  caret: boolean;
  refused: number;
  onKey: (key: Key) => void;
  onPaste: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function Amount({ side, label, text, decimals, field, caret, refused, onKey, onPaste, onFocus, onBlur }: AmountProps) {
  const labelId = useId();
  const [shaker, shake] = useAnimate<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const digits = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!refused || !shaker.current) return;
    shake(shaker.current, { x: [0, -7, 6, -3, 0] }, { duration: 0.36, ease: "easeOut" });
  }, [refused, shaker, shake]);

  useLayoutEffect(() => {
    if (!box.current || !digits.current) return;
    setScale(Math.min(1, box.current.clientWidth / digits.current.scrollWidth));
  }, [text, decimals]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.key === "Tab") return;
    const key = keyOf(event);
    if (event.key.length === 1 || key) event.preventDefault();
    if (key) onKey(key);
  };

  return (
    <div className="fx-well" data-side={side}>
      <span className="fx-label" id={labelId}>
        {label}
      </span>
      <div ref={box} className="fx-fit" data-rm-ignore="">
        <input
          className="fx-input"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-labelledby={labelId}
          value={field}
          onChange={() => {}}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={(event) => {
            event.preventDefault();
            onPaste(event.clipboardData.getData("text"));
          }}
        />
        <motion.div ref={shaker} className="fx-scale" animate={{ scale }} transition={DIGIT_SPRING}>
          <span ref={digits}>
            <Digits raw={text} decimals={decimals} caret={caret} />
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function CurrencyOption({ code }: { code: Code }) {
  return (
    <Combobox.Item
      value={code}
      className="fx-option"
      render={(props, state) => (
        <div {...props}>
          {state.highlighted && <motion.span layoutId="fx-highlight" className="fx-highlight" transition={HIGHLIGHT_SPRING} />}
          {props.children}
        </div>
      )}
    >
      <Flag code={code} />
      <span className="fx-option-text">
        <span className="fx-option-name">{CURRENCIES[code].name}</span>
        <span className="fx-option-code">{code}</span>
      </span>
    </Combobox.Item>
  );
}

function CurrencyPicker({ side, code, prompt, onPick }: { side: Side; code: Code; prompt: string; onPick: (code: Code) => void }) {
  const listId = useId();

  return (
    <Combobox.Root
      items={CODES}
      value={code}
      autoHighlight
      filter={matches}
      onValueChange={(next) => {
        if (next && next !== code) onPick(next);
      }}
    >
      <Combobox.Trigger className="fx-trigger" data-side={side} aria-label={`${code}: ${CURRENCIES[code].name}`}>
        <Flag code={code} />
        {code}
        <span className="fx-chevron" data-rm-ignore="">
          <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
        </span>
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner className="fx-positioner" align="end" sideOffset={8}>
          <Combobox.Popup className="fx-popup" aria-label={prompt}>
            <div className="fx-search">
              <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
              <Combobox.Input aria-label={prompt} placeholder="Search" />
            </div>
            <Combobox.Empty className="fx-empty">No matches</Combobox.Empty>
            <LayoutGroup id={listId}>
              <Combobox.List className="fx-list">{(item: Code) => <CurrencyOption key={item} code={item} />}</Combobox.List>
            </LayoutGroup>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function useSwapTurns(from: Code, to: Code) {
  const [turns, setTurns] = useState(0);
  const last = useRef({ from, to });

  useEffect(() => {
    const prev = last.current;
    if (from === prev.to && to === prev.from && from !== prev.from) setTurns((n) => n + 1);
    last.current = { from, to };
  }, [from, to]);

  return turns;
}

export function CurrencyConverterDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take, live } = scene;
  const [focus, setFocus] = useState<Side | null>(null);
  const turns = useSwapTurns(state.from, state.to);
  const q = quote(state);
  const arrival = arrives(state.from, state.to);

  const type = (side: Side, key: Key) =>
    take((s) => {
      const base = retarget(s, side);
      const next = press(base.raw, key, CURRENCIES[codeOf(base, side)].decimals);
      if (next === null) return base;
      return next === false ? { ...base, refused: base.refused + 1 } : { ...base, raw: next };
    });

  const paste = (side: Side, text: string) =>
    take((s) => {
      const base = retarget(s, side);
      return { ...base, raw: sanitize(text, CURRENCIES[codeOf(base, side)].decimals) };
    });

  return (
    <section ref={scene.ref} className="fx not-prose" aria-label="Currency converter">
      <Remold.Layout trigger={[state.from, state.to]} spring={LAYOUT_SPRING} className="fx-wells">
        {SIDES.map(({ side, label, prompt }) => {
          const active = state.side === side;
          const code = codeOf(state, side);
          const decimals = CURRENCIES[code].decimals;
          const amount = amountOf(q, side);
          return (
            <Fragment key={side}>
              <Amount
                side={side}
                label={label}
                text={active ? state.raw : String(amount)}
                decimals={active ? null : decimals}
                field={active ? state.raw : asRaw(amount, decimals)}
                refused={active ? state.refused : 0}
                caret={focus === side || (live && active)}
                onKey={(key) => type(side, key)}
                onPaste={(text) => paste(side, text)}
                onFocus={() => setFocus(side)}
                onBlur={() => setFocus((current) => (current === side ? null : current))}
              />
              <CurrencyPicker side={side} code={code} prompt={prompt} onPick={(next) => take((s) => choose(s, side, next))} />
            </Fragment>
          );
        })}
        <motion.button
          type="button"
          className="fx-swap"
          data-rm-ignore=""
          aria-label={`Swap. Send ${CURRENCIES[state.to].name}, receive ${CURRENCIES[state.from].name}`}
          animate={{ rotate: turns * 180 }}
          transition={SWAP_SPRING}
          whileTap={{ scale: 0.92 }}
          onClick={() => take(swap)}
        >
          <HugeiconsIcon icon={ArrowUpDownIcon} aria-hidden="true" />
        </motion.button>
      </Remold.Layout>

      <dl className="fx-meta">
        <div>
          <dt>Rate</dt>
          <dd>
            <Fade id={`${state.from}-${state.to}`}>
              1 {state.from} = {rateLabel(q.rate)} {state.to}
            </Fade>
          </dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd className="fx-fee">
            <Digits raw={q.fee.toFixed(CURRENCIES[state.from].decimals)} decimals={null} size="sm" />
            <Fade id={state.from}>{state.from}</Fade>
            <span className="fx-quiet">included</span>
          </dd>
        </div>
        <div>
          <dt>Arrives</dt>
          <dd>
            <Fade id={arrival}>{arrival}</Fade>
          </dd>
        </div>
      </dl>
    </section>
  );
}
