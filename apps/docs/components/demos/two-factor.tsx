"use client";
/**
 * A security setting that opens up. Switching on two-factor reveals a QR code and a code field
 * under it, and the row below steps down to make room (`Remold.Layout`). The code fills in, and once
 * it's accepted the whole setup folds into one line that says it's on.
 *
 * It plays a short scene while it's on screen. Touch it and it's yours: flip the switch and type any
 * six digits.
 */
import { Remold } from "@remold-ui/react";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./two-factor.css";

const CODE = "482915";
const LENGTH = CODE.length;

type Phase = "off" | "setup" | "on";

interface State {
  phase: Phase;
  /** The code entered so far. */
  code: string;
  alerts: boolean;
}

interface Beat {
  phase: Phase;
  /** How long the beat holds before the next one, in ms. */
  ms: number;
  /** Digits of the code entered so far. */
  digits?: number;
}

/**
 * Off for a while, the setup opening (held until the row below has settled), the code arriving
 * quickly the way an authenticator's autofill does, a breath on the full code, then the folded "on"
 * state rests longest before it's switched off again.
 */
const BEATS: readonly Beat[] = [
  { phase: "off", ms: 1800 },
  { phase: "setup", ms: 1500 },
  ...[1, 2, 3, 4, 5, 6].map((digits) => ({ phase: "setup" as const, digits, ms: digits === LENGTH ? 520 : 75 })),
  { phase: "on", ms: 2800 },
];

const fromBeat = (step: number): State => {
  const beat = BEATS[step]!;
  return { phase: beat.phase, code: CODE.slice(0, beat.digits ?? 0), alerts: true };
};

const SPRING = { duration: 0.5, bounce: 0.08 };

/** How long a full code shows before it's accepted, in ms. */
const ACCEPT = 450;

/** A QR-like code: three finder squares and a fixed scatter of modules, drawn so no image is needed. */
const SIZE = 21;
const FINDERS = [
  [0, 0],
  [SIZE - 7, 0],
  [0, SIZE - 7],
] as const;
const MODULES: [number, number][] = [];
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    if (FINDERS.some(([fx, fy]) => x >= fx - 1 && x < fx + 8 && y >= fy - 1 && y < fy + 8)) continue;
    if (((x * 37 + y * 61 + x * y * 7) % 11) % 3 === 0) MODULES.push([x, y]);
  }

function Qr() {
  return (
    <svg className="tf-qr" viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} aria-hidden="true" shapeRendering="crispEdges">
      {FINDERS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x + 0.5} y={y + 0.5} width={6} height={6} fill="none" stroke="currentColor" strokeWidth={1} />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
        </g>
      ))}
      {MODULES.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

/** The knob sits at the start or the end of its track, so flipping it is a layout change. */
function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" className="tf-switch" role="switch" aria-checked={on} aria-label={label} onClick={onToggle}>
      <span className="tf-knob" />
    </button>
  );
}

interface TwoFactorDemoProps {
  framed?: boolean;
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function TwoFactorDemo({ framed = true, playing }: TwoFactorDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const input = useRef<HTMLInputElement>(null);
  const accepting = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Someone opened the setup: put them in the code field. The scene never takes focus.
  useEffect(() => {
    if (state.phase === "setup" && !scene.live) input.current?.focus({ preventScroll: true });
  }, [state.phase, scene.live]);

  useEffect(() => () => clearTimeout(accepting.current), []);

  const enter = (value: string) => {
    const code = value.replace(/\D/g, "").slice(0, LENGTH);
    take((s) => ({ ...s, code }));
    clearTimeout(accepting.current);
    if (code.length === LENGTH) accepting.current = setTimeout(() => take((s) => ({ ...s, phase: "on" })), ACCEPT);
  };

  const body = (
    <section ref={scene.ref} className="tf" data-phase={state.phase} aria-label="Two-factor settings">
      {/* The scene's code arrives digit by digit; someone typing is left alone, keys shouldn't animate. */}
      <Remold.Layout trigger={[state.phase, state.alerts, scene.live && state.code.length]} spring={SPRING} className="tf-panel">
        <div className="tf-row">
          <span className="tf-copy">
            <strong>Two-factor authentication</strong>
            {state.phase === "on" ? (
              <span key="on" className="tf-on">
                <Check aria-hidden="true" strokeWidth={2.75} />
                On · Authenticator app
              </span>
            ) : (
              <span key="off">Ask for a code when signing in</span>
            )}
          </span>
          <Switch
            on={state.phase !== "off"}
            label="Two-factor authentication"
            onToggle={() => {
              clearTimeout(accepting.current);
              take((s) => ({ ...s, phase: s.phase === "off" ? "setup" : "off", code: "" }));
            }}
          />
        </div>

        {state.phase === "setup" && (
          <div className="tf-setup">
            <span className="tf-qr-frame">
              <Qr />
            </span>
            <span className="tf-steps">
              <span className="tf-hint" id="tf-hint">
                Scan with your authenticator, then enter the code.
              </span>
              {/* One real input under six boxes: typing, pasting and autofill all work as usual. */}
              <label className="tf-code">
                <input
                  ref={input}
                  className="tf-input"
                  value={state.code}
                  onChange={(event) => enter(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={LENGTH}
                  aria-describedby="tf-hint"
                  aria-label="Six-digit code"
                />
                {Array.from({ length: LENGTH }, (_, i) => (
                  <span
                    key={i}
                    className="tf-digit"
                    data-filled={i < state.code.length ? "" : undefined}
                    data-next={i === state.code.length ? "" : undefined}
                    aria-hidden="true"
                  >
                    {state.code[i] ?? ""}
                  </span>
                ))}
              </label>
            </span>
          </div>
        )}

        <div className="tf-row">
          <span className="tf-copy">
            <strong>Sign-in alerts</strong>
            <span>Email me about new devices</span>
          </span>
          <Switch on={state.alerts} label="Sign-in alerts" onToggle={() => take((s) => ({ ...s, alerts: !s.alerts }))} />
        </div>
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
