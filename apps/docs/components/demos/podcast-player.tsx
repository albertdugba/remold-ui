"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, GoBackward15SecIcon, GoForward30SecIcon, PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { formatClock, usePodcastPlayer, type Episode } from "./podcast-player.model";
import { useFocusAfterChange } from "./use-focus-after-change";

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

function paintOf(episode: Episode): CSSProperties {
  if (episode.artwork) return { backgroundImage: `url("${episode.artwork}")` };

  const [a, b] = episode.colors ?? ["#a1a1aa", "#3f3f46"];

  return {
    backgroundColor: b,
    backgroundImage: `radial-gradient(circle at 70% 30%, rgb(255 255 255 / 0.5) 0 10%, transparent 11%), linear-gradient(150deg, ${a}, ${b})`,
  };
}

export interface PodcastPlayerProps {
  episodes?: Episode[];
  source?: string;

  heading?: string;

  credit?: ReactNode;

  scene?: number;

  height?: number | string;

  compact?: boolean;
}

const MORPH = { duration: 0.55, bounce: 0.12 };
const MATCH = { threshold: 0.8 };
const GRID = { compact: "grid-cols-3 gap-2 px-4 pb-4", roomy: "grid-cols-2 gap-3 px-5 pb-5 @md:grid-cols-3 @2xl:grid-cols-4" };

const FADE = "transition-opacity duration-300 ease-out motion-reduce:transition-none";
const TILE = "relative aspect-square has-[:active]:scale-[0.98] motion-safe:transition-[scale] motion-safe:duration-150";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900";
const ROUND_BUTTON = `relative grid size-12 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-zinc-900 transition-[background-color] duration-150 ease-out hover:bg-black/5 dark:text-zinc-100 dark:hover:bg-white/10 ${FOCUS}`;
const SCRUBBER =
  "h-4 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[4px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#18181b_var(--p),rgb(24_24_27/0.14)_var(--p))] dark:[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#fafafa_var(--p),rgb(250_250_250/0.2)_var(--p))] [&::-webkit-slider-thumb]:-mt-[4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-moz-range-progress]:h-[4px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-zinc-900 dark:[&::-moz-range-progress]:bg-white [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-zinc-900 dark:[&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-[4px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-900/15 dark:[&::-moz-range-track]:bg-white/20";

function Heading({ heading, credit, compact }: { heading: string; credit: ReactNode; compact: boolean }) {
  return (
    <header className={`flex flex-none items-end justify-between gap-3 ${compact ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4"}`}>
      <span className="grid min-w-0">
        <span className="text-[11.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase dark:text-zinc-400">Listen now</span>
        <h4 className={`m-0 mt-0.5 truncate font-semibold tracking-[-0.02em] ${compact ? "text-[19px]" : "text-[24px]"}`}>{heading}</h4>
      </span>

      {credit && !compact && <span className="flex-none pb-1 text-[11.5px] text-zinc-600 dark:text-zinc-400">{credit}</span>}
    </header>
  );
}

function Cover({ episode, open, className }: { episode: Episode; open: boolean; className: string }) {
  return (
    <div aria-hidden="true" className={`relative bg-cover bg-center ${className}`} style={paintOf(episode)}>
      <span data-rm-ignore="" className={`absolute inset-0 rounded-[inherit] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.55)] ${FADE} ${open ? "opacity-100" : "opacity-0"}`} />

      <span
        data-rm-ignore=""
        className={`@container absolute inset-x-0 bottom-0 flex h-[62%] items-end rounded-b-[inherit] bg-gradient-to-t from-black/85 via-black/45 to-transparent ${FADE} ${open ? "opacity-0" : "opacity-100"}`}
      >
        <span className="grid min-w-0 gap-px p-[5.8cqw] text-white">
          <strong className="line-clamp-2 text-[length:clamp(11px,6.8cqw,18px)] leading-snug font-semibold">{episode.title}</strong>
          <span className="truncate text-[length:clamp(10px,5.6cqw,14px)] text-white/70">{episode.show}</span>
        </span>
      </span>
    </div>
  );
}

function Entry({ episode, open, compact, onBack, children }: { episode: Episode; open: boolean; compact: boolean; onBack: () => void; children: ReactNode }) {
  const frame = open ? `flex h-full flex-col ${compact ? "px-4 pt-3 pb-4" : "px-6 pt-4 pb-6 @2xl:px-10"}` : TILE;
  const body = open ? `flex min-h-0 flex-1 flex-col justify-center ${compact ? "gap-3" : "gap-5 @2xl:flex-row @2xl:items-center @2xl:gap-10"}` : "contents";
  const cover = open
    ? `aspect-square h-full max-w-full rounded-[22px] ${compact ? "max-h-[130px]" : "max-h-[230px] @2xl:h-auto @2xl:max-h-none @2xl:w-[280px]"}`
    : "size-full rounded-[18px]";

  return (
    <section aria-label={open ? `Now playing: ${episode.title}` : undefined} className={frame}>
      {open && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the list"
          data-podcast-close=""
          className={`grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white/60 text-zinc-700 transition-[background-color] duration-150 ease-out hover:bg-white/90 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800 ${FOCUS}`}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" aria-hidden="true" />
        </button>
      )}

      <div className={body}>
        <div className={open ? "flex min-h-0 flex-1 items-center justify-center @2xl:flex-none" : "absolute inset-0"}>
          <Cover episode={episode} open={open} className={cover} />
        </div>

        {children}
      </div>
    </section>
  );
}

