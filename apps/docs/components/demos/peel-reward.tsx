"use client";

import { Button } from "@base-ui/react/button";
import { Coffee02Icon, Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold, useAutoplay } from "@remold-ui/react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref, type RefObject } from "react";
import { useMeasuredSize } from "./use-measured-size";
import "./peel-reward.css";

type Point = readonly [x: number, y: number];

/** The corner rests lifted this far, so it reads as something to peel. */
const LIFT = 22;
/** Peeled past this share of the sticker's diagonal, it comes off when you let go. */
const OFF_AT = 0.5;

const SNAP_BACK = { type: "spring" as const, duration: 0.55, bounce: 0.35 };
const FLY_OFF = { type: "spring" as const, duration: 0.7, bounce: 0 };

/** What's left of a polygon on one side of a line: Sutherland–Hodgman against `keep(point) >= 0`. */
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

/**
 * Peeling a sticker by its bottom-right corner. The corner has been pulled to `corner + pull`; the
 * paper folds along the line halfway between where the corner was and where it is now. What's on
 * the corner's side of that line has lifted off, and lies folded back over the rest, mirrored.
 */
function peel(width: number, height: number, pullX: number, pullY: number) {
  const rect: Point[] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const length = Math.hypot(pullX, pullY);
  if (length < 0.5 || !width) return { stuck: polygonOf(rect), lifted: polygonOf([]), mirror: "none", angle: 0 };

  // The unit normal from the fold towards the corner's resting place, and a point on the fold.
  const normalX = -pullX / length;
  const normalY = -pullY / length;
  const foldX = width + pullX / 2;
  const foldY = height + pullY / 2;
  const side = ([x, y]: Point) => (x - foldX) * normalX + (y - foldY) * normalY;

  const stuck = clip(rect, (point) => -side(point));
  const lifted = clip(rect, side);
  // Reflection across the fold, as a CSS matrix.
  const offset = 2 * (foldX * normalX + foldY * normalY);
  const mirror = `matrix(${1 - 2 * normalX * normalX}, ${-2 * normalX * normalY}, ${-2 * normalX * normalY}, ${
    1 - 2 * normalY * normalY
  }, ${offset * normalX}, ${offset * normalY})`;
  // The direction the flap's shading runs, from the fold out to its tip.
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
  /** Pull the corner by this much, springing there: for scripted demos. */
  pullTo(x: number, y: number): Promise<void>;
  /** Peel it all the way off. */
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

/** A reward under a sticker: peel it back by the corner, and past halfway it comes off and the code is yours. */
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
    // Far enough past the opposite corner that every bit of it has lifted and folded away.
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
    // The corner only peels back over the sticker, never out past its own edges.
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
    <section ref={ref} className="prw not-prose" data-revealed={revealed || undefined} aria-label="Reward">
      <header className="prw-head">
        <span className="prw-mark" aria-hidden="true">
          <HugeiconsIcon icon={Coffee02Icon} strokeWidth={1.8} />
        </span>
        <span className="prw-titles">
          <b>Northwind Coffee</b>
          <span>10 of 10 visits · reward unlocked</span>
        </span>
      </header>

      <ol className="prw-stamps" aria-label="10 of 10 visits">
        {Array.from({ length: 10 }, (_, index) => (
          <li key={index} />
        ))}
      </ol>

      <div ref={ticket} className="prw-ticket">
        <div className="prw-prize" aria-hidden={!revealed}>
          <span className="prw-prize-name">{prize}</span>
          <span className="prw-code">{code}</span>
          <span className="prw-valid">Show at the counter · valid until 30 Nov</span>
        </div>

        {!revealed && (
          <>
            {/* The part still stuck down: you drag it to peel */}
            <motion.div
              className="prw-sticker"
              style={{ clipPath: shape.stuck }}
              role="img"
              aria-label="A sticker covering your code. Drag to peel it off, or use the button below."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span className="prw-sticker-words">
                <b>Your reward is under here</b>
                <span>Peel from the corner</span>
              </span>
            </motion.div>
            {/* The part that's lifted, folded back over the rest: the sticker's paper back */}
            <span className="prw-flap-shadow" aria-hidden="true">
              <motion.span
                className="prw-flap"
                style={{ clipPath: shape.lifted, transform: shape.mirror, background: shape.shade }}
              />
            </span>
          </>
        )}
      </div>

      <footer className="prw-foot">
        {revealed ? (
          <Button className="prw-copy" data-copied={copied || undefined} onClick={copy}>
            <Remold.Icon icon={<HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />} strokeWidth={2} />
            <Remold.Text>{copied ? "Copied" : "Copy code"}</Remold.Text>
          </Button>
        ) : (
          <Button className="prw-help" onClick={() => void peelOff()}>
            Peel it for me
          </Button>
        )}
      </footer>
    </section>
  );
}

// The docs demo: a scripted peel that plays the element above. Your app doesn't need it.

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
