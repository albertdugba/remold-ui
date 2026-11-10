"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUpDownIcon,
  Cancel01Icon,
  Loading03Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { useInPreview } from "./portal-container";
import { useMeasuredSize } from "./use-measured-size";
import { useScript } from "./use-script";
import "./currency-converter.css";

const RATES_URL = "https://open.er-api.com/v6/latest/USD";

type Side = "send" | "get";
type Status = "idle" | "sending" | "sent";
interface Rates {
  perUsd: Record<string, number>;
  updated: Date;
}

const LABELS: Record<Side, string> = {
  send: "You send",
  get: "Recipient gets",
};
const names = new Intl.DisplayNames(["en"], { type: "currency" });
const nameOf = (code: string) => names.of(code) ?? code;
const FLAG_REGIONS: Record<string, string> = { ANG: "CW" };
const flagOf = (code: string) =>
  String.fromCodePoint(
    ...[...(FLAG_REGIONS[code] ?? code.slice(0, 2))].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
const decimalsOf = (code: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).resolvedOptions().maximumFractionDigits ?? 2;
const format = (value: number, code: string) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: decimalsOf(code),
    maximumFractionDigits: decimalsOf(code),
  });

let ratesRequest: Promise<Rates> | null = null;

function useRates() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    ratesRequest ??= fetch(RATES_URL)
      .then((response) => response.json())
      .then((body) => ({
        perUsd: body.rates,
        updated: new Date(body.time_last_update_utc),
      }));
    ratesRequest.then(setRates, () => {
      ratesRequest = null;
      setFailed(true);
    });
  };
  useEffect(load, []);
  return { rates, failed, retry: load };
}

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.18 };
const FADE = { duration: 0.18 };
const PART = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};
const TRAVEL = { initial: { opacity: 0.8 }, animate: { opacity: 1 } };
const CARD_PADDING = 12;
const SENDING_FOR = 1100;
const SENT_FOR = 2400;

