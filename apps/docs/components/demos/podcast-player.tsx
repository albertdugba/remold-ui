"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  GoBackward15SecIcon,
  GoForward30SecIcon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { animate, AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { formatClock, usePodcastPlayer, type Episode } from "./podcast-player.model";

const BARS = 56;

const WAVE = Array.from({ length: BARS }, (_, index) => {
  const along = index / (BARS - 1);
  const envelope =
    0.55 * Math.abs(Math.sin(along * Math.PI * 2.3 + 0.4)) +
    0.45 * Math.abs(Math.sin(along * Math.PI * 5.1 + 1.2));
  const grain = 0.12 * Math.sin(index * 1.7);
  return Math.min(1, Math.max(0.14, envelope * 0.85 + grain + 0.1));
});

function Waves({
  playing,
  progress,
  compact = false,
}: {
  playing: boolean;
  progress: number;
  compact?: boolean;
}) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const elements = bars.current;
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const bar of elements) if (bar) bar.style.transform = "";
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const seconds = (now - start) / 1000;
      const energy = 0.75 + 0.25 * Math.sin(seconds * 0.9) * Math.sin(seconds * 0.37 + 1);
      elements.forEach((bar, index) => {
        if (!bar) return;
        const wave =
          0.5 + 0.5 * Math.sin(seconds * 5.2 - index * 0.32) * Math.cos(seconds * 2.1 + index * 0.11);
        bar.style.transform = `scaleY(${(0.35 + 0.75 * wave) * energy})`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <div
      className={`group/wave flex items-center justify-between ${compact ? "mb-1 h-7" : "mb-2 h-10"}`}
      data-playing={playing || undefined}
      aria-hidden="true"
    >
      {WAVE.map((restHeight, index) => (
        <span
          key={index}
          ref={(bar) => {
            bars.current[index] = bar;
          }}
          className="min-h-1 w-[3px] flex-none origin-center rounded-full bg-zinc-900/18 transition-[background-color,transform] duration-[250ms,500ms] ease-[ease,cubic-bezier(0.32,0.72,0,1)] will-change-transform group-data-playing/wave:transition-[background-color] group-data-playing/wave:duration-250 data-played:bg-zinc-900 dark:bg-zinc-50/22 dark:data-played:bg-zinc-50"
          data-played={index / BARS < progress || undefined}
          style={{ height: `${restHeight * 100}%` }}
        />
      ))}
    </div>
  );
}

function Equalizer() {
  const reduced = useReducedMotion();
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const loops = bars.current.map((bar, index) =>
      bar
        ? animate(
            bar,
            { scaleY: [0.25, 1] },
            {
              duration: 0.55 + index * 0.13,
              delay: index * 0.21,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
            },
          )
        : null,
    );
    return () => loops.forEach((loop) => loop?.stop());
  }, [reduced]);

  return (
    <span className="inline-flex h-3 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          ref={(bar) => {
            bars.current[index] = bar;
          }}
          className="h-full w-[2.5px] origin-bottom rounded-full bg-current"
        />
      ))}
    </span>
  );
}

function Art({ episode, className }: { episode: Episode; className: string }) {
  if (episode.artwork)
    return (
      <img src={episode.artwork} alt="" draggable={false} className={`block object-cover ${className}`} />
    );
  const [a, b] = episode.colors ?? ["#a1a1aa", "#3f3f46"];
  const style: CSSProperties = {
    background: `radial-gradient(circle at 70% 30%, rgb(255 255 255 / 0.5) 0 10%, transparent 11%), linear-gradient(150deg, ${a}, ${b})`,
  };
  return <span className={`block ${className}`} style={style} aria-hidden="true" />;
}

export interface PodcastPlayerProps {
  episodes?: Episode[];
  source?: string;

  credit?: ReactNode;

  scene?: number;

  height?: number | string;

  compact?: boolean;
}