function Tile({ episode, onOpen }: { episode: Episode; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${episode.title} by ${episode.show}`}
      data-podcast-open={episode.id}
      className={`absolute inset-0 block w-full cursor-pointer rounded-[18px] border-0 bg-transparent p-0 ${FOCUS}`}
    />
  );
}

function Player({
  episode,
  playing,
  time,
  progress,
  compact,
  onSeek,
  onToggle,
}: {
  episode: Episode;
  playing: boolean;
  time: number;
  progress: number;
  compact: boolean;
  onSeek: (seconds: number) => void;
  onToggle: () => void;
}) {
  return (
        <div className="min-w-0 @2xl:flex-1">
          <h4 className={`m-0 line-clamp-2 leading-snug font-semibold tracking-[-0.015em] ${compact ? "text-[17px]" : "text-[21px] @2xl:text-[26px]"}`}>{episode.title}</h4>
          <p className={`m-0 text-zinc-600 dark:text-zinc-400 ${compact ? "mt-0.5 text-[12.5px]" : "mt-1 text-[14px]"}`}>{episode.show}</p>

          {episode.summary && !compact && (
            <p className="m-0 mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-zinc-700 @2xl:line-clamp-3 dark:text-zinc-300">{episode.summary}</p>
          )}

          <div className={compact ? "mt-3" : "mt-5"}>
            <Waves playing={playing} progress={progress} compact={compact} />
            <input
              type="range"
              min={0}
              max={Math.max(1, episode.seconds)}
              value={Math.min(time, episode.seconds)}
              onChange={(event) => onSeek(Number(event.target.value))}
              aria-label="Position"
              aria-valuetext={`${formatClock(Math.min(time, episode.seconds))} of ${formatClock(episode.seconds)}`}
              style={{ "--p": `${progress * 100}%` } as CSSProperties}
              className={SCRUBBER}
            />
            <div className="mt-1 flex justify-between text-[12px] text-zinc-600 tabular-nums dark:text-zinc-400">
              <span>{formatClock(time)}</span>
              <span>{`−${formatClock(Math.max(0, episode.seconds - time))}`}</span>
            </div>
          </div>

          <div className={`flex items-center justify-center ${compact ? "mt-2 gap-6" : "mt-4 gap-9"}`}>
            <button type="button" onClick={() => onSeek(time - 15)} aria-label="Back 15 seconds" className={ROUND_BUTTON}>
              <HugeiconsIcon icon={GoBackward15SecIcon} className="size-[30px]" strokeWidth={1.4} aria-hidden="true" />
            </button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onToggle}
              aria-label={playing ? "Pause" : "Play"}
              data-podcast-play=""
              className={`grid size-[52px] shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 ${FOCUS}`}
            >
              <Remold.Icon icon={<HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />} className="size-[23px]" fill="currentColor" aria-hidden="true" />
            </motion.button>

            <button type="button" onClick={() => onSeek(time + 30)} aria-label="Forward 30 seconds" className={ROUND_BUTTON}>
              <HugeiconsIcon icon={GoForward30SecIcon} className="size-[30px]" strokeWidth={1.4} aria-hidden="true" />
            </button>
          </div>
        </div>
  );
}

export function PodcastPlayer({ episodes: given, source, heading = "New episodes", credit, scene, height = 560, compact = false }: PodcastPlayerProps) {
  const player = usePodcastPlayer({ episodes: given, source, scene });
  const { audio, episode, episodes, open, playing, progress, time } = player;
  const root = useRef<HTMLDivElement>(null);
  const shown = open ? [episode] : compact ? episodes.slice(0, 6) : episodes;

  useFocusAfterChange(root, open, (element) =>
    element.querySelector<HTMLElement>(open ? "[data-podcast-play]" : `[data-podcast-open="${CSS.escape(episode.id)}"]`),
  );

  return (
    <div
      ref={root}
      data-keep-frame
      className="@container not-prose relative w-full overflow-hidden rounded-[28px] bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
      style={{ height }}
    >
      {episode.audio && (
        <audio
          ref={audio}
          src={episode.audio}
          preload="none"
          onTimeUpdate={(event) => player.setTime(event.currentTarget.currentTime)}
          onEnded={player.next}
        />
      )}

      <div data-rm-ignore="" aria-hidden="true" className="pointer-events-none absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={episode.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="absolute inset-0 scale-150 bg-cover bg-center opacity-80 blur-3xl saturate-150" style={paintOf(episode)} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/45 to-white/70 dark:from-zinc-950/25 dark:via-zinc-950/50 dark:to-zinc-950/80" />
      </div>

      <MotionConfig reducedMotion="user">
        <Remold.Morph trigger={open ? episode.id : null} spring={MORPH} match={MATCH} lift className="absolute inset-0 flex flex-col">
          {!open && <Heading heading={heading} credit={player.hasRemoteEpisodes && !given ? credit : null} compact={compact} />}

          <ol className={open ? "m-0 min-h-0 flex-1 list-none p-0" : `m-0 grid min-h-0 flex-1 list-none content-start overflow-y-auto p-0 [scrollbar-width:none] ${GRID[compact ? "compact" : "roomy"]}`}>
            {shown.map((item) => (
              <li key={item.id} className={open ? "h-full" : undefined}>
                <Entry episode={item} open={open} compact={compact} onBack={player.close}>
                  {open ? (
                    <Player
                      episode={item}
                      playing={playing}
                      time={time}
                      progress={progress}
                      compact={compact}
                      onSeek={player.seek}
                      onToggle={() => player.setPlaying((current) => !current)}
                    />
                  ) : (
                    <Tile episode={item} onOpen={() => player.openEpisode(item.id)} />
                  )}
                </Entry>
              </li>
            ))}
          </ol>
        </Remold.Morph>
      </MotionConfig>
    </div>
  );
}

export const PodcastPlayerDemo = PodcastPlayer;
