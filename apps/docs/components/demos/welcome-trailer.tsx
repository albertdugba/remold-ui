"use client";

import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef } from "react";
import { useScene } from "./use-scene";

export const WELCOME_BEATS = ["envelope", "open", "plane", "flight", "bell"] as const;
export type WelcomeBeat = (typeof WELCOME_BEATS)[number];

type Point = readonly [x: number, y: number];

const VIEW_BOX = "0 0 240 160";
const CENTER: Point = [124, 80];
const PLANE_HEADING = -31;
const FLIGHT_SECONDS = 2.2;
const SPRING = { duration: 0.55, bounce: 0.22 };
const POP = { duration: 0.5, bounce: 0.4 };

const FLIGHT = "M124 80C160 36 222 40 214 82C206 122 150 128 138 98C126 68 72 38 52 66C34 92 78 116 124 80";

const dot = ([x, y]: Point) => `M${x - 0.05} ${y}h0.1v0.1h-0.1Z`;
const pill = ([x, y]: Point, width = 5, height = 8) => {
  const radius = width / 2;
  return `M${x - radius} ${y - height / 2 + radius}a${radius} ${radius} 0 0 1 ${width} 0v${height - width}a${radius} ${radius} 0 0 1 ${-width} 0Z`;
};
const pair = (left: Point, right: Point, width?: number, height?: number) =>
  `${pill(left, width, height)} ${pill(right, width, height)}`;

const ENVELOPE = {
  back: "M86 58h68a6 6 0 0 1 6 6v40a6 6 0 0 1 -6 6H86a6 6 0 0 1 -6 -6V64a6 6 0 0 1 6 -6Z",
  front: "M80 66l40 26l40 -26v38a6 6 0 0 1 -6 6H86a6 6 0 0 1 -6 -6Z",
  flapShut: "M84 58h72a3 3 0 0 1 1.8 5.4L120 90L82.2 63.4A3 3 0 0 1 84 58Z",
  flapOpen: "M84 64h72a3 3 0 0 0 1.8 -5.4L120 30L82.2 58.6A3 3 0 0 0 84 64Z",
  note: "M92 34h56a4 4 0 0 1 4 4v60H88V38a4 4 0 0 1 4 -4Z",
  lines: "M98 44h26v4H98Z M98 54h44v3H98Z M98 62h36v3H98Z",
  eyes: pair([110, 100], [130, 100]),
};

const PLANE = {
  body: "M78 80L170 52L122 104L112 90Z",
  fold: "M112 90L170 52L118 94Z",
  eyes: pair([111, 80], [123, 76], 4, 6),
};

const BELL = {
  body: "M124 46c-15.5 0 -26 12.5 -26 28v14l-9 11a2 2 0 0 0 1.5 3.3h67a2 2 0 0 0 1.5 -3.3l-9 -11v-14c0 -15.5 -10.5 -28 -26 -28Z",
  clapper: "M116 106a8 8 0 0 0 16 0Z",
  eyes: pair([115, 80], [133, 80]),
};

const BADGE = {
  disc: "M148 41a11 11 0 1 1 0 22a11 11 0 1 1 0 -22Z",
  mark: "M146.6 46.5l3.4 -1.5h1.6v13.5h-2.6V48.4l-2.4 1Z",
};

const TUCKED = dot([120, 104]);
const HIDDEN = dot([120, 80]);

type Look = "ink" | "paper" | "soft" | "light";

const FILL: Record<Look, string> = {
  ink: "fill-(--wt-ink)",
  paper: "fill-(--wt-paper) stroke-(--wt-ink) [stroke-width:2]",
  soft: "fill-(--wt-soft)",
  light: "fill-(--wt-paper)",
};

interface Frame {
  back: string;
  flap: string;
  note: string;
  noteLook: Look;
  lines: string;
  front: string;
  eyes: string;
  eyesLook: Look;
}

