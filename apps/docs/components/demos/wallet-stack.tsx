"use client";
/**
 * A leather card holder with three cards in it. Their tops show over the front pocket, and the
 * thumb notch shows a little more of the front one. Tap it and the cards slide up out of the
 * pocket, fanned so you can read each, still tucked in at the bottom; tap again and they slip back
 * in. Choose a card and it rises to the top while the holder sinks out of the way, as Apple Wallet
 * does, and its latest transactions fill the space between, with a switch to make it your default
 * card. The Default badge moves to it.
 *
 * Built with Motion: every card and the holder are placed by springs, a beat apart, so each change
 * is one movement, and the transactions arrive row by row. The switch is Base UI. The leather is
 * drawn in SVG: a pebbled grain from a noise filter, a burnished edge and close stitching. It plays a short scene while it's on screen. Touch it and it's yours.
 */
import { Switch } from "@base-ui/react/switch";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { BRANDS, type BrandId } from "./merchant-logos";
import { useScene } from "./use-scene";
import "./wallet-stack.css";

interface Card {
  id: string;
  network: "amex" | "mastercard" | "visa";
  tier: string;
  last4: string;
  look: string;
  /** Recent spending, newest first. */
  recent: { brand: BrandId; when: string; amount: string }[];
}

/** Back to front. */
const CARDS: Card[] = [
  {
    id: "amex",
    network: "amex",
    tier: "Gold Card",
    last4: "1009",
    look: "gold",
    recent: [
      { brand: "emirates", when: "Today · DXB → ACC", amount: "$684.00" },
      { brand: "starbucks", when: "Mon · Contactless", amount: "$6.75" },
      { brand: "ikea", when: "Oct 19 · In store", amount: "$238.40" },
    ],
  },
  {
    id: "mastercard",
    network: "mastercard",
    tier: "World Elite",
    last4: "5100",
    look: "wine",
    recent: [
      { brand: "spotify", when: "Today · Subscription", amount: "$10.99" },
      { brand: "amazon", when: "Yesterday · Online", amount: "$64.20" },
      { brand: "airbnb", when: "Oct 22 · Lisbon stay", amount: "$412.00" },
    ],
  },
  {
    id: "visa",
    network: "visa",
    tier: "Infinite",
    last4: "4242",
    look: "black",
    recent: [
      { brand: "apple", when: "Today · Contactless", amount: "$129.00" },
      { brand: "uber", when: "Yesterday · Trip", amount: "$18.40" },
      { brand: "netflix", when: "Oct 24 · Subscription", amount: "$15.49" },
    ],
  },
];

/** The holder sits at the bottom; cards rest in it closed and slide up out of it open. */
const HOLDER_TOP = 214;
const CLOSED = [HOLDER_TOP + 10, HOLDER_TOP + 24, HOLDER_TOP + 38];
const OPEN = [0, 64, 128];
/** Hovering the closed holder nudges each card up a little, the back one most, so they fan. */
const PEEK = [16, 11, 6];

/** With a card chosen, the holder sinks right out of the frame: the card and its transactions get the stage. */
const SUNK = 300;

interface State {
  open: boolean;
  /** The card lifted out to show its transactions, if any. */
  chosen: string | null;
  /** The default card. */
  primary: string;
}

const BEATS: readonly (State & { ms: number })[] = [
  { open: false, chosen: null, primary: "amex", ms: 1700 },
  { open: true, chosen: null, primary: "amex", ms: 1500 },
  { open: true, chosen: "visa", primary: "amex", ms: 2300 },
  { open: true, chosen: "visa", primary: "visa", ms: 1600 },
  { open: true, chosen: null, primary: "visa", ms: 1300 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.7, bounce: 0.16 };

/** The card networks' marks, drawn simply. */
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

/** The front pocket: a rounded panel with a thumb notch dipping in at the top. */
const FRONT = "M0 72Q0 52 20 52H114C128 52 132 96 170 96C208 96 212 52 226 52H320Q340 52 340 72V206Q340 226 320 226H20Q0 226 0 206Z";
const FRONT_STITCH = "M7 73Q7 59 21 59H112C122 59 127 103 170 103C213 103 218 59 228 59H319Q333 59 333 73V205Q333 219 319 219H21Q7 219 7 205Z";
const BACK = "M0 22Q0 0 22 0H318Q340 0 340 22V204Q340 226 318 226H22Q0 226 0 204Z";
const BACK_STITCH = "M7 23Q7 7 23 7H317Q333 7 333 23V60";
const BACK_STITCH_L = "M7 60V23";

/** One piece of leather: its fill, the grain over it, its burnished edge and its stitching. */
function Leather({ id, d, stitch, tone }: { id: string; d: string; stitch: string[]; tone: "back" | "front" }) {
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
      {/* Pebbled grain: fine noise, clipped to the hide */}
      <rect width="340" height="226" filter={`url(#${id}-grain)`} clipPath={`url(#${id}-${tone}-clip)`} className="wa-grain" />
      <path d={d} className="wa-edge" />
      {stitch.map((s) => (
        <path key={s} d={s} className="wa-stitch" />
      ))}
    </svg>
  );
}

