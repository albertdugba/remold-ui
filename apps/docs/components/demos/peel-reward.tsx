"use client";

import { Button } from "@base-ui/react/button";
import { Coffee02Icon, Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold, useAutoplay } from "@remold-ui/react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref, type RefObject } from "react";
import { useMeasuredSize } from "./use-measured-size";

type Point = readonly [x: number, y: number];

const LIFT = 22;
const OFF_AT = 0.5;

const PALETTE = [
  "[--prw-ink:#0a0a0b] [--prw-muted:#6e6e76] [--prw-quiet:#a1a1aa] [--prw-surface:#ffffff] [--prw-fill:#f2f2f4] [--prw-good:#16a34a]",
  "[--prw-sticker:#0a0a0b] [--prw-sticker-ink:#ffffff] [--prw-sticker-muted:rgb(255_255_255/0.55)]",
  "[--prw-back:#ecebe8] [--prw-back-light:#fbfaf8] [--prw-back-crease:#cfccc6]",
  "dark:[--prw-ink:#fafafa] dark:[--prw-muted:#a1a1aa] dark:[--prw-quiet:#71717a] dark:[--prw-surface:#161618] dark:[--prw-fill:#232327] dark:[--prw-good:#4ade80]",
  "dark:[--prw-sticker:#f4f4f5] dark:[--prw-sticker-ink:#0a0a0b] dark:[--prw-sticker-muted:rgb(10_10_11/0.5)]",
  "dark:[--prw-back:#c9c8c5] dark:[--prw-back-light:#e4e3e0] dark:[--prw-back-crease:#9d9b97]",
].join(" ");

const FOOT_BUTTON =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 text-[15px] font-[650] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--prw-ink)";

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
      () =>
        `linear-gradient(${shape.get().angle}deg, var(--prw-back-crease) 0%, var(--prw-back) 34%, var(--prw-back-light) 72%, var(--prw-back) 100%)`,
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
  prize?: string;
  onReveal?: () => void;
  actionsRef?: RefObject<PeelRewardActions | null>;
  ref?: Ref<HTMLElement>;
}

