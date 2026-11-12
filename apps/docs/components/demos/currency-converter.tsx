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
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { useInPreview } from "./portal-container";
import { useMeasuredSize } from "./use-measured-size";
import { useScript } from "./use-script";

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

const PALETTE = [
  "[--fx-surface:#f3f3f5] [--fx-well:#ffffff] [--fx-line:rgb(24_24_27/0.08)] [--fx-ink:#18181b] [--fx-muted:#71717a] [--fx-quiet:#a1a1aa]",
  "dark:[--fx-surface:#1c1c1f] dark:[--fx-well:#2c2c31] dark:[--fx-line:rgb(255_255_255/0.1)] dark:[--fx-ink:#fafafa] dark:[--fx-muted:#a1a1aa] dark:[--fx-quiet:#71717a]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fx-ink)";
const LABEL = "w-fit justify-self-start text-[14px] font-medium text-(--fx-muted)";
const TRIGGER = `inline-flex h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-1 text-[16px] font-[650] whitespace-nowrap text-(--fx-ink) disabled:cursor-default ${FOCUS}`;
const CHEVRON = "size-[13px] text-(--fx-muted)";
const AMOUNT =
  "flex h-[46px] min-w-0 items-baseline border-0 bg-transparent text-[length:clamp(16px,min(13cqi_+_8px,100cqi_/_(var(--fx-chars)_*_0.56)),40px)] leading-[46px] font-semibold tracking-[-0.035em] whitespace-nowrap text-inherit tabular-nums outline-none transition-[font-size] duration-200 ease-out motion-reduce:transition-none";

function Digits({ text }: { text: string }) {
  const characters = [...text];
  return (
    <span className="inline-flex [&>*]:inline-block" aria-label={text}>
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

function Flag({ code, large }: { code: string; large?: boolean }) {
  return (
    <span
      data-large={large || undefined}
      className="grid size-5 flex-none place-items-center overflow-hidden rounded-full text-[22px] leading-none shadow-[inset_0_0_0_1px_rgb(24_24_27/0.12)] data-large:size-7 data-large:text-[30px]"
      aria-hidden="true"
    >
      {flagOf(code)}
    </span>
  );
}

const HOVER = { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.55 };

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
  const [highlighted, setHighlighted] = useState<string | undefined>();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") onClose();
  };

  return (
    <div role="dialog" aria-label={`Choose the currency ${side === "send" ? "you send" : "they get"}`}>
      <div className="flex h-12 items-center justify-between pr-1.5 pl-4">
        <motion.span layoutId={`fx-label-${side}`} className={LABEL} {...TRAVEL}>
          {LABELS[side]}
        </motion.span>
        <motion.button
          layoutId={`fx-pill-${side}`}
          type="button"
          className={TRIGGER}
          onClick={onClose}
          aria-label={`Keep ${code}`}
          {...TRAVEL}
        >
          <Flag code={code} />
          {code}
          <HugeiconsIcon icon={Cancel01Icon} className={CHEVRON} strokeWidth={2} aria-hidden="true" />
        </motion.button>
      </div>
      <Autocomplete.Root
        open
        inline
        items={visible}
        filter={null}
        value={query}
        autoHighlight="always"
        onItemHighlighted={(item) => setHighlighted(item)}
        itemToStringValue={(item: string) => `${item} ${nameOf(item)}`}
        onValueChange={(next, details) =>
          details.reason !== "item-press" && details.reason !== "list-navigation" && onQueryChange(next)
        }
      >
        <motion.label
          className="mb-1.5 flex h-11 items-center gap-2 rounded-full bg-(--fx-surface) px-3 text-(--fx-muted)"
          {...PART}
          transition={{ ...SPRING, delay: 0.04 }}
        >
          <HugeiconsIcon icon={Search01Icon} className="size-4" aria-hidden="true" />
          <Autocomplete.Input
            className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-(--fx-ink) outline-none"
            autoFocus={focus}
            placeholder="Search currencies"
            aria-label="Search currencies"
            onKeyDown={handleKeyDown}
          />
        </motion.label>
        <Autocomplete.Empty className="px-3 py-[18px] text-center text-[14px] text-(--fx-muted) empty:hidden">No currencies match</Autocomplete.Empty>
        <Autocomplete.List className="max-h-[242px] overflow-auto outline-none [scrollbar-width:thin]" render={<motion.div layoutScroll />}>
          {(item: string, index: number) => (
            <Autocomplete.Item
              key={item}
              value={item}
              className="relative grid h-11 cursor-pointer grid-cols-[28px_auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] px-2.5 [&>*:not([data-hover])]:relative"
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
              {item === highlighted && (
                <motion.span
                  layoutId={`fx-hover-${side}`}
                  data-hover=""
                  className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[rgb(24_24_27/0.05)] dark:bg-white/6"
                  transition={HOVER}
                />
              )}
              <Flag code={item} large />
              <span className="text-[14.5px] font-[650]">{item}</span>
              <span className="truncate text-[14px] text-(--fx-muted)">{nameOf(item)}</span>
              {item === code && (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  className="size-4"
                  strokeWidth={2.2}
                  aria-label="Current"
                />
              )}
            </Autocomplete.Item>
          )}
        </Autocomplete.List>
        {shown.length > visible.length && (
          <p className="m-0 mt-1.5 text-center text-[12px] text-(--fx-muted)">Type to search all {shown.length} currencies</p>
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
  chars,
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
  chars: number;
  onAmountChange: (amount: string) => void;
  onPick: () => void;
}) {
  const sending = side === "send";

  return (
    <motion.div
      data-well=""
      data-side={side}
      className="@container relative grid gap-1.5 rounded-[20px] bg-(--fx-well) pt-[18px] pr-32 pb-5 pl-5 shadow-[0_1px_2px_rgb(24_24_27/0.04)]"
      style={{ "--fx-chars": chars } as CSSProperties}
      {...PART}
    >
      <motion.label
        layoutId={`fx-label-${side}`}
        className={LABEL}
        htmlFor={sending ? "fx-amount" : undefined}
        {...TRAVEL}
      >
        {LABELS[side]}
      </motion.label>

      {sending ? (
        <input
          id="fx-amount"
          className={AMOUNT}
          data-own-size
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          disabled={busy}
          onChange={(event) => onAmountChange(cleanAmount(event.target.value, code))}
        />
      ) : (
        <span className={AMOUNT} aria-live="polite">
          {gets === null ? (
            <span className="text-(--fx-quiet)">{failed ? "—" : "…"}</span>
          ) : (
            <Digits text={format(gets, code)} />
          )}
        </span>
      )}

      <motion.button
        layoutId={`fx-pill-${side}`}
        type="button"
        data-trigger=""
        className={`${TRIGGER} absolute right-4 bottom-[21px] z-2`}
        disabled={busy || !canPick}
        aria-label={`${code}: ${nameOf(code)}. Change currency`}
        aria-haspopup="dialog"
        whileTap={{ scale: 1.06 }}
        onClick={onPick}
        {...TRAVEL}
      >
        <Flag code={code} />
        {code}
        <HugeiconsIcon icon={ArrowDown01Icon} className={CHEVRON} strokeWidth={2} aria-hidden="true" />
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
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent text-(--fx-ink) underline"
          onClick={onRetry}
        >
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
    <motion.p
      className="mt-4 mb-0.5 flex items-baseline justify-center gap-1 text-[13.5px] font-medium text-(--fx-muted) tabular-nums"
      {...PART}
    >
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
      data-status={status}
      className={`mt-3.5 grid h-[52px] cursor-pointer rounded-full border-0 bg-(--fx-ink) text-[15px] font-semibold text-(--fx-surface) transition-[background-color] duration-250 disabled:cursor-default disabled:opacity-35 data-[status=sent]:bg-[#16a34a] data-[status=sent]:text-white ${FOCUS}`}
      disabled={disabled}
      aria-busy={status === "sending" || undefined}
      whileTap={{ scale: 1.03 }}
      onClick={() => status === "idle" && onSend()}
      {...PART}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={status}
          className="inline-flex items-center justify-center gap-[7px] [grid-area:1/1] [&_svg]:size-[17px]"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={FADE}
        >
          {status === "sending" && (
            <HugeiconsIcon icon={Loading03Icon} className="animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden="true" />
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
    <motion.p
      className="mt-2.5 mb-0.5 text-center text-[11.5px] text-(--fx-quiet) [&_a]:text-inherit"
      {...PART}
    >
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
      ?.querySelector<HTMLElement>(`[data-well][data-side="${returnFocus.current}"] [data-trigger]`)
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

  const chars = Math.max(amount.length, gets === null ? 1 : format(gets, to).length, 1);
  const well = (side: Side) => (
    <Well
      chars={chars}
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
          className={`not-prose relative box-border block w-[min(100%,420px)] overflow-clip rounded-[28px] bg-(--fx-surface) p-3 font-sans text-(--fx-ink) transition-[background-color] duration-300 data-picking:bg-(--fx-well) ${PALETTE}`}
          aria-label="Currency converter"
          data-picking={picking ?? undefined}
          initial={false}
          animate={{ height: height === null ? "auto" : height + CARD_PADDING * 2 }}
        >
          <div ref={content} className="relative">
            <AnimatePresence mode="popLayout" initial={false}>
              {picking ? (
                <motion.div key="list" className="grid">
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
                <motion.div key="converter" className="grid">
                  <div className="relative grid gap-2">
                    {well("send")}
                    {well("get")}

                    <motion.button
                      type="button"
                      className={`absolute top-1/2 left-1/2 z-3 -mt-[22px] -ml-[22px] grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-(--fx-surface) text-(--fx-ink) shadow-[0_0_0_4px_var(--fx-surface),0_0_0_5px_var(--fx-line)] [&_svg]:size-4 ${FOCUS}`}
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
