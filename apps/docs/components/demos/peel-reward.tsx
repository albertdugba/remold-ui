"use client";

import { Button } from "@base-ui/react/button";
import { Copy01Icon, CouponPercentIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import type { CloudPoint } from "@remold-ui/core";
import { Remold, useAutoplay } from "@remold-ui/react";
import { Remold as Canvas } from "@remold-ui/react/canvas";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref, type RefObject } from "react";
import { Odometer } from "./odometer";
import { useMeasuredSize } from "./use-measured-size";

type Point = readonly [x: number, y: number];

const LIFT = 22;
const OFF_AT = 0.5;

const PALETTE = [
  "[--prw-ink:#0a0a0b] [--prw-muted:#6e6e76] [--prw-quiet:#a1a1aa] [--prw-surface:#ffffff] [--prw-fill:#f2f2f4] [--prw-good:#15803d] [--prw-festive:#b8892b] [--prw-frame:#0a0a0b] [--prw-gold:#c9a24b] [--prw-gold-pale:#f6e3a8]",
  "[--prw-sticker:#0a0a0b] [--prw-sticker-ink:#ffffff] [--prw-sticker-muted:rgb(255_255_255/0.55)]",
  "[--prw-back:#ecebe8] [--prw-back-light:#fbfaf8] [--prw-back-crease:#cfccc6]",
  "dark:[--prw-ink:#fafafa] dark:[--prw-muted:#a1a1aa] dark:[--prw-quiet:#71717a] dark:[--prw-surface:#161618] dark:[--prw-fill:#232327] dark:[--prw-good:#4ade80] dark:[--prw-festive:#d9b25c] dark:[--prw-frame:#8f7231]",
  "dark:[--prw-sticker:#050506]",
  "dark:[--prw-back:#c9c8c5] dark:[--prw-back-light:#e4e3e0] dark:[--prw-back-crease:#9d9b97]",
].join(" ");

const FRAME_MASK =
  "[mask-image:radial-gradient(circle_18px_at_0_0,transparent_98%,#000),radial-gradient(circle_18px_at_100%_0,transparent_98%,#000),radial-gradient(circle_18px_at_0_100%,transparent_98%,#000),radial-gradient(circle_18px_at_100%_100%,transparent_98%,#000),radial-gradient(circle_12px_at_0_calc(100%-79px),transparent_98%,#000),radial-gradient(circle_12px_at_100%_calc(100%-79px),transparent_98%,#000)] [mask-composite:intersect]";

const PANEL_MASK =
  "[mask-image:radial-gradient(circle_20px_at_-2px_-2px,transparent_98%,#000),radial-gradient(circle_20px_at_calc(100%+2px)_-2px,transparent_98%,#000),radial-gradient(circle_20px_at_-2px_calc(100%+2px),transparent_98%,#000),radial-gradient(circle_20px_at_calc(100%+2px)_calc(100%+2px),transparent_98%,#000),radial-gradient(circle_14px_at_-2px_calc(100%-77px),transparent_98%,#000),radial-gradient(circle_14px_at_calc(100%+2px)_calc(100%-77px),transparent_98%,#000)] [mask-composite:intersect]";

const PERFORATION =
  "before:absolute before:-top-[11px] before:-inset-x-2 before:h-1 before:bg-[radial-gradient(circle,var(--prw-frame)_1.6px,transparent_2.2px)] before:bg-size-[10px_4px] before:bg-center before:bg-repeat-x";

const barsOf = (code: string) => [...code].flatMap((letter) => Array.from({ length: 5 }, (_, bit) => ((letter.charCodeAt(0) >> bit) & 1 ? 3 : 1)));

const FOOT_BUTTON =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 text-[15px] font-[650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--prw-ink)";

const FOIL =
  "bg-[linear-gradient(115deg,transparent_44%,rgb(246_227_168/0.3)_47.5%,rgb(255_255_255/0.55)_50%,rgb(150_205_255/0.28)_52.5%,transparent_56%)] mix-blend-screen";
