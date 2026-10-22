"use client";
/**
 * A podcast in two shapes: a grid of episode cards, and an episode's details with a player. Tap a
 * card and it opens — the artwork grows from the tile into the hero and the title lifts off it into
 * place, because the two layouts are different markup and `Remold.Layout` matches the episode
 * and its title by what they show, with no ids. The details view has an inline player that plays
 * the real episode.
 *
 * Pass `episodes`, or a `source` URL that returns `{ episodes }`. Without either it shows made-up
 * shows with drawn artwork and no audio.
 */
import { Remold } from "@remold-ui/react";
import { ArrowLeft, Bookmark, Moon, RotateCcw, RotateCw, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface Episode {
  id: string;
  show: string;
  title: string;
  /** Artwork image URL. Without one, `colors` are drawn instead. */
  artwork?: string;
  colors?: [string, string];
  /** The audio file. Without one, Play only moves the progress along. */
  audio?: string;
  /** Length in seconds. */
  seconds: number;
  /** Release date, ISO. */
  date?: string | null;
  /** A line or two about the episode. */
  summary?: string;
}

const SAMPLE: Episode[] = [
  {
    id: "s1",
    show: "Field Notes",
    title: "Why the best interfaces feel inevitable",
    colors: ["#fb923c", "#be123c"],
    seconds: 2840,
    date: "2026-10-14",
    summary: "What makes a design feel obvious in hindsight — and the small decisions, early on, that quietly get it there.",
  },
  {
    id: "s2",
    show: "Slow Light Radio",
    title: "Designing for the second visit",
    colors: ["#22d3ee", "#1d4ed8"],
    seconds: 3415,
    date: "2026-10-12",
    summary:
      "The first impression gets all the attention. This week, everything that happens after it — and why it decides whether people stay.",
  },
  {
    id: "s3",
    show: "Night Bus",
    title: "Motion that explains instead of decorates",
    colors: ["#a78bfa", "#1e1b4b"],
    seconds: 1990,
    date: "2026-10-09",
    summary: "When animation carries meaning, and when it's just noise — with examples pulled from apps you open every day.",
  },
  {
    id: "s4",
    show: "Paper Moons",
    title: "A year of shipping small",
    colors: ["#fde047", "#c2410c"],
    seconds: 4120,
    date: "2026-10-07",
    summary: "Twelve months of tiny releases, and what compounded. Notes from a team that never once did a big launch.",
  },
  {
    id: "s5",
    show: "Green Room",
    title: "Interviews with people who make tools",
    colors: ["#86efac", "#166534"],
    seconds: 2610,
    date: "2026-10-03",
    summary: "Conversations with the builders behind the software other people build with — and the taste that goes into a good tool.",
  },
];

const PLAY = "M8 5.5v13l11-6.5z";
const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
const minutes = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} hr ${Math.round((s % 3600) / 60)} min` : `${Math.round(s / 60)} min`);
/** "Today", "3d ago", "2w ago", or a date for older ones. */
const ago = (iso?: string | null) => {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const longDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

function Art({ episode, className }: { episode: Episode; className: string }) {
  if (episode.artwork) return <img src={episode.artwork} alt="" draggable={false} className={`block object-cover ${className}`} />;
  const [a, b] = episode.colors ?? ["#a1a1aa", "#3f3f46"];
  const style: CSSProperties = {
    background: `radial-gradient(circle at 70% 30%, rgb(255 255 255 / 0.5) 0 10%, transparent 11%), linear-gradient(150deg, ${a}, ${b})`,
  };
  return <span className={`block ${className}`} style={style} aria-hidden="true" />;
}

/** One request per URL, shared by every player on the page. */
const requests = new Map<string, Promise<Episode[] | null>>();
const load = (url: string) => {
  let request = requests.get(url);
  if (!request) {
    request = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { episodes?: Episode[] } | null) => (d?.episodes && d.episodes.length >= 3 ? d.episodes : null))
      .catch(() => null);
    requests.set(url, request);
  }
  return request;
};

type View = "list" | "details";

export interface PodcastPlayerProps {
  episodes?: Episode[];
  source?: string;
  /** A credit under the list, shown only for loaded episodes. */
  credit?: string;
  /** Steps from outside: even shows the list, odd opens an episode's details. Never plays sound. */
  scene?: number;
  /** The height in pixels. */
  height?: number;
}

export function PodcastPlayer({ episodes: given, source, credit, scene, height = 620 }: PodcastPlayerProps) {
  const [remote, setRemote] = useState<Episode[] | null>(null);
  useEffect(() => {
    if (!source) return;
    let live = true;
    load(source).then((e) => live && e && setRemote(e));
    return () => {
      live = false;
    };
  }, [source]);
  const episodes = given ?? remote ?? SAMPLE;

  const [view, setView] = useState<View>("list");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sleep, setSleep] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const current = episodes.find((e) => e.id === currentId) ?? null;

  // Stepped from outside: list, then an episode's details, and on to the next one.
  useEffect(() => {
    if (scene === undefined) return;
    const s = scene % 4;
    setPlaying(false);
    if (s % 2 === 0) {
      setView("list");
    } else {
      setCurrentId(episodes[((s - 1) / 2) % episodes.length]!.id);
      setView("details");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Real audio when there is some; otherwise the clock just runs.
  useEffect(() => {
    const el = audio.current;
    if (!el || !current?.audio) return;
    if (playing) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing, current?.audio]);
  useEffect(() => {
    if (!playing || current?.audio) return;
    const t = setInterval(() => setTime((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [playing, current?.audio]);
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed, current?.audio]);

  const open = (e: Episode) => {
    if (e.id !== currentId) setTime(0);
    setCurrentId(e.id);
    setPlaying(false);
    setView("details");
  };
  const back = () => {
    setPlaying(false);
    setView("list");
  };
  const seek = (by: number) => {
    const el = audio.current;
    const next = Math.max(0, Math.min((current?.seconds ?? 0) - 1, time + by));
    if (el && current?.audio) el.currentTime = next;
    setTime(next);
  };
  const nextSpeed = () => setSpeed((v) => (v === 1 ? 1.5 : v === 1.5 ? 2 : 1));

  const focus =
    "outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900";
  const shown = current ?? episodes[0]!;

  return (
    <div
      data-keep-frame
      className="not-prose @container relative w-full overflow-hidden rounded-[28px] border border-zinc-200 bg-zinc-100 font-sans text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      style={{ height }}
    >
      {current?.audio && (
        <audio
          ref={audio}
          src={current.audio}
          preload="none"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
        />
      )}
      {/* The room's light: the episode's artwork, blurred, behind everything. Ignored by the matcher. */}
      <div data-rm-ignore="" aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Art
          key={shown.id}
          episode={shown}
          className="absolute inset-0 size-full scale-125 opacity-45 blur-3xl transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/60 to-white/85 dark:from-zinc-950/25 dark:via-zinc-950/55 dark:to-zinc-950/90" />
      </div>

      <Remold.Layout trigger={[view, currentId]} spring={{ duration: 0.62, bounce: 0.14 }} className="absolute inset-0">
        {view === "details" && current ? (
          <section className="relative h-full overflow-y-auto" aria-label={`${current.title} — details`}>
            <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pt-5 pb-8 @2xl:grid @2xl:max-w-none @2xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] @2xl:items-start @2xl:gap-10 @2xl:px-10 @2xl:pt-16">
              <button
                type="button"
                onClick={back}
                aria-label="Back to episodes"
                className={`grid size-9 place-items-center rounded-full bg-white/70 text-zinc-700 ring-1 ring-white/80 backdrop-blur-xl hover:bg-white dark:bg-zinc-800/80 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700 @2xl:absolute @2xl:top-5 @2xl:left-5 ${focus}`}
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>

              <Art
                episode={current}
                className="mx-auto aspect-square w-full max-w-[280px] rounded-[22px] shadow-[0_40px_80px_-32px_rgb(0_0_0/0.55)] @2xl:mx-0 @2xl:max-w-none @2xl:sticky @2xl:top-16"
              />

              <div className="min-w-0">
                <p className="m-0 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{current.show}</p>
                <h4 className="m-0 mt-1.5 text-[24px] leading-tight font-semibold tracking-[-0.015em] @2xl:text-[30px]">{current.title}</h4>
                <p className="m-0 mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                  {[longDate(current.date), minutes(current.seconds)].filter(Boolean).join(" · ")}
                </p>

                {/* Inline player */}
                <div className="mt-5">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, current.seconds)}
                    value={Math.min(time, current.seconds)}
                    onChange={(e) => seek(Number(e.target.value) - time)}
                    aria-label="Position"
                    style={{ "--p": `${Math.min(1, time / Math.max(1, current.seconds)) * 100}%` } as CSSProperties}
                    className="group h-4 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[5px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#18181b_var(--p),rgb(24_24_27/0.16)_var(--p))] dark:[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#fafafa_var(--p),rgb(250_250_250/0.2)_var(--p))] [&::-webkit-slider-thumb]:-mt-[3.5px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity hover:[&::-webkit-slider-thumb]:opacity-100 [&::-moz-range-progress]:h-[5px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-zinc-900 dark:[&::-moz-range-progress]:bg-zinc-100 [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-zinc-900 dark:[&::-moz-range-thumb]:bg-zinc-100 [&::-moz-range-track]:h-[5px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-900/15 dark:[&::-moz-range-track]:bg-zinc-100/20"
                  />
                  <div className="-mt-0.5 flex justify-between text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                    <Remold.Text className="tabular-nums">{clock(time)}</Remold.Text>
                    <Remold.Text className="tabular-nums">{`−${clock(Math.max(0, current.seconds - time))}`}</Remold.Text>
                  </div>
                  {/* Transport: one balanced row — speed, skip back, play, skip forward, sleep. */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={nextSpeed}
                      aria-label={`Speed ${speed} times`}
                      className={`w-10 rounded-full py-1 text-left text-[15px] font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white ${focus}`}
                    >
                      <Remold.Text className="tabular-nums">{`${speed}×`}</Remold.Text>
                    </button>
                    <button
                      type="button"
                      onClick={() => seek(-15)}
                      aria-label="Back 15 seconds"
                      className={`relative grid size-12 place-items-center rounded-full text-zinc-900 hover:bg-black/5 dark:text-zinc-100 dark:hover:bg-white/10 ${focus}`}
                    >
                      <RotateCcw className="size-[34px]" strokeWidth={1.4} aria-hidden="true" />
                      <span className="absolute text-[10px] font-bold tabular-nums">15</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      aria-label={playing ? "Pause" : "Play"}
                      className={`grid size-14 place-items-center rounded-full text-zinc-900 transition active:scale-90 dark:text-zinc-100 ${focus}`}
                    >
                      <Remold.Icon
                        d={playing ? PAUSE : PLAY}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={`size-11 ${playing ? "" : "translate-x-0.5"}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => seek(30)}
                      aria-label="Forward 30 seconds"
                      className={`relative grid size-12 place-items-center rounded-full text-zinc-900 hover:bg-black/5 dark:text-zinc-100 dark:hover:bg-white/10 ${focus}`}
                    >
                      <RotateCw className="size-[34px]" strokeWidth={1.4} aria-hidden="true" />
                      <span className="absolute text-[10px] font-bold tabular-nums">30</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSleep((s) => !s)}
                      aria-label="Sleep timer"
                      aria-pressed={sleep}
                      className={`grid w-10 place-items-center justify-items-end rounded-full py-1 ${
                        sleep ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
                      } hover:text-zinc-900 dark:hover:text-white ${focus}`}
                    >
                      <Moon className="size-[21px]" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-[13px] font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-white dark:bg-zinc-800/80 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700 ${focus}`}
                  >
                    <Bookmark className="size-[15px]" aria-hidden="true" /> Save
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-[13px] font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-white dark:bg-zinc-800/80 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700 ${focus}`}
                  >
                    <Share2 className="size-[15px]" aria-hidden="true" /> Share
                  </button>
                </div>

                <p className="m-0 mt-6 text-[11px] font-semibold tracking-[0.08em] text-zinc-400 uppercase">About this episode</p>
                <p className="m-0 mt-2 max-w-[62ch] text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {current.summary ?? `A new episode of ${current.show}.`}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex h-full flex-col">
            <header className="px-6 pt-7 pb-4">
              <p className="m-0 text-[12px] font-medium tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">Listen now</p>
              <h4 className="m-0 mt-1 text-[26px] font-semibold tracking-[-0.02em]">New episodes</h4>
            </header>
            <ol className="m-0 grid flex-1 list-none grid-cols-1 content-start gap-3 overflow-y-auto px-5 pb-6 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
              {episodes.map((e) => (
                <li key={e.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => open(e)}
                    aria-label={`${e.title} — ${e.show}`}
                    className={`relative block aspect-[4/5] w-full overflow-hidden rounded-[20px] text-left shadow-[0_14px_34px_-20px_rgb(0_0_0/0.55)] ${focus}`}
                  >
                    <Art episode={e} className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.04]" />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/90 via-black/60 to-transparent"
                    />
                    <span className="absolute inset-x-0 bottom-0 grid gap-1 p-3.5 text-white">
                      <span className="text-[11px] font-medium text-white/60">
                        {[ago(e.date), minutes(e.seconds)].filter(Boolean).join(" · ")}
                      </span>
                      <strong className="line-clamp-2 text-[14.5px] leading-snug font-semibold">{e.title}</strong>
                      {e.summary ? (
                        <span className="line-clamp-2 text-[11.5px] leading-snug text-white/70">{e.summary}</span>
                      ) : (
                        <span className="truncate text-[11.5px] text-white/70">{e.show}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
              {credit && remote && !given && <li className="col-span-full px-1 text-[11px] text-zinc-500">{credit}</li>}
            </ol>
          </div>
        )}
      </Remold.Layout>
    </div>
  );
}

/** The name the docs pages use. */
export const PodcastPlayerDemo = PodcastPlayer;
