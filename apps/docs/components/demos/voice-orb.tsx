"use client";

import { ArrowLeftRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { shapes, type Shape, type Vec3 } from "@remold-ui/core";
import { Remold, useAutoplay } from "@remold-ui/react/canvas";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export type OrbState = "idle" | "connecting" | "listening" | "thinking" | "searching" | "speaking";
export type OrbTheme = "aurora" | "ember" | "mono";

type Look = "light" | "dark";
type Moment = { time: number; loudness: number; turn: number };

const PALETTES: Record<OrbTheme, Record<Look, readonly string[]>> = {
  aurora: {
    light: ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#38bdf8"],
    dark: ["#1d4ed8", "#3b82f6", "#60a5fa", "#a5d8ff", "#f0f9ff"],
  },
  ember: {
    light: ["#7c2d12", "#c2410c", "#ea580c", "#f97316", "#f59e0b"],
    dark: ["#c2410c", "#ea580c", "#fb923c", "#fdba74", "#fff7ed"],
  },
  mono: {
    light: ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa"],
    dark: ["#52525b", "#a1a1aa", "#d4d4d8", "#f4f4f5", "#ffffff"],
  },
};

const LOOKS = {
  light: { blend: "normal", radius: 1.25 },
  dark: { blend: "add", radius: 1.3 },
} as const;

const WORDS: Record<OrbState, string> = {
  idle: "Ready",
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  searching: "Searching",
  speaking: "Speaking",
};

const DEGREES_PER_SECOND: Record<OrbState, number> = {
  idle: 11,
  connecting: 0,
  listening: 18,
  thinking: 0,
  searching: 0,
  speaking: 18,
};

const SPRING = { duration: 0.55, bounce: 0.12 };
const CAMERA = { spin: 0, tilt: 24 };
const TICK = 100;
const STEP = TICK / 1000;
const START: Moment = { time: 0, loudness: 0, turn: 0 };
const ATTACK = 0.5;
const RELEASE = 0.18;
const REACH = 0.34;
const DEGREES = 180 / Math.PI;
const BANDS = 9;
const ARC = { radius: 0.84, sweep: Math.PI * 1.5 };
const LENS = { x: -0.16, y: 0.18, radius: 0.6 };
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const clamp01 = (amount: number) => Math.max(0, Math.min(1, amount));

const dotsFor = (size: number) => Math.min(900, Math.max(300, Math.round(size ** 2 / 110)));

const facing = (ring: Shape) => ring.rotate({ x: 90 });

const arc = (radius: number, from: number, sweep: number, steps = 12) =>
  Array.from({ length: steps + 1 }, (_, step): Vec3 => {
    const angle = from + (sweep * step) / steps;

    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
  });

const ball = shapes.sphere({ radius: 0.9 }).tone(({ along }) => 0.15 + 0.7 * along);

const core = shapes.sphere({ radius: 0.15 }).tone(1);

const comet = shapes
  .curve({ through: arc(ARC.radius, 0, ARC.sweep) })
  .tone(({ along }) => 0.15 + 0.8 * along)
  .fuzz(0.09)
  .warp(({ x, y, z, along }) => {
    const angle = along * ARC.sweep;
    const [lineX, lineY] = [Math.cos(angle) * ARC.radius, Math.sin(angle) * ARC.radius];
    const thickness = 0.15 + 0.85 * along * along;

    return [lineX + (x - lineX) * thickness, lineY + (y - lineY) * thickness, z * thickness];
  });

const glass = shapes.compose([
  {
    share: 60,
    shape: facing(shapes.torus({ radius: LENS.radius, tube: 0.022 })).tone(
      ({ x, y }) => 0.45 + 0.25 * Math.cos(Math.atan2(y, x) - 2.36),
    ),
  },
  { share: 33, shape: shapes.curve({ through: [[0.45, -0.45, 0], [0.89, -0.89, 0]] }).fuzz(0.05).tone(0.25) },
  { share: 7, shape: shapes.curve({ through: arc(LENS.radius * 0.68, 1.85, 0.95, 4) }).tone(1) },
]);

const rim = facing(shapes.torus({ radius: 0.88, tube: 0.015 }));

const inside = shapes.sphere({ radius: 0.8 }).tone(({ along }) => 0.15 + 0.6 * along);

const resting = ({ time, turn }: Moment) => ball.scale(1 + 0.03 * Math.sin(time * 1.6)).rotate({ y: turn });

const reaching = ({ time }: Moment) =>
  shapes.compose([
    { share: 16, shape: core.scale(1 + 0.2 * Math.sin(time * 6)) },
    { share: 84, shape: comet.rotate({ z: time * 3.4 * DEGREES }).rotate({ x: -52 }) },
  ]);

const hearing = ({ time, loudness, turn }: Moment) =>
  shapes
    .compose(
      Array.from({ length: BANDS }, (_, band) => {
        const height = ((band / (BANDS - 1)) * 2 - 1) * 0.9;
        const reach = Math.sqrt(1 - height * height);
        const ripple = Math.sin(band * 0.9 + time * 6);

        return {
          share: reach,
          shape: shapes
            .torus({ radius: reach, tube: 0.012 })
            .at([0, height, 0])
            .scale(0.96 * (1 + (0.035 + 0.2 * loudness) * ripple))
            .tone(clamp01(0.2 + 0.55 * (band / (BANDS - 1)) + 0.3 * loudness * ripple)),
        };
      }),
    )
    .rotate({ y: turn });

const working = ({ time }: Moment) =>
  shapes.compose(
    [-1, 0, 1].map((place) => {
      const lift = 0.5 + 0.5 * Math.sin(time * 4.6 - (place + 1) * 1.15);

      return {
        share: 1,
        shape: shapes
          .sphere({ radius: 0.27 })
          .tone(({ along }) => clamp01(0.15 + 0.55 * lift + 0.2 * along))
          .rotate({ y: time * 52 })
          .scale(1 + 0.12 * lift)
          .at([place * 0.72, 0.36 * lift - 0.18, 0]),
      };
    }),
  );

const seeking = ({ time }: Moment) =>
  glass
    .rotate({ z: 5.7 * Math.sin(time * 1.7) })
    .rotate({ y: 19.5 * Math.sin(time * 1.1) })
    .at([LENS.x + 0.1 * Math.sin(time * 1.5), LENS.y + 0.07 * Math.sin(time * 2.3 + 1), 0]);

const telling = ({ time, loudness, turn }: Moment) =>
  shapes.compose([
    {
      share: 66,
      shape: rim
        .warp(({ x, y, z }) => {
          const angle = Math.atan2(y, x) + time * 0.12;
          const wave =
            0.45 * Math.sin(angle * 5 + time * 5.2) +
            0.33 * Math.sin(angle * 9 - time * 7.1) +
            0.22 * Math.sin(angle * 14 + time * 9.3);
          const push = 1 + (0.015 + 0.09 * loudness) * wave;

          return [x * push, y * push, z];
        })
        .fuzz(0.02 + 0.09 * loudness)
        .tone(({ y }) => clamp01(0.5 + 0.35 * y)),
    },
    { share: 34, shape: inside.scale(1 + 0.04 * loudness * Math.sin(time * 6)).rotate({ y: turn }) },
  ]);

const ORBS: Record<OrbState, (moment: Moment) => Shape> = {
  idle: resting,
  connecting: reaching,
  listening: hearing,
  thinking: working,
  searching: seeking,
  speaking: telling,
};

function simulatedLoudness(state: OrbState, time: number) {
  if (state === "speaking") return 0.3 + 0.5 * Math.abs(Math.sin(time * 6.3)) * (0.6 + 0.4 * Math.sin(time * 1.7));
  if (state === "listening") return 0.1 + 0.2 * Math.abs(Math.sin(time * 2.9)) * (0.5 + 0.5 * Math.sin(time * 0.9));

  return 0;
}

function advance({ time, loudness, turn }: Moment, state: OrbState, level: number | undefined): Moment {
  const heard = level === undefined ? simulatedLoudness(state, time) : clamp01(level);

  return {
    time: time + STEP,
    loudness: loudness + (heard - loudness) * (heard > loudness ? ATTACK : RELEASE),
    turn: turn + DEGREES_PER_SECOND[state] * STEP,
  };
}

function watchTheme(notify: () => void) {
  const observer = new MutationObserver(notify);

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return () => observer.disconnect();
}

function watchMotionPreference(notify: () => void) {
  const preference = matchMedia(REDUCED_MOTION);

  preference.addEventListener("change", notify);

  return () => preference.removeEventListener("change", notify);
}

const useDark = () =>
  useSyncExternalStore(
    watchTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

const useReducedMotion = () =>
  useSyncExternalStore(
    watchMotionPreference,
    () => matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

function useOnScreen<Target extends Element>() {
  const [onScreen, setOnScreen] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const watch = useCallback((target: Target | null) => {
    observer.current?.disconnect();
    observer.current = null;

    if (!target) return;

    observer.current = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true));
    observer.current.observe(target);
  }, []);

  return [watch, onScreen] as const;
}

function useMoment(state: OrbState, level: number | undefined, running: boolean) {
  const [moment, tick] = useReducer((now: Moment) => advance(now, state, level), START);

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(tick, TICK);

    return () => clearInterval(timer);
  }, [running]);

  return moment;
}