const FOIL_REST = 130;
const GOLD_TEXT = "bg-[linear-gradient(100deg,#b8892b,#f6e3a8_45%,#c9a24b_70%,#f6e3a8)] bg-clip-text text-transparent";

const SPARKS = 200;
const SPARK_FRAME = { x: 0, y: 0, width: 168, height: 100 };
const SPARK_PALETTE = ["transparent", "transparent", "var(--prw-gold)", "var(--prw-gold-pale)"];

function seeded(index: number) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;

  return x - Math.floor(x);
}

function sparkFrame(reach: number, drop: number, lit: boolean): CloudPoint[] {
  return Array.from({ length: SPARKS }, (_, index) => {
    const angle = seeded(index) * Math.PI * 2;
    const distance = (18 + seeded(index + 500) * 62) * reach;

    return {
      x: SPARK_FRAME.width / 2 + Math.cos(angle) * distance * 1.25,
      y: SPARK_FRAME.height / 2 + Math.sin(angle) * distance + drop,
      tone: lit ? 0.67 + seeded(index + 900) * 0.33 : 0,
    };
  });
}

const SPARK_FRAMES = [sparkFrame(0.06, 0, true), sparkFrame(1, 0, true), sparkFrame(1.3, 10, false)];

function Sparks() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timers = [setTimeout(() => setFrame(1), 40), setTimeout(() => setFrame(2), 640), setTimeout(() => setFrame(3), 1700)];

    return () => timers.forEach(clearTimeout);
  }, []);

  if (frame === 3) return null;

  return (
    <Canvas.Particles
      className="pointer-events-none absolute -inset-6 block size-[calc(100%+48px)]"
      shape={{ points: SPARK_FRAMES[frame]! }}
      count={SPARKS}
      palette={SPARK_PALETTE}
      radius={1.8}
      fit={SPARK_FRAME}
      pointer={false}
      pairing="index"
      transition="direct"
      spring={{ duration: 0.8, bounce: 0 }}
      aria-hidden="true"
    />
  );
}

function endOfFriday(now: Date) {
  const end = new Date(now);

  end.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  end.setHours(23, 59, 59, 999);

  return end.getTime();
}

const two = (value: number) => String(value).padStart(2, "0");

function Countdown() {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let until = endOfFriday(new Date());

    const tick = () => {
      if (until <= Date.now()) until = endOfFriday(new Date(Date.now() + 1000));

      setLeft(until - Date.now());
    };

    tick();

    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, []);

  if (left === null) return <span>Black Friday · ends Friday at midnight</span>;

  const seconds = Math.floor(left / 1000);
  const clock = [`${Math.floor(seconds / 86400)}d`, `${two(Math.floor(seconds / 3600) % 24)}h`, `${two(Math.floor(seconds / 60) % 60)}m`, `${two(seconds % 60)}s`].join("\u00a0");

  return (
    <span>
      <span className="sr-only">Black Friday, ends Friday at midnight</span>
      <span className="inline-flex items-baseline gap-1 tabular-nums" aria-hidden="true">
        Black Friday · ends in <Odometer className="font-[600] text-(--prw-ink)" value={clock} />
      </span>
    </span>
  );
}

const SNAP_BACK = { type: "spring" as const, duration: 0.55, bounce: 0.35 };
const FLY_OFF = { type: "spring" as const, duration: 0.7, bounce: 0 };

function clip(polygon: readonly Point[], side: (point: Point) => number): Point[] {
  const kept: Point[] = [];
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length]!;
    const here = side(point);
    const there = side(next);
    if (here >= 0) kept.push(point);
    if (here >= 0 !== there >= 0) {
      const share = here / (here - there);
      kept.push([point[0] + (next[0] - point[0]) * share, point[1] + (next[1] - point[1]) * share]);
    }
  });
  return kept;
}