const SPRING = { type: "spring" as const, duration: 0.42, bounce: 0.12 };

function PlayButton({
  playing,
  onClick,
  className,
  layoutId,
}: {
  playing: boolean;
  onClick: () => void;
  className: string;
  layoutId?: string;
}) {
  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      transition={SPRING}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label={playing ? "Pause" : "Play"}
      className={className}
    >
      <Remold.Icon
        icon={<HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />}
        className="size-[23px]"
        fill="currentColor"
        aria-hidden="true"
      />
    </motion.button>
  );
}

export function PodcastPlayer({
  episodes: given,
  source,
  credit,
  scene,
  height = 560,
  compact = false,
}: PodcastPlayerProps) {
  const {
    audio,
    episode,
    hasRemoteEpisodes,
    open,
    playing,
    progress,
    seek,
    setOpen,
    setPlaying,
    setTime,
    time,
  } = usePodcastPlayer({ episodes: given, source, scene });

  const focus =
    "outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900";

  const playButton = (opens = false) => (
    <PlayButton
      playing={playing}
      onClick={() => {
        if (opens && !playing) setOpen(true);
        setPlaying((current) => !current);
      }}
      className={`relative z-10 grid shrink-0 place-items-center rounded-full bg-zinc-900 text-white transition-colors dark:bg-white dark:text-zinc-900 size-[52px] ${focus}`}
      layoutId="podcast-play"
    />
  );

  return (
    <div
      data-keep-frame
      className="not-prose relative w-full overflow-hidden rounded-[28px] bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
      style={{ height }}
    >
      {episode.audio && (
        <audio
          ref={audio}
          src={episode.audio}
          preload="none"
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <div data-rm-ignore="" aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Art episode={episode} className="absolute inset-0 size-full scale-125 opacity-40 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/55 to-white/80 dark:from-zinc-950/25 dark:via-zinc-950/55 dark:to-zinc-950/85" />
      </div>

      <LayoutGroup id="podcast-player">
        <motion.div
          layout
          transition={SPRING}
          className="absolute inset-0 flex flex-col items-center justify-center p-4"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {open ? (
              <motion.section
                layout
                transition={SPRING}
                aria-label={`Now playing: ${episode.title}`}
                className={`flex w-full max-w-[440px] flex-col rounded-[26px] bg-white/80 backdrop-blur-xl dark:bg-zinc-800/75 ${compact ? "h-[380px] max-h-full px-5 pt-2 pb-4" : "h-full px-6 pt-3 pb-7"}`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close player"
                    className={`grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white ${focus}`}
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-5" aria-hidden="true" />
                  </button>
                  <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                    Now playing
                  </span>
                  <span className="size-9" aria-hidden="true" />
                </div>

                <div
                  className={`flex min-h-0 flex-1 items-center justify-center ${compact ? "py-2" : "py-4"}`}
                >
                  <motion.div
                    layoutId="podcast-art"
                    transition={SPRING}
                    className={`aspect-square h-full max-w-full overflow-hidden rounded-[20px] ${compact ? "max-h-[138px]" : "max-h-[260px]"}`}
                  >
                    <Art episode={episode} className="size-full" />
                  </motion.div>
                </div>

                <div className="min-w-0">
                  <motion.h4
                    layoutId="podcast-title"
                    transition={SPRING}
                    className={`m-0 line-clamp-2 leading-snug font-semibold tracking-[-0.015em] ${compact ? "text-[17px]" : "text-[19px]"}`}
                  >
                    {episode.title}
                  </motion.h4>
                  <motion.p
                    layoutId="podcast-show"
                    transition={SPRING}
                    className={`m-0 text-zinc-500 dark:text-zinc-400 ${compact ? "mt-0.5 text-[12.5px]" : "mt-1 text-[14px]"}`}
                  >
                    {episode.show}
                  </motion.p>
                </div>

                <div className={compact ? "mt-3" : "mt-5"}>
                  <Waves playing={playing} progress={progress} compact={compact} />
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, episode.seconds)}
                    value={Math.min(time, episode.seconds)}
                    onChange={(event) => seek(Number(event.target.value))}
                    aria-label="Position"
                    style={{ "--p": `${progress * 100}%` } as CSSProperties}
                    className="h-4 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[4px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#18181b_var(--p),rgb(24_24_27/0.14)_var(--p))] dark:[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#fafafa_var(--p),rgb(250_250_250/0.2)_var(--p))] [&::-webkit-slider-thumb]:-mt-[4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-moz-range-progress]:h-[4px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-zinc-900 dark:[&::-moz-range-progress]:bg-white [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-zinc-900 dark:[&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-[4px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-900/15 dark:[&::-moz-range-track]:bg-white/20"
                  />
                  <div className="mt-1 flex justify-between text-[12px] text-zinc-500 tabular-nums dark:text-zinc-400">
                    <span>{formatClock(time)}</span>
                    <span>{`−${formatClock(Math.max(0, episode.seconds - time))}`}</span>
                  </div>
                </div>

                <div className={`flex items-center justify-center ${compact ? "mt-3 gap-6" : "mt-4 gap-9"}`}>
                  <button
                    type="button"
                    onClick={() => seek(time - 15)}
                    aria-label="Back 15 seconds"
                    className={`relative grid size-12 place-items-center rounded-full text-zinc-900 hover:bg-black/5 dark:text-zinc-100 dark:hover:bg-white/10 ${focus}`}
                  >
                    <HugeiconsIcon
                      icon={GoBackward15SecIcon}
                      className="size-[30px]"
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                  </button>
                  {playButton()}
                  <button
                    type="button"
                    onClick={() => seek(time + 30)}
                    aria-label="Forward 30 seconds"
                    className={`relative grid size-12 place-items-center rounded-full text-zinc-900 hover:bg-black/5 dark:text-zinc-100 dark:hover:bg-white/10 ${focus}`}
                  >
                    <HugeiconsIcon
                      icon={GoForward30SecIcon}
                      className="size-[30px]"
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </motion.section>
            ) : (
              <motion.section
                layout
                transition={SPRING}
                aria-label={`Now playing: ${episode.title}`}
                className="relative flex w-full max-w-[440px] items-center gap-3 overflow-hidden rounded-[20px] bg-white/80 py-2.5 pr-3 pl-2.5 backdrop-blur-xl dark:bg-zinc-800/75"
              >
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  aria-label="Open player"
                  className={`absolute inset-0 rounded-[20px] ${focus}`}
                />
                <motion.div
                  layoutId="podcast-art"
                  transition={SPRING}
                  className="size-12 shrink-0 overflow-hidden rounded-[12px]"
                >
                  <Art episode={episode} className="size-full" />
                </motion.div>
                <div className="pointer-events-none min-w-0 flex-1">
                  <motion.h4
                    layoutId="podcast-title"
                    transition={SPRING}
                    className="m-0 flex items-center gap-2 text-[14px] leading-snug font-semibold"
                  >
                    <span className="truncate">{episode.title}</span>
                    <AnimatePresence initial={false}>
                      {playing && (
                        <motion.span
                          key="eq"
                          className="inline-flex"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Equalizer />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.h4>
                  <motion.p
                    layoutId="podcast-show"
                    transition={SPRING}
                    className="m-0 truncate text-[12.5px] text-zinc-500 dark:text-zinc-400"
                  >
                    {episode.show}
                  </motion.p>
                </div>
                {playButton(true)}
              </motion.section>
            )}
          </AnimatePresence>
          {credit && hasRemoteEpisodes && !given && !open && (
            <div className="m-0 mt-3 flex justify-center text-[11px] text-zinc-500">{credit}</div>
          )}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}

export const PodcastPlayerDemo = PodcastPlayer;