interface WalletStackDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function WalletStackDemo({ playing }: WalletStackDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const { open, chosen } = state;
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState(false);
  const peeking = hover && !open;

  // The pocket takes the cards out or puts them all away; a card opens the wallet, or is chosen.
  const togglePocket = () => take((s) => ({ ...s, open: s.chosen ? true : !s.open, chosen: null }));
  const pick = (card: Card) =>
    take((s) => (!s.open ? { ...s, open: true } : { ...s, chosen: s.chosen === card.id ? null : card.id }));

  const sunk = chosen ? SUNK : 0;
  const yOf = (card: Card, i: number) => {
    if (chosen === card.id) return 0;
    if (chosen) return CLOSED[i]! + sunk;
    if (!open) return CLOSED[i]! - (peeking ? PEEK[i]! : 0);
    return OPEN[i]!;
  };
  const picked = CARDS.find((c) => c.id === chosen);
  const nameOf = (card: Card) =>
    `${card.network === "amex" ? "American Express" : card.network === "visa" ? "Visa" : "Mastercard"} ${card.tier}`;

  return (
    <section ref={scene.ref} className="wa not-prose" aria-label="Wallet">
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.22" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="wa-scene" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
        <motion.div className="wa-back" initial={false} animate={{ y: sunk }} transition={{ ...SPRING, delay: chosen ? 0.04 : 0 }}>
          <Leather id={id} d={BACK} stitch={[BACK_STITCH, BACK_STITCH_L]} tone="back" />
        </motion.div>

        {CARDS.map((card, i) => {
          const isChosen = chosen === card.id;
          const name = nameOf(card);
          return (
            <motion.button
              key={card.id}
              type="button"
              className="wa-card"
              data-look={card.look}
              // The chosen card rides above everything; the rest keep their order.
              style={{ zIndex: isChosen ? 30 : i + 1 }}
              initial={false}
              animate={{ y: yOf(card, i) }}
              whileHover={open && !chosen ? { y: OPEN[i]! - 6 } : undefined}
              // Out and peeking back to front, in front to back: a beat apart either way.
              transition={{ ...SPRING, delay: isChosen ? 0 : chosen ? 0.04 : open || peeking ? i * 0.05 : (CARDS.length - 1 - i) * 0.045 }}
              aria-label={isChosen ? `${name}, ending ${card.last4}. Back to all cards` : `${name}, ending ${card.last4}`}
              aria-pressed={open ? isChosen : undefined}
              onClick={() => pick(card)}
            >
              <span className="wa-card-top">
                <span className="wa-tier">
                  {card.tier}
                  <AnimatePresence initial={false}>
                    {state.primary === card.id && (
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

        {/* The chosen card's latest transactions, in the space the holder left */}
        <AnimatePresence mode="popLayout">
          {picked && (
            <motion.div
              key={picked.id}
              className="wa-details"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28, transition: { duration: 0.18 } }}
              transition={{ ...SPRING, delay: 0.1 }}
            >
              <p className="wa-details-title">
                <b>Latest Transactions</b>
                <span>See all</span>
              </p>
              <ul className="wa-txns">
                {picked.recent.map((t, r) => {
                  const brand = BRANDS[t.brand];
                  return (
                    <motion.li
                      key={t.brand}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: 0.16 + r * 0.05 }}
                    >
                      {/* The merchant's own mark, white on its own colour */}
                      <span className="wa-txn-logo" style={{ background: brand.color }} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d={brand.path} />
                        </svg>
                      </span>
                      <span className="wa-txn-copy">
                        <b>{brand.name}</b>
                        <span>{t.when}</span>
                      </span>
                      <span className="wa-txn-amount">−{t.amount}</span>
                    </motion.li>
                  );
                })}
              </ul>
              <label className="wa-primary">
                <span>Default card</span>
                <Switch.Root
                  className="wa-switch"
                  checked={state.primary === picked.id}
                  onCheckedChange={(on) => on && take((s) => ({ ...s, primary: picked.id }))}
                  aria-label={`Make ${nameOf(picked)} your default card`}
                >
                  <Switch.Thumb className="wa-thumb" />
                </Switch.Root>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The way back to the holder, while it's out of sight */}
        <AnimatePresence>
          {picked && (
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

        {/* The front pocket, in front of every card */}
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
      </div>
    </section>
  );
}