const polygonOf = (points: readonly Point[]) =>
  points.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(", ")})`;

function peel(width: number, height: number, pullX: number, pullY: number) {
  const rect: Point[] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const length = Math.hypot(pullX, pullY);
  if (length < 0.5 || !width) return { stuck: polygonOf(rect), lifted: polygonOf([]), mirror: "none", angle: 0 };

  const normalX = -pullX / length;
  const normalY = -pullY / length;
  const foldX = width + pullX / 2;
  const foldY = height + pullY / 2;
  const side = ([x, y]: Point) => (x - foldX) * normalX + (y - foldY) * normalY;

  const stuck = clip(rect, (point) => -side(point));
  const lifted = clip(rect, side);
  const offset = 2 * (foldX * normalX + foldY * normalY);
  const mirror = `matrix(${1 - 2 * normalX * normalX}, ${-2 * normalX * normalY}, ${-2 * normalX * normalY}, ${
    1 - 2 * normalY * normalY
  }, ${offset * normalX}, ${offset * normalY})`;
  const angle = (Math.atan2(normalX, -normalY) * 180) / Math.PI;
  return { stuck: polygonOf(stuck), lifted: polygonOf(lifted), mirror, angle };
}

function usePeel(width: number, height: number, pullX: MotionValue<number>, pullY: MotionValue<number>) {
  const shape = useTransform(() => peel(width, height, pullX.get(), pullY.get()));
  return {
    stuck: useTransform(() => shape.get().stuck),
    lifted: useTransform(() => shape.get().lifted),
    mirror: useTransform(() => shape.get().mirror),
    shade: useTransform(
      () => `linear-gradient(${shape.get().angle}deg, var(--prw-back-crease) 0%, var(--prw-back) 34%, var(--prw-back-light) 72%, var(--prw-back) 100%)`,
    ),
  };
}

export interface PeelRewardActions {
  pullTo(x: number, y: number): Promise<void>;
  peelOff(): Promise<void>;
  showCopied(): void;
  reset(): void;
}

export interface PeelRewardProps {
  code?: string;
  /** The discount, which rolls up from zero as the sticker comes away. */
  percent?: number;
  prize?: string;
  /** A photo printed on the sticker. Without one, the sticker is plain. */
  image?: string;
  onReveal?: () => void;
  actionsRef?: RefObject<PeelRewardActions | null>;
  ref?: Ref<HTMLElement>;
}

export function PeelReward({ code = "FRIDAY50", percent = 50, prize = "everything, this weekend", image, onReveal, actionsRef, ref }: PeelRewardProps) {
  const [ticket, size] = useMeasuredSize<HTMLDivElement>();
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const pullX = useMotionValue(-LIFT);
  const pullY = useMotionValue(-LIFT);
  const shape = usePeel(width, height, pullX, pullY);
  const sheenX = useTransform(pullX, (value) => value * 1.4 + FOIL_REST);
  const sheenY = useTransform(pullY, (value) => value * 1.4);
  const [peeled, setPeeled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const drag = useRef<{ x: number; y: number; pullX: number; pullY: number } | null>(null);
  const still = useReducedMotion();
  const latestOnReveal = useRef(onReveal);
  latestOnReveal.current = onReveal;

  const pullTo = useCallback(
    async (x: number, y: number, transition: object = SNAP_BACK) => {
      await Promise.all([animate(pullX, x, transition), animate(pullY, y, transition)]);
    },
    [pullX, pullY],
  );

  const peelOff = useCallback(
    async (announced = false) => {
      if (!width) return;

      setPeeled(true);
      await pullTo(-width * 2.4, -height * 2.4, still ? { duration: 0 } : FLY_OFF);
      setRevealed(true);
      if (announced) announce(`${percent}% off ${prize}. Your code is ${code}`);
      latestOnReveal.current?.();
    },
    [pullTo, width, height, still, percent, prize, code],
  );

  const reset = useCallback(() => {
    setPeeled(false);
    setRevealed(false);
    setCopied(false);
    pullX.set(-LIFT);
    pullY.set(-LIFT);
  }, [pullX, pullY]);

  useImperativeHandle(
    actionsRef,
    () => ({ pullTo: (x, y) => pullTo(x, y, { type: "spring", duration: 0.9, bounce: 0.1 }), peelOff: () => peelOff(), reset, showCopied: () => setCopied(true) }),
    [pullTo, peelOff, reset],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pullX.stop();
    pullY.stop();
    drag.current = { x: event.clientX, y: event.clientY, pullX: pullX.get(), pullY: pullY.get() };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    pullX.set(Math.min(0, Math.max(-width * 2, start.pullX + event.clientX - start.x)));
    pullY.set(Math.min(0, Math.max(-height * 2, start.pullY + event.clientY - start.y)));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    const pulled = Math.hypot(pullX.get(), pullY.get());
    if (pulled > Math.hypot(width, height) * OFF_AT) void peelOff(true);
    else void pullTo(-LIFT, -LIFT);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      announce("Couldn't copy the code");
      return;
    }
    setCopied(true);
    announce("Code copied");
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <section
      ref={ref}
      data-revealed={revealed || undefined}
      data-peeled={peeled || undefined}
      className={`group not-prose grid w-[min(100%,360px)] bg-(--prw-frame) p-0.5 font-sans text-[14px] text-(--prw-ink) ${FRAME_MASK} ${PALETTE}`}
      aria-label="Reward"
    >
      <div className={`grid gap-[18px] bg-(--prw-surface) p-5 ${PANEL_MASK}`}>
        <header className="flex items-center gap-3">
          <span className="grid size-[42px] flex-none place-items-center rounded-[14px] bg-[#0a0a0b] text-(--prw-gold) shadow-[inset_0_0_0_1px_rgb(201_162_75/0.35)] [&_svg]:size-[21px]" aria-hidden="true">
            <HugeiconsIcon icon={CouponPercentIcon} strokeWidth={1.8} />
          </span>
          <span className="grid gap-px leading-[1.3] [&_b]:text-[15px] [&_b]:font-[650] [&_b]:tracking-[-0.01em] [&>span]:text-[12.5px] [&>span]:text-(--prw-muted)">
            <b>Remold Rewards</b>
            <Countdown />
          </span>
        </header>

        <div ref={ticket} className="relative h-[172px]">
          <div
            className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 rounded-[20px] bg-(--prw-fill) bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--prw-festive)_10%,transparent)_0_9px,transparent_9px_18px)] text-center"
            aria-hidden={!revealed}
          >
            <span className="flex items-baseline gap-1.5 text-[36px] font-[750] tracking-[-0.03em]">
              <Odometer value={`${String(peeled ? percent : 0).padStart(String(percent).length, "0")}%`} />
              <span className="text-[15px] font-[650] tracking-normal">off</span>
            </span>
            <span className="text-[12.5px] text-(--prw-muted)">{prize}</span>
            <span className="scale-[0.94] font-mono text-[21px] font-bold tracking-[0.08em] blur-[2px] [transition:scale_0.5s_cubic-bezier(0.3,1.4,0.5,1)_0.1s,filter_0.5s_ease_0.1s] group-data-peeled:scale-100 group-data-peeled:blur-none motion-reduce:transition-none">
              {code}
            </span>
            <span className="flex h-[18px] items-stretch gap-px opacity-80" aria-hidden="true">
              {barsOf(code).map((width, index) => (
                <span key={index} className="bg-(--prw-ink)" style={{ width }} />
              ))}
            </span>
            <span className="text-[12px] text-(--prw-muted)">One use · ends Friday at midnight</span>
          </div>

          {!revealed && (
            <>
              <motion.div
                className="absolute inset-0 grid cursor-grab touch-none place-items-center overflow-hidden rounded-[20px] bg-(--prw-sticker) bg-[radial-gradient(120%_90%_at_20%_0%,rgb(255_255_255/0.1),transparent_60%)] text-(--prw-sticker-ink) shadow-[inset_0_0_0_1px_rgb(201_162_75/0.4)] select-none active:cursor-grabbing data-photo:text-white"
                data-photo={image ? "" : undefined}
                style={{ clipPath: shape.stuck }}
                role="img"
                aria-label="A sticker covering your code. Drag to peel it off, or use the button below."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {image && (
                  <>
                    <img
                      src={image}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute inset-0 size-full object-cover motion-safe:animate-drift"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.15),rgb(0_0_0/0.55))]" />
                  </>
                )}
                <motion.span className={`pointer-events-none absolute -inset-[60%] ${FOIL}`} style={{ x: sheenX, y: sheenY }} aria-hidden="true" />
                <span className={`pointer-events-none relative grid gap-1 text-center ${image ? "[text-shadow:0_1px_12px_rgb(0_0_0/0.35)]" : ""}`}>
                  <b className={`text-[27px] leading-none font-[800] tracking-[0.04em] uppercase ${image ? "" : GOLD_TEXT}`}>Black Friday</b>
                  <span className={`text-[12.5px] ${image ? "text-white/75" : "text-(--prw-sticker-muted)"}`}>Peel from the corner for your deal</span>
                </span>
              </motion.div>
              <span className="pointer-events-none absolute inset-0 drop-shadow-[-2px_-3px_5px_rgb(0_0_0/0.28)]" aria-hidden="true">
                <motion.span
                  className="absolute inset-0 origin-top-left rounded-[20px]"
                  style={{ clipPath: shape.lifted, transform: shape.mirror, background: shape.shade }}
                />
              </span>
            </>
          )}

          {peeled && !still && <Sparks />}
        </div>

        <footer className={`relative grid min-h-12 ${PERFORATION}`}>
          {revealed ? (
            <Button
              data-copied={copied || undefined}
              className={`${FOOT_BUTTON} animate-rise-in bg-(--prw-ink) text-(--prw-surface) transition-colors duration-300 data-copied:bg-(--prw-good) data-copied:text-white motion-reduce:animate-none [&_svg]:size-[17px]`}
              onClick={copy}
            >
              <Remold.Icon icon={<HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />} strokeWidth={2} aria-hidden="true" />
              <Remold.Text>{copied ? "Copied" : "Copy code"}</Remold.Text>
            </Button>
          ) : (
            <Button
              className={`${FOOT_BUTTON} bg-(--prw-fill) text-(--prw-ink) transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--prw-ink)_7%,var(--prw-fill))]`}
              onClick={() => void peelOff(true)}
            >
              Peel it for me
            </Button>
          )}
        </footer>
      </div>
    </section>
  );
}

const STEPS = [
  { ms: 1300, action: "wait" },
  { ms: 1300, action: "tease" },
  { ms: 1000, action: "settle" },
  { ms: 1500, action: "peel" },
  { ms: 1300, action: "copy" },
  { ms: 2400, action: "hold" },
  { ms: 500, action: "reset" },
] as const;

export function PeelRewardDemo({ playing }: { playing?: boolean } = {}) {
  const actions = useRef<PeelRewardActions | null>(null);
  const autoplay = useAutoplay(STEPS.length, {
    every: (step) => STEPS[step]!.ms,
    autoStart: playing ?? true,
    stopOnInteraction: playing === undefined,
  });
  const { step, active, setPlaying } = autoplay;

  useEffect(() => {
    if (playing !== undefined) setPlaying(playing);
  }, [playing, setPlaying]);

  useEffect(() => {
    if (!active) return;
    const action = STEPS[step]!.action;
    if (action === "tease") void actions.current?.pullTo(-110, -70);
    if (action === "settle") void actions.current?.pullTo(-60, -40);
    if (action === "peel") void actions.current?.peelOff();
    if (action === "copy") actions.current?.showCopied();
    if (action === "reset") actions.current?.reset();
  }, [step, active]);

  return <PeelReward ref={autoplay.ref} actionsRef={actions} />;
}