const STATUS_STYLE =
  "block h-5 text-center font-sans text-[13px] leading-5 font-medium text-[#6c6c75] transition-[color] duration-200 ease-out data-shimmer:animate-shimmer data-shimmer:text-[#18181b] data-shimmer:[mask-image:linear-gradient(100deg,rgb(0_0_0/0.38)_36%,#000_50%,rgb(0_0_0/0.38)_64%)] data-shimmer:[mask-size:300%_100%] motion-reduce:animate-none! motion-reduce:[mask-image:none]! motion-reduce:text-[#6c6c75]! dark:text-[#a1a1aa] dark:data-shimmer:text-[#fafafa] dark:motion-reduce:text-[#a1a1aa]!";

function OrbStatus({ children, shimmer = false, className = "" }: { children: string; shimmer?: boolean; className?: string }) {
  return (
    <span role="status" data-shimmer={shimmer || undefined} className={`${STATUS_STYLE} ${className}`}>
      <Remold.Text className="inline-block whitespace-nowrap">{children}</Remold.Text>
    </span>
  );
}

export interface VoiceOrbProps {
  state?: OrbState;
  level?: number;
  theme?: OrbTheme;
  size?: number;
  status?: boolean | string;
  className?: string;
  style?: CSSProperties;
}

export function VoiceOrb({ state = "idle", level, theme = "aurora", size = 260, status, className, style }: VoiceOrbProps) {
  const look: Look = useDark() ? "dark" : "light";
  const reducedMotion = useReducedMotion();
  const [canvas, onScreen] = useOnScreen<HTMLCanvasElement>();
  const moment = useMoment(state, level, onScreen && !reducedMotion);

  const shape = useMemo(
    () => ORBS[state](moment).scale(size * REACH).at([size / 2, -size / 2, 0]),
    [state, moment, size],
  );

  const orb = (
    <Remold.Particles
      key={look}
      ref={canvas}
      shape={shape}
      count={dotsFor(size)}
      pairing="index"
      fit="none"
      padding={0}
      palette={PALETTES[theme][look]}
      blend={LOOKS[look].blend}
      radius={LOOKS[look].radius}
      camera={CAMERA}
      pointer={false}
      spring={SPRING}
      label={`Voice orb: ${state}`}
      className={className}
      style={{ display: "block", width: size, height: size, ...style }}
    />
  );

  if (!status) return orb;

  return (
    <span className="inline-grid justify-items-center gap-2">
      {orb}
      <OrbStatus shimmer={state !== "idle"}>{status === true ? WORDS[state] : status}</OrbStatus>
    </span>
  );
}

