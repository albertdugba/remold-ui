import { useEffect, useRef, useState } from "react";

export interface Episode {
  id: string;
  show: string;
  title: string;
  artwork?: string;
  colors?: [string, string];
  audio?: string;
  seconds: number;
  date?: string | null;
  summary?: string;
}

export const SAMPLE_EPISODES: Episode[] = [
  {
    id: "s1",
    show: "Field Notes",
    title: "Why the best interfaces feel inevitable",
    colors: ["#fb923c", "#be123c"],
    seconds: 2840,
    date: "2026-10-14",
    summary:
      "What makes a design feel obvious in hindsight — and the small decisions, early on, that quietly get it there.",
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
    summary:
      "When animation carries meaning, and when it's just noise — with examples pulled from apps you open every day.",
  },
  {
    id: "s4",
    show: "Paper Moons",
    title: "A year of shipping small",
    colors: ["#fde047", "#c2410c"],
    seconds: 4120,
    date: "2026-10-07",
    summary:
      "Twelve months of tiny releases, and what compounded. Notes from a team that never once did a big launch.",
  },
  {
    id: "s5",
    show: "Green Room",
    title: "Interviews with people who make tools",
    colors: ["#86efac", "#166534"],
    seconds: 2610,
    date: "2026-10-03",
    summary:
      "Conversations with the builders behind the software other people build with — and the taste that goes into a good tool.",
  },
];

export const formatClock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.floor(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const requests = new Map<string, Promise<Episode[] | null>>();

const fetchEpisodes = (source: string) => {
  let request = requests.get(source);
  if (!request) {
    request = fetch(source)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { episodes?: Episode[] } | null) =>
        payload?.episodes && payload.episodes.length >= 3 ? payload.episodes : null,
      )
      .catch(() => null);
    requests.set(source, request);
  }
  return request;
};

export function usePodcastPlayer({
  episodes,
  source,
  scene,
}: {
  episodes?: Episode[];
  source?: string;
  scene?: number;
}) {
  const [remoteEpisodes, setRemoteEpisodes] = useState<Episode[] | null>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!source) return;
    let current = true;
    fetchEpisodes(source).then((items) => {
      if (current && items) setRemoteEpisodes(items);
    });
    return () => {
      current = false;
    };
  }, [source]);

  const episode = (episodes ?? remoteEpisodes ?? SAMPLE_EPISODES)[0]!;

  useEffect(() => {
    if (scene === undefined) return;
    setPlaying(false);
    setOpen(scene % 2 === 1);
  }, [scene]);

  useEffect(() => {
    setTime(0);
    setPlaying(false);
  }, [episode.id]);

  useEffect(() => {
    const element = audio.current;
    if (!element || !episode.audio) return;
    if (playing) element.play().catch(() => setPlaying(false));
    else element.pause();
  }, [episode.audio, playing]);

  useEffect(() => {
    if (!playing || episode.audio) return;
    const interval = setInterval(() => setTime((current) => Math.min(episode.seconds, current + 1)), 1000);
    return () => clearInterval(interval);
  }, [episode.audio, episode.seconds, playing]);

  const seek = (requested: number) => {
    const clamped = Math.max(0, Math.min(episode.seconds - 1, requested));
    if (audio.current && episode.audio) audio.current.currentTime = clamped;
    setTime(clamped);
  };

  return {
    audio,
    episode,
    hasRemoteEpisodes: remoteEpisodes !== null,
    open,
    playing,
    progress: Math.min(1, time / Math.max(1, episode.seconds)),
    seek,
    setOpen,
    setPlaying,
    setTime,
    time,
  };
}
