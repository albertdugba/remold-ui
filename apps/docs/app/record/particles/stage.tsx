"use client";

import { PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { type ParticleShape, ParticleShapes } from "@/components/demos/particle-shapes";

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.15 };

const SHAPE_SLOT = "§";

const CODE = `import { shapes } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";

const blackFriday = shapes.compose([headline, bags, offer]);
const lorenz = shapes.attractor("lorenz");
const bee = shapes.compose([body, stripes, wings]);
const butterfly = shapes.compose([wing, body]).mirror("x");
const grok = shapes.fromPath(GROK_MARK);
const dragon = shapes.fromPixels(artwork, { colors: 64 });

export function Showcase() {
  return (
    <Remold.Particles
      shape={${SHAPE_SLOT}}
      count={13000}
      camera={{ spin: 0.04, sway: 28 }}
    />
  );
}`;

const SHOWCASE: readonly ParticleShape[] = ["blackFriday", "lorenz", "bee", "butterfly", "grok", "dragon"];
const LINES = CODE.split("\n");
const LINE_OF = Object.fromEntries(SHOWCASE.map((shape) => [shape, LINES.findIndex((line) => line.startsWith(`const ${shape} `))]));

const BEAT_MS = 4500;
const CHARACTER_MS = 13;
const NEWLINE_MS = 90;
const LINE_HEIGHT = 30;

const COLOURS = {
  keyword: "#c084fc",
  string: "#86efac",
  call: "#7dd3fc",
  tag: "#f9a8d4",
  prop: "#fcd34d",
  number: "#fdba74",
  plain: "#e4e4e7",
  punctuation: "#71717a",
} as const;

const TOKEN =
  /(?<string>"[^"]*")|(?<keyword>\b(?:import|from|const|export|function|return)\b)|(?<tag><\/?Remold\.Particles|\/>)|(?<prop>\b\w+(?==))|(?<call>\b\w+(?=\())|(?<number>\b\d+(?:\.\d+)?\b)|(?<punctuation>[{}()[\];,.=<>])/g;

type Token = { text: string; colour: string };

function tokens(line: string): Token[] {
  const found: Token[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const kind = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0] as keyof typeof COLOURS;
    if (match.index > last) found.push({ text: line.slice(last, match.index), colour: COLOURS.plain });
    found.push({ text: match[0], colour: COLOURS[kind] });
    last = match.index + match[0].length;
  }
  if (last < line.length) found.push({ text: line.slice(last), colour: COLOURS.plain });
  return found;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class Stopped extends Error {}

function CodeLine({ line, typed, shape, live }: { line: string; typed: number; shape: ParticleShape; live: boolean }) {
  const shown = line.slice(0, typed);
  const slot = shown.indexOf(SHAPE_SLOT);
  if (slot === -1) {
    return tokens(shown).map((token, index) => (
      <span key={index} style={{ color: token.colour }}>
        {token.text}
      </span>
    ));
  }
  return (
    <>
      <CodeLine line={shown.slice(0, slot)} typed={slot} shape={shape} live={live} />
      {live ? (
        <Remold.Text className="inline-block" style={{ color: COLOURS.plain }}>
          {shape}
        </Remold.Text>
      ) : (
        <span style={{ color: COLOURS.plain }}>{SHOWCASE[0]}</span>
      )}
      <CodeLine line={shown.slice(slot + 1)} typed={shown.length} shape={shape} live={live} />
    </>
  );
}