const LANGUAGES = [
  { code: "es", locale: "es-ES", name: "Spanish" },
  { code: "en", locale: "en-US", name: "English" },
] as const;

type Language = (typeof LANGUAGES)[number];
type Side = 0 | 1;
type Phase = "idle" | "connecting" | "listening" | "hearing" | "translating" | "speaking";
type Line = { phase: Phase; from: Side; heard: string; said: string };
type Turn = { from: Side; said: string; stage: "connecting" | "open" | "speaking" | "closed" };
type Translator = { translate(text: string): Promise<string> };
type TranslatorApi = { create(options: { sourceLanguage: string; targetLanguage: string }): Promise<Translator> };

const ORB: Record<Phase, OrbState> = {
  idle: "idle",
  connecting: "connecting",
  listening: "listening",
  hearing: "listening",
  translating: "thinking",
  speaking: "speaking",
};

const STATUS: Record<Phase, (source: Language, target: Language) => string> = {
  idle: () => "Tap to speak",
  connecting: () => "Connecting",
  listening: (source) => `Listening for ${source.name}`,
  hearing: () => "Hearing you",
  translating: (_, target) => `Translating to ${target.name}`,
  speaking: (_, target) => `Speaking ${target.name}`,
};

const NOTES = {
  unsupported: "Live listening needs speech recognition, which this browser doesn't have. Try Chrome.",
  untranslated:
    "Translation runs on Chrome's built-in translator, which isn't available here. You'll see what you said.",
  refused: "Microphone access was refused. Allow it for this site and tap the orb again.",
};

