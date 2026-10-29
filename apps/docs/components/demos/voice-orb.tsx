"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeftRightIcon } from "@hugeicons/core-free-icons";
import type { PainterFrame } from "@remold-ui/canvas";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import "./voice-orb.css";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";
export type OrbTheme = "aurora" | "ember" | "mono";

type Look = { scale: number; flow: number; breath: number; gather: number };

const LOOKS: Record<OrbState, Look> = {
  idle: { scale: 0.92, flow: 0.18, breath: 0.018, gather: 0 },
  listening: { scale: 1, flow: 0.35, breath: 0.01, gather: 0 },
  thinking: { scale: 0.86, flow: 0.12, breath: 0.03, gather: 1 },
  speaking: { scale: 1, flow: 0.7, breath: 0.006, gather: 0 },
};

const PALETTES: Record<
  OrbTheme,
  { sky: string; mid: string; deep: string; cloud: string }
> = {
  aurora: { sky: "#e3f1ff", mid: "#8cc8ff", deep: "#2563eb", cloud: "#ffffff" },
  ember: { sky: "#fff3e3", mid: "#ffc58a", deep: "#ea580c", cloud: "#fffaf3" },
  mono: { sky: "#f5f5f5", mid: "#c4c4c4", deep: "#3f3f46", cloud: "#ffffff" },
};

const CLOUDS = [
  { orbit: 0.42, size: 0.62, speed: 0.9, phase: 0.2, alpha: 0.85 },
  { orbit: 0.3, size: 0.55, speed: -0.65, phase: 2.1, alpha: 0.7 },
  { orbit: 0.55, size: 0.48, speed: 0.5, phase: 4.0, alpha: 0.75 },
  { orbit: 0.2, size: 0.4, speed: -1.1, phase: 1.1, alpha: 0.6 },
  { orbit: 0.6, size: 0.35, speed: 1.3, phase: 3.3, alpha: 0.55 },
] as const;

const SOFT = { duration: 0.7, bounce: 0 };
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");

export interface VoiceOrbProps {
  state?: OrbState;

  level?: number;

