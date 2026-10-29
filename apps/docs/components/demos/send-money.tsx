"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { MorphIcon } from "./morph-icon";
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

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;
type Key = (typeof KEYS)[number];

/** Arrow, then two arcs that spin while it sends, then a check: two strokes each, so they morph cleanly. */
const ARROW = "M5 12h14M13 6l6 6-6 6";
const SPINNER = "M12 3a9 9 0 0 1 9 9M12 21a9 9 0 0 1-9-9";
const CHECK = "M5 12.5l4.5 4.5M9.5 17L19 7";

const ROLL = { type: "spring" as const, duration: 0.38, bounce: 0.18 };

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The amount as characters, each with a key that survives typing, so only new digits animate. */
function characters(raw: string) {
  if (!raw) return [{ key: "zero", char: "0", muted: true }];
  const [whole = "", cents] = raw.split(".");
  const out: { key: string; char: string; muted?: boolean }[] = [];
  [...whole].forEach((char, i) => {
    const after = whole.length - i - 1;
    out.push({ key: `d${i}${char}`, char });
    // A comma is named by how many digits follow it, so it keeps its identity as it slides left.
    if (after > 0 && after % 3 === 0) out.push({ key: `c${after}`, char: "," });
  });
  if (cents !== undefined) {
    out.push({ key: "dot", char: "." });
    [...cents].forEach((char, i) => out.push({ key: `f${i}${char}`, char }));
  }
  return out;
}

/** The next amount after a key, or why the key is refused. */
function press(raw: string, key: Key): { raw: string } | { refused: "over" | "cents" } | null {
  if (key === "back") return { raw: raw.slice(0, -1) };
  if (key === ".") return raw.includes(".") ? null : { raw: raw ? `${raw}.` : "0." };
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
    shake(amount.current, { x: [0, -9, 8, -6, 4, 0] }, { duration: 0.42, ease: "easeOut" });
  }, [state.refused, amount, shake]);

  // Shrink a long amount to fit the card. A uniform scale keeps the digits' shape.
  useLayoutEffect(() => {
    const inner = amount.current;
    const outer = fit.current;
    if (!inner || !outer) return;
    setScale(Math.min(1, outer.clientWidth / inner.scrollWidth));
  }, [state.raw, amount]);

  // Sending takes a moment, then it's sent.
  useEffect(() => {
    if (scene.live || state.phase !== "sending") return;
    const timer = setTimeout(() => take((s) => ({ ...s, phase: "sent" })), 1100);
    return () => clearTimeout(timer);
  }, [scene.live, state.phase, take]);

  const onKey = (key: Key) =>
    take((s) => {
      if (s.phase !== "edit") return s;
      const next = press(s.raw, key);
      if (!next) return s;
      if ("refused" in next) return { ...s, refused: s.refused + 1, note: next.refused };
      return { ...s, raw: next.raw, note: undefined };
    });

  // Typing goes through the same rules as the keypad; anything else the field would insert is ignored.
  const onType = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.key === "Tab") return;
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
      return;
    }
    const key: Key | null = event.key === "Backspace" ? "back" : /^[0-9.]$/.test(event.key) ? (event.key as Key) : null;
    if (event.key.length === 1 || key) event.preventDefault();
    if (key) onKey(key);
  };

  const onSend = () =>
    take((s) => {
      if (s.phase === "sent") return { raw: "", phase: "edit", refused: s.refused };
      return Number(s.raw || 0) > 0 ? { ...s, phase: "sending", note: undefined } : s;
    });

  const icon = state.phase === "sending" ? SPINNER : state.phase === "sent" ? CHECK : ARROW;
  const hint =
    state.phase === "sent"
      ? { key: "sent", text: `Sent to ${TO.name.split(" ")[0]}`, tone: "good" }
      : state.note === "over"
        ? { key: "over", text: "That's more than your balance", tone: "bad" }
        : state.note === "cents"
          ? { key: "cents", text: "Two decimal places at most", tone: "bad" }
          : { key: "balance", text: `Balance ${CURRENCY}${money(BALANCE)}`, tone: undefined };

  return (
    <section ref={scene.ref} className="sm not-prose" aria-label="Send money" data-phase={state.phase}>
      <header className="sm-to">
        <img
          src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(TO.name)}&backgroundColor=d1fae5`}
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
          onChange={() => {}}
          onKeyDown={onType}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
        />
        <motion.div animate={{ scale }} transition={ROLL} className="sm-scale">
          <div ref={amount} className="sm-amount" aria-live="polite" aria-label={`${CURRENCY}${money(value)}`}>
            <span className="sm-currency">{CURRENCY}</span>
            <AnimatePresence initial={false} mode="popLayout">
              {characters(state.raw).map(({ key, char, muted }) => (
                <motion.span
                  key={key}
                  layout="position"
                  className="sm-char"
                  data-muted={muted || undefined}
                  initial={{ y: "55%", opacity: 0, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: "-45%", opacity: 0, filter: "blur(4px)", transition: { duration: 0.16 } }}
                  transition={ROLL}
                >
                  {char}
                </motion.span>
              ))}
            </AnimatePresence>
            {!busy && (typing || scene.live) && <span className="sm-caret" aria-hidden="true" />}
          </div>
        </motion.div>
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

      <div className="sm-keys" role="group" aria-label="Keypad">
        {KEYS.map((key) => (
          <motion.button
            key={key}
            type="button"
            className="sm-key"
            disabled={busy}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0.3 }}
            onClick={() => onKey(key)}
            aria-label={key === "back" ? "Delete" : key === "." ? "Decimal point" : key}
          >
            {key === "back" ? <HugeiconsIcon icon={Delete01Icon} aria-hidden="true" /> : key}
          </motion.button>
        ))}
      </div>

      <motion.button
        type="button"
        className="sm-send"
        onClick={onSend}
        disabled={state.phase === "sending" || (state.phase === "edit" && value === 0)}
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
              {state.phase === "sending" ? "Sending" : state.phase === "sent" ? "Done" : `Send ${CURRENCY}${money(value)}`}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="sm-send-icon" data-spinning={state.phase === "sending" || undefined}>
          <MorphIcon d={icon} />
        </span>
      </motion.button>
    </section>
  );
}