const SCENE: readonly (Line & { ms: number })[] = [
  { phase: "idle", from: 0, heard: "", said: "", ms: 1600 },
  { phase: "connecting", from: 0, heard: "", said: "", ms: 1100 },
  { phase: "listening", from: 0, heard: "", said: "", ms: 1000 },
  { phase: "hearing", from: 0, heard: "¿Dónde está", said: "Where is", ms: 900 },
  { phase: "hearing", from: 0, heard: "¿Dónde está la estación", said: "Where is the season", ms: 1000 },
  { phase: "translating", from: 0, heard: "¿Dónde está la estación de tren?", said: "Where is the season", ms: 1100 },
  { phase: "speaking", from: 0, heard: "¿Dónde está la estación de tren?", said: "Where is the train station?", ms: 2400 },
  { phase: "idle", from: 1, heard: "", said: "", ms: 1200 },
  { phase: "connecting", from: 1, heard: "", said: "", ms: 1000 },
  { phase: "listening", from: 1, heard: "", said: "", ms: 900 },
  { phase: "hearing", from: 1, heard: "How long", said: "Cuánto", ms: 800 },
  { phase: "hearing", from: 1, heard: "How long does it take to walk?", said: "¿Cuánto tarda", ms: 900 },
  { phase: "translating", from: 1, heard: "How long does it take to walk?", said: "¿Cuánto tarda", ms: 1100 },
  { phase: "speaking", from: 1, heard: "How long does it take to walk?", said: "¿Cuánto se tarda a pie?", ms: 2400 },
];

const TOKENS =
  "[--vo-fill:rgb(24_24_27/0.05)] [--vo-ink:#18181b] [--vo-muted:#6c6c75] [--vo-ring:rgb(24_24_27/0.1)] dark:[--vo-fill:rgb(255_255_255/0.07)] dark:[--vo-ink:#fafafa] dark:[--vo-muted:#a1a1aa] dark:[--vo-ring:rgb(255_255_255/0.12)]";

const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);

const amend =
  (change: Partial<Turn>) =>
  (turn: Turn | null): Turn | null =>
    turn && { ...turn, ...change };

function phaseOf(turn: Turn, listening: boolean, heard: string): Phase {
  if (listening) return heard ? "hearing" : "listening";
  if (turn.stage === "connecting" || turn.stage === "speaking") return turn.stage;

  return turn.stage === "open" && heard ? "translating" : "idle";
}

const createTranslator = (source: Language, target: Language) =>
  (globalThis as { Translator?: TranslatorApi }).Translator?.create({
    sourceLanguage: source.code,
    targetLanguage: target.code,
  }).catch(() => null) ?? null;

const translate = (translator: Translator | null, text: string) =>
  translator?.translate(text).catch(() => "") ?? Promise.resolve("");

