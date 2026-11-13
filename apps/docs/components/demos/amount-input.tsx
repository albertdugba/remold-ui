"use client";
import { Input } from "@base-ui/react/input";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { typing, useScene } from "./use-scene";

const DIGIT = { type: "spring" as const, duration: 0.36, bounce: 0.18 };
const SHAKE = { duration: 0.36, ease: "easeOut" as const };

export interface AmountInputProps {
  value: string;
  onValueChange: (value: string) => void;
  balance?: number;
  symbol?: string;
  currency?: string;
  decimals?: number;
  maxDigits?: number;
  label?: string;
}

const PALETTE = [
  "[--amt-surface:#ffffff] [--amt-ink:#0a0a0b] [--amt-muted:#71717a] [--amt-faint:#c4c4cc]",
  "[--amt-line:rgb(10_10_11/0.1)] [--amt-focus:#0a0a0b] [--amt-bad:#e5484d]",
  "dark:[--amt-surface:#18181b] dark:[--amt-ink:#fafafa] dark:[--amt-muted:#a1a1aa] dark:[--amt-faint:#52525b]",
  "dark:[--amt-line:rgb(255_255_255/0.1)] dark:[--amt-focus:#fafafa] dark:[--amt-bad:#ff6369]",
].join(" ");

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
  symbol = "£",
  currency = "GBP",
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

  const tone = over ? "bad" : focused ? "focus" : undefined;

  return (
    <div
      data-over={over || undefined}
      data-selected={(focused && selected) || undefined}
      className={`group grid w-[min(100%,340px)] gap-2 text-start font-sans text-(--amt-ink) tabular-nums antialiased ${PALETTE}`}
    >
      <span className="flex min-h-[22px] items-center justify-between px-0.5">
        <label htmlFor={id} className="cursor-text text-[12.5px] font-[550] text-(--amt-muted)">
          {label}
        </label>
        {balance !== undefined && (
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-(--amt-muted) transition-colors duration-150 hover:text-(--amt-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--amt-focus)"
            onClick={() => onValueChange(balance.toFixed(decimals).replace(/\.?0+$/, ""))}
          >
            Max
          </button>
        )}
      </span>
      <div
        data-tone={tone}
        className="flex h-[52px] cursor-text items-center gap-3 rounded-[14px] border-[1.8px] border-solid border-(--amt-line) bg-(--amt-surface) pr-3.5 pl-4 transition-[border-color] duration-[180ms] data-[tone=bad]:border-(--amt-bad) data-[tone=focus]:border-(--amt-ink)"
        onPointerDown={(event) => {
          if (event.target !== input.current) {
            event.preventDefault();
            input.current?.focus();
          }
        }}
      >
        <span className="relative flex h-12 min-w-0 flex-1 items-baseline gap-[5px] overflow-hidden leading-[48px]">
          <span
            data-muted={!value || undefined}
            className="text-[18px] font-medium text-(--amt-muted) transition-colors duration-200 data-muted:text-(--amt-faint)"
          >
            {symbol}
          </span>
          <span
            ref={number}
            className="inline-flex items-baseline text-[18px] font-semibold tracking-[-0.015em] whitespace-pre group-data-over:text-(--amt-bad) group-data-selected:rounded group-data-selected:bg-[color-mix(in_oklab,#3b82f6_22%,transparent)]"
            aria-hidden="true"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {characters(value).map(({ key, char, muted }) => (
                <motion.span
                  key={key}
                  layout="position"
                  data-muted={muted || undefined}
                  className="inline-block data-muted:text-(--amt-faint)"
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
              <motion.span
                layout="position"
                className="ml-0.5 h-5 w-[1.5px] animate-caret-blink self-center rounded-[1px] bg-(--amt-ink) group-data-over:bg-(--amt-bad) motion-reduce:animate-none"
                transition={DIGIT}
              />
            )}
          </span>
          <Input
            ref={input}
            id={id}
            className="absolute inset-0 w-full border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent opacity-0 outline-none"
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
        <span className="flex h-[22px] flex-none items-center gap-[7px] border-l border-solid border-(--amt-line) pl-3 text-[13.5px] font-semibold tracking-[0.01em] text-(--amt-ink)">
          <span className="grid size-[18px] place-items-center overflow-hidden rounded-full text-[24px] leading-none" aria-hidden="true">
            {flagOf(currency)}
          </span>
          {currency}
        </span>
      </div>
      {helper && (
        <Remold.Text
          id={`${id}-help`}
          className="px-0.5 text-[12.5px] text-(--amt-muted) transition-colors duration-200 group-data-over:font-[550] group-data-over:text-(--amt-bad)"
          aria-live="polite"
        >
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
    <div ref={ref} className="not-prose grid w-full place-items-center">
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