  theme?: OrbTheme;

  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function VoiceOrb({
  state = "idle",
  level,
  theme = "aurora",
  size = 260,
  className,
  style,
}: VoiceOrbProps) {
  const voice = useRef({ loud: 0, drift: 0 });

  const loudness = (time: number) => {
    if (level != null) return clamp01(level);
    if (state === "speaking")
      return (
        0.3 +
        0.5 *
          Math.abs(Math.sin(time * 6.3)) *
          (0.6 + 0.4 * Math.sin(time * 1.7))
      );
    if (state === "listening")
      return (
        0.1 +
        0.2 *
          Math.abs(Math.sin(time * 2.9)) *
          (0.5 + 0.5 * Math.sin(time * 0.9))
      );
    return 0;
  };

  const draw = (
    ctx: CanvasRenderingContext2D,
    { width, values: v, time, dt, still }: PainterFrame<Look>,
  ) => {
    const target = still ? 0 : loudness(time);
    voice.current.loud +=
      (target - voice.current.loud) *
      (target > voice.current.loud ? 0.3 : 0.07);
    voice.current.drift += (v.flow + 0.6 * voice.current.loud) * dt;
    const { loud, drift } = voice.current;
    const p = PALETTES[theme];
    const c = width / 2;
    const R =
      width *
      0.42 *
      v.scale *
      (1 + v.breath * Math.sin(time * 1.6) + 0.07 * loud);
    const fill = (style: CanvasGradient) => {
      ctx.fillStyle = style;
      ctx.fillRect(c - R, c - R, R * 2, R * 2);
    };

    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.clip();

    const sky = ctx.createLinearGradient(0, c - R, 0, c + R);
    sky.addColorStop(0, p.sky);
    sky.addColorStop(0.55, p.mid);
    sky.addColorStop(1, p.deep);
    fill(sky);

    for (const cloud of CLOUDS) {
      const a = drift * cloud.speed + cloud.phase;
      const orbit = cloud.orbit * (1 - 0.55 * v.gather) * R;
      const x = c + Math.cos(a) * orbit;
      const y = c + Math.sin(a * 0.8) * orbit * 0.85 - R * 0.08;
      const r =
        R *
        cloud.size *
        (1 + 0.18 * loud + 0.05 * Math.sin(time * 1.3 + cloud.phase));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb(p.cloud)}, ${cloud.alpha})`);
      g.addColorStop(0.55, `rgba(${rgb(p.cloud)}, ${cloud.alpha * 0.35})`);
      g.addColorStop(1, `rgba(${rgb(p.cloud)}, 0)`);
      fill(g);
    }

    const dx = c + Math.cos(drift * 0.4) * R * 0.3;
    const depth = ctx.createRadialGradient(
      dx,
      c + R * 0.75,
      0,
      dx,
      c + R * 0.75,
      R * 0.9,
    );
    depth.addColorStop(0, `rgba(${rgb(p.deep)}, 0.55)`);
    depth.addColorStop(1, `rgba(${rgb(p.deep)}, 0)`);
    fill(depth);

    const shine = ctx.createRadialGradient(
      c - R * 0.35,
      c - R * 0.45,
      0,
      c - R * 0.35,
      c - R * 0.45,
      R * 0.8,
    );
    shine.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    fill(shine);
    const shade = ctx.createRadialGradient(c, c, R * 0.7, c, c, R);
    shade.addColorStop(0, `rgba(${rgb(p.deep)}, 0)`);
    shade.addColorStop(1, `rgba(${rgb(p.deep)}, 0.22)`);
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
      className={className}
      style={{ display: "block", width: size, height: size, ...style }}
    />
  );
}

const LANGUAGES = [
  { code: "es", locale: "es-ES", name: "Spanish" },
  { code: "en", locale: "en-US", name: "English" },
] as const;

type Translator = { translate(text: string): Promise<string> };
type TranslatorApi = {
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<Translator>;
};

type Phase = "idle" | "listening" | "hearing" | "translating" | "speaking";

const ORB: Record<Phase, OrbState> = {
  idle: "idle",
  listening: "listening",
  hearing: "listening",
  translating: "thinking",
  speaking: "speaking",
};
const STATUS: Record<Phase, string> = {
  idle: "Tap to speak",
  listening: "Listening",
  hearing: "Hearing you",
  translating: "Translating",
  speaking: "Speaking",
};

interface Line {
  phase: Phase;

  from: 0 | 1;
  heard: string;
  said: string;
}

const SCENE: readonly (Line & { ms: number })[] = [
  { phase: "idle", from: 0, heard: "", said: "", ms: 1600 },
  { phase: "listening", from: 0, heard: "", said: "", ms: 900 },
  {
    phase: "hearing",
    from: 0,
    heard: "¿Dónde está",
    said: "Where is",
    ms: 900,
  },
  {
    phase: "hearing",
    from: 0,
    heard: "¿Dónde está la estación",
    said: "Where is the season",
    ms: 1000,
  },
  {
    phase: "translating",
    from: 0,
    heard: "¿Dónde está la estación de tren?",
    said: "Where is the season",
    ms: 700,
  },
  {
    phase: "speaking",
    from: 0,
    heard: "¿Dónde está la estación de tren?",
    said: "Where is the train station?",
    ms: 2400,
  },
  { phase: "idle", from: 1, heard: "", said: "", ms: 1200 },
  { phase: "listening", from: 1, heard: "", said: "", ms: 800 },
  { phase: "hearing", from: 1, heard: "How long", said: "Cuánto", ms: 800 },
  {
    phase: "hearing",
    from: 1,
    heard: "How long does it take to walk?",
    said: "¿Cuánto tarda",
    ms: 900,
  },
  {
    phase: "translating",
    from: 1,
    heard: "How long does it take to walk?",
    said: "¿Cuánto tarda",
    ms: 700,
  },
  {
    phase: "speaking",
    from: 1,
    heard: "How long does it take to walk?",
    said: "¿Cuánto se tarda a pie?",
    ms: 2400,
  },
];

type Turn = {
  from: 0 | 1;
  said: string;
  phase: "idle" | "translating" | "speaking";
};

export function VoiceOrbDemo({ index }: { index?: number } = {}) {
  const auto = useAutoplay(SCENE.length, { every: (i) => SCENE[i]!.ms });
  const scripted = SCENE[index != null ? index % SCENE.length : auto.step]!;
  const speech = useSpeechRecognition();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const translator = useRef<Translator | null>(null);
  const translation = useRef<Promise<string>>(Promise.resolve(""));

  const line: Line = turn
    ? {
        from: turn.from,
        phase: speech.listening
          ? speech.transcript
            ? "hearing"
            : "listening"
          : turn.phase,
        heard: speech.transcript,
        said: turn.said,
      }
    : scripted;
  const [source, target] =
    line.from === 0 ? LANGUAGES : ([LANGUAGES[1], LANGUAGES[0]] as const);
  const update = (patch: Partial<Turn>) =>
    setTurn((t) => t && { ...t, ...patch });

  useEffect(() => {
    if (!turn || !speech.transcript || !translator.current) return;
    let current = true;
    translation.current = translator.current.translate(speech.transcript);
    translation.current.then(
      (said) => current && update({ said }),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [speech.transcript]);

  const wasListening = useRef(false);
  useEffect(() => {
    const stopped = wasListening.current && !speech.listening;
    wasListening.current = speech.listening;
    if (!stopped || !turn) return;
    if (!speech.isMicrophoneAvailable)
      setNote(
        "Microphone access was refused. Allow it for this site and tap the orb again.",
      );
    if (!speech.transcript) return update({ phase: "idle" });
    update({ phase: "translating" });
    void translation.current
      .catch(() => "")
      .then((said) => {
        if (!said) return update({ phase: "idle" });
        const voice = new SpeechSynthesisUtterance(said);
        voice.lang = target.locale;
        voice.onend = voice.onerror = () => update({ phase: "idle" });
        update({ phase: "speaking", said });
        speechSynthesis.speak(voice);
      });
  }, [speech.listening]);

  useEffect(() => () => void SpeechRecognition.abortListening(), []);

  const swap = () => {
    auto.setPlaying(false);
    speech.resetTranscript();
    setTurn({ from: line.from === 0 ? 1 : 0, said: "", phase: "idle" });
  };

  const tap = async () => {
    auto.setPlaying(false);
    if (speech.listening) return SpeechRecognition.stopListening();
    if (line.phase === "speaking") {
      speechSynthesis.cancel();
      return update({ phase: "idle" });
    }
    if (line.phase === "translating") return;
    if (!speech.browserSupportsSpeechRecognition) {
      setTurn(null);
      auto.setStep(0);
      auto.setPlaying(true);
      return setNote(
        "Live listening needs speech recognition, which this browser doesn't have. Try Chrome.",
      );
    }
    setTurn({ from: line.from, said: "", phase: "idle" });
    void SpeechRecognition.startListening({
      language: source.locale,
      interimResults: true,
    });
    const api = (globalThis as { Translator?: TranslatorApi }).Translator;
    translator.current =
      (await api
        ?.create({ sourceLanguage: source.code, targetLanguage: target.code })
        .catch(() => null)) ?? null;
    setNote(
      translator.current
        ? null
        : "Translation runs on Chrome's built-in translator, which isn't available here. You'll see what you said.",
    );
  };

  return (
    <div ref={auto.ref} className="vo not-prose">
      <div className="vo-languages">
        <span>{source.name}</span>
        <button
          type="button"
          className="vo-swap"
          onClick={swap}
          aria-label={`Translate from ${target.name} to ${source.name} instead`}
        >
          <HugeiconsIcon icon={ArrowLeftRightIcon} aria-hidden="true" />
        </button>
        <span>{target.name}</span>
      </div>

      <button
        type="button"
        className="vo-orb"
        onClick={tap}
        aria-label={
          speech.listening
            ? "Stop listening"
            : line.phase === "speaking"
            ? "Stop speaking"
            : `Speak ${source.name}`
        }
      >
        <VoiceOrb
          state={ORB[line.phase]}
          level={line.phase === "listening" ? 0.04 : undefined}
          size={220}
        />
      </button>
      <p className="vo-status" aria-live="polite">
        {STATUS[line.phase]}
      </p>

      <div className="vo-captions">
        <p className="vo-heard" lang={source.code}>
          {line.heard || " "}
        </p>
        <Remold.Text className="vo-said" lang={target.code}>
          {line.said || " "}
        </Remold.Text>
      </div>
      {note && <p className="vo-note">{note}</p>}
    </div>
  );
}
