"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  CheckIcon,
  Eraser01Icon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

const BALANCE = 12480;
const CURRENCY = "£";
const TO = { name: "Kwame Owusu", handle: "Monzo · 07700 900182" };

type Phase = "edit" | "sending" | "sent";

export interface SendMoneyValue {
  raw: string;
  phase: Phase;
  refused: number;
  note?: "over" | "cents";
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;
type Key = (typeof KEYS)[number];

const ROLL = { type: "spring" as const, duration: 0.38, bounce: 0.18 };

const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function readAmount(value: string): { raw: string } | { refused: "over" | "cents" } {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "").slice(0, 6);
  const cents = dot === -1 ? undefined : cleaned.slice(dot + 1).replaceAll(".", "");

  if (cents && cents.length > 2) return { refused: "cents" };
  const raw = cents === undefined ? whole : `${whole || "0"}.${cents}`;
  return Number(raw || 0) > BALANCE ? { refused: "over" } : { raw };
}

function characters(raw: string) {
  if (!raw) return [{ key: "zero", char: "0", muted: true }];
  const [whole = "", cents] = raw.split(".");
  const out: { key: string; char: string; muted?: boolean }[] = [];
  [...whole].forEach((char, index) => {
    const after = whole.length - index - 1;
    out.push({ key: `d${index}${char}`, char });
    if (after > 0 && after % 3 === 0) out.push({ key: `c${after}`, char: "," });
  });
  if (cents !== undefined) {
    out.push({ key: "dot", char: "." });
    [...cents].forEach((char, index) => out.push({ key: `f${index}${char}`, char }));
  }
  return out;
}

function press(raw: string, key: Key): { raw: string } | { refused: "over" | "cents" } | null {
  if (key === "back") return { raw: raw.slice(0, -1) };
  if (key === ".") return raw.includes(".") ? null : { raw: raw ? `${raw}.` : "0." };
  const [whole = "", cents] = raw.split(".");
  if (cents !== undefined && cents.length >= 2) return { refused: "cents" };
  if (cents === undefined && whole.length >= 6) return { refused: "over" };
  const typed = raw === "0" ? key : raw + key;
  return Number(typed) > BALANCE ? { refused: "over" } : { raw: typed };
}

export interface SendMoneyProps {
  value?: SendMoneyValue;
  defaultValue?: SendMoneyValue;
  onValueChange?: (value: SendMoneyValue, details: ChangeDetails) => void;
  showCaret?: boolean;
  ref?: Ref<HTMLElement>;
}

const keepFocus = (event: PointerEvent) => {
  if (event.isPrimary && event.button === 0) event.preventDefault();
};

function hintFor(transfer: SendMoneyValue) {
  if (transfer.phase === "sent")
    return { key: "sent", text: `Sent to ${TO.name.split(" ")[0]}`, tone: "good" };
  if (transfer.note === "over") return { key: "over", text: "That's more than your balance", tone: "bad" };
  if (transfer.note === "cents") return { key: "cents", text: "Two decimal places at most", tone: "bad" };
  return { key: "balance", text: `Balance ${CURRENCY}${money(BALANCE)}`, tone: undefined };
}

function sendLabel(phase: SendMoneyValue["phase"], total: number) {
  if (phase === "sending") return "Sending";
  if (phase === "sent") return "Done";
  return `Send ${CURRENCY}${money(total)}`;
}