function useInterpreter(index?: number) {
  const scene = useAutoplay(SCENE.length, { every: (step) => SCENE[step]!.ms, autoStart: false });
  const speech = useSpeechRecognition();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const translator = useRef<Translator | null>(null);

  const { listening, transcript: heard } = speech;
  const live = turn !== null;
  const line: Line = turn
    ? { from: turn.from, phase: phaseOf(turn, listening, heard), heard, said: turn.said }
    : SCENE[index === undefined ? scene.step : index % SCENE.length]!;
  const source = LANGUAGES[line.from];
  const target = LANGUAGES[otherSide(line.from)];

  useEffect(() => {
    if (!live || !heard) return;

    let current = true;
    const close = () => {
      if (current) setTurn(amend({ stage: "closed" }));
    };

    void translate(translator.current, heard).then((said) => {
      if (!current) return;

      if (listening) {
        if (said) setTurn(amend({ said }));
        return;
      }

      if (!said) return close();

      const voice = new SpeechSynthesisUtterance(said);

      voice.lang = target.locale;
      voice.onend = voice.onerror = close;
      setTurn(amend({ said, stage: "speaking" }));
      speechSynthesis.speak(voice);
    });

    return () => {
      current = false;
      speechSynthesis.cancel();
    };
  }, [live, heard, listening, target.locale]);

  useEffect(() => () => void SpeechRecognition.abortListening(), []);

  const swap = () => {
    scene.setPlaying(false);
    speech.resetTranscript();
    setTurn({ from: otherSide(line.from), said: "", stage: "closed" });
  };

  const hush = () => {
    speechSynthesis.cancel();
    setTurn(amend({ stage: "closed" }));
  };

  const playScene = () => {
    setTurn(null);
    setHint(NOTES.unsupported);
    scene.setStep(0);
    scene.setPlaying(true);
  };

  const listen = async () => {
    speech.resetTranscript();
    setTurn({ from: line.from, said: "", stage: "connecting" });

    const [created] = await Promise.all([
      createTranslator(source, target),
      SpeechRecognition.startListening({ language: source.locale, interimResults: true }).catch(() => {}),
    ]);

    translator.current = created;
    setHint(created ? null : NOTES.untranslated);
    setTurn((current) => (current?.stage === "connecting" ? { ...current, stage: "open" } : current));
  };

  const tap = () => {
    scene.setPlaying(false);

    if (listening) return void SpeechRecognition.stopListening();
    if (line.phase === "speaking") return hush();
    if (line.phase === "translating") return;
    if (!speech.browserSupportsSpeechRecognition) return playScene();

    void listen();
  };

  return {
    ref: scene.ref,
    line,
    source,
    target,
    listening,
    note: speech.isMicrophoneAvailable ? hint : NOTES.refused,
    tap,
    swap,
  };
}

export function VoiceOrbDemo({ index }: { index?: number } = {}) {
  const { ref, line, source, target, listening, note, tap, swap } = useInterpreter(index);
  const action = listening ? "Stop listening" : line.phase === "speaking" ? "Stop speaking" : `Speak ${source.name}`;

  return (
    <div
      ref={ref}
      className={`not-prose grid w-[min(100%,400px)] justify-items-center gap-[22px] py-2 font-sans text-(--vo-ink) ${TOKENS}`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 text-[14px] font-medium">
        <span className="text-right">{source.name}</span>
        <button
          type="button"
          className="grid size-[30px] cursor-pointer place-items-center rounded-full border-0 bg-(--vo-fill) text-inherit transition-[background-color] duration-150 hover:bg-(--vo-ring) [&_svg]:size-3.5"
          onClick={swap}
          aria-label={`Translate from ${target.name} to ${source.name} instead`}
        >
          <HugeiconsIcon icon={ArrowLeftRightIcon} aria-hidden="true" />
        </button>
        <span>{target.name}</span>
      </div>

      <button
        type="button"
        className="block cursor-pointer rounded-full border-0 bg-transparent p-0 transition-[scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--vo-ink) active:scale-[0.97]"
        onClick={tap}
        aria-label={action}
      >
        <VoiceOrb state={ORB[line.phase]} level={line.phase === "listening" ? 0.04 : undefined} size={220} />
      </button>

      <OrbStatus className="-mt-3.5" shimmer={line.phase !== "idle"}>
        {STATUS[line.phase](source, target)}
      </OrbStatus>

      <div className="grid min-h-14 w-full gap-1.5 text-center">
        <p className="m-0 text-[14px] text-(--vo-muted)" lang={source.code}>
          {line.heard || " "}
        </p>
        <Remold.Text className="text-[20px] font-medium tracking-[-0.01em]" lang={target.code}>
          {line.said || " "}
        </Remold.Text>
      </div>

      {note && (
        <p role="alert" className="m-0 -mt-2 max-w-[300px] text-center text-[12px] leading-normal text-(--vo-muted)">
          {note}
        </p>
      )}
    </div>
  );
}
