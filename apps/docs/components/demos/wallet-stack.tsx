"use client";
import { Switch } from "@base-ui/react/switch";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type Ref } from "react";
import { BRANDS, type BrandId } from "./merchant-logos";
import { useControllableState } from "./use-controllable-state";
import { useMeasuredSize } from "./use-measured-size";
import { useScene } from "./use-scene";

interface Card {
  id: string;
  network: "amex" | "mastercard" | "visa";
  tier: string;
  last4: string;
  look: "black" | "wine" | "gold";
  balance: string;
  due: string;
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

const PANEL = 304;
const GAP = 16;
const WIDE = 340 + GAP + PANEL;

export interface WalletStackValue {
  open: boolean;
  chosen: string | null;
  primary: string | null;
}

const SPRING = { type: "spring" as const, duration: 0.7, bounce: 0.16 };

const nameOf = (card: Card) =>
  `${card.network === "amex" ? "American Express" : card.network === "visa" ? "Visa" : "Mastercard"} ${card.tier}`;

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0a84ff]";
const LEATHER_BOX = "absolute top-[214px] left-0 h-[226px] w-[340px]";
const HIDE = { back: ["#93512a", "#6a3519"], front: ["#a35c31", "#7a3f1e"] } as const;
const LOOK = {
  black:
    "bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.025)_0_1px,transparent_1px_3px),linear-gradient(150deg,#2a2a2e,#0c0c0e_70%)] text-white",
  wine: "bg-[radial-gradient(120%_90%_at_100%_0%,rgb(255_255_255/0.12),transparent_55%),linear-gradient(150deg,#5b1530,#2b0716)] text-white",
  gold: "bg-[radial-gradient(120%_100%_at_20%_0%,rgb(255_250_220/0.55),transparent_55%),linear-gradient(150deg,#e8cf8a,#c9a24e_55%,#a9802f)] text-[#3b2a0c]",
} as const;

function Summary({ card, primary, onPrimaryChange }: { card: Card; primary: boolean; onPrimaryChange: (on: boolean) => void }) {
  return (
    <div className="flex items-end gap-2 px-1 pb-0.5">
      <span className="grid gap-px">
        <span className="text-[11.5px] font-medium text-(--wa-muted)">Balance</span>
        <b className="text-[20px] font-bold tracking-[-0.025em] tabular-nums">{card.balance}</b>
      </span>
      <span className="mb-1 rounded-full bg-[color-mix(in_oklab,var(--wa-ink)_7%,transparent)] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-(--wa-muted)">
        {card.due}
      </span>
      <label className="mb-0.5 ml-auto flex cursor-pointer items-center gap-[7px] text-[12.5px] font-semibold text-(--wa-muted)">
        <span>Default</span>
        <Switch.Root
          className={`relative h-[23px] w-[38px] cursor-pointer rounded-full border-0 bg-[color-mix(in_oklab,var(--wa-muted)_35%,transparent)] p-0 transition-colors duration-250 data-checked:bg-[#34c759] ${FOCUS}`}
          checked={primary}
          onCheckedChange={onPrimaryChange}
          aria-label={`Make ${nameOf(card)} your default card`}
        >
          <Switch.Thumb className="absolute top-0.5 left-0.5 size-[19px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-350 ease-[cubic-bezier(0.3,1.4,0.5,1)] data-checked:translate-x-[15px]" />
        </Switch.Root>
      </label>
    </div>
  );
}

