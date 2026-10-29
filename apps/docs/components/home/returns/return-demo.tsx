"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, HelpCircleIcon, PackageIcon, PauseIcon, PlayIcon, RotateLeft01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useState } from "react";
import { AUTO_RETURN_STATES, INITIAL_RETURN, type RefundMethod, type ReturnReason, type ReturnState } from "./return-data";
import { OrderView, ReturnForm, SubmittedView } from "./return-views";
import "./return.css";

function ReturnHeader({ playing, onReset, onPlayback }: { playing: boolean; onReset: () => void; onPlayback: () => void }) {
  return (
    <header className="hret-header">
      <div className="hret-brand" aria-label="Halden Goods">
        <span className="hret-brand-symbol">H</span>
        <strong>
          HALDEN<span>.</span>
        </strong>
        <span className="hret-brand-divider" />
        <span className="hret-brand-account">Your account</span>
      </div>
      <div className="hret-header-right">
        <span className="hret-demo-label">INTERACTIVE DEMO</span>
        <button type="button" className="hret-icon-button" onClick={onReset} aria-label="Reset return demo" title="Reset demo">
          <HugeiconsIcon icon={RotateLeft01Icon} size={16} />
        </button>
        <button
          type="button"
          data-rm-autoplay-control=""
          className="hret-icon-button"
          onClick={onPlayback}
          aria-label={playing ? "Pause return demo" : "Play return demo"}
          title={playing ? "Pause demo" : "Play demo"}
        >
          {playing ? <HugeiconsIcon icon={PauseIcon} size={16} fill="currentColor" /> : <HugeiconsIcon icon={PlayIcon} size={16} fill="currentColor" />}
        </button>
        <span className="hret-header-avatar" aria-hidden="true">
          M
        </span>
      </div>
    </header>
  );
}

function ReturnAside({ phase }: { phase: ReturnState["phase"] }) {
  return (
    <aside className="hret-aside" aria-label="Order and return information">
      <div className="hret-aside-card">
        <span className="hret-aside-kicker">ORDER OVERVIEW</span>
        <div className="hret-aside-order">
          <strong>#HLD-10482</strong>
          <span>8 October 2026</span>
        </div>
        <div className="hret-aside-rule" />
        <div className="hret-aside-row">
          <span>Subtotal</span>
          <strong>£189.00</strong>
        </div>
        <div className="hret-aside-row">
          <span>Delivery</span>
          <strong>Free</strong>
        </div>
        <div className="hret-aside-rule" />
        <div className="hret-aside-row total">
          <span>Total paid</span>
          <strong>£189.00</strong>
        </div>
        <div className="hret-aside-payment">
          <span className="hret-visa">VISA</span> Ending in 4829
        </div>
      </div>

      <div className="hret-aside-help">
        <div className="hret-aside-help-icon">{phase === "submitted" ? <HugeiconsIcon icon={PackageIcon} size={20} /> : <HugeiconsIcon icon={HelpCircleIcon} size={20} />}</div>
        <strong>{phase === "submitted" ? "What happens next?" : "Returns, made simple."}</strong>
        <p>
          {phase === "submitted"
            ? "Your label arrives by email. Pack the jacket, attach the label, and drop it off within 14 days."
            : "Start your return by 14 November. We'll provide a prepaid label and keep you updated along the way."}
        </p>
        <span className="hret-help-link">
          {phase === "submitted" ? "Prepaid label on its way" : "30-day returns"} <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
        </span>
      </div>

      <div className="hret-aside-foot">
        <HugeiconsIcon icon={Tick01Icon} size={15} /> Secure, local demo · no real return is created
      </div>
    </aside>
  );
}

export function ReturnDemo() {
  const autoplay = useAutoplay(AUTO_RETURN_STATES.length, { every: (step) => [3000, 3900, 4300][step] ?? 3500 });
  const [manual, setManual] = useState<ReturnState | null>(null);
  const state = manual ?? AUTO_RETURN_STATES[autoplay.step]!;

  function startReturn() {
    setManual({ phase: "form", reason: null, refundMethod: "Original payment" });
  }

  function updateReturn(patch: Partial<Pick<ReturnState, "reason" | "refundMethod">>) {
    setManual({ ...state, ...patch, phase: "form" });
  }

  function submitReturn() {
    if (!state.reason) return;
    setManual({ ...state, phase: "submitted" });
  }

  function resetDemo() {
    autoplay.setPlaying(false);
    setManual(INITIAL_RETURN);
  }

  function togglePlayback() {
    if (manual) {
      setManual(null);
      autoplay.setStep(0);
      autoplay.setPlaying(true);
      return;
    }
    autoplay.setPlaying(!autoplay.playing);
  }

  return (
    <div className="hret" ref={autoplay.ref}>
      <ReturnHeader playing={autoplay.playing && !manual} onReset={resetDemo} onPlayback={togglePlayback} />
      <div className="hret-shell">
        <main className="hret-main">
          <Remold.Layout trigger={state.phase} spring={{ duration: 0.29, bounce: 0.04 }} className="hret-layout">
            {state.phase === "order" && <OrderView onStartReturn={startReturn} />}
            {state.phase === "form" && (
              <ReturnForm
                reason={state.reason}
                refundMethod={state.refundMethod}
                onReasonChange={(reason: ReturnReason) => updateReturn({ reason })}
                onRefundMethodChange={(refundMethod: RefundMethod) => updateReturn({ refundMethod })}
                onBack={() => setManual({ ...state, phase: "order" })}
                onSubmit={submitReturn}
              />
            )}
            {state.phase === "submitted" && <SubmittedView refundMethod={state.refundMethod} />}
          </Remold.Layout>
        </main>
        <ReturnAside phase={state.phase} />
      </div>
    </div>
  );
}
