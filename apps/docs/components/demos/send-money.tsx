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
} from "react";
import { useScene } from "./use-scene";
import "./send-money.css";

const BALANCE = 12480;
const CURRENCY = "£";
const TO = { name: "Kwame Owusu", handle: "Monzo · 07700 900182" };

type Phase = "edit" | "sending" | "sent";

interface State {
  /** What's been typed, as typed: "1250", "0.5", "". */
  raw: string;
  phase: Phase;
  /** Bumped each time a key is refused, to shake the amount. */
  refused: number;
  /** Why the last key was refused, shown under the amount until the next key lands. */
  note?: "over" | "cents";
}

const BEATS: readonly (State & { ms: number })[] = [
  { raw: "", phase: "edit", refused: 0, ms: 1300 },
  { raw: "1", phase: "edit", refused: 0, ms: 360 },
  { raw: "12", phase: "edit", refused: 0, ms: 360 },
  { raw: "125", phase: "edit", refused: 0, ms: 360 },
  { raw: "1250", phase: "edit", refused: 0, ms: 1000 },
  // One more 0 would be 12,500: more than the balance.
  { raw: "1250", phase: "edit", refused: 1, note: "over", ms: 1500 },
  { raw: "1250", phase: "sending", refused: 1, ms: 1200 },
  { raw: "1250", phase: "sent", refused: 1, ms: 2400 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "0",
  "back",
] as const;
type Key = (typeof KEYS)[number];

/** Arrow, then two arcs that spin while it sends, then a check: two strokes each, so they morph cleanly. */

const ROLL = { type: "spring" as const, duration: 0.38, bounce: 0.18 };

const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Turns native keyboard and paste input into the same money value as the keypad. */
function readAmount(
  value: string,
): { raw: string } | { refused: "over" | "cents" } {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot))
    .replace(/^0+(?=\d)/, "")
    .slice(0, 6);
  const cents =
    dot === -1 ? undefined : cleaned.slice(dot + 1).replaceAll(".", "");

  if (cents && cents.length > 2) return { refused: "cents" };
  const raw = cents === undefined ? whole : `${whole || "0"}.${cents}`;
  return Number(raw || 0) > BALANCE ? { refused: "over" } : { raw };
}

/** The amount as characters, each with a key that survives typing, so only new digits animate. */
function characters(raw: string) {
  if (!raw) return [{ key: "zero", char: "0", muted: true }];
  const [whole = "", cents] = raw.split(".");
  const out: { key: string; char: string; muted?: boolean }[] = [];
  [...whole].forEach((char, index) => {
    const after = whole.length - index - 1;
    out.push({ key: `d${index}${char}`, char });
    // A comma is named by how many digits follow it, so it keeps its identity as it slides left.
    if (after > 0 && after % 3 === 0) out.push({ key: `c${after}`, char: "," });
  });
  if (cents !== undefined) {
    out.push({ key: "dot", char: "." });
    [...cents].forEach((char, index) =>
      out.push({ key: `f${index}${char}`, char }),
    );
  }
  return out;
}

/** The next amount after a key, or why the key is refused. */
function press(
  raw: string,
  key: Key,
): { raw: string } | { refused: "over" | "cents" } | null {
  if (key === "back") return { raw: raw.slice(0, -1) };
  if (key === ".")
    return raw.includes(".") ? null : { raw: raw ? `${raw}.` : "0." };
  const [whole = "", cents] = raw.split(".");
  if (cents !== undefined && cents.length >= 2) return { refused: "cents" };
  if (cents === undefined && whole.length >= 6) return { refused: "over" };
  const next = raw === "0" ? key : raw + key;
  return Number(next) > BALANCE ? { refused: "over" } : { raw: next };
}

