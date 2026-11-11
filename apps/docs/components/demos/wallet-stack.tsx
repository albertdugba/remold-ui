"use client";
import { Switch } from "@base-ui/react/switch";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type Ref } from "react";
import { BRANDS, type BrandId } from "./merchant-logos";
import { useControllableState } from "./use-controllable-state";
import { useMeasuredSize } from "./use-measured-size";
import { useScene } from "./use-scene";
import "./wallet-stack.css";

interface Card {
  id: string;
  network: "amex" | "mastercard" | "visa";
  tier: string;
  last4: string;
  look: string;
  balance: string;
  due: string;
  /** `note` sits under the amount: a pending charge, or cash back earned. */
  recent: { brand: BrandId; when: string; amount: string; note?: { text: string; tone: "pending" | "cash" } }[];
}

const CARDS: Card[] = [
  {
    id: "amex",
    network: "amex",
    tier: "Gold Card",
    last4: "1009",
    look: "gold",
    balance: "$1,942.15",
    due: "Due Nov 28",
    recent: [
      { brand: "emirates", when: "Today · DXB → ACC", amount: "$684.00", note: { text: "Pending", tone: "pending" } },
      { brand: "starbucks", when: "Mon · Contactless", amount: "$6.75", note: { text: "+$0.27 back", tone: "cash" } },
      { brand: "ikea", when: "Oct 19 · In store", amount: "$238.40" },
      { brand: "uber", when: "Oct 18 · Trip", amount: "$23.10" },
      { brand: "apple", when: "Oct 15 · iCloud+", amount: "$2.99" },
      { brand: "airbnb", when: "Oct 12 · Cape Coast stay", amount: "$356.00", note: { text: "+$10.68 back", tone: "cash" } },
    ],
  },
  {
    id: "mastercard",
    network: "mastercard",
    tier: "World Elite",
    last4: "5100",
    look: "wine",
    balance: "$486.30",
    due: "Due Dec 3",
    recent: [
      { brand: "spotify", when: "Today · Subscription", amount: "$10.99" },
      { brand: "amazon", when: "Yesterday · Online", amount: "$64.20", note: { text: "+$1.28 back", tone: "cash" } },
      { brand: "airbnb", when: "Oct 22 · Lisbon stay", amount: "$412.00" },
      { brand: "starbucks", when: "Oct 21 · Mobile order", amount: "$8.45" },
      { brand: "netflix", when: "Oct 20 · Subscription", amount: "$15.49" },
      { brand: "ikea", when: "Oct 16 · Online", amount: "$96.00", note: { text: "Refunded", tone: "pending" } },
    ],
  },
  {
    id: "visa",
    network: "visa",
    tier: "Infinite",
    last4: "4242",
    look: "black",
    balance: "$2,184.60",
    due: "Due Nov 21",
    recent: [
      { brand: "apple", when: "Today · Contactless", amount: "$129.00", note: { text: "+$3.87 back", tone: "cash" } },
      { brand: "uber", when: "Yesterday · Trip", amount: "$18.40", note: { text: "Pending", tone: "pending" } },
      { brand: "netflix", when: "Oct 24 · Subscription", amount: "$15.49" },
      { brand: "amazon", when: "Oct 23 · Online", amount: "$47.80" },
      { brand: "emirates", when: "Oct 20 · Seat upgrade", amount: "$220.00", note: { text: "+$6.60 back", tone: "cash" } },
      { brand: "spotify", when: "Oct 17 · Subscription", amount: "$10.99" },
    ],
  },
];

const HOLDER_TOP = 214;
const CLOSED = [HOLDER_TOP + 10, HOLDER_TOP + 24, HOLDER_TOP + 38];
const OPEN = [0, 64, 128];
const PEEK = [16, 11, 6];

const SUNK = 300;

/** Room for the holder and a side panel next to it: past this width the details open beside the card. */
const PANEL = 304;
const GAP = 16;
const WIDE = 340 + GAP + PANEL;

export interface WalletStackValue {
  open: boolean;
  /** The card lifted out to show its transactions, if any. */
  chosen: string | null;
  /** The default card, or `null` when none is set. */
  primary: string | null;
}

const SPRING = { type: "spring" as const, duration: 0.7, bounce: 0.16 };

const nameOf = (card: Card) =>
  `${card.network === "amex" ? "American Express" : card.network === "visa" ? "Visa" : "Mastercard"} ${card.tier}`;

