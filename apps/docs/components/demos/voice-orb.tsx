"use client";
/**
 * VoiceOrb — a living voice/agent orb on a canvas. The sphere isn't a circle: its silhouette is a
 * blob whose edge undulates with the voice, with light swirling inside it, a moving specular
 * highlight and a soft glow that breathes. Every state (idle, listening, thinking, speaking) is a
 * set of spring targets, so it flows between them.
 *
 * Drive it two ways: pass a `level` (0–1) from your own audio or agent, or set `mic` to read the
 * microphone. With neither, it simulates a believable voice while speaking or listening. The
 * incoming sound is split into three bands — bass swells the body, the mids drive the undulation,
 * the treble sharpens the surface — so it reacts like something alive, not a pulsing circle.
 */
import { value, type AnimatedValue } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { springs, Remold, useAutoplay } from "@remold-ui/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Mic, MicOff } from "lucide-react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";
export type OrbTheme = "aurora" | "ember" | "mono";

/** Each icon is exactly three strokes, so each stroke morphs straight to its partner. */
const ICONS: Record<OrbState, string> = {
  idle: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3ZM6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3",
  listening: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3ZM6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3",
  thinking: "M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6ZM18.5 15v4M16.5 17h4",
  speaking: "M7 9.5v5M12 6v12M17 9.5v5",
};

interface Look {
  radius: number;
  glow: number;
  swirl: number;
  wobble: number;
  rings: number;
  arc: number;
}
const LOOKS: Record<OrbState, Look> = {
  idle: { radius: 0.3, glow: 0.3, swirl: 0.3, wobble: 0.022, rings: 0, arc: 0 },
  listening: { radius: 0.32, glow: 0.52, swirl: 0.55, wobble: 0.03, rings: 1, arc: 0 },
  thinking: { radius: 0.285, glow: 0.5, swirl: 1.9, wobble: 0.028, rings: 0, arc: 1 },
  speaking: { radius: 0.33, glow: 0.72, swirl: 1.0, wobble: 0.05, rings: 0, arc: 0 },
};

/** Colour identities: a light and a deep colour per state. */
const THEMES: Record<OrbTheme, Record<OrbState, [string, string]>> = {
  aurora: {
    idle: ["#9db4ff", "#3b4fd6"],
    listening: ["#7fe3ff", "#2f6bf0"],
    thinking: ["#c9b3ff", "#6d28d9"],
    speaking: ["#aab6ff", "#4f46e5"],
  },
  ember: {
    idle: ["#ffd79a", "#d9480f"],
    listening: ["#ffcf87", "#e8590c"],
    thinking: ["#ffb4a2", "#c92a2a"],
    speaking: ["#ffc078", "#e8590c"],
  },
  mono: {
    idle: ["#e5e7eb", "#6b7280"],
    listening: ["#f3f4f6", "#4b5563"],
    thinking: ["#e5e7eb", "#374151"],
    speaking: ["#f9fafb", "#4b5563"],
  },
};

const POINTS = 96;
const SHAPE = { duration: 0.75, bounce: 0.28 };
const SOFT = { duration: 0.6, bounce: 0 };
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface VoiceOrbProps {
  state?: OrbState;
  /** 0–1 audio amplitude. Leave undefined to simulate a voice while speaking/listening. */
  level?: number;
  /** Read the real microphone. Overrides `level`. Asks permission the first time. */
  mic?: boolean;
  /** Colour identity. */
  theme?: OrbTheme;
  /** CSS size in px (square). */
  size?: number;
  showIcon?: boolean;
  className?: string;
  style?: CSSProperties;
  onMicError?: (error: unknown) => void;
}