export function PeelReward({ code = "SPRING-25", prize = "A free drink of your choice", onReveal, actionsRef, ref }: PeelRewardProps) {
  const [ticket, size] = useMeasuredSize<HTMLDivElement>();
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const pullX = useMotionValue(-LIFT);
  const pullY = useMotionValue(-LIFT);
  const shape = usePeel(width, height, pullX, pullY);
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

  const peelOff = useCallback(async () => {
    if (!width) return;
    await pullTo(-width * 2.4, -height * 2.4, still ? { duration: 0 } : FLY_OFF);
    setRevealed(true);
    latestOnReveal.current?.();
  }, [pullTo, width, height, still]);

  const reset = useCallback(() => {
    setRevealed(false);
    setCopied(false);
    pullX.set(-LIFT);
    pullY.set(-LIFT);
  }, [pullX, pullY]);

  useImperativeHandle(
    actionsRef,
    () => ({ pullTo: (x, y) => pullTo(x, y, { type: "spring", duration: 0.9, bounce: 0.1 }), peelOff, reset, showCopied: () => setCopied(true) }),
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
    if (pulled > Math.hypot(width, height) * OFF_AT) void peelOff();
    else void pullTo(-LIFT, -LIFT);
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopied(true);
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
      className={`group not-prose grid w-[min(100%,360px)] gap-[18px] overflow-clip rounded-[28px] bg-(--prw-surface) p-5 font-sans text-[14px] text-(--prw-ink) ${PALETTE}`}
      aria-label="Reward"
    >
      <header className="flex items-center gap-3">
        <span
          className="grid size-[42px] flex-none place-items-center rounded-[14px] bg-(--prw-ink) text-(--prw-surface) [&_svg]:size-[21px]"
          aria-hidden="true"
        >
          <HugeiconsIcon icon={Coffee02Icon} strokeWidth={1.8} />
        </span>
        <span className="grid gap-px leading-[1.3] [&_b]:text-[15px] [&_b]:font-[650] [&_b]:tracking-[-0.01em] [&>span]:text-[12.5px] [&>span]:text-(--prw-muted)">
          <b>Northwind Coffee</b>
          <span>10 of 10 visits · reward unlocked</span>
        </span>
      </header>

      <ol className="m-0 grid list-none grid-cols-10 gap-1 p-0" aria-label="10 of 10 visits">
        {Array.from({ length: 10 }, (_, index) => (
          <li key={index} className="h-1 rounded-full bg-(--prw-ink)" />
        ))}
      </ol>

      <div ref={ticket} className="relative h-[172px]">
        <div
          className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 rounded-[20px] bg-(--prw-fill) text-center"
          aria-hidden={!revealed}
        >
          <span className="text-[13px] font-[550] text-(--prw-muted)">{prize}</span>
          <span className="scale-[0.94] font-mono text-[28px] font-bold tracking-[0.06em] blur-[2px] [transition:scale_0.5s_cubic-bezier(0.3,1.4,0.5,1)_0.1s,filter_0.5s_ease_0.1s] group-data-revealed:scale-100 group-data-revealed:blur-none motion-reduce:transition-none">
            {code}
          </span>
          <span className="text-[12px] text-(--prw-quiet)">Show at the counter · valid until 30 Nov</span>
        </div>

        {!revealed && (
          <>
            <motion.div
              className="absolute inset-0 grid cursor-grab touch-none place-items-center rounded-[20px] bg-(--prw-sticker) bg-[radial-gradient(120%_90%_at_20%_0%,rgb(255_255_255/0.1),transparent_60%)] text-(--prw-sticker-ink) select-none active:cursor-grabbing"
              style={{ clipPath: shape.stuck }}
              role="img"
              aria-label="A sticker covering your code. Drag to peel it off, or use the button below."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span className="pointer-events-none grid gap-[3px] text-center">
                <b className="text-[16px] font-[650] tracking-[-0.015em]">Your reward is under here</b>
                <span className="text-[12.5px] text-(--prw-sticker-muted)">Peel from the corner</span>
              </span>
            </motion.div>
            <span
              className="pointer-events-none absolute inset-0 drop-shadow-[-2px_-3px_5px_rgb(0_0_0/0.28)]"
              aria-hidden="true"
            >
              <motion.span
                className="absolute inset-0 origin-top-left rounded-[20px]"
                style={{ clipPath: shape.lifted, transform: shape.mirror, background: shape.shade }}
              />
            </span>
          </>
        )}
      </div>

      <footer className="grid min-h-12">
        {revealed ? (
          <Button
            data-copied={copied || undefined}
            className={`${FOOT_BUTTON} animate-rise-in bg-(--prw-ink) text-(--prw-surface) transition-colors duration-300 data-copied:bg-(--prw-good) data-copied:text-white motion-reduce:animate-none [&_svg]:size-[17px]`}
            onClick={copy}
          >
            <Remold.Icon icon={<HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />} strokeWidth={2} />
            <Remold.Text>{copied ? "Copied" : "Copy code"}</Remold.Text>
          </Button>
        ) : (
          <Button
            className={`${FOOT_BUTTON} bg-(--prw-fill) text-(--prw-ink) transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--prw-ink)_7%,var(--prw-fill))]`}
            onClick={() => void peelOff()}
          >
            Peel it for me
          </Button>
        )}
      </footer>
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

export function PeelRewardDemo({ playing = true }: { playing?: boolean } = {}) {
  const actions = useRef<PeelRewardActions | null>(null);
  const autoplay = useAutoplay(STEPS.length, { every: (step) => STEPS[step]!.ms, autoStart: playing });
  const { step, active, setPlaying } = autoplay;

  useEffect(() => setPlaying(playing), [playing, setPlaying]);

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