const PALETTE = [
  "[--sm-surface:#ffffff] [--sm-key:#f4f4f5] [--sm-key-press:#e4e4e7] [--sm-ink:#18181b] [--sm-on-ink:#fafafa] [--sm-muted:#71717a] [--sm-faint:#d4d4d8] [--sm-good:#059669] [--sm-bad:#dc2626]",
  "dark:[--sm-surface:#232327] dark:[--sm-key:#2e2e33] dark:[--sm-key-press:#3a3a40] dark:[--sm-ink:#fafafa] dark:[--sm-on-ink:#18181b] dark:[--sm-muted:#a1a1aa] dark:[--sm-faint:#52525b] dark:[--sm-good:#34d399] dark:[--sm-bad:#f87171]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sm-ink)";

function Recipient() {
  return (
    <header className="flex items-center gap-[11px] px-1 pt-1">
      <img
        className="size-10 flex-none rounded-full bg-[#d1fae5]"
        src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(TO.name)}&backgroundColor=d1fae5`}
        alt=""
        width={40}
        height={40}
        draggable={false}
      />
      <span className="grid min-w-0 gap-px">
        <span className="text-[14.5px] font-semibold">{TO.name}</span>
        <span className="truncate text-[12px] text-(--sm-muted)">{TO.handle}</span>
      </span>
    </header>
  );
}

function Hint({ transfer }: { transfer: SendMoneyValue }) {
  const hint = hintFor(transfer);

  return (
    <div className="mt-1 grid h-5 justify-items-center text-[13px] text-(--sm-muted) [&_[data-tone=bad]]:text-(--sm-bad) [&_[data-tone=good]]:font-medium [&_[data-tone=good]]:text-(--sm-good)">
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={hint.key}
          data-tone={hint.tone}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {hint.text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function Keypad({ disabled, onKey }: { disabled: boolean; onKey: (key: Key) => void }) {
  return (
    <motion.div
      className="grid grid-cols-3 content-start gap-1.5"
      role="group"
      aria-label="Keypad"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
    >
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`grid h-[50px] cursor-pointer touch-manipulation place-items-center rounded-2xl border-0 bg-transparent text-[23px] font-medium text-(--sm-ink) transition-[background-color] duration-150 [-webkit-tap-highlight-color:transparent] not-disabled:hover:bg-(--sm-key) not-disabled:active:bg-(--sm-key-press) disabled:cursor-default disabled:opacity-35 [&_svg]:size-[22px] [&_svg]:[stroke-width:1.75] ${FOCUS}`}
          disabled={disabled}
          onPointerDown={keepFocus}
          onClick={() => onKey(key)}
          aria-label={key === "back" ? "Backspace" : key === "." ? "Decimal point" : key}
        >
          {key === "back" ? <HugeiconsIcon icon={Eraser01Icon} aria-hidden="true" /> : key}
        </button>
      ))}
    </motion.div>
  );
}

function Sent() {
  return (
    <motion.div
      className="grid place-items-center"
      initial={{ opacity: 0, scale: 0.72 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
    >
      <span className="grid size-[84px] place-items-center rounded-full bg-[color-mix(in_oklab,var(--sm-good)_14%,transparent)] text-(--sm-good) [&_svg]:size-9">
        <HugeiconsIcon icon={CheckIcon} strokeWidth={2.25} aria-hidden="true" />
      </span>
    </motion.div>
  );
}

function SendButton({
  phase,
  total,
  onSend,
}: {
  phase: SendMoneyValue["phase"];
  total: number;
  onSend: () => void;
}) {
  const icon = phase === "sending" ? Loading03Icon : phase === "sent" ? Tick02Icon : ArrowRight02Icon;

  return (
    <motion.button
      type="button"
      data-phase={phase}
      className={`relative mt-3.5 flex h-[52px] cursor-pointer touch-manipulation items-center justify-center gap-2.5 overflow-hidden rounded-full border-0 bg-(--sm-ink) text-[15px] font-semibold text-(--sm-on-ink) [transition:background-color_0.3s,opacity_0.2s] disabled:cursor-default data-[phase=edit]:disabled:opacity-30 data-[phase=sent]:bg-(--sm-good) data-[phase=sent]:text-white ${FOCUS}`}
      onPointerDown={keepFocus}
      onClick={onSend}
      disabled={phase === "sending" || (phase === "edit" && total === 0)}
      whileTap={{ scale: 0.97 }}
    >
      <span className="inline-grid justify-items-center whitespace-nowrap tabular-nums [&>*]:[grid-area:1/1]">
        <AnimatePresence initial={false}>
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {sendLabel(phase, total)}
          </motion.span>
        </AnimatePresence>
      </span>
      <span
        data-spinning={phase === "sending" || undefined}
        className="grid size-5 [&_svg]:size-5 [&_svg]:[stroke-width:2.25] data-spinning:[&_svg]:animate-spin motion-reduce:data-spinning:[&_svg]:[animation-duration:2.4s]"
      >
        <Remold.Icon icon={<HugeiconsIcon icon={icon} />} strokeWidth={2} />
      </span>
    </motion.button>
  );
}

export function SendMoney({
  value,
  defaultValue = { raw: "", phase: "edit", refused: 0 },
  onValueChange,
  showCaret = false,
  ref,
}: SendMoneyProps) {
  const [transfer, setTransfer] = useControllableState({ value, defaultValue, onValueChange });
  const [amount, shake] = useAnimate<HTMLDivElement>();
  const fit = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [typing, setTyping] = useState(false);

  const total = Number(transfer.raw || 0);
  const busy = transfer.phase !== "edit";

  useEffect(() => {
    if (!transfer.refused || !amount.current) return;
    shake(amount.current, { x: [0, -9, 8, -6, 4, 0] }, { duration: 0.42, ease: "easeOut" });
  }, [transfer.refused, amount, shake]);

  useLayoutEffect(() => {
    const inner = amount.current;
    const outer = fit.current;
    if (!inner || !outer) return;

    const fitted = Math.min(1, outer.clientWidth / inner.scrollWidth);
    setScale((current) => (Math.abs(current - fitted) < 0.001 ? current : fitted));
  }, [transfer.raw, amount]);

  useEffect(() => {
    if (transfer.phase !== "sending") return;
    const timer = setTimeout(() => setTransfer((current) => ({ ...current, phase: "sent" }), "timer"), 1100);
    return () => clearTimeout(timer);
  }, [transfer.phase, setTransfer]);

  const apply = (next: (raw: string) => ReturnType<typeof press>) =>
    setTransfer((current) => {
      if (current.phase !== "edit") return current;
      const result = next(current.raw);
      if (!result) return current;
      if ("refused" in result) return { ...current, refused: current.refused + 1, note: result.refused };
      return { ...current, raw: result.raw, note: undefined };
    });

  const onSend = () =>
    setTransfer((current) => {
      if (current.phase === "sent") return { raw: "", phase: "edit", refused: current.refused };
      return Number(current.raw || 0) > 0 ? { ...current, phase: "sending", note: undefined } : current;
    });

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSend();
  };

  return (
    <section
      ref={ref}
      data-phase={transfer.phase}
      className={`group not-prose grid w-[min(100%,352px)] rounded-[30px] bg-(--sm-surface) p-[18px] font-sans text-(--sm-ink) ${PALETTE}`}
      aria-label="Send money"
    >
      <Recipient />

      <div ref={fit} className="relative mt-[26px] grid justify-items-center overflow-visible">
        <input
          className="absolute inset-0 z-1 w-full cursor-text border-0 bg-transparent text-[16px] text-transparent caret-transparent outline-0 read-only:cursor-default"
          inputMode="decimal"
          aria-label={`Amount to send to ${TO.name}, in pounds`}
          value={transfer.raw}
          readOnly={busy}
          onChange={(event: ChangeEvent<HTMLInputElement>) => apply(() => readAmount(event.target.value))}
          onKeyDown={onKeyDown}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
        />

        <div style={{ transform: `scale(${scale})` }} className="origin-center">
          <div
            ref={amount}
            className="inline-flex h-[58px] items-baseline text-[48px] leading-[58px] font-[650] tracking-[-0.04em] whitespace-nowrap tabular-nums group-data-[phase=sent]:text-(--sm-good) group-data-[phase=sent]:transition-colors group-data-[phase=sent]:duration-300"
            aria-live="polite"
            aria-label={`${CURRENCY}${money(total)}`}
          >
            <span className="mr-1 -translate-y-4 text-[22px] font-semibold tracking-[-0.01em] text-(--sm-muted)">{CURRENCY}</span>
            <AnimatePresence initial={false} mode="popLayout">
              {characters(transfer.raw).map(({ key, char, muted }) => (
                <motion.span
                  key={key}
                  layout="position"
                  className="inline-block data-muted:text-(--sm-faint)"
                  data-muted={muted || undefined}
                  initial={{ opacity: 0, y: "38%", filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: "-24%", filter: "blur(2px)", transition: { duration: 0.13 } }}
                  transition={ROLL}
                >
                  {char}
                </motion.span>
              ))}
            </AnimatePresence>
            {!busy && (typing || showCaret) && (
              <span
                className="ml-1 inline-block h-[46px] w-[3px] animate-caret-blink self-center rounded-[2px] bg-(--sm-ink) motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>

      <Hint transfer={transfer} />

      <div className="mt-[18px] grid min-h-[218px] [&>*]:[grid-area:1/1]">
        <AnimatePresence initial={false}>
          {transfer.phase === "sent" ? (
            <Sent key="success" />
          ) : (
            <Keypad key="keys" disabled={busy} onKey={(key) => apply((raw) => press(raw, key))} />
          )}
        </AnimatePresence>
      </div>

      <SendButton phase={transfer.phase} total={total} onSend={onSend} />
    </section>
  );
}

const BEATS: readonly (SendMoneyValue & { ms: number })[] = [
  { raw: "", phase: "edit", refused: 0, ms: 1300 },
  { raw: "1", phase: "edit", refused: 0, ms: 360 },
  { raw: "12", phase: "edit", refused: 0, ms: 360 },
  { raw: "125", phase: "edit", refused: 0, ms: 360 },
  { raw: "1250", phase: "edit", refused: 0, ms: 1000 },
  { raw: "1250", phase: "edit", refused: 1, note: "over", ms: 1500 },
  { raw: "1250", phase: "sending", refused: 1, ms: 1200 },
  { raw: "1250", phase: "sent", refused: 1, ms: 2400 },
];

const fromBeat = (step: number): SendMoneyValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface SendMoneyDemoProps {
  playing?: boolean;
}

export function SendMoneyDemo({ playing }: SendMoneyDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <SendMoney
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      showCaret={scene.live}
    />
  );
}