export function VoiceOrb({
  state = "idle",
  level,
  mic = false,
  theme = "aurora",
  size = 260,
  showIcon = true,
  className,
  style,
  onMicError,
}: VoiceOrbProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<((s: OrbState) => void) | null>(null);
  const levelProp = useRef<number | undefined>(level);
  levelProp.current = level;
  const micOn = useRef(mic);
  micOn.current = mic;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const analyser = useRef<AnalyserNode | null>(null);
  const micError = useRef(onMicError);
  micError.current = onMicError;

  // Microphone, opt-in. Overrides `level` while it's on.
  useEffect(() => {
    if (!mic) return;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(s);
        const node = ctx.createAnalyser();
        node.fftSize = 256;
        node.smoothingTimeConstant = 0.78;
        src.connect(node);
        analyser.current = node;
      })
      .catch((e) => micError.current?.(e));
    return () => {
      cancelled = true;
      analyser.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [mic]);

  useEffect(() => {
    const element = canvas.current!;
    const ctx = element.getContext("2d")!;
    const still = prefersReducedMotion();

    let look = LOOKS[state];
    let time = 0;
    let swirlAngle = 0;
    let bassS = 0;
    let midS = 0;
    let trebleS = 0;
    const radius = value(look.radius, { spring: SHAPE, precision: 0.0005 });
    const glow = value(look.glow, { spring: SOFT, precision: 0.002 });
    const swirl = value(look.swirl, { spring: SOFT, precision: 0.001 });
    const wobble = value(look.wobble, { spring: SOFT, precision: 0.001 });
    const rings = value(look.rings, { spring: SOFT, precision: 0.002 });
    const arc = value(look.arc, { spring: SOFT, precision: 0.002 });
    const [li0, de0] = THEMES[themeRef.current][state];
    const colour = [...rgb(li0), ...rgb(de0)].map((c) => value(c, { spring: SOFT, precision: 0.5 }));
    const all: AnimatedValue[] = [radius, glow, swirl, wobble, rings, arc, ...colour];
    const bins = new Uint8Array(128);
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += bins[i]!;
      return s / (b - a) / 255;
    };

    const stateOf = (l: Look): OrbState => (Object.keys(LOOKS) as OrbState[]).find((s) => LOOKS[s] === l) ?? "idle";

    // The target per band: mic → analyser, else the prop, else a voice-like simulation.
    const targetBands = (s: OrbState): [number, number, number] => {
      if (micOn.current && analyser.current) {
        analyser.current.getByteFrequencyData(bins);
        return [clamp01(avg(1, 6) * 1.6), clamp01(avg(6, 20) * 1.9), clamp01(avg(20, 48) * 2.4)];
      }
      if (levelProp.current != null) {
        const l = clamp01(levelProp.current);
        return [l, l, l * (0.5 + 0.5 * Math.abs(Math.sin(time * 17)))];
      }
      if (s === "speaking") {
        const l = 0.25 + 0.55 * Math.abs(Math.sin(time * 7.1)) * (0.5 + 0.5 * Math.sin(time * 2.0)) + 0.2 * Math.abs(Math.sin(time * 15 + 1));
        return [l * 0.9, l, clamp01(l * (0.4 + 0.6 * Math.abs(Math.sin(time * 21))))];
      }
      if (s === "listening") {
        const l = 0.08 + 0.22 * Math.abs(Math.sin(time * 3.3)) * (0.5 + 0.5 * Math.sin(time * 1.1));
        return [l, l, l * 0.6];
      }
      return [0, 0, 0];
    };

    let size0 = 0;
    let ratio = 1;
    const resize = () => {
      size0 = element.clientWidth;
      ratio = Math.min(2, devicePixelRatio || 1);
      element.width = Math.round(size0 * ratio);
      element.height = Math.round(size0 * ratio);
    };

    // A smooth closed blob: low harmonics give the slow heave, high ones the crisp detail.
    const blob = (cx: number, cy: number, R: number, lowAmp: number, highAmp: number) => {
      const px: number[] = [];
      const py: number[] = [];
      for (let i = 0; i < POINTS; i++) {
        const t = (i / POINTS) * Math.PI * 2;
        const low = 0.52 * Math.sin(t * 2 + time * 0.9) + 0.3 * Math.sin(t * 3 - time * 0.7 + 1.3);
        const high = 0.18 * Math.sin(t * 5 + time * 1.25) + 0.12 * Math.sin(t * 7 - time * 1.6);
        const r = R * (1 + lowAmp * low + highAmp * high);
        px.push(cx + Math.cos(t) * r);
        py.push(cy + Math.sin(t) * r);
      }
      ctx.beginPath();
      const mx = (px[POINTS - 1]! + px[0]!) / 2;
      const my = (py[POINTS - 1]! + py[0]!) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < POINTS; i++) {
        const nx = (px[i]! + px[(i + 1) % POINTS]!) / 2;
        const ny = (py[i]! + py[(i + 1) % POINTS]!) / 2;
        ctx.quadraticCurveTo(px[i]!, py[i]!, nx, ny);
      }
      ctx.closePath();
    };

    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, size0, size0);
      const c = size0 / 2;
      const bass = still ? 0 : bassS;
      const mid = still ? 0 : midS;
      const treble = still ? 0 : trebleS;
      const [r1, g1, b1, r2, g2, b2] = colour.map((v) => Math.round(Math.max(0, Math.min(255, v.current))));
      const light = `${r1}, ${g1}, ${b1}`;
      const deep = `${r2}, ${g2}, ${b2}`;
      const R = radius.current * size0 * (1 + 0.06 * bass + 0.035 * mid);
      const lowAmp = wobble.current + 0.09 * mid;
      const highAmp = wobble.current * 0.5 + 0.11 * treble;
      const glowI = glow.current + 0.4 * mid + 0.15 * bass;

      // Volumetric glow, kept inside the canvas so it never shows an edge.
      const halo = ctx.createRadialGradient(c, c, R * 0.55, c, c, Math.min(R * 2.2, c - 1));
      halo.addColorStop(0, `rgba(${light}, ${0.42 * glowI})`);
      halo.addColorStop(0.6, `rgba(${light}, ${0.12 * glowI})`);
      halo.addColorStop(1, `rgba(${light}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size0, size0);

      // Listening: faint intake rings.
      if (rings.current > 0.01) {
        for (let k = 0; k < 3; k++) {
          const t = (time * 0.4 + k / 3) % 1;
          ctx.strokeStyle = `rgba(${light}, ${(1 - t) * 0.4 * rings.current})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(c, c, R * (1.04 + 0.55 * t), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // The orb body.
      ctx.save();
      blob(c, c, R, lowAmp, highAmp);
      ctx.clip();
      const base = ctx.createLinearGradient(c - R, c - R * 1.1, c + R, c + R);
      base.addColorStop(0, `rgb(${light})`);
      base.addColorStop(1, `rgb(${deep})`);
      ctx.fillStyle = base;
      ctx.fillRect(c - R * 1.6, c - R * 1.6, R * 3.2, R * 3.2);
      const lightBlobs: [number, number, string][] = [
        [0, 0.6 + 0.35 * mid, "255, 255, 255"],
        [Math.PI * 0.7, 0.5, deep],
        [Math.PI * 1.4, 0.4 + 0.3 * mid, light],
      ];
      for (const [offset, alpha, tint] of lightBlobs) {
        const a = swirlAngle + offset;
        const x = c + Math.cos(a) * R * 0.42;
        const y = c + Math.sin(a * 1.25) * R * 0.38;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * (0.85 + 0.15 * mid));
        g.addColorStop(0, `rgba(${tint}, ${alpha})`);
        g.addColorStop(1, `rgba(${tint}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(c - R * 1.6, c - R * 1.6, R * 3.2, R * 3.2);
      }
      const hx = c - R * 0.33 + Math.cos(time * 0.6) * R * 0.05;
      const hy = c - R * 0.42 + Math.sin(time * 0.5) * R * 0.04;
      const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.75);
      shine.addColorStop(0, `rgba(255, 255, 255, ${0.6 + 0.3 * treble})`);
      shine.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = shine;
      ctx.fillRect(c - R * 1.6, c - R * 1.6, R * 3.2, R * 3.2);
      ctx.restore();

      // A soft rim light picks out the deforming edge; treble sharpens it.
      ctx.save();
      blob(c, c, R, lowAmp, highAmp);
      ctx.lineWidth = Math.max(1, size0 * 0.006);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + 0.28 * treble + 0.12 * mid})`;
      ctx.stroke();
      ctx.restore();

      // Thinking: a bright comet circling the orb.
      if (arc.current > 0.01) {
        const ringR = R + size0 * 0.05;
        const head = time * 4.2;
        const sweep = ctx.createConicGradient(head - 1.4, c, c);
        sweep.addColorStop(0, `rgba(${light}, 0)`);
        sweep.addColorStop(0.22, `rgba(255, 255, 255, ${0.95 * arc.current})`);
        sweep.addColorStop(0.2201, `rgba(${light}, 0)`);
        ctx.strokeStyle = sweep;
        ctx.lineCap = "round";
        ctx.lineWidth = size0 * 0.016;
        ctx.beginPath();
        ctx.arc(c, c, ringR, head - 1.4, head);
        ctx.stroke();
      }
    };

    let visible = true;
    let stop: (() => void) | null = null;
    const start = () => {
      if (stop || still || !visible) return;
      stop = frames((dt) => {
        time += dt;
        for (const v of all) v.step(dt);
        swirlAngle += (swirl.current + 1.6 * midS) * dt;
        const [tb, tm, tt] = targetBands(stateOf(look));
        // Fast attack, slow release, so it leaps to the voice and eases back.
        const follow = (cur: number, tgt: number) => cur + (tgt - cur) * (tgt > cur ? 0.35 : 0.08);
        bassS = follow(bassS, tb);
        midS = follow(midS, tm);
        trebleS = follow(trebleS, tt);
        if (look === LOOKS.idle && radius.settled) radius.set(look.radius * (1 + 0.02 * Math.sin(time * 1.5)));
        draw();
        if (!visible) stop = null;
        return visible;
      });
    };

    engine.current = (next) => {
      look = LOOKS[next];
      const [li, de] = THEMES[themeRef.current][next];
      const targets: [AnimatedValue, number][] = [
        [radius, look.radius],
        [glow, look.glow],
        [swirl, look.swirl],
        [wobble, look.wobble],
        [rings, look.rings],
        [arc, look.arc],
        ...[...rgb(li), ...rgb(de)].map((t, i): [AnimatedValue, number] => [colour[i]!, t]),
      ];
      for (const [v, t] of targets) (still ? v.set(t) : v.to(t));
      if (still) draw();
      start();
    };

    const resizer = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizer.observe(element);
    const watcher = new IntersectionObserver(([e]) => {
      visible = e?.isIntersecting ?? true;
      start();
    });
    watcher.observe(element);
    resize();
    draw();
    start();
    return () => {
      stop?.();
      resizer.disconnect();
      watcher.disconnect();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => engine.current?.(state), [state, theme]);

  return (
    <div className={`relative grid place-items-center ${className ?? ""}`} style={{ width: size, height: size, ...style }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label={`Voice orb: ${state}`} />
      {showIcon && (
        <Remold.Icon
          className="relative text-white"
          style={{ width: size * 0.17, height: size * 0.17 }}
          d={ICONS[state]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          spring={springs.snappy}
          aria-hidden
        />
      )}
    </div>
  );
}

const DEMO_STATES: OrbState[] = ["idle", "listening", "thinking", "speaking"];
const LABELS: Record<OrbState, string> = {
  idle: "Ready when you are",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking",
};
const DEMO_THEMES: OrbTheme[] = ["aurora", "ember", "mono"];

export function VoiceOrbDemo({ index }: { index?: number }) {
  const auto = useAutoplay(DEMO_STATES.length, { every: 2600 });
  const step = index != null ? index % DEMO_STATES.length : auto.step;
  const state = DEMO_STATES[step]!;
  const [mic, setMic] = useState(false);
  const [micFailed, setMicFailed] = useState(false);
  const [theme, setTheme] = useState<OrbTheme>("aurora");

  return (
    <div
      ref={auto.ref}
      className="flex min-h-[440px] w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-b from-[#0c1020] to-[#05060d] py-8 font-sans select-none"
    >
      <VoiceOrb
        state={state}
        mic={mic}
        theme={theme}
        size={240}
        onMicError={() => {
          setMic(false);
          setMicFailed(true);
        }}
      />

      <Remold.Text className="text-[15px] font-medium text-white/80">{LABELS[state]}</Remold.Text>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {DEMO_STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => auto.setStep(DEMO_STATES.indexOf(s))}
            aria-pressed={s === state}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium capitalize transition ${
              s === state ? "border-white bg-white text-zinc-900" : "border-white/20 text-white/70 hover:border-white/45 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setMicFailed(false);
            setMic((m) => !m);
          }}
          aria-pressed={mic}
          className={`ml-1 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition ${
            mic ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : "border-white/20 text-white/70 hover:border-white/45 hover:text-white"
          }`}
        >
          {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          {mic ? "Mic on" : "Use mic"}
        </button>
      </div>

      <div className="flex items-center gap-1">
        {DEMO_THEMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={t === theme}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition ${
              t === theme ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {micFailed && <p className="text-[12px] text-white/40">No microphone access — showing a simulated voice.</p>}
    </div>
  );
}
