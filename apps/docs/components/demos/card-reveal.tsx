"use client";

import { Copy01Icon, Tick02Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion, useMotionTemplate, useReducedMotion, useSpring } from "motion/react";
import { type PointerEvent, useEffect } from "react";
import { RemoldLogo } from "./demo-icons";
import { FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

type Field = "number" | "expiry" | "cvc";
type CardValue = { flipped: boolean; copied: Field | null };

const DETAILS: Record<Field, { label: string; value: string }> = {
  number: { label: "Card number", value: "4921 0387 5512 1681" },
  expiry: { label: "Expires", value: "09/29" },
  cvc: { label: "CVC", value: "418" },
};

const HIDE_AFTER = 15;
const FLIP = { type: "spring" as const, duration: 0.8, bounce: 0.18 };
const TILT = { stiffness: 220, damping: 22, mass: 0.6 };

const SURFACE =
  "[background:radial-gradient(120%_120%_at_100%_0%,#7c3aed_0%,transparent_52%),radial-gradient(110%_110%_at_0%_100%,#2563eb_0%,transparent_55%),#0f1020]";

function CopyButton({ field, copied, onCopy }: { field: Field; copied: boolean; onCopy: (field: Field) => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onCopy(field);
      }}
      aria-label={copied ? `${DETAILS[field].label} copied` : `Copy ${DETAILS[field].label.toLowerCase()}`}
      className="grid size-7 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white/12 text-white transition-[background-color,transform] duration-150 ease-out hover:bg-white/22 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white data-copied:bg-[#22c55e]"
      data-copied={copied || undefined}
    >
      <Remold.Icon
        icon={<HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />}
        className="size-[14px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  );
}