const FRAMES: Record<WelcomeBeat, Frame> = {
  envelope: {
    back: ENVELOPE.back,
    flap: ENVELOPE.flapShut,
    note: HIDDEN,
    noteLook: "paper",
    lines: HIDDEN,
    front: ENVELOPE.front,
    eyes: ENVELOPE.eyes,
    eyesLook: "light",
  },
  open: {
    back: ENVELOPE.back,
    flap: ENVELOPE.flapOpen,
    note: ENVELOPE.note,
    noteLook: "paper",
    lines: ENVELOPE.lines,
    front: ENVELOPE.front,
    eyes: ENVELOPE.eyes,
    eyesLook: "light",
  },
  plane: {
    back: TUCKED,
    flap: TUCKED,
    note: PLANE.body,
    noteLook: "paper",
    lines: PLANE.fold,
    front: TUCKED,
    eyes: PLANE.eyes,
    eyesLook: "ink",
  },
  flight: {
    back: TUCKED,
    flap: TUCKED,
    note: PLANE.body,
    noteLook: "paper",
    lines: PLANE.fold,
    front: TUCKED,
    eyes: PLANE.eyes,
    eyesLook: "ink",
  },
  bell: {
    back: TUCKED,
    flap: TUCKED,
    note: BELL.body,
    noteLook: "ink",
    lines: BELL.clapper,
    front: TUCKED,
    eyes: BELL.eyes,
    eyesLook: "light",
  },
};

const copyFor = (name: string): Record<WelcomeBeat, { title: string; line: string }> => ({
  envelope: { title: `Welcome aboard, ${name}`, line: "Your account is ready." },
  open: { title: "There's a note for you", line: "Everything you need to get started." },
  plane: { title: "Folded and ready", line: "We'll send it to your inbox." },
  flight: { title: "On its way", line: "Look out for it in a moment." },
  bell: { title: "You're all set", line: "We'll ring when something needs you." },
});

const THEME =
  "[--wt-ink:#27272a] [--wt-soft:#3f3f46] [--wt-paper:#ffffff] [--wt-muted:#6c6c75] [--wt-trail:#a1a1aa] [--wt-badge:#ef4444] [--wt-glow:rgb(79_70_229/0.22)] dark:[--wt-ink:#e4e4e7] dark:[--wt-soft:#a1a1aa] dark:[--wt-paper:#18181b] dark:[--wt-muted:#a1a1aa] dark:[--wt-trail:#52525b] dark:[--wt-badge:#f87171] dark:[--wt-glow:rgb(129_140_248/0.32)]";

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

function useFlight(beat: WelcomeBeat) {
  const plane = useRef<SVGGElement>(null);
  const route = useRef<SVGPathElement>(null);
  const reveal = useRef<SVGPathElement>(null);

  useEffect(() => {
    const group = plane.current;
    const path = route.current;
    const trail = reveal.current;
    if (!group || !path || !trail) return;

    const place = (progress: number) => {
      const length = path.getTotalLength();
      const here = path.getPointAtLength(length * progress);
      const ahead = path.getPointAtLength(Math.min(length, length * progress + 1));
      const behind = path.getPointAtLength(Math.max(0, length * progress - 1));
      const heading = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
      const turn = (heading - PLANE_HEADING) * smoothstep(0, 0.08, progress) * (1 - smoothstep(0.86, 1, progress));
      const scale = 1 - 0.45 * Math.sin(Math.PI * progress);
      const [x, y] = CENTER;
      group.setAttribute(
        "transform",
        `translate(${here.x - x} ${here.y - y}) rotate(${turn} ${x} ${y}) translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`,
      );
      trail.style.strokeDashoffset = String(1 - progress);
    };

    if (beat !== "flight" || prefersReducedMotion()) {
      place(0);
      trail.style.strokeDashoffset = beat === "flight" ? "0" : "1";
      return;
    }

    let elapsed = 0;
    return frames((dt) => {
      elapsed = Math.min(FLIGHT_SECONDS, elapsed + dt);
      place(easeInOut(elapsed / FLIGHT_SECONDS));
      return elapsed < FLIGHT_SECONDS;
    });
  }, [beat]);

  return { plane, route, reveal };
}

export interface WelcomeTrailerProps {
  beat: WelcomeBeat;
  name?: string;
  live?: boolean;
}

