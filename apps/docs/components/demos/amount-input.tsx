"use client";
import { Input } from "@base-ui/react/input";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { typing, useScene } from "./use-scene";
import "./amount-input.css";

const DIGIT = { type: "spring" as const, duration: 0.36, bounce: 0.18 };
const SHAKE = { duration: 0.36, ease: "easeOut" as const };

export interface AmountInputProps {
  /** The amount as typed: digits and at most one point, e.g. "2400.5". */
  value: string;
  onValueChange: (value: string) => void;
  /** What's available. Above it, the field turns red and says by how much. */
  balance?: number;
  /** Shown before the number. Default "$". */
  symbol?: string;
  /** The currency's code, shown at the end of the field. Default "USD". */
  currency?: string;
  /** Places after the point. Default 2. */
  decimals?: number;
  /** Most digits before the point. Default 7. */
  maxDigits?: number;
  label?: string;
}

function accept(next: string, decimals: number, maxDigits: number): string | null {
  const clean = next.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = clean.split(".");
  if (rest.length > 1) return null;
  const fraction = rest[0];
  if (fraction !== undefined && (decimals === 0 || fraction.length > decimals)) return null;
  const head = whole.replace(/^0+(?=\d)/, "");
  if (head.length > maxDigits) return null;
  return fraction === undefined ? head : `${head || "0"}.${fraction}`;
}

const flagOf = (code: string) =>
  String.fromCodePoint(
    ...[...code.slice(0, 2).toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );

const money = (n: number, symbol: string, decimals: number) =>
  `${symbol}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

function characters(value: string) {
  if (!value) return [{ key: "empty", char: "0", muted: true }];
  const [whole = "", fraction] = value.split(".");
  const out: { key: string; char: string; muted?: boolean }[] = [];
  [...(whole || "0")].forEach((char, index, all) => {
    out.push({ key: `w${index}`, char });
    const place = all.length - index - 1;
    if (place > 0 && place % 3 === 0) out.push({ key: `s${place}`, char: "," });
  });
  if (fraction !== undefined) {
    out.push({ key: "point", char: "." });
    [...fraction].forEach((char, index) => out.push({ key: `f${index}`, char }));
  }
  return out;
}

export function AmountInput({
  value,
  onValueChange,
  balance,
  symbol = "$",
  currency = "USD",
  decimals = 2,
  maxDigits = 7,
  label = "Amount",
}: AmountInputProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(false);
  const [number, animate] = useAnimate<HTMLSpanElement>();

  const track = (field: HTMLInputElement) => {
    const end = field.value.length;
    const all = end > 0 && field.selectionStart === 0 && field.selectionEnd === end;
    setSelected(all);
    if (!all && (field.selectionStart !== end || field.selectionEnd !== end))
      field.setSelectionRange(end, end);
  };

  useEffect(() => {
    const field = input.current;
    if (!field) return;
    const onSelect = () => track(field);
    field.addEventListener("select", onSelect);
    return () => field.removeEventListener("select", onSelect);
  });

  const amount = Number(value || 0);
  const over = balance !== undefined && amount > balance;
  const shake = () => {
    if (number.current) void animate(number.current, { x: [0, -7, 6, -4, 2, 0] }, SHAKE);
  };

  const wasOver = useRef(over);
  useEffect(() => {
    if (over && !wasOver.current) shake();
    wasOver.current = over;
  });

  const helper =
    balance === undefined
      ? ""
      : over
        ? `${money(amount - balance, symbol, decimals)} more than your balance`
        : `Balance ${money(balance, symbol, decimals)}`;

  return (
    <div
      className="amt"
      data-over={over || undefined}
      data-focused={focused || undefined}
      data-selected={(focused && selected) || undefined}
    >
      <span className="amt-top">
        <label htmlFor={id} className="amt-label">
          {label}
        </label>
        {balance !== undefined && (
          <button
            type="button"
            className="amt-max"
            onClick={() => onValueChange(balance.toFixed(decimals).replace(/\.?0+$/, ""))}
          >
            Max
          </button>
        )}
      </span>
      <div
        className="amt-field"
        onPointerDown={(event) => {
          if (event.target !== input.current) {
            event.preventDefault();
            input.current?.focus();
          }
        }}
      >
        <span className="amt-row">
          <span className="amt-symbol" data-muted={!value || undefined}>
            {symbol}
          </span>
          <span ref={number} className="amt-number" aria-hidden="true">
            <AnimatePresence initial={false} mode="popLayout">
              {characters(value).map(({ key, char, muted }) => (
                <motion.span
                  key={key}
                  layout="position"
                  className="amt-char"
                  data-muted={muted || undefined}
                  initial={{ y: "45%", opacity: 0, filter: "blur(3px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: "45%", opacity: 0, filter: "blur(3px)", transition: { duration: 0.14 } }}
                  transition={DIGIT}
                >
                  {char}
                </motion.span>
              ))}
            </AnimatePresence>
            {focused && !selected && (
              <motion.span layout="position" className="amt-caret" transition={DIGIT} />
            )}
          </span>
          <Input
            ref={input}
            id={id}
            className="amt-input"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={value}
            aria-invalid={over || undefined}
            aria-describedby={helper ? `${id}-help` : undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setSelected(false);
            }}
            onSelect={(event) => track(event.currentTarget)}
            onValueChange={(typed) => {
              setSelected(false);
              const accepted = accept(typed, decimals, maxDigits);
              if (accepted === null) shake();
              else onValueChange(accepted);
            }}
          />
        </span>
        <span className="amt-code">
          <span className="amt-flag" aria-hidden="true">
            {flagOf(currency)}
          </span>
          {currency}
        </span>
      </div>
      {helper && (
        <Remold.Text id={`${id}-help`} className="amt-help" aria-live="polite">
          {helper}
        </Remold.Text>
      )}
    </div>
  );
}

interface State {
  value: string;
}

const BEATS: readonly (State & { ms: number })[] = [
  { value: "", ms: 900 },
  ...typing("24000", (value) => ({ value }), { every: 110, hold: 1500 }),
  { value: "2400", ms: 360 },
  ...typing(".50", (value) => ({ value }), { from: "2400", every: 110, hold: 2400 }),
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface AmountInputDemoProps {
  playing?: boolean;
  preview?: boolean;
}

const STILL: State = { value: "1250.50" };

export function AmountInputDemo({ playing, preview }: AmountInputDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver } = scene;
  const state = preview && !playing ? STILL : scene.state;
  return (
    <div ref={ref} className="amt-demo not-prose">
      <AmountInput
        value={state.value}
        onValueChange={(value) => takeOver({ value })}
        balance={2410.5}
        symbol="£"
        currency="GBP"
      />
    </div>
  );
}
