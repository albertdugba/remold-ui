"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef } from "react";
import { Frame } from "./frame";
import { CodeField } from "./code-field";
import { useScene } from "./use-scene";
import "./two-factor.css";

const CODE = "482915";
const LENGTH = CODE.length;

type Phase = "off" | "setup" | "on";

interface State {
  phase: Phase;

  code: string;
  alerts: boolean;
}

interface Beat {
  phase: Phase;

  ms: number;

  digits?: number;
}

const BEATS: readonly Beat[] = [
  { phase: "off", ms: 1800 },
  { phase: "setup", ms: 1500 },
  ...[1, 2, 3, 4, 5, 6].map((digits) => ({
    phase: "setup" as const,
    digits,
    ms: digits === LENGTH ? 520 : 75,
  })),
  { phase: "on", ms: 2800 },
];

const fromBeat = (step: number): State => {
  const beat = BEATS[step]!;
  return {
    phase: beat.phase,
    code: CODE.slice(0, beat.digits ?? 0),
    alerts: true,
  };
};

const SPRING = { duration: 0.5, bounce: 0.08 };

const ACCEPT = 450;

const SIZE = 21;
const FINDERS = [
  [0, 0],
  [SIZE - 7, 0],
  [0, SIZE - 7],
] as const;
const MODULES: [number, number][] = [];
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    if (
      FINDERS.some(
        ([fx, fy]) => x >= fx - 1 && x < fx + 8 && y >= fy - 1 && y < fy + 8,
      )
    )
      continue;
    if (((x * 37 + y * 61 + x * y * 7) % 11) % 3 === 0) MODULES.push([x, y]);
  }

function Qr() {
  return (
    <svg
      className="tf-qr"
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {FINDERS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={6}
            height={6}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
        </g>
      ))}
      {MODULES.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function Switch({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <BaseSwitch.Root
      className="tf-switch"
      aria-label={label}
      checked={on}
      onCheckedChange={onToggle}
    >
      <BaseSwitch.Thumb className="tf-knob" />
    </BaseSwitch.Root>
  );
}

interface TwoFactorDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function TwoFactorDemo({ framed = true, playing }: TwoFactorDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const input = useRef<HTMLInputElement>(null);
  const accepting = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (state.phase === "setup" && !scene.live)
      input.current?.focus({ preventScroll: true });
  }, [state.phase, scene.live]);

  useEffect(() => () => clearTimeout(accepting.current), []);

  const enter = (value: string) => {
    const code = value.replace(/\D/g, "").slice(0, LENGTH);
    take((s) => ({ ...s, code }));
    clearTimeout(accepting.current);
    if (code.length === LENGTH)
      accepting.current = setTimeout(
        () => take((s) => ({ ...s, phase: "on" })),
        ACCEPT,
      );
  };

  const body = (
    <section
      ref={scene.ref}
      className="tf"
      data-phase={state.phase}
      aria-label="Two-factor settings"
    >
      <Remold.Layout
        trigger={[state.phase, state.alerts]}
        spring={SPRING}
        className="tf-panel"
      >
        <div className="tf-row">
          <span className="tf-copy">
            <strong>Two-factor authentication</strong>
            {state.phase === "on" ? (
              <span key="on" className="tf-on">
                <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" strokeWidth={2.75} />
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
              take((s) => ({
                ...s,
                phase: s.phase === "off" ? "setup" : "off",
                code: "",
              }));
            }}
          />
        </div>

        {state.phase === "setup" && (
          <div className="tf-setup">
            <div className="tf-scan">
              <span className="tf-qr-frame">
                <Qr />
              </span>
              <span className="tf-hint" id="tf-hint">
                Scan with your authenticator app, then enter the 6-digit code
                it shows.
              </span>
            </div>
            <CodeField
              className="tf-code"
              value={state.code}
              onChange={enter}
              inputRef={input}
              describedBy="tf-hint"
            />
          </div>
        )}

        <div className="tf-row">
          <span className="tf-copy">
            <strong>Sign-in alerts</strong>
            <span>Email me about new devices</span>
          </span>
          <Switch
            on={state.alerts}
            label="Sign-in alerts"
            onToggle={() => take((s) => ({ ...s, alerts: !s.alerts }))}
          />
        </div>
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
