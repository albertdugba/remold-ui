"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CancelCircleIcon,
  Loading03Icon,
  MailOpen01Icon,
  MailRemove01Icon,
  MailValidation01Icon,
  CheckIcon,
} from "@hugeicons/core-free-icons";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CodeField } from "./code-field";

const LENGTH = 6;
const CODE = "482915";
const ERROR_CODE = "482910";
const EMAIL = "ama.mensah@northwind.app";

const SETTLE = 280;

const CHECKING = 1400;

type Phase = "entry" | "verifying" | "verified" | "error";

const ICON = "size-[18px] flex-none motion-safe:group-data-[phase=verifying]:animate-spin";

const SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.16 };

const STEPS = [
  { ms: 1400, act: "clear" },
  ...Array.from(ERROR_CODE, (digit, index) => ({
    ms: index === LENGTH - 1 ? 300 : 140,
    act: "type" as const,
    digit,
  })),
  { ms: SETTLE + CHECKING + 1500, act: "wait" },
  { ms: 400, act: "clear" },
  ...Array.from(CODE, (digit, index) => ({
    ms: index === LENGTH - 1 ? 300 : 140,
    act: "type" as const,
    digit,
  })),
  { ms: SETTLE + CHECKING + 1800, act: "wait" },
] as const;

interface OtpInputDemoProps {
  playing?: boolean;
}

