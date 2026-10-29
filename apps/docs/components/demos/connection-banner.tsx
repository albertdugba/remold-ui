"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudLoadingIcon, Refresh01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@base-ui/react/switch";
import { Remold } from "@remold-ui/react";
import { useEffect } from "react";
import { useScene } from "./use-scene";
import "./connection-banner.css";

type Phase = "online" | "offline" | "reconnecting" | "back";

interface State {
  phase: Phase;
  /** Seconds until the next automatic try, while offline. */
  retry: number;
  /** Whether something was written while offline. */
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

const fromBeat = (step: number): State => ({ phase: BEATS[step]!.phase, retry: BEATS[step]!.retry, edited: BEATS[step]!.edited });

const SPRING = { duration: 0.55, bounce: 0.14 };
const RETRY = 5;

interface ConnectionBannerDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function ConnectionBannerDemo({ playing }: ConnectionBannerDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const { phase } = state;
  const offline = phase === "offline" || phase === "reconnecting";

  // The browser's own events: a real dropped connection shows the banner too.
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

  // While offline, count down to the next try; reconnecting takes a moment; the pill then leaves.
  useEffect(() => {
    if (scene.live) return;
    if (phase === "offline" && state.retry > 0) {
      const t = setTimeout(() => take((s) => ({ ...s, retry: s.retry - 1 })), 1000);
      return () => clearTimeout(t);
    }
    if (phase === "offline" && state.retry === 0) {
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

  return (
    <section ref={scene.ref} className="cn not-prose" aria-label="Document">
      <Remold.Layout trigger={[phase]} spring={SPRING} className="cn-stage">
        <header className="cn-top">
          <span className="cn-doc">
            <b>Launch notes</b>
            <span className="cn-sync" data-phase={phase}>
              <i aria-hidden="true" />
              {phase === "online" || phase === "back" ? "Saved" : phase === "reconnecting" ? "Syncing…" : "Saved on this device"}
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
          {offline ? (
            <div className="cn-banner" data-phase={phase}>
              <span className="cn-banner-icon">{phase === "reconnecting" ? <HugeiconsIcon icon={Refresh01Icon} className="cn-spin" aria-hidden="true" /> : <HugeiconsIcon icon={CloudLoadingIcon} aria-hidden="true" />}</span>
              <span className="cn-banner-copy">
                <b>{phase === "reconnecting" ? "Reconnecting…" : "You're offline"}</b>
                <span>Your changes are kept on this device and will sync when you're back.</span>
              </span>
              {phase === "offline" && (
                <button type="button" className="cn-retry" onClick={() => take((s) => ({ ...s, phase: "reconnecting" }))}>
                  {state.retry > 0 ? `Retry · ${state.retry}s` : "Retry"}
                </button>
              )}
            </div>
          ) : phase === "back" ? (
            <div className="cn-pill">
              <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" />
              Back online · changes synced
            </div>
          ) : null}
        </div>

        <article className="cn-body">
          <h4>What ships on Friday</h4>
          <p>
            The new checkout goes live for everyone, with the totals fix and the faster first load.{" "}
            {state.edited || phase === "back" ? (
              <span className="cn-new" data-unsynced={state.edited || undefined}>
                Support has the FAQ ready for launch morning.
              </span>
            ) : null}
          </p>
          <p className="cn-muted">Release notes go out at 10 AM, the email an hour later.</p>
        </article>
      </Remold.Layout>
    </section>
  );
}