interface SendMoneyDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function SendMoneyDemo({ playing }: SendMoneyDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const [amount, shake] = useAnimate<HTMLDivElement>();
  const fit = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [typing, setTyping] = useState(false);

  const value = Number(state.raw || 0);
  const busy = state.phase !== "edit";

  // A refused key shakes the amount; the note under it says why.
  useEffect(() => {
    if (!state.refused || !amount.current) return;
    shake(
      amount.current,
      { x: [0, -9, 8, -6, 4, 0] },
      { duration: 0.42, ease: "easeOut" },
    );
  }, [state.refused, amount, shake]);

  // Shrink a long amount to fit the card. A uniform scale keeps the digits' shape.
  useLayoutEffect(() => {
    const inner = amount.current;
    const outer = fit.current;
    if (!inner || !outer) return;
    const next = Math.min(1, outer.clientWidth / inner.scrollWidth);
    setScale((current) => (Math.abs(current - next) < 0.001 ? current : next));
  }, [state.raw, amount]);

  // Sending takes a moment, then it's sent.
  useEffect(() => {
    if (scene.live || state.phase !== "sending") return;
    const timer = setTimeout(
      () => take((current) => ({ ...current, phase: "sent" })),
      1100,
    );
    return () => clearTimeout(timer);
  }, [scene.live, state.phase, take]);

  const onKey = (key: Key) =>
    take((current) => {
      if (current.phase !== "edit") return current;
      const next = press(current.raw, key);
      if (!next) return current;
      if ("refused" in next)
        return { ...current, refused: current.refused + 1, note: next.refused };
      return { ...current, raw: next.raw, note: undefined };
    });

  // Let iOS own text entry and deletion. Intercepting every keystroke makes the virtual keyboard
  // feel delayed and can drop the first delete; the keypad still uses the strict key-by-key path.
  const onType = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  };

  const onTypeChange = (event: ChangeEvent<HTMLInputElement>) =>
    take((current) => {
      if (current.phase !== "edit") return current;
      const next = readAmount(event.target.value);
      if ("refused" in next)
        return { ...current, refused: current.refused + 1, note: next.refused };
      return { ...current, raw: next.raw, note: undefined };
    });

  const onSend = () =>
    take((current) => {
      if (current.phase === "sent")
        return { raw: "", phase: "edit", refused: current.refused };
      return Number(current.raw || 0) > 0
        ? { ...current, phase: "sending", note: undefined }
        : current;
    });

  const icon =
    state.phase === "sending"
      ? Loading03Icon
      : state.phase === "sent"
      ? Tick02Icon
      : ArrowRight02Icon;
  const hint =
    state.phase === "sent"
      ? { key: "sent", text: `Sent to ${TO.name.split(" ")[0]}`, tone: "good" }
      : state.note === "over"
      ? { key: "over", text: "That's more than your balance", tone: "bad" }
      : state.note === "cents"
      ? { key: "cents", text: "Two decimal places at most", tone: "bad" }
      : {
          key: "balance",
          text: `Balance ${CURRENCY}${money(BALANCE)}`,
          tone: undefined,
        };

  return (
    <section
      ref={scene.ref}
      className="sm not-prose"
      aria-label="Send money"
      data-phase={state.phase}
    >
      <header className="sm-to">
        <img
          src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
            TO.name,
          )}&backgroundColor=d1fae5`}
          alt=""
          width={40}
          height={40}
          draggable={false}
        />
        <span className="sm-to-copy">
          <span className="sm-to-name">{TO.name}</span>
          <span className="sm-to-handle">{TO.handle}</span>
        </span>
      </header>

      <div ref={fit} className="sm-fit">
        {/* The amount is the field: an invisible input over the digits takes the typing. */}
        <input
          className="sm-type"
          inputMode="decimal"
          aria-label={`Amount to send to ${TO.name}, in pounds`}
          value={state.raw}
          readOnly={busy}
          onChange={onTypeChange}
          onKeyDown={onType}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
        />
        <div style={{ transform: `scale(${scale})` }} className="sm-scale">
          <div
            ref={amount}
            className="sm-amount"
            aria-live="polite"
            aria-label={`${CURRENCY}${money(value)}`}
          >
            <span className="sm-currency">{CURRENCY}</span>
              {characters(state.raw).map(({ key, char, muted }) => (
                <span
                  key={key}
                  className="sm-char"
                  data-muted={muted || undefined}
                >
                  {char}
                </span>
              ))}
            {!busy && (typing || scene.live) && (
              <span className="sm-caret" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      <div className="sm-hint">
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

      <div className="sm-stage">
        <AnimatePresence initial={false}>
          {state.phase === "sent" ? (
            <motion.div
              key="success"
              className="sm-success"
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            >
              <span className="sm-success-ring">
                <HugeiconsIcon
                  icon={CheckIcon}
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="keys"
              className="sm-keys"
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
                  className="sm-key"
                  disabled={busy}
                  onPointerDown={(event) => {
                    // Keep the amount field focused: dismissing the software keyboard
                    // here can move the key before Safari delivers its click.
                    if (event.isPrimary && event.button === 0) event.preventDefault();
                  }}
                  onClick={() => onKey(key)}
                  aria-label={
                    key === "back"
                      ? "Backspace"
                      : key === "."
                      ? "Decimal point"
                      : key
                  }
                >
                  {key === "back" ? (
                    <HugeiconsIcon icon={Eraser01Icon} aria-hidden="true" />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        className="sm-send"
        onPointerDown={(event) => {
          if (event.isPrimary && event.button === 0) event.preventDefault();
        }}
        onClick={onSend}
        disabled={
          state.phase === "sending" || (state.phase === "edit" && value === 0)
        }
        whileTap={{ scale: 0.97 }}
      >
        {/* Old and new labels share one grid cell, so the swap crossfades in place instead of colliding. */}
        <span className="sm-send-label">
          <AnimatePresence initial={false}>
            <motion.span
              key={state.phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {state.phase === "sending"
                ? "Sending"
                : state.phase === "sent"
                ? "Done"
                : `Send ${CURRENCY}${money(value)}`}
            </motion.span>
          </AnimatePresence>
        </span>
        <span
          className="sm-send-icon"
          data-spinning={state.phase === "sending" || undefined}
        >
          <Remold.Icon icon={<HugeiconsIcon icon={icon} />} strokeWidth={2} />
        </span>
      </motion.button>
    </section>
  );
}