export function OtpInputDemo({ playing }: OtpInputDemoProps = {}) {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("entry");
  const input = useRef<HTMLInputElement>(null);
  const autoplay = useAutoplay(STEPS.length, {
    every: (index) => STEPS[index]!.ms,
    stopOnInteraction: playing === undefined,
    autoStart: Boolean(playing),
  });
  const { step, playing: live, setPlaying } = autoplay;

  useEffect(() => {
    if (playing !== undefined) setPlaying(playing);
  }, [playing, setPlaying]);

  const reset = useCallback(() => {
    setCode("");
    setPhase("entry");
  }, []);

  useEffect(() => {
    if (!live) return;
    const action = STEPS[step]!;
    if (action.act === "clear") reset();
    else if (action.act === "type") setCode((code) => `${code}${action.digit}`);
  }, [step, live, reset]);

  useEffect(() => {
    if (phase !== "entry" || code.length < LENGTH) return;
    const timer = setTimeout(() => setPhase("verifying"), SETTLE);
    return () => clearTimeout(timer);
  }, [code, phase]);

  useEffect(() => {
    if (phase !== "verifying") return;
    const timer = setTimeout(() => setPhase(code === CODE ? "verified" : "error"), CHECKING);
    return () => clearTimeout(timer);
  }, [code, phase]);

  const startOver = () => {
    reset();
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  };

  const entering = phase === "entry";
  const verified = phase === "verified";
  const failed = phase === "error";
  const editable = entering || failed;
  const pill = phase === "verifying" || verified;

  return (
    <section
      ref={autoplay.ref}
      data-phase={phase}
      data-pill={pill || undefined}
      className="otp group not-prose @container relative grid w-[min(100%,360px)] justify-items-center rounded-[28px] border-0 bg-(--otp-surface) px-6 pt-[34px] pb-[22px] text-center font-sans text-(--otp-ink) [--otp-accent:#7c3aed] [--otp-bad:#dc2626] [--otp-good:#16a34a] [--otp-ink:#18181b] [--otp-muted:#71717a] [--otp-on-ink:#fafafa] [--otp-surface:#ffffff] @max-[360px]:px-4 dark:[--otp-accent:#a78bfa] dark:[--otp-bad:#f87171] dark:[--otp-good:#22c55e] dark:[--otp-ink:#fafafa] dark:[--otp-muted:#a1a1aa] dark:[--otp-on-ink:#18181b] dark:[--otp-surface:#232327]"
      aria-label="Verify your email"
    >
      <span
        className="grid place-items-center text-(--otp-accent) transition-colors duration-350 group-data-[phase=error]:text-(--otp-bad) group-data-[phase=verified]:text-(--otp-good) [&_svg]:size-10 [&_svg]:[stroke-width:1.75]"
        aria-hidden="true"
      >
        <Remold.Icon
          icon={
            <HugeiconsIcon
              icon={verified ? MailValidation01Icon : failed ? MailRemove01Icon : MailOpen01Icon}
            />
          }
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          spring={{ duration: 0.45, bounce: 0.16 }}
        />
      </span>

      <p className="mt-[18px] mb-6 grid gap-1 text-[15px] leading-[1.4] text-(--otp-muted)" id="otp-copy">
        Enter the code we sent to
        <strong className="text-[16px] font-semibold wrap-anywhere text-(--otp-ink)">{EMAIL}</strong>
      </p>

      <motion.div
        layout
        transition={SPRING}
        className="flex h-[58px] items-center justify-center motion-safe:group-data-[phase=error]:animate-shake"
      >
        <motion.div
          layout
          className="relative flex items-center justify-center bg-(--otp-surface) whitespace-nowrap transition-colors duration-350 group-data-pill:h-[52px] group-data-pill:bg-(--otp-ink) group-data-pill:pr-[26px] group-data-pill:pl-[22px] group-data-pill:text-(--otp-on-ink) group-data-[phase=verified]:bg-(--otp-good)! group-data-[phase=verified]:text-white!"
          initial={false}
          animate={{ borderRadius: pill ? 26 : 14 }}
          transition={SPRING}
        >
          <CodeField
            className="bg-(--otp-surface) transition-opacity duration-200 group-data-pill:w-0 group-data-pill:overflow-hidden group-data-pill:opacity-0 @max-[360px]:[&_.cf-cell]:h-[50px] @max-[360px]:[&_.cf-cell]:w-10 @max-[360px]:[&_.cf-cell]:flex-none @max-[360px]:[&_.cf-cell]:text-[20px] @max-[360px]:[&_.cf-cell:first-of-type]:w-11 @max-[360px]:[&_.cf-cell:first-of-type]:rounded-[25px_16px_16px_25px] @max-[360px]:[&_.cf-cell:last-of-type]:w-11 @max-[360px]:[&_.cf-cell:last-of-type]:rounded-[16px_25px_25px_16px]"
            value={code}
            onChange={(next) => {
              setCode(next);
              if (failed) setPhase("entry");
            }}
            disabled={!editable}
            invalid={failed}
            inputRef={input}
            describedBy="otp-copy"
            onFocus={(event) => failed && event.currentTarget.select()}
          />
          <motion.span
            layout
            className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-1/2 items-center gap-2 whitespace-nowrap opacity-0 group-data-pill:static group-data-pill:translate-none group-data-pill:opacity-100 group-data-pill:[transition:opacity_0.25s_0.1s]"
            role="status"
            aria-live="polite"
            transition={SPRING}
          >
            {verified ? (
              <HugeiconsIcon icon={CheckIcon} className={ICON} aria-hidden="true" />
            ) : failed ? (
              <HugeiconsIcon icon={CancelCircleIcon} className={ICON} aria-hidden="true" />
            ) : (
              <HugeiconsIcon icon={Loading03Icon} className={ICON} aria-hidden="true" />
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              {!entering && (
                <motion.span
                  key={phase}
                  className="text-[15px] font-semibold"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={SPRING}
                >
                  {verified ? "Verified" : failed ? "Try again" : "Verifying"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </motion.div>
      </motion.div>

      <button
        type="button"
        className="mt-[22px] cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-[13px] text-(--otp-muted) transition-opacity duration-200 enabled:hover:text-(--otp-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--otp-ink) disabled:cursor-default disabled:opacity-40"
        disabled={phase === "verifying"}
        onClick={startOver}
      >
        <span>{verified ? "Use another code" : failed ? "Try another code" : "Resend code"}</span>
      </button>
    </section>
  );
}
