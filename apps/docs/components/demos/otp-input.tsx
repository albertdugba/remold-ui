"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon, Loading03Icon, MailOpen01Icon, MailValidation01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useAutoplay } from "@remold-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CodeField } from "./code-field";
import "./otp-input.css";

const LENGTH = 6;
const CODE = "482915";
const ERROR_CODE = "482910";
const EMAIL = "ama.mensah@northwind.app";

const SETTLE = 280;

const CHECKING = 1400;

type Phase = "entry" | "verifying" | "verified" | "error";

const SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.16 };

const STEPS = [
  { ms: 1400, act: "clear" },
  ...Array.from(ERROR_CODE, (digit, i) => ({
    ms: i === LENGTH - 1 ? 300 : 140,
    act: "type" as const,
    digit,
  })),
  { ms: SETTLE + CHECKING + 1500, act: "wait" },
  { ms: 400, act: "clear" },
  ...Array.from(CODE, (digit, i) => ({
    ms: i === LENGTH - 1 ? 300 : 140,
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
    every: (i) => STEPS[i]!.ms,
    stopOnInteraction: playing === undefined,
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
    const timer = setTimeout(
      () => setPhase(code === CODE ? "verified" : "error"),
      CHECKING,
    );
    return () => clearTimeout(timer);
  }, [code, phase]);

  const startOver = () => {
    reset();
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  };

  const entering = phase === "entry";
  const verified = phase === "verified";
  const failed = phase === "error";
  // A wrong code leaves the digits in the cells to be corrected, so the field stays editable.
  const editable = entering || failed;
  // Once the code is in, the row of cells becomes a pill holding the result.
  const pill = phase === "verifying" || verified;

  return (
    <section
      ref={autoplay.ref}
      className="otp not-prose"
      data-phase={phase}
      aria-label="Verify your email"
    >
      <span className="otp-badge" aria-hidden="true">
        {verified ? <HugeiconsIcon icon={MailValidation01Icon} /> : <HugeiconsIcon icon={MailOpen01Icon} />}
      </span>

      <p className="otp-copy" id="otp-copy">
        Enter the code we sent to
        <strong>{EMAIL}</strong>
      </p>

      <motion.div layout transition={SPRING} className="otp-stage">
        {/* The field morphs between the row of cells and the pill; its radius animates with it. */}
        <motion.div layout className="otp-field" initial={false} animate={{ borderRadius: pill ? 26 : 14 }} transition={SPRING}>
          <CodeField
            className="otp-cells"
            value={code}
            onChange={(next) => {
              setCode(next);
              // Correcting a wrong code clears the red.
              if (failed) setPhase("entry");
            }}
            disabled={!editable}
            invalid={failed}
            inputRef={input}
            describedBy="otp-copy"
            // After a wrong code, clicking in selects it all, so typing starts a fresh one.
            onFocus={(e) => failed && e.currentTarget.select()}
          />
          {/* Centred in the field even while hidden, so it fades in where it lands instead of travelling. */}
          <motion.span layout className="otp-result" role="status" aria-live="polite" transition={SPRING}>
            {verified ? <HugeiconsIcon icon={Tick01Icon} className="otp-icon" aria-hidden="true" /> : failed ? <HugeiconsIcon icon={CancelCircleIcon} className="otp-icon" aria-hidden="true" /> : <HugeiconsIcon icon={Loading03Icon} className="otp-icon" aria-hidden="true" />}
            {/* No word while typing, so nothing has to leave (and close its gap) as the pill forms. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {!entering && (
                <motion.span key={phase} className="otp-word" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING}>
                  {verified ? "Verified" : failed ? "Try again" : "Verifying"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </motion.div>
      </motion.div>

      <button
        type="button"
        className="otp-foot"
        disabled={phase === "verifying"}
        onClick={startOver}
      >
        <span>
          {verified
            ? "Use another code"
            : failed
            ? "Try another code"
            : "Resend code"}
        </span>
      </button>
    </section>
  );
}