function Digits({ text }: { text: string }) {
  const characters = [...text];
  return (
    <span className="fx-digits" aria-label={text}>
      <AnimatePresence initial={false} mode="popLayout">
        {characters.map((character, index) => (
          <motion.span
            key={`${characters.length - index}-${character}`}
            aria-hidden="true"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0, transition: FADE }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {character}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

function Flag({ code }: { code: string }) {
  return (
    <span className="fx-flag" aria-hidden="true">
      {flagOf(code)}
    </span>
  );
}

interface ListProps {
  side: Side;
  code: string;
  codes: string[];
  query: string;
  onQueryChange: (query: string) => void;
  focus: boolean;
  onPick: (code: string) => void;
  onClose: () => void;
}

function CurrencyList({ side, code, codes, query, onQueryChange, focus, onPick, onClose }: ListProps) {
  const typed = query.trim().toLowerCase();
  const shown = codes.filter(
    (other) => !typed || other.toLowerCase().includes(typed) || nameOf(other).toLowerCase().includes(typed),
  );
  const visible = shown.slice(0, typed ? 36 : 24);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") onClose();
  };

  return (
    <div role="dialog" aria-label={`Choose the currency ${side === "send" ? "you send" : "they get"}`}>
      <div className="fx-head">
        <motion.span layoutId={`fx-label-${side}`} className="fx-label" {...TRAVEL}>
          {LABELS[side]}
        </motion.span>
        <motion.button
          layoutId={`fx-pill-${side}`}
          type="button"
          className="fx-trigger"
          onClick={onClose}
          aria-label={`Keep ${code}`}
          {...TRAVEL}
        >
          <Flag code={code} />
          {code}
          <HugeiconsIcon icon={Cancel01Icon} className="fx-chevron" strokeWidth={2} aria-hidden="true" />
        </motion.button>
      </div>
      <Autocomplete.Root
        open
        inline
        items={visible}
        filter={null}
        value={query}
        autoHighlight="always"
        itemToStringValue={(item: string) => `${item} ${nameOf(item)}`}
        onValueChange={(next, details) =>
          details.reason !== "item-press" && details.reason !== "list-navigation" && onQueryChange(next)
        }
      >
        <motion.label className="fx-search" {...PART} transition={{ ...SPRING, delay: 0.04 }}>
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
          <Autocomplete.Input
            autoFocus={focus}
            placeholder="Search currencies"
            aria-label="Search currencies"
            onKeyDown={handleKeyDown}
          />
        </motion.label>
        <Autocomplete.Empty className="fx-empty">No currencies match</Autocomplete.Empty>
        <Autocomplete.List className="fx-list">
          {(item: string, index: number) => (
            <Autocomplete.Item
              key={item}
              value={item}
              className="fx-option"
              onClick={() => onPick(item)}
              render={
                index < 7 ? (
                  <motion.div
                    {...PART}
                    transition={{
                      duration: 0.18,
                      ease: "easeOut",
                      delay: index * 0.018,
                    }}
                  />
                ) : (
                  <div />
                )
              }
            >
              <Flag code={item} />
              <span className="fx-option-code">{item}</span>
              <span className="fx-option-name">{nameOf(item)}</span>
              {item === code && (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  className="fx-option-check"
                  strokeWidth={2.2}
                  aria-label="Current"
                />
              )}
            </Autocomplete.Item>
          )}
        </Autocomplete.List>
        {shown.length > visible.length && (
          <p className="fx-list-note">Type to search all {shown.length} currencies</p>
        )}
      </Autocomplete.Root>
    </div>
  );
}

function cleanAmount(typed: string, code: string) {
  const [whole = "", ...rest] = typed.replace(/[^\d.]/g, "").split(".");
  const decimals = decimalsOf(code);

  if (rest.length && decimals) return `${whole.slice(0, 9)}.${rest.join("").slice(0, decimals)}`;
  return whole.slice(0, 9);
}

function Well({
  side,
  code,
  amount,
  gets,
  failed,
  busy,
  canPick,
  onAmountChange,
  onPick,
}: {
  side: Side;
  code: string;
  amount: string;
  gets: number | null;
  failed: boolean;
  busy: boolean;
  canPick: boolean;
  onAmountChange: (amount: string) => void;
  onPick: () => void;
}) {
  const sending = side === "send";

  return (
    <motion.div className="fx-well" data-side={side} {...PART}>
      <motion.label
        layoutId={`fx-label-${side}`}
        className="fx-label"
        htmlFor={sending ? "fx-amount" : undefined}
        {...TRAVEL}
      >
        {LABELS[side]}
      </motion.label>

      {sending ? (
        <input
          id="fx-amount"
          className="fx-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          disabled={busy}
          onChange={(event) => onAmountChange(cleanAmount(event.target.value, code))}
        />
      ) : (
        <span className="fx-amount" aria-live="polite">
          {gets === null ? (
            <span className="fx-quiet">{failed ? "—" : "…"}</span>
          ) : (
            <Digits text={format(gets, code)} />
          )}
        </span>
      )}

      <motion.button
        layoutId={`fx-pill-${side}`}
        type="button"
        className="fx-trigger"
        disabled={busy || !canPick}
        aria-label={`${code}: ${nameOf(code)}. Change currency`}
        aria-haspopup="dialog"
        whileTap={{ scale: 1.06 }}
        onClick={onPick}
        {...TRAVEL}
      >
        <Flag code={code} />
        {code}
        <HugeiconsIcon icon={ArrowDown01Icon} className="fx-chevron" strokeWidth={2} aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}

function RateLine({
  from,
  to,
  rate,
  failed,
  onRetry,
}: {
  from: string;
  to: string;
  rate: number | null;
  failed: boolean;
  onRetry: () => void;
}) {
  let content: ReactNode;

  if (failed) {
    content = (
      <>
        Couldn't load today's rates.{" "}
        <button type="button" className="fx-retry" onClick={onRetry}>
          Try again
        </button>
      </>
    );
  } else if (rate === null) {
    content = "Loading today's rates…";
  } else {
    content = (
      <>
        1 {from} = <Digits text={rate >= 10 ? rate.toFixed(2) : rate.toFixed(4)} /> {to}
      </>
    );
  }

  return (
    <motion.p className="fx-rate" {...PART}>
      {content}
    </motion.p>
  );
}

function SendButton({
  status,
  amount,
  code,
  disabled,
  onSend,
}: {
  status: Status;
  amount: number;
  code: string;
  disabled: boolean;
  onSend: () => void;
}) {
  const label =
    status === "sending"
      ? "Sending"
      : `${status === "sent" ? "Sent" : "Send"} ${format(amount, code)} ${code}`;

  return (
    <motion.button
      type="button"
      className="fx-send"
      data-status={status}
      disabled={disabled}
      aria-busy={status === "sending" || undefined}
      whileTap={{ scale: 1.03 }}
      onClick={() => status === "idle" && onSend()}
      {...PART}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={status}
          className="fx-send-label"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={FADE}
        >
          {status === "sending" && (
            <HugeiconsIcon icon={Loading03Icon} className="fx-spin" strokeWidth={2} aria-hidden="true" />
          )}
          {status === "sent" && <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} aria-hidden="true" />}
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function Credit({ updated }: { updated: Date }) {
  const inPreview = useInPreview();
  const source = "Rates by ExchangeRate-API";

  return (
    <motion.p className="fx-credit" {...PART}>
      {inPreview ? (
        source
      ) : (
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
          {source}
        </a>
      )}{" "}
      · {updated.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
    </motion.p>
  );
}

export function CurrencyConverterDemo({ playing }: { playing?: boolean }) {
  const { rates, failed, retry } = useRates();
  const [from, setFrom] = useState("GBP");
  const [to, setTo] = useState("USD");
  const [amount, setAmount] = useState("1000");
  const [picking, setPicking] = useState<Side | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const returnFocus = useRef<Side | null>(null);
  const card = useRef<HTMLElement>(null);
  const [content, contentSize] = useMeasuredSize<HTMLDivElement>();
  const height = contentSize?.height ?? null;

  const busy = status !== "idle";
  const codes = rates
    ? Object.keys(rates.perUsd)
        .filter((code) => !code.startsWith("X"))
        .sort()
    : [from, to];
  const rate = rates ? rates.perUsd[to]! / rates.perUsd[from]! : null;
  const sent = Number(amount) || 0;
  const gets = rate === null ? null : sent * rate;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (picking || !returnFocus.current) return;

    card.current
      ?.querySelector<HTMLElement>(`.fx-well[data-side="${returnFocus.current}"] .fx-trigger`)
      ?.focus({ preventScroll: true });
    returnFocus.current = null;
  }, [picking]);

  const open = (side: Side) => {
    setQuery("");
    setPicking(side);
  };

  const close = () => {
    if (!live) returnFocus.current = picking;
    setPicking(null);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setTurns((count) => count + 1);
  };

  const pick = (code: string) => {
    if (code === (picking === "send" ? to : from)) swap();
    else if (picking === "send") setFrom(code);
    else setTo(code);
    close();
  };

  const send = () => {
    setStatus("sending");
    timers.current = [
      setTimeout(() => setStatus("sent"), SENDING_FOR),
      setTimeout(() => setStatus("idle"), SENDING_FOR + SENT_FOR),
    ];
  };

  const reset = () => {
    setFrom("GBP");
    setTo("USD");
    setAmount("1000");
  };

  const live = useScript(card, playing, [
    ...["2", "25", "250", "2500"].map((typed) => [110, () => setAmount(typed)] as const),
    [1300, () => open("get")],
    ...["e", "eu", "eur"].map((typed) => [120, () => setQuery(typed)] as const),
    [900, () => {}],
    [1500, () => pick("EUR")],
    [1600, swap],
    [SENDING_FOR + SENT_FOR + 600, send],
    [1400, reset],
  ]);

  const well = (side: Side) => (
    <Well
      side={side}
      code={side === "send" ? from : to}
      amount={amount}
      gets={gets}
      failed={failed}
      busy={busy}
      canPick={Boolean(rates)}
      onAmountChange={setAmount}
      onPick={() => open(side)}
    />
  );

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <LayoutGroup>
        <motion.section
          ref={card}
          className="fx not-prose"
          aria-label="Currency converter"
          data-picking={picking ?? undefined}
          initial={false}
          animate={{ height: height === null ? "auto" : height + CARD_PADDING * 2 }}
        >
          <div ref={content} className="fx-content">
            <AnimatePresence mode="popLayout" initial={false}>
              {picking ? (
                <motion.div key="list" className="fx-view">
                  <CurrencyList
                    side={picking}
                    code={picking === "send" ? from : to}
                    codes={codes}
                    query={query}
                    onQueryChange={setQuery}
                    focus={!live}
                    onPick={pick}
                    onClose={close}
                  />
                </motion.div>
              ) : (
                <motion.div key="converter" className="fx-view">
                  <div className="fx-wells">
                    {well("send")}
                    {well("get")}

                    <motion.button
                      type="button"
                      className="fx-swap"
                      disabled={busy || !rates}
                      aria-label={`Swap: send ${to}, receive ${from}`}
                      {...PART}
                      animate={{ ...PART.animate, rotate: turns * 180 }}
                      whileTap={{ scale: 1.08 }}
                      onClick={swap}
                    >
                      <HugeiconsIcon icon={ArrowUpDownIcon} aria-hidden="true" />
                    </motion.button>
                  </div>

                  <RateLine from={from} to={to} rate={rate} failed={failed} onRetry={retry} />
                  <SendButton
                    status={status}
                    amount={sent}
                    code={from}
                    disabled={!sent || !rates}
                    onSend={send}
                  />
                  {rates && <Credit updated={rates.updated} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </LayoutGroup>
    </MotionConfig>
  );
}
