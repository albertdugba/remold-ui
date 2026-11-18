"use client";

import type { PainterFrame } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { useRef, useState } from "react";
import { Frame, Segmented } from "./frame";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

type Look = { scale: number; flow: number; breath: number; gather: number };

const LOOKS: Record<OrbState, Look> = {
  idle: { scale: 0.92, flow: 0.18, breath: 0.018, gather: 0 },
  listening: { scale: 1, flow: 0.35, breath: 0.01, gather: 0 },
  thinking: { scale: 0.86, flow: 0.12, breath: 0.03, gather: 1 },
  speaking: { scale: 1, flow: 0.7, breath: 0.006, gather: 0 },
};

const PALETTE = { sky: "#e3f1ff", mid: "#8cc8ff", deep: "#2563eb", cloud: "#ffffff" };

const CLOUDS = [
  { orbit: 0.42, size: 0.62, speed: 0.9, phase: 0.2, alpha: 0.85 },
  { orbit: 0.3, size: 0.55, speed: -0.65, phase: 2.1, alpha: 0.7 },
  { orbit: 0.55, size: 0.48, speed: 0.5, phase: 4.0, alpha: 0.75 },
  { orbit: 0.2, size: 0.4, speed: -1.1, phase: 1.1, alpha: 0.6 },
  { orbit: 0.6, size: 0.35, speed: 1.3, phase: 3.3, alpha: 0.55 },
] as const;

const SOFT = { duration: 0.7, bounce: 0 };
const rgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)).join(", ");

function CloudOrb({ state, size = 220 }: { state: OrbState; size?: number }) {
  const voice = useRef({ loud: 0, drift: 0 });

  const loudness = (time: number) => {
    if (state === "speaking")
      return 0.3 + 0.5 * Math.abs(Math.sin(time * 6.3)) * (0.6 + 0.4 * Math.sin(time * 1.7));
    if (state === "listening")
      return 0.1 + 0.2 * Math.abs(Math.sin(time * 2.9)) * (0.5 + 0.5 * Math.sin(time * 0.9));
    return 0;
  };

  const draw = (
    ctx: CanvasRenderingContext2D,
    { width, values: look, time, dt, still }: PainterFrame<Look>,
  ) => {
    const target = still ? 0 : loudness(time);
    voice.current.loud += (target - voice.current.loud) * (target > voice.current.loud ? 0.3 : 0.07);
    voice.current.drift += (look.flow + 0.6 * voice.current.loud) * dt;
    const { loud, drift } = voice.current;
    const palette = PALETTE;
    const center = width / 2;
    const R = width * 0.42 * look.scale * (1 + look.breath * Math.sin(time * 1.6) + 0.07 * loud);
    const fill = (style: CanvasGradient) => {
      ctx.fillStyle = style;
      ctx.fillRect(center - R, center - R, R * 2, R * 2);
    };

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, R, 0, Math.PI * 2);
    ctx.clip();

    const sky = ctx.createLinearGradient(0, center - R, 0, center + R);
    sky.addColorStop(0, palette.sky);
    sky.addColorStop(0.55, palette.mid);
    sky.addColorStop(1, palette.deep);
    fill(sky);

    for (const cloud of CLOUDS) {
      const angle = drift * cloud.speed + cloud.phase;
      const orbit = cloud.orbit * (1 - 0.55 * look.gather) * R;
      const x = center + Math.cos(angle) * orbit;
      const y = center + Math.sin(angle * 0.8) * orbit * 0.85 - R * 0.08;
      const r = R * cloud.size * (1 + 0.18 * loud + 0.05 * Math.sin(time * 1.3 + cloud.phase));
      const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, `rgba(${rgb(palette.cloud)}, ${cloud.alpha})`);
      puff.addColorStop(0.55, `rgba(${rgb(palette.cloud)}, ${cloud.alpha * 0.35})`);
      puff.addColorStop(1, `rgba(${rgb(palette.cloud)}, 0)`);
      fill(puff);
    }

    const dx = center + Math.cos(drift * 0.4) * R * 0.3;
    const depth = ctx.createRadialGradient(dx, center + R * 0.75, 0, dx, center + R * 0.75, R * 0.9);
    depth.addColorStop(0, `rgba(${rgb(palette.deep)}, 0.55)`);
    depth.addColorStop(1, `rgba(${rgb(palette.deep)}, 0)`);
    fill(depth);

    const shine = ctx.createRadialGradient(
      center - R * 0.35,
      center - R * 0.45,
      0,
      center - R * 0.35,
      center - R * 0.45,
      R * 0.8,
    );
    shine.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    fill(shine);
    const shade = ctx.createRadialGradient(center, center, R * 0.7, center, center, R);
    shade.addColorStop(0, `rgba(${rgb(palette.deep)}, 0)`);
    shade.addColorStop(1, `rgba(${rgb(palette.deep)}, 0.22)`);
    fill(shade);
    ctx.restore();
  };

  return (
    <Remold.Canvas
      values={LOOKS[state]}
      spring={SOFT}
      continuous
      draw={draw}
      label={`Voice orb: ${state}`}
      style={{ display: "block", width: size, height: size }}
    />
  );
}

const STATES: readonly OrbState[] = ["idle", "listening", "thinking", "speaking"];

export function CanvasDemo() {
  const [state, setState] = useState<OrbState>("listening");
  return (
    <Frame>
      <div style={{ display: "grid", justifyItems: "center", gap: 20 }}>
        <CloudOrb state={state} />
        <Segmented label="State" value={state} onChange={setState} options={STATES} />
      </div>
    </Frame>
  );
}
