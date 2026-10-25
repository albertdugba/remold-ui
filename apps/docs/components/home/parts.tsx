"use client";
/**
 * "Every part, live": one card per kind of change, each the real thing on a plain stage, with a
 * few chips to change its state. Every card plays by itself while it's on screen and stops for
 * good as soon as someone touches it.
 */
import { Remold, useAutoplay } from "@remold-ui/react";
import { Check, Download, LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";

const VoiceOrb = dynamic(() => import("../demos/voice-orb").then((m) => m.VoiceOrb), { ssr: false }) as ComponentType<
  import("../demos/voice-orb").VoiceOrbProps
>;
const ORB_STATES = ["idle", "listening", "thinking", "speaking"] as const;
const ParticlesStory = dynamic(() => import("./particles-story/particles-story").then((m) => m.ParticlesStory), { ssr: false });
const EmblemDemo = dynamic(() => import("../demos/emblem").then((m) => m.EmblemDemo), { ssr: false });
const SearchResultsDemo = dynamic(() => import("../demos/search-results").then((m) => m.SearchResultsDemo), { ssr: false });
const TwoFactorDemo = dynamic(() => import("../demos/two-factor").then((m) => m.TwoFactorDemo), { ssr: false });
const InviteTeamDemo = dynamic(() => import("../demos/invite-team").then((m) => m.InviteTeamDemo), { ssr: false });
const CommentThread = dynamic(() => import("../demos/comment-thread").then((m) => m.CommentThreadDemo), { ssr: false });
const PodcastPlayer = dynamic(() => import("../demos/podcast-player").then((m) => m.PodcastPlayer), { ssr: false }) as ComponentType<
  import("../demos/podcast-player").PodcastPlayerProps
>;
const RemoldPerson = dynamic(() => import("./remold-person").then((m) => m.RemoldPerson), { ssr: false });
const LogoMorph = dynamic(() => import("../demos/logo-morph").then((m) => m.LogoMorph), { ssr: false }) as ComponentType<
  import("../demos/logo-morph").LogoMorphProps
>;

/* A card: the live part, its name, and a play / pause button in the corner */

const PLAY = "M8 5.5v13l11-6.5z";
const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";

function PartCard({
  title,
  kicker,
  states,
  every = 2400,
  wide = false,
  full = false,
  bleed = false,
  tall = false,
  dark = false,
  selfPlaying = false,
  minHeight,
  children,
}: {
  title: string;
  kicker: string;
  states: string[];
  every?: number;
  wide?: boolean;
  full?: boolean;
  /** The part covers the whole card, edge to edge, like an embed. */
  bleed?: boolean;
  /** Two rows tall, for parts that need the height. */
  tall?: boolean;
  /** A dark card, for canvas pieces drawn on a dark stage. */
  dark?: boolean;
  /** The part runs itself (its own autoplay and controls): no card play button or stepping. */
  selfPlaying?: boolean;
  /** A fixed minimum height for a feature that needs a larger canvas. */
  minHeight?: number;
  children: (step: number, playing: boolean) => ReactNode;
}) {
  const autoplay = useAutoplay(states.length, { every, autoStart: !selfPlaying });
  const cls = `hp-card${wide ? " wide" : ""}${full ? " full" : ""}${bleed ? " bleed" : ""}${tall ? " tall" : ""}${dark ? " dark" : ""}`;
  return (
    <article ref={autoplay.ref} className={cls} style={minHeight ? { minHeight } : undefined} aria-label={selfPlaying ? title : `${title}: ${states[autoplay.step]}`}>
      {!selfPlaying && (
        <button
          type="button"
          {...autoplay.toggleProps}
          className="hp-play"
          aria-label={autoplay.playing ? `Pause ${title}` : `Play ${title}`}
        >
          <Remold.Icon d={autoplay.playing ? PAUSE : PLAY} viewBox="0 0 24 24" fill="currentColor" />
        </button>
      )}
      <div className="hp-stage">{children(autoplay.step, autoplay.playing)}</div>
      <footer className="hp-foot">
        <span className="hp-kicker">{kicker}</span>
      </footer>
    </article>
  );
}

/* A button that changes state: its icon morphs and its label rewrites itself */

const BUTTON = [
  { icon: Download, label: "Download", tone: "idle" },
  { icon: LoaderCircle, label: "Downloading…", tone: "busy" },
  { icon: Check, label: "Saved", tone: "done" },
] as const;

function StateButton({ step }: { step: number }) {
  const s = BUTTON[step % BUTTON.length]!;
  return (
    <button type="button" className={`hp-button ${s.tone}`}>
      <span className={s.tone === "busy" ? "hp-spin" : undefined}>
        <Remold.Icon icon={s.icon} className="size-[18px]" strokeWidth={2.2} />
      </span>
      <Remold.Text>{s.label}</Remold.Text>
    </button>
  );
}

const LOGO = [
  { brand: 0, form: "text" as const },
  { brand: 0, form: "logo" as const },
  { brand: 3, form: "text" as const },
  { brand: 3, form: "logo" as const },
];

export function Parts() {
  return (
    <div className="hp">
      <PartCard kicker="Layout · Connectors" title="Review thread" states={["Q&A"]} wide bleed selfPlaying minHeight={720}>
        {() => <CommentThread variant="preview" />}
      </PartCard>
      <PartCard kicker="Canvas · States" title="Voice states" states={["Idle", "Listening", "Thinking", "Speaking"]} every={2200} dark>
        {(i) => <VoiceOrb state={ORB_STATES[i]!} size={240} />}
      </PartCard>
      <PartCard kicker="Canvas · Particles" title="From first look to front door" states={["Journey"]} wide bleed minHeight={720}>
        {(_, playing) => <ParticlesStory playing={playing} />}
      </PartCard>
      <PartCard kicker="Text · Icons" title="Download to saved" states={["Idle", "Busy", "Done"]} every={1600}>
        {(i) => <StateButton step={i} />}
      </PartCard>
      <PartCard kicker="Layout · Text" title="Search to results" states={["Search"]}>
        {(_, playing) => <SearchResultsDemo framed={false} playing={playing} />}
      </PartCard>
      <PartCard kicker="Layout · Reveal" title="Turn on two-factor" states={["Two-factor"]}>
        {(_, playing) => <TwoFactorDemo framed={false} playing={playing} />}
      </PartCard>
      <PartCard kicker="Layout · Shared" title="Email to teammate" states={["Invite"]}>
        {(_, playing) => <InviteTeamDemo framed={false} playing={playing} />}
      </PartCard>
      <PartCard kicker="SVG · Shapes" title="Artwork in motion" states={["Listen", "Shop", "Measure", "Talk", "Create"]} every={1800}>
        {(i) => <EmblemDemo framed={false} index={i} />}
      </PartCard>
      <PartCard
        kicker="Layout · Media"
        title="Episode to details"
        states={["Episodes", "Details", "Episodes", "Details"]}
        every={2600}
        wide
        bleed
      >
        {(i) => <PodcastPlayer source="/api/podcasts" scene={i} height={720} />}
      </PartCard>
      <div className="hp-pair">
        <PartCard kicker="Layout · Matching" title="One person, four components" states={["Chip"]} bleed selfPlaying>
          {() => <RemoldPerson />}
        </PartCard>
        <PartCard kicker="SVG · Branding" title="Word into logo" states={["Cursor", "Cursor logo", "X", "X logo"]} every={2000}>
          {(i) => <LogoMorph selected={LOGO[i]} controls={false} autoplay={false} height={220} />}
        </PartCard>
      </div>
    </div>
  );
}