export function Stage() {
  const [typed, setTyped] = useState(0);
  const [live, setLive] = useState(false);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [take, setTake] = useState(0);
  const run = useRef(0);

  const shape = SHOWCASE[beat]!;
  const done = typed >= CODE.length;

  const stop = () => {
    run.current += 1;
    setPlaying(false);
  };

  const play = async () => {
    const id = ++run.current;
    const wait = async (ms: number) => {
      await sleep(ms);
      if (run.current !== id) throw new Stopped();
    };

    setTake((count) => count + 1);
    setTyped(0);
    setLive(false);
    setBeat(0);
    setPlaying(true);
    try {
      await wait(500);
      for (let index = 1; index <= CODE.length; index += 1) {
        setTyped(index);
        await wait(CODE[index - 1] === "\n" ? NEWLINE_MS : CHARACTER_MS);
      }
      await wait(450);
      setLive(true);
      for (let step = 0; step < SHOWCASE.length; step += 1) {
        setBeat(step);
        await wait(BEAT_MS);
      }
    } catch (error) {
      if (!(error instanceof Stopped)) throw error;
    } finally {
      if (run.current === id) setPlaying(false);
    }
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && playing) stop();
    if (event.key.toLowerCase() === "p" && !playing) void play();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const typedLines = CODE.slice(0, typed).split("\n");
  const caretLine = typedLines.length - 1;

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <main data-playing={playing || undefined} className="grid min-h-screen place-items-center bg-[#050507] p-8 data-playing:cursor-none">
        <h1 className="sr-only">Particle shapes recording stage</h1>
        <style>{"nextjs-portal { display: none; }"}</style>
        <div className="grid h-[900px] w-[1600px] max-w-full grid-cols-[640px_minmax(0,1fr)] items-center gap-8 overflow-hidden rounded-[32px] bg-[radial-gradient(120%_90%_at_70%_40%,#15132a_0%,#07070b_70%)] p-10">
          <section
            aria-label="The code"
            className="relative overflow-hidden rounded-[20px] bg-[rgb(12_12_18/0.82)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),inset_0_1px_0_rgb(255_255_255/0.06),0_30px_80px_-30px_rgb(0_0_0/0.8)]"
          >
            <header className="flex items-center gap-2 border-b border-white/6 px-5 py-3.5">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[13px] text-white/45">showcase.tsx</span>
            </header>
            <pre className="relative m-0 h-[620px] px-6 py-5 font-mono text-[16px]" style={{ lineHeight: `${LINE_HEIGHT}px` }}>
              <AnimatePresence initial={false}>
                {live && (
                  <motion.span
                    key="active"
                    aria-hidden="true"
                    className="absolute inset-x-2 rounded-lg bg-white/[0.06] shadow-[inset_2px_0_0_#a78bfa]"
                    style={{ height: LINE_HEIGHT, top: 20 }}
                    initial={{ opacity: 0, y: LINE_OF[shape]! * LINE_HEIGHT }}
                    animate={{ opacity: 1, y: LINE_OF[shape]! * LINE_HEIGHT }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
              <code className="relative block">
                {typedLines.map((line, index) => (
                  <Fragment key={index}>
                    <span className="block min-h-[30px] whitespace-pre">
                      <CodeLine line={LINES[index]!} typed={line.length} shape={shape} live={live} />
                      {index === caretLine && !done && <span className="ml-px inline-block h-[19px] w-[9px] translate-y-[3px] bg-[#a78bfa]" />}
                    </span>
                  </Fragment>
                ))}
              </code>
            </pre>
          </section>

          <div className="relative grid h-full items-center [&_[data-shape-picker]]:hidden [&_figure]:bg-none! [&_figure_canvas]:h-[820px]!">
            <AnimatePresence initial={false}>
              {live && (
                <motion.div
                  key={take}
                  className="col-start-1 row-start-1"
                  initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                >
                  <ParticleShapes shape={shape} stars={false} pointer={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!playing ? (
            <motion.button
              key="play"
              type="button"
              className="fixed bottom-6 left-1/2 z-[999] inline-flex h-10 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-4 font-sans text-[13px] font-semibold text-[#111] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)] outline-none focus-visible:shadow-[0_0_0_2px_#050507,0_0_0_4px_#fff]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void play()}
            >
              <HugeiconsIcon icon={PlayIcon} size={15} strokeWidth={2.2} className="[&_path]:fill-current" aria-hidden="true" />
              Play
              <kbd className="rounded-[5px] bg-black/10 px-1.5 font-sans text-[11px]">P</kbd>
            </motion.button>
          ) : (
            <motion.button
              key="stop"
              type="button"
              aria-label="Stop"
              className="fixed right-5 bottom-5 z-[999] grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-white/5 p-0 text-white/30 outline-none hover:opacity-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={stop}
            >
              <HugeiconsIcon icon={StopIcon} size={14} strokeWidth={2} aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