function Transactions({ card, rows, tall }: { card: Card; rows: number; tall?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-(--wa-panel)">
      <p className="m-0 flex items-center justify-between px-3.5 pt-[9px] pb-px">
        <b className="text-[13.5px] font-[650] tracking-[-0.01em]">Latest transactions</b>
        <button
          type="button"
          className={`cursor-pointer border-0 bg-transparent py-0.5 text-[13px] font-medium text-[#0a84ff] ${FOCUS}`}
        >
          See all
        </button>
      </p>
      <ul className="m-0 grid list-none p-0">
        {card.recent.slice(0, rows).map((transaction, row) => {
          const brand = BRANDS[transaction.brand];
          return (
            <motion.li
              key={transaction.brand}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.16 + row * 0.04 }}
              className={`relative flex items-center gap-[11px] pr-3.5 pl-3 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[57px] not-first:before:h-px not-first:before:bg-(--wa-line) not-first:before:content-[''] ${tall ? "h-[46px]" : "h-[43px]"}`}
            >
              <span
                className="grid size-8 flex-none place-items-center rounded-[9px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"
                style={{ background: brand.color }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="size-[18px] fill-white">
                  <path d={brand.path} />
                </svg>
              </span>
              <span className="grid min-w-0 flex-1 leading-[1.25]">
                <b className="truncate text-[14px] font-semibold">{brand.name}</b>
                <span className="truncate text-[12px] text-(--wa-muted)">{transaction.when}</span>
              </span>
              <span
                data-pending={transaction.note?.tone === "pending" || undefined}
                className="group/amount grid flex-none justify-items-end leading-[1.25]"
              >
                <b className="text-[14px] font-semibold tabular-nums group-data-pending/amount:text-(--wa-muted)">
                  {transaction.amount}
                </b>
                {transaction.note && (
                  <span
                    data-tone={transaction.note.tone}
                    className="text-[11.5px] font-medium data-[tone=cash]:text-[#1f9d55] data-[tone=pending]:text-(--wa-muted) dark:data-[tone=cash]:text-[#30d158]"
                  >
                    {transaction.note.text}
                  </span>
                )}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function Mark({ network }: { network: Card["network"] }) {
  if (network === "visa") return <span className="text-[22px] leading-none font-black tracking-[-0.03em] italic">VISA</span>;
  if (network === "mastercard")
    return (
      <span
        className="flex [&>i]:size-[26px] [&>i]:rounded-full [&>i:first-child]:bg-[#eb001b] [&>i+i]:-ml-[11px] [&>i+i]:bg-[#f79e1b] [&>i+i]:mix-blend-hard-light"
        aria-label="Mastercard"
      >
        <i />
        <i />
      </span>
    );
  return (
    <span
      className="grid size-[46px] place-items-center rounded-[4px] bg-[#1f6fc5] text-center text-[8px] leading-[1.1] font-black tracking-[0.02em] text-white"
      aria-label="American Express"
    >
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
    <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 340 226" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={HIDE[tone][0]} />
          <stop offset="1" stopColor={HIDE[tone][1]} />
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
        className="mix-blend-multiply"
      />
      <path
        d={d}
        className="fill-none stroke-[#3e1c0b] [stroke-opacity:0.85] [stroke-width:1.5] group-focus-visible/front:stroke-[#ead2ad] group-focus-visible/front:[stroke-width:2]"
      />
      {stitch.map((line) => (
        <path
          key={line}
          d={line}
          className="fill-none stroke-[#ead2ad] opacity-80 [stroke-dasharray:4_3] [stroke-linecap:round] [stroke-width:1.3]"
        />
      ))}
    </svg>
  );
}

export interface WalletStackProps {
  value?: WalletStackValue;
  defaultValue?: WalletStackValue;
  onValueChange?: (value: WalletStackValue) => void;
  ref?: Ref<HTMLElement>;
}

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
    <section
      ref={ref}
      className="not-prose @container grid w-full grid-cols-[minmax(0,1fr)] justify-items-center font-sans text-(--wa-ink) [--wa-ink:#111111] [--wa-line:rgb(60_60_67/0.12)] [--wa-muted:#8e8e93] [--wa-panel:#ffffff] dark:[--wa-ink:#ffffff] dark:[--wa-line:rgb(84_84_88/0.5)] dark:[--wa-muted:#98989f] dark:[--wa-panel:#1c1c1e]"
      aria-label="Wallet"
    >
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.22" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div
        ref={roomRef}
        data-wide={wide || undefined}
        className="relative flex w-full min-w-0 justify-center @max-[339px]:mb-[calc(480px_*_(100cqi_/_340px)_-_480px)] @max-[339px]:origin-top @max-[339px]:[transform:scale(calc(100cqi/340px))]"
      >
      <motion.div
        className="relative h-[480px] w-[340px] flex-none [clip-path:inset(-80px_-80px_0_-80px)]"
        initial={false}
        animate={{ x: wide && picked ? -(GAP + PANEL) / 2 : 0 }}
        transition={SPRING}
        onPointerEnter={(event) => event.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <motion.div
          className={`${LEATHER_BOX} z-0 drop-shadow-[0_18px_22px_rgb(0_0_0/0.35)]`}
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
              className={`group/card absolute top-0 left-[18px] grid h-48 w-[304px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-hidden rounded-[14px] border-0 px-[18px] pt-4 pb-[15px] text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_-1px_0_rgb(0_0_0/0.2),0_-6px_14px_-8px_rgb(0_0_0/0.5)] after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(118deg,rgb(255_255_255/0.18)_0%,transparent_34%,transparent_70%,rgb(255_255_255/0.07))] after:content-[''] aria-pressed:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_2px_6px_-2px_rgb(0_0_0/0.25)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0a84ff] ${LOOK[card.look]}`}
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
              <span className="relative flex items-start justify-between">
                <span className="text-[12px] font-semibold tracking-[0.04em] opacity-85">
                  {card.tier}
                  <AnimatePresence initial={false}>
                    {wallet.primary === card.id && (
                      <motion.span
                        className="ml-2 inline-block rounded-full bg-white/18 px-[7px] py-0.5 align-[1px] text-[10px] font-bold tracking-[0.04em] backdrop-blur-[6px] group-data-[look=gold]/card:bg-[rgb(59_42_12/0.12)]"
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
              <span className="relative flex items-center gap-2.5">
                <span
                  className="h-7 w-[38px] rounded-md bg-[linear-gradient(90deg,transparent_32%,rgb(0_0_0/0.2)_32%_36%,transparent_36%_64%,rgb(0_0_0/0.2)_64%_68%,transparent_68%),linear-gradient(0deg,transparent_46%,rgb(0_0_0/0.2)_46%_54%,transparent_54%),linear-gradient(135deg,#f7e58c,#c99b2e)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]"
                  aria-hidden="true"
                />
                <svg
                  className="size-5 fill-none stroke-current opacity-70 [stroke-linecap:round] [stroke-width:1.8]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.5 7.5a6 6 0 0 1 0 9M12 5a9.5 9.5 0 0 1 0 14M15.5 2.5a13 13 0 0 1 0 19" />
                </svg>
              </span>
              <span className="relative grid gap-1">
                <span className="font-[ui-monospace,'SF_Mono',Menlo,monospace] text-[14px] tracking-[0.06em]">
                  •••• •••• •••• {card.last4}
                </span>
                <span className="flex justify-between text-[11px] font-semibold tracking-[0.1em] opacity-80">
                  AMA MENSAH <em className="not-italic">12/29</em>
                </span>
              </span>
            </motion.button>
          );
        })}

        <AnimatePresence mode="popLayout">
          {picked && !wide && (
            <motion.div
              key={picked.id}
              className="absolute top-[210px] right-[18px] left-[18px] z-20 grid gap-2"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28, transition: { duration: 0.18 } }}
              transition={{ ...SPRING, delay: 0.1 }}
            >
              <Summary card={picked} primary={wallet.primary === picked.id} onPrimaryChange={makeDefault(picked)} />

              <Transactions card={picked} rows={3} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {picked && !wide && (
            <motion.button
              key="back"
              type="button"
              className="absolute bottom-0 left-1/2 z-40 h-7 -translate-x-1/2 cursor-pointer rounded-full border-0 bg-(--wa-panel) px-[13px] text-[13px] font-semibold text-(--wa-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a84ff]"
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
          className={`group/front ${LEATHER_BOX} z-10 cursor-pointer border-0 bg-transparent p-0 drop-shadow-[0_-4px_8px_rgb(0_0_0/0.28)] focus-visible:outline-none`}
          initial={false}
          animate={{ y: sunk }}
          transition={{ ...SPRING, delay: chosen ? 0.04 : 0 }}
          onClick={togglePocket}
          aria-label={chosen ? "Back to all cards" : open ? "Put the cards away" : "Take the cards out"}
        >
          <Leather id={id} d={FRONT} stitch={[FRONT_STITCH]} tone="front" />
          <span className="absolute right-[26px] bottom-[22px] text-[13px] font-bold tracking-[0.12em] text-[rgb(60_26_8/0.55)] uppercase [text-shadow:0_1px_0_rgb(255_220_180/0.18)]">
            Northwind
          </span>
        </motion.button>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {picked && wide && (
          <motion.aside
            key={picked.id}
            className="absolute top-0 left-[calc(50%+26px)] z-20 grid w-[304px] content-start gap-3"
            aria-label={`${nameOf(picked)} details`}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12, transition: { duration: 0.16 } }}
            transition={{ ...SPRING, delay: 0.08 }}
          >
            <span className="truncate px-1 pt-0.5 text-[13px] font-semibold">
              {nameOf(picked)} <em className="font-medium text-(--wa-muted) not-italic">•••• {picked.last4}</em>
            </span>
            <Summary card={picked} primary={wallet.primary === picked.id} onPrimaryChange={makeDefault(picked)} />

            <Transactions card={picked} rows={6} tall />
          </motion.aside>
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}

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
