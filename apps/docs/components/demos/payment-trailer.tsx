"use client";

import { Remold } from "@remold-ui/react";
import { useScene } from "./use-scene";

export const PAYMENT_TRAILER_BEATS = ["phone", "tap", "coins", "bank", "receipt"] as const;
export type PaymentTrailerBeat = (typeof PAYMENT_TRAILER_BEATS)[number];

type Point = readonly [x: number, y: number];
type Look = "ink" | "soft" | "light" | "brand" | "coin" | "good" | "white";

const VIEW_BOX = "0 0 240 160";
const SPRING = { duration: 0.55, bounce: 0.22 };
const POP = { duration: 0.5, bounce: 0.4 };

const dot = ([x, y]: Point) => `M${x - 0.05} ${y}h0.1v0.1h-0.1Z`;
const circle = ([x, y]: Point, radius: number) =>
  `M${x} ${y - radius}a${radius} ${radius} 0 1 1 0 ${radius * 2}a${radius} ${radius} 0 1 1 0 ${-radius * 2}Z`;
const pill = ([x, y]: Point, width = 5, height = 8) => {
  const radius = width / 2;
  return `M${x - radius} ${y - height / 2 + radius}a${radius} ${radius} 0 0 1 ${width} 0v${height - width}a${radius} ${radius} 0 0 1 ${-width} 0Z`;
};
const smile = ([x, y]: Point) => `M${x - 4.6} ${y + 2}a4.6 4.6 0 0 1 9.2 0h-3a1.6 1.6 0 0 0 -3.2 0Z`;

const PHONE = {
  body: "M109 40h22a9 9 0 0 1 9 9v62a9 9 0 0 1 -9 9h-22a9 9 0 0 1 -9 -9V49a9 9 0 0 1 9 -9Z",
  screen: "M107 49h26a2 2 0 0 1 2 2v56a2 2 0 0 1 -2 2h-26a2 2 0 0 1 -2 -2V51a2 2 0 0 1 2 -2Z",
  lines: "M108 86h24v7H108Z M112 97h16v3H112Z",
  eyes: `${pill([114, 70])} ${pill([126, 70])}`,
};

const CARD = {
  body: "M78 58h84a8 8 0 0 1 8 8v36a8 8 0 0 1 -8 8H78a8 8 0 0 1 -8 -8V66a8 8 0 0 1 8 -8Z",
  screen: "M81 68h16a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3H81a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3Z",
  lines: "M80 94h14v3.5H80Z M98 94h14v3.5H98Z M116 94h14v3.5H116Z M134 94h14v3.5h-14Z",
  eyes: `${pill([124, 76], 6, 10)} ${pill([140, 76], 6, 10)}`,
  waves: "M178 70a14 14 0 0 1 0 22l-2.4 -2.2a11 11 0 0 0 0 -17.6Z M186 63a23 23 0 0 1 0 36l-2.4 -2.2a20 20 0 0 0 0 -31.6Z",
};

const BANK = {
  body: "M120 32L170 58v7H70v-7Z M72 104h96v9H72Z",
  screen: circle([120, 50], 5),
  lines: "M80 68h10v34H80Z M100 68h10v34h-10Z M130 68h10v34h-10Z M150 68h10v34h-10Z",
  eyes: `${pill([115.5, 82])} ${pill([124.5, 82])}`,
};

const RECEIPT = {
  body: "M94 24h52a4 4 0 0 1 4 4v78l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5V28a4 4 0 0 1 4 -4Z",
  screen:
    "M95 26.5h50a2.5 2.5 0 0 1 2.5 2.5V104.5L145 107.5L140 102.5L135 107.5L130 102.5L125 107.5L120 102.5L115 107.5L110 102.5L105 107.5L100 102.5L95 107.5L92.5 105V29a2.5 2.5 0 0 1 2.5 -2.5Z",
  lines: "M100 36h22v5H100Z M100 50h40v3H100Z M100 58h32v3H100Z M100 74h14v4H100Z M126 74h14v4H126Z",
  eyes: `${smile([109, 90])} ${smile([123, 90])}`,
};

const CHECK = {
  disc: circle([148, 102], 13),
  mark: "M141.5 102.2l4.3 4.3l8.7 -9l2.2 2.1l-10.9 11.3l-6.5 -6.5Z",
};

const COINS_UP: readonly Point[] = [
  [86, 26],
  [120, 14],
  [154, 26],
];