function Transactions({ card, rows }: { card: Card; rows: number }) {
  return (
    <div className="wa-txns">
      <p className="wa-details-title">
        <b>Latest transactions</b>
        <button type="button" className="wa-see-all">
          See all
        </button>
      </p>
      <ul>
        {card.recent.slice(0, rows).map((transaction, row) => {
          const brand = BRANDS[transaction.brand];
          return (
            <motion.li
              key={transaction.brand}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.16 + row * 0.04 }}
            >
              <span className="wa-txn-logo" style={{ background: brand.color }} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d={brand.path} />
                </svg>
              </span>
              <span className="wa-txn-copy">
                <b>{brand.name}</b>
                <span>{transaction.when}</span>
              </span>
              <span className="wa-txn-amount" data-pending={transaction.note?.tone === "pending" || undefined}>
                <b>{transaction.amount}</b>
                {transaction.note && <span data-tone={transaction.note.tone}>{transaction.note.text}</span>}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function Mark({ network }: { network: Card["network"] }) {
  if (network === "visa") return <span className="wa-visa">VISA</span>;
  if (network === "mastercard")
    return (
      <span className="wa-mc" aria-label="Mastercard">
        <i />
        <i />
      </span>
    );
  return (
    <span className="wa-amex" aria-label="American Express">
      AMERICAN
      <br />
      EXPRESS
    </span>
  );
}

const FRONT =
  "M0 72Q0 52 20 52H114C128 52 132 96 170 96C208 96 212 52 226 52H320Q340 52 340 72V206Q340 226 320 226H20Q0 226 0 206Z";
const FRONT_STITCH =
  "M7 73Q7 59 21 59H112C122 59 127 103 170 103C213 103 218 59 228 59H319Q333 59 333 73V205Q333 219 319 219H21Q7 219 7 205Z";
const BACK = "M0 22Q0 0 22 0H318Q340 0 340 22V204Q340 226 318 226H22Q0 226 0 204Z";
const BACK_STITCH = "M7 23Q7 7 23 7H317Q333 7 333 23V60";
const BACK_STITCH_L = "M7 60V23";

function Leather({
  id,
  d,
  stitch,
  tone,
}: {
  id: string;
  d: string;
  stitch: string[];
  tone: "back" | "front";
}) {
  return (
    <svg className="wa-leather" data-tone={tone} viewBox="0 0 340 226" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="wa-hide-top" />
          <stop offset="1" className="wa-hide-bottom" />
        </linearGradient>
        <clipPath id={`${id}-${tone}-clip`}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={`url(#${id}-${tone})`} />
      <rect
        width="340"
        height="226"
        filter={`url(#${id}-grain)`}
        clipPath={`url(#${id}-${tone}-clip)`}
        className="wa-grain"
      />
      <path d={d} className="wa-edge" />
      {stitch.map((line) => (
        <path key={line} d={line} className="wa-stitch" />
      ))}
    </svg>
  );
}

export interface WalletStackProps {
  /** Whether it's open, the card picked out, and the default card. */
  value?: WalletStackValue;
  defaultValue?: WalletStackValue;
  onValueChange?: (value: WalletStackValue) => void;
  ref?: Ref<HTMLElement>;
}

/** A wallet of cards: open it to fan them out, pick one to see its transactions and make it the default. */
export function WalletStack({
  value,
  defaultValue = { open: false, chosen: null, primary: "amex" },
  onValueChange,
  ref,
}: WalletStackProps) {
  const [wallet, setWallet] = useControllableState({ value, defaultValue, onValueChange });
  const { open, chosen } = wallet;
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState(false);
  const [roomRef, room] = useMeasuredSize<HTMLDivElement>();
  const wide = (room?.width ?? 0) >= WIDE;
  const peeking = hover && !open;

  const togglePocket = () =>
    setWallet((current) => ({ ...current, open: current.chosen ? true : !current.open, chosen: null }));
  const pick = (card: Card) =>
    setWallet((current) =>
      !current.open
        ? { ...current, open: true }
        : { ...current, chosen: current.chosen === card.id ? null : card.id },
    );

  // Narrow, the holder sinks out of the way to make room for the details under the card.
  // Wide, the details sit beside it, so the holder stays and the other cards go back in.
  const sunk = chosen && !wide ? SUNK : 0;
  const yOf = (card: Card, index: number) => {
    if (chosen === card.id) return 0;
    if (chosen) return CLOSED[index]! + sunk;
    if (!open) return CLOSED[index]! - (peeking ? PEEK[index]! : 0);
    return OPEN[index]!;
  };
  const picked = CARDS.find((card) => card.id === chosen);
  const makeDefault = (card: Card) => (on: boolean) =>
    setWallet((current) => ({ ...current, primary: on ? card.id : null }));

  return (
    <section ref={ref} className="wa not-prose" aria-label="Wallet">
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.22" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div ref={roomRef} className="wa-room" data-wide={wide || undefined}>
      <motion.div
        className="wa-scene"
        initial={false}
        animate={{ x: wide && picked ? -(GAP + PANEL) / 2 : 0 }}
        transition={SPRING}
        onPointerEnter={(event) => event.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <motion.div
          className="wa-back"
          initial={false}
          animate={{ y: sunk }}
          transition={{ ...SPRING, delay: chosen ? 0.04 : 0 }}
        >
          <Leather id={id} d={BACK} stitch={[BACK_STITCH, BACK_STITCH_L]} tone="back" />
        </motion.div>

        {CARDS.map((card, index) => {
          const isChosen = chosen === card.id;
          const name = nameOf(card);
          return (
            <motion.button
              key={card.id}
              type="button"
              className="wa-card"
              data-look={card.look}
              style={{ zIndex: isChosen ? 30 : index + 1 }}
              initial={false}
              animate={{ y: yOf(card, index) }}
              whileHover={open && !chosen ? { y: OPEN[index]! - 6 } : undefined}
              transition={{
                ...SPRING,
                delay: isChosen
                  ? 0
                  : chosen
                    ? 0.04
                    : open || peeking
                      ? index * 0.05
                      : (CARDS.length - 1 - index) * 0.045,
              }}
              aria-label={
                isChosen
                  ? `${name}, ending ${card.last4}. Back to all cards`
                  : `${name}, ending ${card.last4}`
              }
              aria-pressed={open ? isChosen : undefined}
              onClick={() => pick(card)}
            >
              <span className="wa-card-top">
                <span className="wa-tier">
                  {card.tier}
                  <AnimatePresence initial={false}>
                    {wallet.primary === card.id && (
                      <motion.span
                        className="wa-badge"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                      >
                        Default
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <Mark network={card.network} />
              </span>
              <span className="wa-chip-row">
                <span className="wa-chip" aria-hidden="true" />
                <svg className="wa-tap" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.5 7.5a6 6 0 0 1 0 9M12 5a9.5 9.5 0 0 1 0 14M15.5 2.5a13 13 0 0 1 0 19" />
                </svg>
              </span>
              <span className="wa-card-bottom">
                <span className="wa-number">•••• •••• •••• {card.last4}</span>
                <span className="wa-holder">
                  AMA MENSAH <em>12/29</em>
                </span>
              </span>
            </motion.button>
          );
        })}

        <AnimatePresence mode="popLayout">
          {picked && !wide && (
            <motion.div
              key={picked.id}
              className="wa-details"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28, transition: { duration: 0.18 } }}
              transition={{ ...SPRING, delay: 0.1 }}
            >
              {/* What's owed on the card, and whether it's the one used by default */}
              <div className="wa-summary">
                <span className="wa-balance">
                  <span>Balance</span>
                  <b>{picked.balance}</b>
                </span>
                <span className="wa-due">{picked.due}</span>
                <label className="wa-primary">
                  <span>Default</span>
                  <Switch.Root
                    className="wa-switch"
                    checked={wallet.primary === picked.id}
                    onCheckedChange={makeDefault(picked)}
                    aria-label={`Make ${nameOf(picked)} your default card`}
                  >
                    <Switch.Thumb className="wa-thumb" />
                  </Switch.Root>
                </label>
              </div>

              <Transactions card={picked} rows={3} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {picked && !wide && (
            <motion.button
              key="back"
              type="button"
              className="wa-all"
              onClick={togglePocket}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: 0.25 } }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            >
              All cards
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          className="wa-front"
          initial={false}
          animate={{ y: sunk }}
          transition={{ ...SPRING, delay: chosen ? 0.04 : 0 }}
          onClick={togglePocket}
          aria-label={chosen ? "Back to all cards" : open ? "Put the cards away" : "Take the cards out"}
        >
          <Leather id={id} d={FRONT} stitch={[FRONT_STITCH]} tone="front" />
          <span className="wa-emboss">Northwind</span>
        </motion.button>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {picked && wide && (
          <motion.aside
            key={picked.id}
            className="wa-panel"
            aria-label={`${nameOf(picked)} details`}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12, transition: { duration: 0.16 } }}
            transition={{ ...SPRING, delay: 0.08 }}
          >
            <span className="wa-panel-name">
              {nameOf(picked)} <em>•••• {picked.last4}</em>
            </span>
            <div className="wa-summary">
              <span className="wa-balance">
                <span>Balance</span>
                <b>{picked.balance}</b>
              </span>
              <span className="wa-due">{picked.due}</span>
              <label className="wa-primary">
                <span>Default</span>
                <Switch.Root
                  className="wa-switch"
                  checked={wallet.primary === picked.id}
                  onCheckedChange={makeDefault(picked)}
                  aria-label={`Make ${nameOf(picked)} your default card`}
                >
                  <Switch.Thumb className="wa-thumb" />
                </Switch.Root>
              </label>
            </div>

            <Transactions card={picked} rows={6} />
          </motion.aside>
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (WalletStackValue & { ms: number })[] = [
  { open: false, chosen: null, primary: "amex", ms: 1700 },
  { open: true, chosen: null, primary: "amex", ms: 1500 },
  { open: true, chosen: "visa", primary: "amex", ms: 2300 },
  { open: true, chosen: "visa", primary: "visa", ms: 1600 },
  { open: true, chosen: null, primary: "visa", ms: 1300 },
];

const fromBeat = (step: number): WalletStackValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface WalletStackDemoProps {
  playing?: boolean;
}

export function WalletStackDemo({ playing }: WalletStackDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <WalletStack ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
