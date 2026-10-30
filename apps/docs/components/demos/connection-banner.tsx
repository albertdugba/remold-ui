"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudLoadingIcon, Refresh01Icon, CheckIcon } from "@hugeicons/core-free-icons";
import { Switch } from "@base-ui/react/switch";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect } from "react";
import { useScene } from "./use-scene";
import "./connection-banner.css";

type Phase = "online" | "offline" | "reconnecting" | "back";

interface State {
  phase: Phase;
  retry: number;
  edited: boolean;
}

const BEATS: readonly (State & { ms: number })[] = [
  { phase: "online", retry: 0, edited: false, ms: 1600 },
  { phase: "offline", retry: 3, edited: false, ms: 1100 },
  { phase: "offline", retry: 2, edited: true, ms: 1000 },
  { phase: "offline", retry: 1, edited: true, ms: 1000 },
  { phase: "reconnecting", retry: 0, edited: true, ms: 1100 },
  { phase: "back", retry: 0, edited: false, ms: 1900 },
  { phase: "online", retry: 0, edited: false, ms: 1200 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.55, bounce: 0.14 };
const FADE = { duration: 0.25 };
const RETRY = 5;

const SYNC: Record<Phase, string> = {
  online: "Connected",
  offline: "Saved on this device",
  reconnecting: "Sending…",
  back: "Sent",
};

interface ConnectionBannerDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function ConnectionBannerDemo({ playing }: ConnectionBannerDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const { phase } = state;
  const offline = phase === "offline" || phase === "reconnecting";

  useEffect(() => {
    const down = () => take((s) => ({ ...s, phase: "offline", retry: RETRY }));
    const up = () => take((s) => (s.phase === "online" ? s : { ...s, phase: "reconnecting" }));
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, [take]);

  useEffect(() => {
    if (scene.live) return;
    if (phase === "offline" && state.retry > 0) {
      const t = setTimeout(() => take((s) => ({ ...s, retry: s.retry - 1 })), 1000);
      return () => clearTimeout(t);
    }
    if (phase === "offline") {
      const t = setTimeout(() => take((s) => ({ ...s, retry: RETRY })), 600);
      return () => clearTimeout(t);
    }
    if (phase === "reconnecting") {
      const t = setTimeout(() => take((s) => ({ ...s, phase: "back", edited: false })), 1000);
      return () => clearTimeout(t);
    }
    if (phase === "back") {
      const t = setTimeout(() => take((s) => ({ ...s, phase: "online" })), 1800);
      return () => clearTimeout(t);
    }
  }, [scene.live, phase, state.retry, take]);

  const simulate = (down: boolean) =>
    take((s) => (down ? { ...s, phase: "offline", retry: RETRY, edited: true } : { ...s, phase: "reconnecting" }));

  const retry = () => take((s) => ({ ...s, phase: "reconnecting" }));

  return (
    <section ref={scene.ref} className="cn not-prose" aria-label="Support reply">
      <LayoutGroup>
        <div className="cn-stage">
          <header className="cn-top">
            <span className="cn-doc">
              <b>Refund #1042</b>
              <span className="cn-sync" data-phase={phase}>
                <i aria-hidden="true" />
                {SYNC[phase]}
              </span>
            </span>
            <label className="cn-sim">
              <span>Offline</span>
              <Switch.Root className="cn-switch" checked={offline} onCheckedChange={simulate} aria-label="Simulate going offline">
                <Switch.Thumb className="cn-thumb" />
              </Switch.Root>
            </label>
          </header>

          <div className="cn-slot" aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              {phase !== "online" && <Status key="status" phase={phase} retry={state.retry} onRetry={retry} />}
            </AnimatePresence>
          </div>

          <Reply edited={state.edited} sent={phase === "back"} />
        </div>
      </LayoutGroup>
    </section>
  );
}

function Status({ phase, retry, onRetry }: { phase: Phase; retry: number; onRetry: () => void }) {
  const back = phase === "back";
  return (
    <motion.div
      layout
      className="cn-status"
      data-phase={back ? "back" : "open"}
      transition={SPRING}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {back ? <Pill key="pill" /> : <Banner key="banner" phase={phase} retry={retry} onRetry={onRetry} />}
      </AnimatePresence>
    </motion.div>
  );
}

function Banner({ phase, retry, onRetry }: { phase: Phase; retry: number; onRetry: () => void }) {
  const reconnecting = phase === "reconnecting";
  return (
    <motion.div className="cn-banner-face" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE}>
      <span className="cn-banner-icon">
        <HugeiconsIcon icon={reconnecting ? Refresh01Icon : CloudLoadingIcon} className={reconnecting ? "cn-spin" : undefined} aria-hidden="true" />
      </span>
      <span className="cn-banner-copy">
        <b>{reconnecting ? "Reconnecting…" : "You're offline"}</b>
        <span>{reconnecting ? "Sending the reply you wrote on this device." : "Your reply stays on this device and sends when you're back."}</span>
      </span>
      {phase === "offline" && (
        <button type="button" className="cn-retry" onClick={onRetry}>
          {retry > 0 ? `Retry · ${retry}s` : "Retry"}
        </button>
      )}
    </motion.div>
  );
}

function Pill() {
  return (
    <motion.div className="cn-pill-face" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE}>
      <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
      Back online · reply sent
    </motion.div>
  );
}

function Reply({ edited, sent }: { edited: boolean; sent: boolean }) {
  return (
    <motion.div layout="position" className="cn-thread" transition={SPRING}>
      <div className="cn-msg">
        <b>Maya Chen</b>
        <span>The charger never arrived. Can I get a refund?</span>
      </div>
      <div className="cn-composer">
        {edited || sent ? (
          <>
            <span className="cn-composer-who">You</span>
            <span className="cn-new" data-unsynced={edited || undefined}>
              Refund approved. It lands in 3–5 days.
            </span>
          </>
        ) : (
          <span className="cn-placeholder">Reply to Maya…</span>
        )}
      </div>
    </motion.div>
  );
}