const COIN_SHOWN: Record<PaymentTrailerBeat, boolean> = {
  phone: false,
  tap: false,
  coins: true,
  bank: false,
  receipt: false,
};

interface Frame {
  body: string;
  screen: string;
  screenLook: Look;
  lines: string;
  linesLook: Look;
  eyes: string;
  eyesLook: Look;
  waves: string;
  coins: readonly string[];
  check: boolean;
}

const tucked = (point: Point) => COINS_UP.map(() => dot(point));

const FRAMES: Record<PaymentTrailerBeat, Frame> = {
  phone: {
    ...PHONE,
    screenLook: "light",
    linesLook: "brand",
    eyesLook: "ink",
    waves: dot([176, 81]),
    coins: tucked([120, 80]),
    check: false,
  },
  tap: {
    ...CARD,
    screenLook: "soft",
    linesLook: "light",
    eyesLook: "light",
    coins: tucked([120, 84]),
    check: false,
  },
  coins: {
    ...BANK,
    screenLook: "light",
    linesLook: "ink",
    eyesLook: "ink",
    waves: dot([176, 81]),
    coins: COINS_UP.map((point) => circle(point, 9)),
    check: false,
  },
  bank: {
    ...BANK,
    screenLook: "light",
    linesLook: "ink",
    eyesLook: "ink",
    waves: dot([176, 81]),
    coins: tucked([120, 100]),
    check: false,
  },
  receipt: {
    ...RECEIPT,
    screenLook: "light",
    linesLook: "ink",
    eyesLook: "ink",
    waves: dot([176, 81]),
    coins: tucked([120, 80]),
    check: true,
  },
};

const MOTION: Record<PaymentTrailerBeat, string> = {
  phone: "animate-card-float",
  tap: "animate-card-tap",
  coins: "",
  bank: "",
  receipt: "animate-story-land",
};

const GLOW: Record<PaymentTrailerBeat, string> = {
  phone: "",
  tap: "[--pt-glow:var(--pt-glow-brand)]",
  coins: "[--pt-glow:var(--pt-glow-coin)]",
  bank: "[--pt-glow:var(--pt-glow-brand)]",
  receipt: "[--pt-glow:var(--pt-glow-good)]",
};

const FILL: Record<Look, string> = {
  ink: "fill-(--pt-ink)",
  soft: "fill-(--pt-soft)",
  light: "fill-(--pt-paper)",
  brand: "fill-(--pt-brand)",
  coin: "fill-(--pt-coin) stroke-(--pt-coin-edge) [stroke-width:2]",
  good: "fill-(--pt-good) stroke-(--pt-paper) [stroke-width:2.5]",
  white: "fill-white",
};

const THEME =
  "[--pt-ink:#27272a] [--pt-soft:#d4d4d8] [--pt-paper:#ffffff] [--pt-muted:#6c6c75] [--pt-brand:#4f46e5] [--pt-coin:#fbbf24] [--pt-coin-edge:#d97706] [--pt-good:#16a34a] [--pt-glow-brand:rgb(79_70_229/0.22)] [--pt-glow-coin:rgb(245_158_11/0.22)] [--pt-glow-good:rgb(22_163_74/0.24)] dark:[--pt-ink:#e4e4e7] dark:[--pt-soft:#52525b] dark:[--pt-paper:#18181b] dark:[--pt-muted:#a1a1aa] dark:[--pt-brand:#818cf8] dark:[--pt-coin:#fcd34d] dark:[--pt-coin-edge:#b45309] dark:[--pt-good:#4ade80] dark:[--pt-glow-brand:rgb(129_140_248/0.3)] dark:[--pt-glow-coin:rgb(252_211_77/0.24)] dark:[--pt-glow-good:rgb(74_222_128/0.3)]";

const copyFor = (name: string, amount: string): Record<PaymentTrailerBeat, { title: string; line: string }> => ({
  phone: { title: `Pay ${name} ${amount}`, line: "Rent for November" },
  tap: { title: "Tap to pay", line: "Hold your card near the reader" },
  coins: { title: `Sending ${amount}`, line: "Straight from your account" },
  bank: { title: `Arriving at ${name}'s bank`, line: "Usually in a few seconds" },
  receipt: { title: `${name} got ${amount}`, line: "Your receipt is in your inbox" },
});