export function WelcomeTrailer({ beat, name = "Ama", live }: WelcomeTrailerProps) {
  const frame = FRAMES[beat];
  const copy = copyFor(name)[beat];
  const { plane, route, reveal } = useFlight(beat);
  const ringing = beat === "bell";
  const look = (part: Look) => `${FILL[part]} transition-[fill,stroke] duration-300 ease-out`;

  return (
    <section className={`grid w-[min(100%,460px)] justify-items-center gap-3 text-center ${THEME}`} aria-label="Welcome">
      <div className="relative aspect-[240/160] w-full" role="img" aria-label={copy.title}>
        <div
          data-on={beat === "open" || beat === "bell" || undefined}
          className="pointer-events-none absolute inset-x-[8%] top-[10%] bottom-[2%] bg-[radial-gradient(45%_60%_at_50%_80%,var(--wt-glow),transparent_72%)] opacity-0 transition-[opacity] duration-500 ease-out data-on:opacity-100"
          aria-hidden="true"
        />
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={VIEW_BOX} aria-hidden="true">
          <ellipse
            cx="120"
            cy="128"
            rx="50"
            ry="4"
            data-away={beat === "flight" || undefined}
            className="fill-[rgb(0_0_0/0.07)] transition-[opacity] duration-300 ease-out data-away:opacity-30 dark:fill-[rgb(0_0_0/0.35)]"
          />
          <path ref={route} d={FLIGHT} fill="none" stroke="none" />
          <mask id="welcome-trail">
            <path ref={reveal} d={FLIGHT} fill="none" stroke="white" strokeWidth="6" pathLength={1} strokeDasharray="1 1" strokeDashoffset="1" />
          </mask>
          <path
            d={FLIGHT}
            fill="none"
            mask="url(#welcome-trail)"
            data-shown={beat === "flight" || undefined}
            className="stroke-(--wt-trail) opacity-0 transition-[opacity] duration-500 ease-out data-shown:opacity-100"
            strokeWidth="1.6"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          <g ref={plane}>
            <g
              className={`motion-reduce:animate-none ${ringing ? "animate-bell-ring" : beat === "envelope" ? "animate-card-float" : ""}`}
              style={{ transformOrigin: "124px 46px", transformBox: "view-box" }}
            >
              <Remold.PathGroup
                viewBox={VIEW_BOX}
                spring={SPRING}
                className="overflow-visible"
                paths={[
                  { id: "back", path: frame.back, className: look("soft") },
                  { id: "flap", path: frame.flap, className: look("soft") },
                  { id: "note", path: frame.note, className: look(frame.noteLook) },
                  { id: "lines", path: frame.lines, className: look(frame.noteLook === "paper" ? "ink" : "soft") },
                  { id: "front", path: frame.front, className: look("ink") },
                  { id: "eyes", path: frame.eyes, className: look(frame.eyesLook) },
                ]}
              />
              <Remold.PathGroup
                viewBox={VIEW_BOX}
                spring={POP}
                className="overflow-visible"
                paths={[
                  { id: "badge", path: ringing ? BADGE.disc : dot([148, 52]), className: "fill-(--wt-badge) stroke-(--wt-paper) [stroke-width:2.5]" },
                  { id: "count", path: ringing ? BADGE.mark : dot([148, 52]), className: "fill-white" },
                ]}
              />
            </g>
          </g>
        </svg>
      </div>
      <div className="grid gap-1 text-(--wt-ink)" aria-live={live ? "off" : "polite"}>
        <Remold.Text className="text-[22px] leading-[1.2] font-[650] tracking-[-0.015em]">{copy.title}</Remold.Text>
        <Remold.Text className="text-[14px] text-(--wt-muted)">{copy.line}</Remold.Text>
      </div>
    </section>
  );
}

const BEATS: readonly { beat: WelcomeBeat; ms: number }[] = [
  { beat: "envelope", ms: 1800 },
  { beat: "open", ms: 1500 },
  { beat: "plane", ms: 900 },
  { beat: "flight", ms: 2500 },
  { beat: "bell", ms: 2800 },
];

const fromBeat = (step: number) => BEATS[step]!.beat;

export function WelcomeTrailerDemo({ playing }: { playing?: boolean; preview?: boolean } = {}) {
  const { ref, state, takeOver, live } = useScene(BEATS, fromBeat, playing, true);

  return (
    <div ref={ref} className="not-prose grid w-full place-items-center gap-4 px-4 py-6">
        <WelcomeTrailer beat={state} live={live} />
        <ol className="m-0 grid list-none grid-cols-[repeat(5,32px)] gap-1.5 p-0" aria-label="Scenes">
          {WELCOME_BEATS.map((beat) => (
            <li key={beat}>
              <button
                type="button"
                aria-label={beat}
                aria-current={beat === state ? "step" : undefined}
                onClick={() => takeOver(beat)}
                className="relative block h-1 w-full cursor-pointer rounded-full border-0 bg-fd-border p-0 transition-[background-color] duration-200 ease-out before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] aria-[current=step]:bg-fd-foreground"
              />
            </li>
          ))}
        </ol>
    </div>
  );
}
