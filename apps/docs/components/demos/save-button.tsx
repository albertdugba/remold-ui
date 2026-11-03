"use client";

import { Switch } from "@base-ui/react/switch";
import { Remold } from "@remold-ui/react";
import { useEffect, useId, useRef } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./save-button.css";

/*
 * A save button that says what's happening: Save changes, then Saving with a spinner, then Saved
 * with a check, settling back on its own. The change shows before the server answers (the greeting
 * above updates at once), and if the save fails it rolls back where you can see it and offers Retry.
 */

type Status = "idle" | "saving" | "saved" | "error";

interface State {
  /** What the server has. */
  saved: string;
  /** What's in the field. */
  draft: string;
  status: Status;
  /** Make the next save fail, to see the rollback. */
  fail: boolean;
}

/** How long the pretend request takes, and how long Saved stays. */
const REQUEST = 1100;
const HOLD = 1500;

const BEATS: readonly (State & { ms: number })[] = [
  { saved: "Ada", draft: "Ada Obi", status: "idle", fail: false, ms: 1600 },
  { saved: "Ada", draft: "Ada Obi", status: "saving", fail: false, ms: REQUEST },
  { saved: "Ada Obi", draft: "Ada Obi", status: "saved", fail: false, ms: HOLD },
  { saved: "Ada Obi", draft: "Ada Obi-Mensah", status: "idle", fail: true, ms: 1500 },
  { saved: "Ada Obi", draft: "Ada Obi-Mensah", status: "saving", fail: true, ms: REQUEST },
  { saved: "Ada Obi", draft: "Ada Obi-Mensah", status: "error", fail: true, ms: 2400 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

/** The icons share one 24-unit box, so the spinner's arc reshapes into the check or the alert. */
const ICONS: Record<Exclude<Status, "idle">, string> = {
  saving: "M21 12a9 9 0 1 1-9-9",
  saved: "M5 12.5l4.5 4.5L19 7.5",
  error: "M12 6.5v7M12 17.5v.01",
};

const LABELS: Record<Status, string> = { idle: "Save changes", saving: "Saving", saved: "Saved", error: "Retry" };

const SPRING = { duration: 0.45, bounce: 0.1 };

interface SaveButtonDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function SaveButtonDemo({ framed = true, playing }: SaveButtonDemoProps) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  const request = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();

  useEffect(() => () => clearTimeout(request.current), []);

  const save = () => {
    clearTimeout(request.current);
    take((s) => ({ ...s, status: "saving" }));
    request.current = setTimeout(() => {
      take((s) => (s.fail ? { ...s, status: "error" } : { ...s, saved: s.draft, status: "saved" }));
      request.current = setTimeout(() => take((s) => (s.status === "saved" ? { ...s, status: "idle" } : s)), HOLD);
    }, REQUEST);
  };

  const { status } = state;
  // Optimistic: while saving, the page already shows the new name. A failure puts the old one back.
  const shown = status === "saving" ? state.draft : state.saved;
  const unchanged = state.draft === state.saved;

  const body = (
    <section ref={ref} className="svb" data-status={status} aria-label="Profile">
      <p className="svb-greeting">
        Signed in as <Remold.Text className="svb-name">{shown}</Remold.Text>
      </p>

      <label className="svb-field" htmlFor={`${id}-name`}>
        <span>Display name</span>
        <input
          id={`${id}-name`}
          value={state.draft}
          aria-describedby={`${id}-help`}
          aria-invalid={status === "error" || undefined}
          onChange={(e) => {
            clearTimeout(request.current);
            const draft = e.target.value;
            take((s) => ({ ...s, draft, status: "idle" }));
          }}
        />
      </label>
      <Remold.Text id={`${id}-help`} className="svb-help" aria-live="polite">
        {status === "error" ? "Couldn't save. Your old name is back. Try again." : "Shown on your profile and in comments."}
      </Remold.Text>

      <div className="svb-foot">
        <label className="svb-fail">
          <Switch.Root className="svb-switch" checked={state.fail} onCheckedChange={(fail) => take((s) => ({ ...s, fail }))}>
            <Switch.Thumb className="svb-knob" />
          </Switch.Root>
          Fail the next save
        </label>
        <Remold.Layout trigger={status} spring={SPRING} className="svb-actions">
          <button
            type="button"
            className="svb-button"
            // Busy, it ignores presses but keeps focus (a disabled button would drop it); with nothing to save, it's off.
            disabled={status === "idle" && unchanged}
            aria-disabled={status === "saving" || status === "saved" || undefined}
            aria-busy={status === "saving" || undefined}
            onClick={() => {
              if (status === "idle" || status === "error") save();
            }}
          >
            {status !== "idle" && <Remold.Icon key="icon" className="svb-icon" d={ICONS[status]} strokeWidth={2} aria-hidden="true" />}
            <Remold.Text>{LABELS[status]}</Remold.Text>
          </button>
        </Remold.Layout>
      </div>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