const look = (part: Look, shown = true) =>
  `${FILL[part]} transition-[fill,stroke,opacity] duration-300 ease-out ${shown ? "" : "opacity-0"}`;

export interface PaymentTrailerProps {
  beat: PaymentTrailerBeat;
  name?: string;
  amount?: string;
  live?: boolean;
}

export function PaymentTrailer({ beat, name = "Kofi", amount = "£48.00", live }: PaymentTrailerProps) {
  const frame = FRAMES[beat];
  const copy = copyFor(name, amount)[beat];
  const centre = dot([148, 102]);

  return (
    <section className={`grid w-[min(100%,460px)] justify-items-center gap-3 text-center ${THEME}`} aria-label="Payment">
      <div className="relative aspect-[240/160] w-full" role="img" aria-label={copy.title}>
        <div
          data-on={GLOW[beat] ? true : undefined}
          className={`pointer-events-none absolute inset-x-[8%] top-[8%] bottom-[2%] bg-[radial-gradient(45%_60%_at_50%_82%,var(--pt-glow,transparent),transparent_72%)] opacity-0 transition-[opacity] duration-500 ease-out data-on:opacity-100 ${GLOW[beat]}`}
          aria-hidden="true"
        />
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={VIEW_BOX} aria-hidden="true">
          <ellipse cx="120" cy="128" rx="52" ry="4" className="fill-[rgb(0_0_0/0.07)] dark:fill-[rgb(0_0_0/0.35)]" />
          <g
            className={`motion-reduce:animate-none ${MOTION[beat]}`}
            style={{ transformOrigin: "120px 118px", transformBox: "view-box" }}
          >
            <Remold.PathGroup
              viewBox={VIEW_BOX}
              spring={SPRING}
              className="overflow-visible"
              paths={[
                { id: "body", path: frame.body, className: look("ink") },
                { id: "screen", path: frame.screen, className: look(frame.screenLook) },
                { id: "lines", path: frame.lines, className: look(frame.linesLook) },
                { id: "eyes", path: frame.eyes, className: look(frame.eyesLook) },
                { id: "waves", path: frame.waves, className: look("brand", beat === "tap") },
              ]}
            />
          </g>
          <Remold.PathGroup
            viewBox={VIEW_BOX}
            spring={POP}
            className="overflow-visible"
            paths={[
              ...frame.coins.map((path, index) => ({ id: `coin-${index}`, path, className: look("coin", COIN_SHOWN[beat]) })),
              { id: "check", path: frame.check ? CHECK.disc : centre, className: look("good", frame.check) },
              { id: "mark", path: frame.check ? CHECK.mark : centre, className: look("white", frame.check) },
            ]}
          />
        </svg>
      </div>
      <div className="grid gap-1 text-(--pt-ink)" aria-live={live ? "off" : "polite"}>
        <Remold.Text className="text-[22px] leading-[1.2] font-[650] tracking-[-0.015em]">{copy.title}</Remold.Text>
        <Remold.Text className="text-[14px] text-(--pt-muted)">{copy.line}</Remold.Text>
      </div>
    </section>
  );
}

const BEATS: readonly { beat: PaymentTrailerBeat; ms: number }[] = [
  { beat: "phone", ms: 1800 },
  { beat: "tap", ms: 1800 },
  { beat: "coins", ms: 1300 },
  { beat: "bank", ms: 1500 },
  { beat: "receipt", ms: 2800 },
];

const fromBeat = (step: number) => BEATS[step]!.beat;

export function PaymentTrailerDemo({ playing }: { playing?: boolean; preview?: boolean } = {}) {
  const { ref, state, takeOver, live } = useScene(BEATS, fromBeat, playing, true);

  return (
    <div ref={ref} className="not-prose grid w-full place-items-center gap-4 px-4 py-6">
      <PaymentTrailer beat={state} live={live} />
      <ol className="m-0 grid list-none grid-cols-[repeat(5,32px)] gap-1.5 p-0" aria-label="Scenes">
        {PAYMENT_TRAILER_BEATS.map((beat) => (
          <li key={beat}>
            <button
              type="button"
              aria-label={beat}
              aria-current={beat === state ? "step" : undefined}
              onClick={() => takeOver(beat)}
              className="relative block h-1 w-full cursor-pointer rounded-full border-0 bg-fd-border p-0 transition-[background-color] duration-200 ease-out before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] aria-[current=step]:bg-fd-foreground"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