function Front() {
  return (
    <div className={`absolute inset-0 flex flex-col justify-between rounded-[22px] p-6 text-white [backface-visibility:hidden] ${SURFACE}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.01em]">
          <RemoldLogo className="size-[19px]" />
          Remold
        </span>
        <span className="rounded-full bg-white/14 px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em]">Virtual</span>
      </div>
      <span className="relative h-[34px] w-[46px] overflow-hidden rounded-[7px] bg-[linear-gradient(135deg,#f1e2b0,#b8995a)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]">
        <span className="absolute inset-y-0 left-1/3 w-px bg-black/20" />
        <span className="absolute inset-y-0 right-1/3 w-px bg-black/20" />
        <span className="absolute inset-x-0 top-1/2 h-px bg-black/20" />
      </span>
      <div className="flex items-end justify-between">
        <span className="text-[18px] font-medium tracking-[0.12em] tabular-nums">•••• 1681</span>
        <span className="text-[12px] font-medium text-white/60">Debit</span>
      </div>
    </div>
  );
}

function Back({ value, onCopy }: { value: CardValue; onCopy: (field: Field) => void }) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[22px] text-white [backface-visibility:hidden] [transform:rotateY(180deg)] ${SURFACE}`}
      aria-hidden={!value.flipped}
    >
      <span className="absolute inset-x-0 top-6 h-10 bg-[linear-gradient(180deg,#09090b,#1c1c22)]" />
      <div className="absolute inset-x-6 bottom-6 grid gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="grid gap-1">
            <span className="text-[10px] font-semibold tracking-[0.08em] text-white/55 uppercase">Card number</span>
            <span className="text-[17px] font-medium tracking-[0.06em] tabular-nums">{DETAILS.number.value}</span>
          </span>
          <CopyButton field="number" copied={value.copied === "number"} onCopy={onCopy} />
        </div>
        <div className="flex items-center gap-7">
          {(["expiry", "cvc"] as const).map((field) => (
            <div key={field} className="flex items-center gap-2.5">
              <span className="grid gap-1">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-white/55 uppercase">{DETAILS[field].label}</span>
                <span className="text-[15px] font-medium tabular-nums">{DETAILS[field].value}</span>
              </span>
              <CopyButton field={field} copied={value.copied === field} onCopy={onCopy} />
            </div>
          ))}
        </div>
      </div>
      {value.flipped && (
        <motion.span
          key="timer"
          className="absolute inset-x-6 bottom-2.5 h-[2px] origin-left rounded-full bg-white/50"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: reduced ? 1 : 0 }}
          transition={{ duration: HIDE_AFTER, ease: "linear" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function FlipCard({ value, onValueChange }: { value: CardValue; onValueChange: (value: CardValue) => void }) {
  const reduced = useReducedMotion();
  const tiltX = useSpring(0, TILT);
  const tiltY = useSpring(0, TILT);
  const glareX = useSpring(50, TILT);
  const glareY = useSpring(30, TILT);
  const glare = useMotionTemplate`radial-gradient(90% 90% at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.14), transparent 70%)`;

  const track = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    tiltX.set((0.5 - y) * 14);
    tiltY.set((x - 0.5) * 18);
    glareX.set(x * 100);
    glareY.set(y * 100);
  };

  const settle = () => {
    tiltX.set(0);
    tiltY.set(0);
    glareX.set(50);
    glareY.set(30);
  };

  const copy = (field: Field) => {
    void navigator.clipboard?.writeText(DETAILS[field].value.replaceAll(" ", "")).catch(() => undefined);
    onValueChange({ ...value, copied: field });
  };

  const toggle = () => onValueChange({ flipped: !value.flipped, copied: null });

  return (
    <div className="grid w-[min(100%,360px)] justify-items-center gap-6">
      <div className="w-full [perspective:1200px]" onPointerMove={track} onPointerLeave={settle}>
        <motion.div
          className="relative aspect-[1.586] w-full cursor-pointer [transform-style:preserve-3d]"
          style={{ rotateX: tiltX, rotateY: tiltY }}
          onClick={toggle}
          role="group"
          aria-label={value.flipped ? `Card ${DETAILS.number.value}, expires ${DETAILS.expiry.value}, CVC ${DETAILS.cvc.value}` : "Virtual card ending 1681"}
        >
          <span className="absolute inset-x-6 -bottom-5 h-8 rounded-full bg-[#1e1b4b]/40 blur-xl dark:bg-black/60" aria-hidden="true" />
          <motion.div
            className="absolute inset-0 [transform-style:preserve-3d]"
            initial={false}
            animate={{ rotateY: value.flipped ? 180 : 0 }}
            transition={FLIP}
          >
            <Front />
            <Back value={value} onCopy={copy} />
          </motion.div>
          <motion.span className="pointer-events-none absolute inset-0 rounded-[22px] mix-blend-soft-light" style={{ background: glare }} aria-hidden="true" />
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={toggle}
          whileTap={{ scale: 0.96 }}
          aria-pressed={value.flipped}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-(--fk-ink) px-4 text-[14px] font-semibold text-(--fk-surface)"
        >
          <Remold.Icon
            icon={<HugeiconsIcon icon={value.flipped ? ViewOffSlashIcon : ViewIcon} />}
            className="size-[17px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <Remold.Text>{value.flipped ? "Hide details" : "Show details"}</Remold.Text>
        </motion.button>
        <AnimatePresence initial={false}>
          {value.copied && (
            <motion.span
              key="copied"
              className="text-[13px] font-semibold text-(--fk-good)"
              initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              role="status"
            >
              {DETAILS[value.copied].label} copied
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* The demo */

const BEATS: readonly (CardValue & { ms: number })[] = [
  { flipped: false, copied: null, ms: 1600 },
  { flipped: true, copied: null, ms: 1500 },
  { flipped: true, copied: "number", ms: 1600 },
  { flipped: true, copied: null, ms: 600 },
  { flipped: false, copied: null, ms: 1200 },
];

const fromBeat = (step: number): CardValue => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

export function CardRevealDemo({ playing }: { playing?: boolean; preview?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { takeOver } = scene;
  const value = scene.state;
  const scripted = scene.live;

  useEffect(() => {
    if (scripted || !value.copied) return;
    const timer = setTimeout(() => takeOver((current) => ({ ...current, copied: null })), 1600);
    return () => clearTimeout(timer);
  }, [scripted, value.copied, takeOver]);

  useEffect(() => {
    if (scripted || !value.flipped) return;
    const timer = setTimeout(() => takeOver({ flipped: false, copied: null }), HIDE_AFTER * 1000);
    return () => clearTimeout(timer);
  }, [scripted, value.flipped, takeOver]);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={scene.ref} className={`not-prose grid w-full place-items-center py-6 ${FORM_KIT}`}>
        <FlipCard value={value} onValueChange={(next) => takeOver(next)} />
      </div>
    </MotionConfig>
  );
}
