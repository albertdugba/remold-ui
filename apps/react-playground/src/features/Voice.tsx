/**
 * A voice assistant with a living orb. The orb's outline is a circle plus a few ripples
 * (harmonics); every ripple's size, the radius, the spin and both gradient colours sit on their
 * own springs, so each state is just a new set of targets and the orb flows between them from
 * wherever it is. The icon inside morphs with `<Remold.Icon>`, the words with `<Remold.Text>`.
 */
import { value, type AnimatedValue } from "@remold-ui/core";
import { springs, Remold } from "@remold-ui/react";
import { useEffect, useRef, useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import type { IconName } from "../icons";
import { useMotion, useRun } from "../motion";
import { MorphIcon } from "../ui/MorphIcon";

type OrbState = "idle" | "connecting" | "listening" | "hearing" | "thinking" | "speaking" | "interrupted" | "muted" | "error";

interface OrbLook {
  /** Radius, in a 140-unit box. */
  radius: number;
  /** How fast the ripples turn. */
  spin: number;
  /** A breathing in and out of the whole orb. */
  pulse: number;
  /** Resting size of each ripple, and how much the voice level adds to it. */
  ripples: [number, number, number, number, number];
  voice: [number, number, number, number, number];
  colours: [string, string];
  icon: IconName;
  label: string;
}

const LOOKS: Record<OrbState, OrbLook> = {
  idle: {
    radius: 40,
    spin: 0.4,
    pulse: 0,
    ripples: [1.4, 0.9, 0, 0, 0],
    voice: [0, 0, 0, 0, 0],
    colours: ["#9db0ff", "#2f54eb"],
    icon: "mic",
    label: "Tap to talk",
  },
  connecting: {
    radius: 31,
    spin: 2.5,
    pulse: 2.5,
    ripples: [0, 0, 0, 0, 0],
    voice: [0, 0, 0, 0, 0],
    colours: ["#c3cdff", "#5b74ef"],
    icon: "dots",
    label: "Connecting",
  },
  listening: {
    radius: 44,
    spin: 1,
    pulse: 0,
    ripples: [2, 1.5, 1, 0.6, 0.4],
    voice: [0, 0, 0, 0, 0],
    colours: ["#9db0ff", "#2f54eb"],
    icon: "mic",
    label: "Listening",
  },
  hearing: {
    radius: 47,
    spin: 1.6,
    pulse: 0,
    ripples: [3, 2, 1.5, 1, 0.6],
    voice: [8, 6, 4, 3, 2],
    colours: ["#a6e6ff", "#2b78e4"],
    icon: "wave",
    label: "Hearing you",
  },
  thinking: {
    radius: 35,
    spin: 5,
    pulse: 0,
    ripples: [0, 7, 0, 0, 0],
    voice: [0, 0, 0, 0, 0],
    colours: ["#cdbbff", "#6b46e5"],
    icon: "sparkle",
    label: "Thinking",
  },
  speaking: {
    radius: 47,
    spin: 1.8,
    pulse: 0,
    ripples: [2.5, 2, 1.5, 1, 0.5],
    voice: [9, 7, 5, 3, 2],
    colours: ["#9db0ff", "#2f54eb"],
    icon: "wave",
    label: "Speaking",
  },
  interrupted: {
    radius: 32,
    spin: 0.6,
    pulse: 0,
    ripples: [0, 0, 0, 0, 0],
    voice: [0, 0, 0, 0, 0],
    colours: ["#ffd59a", "#d9820e"],
    icon: "pause",
    label: "Interrupted",
  },
  muted: {
    radius: 35,
    spin: 0.3,
    pulse: 0,
    ripples: [0.6, 0, 0, 0, 0],
    voice: [0, 0, 0, 0, 0],
    colours: ["#d3d8e0", "#7a8291"],
    icon: "micOff",
    label: "Muted",
  },
  error: {
    radius: 39,
    spin: 0.3,
    pulse: 0,
    ripples: [1, 0, 0, 0, 0],
    voice: [0, 0, 0, 0, 0],
    colours: ["#ffb4a3", "#d4381c"],
    icon: "alert",
    label: "Couldn't hear you",
  },
};
const STATES = Object.keys(LOOKS) as OrbState[];

const SHAPE = { duration: 0.7, bounce: 0.35 };
const COLOUR = { duration: 0.5, bounce: 0 };
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The orb itself: an SVG drawn every frame from springs, while it's on screen. */
function Orb({ state, speaking }: { state: OrbState; speaking: boolean }) {
  const { loop, reducedMotion } = useMotion();
  const svg = useRef<SVGSVGElement>(null);
  const engine = useRef<{ set(state: OrbState): void; setActive(active: boolean): void } | null>(null);

  useEffect(() => {
    const root = svg.current!;
    const [outer, inner] = [...root.querySelectorAll("path")] as [SVGPathElement, SVGPathElement];
    const stops = [...root.querySelectorAll("stop")];
    const group = root.querySelector("g")!;
    const still = reducedMotion === "always" || (reducedMotion === "user" && matchMedia("(prefers-reduced-motion: reduce)").matches);

    let look = LOOKS.idle;
    let active = false;
    let time = 0;
    let turn = 0;
    const radius = value(look.radius, { spring: SHAPE, precision: 0.02 });
    const ripples = look.ripples.map((r) => value(r, { spring: SHAPE, precision: 0.01 }));
    const spin = value(look.spin, { spring: { duration: 0.8, bounce: 0 }, precision: 0.001 });
    const colour = [...rgb(look.colours[0]), ...rgb(look.colours[1])].map((c) => value(c, { spring: COLOUR, precision: 0.5 }));
    const shake = value(0, { spring: { duration: 0.4, bounce: 0.55 }, precision: 0.05 });
    const squash = value(0, { spring: { duration: 0.45, bounce: 0.5 }, precision: 0.001 });
    const all: AnimatedValue[] = [radius, spin, shake, squash, ...ripples, ...colour];

    // A made-up but voice-like level: fast syllables inside slower phrases.
    const level = () =>
      active
        ? Math.min(1, 0.6 * Math.abs(Math.sin(time * 7.3)) * (0.6 + 0.4 * Math.sin(time * 2.1)) + 0.3 * Math.abs(Math.sin(time * 15.7 + 1)))
        : 0;

    const outline = (scale: number, offset: number) => {
      const r0 = radius.current + look.pulse * Math.sin(time * 6);
      let d = "";
      for (let i = 0; i < 96; i++) {
        const angle = (i / 96) * Math.PI * 2;
        let r = r0;
        ripples.forEach((ripple, k) => {
          r += ripple.current * Math.sin((k + 2) * angle + (k % 2 ? turn : -turn * 0.8) + offset * (k + 1));
        });
        r *= scale;
        d += `${i ? "L" : "M"}${(r * Math.cos(angle)).toFixed(2)} ${(r * Math.sin(angle)).toFixed(2)}`;
      }
      return `${d}Z`;
    };

    const draw = () => {
      outer.setAttribute("d", outline(1, 0));
      inner.setAttribute("d", outline(0.8, 1.7));
      const c = colour.map((v) => Math.max(0, Math.min(255, Math.round(v.current))));
      stops[0]!.setAttribute("stop-color", `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
      stops[1]!.setAttribute("stop-color", `rgb(${c[3]}, ${c[4]}, ${c[5]})`);
      const q = squash.current;
      group.setAttribute("transform", `translate(${shake.current.toFixed(2)} 0) scale(${(1 + q).toFixed(3)} ${(1 - q).toFixed(3)})`);
    };

    let visible = true;
    let stop: (() => void) | null = null;
    const start = () => {
      if (stop || still || !visible) return;
      stop = loop.add((dt) => {
        time += dt;
        const lv = level();
        ripples.forEach((ripple, k) => ripple.to(look.ripples[k]! + look.voice[k]! * lv));
        for (const v of all) v.step(dt);
        turn += spin.current * dt;
        draw();
        if (!visible) stop = null;
        return visible;
      });
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      start();
    });
    observer.observe(root);

    engine.current = {
      set(state) {
        const previous = look;
        look = LOOKS[state];
        if (look === previous) return;
        const target = [...rgb(look.colours[0]), ...rgb(look.colours[1])];
        if (still) {
          radius.set(look.radius);
          colour.forEach((v, i) => v.set(target[i]!));
          ripples.forEach((v) => v.set(0));
          draw();
          return;
        }
        radius.to(look.radius);
        spin.to(look.spin);
        colour.forEach((v, i) => v.to(target[i]!));
        // An error shakes its head; an interruption squashes, as if cut off.
        if (state === "error") shake.to(0, { velocity: -900 });
        if (state === "interrupted") squash.to(0, { velocity: 3.2 });
        start();
      },
      setActive(on) {
        active = on;
      },
    };
    draw();
    start();
    return () => {
      observer.disconnect();
      stop?.();
      engine.current = null;
    };
  }, [loop, reducedMotion]);

  useEffect(() => engine.current?.set(state), [state, loop, reducedMotion]);
  useEffect(() => engine.current?.setActive(speaking), [speaking, loop, reducedMotion]);

  return (
    <span className="orb">
      <svg ref={svg} className="orb-body" viewBox="-70 -70 140 140" aria-hidden="true">
        <defs>
          <radialGradient id="orb-fill" cx="35%" cy="30%" r="85%">
            <stop offset="0" />
            <stop offset="1" />
          </radialGradient>
        </defs>
        <g>
          <path fill="url(#orb-fill)" />
          <path fill="#fff" opacity="0.28" />
        </g>
      </svg>
      <MorphIcon className="orb-icon" name={LOOKS[state].icon} spring={springs.bouncy} />
    </span>
  );
}

/* The conversation around it. */

const HEARD = ["What's", "What's on my", "What's on my calendar", "What's on my calendar this afternoon"];
const REPLY = "You have two things this afternoon: a design review at 2 and a call with Priya at 4:30.";
const REPLY_AFTER_INTERRUPT = "Sure, just the next one: the design review at 2.";

function VoiceDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion, wait } = useMotion();
  const nextRun = useRun();
  const [state, setState] = useState<OrbState>("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");

  const converse = async () => {
    const signal = nextRun();
    setReply("");
    setHeard("");
    setState("connecting");
    if (!(await wait(700, signal))) return;
    setState("listening");
    if (!(await wait(600, signal))) return;
    setState("hearing");
    for (const words of HEARD) {
      setHeard(words);
      if (!(await wait(520, signal))) return;
    }
    setState("thinking");
    if (!(await wait(1100, signal))) return;
    setState("speaking");
    setReply(REPLY);
    if (!(await wait(3200, signal))) return;
    setState("idle");
  };

  const interrupt = async () => {
    const signal = nextRun();
    setState("interrupted");
    if (!(await wait(800, signal))) return;
    setState("listening");
    setHeard("Just the next one");
    if (!(await wait(900, signal))) return;
    setState("thinking");
    if (!(await wait(800, signal))) return;
    setState("speaking");
    setReply(REPLY_AFTER_INTERRUPT);
    if (!(await wait(2400, signal))) return;
    setState("idle");
  };

  const press = () => {
    if (state === "speaking") void interrupt();
    else if (state === "idle" || state === "error" || state === "muted" || state === "interrupted") void converse();
    else {
      nextRun();
      setState("idle");
    }
  };

  // As a preview: hold a conversation, then show the muted and error states.
  useAutoplay(autoplay, 9000, (count) => {
    if (count % 3 === 2) {
      nextRun();
      setState(count % 2 ? "error" : "muted");
      setHeard("");
      setReply("");
    } else void converse();
  });

  const look = LOOKS[state];
  const text = { loop, reducedMotion };
  return (
    <div className="demo-panel">
      <div className="voice" data-state={state}>
        <button
          type="button"
          className="orb-button"
          onClick={press}
          disabled={preview}
          aria-label={state === "speaking" ? "Interrupt" : state === "idle" ? "Talk to the assistant" : "Stop"}
        >
          <Orb state={state} speaking={state === "hearing" || state === "speaking"} />
        </button>
        <Remold.Text className="voice-status" aria-live="polite" {...text}>
          {look.label}
        </Remold.Text>
        <Remold.Text className="voice-transcript" {...text}>
          {heard ? `“${heard}”` : "Ask about your day"}
        </Remold.Text>
        <Remold.Text className="voice-reply" {...text}>
          {reply || " "}
        </Remold.Text>
        {!preview && (
          <div className="orb-states" role="group" aria-label="Show a state">
            {STATES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === state}
                onClick={() => {
                  nextRun();
                  setState(s);
                }}
              >
                {LOOKS[s].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const voice: Example = {
  id: "voice",
  category: "Interfaces",
  title: "Voice orb",
  summary: "A big, living orb that reshapes for every state: listening, hearing, thinking, speaking, interrupted, muted, error.",
  headline: (
    <>
      An orb that shows
      <br />
      what it's doing.
    </>
  ),
  lead: "The orb is a circle with five ripples on top. Each state is a new set of targets: bigger and rippling with your voice while it hears you, tight and spinning while it thinks, amber and squashed when you cut in. Every value is on a spring, so it flows between states from wherever it is.",
  tries: [
    "Tap the orb to ask about your day. Watch it connect, listen, ripple with your voice, think and answer.",
    "Tap it again while it's speaking to interrupt: it squashes, turns amber and listens again.",
    "Pick states below in any order, quickly. The orb never jumps; it changes course mid-flight.",
    "Turn on Reduce motion: the orb stops rippling but still changes size, colour and icon.",
  ],
  code: `
const radius = value(40, { spring: { duration: 0.7, bounce: 0.35 } });
const ripples = [1.4, 0.9, 0, 0, 0].map((r) => value(r));

function setState(state) {
  radius.to(looks[state].radius);
  ripples.forEach((r, i) => r.to(looks[state].ripples[i]));
}

<Remold.Icon d={icons[looks[state].icon]} spring={springs.bouncy} />
<Remold.Text>{looks[state].label}</Remold.Text>
`,
  uses: [
    { name: "value", role: "One spring per number in the orb: radius, spin, five ripples and both colours." },
    { name: "Remold.Icon", role: "The glyph in the middle: mic, dots, wave, sparkle, pause, alert." },
    { name: "Remold.Text", role: "The state label, what it heard so far, and its reply." },
  ],
  frame: "panel",
  Demo: VoiceDemo,
};
