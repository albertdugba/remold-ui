"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon } from "@hugeicons/core-free-icons";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef } from "react";
import { Frame } from "./frame";
import { CodeField } from "./code-field";
import { useScene } from "./use-scene";

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
      className="size-[62px] text-zinc-900"
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
      className="flex h-[22px] w-9 flex-none cursor-pointer rounded-full border-0 bg-(--tf-track) p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tf-ink) data-checked:justify-end data-checked:bg-(--tf-on)"
      aria-label={label}
      checked={on}
      onCheckedChange={onToggle}
    >
      <BaseSwitch.Thumb className="size-[18px] rounded-full bg-white dark:data-checked:bg-zinc-900" />
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
    take((current) => ({ ...current, code }));
    clearTimeout(accepting.current);
    if (code.length === LENGTH)
      accepting.current = setTimeout(
        () => take((current) => ({ ...current, phase: "on" })),
        ACCEPT,
      );
  };

  const body = (
    <section
      ref={scene.ref}
      className="grid w-[min(100%,360px)] font-sans text-(--tf-ink) [--tf-faint:#a1a1aa] [--tf-fill:#f4f4f5] [--tf-good:#15803d] [--tf-ink:#18181b] [--tf-line:rgb(24_24_27/0.07)] [--tf-muted:#71717a] [--tf-on:#18181b] [--tf-surface:#ffffff] [--tf-track:#e4e4e7] dark:[--tf-faint:#71717a] dark:[--tf-fill:#2c2c31] dark:[--tf-good:#4ade80] dark:[--tf-ink:#fafafa] dark:[--tf-line:rgb(255_255_255/0.07)] dark:[--tf-muted:#a1a1aa] dark:[--tf-on:#fafafa] dark:[--tf-surface:#232327] dark:[--tf-track:#3a3a40]"
      data-phase={state.phase}
      aria-label="Two-factor settings"
    >
      <Remold.Layout
        trigger={[state.phase, state.alerts]}
        spring={SPRING}
        choreography
        className="grid rounded-[18px] bg-(--tf-surface) px-4 py-1 in-[.rm-stage]:shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] dark:in-[.rm-stage]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
      >
        <div className="flex items-center gap-3.5 py-3.5 not-first:shadow-[0_-1px_0_var(--tf-line)]">
          <span className="grid min-w-0 flex-1 gap-0.5 [&>strong]:text-[13.5px] [&>strong]:font-semibold">
            <strong>Two-factor authentication</strong>
            {state.phase === "on" ? (
              <span key="on" className="inline-flex items-center gap-[5px] text-[12.5px] font-medium text-(--tf-good) [&_svg]:size-[13px]">
                <HugeiconsIcon icon={CheckIcon} aria-hidden="true" strokeWidth={2.75} />
                On · Authenticator app
              </span>
            ) : (
              <span key="off" className="text-[12.5px] text-(--tf-muted)">Ask for a code when signing in</span>
            )}
          </span>
          <Switch
            on={state.phase !== "off"}
            label="Two-factor authentication"
            onToggle={() => {
              clearTimeout(accepting.current);
              take((current) => ({
                ...current,
                phase: current.phase === "off" ? "setup" : "off",
                code: "",
              }));
            }}
          />
        </div>

        {state.phase === "setup" && (
          <div className="grid gap-3.5 pt-0.5 pb-[18px]">
            <div className="flex items-center gap-3.5">
              <span className="grid size-[76px] flex-none place-items-center rounded-xl bg-(--tf-fill) dark:bg-white">
                <Qr />
              </span>
              <span className="text-[12.5px] leading-[1.45] text-pretty text-(--tf-muted)" id="tf-hint">
                Scan with your authenticator app, then enter the 6-digit code
                it shows.
              </span>
            </div>
            <CodeField
              className="justify-self-center [--cf-cell:var(--tf-fill)]! [--cf-ink:var(--tf-ink)]!"
              value={state.code}
              onChange={enter}
              inputRef={input}
              describedBy="tf-hint"
            />
          </div>
        )}

        <div className="flex items-center gap-3.5 py-3.5 not-first:shadow-[0_-1px_0_var(--tf-line)]">
          <span className="grid min-w-0 flex-1 gap-0.5 [&>strong]:text-[13.5px] [&>strong]:font-semibold">
            <strong>Sign-in alerts</strong>
            <span className="text-[12.5px] text-(--tf-muted)">Email me about new devices</span>
          </span>
          <Switch
            on={state.alerts}
            label="Sign-in alerts"
            onToggle={() => take((current) => ({ ...current, alerts: !current.alerts }))}
          />
        </div>
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
