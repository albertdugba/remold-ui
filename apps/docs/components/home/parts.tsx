"use client";
/**
 * "Every part, live": one card per kind of change, each the real thing on a plain stage, with a
 * few chips to change its state. Every card plays by itself while it's on screen and stops for
 * good as soon as someone touches it.
 */
import { Tabs } from "@base-ui/react/tabs";
import { Remold, useAutoplay } from "@remold-ui/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useInPreview } from "../demos/portal-container";
import {
  Children,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";

const VoiceOrb = dynamic(
  () => import("../demos/voice-orb").then((m) => m.VoiceOrb),
  { ssr: false },
) as ComponentType<import("../demos/voice-orb").VoiceOrbProps>;
const ORB_STATES = ["idle", "listening", "thinking", "speaking"] as const;
const ParticlesStory = dynamic(
  () =>
    import("./particles-story/particles-story").then((m) => m.ParticlesStory),
  { ssr: false },
);
const EmblemDemo = dynamic(
  () => import("../demos/emblem").then((m) => m.EmblemDemo),
  { ssr: false },
);
const TwoFactorDemo = dynamic(
  () => import("../demos/two-factor").then((m) => m.TwoFactorDemo),
  { ssr: false },
);
const HoldToRecordDemo = dynamic(
  () => import("../demos/hold-to-record").then((m) => m.HoldToRecordDemo),
  { ssr: false },
);
const FlightBookingDemo = dynamic(
  () => import("../demos/flight-booking").then((m) => m.FlightBookingDemo),
  { ssr: false },
);
const OtpInputDemo = dynamic(
  () => import("../demos/otp-input").then((m) => m.OtpInputDemo),
  { ssr: false },
);
const LiveRoomDemo = dynamic(
  () => import("../demos/live-room").then((m) => m.LiveRoomDemo),
  { ssr: false },
);
const InviteTeamDemo = dynamic(
  () => import("../demos/invite-team").then((m) => m.InviteTeamDemo),
  { ssr: false },
);
const CommentThread = dynamic(
  () => import("../demos/comment-thread").then((m) => m.CommentThreadDemo),
  { ssr: false },
);
const PodcastPlayer = dynamic(
  () => import("../demos/podcast-player").then((m) => m.PodcastPlayer),
  { ssr: false },
) as ComponentType<import("../demos/podcast-player").PodcastPlayerProps>;
const RemoldPerson = dynamic(
  () => import("./remold-person").then((m) => m.RemoldPerson),
  { ssr: false },
);
const SendMoneyDemo = dynamic(
  () => import("../demos/send-money").then((m) => m.SendMoneyDemo),
  { ssr: false },
);
const IssueStatusDemo = dynamic(
  () => import("../demos/issue-status").then((m) => m.IssueStatusDemo),
  { ssr: false },
);
const SendMessageDemo = dynamic(
  () => import("../demos/send-message").then((m) => m.SendMessageDemo),
  { ssr: false },
);
const StreakDemo = dynamic(
  () => import("../demos/streak").then((m) => m.StreakDemo),
  { ssr: false },
);
const RevenueCardDemo = dynamic(
  () => import("../demos/revenue-card").then((m) => m.RevenueCardDemo),
  { ssr: false },
);
const ApiKeysDemo = dynamic(
  () => import("../demos/api-keys").then((m) => m.ApiKeysDemo),
  { ssr: false },
);
const SeatCalculatorDemo = dynamic(
  () => import("../demos/seat-calculator").then((m) => m.SeatCalculatorDemo),
  { ssr: false },
);
const EditorMentionsDemo = dynamic(
  () =>
    import("../demos/editor-mentions.demo").then((m) => m.EditorMentionsDemo),
  { ssr: false },
);
const UsageMeterDemo = dynamic(
  () => import("../demos/usage-meter").then((m) => m.UsageMeterDemo),
  { ssr: false },
);
const WaitlistDemo = dynamic(
  () => import("../demos/waitlist").then((m) => m.WaitlistDemo),
  { ssr: false },
);
const OnboardingChecklistDemo = dynamic(
  () =>
    import("../demos/onboarding-checklist").then(
      (m) => m.OnboardingChecklistDemo,
    ),
  { ssr: false },
);
const BulkSelectDemo = dynamic(
  () => import("../demos/bulk-select").then((m) => m.BulkSelectDemo),
  { ssr: false },
);
const ConnectionBannerDemo = dynamic(
  () =>
    import("../demos/connection-banner").then((m) => m.ConnectionBannerDemo),
  { ssr: false },
);
const FilterBarDemo = dynamic(
  () => import("../demos/filter-bar").then((m) => m.FilterBarDemo),
  { ssr: false },
);
const LabelPickerDemo = dynamic(
  () => import("../demos/label-picker").then((m) => m.LabelPickerDemo),
  { ssr: false },
);
const WalletStackDemo = dynamic(
  () => import("../demos/wallet-stack").then((m) => m.WalletStackDemo),
  { ssr: false },
);
const LogoMorph = dynamic(
  () => import("../demos/logo-morph").then((m) => m.LogoMorph),
  { ssr: false },
) as ComponentType<import("../demos/logo-morph").LogoMorphProps>;

/* A card: the live part, its name, and a play / pause button in the corner */

const PLAY = "M8 5.5v13l11-6.5z";
const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";

/** The tabs over the grid, like a gallery's sections. */
export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "morphing", label: "Morphing" },
  { id: "canvas", label: "Canvas & Particles" },
  { id: "illustrations", label: "Illustrations" },
  { id: "payments", label: "Payments" },
  { id: "charts", label: "Charts & Data" },
  { id: "forms", label: "Forms & Inputs" },
] as const;

export type Category = Exclude<(typeof CATEGORIES)[number]["id"], "all">;

/** The plain names people see in the component catalogue and docs, rather than each card's marketing headline. */
const COMPONENT_NAME_BY_DOC: Record<string, string> = {
  "/docs/components/live-room": "Live room",
  "/docs/components/comment-thread": "Comment thread",
  "/docs/components/otp-input": "One-time code",
  "/docs/components/voice-orb": "Voice orb",
  "/docs/primitives/layout": "Layout",
  "/docs/components/particles-story": "Particles story",
  "/docs/components/two-factor": "Two-factor setup",
  "/docs/components/flight-booking": "Flight booking",
  "/docs/components/invite-team": "Invite teammates",
  "/docs/primitives/icon": "SVG morph",
  "/docs/components/podcast-player": "Podcast",
  "/docs/components/logo-morph": "Logo morph",
};

/** A card's anchor on the home page, from its title: "Send money" → "send-money". */
export const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function PartCard({
  title,
  category: _category,
  docs,
  covers: _covers,
  bare = false,
  spotlight: _spotlight,
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
  /** One of the cards the page leads with. */
  featured?: boolean;
  /** The tab it's listed under. */
  category: Category;
  /** Where it's documented, if it has a page; the components page links there. */
  docs?: string;
  /** The id of a "Browse all" entry this card stands in for, so it isn't listed twice. */
  covers?: string;
  /** Drawn straight on the page with no frame or card behind it: for visual pieces (an orb, artwork, a logo). */
  bare?: boolean;
  /** On the components page, a double-size card, so a tall interaction is big enough to follow. */
  spotlight?: boolean;
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
  /** A fixed minimum height for a spanning feature card that needs a larger canvas. */
  minHeight?: number;
  children: (step: number, playing: boolean) => ReactNode;
}) {
  const inPreview = useInPreview();
  const componentName = docs ? COMPONENT_NAME_BY_DOC[docs] ?? title : title;
  const autoplay = useAutoplay(states.length, {
    every,
    autoStart: !selfPlaying,
  });
  const cls = `hp-card${wide ? " wide" : ""}${full ? " full" : ""}${
    bleed ? " bleed" : ""
  }${tall ? " tall" : ""}${dark ? " dark" : ""}${bare ? " bare" : ""}`;
  return (
    <article
      ref={autoplay.ref}
      id={slugOf(title)}
      className={cls}
      style={
        minHeight && (wide || full || tall) ? { minHeight } : undefined
      }
      aria-label={selfPlaying ? title : `${title}: ${states[autoplay.step]}`}
    >
      {!selfPlaying && (
        <button
          type="button"
          {...autoplay.toggleProps}
          className="hp-play"
          aria-label={autoplay.playing ? `Pause ${title}` : `Play ${title}`}
        >
          <Remold.Icon
            d={autoplay.playing ? PAUSE : PLAY}
            viewBox="0 0 24 24"
            fill="currentColor"
          />
        </button>
      )}
      <div className="hp-stage">
        {children(autoplay.step, autoplay.playing)}
      </div>
      <footer className="hp-foot">
        <span className="hp-kicker">{componentName}</span>
        {docs && !inPreview && (
          <Link
            href={docs}
            className="hp-doc-link"
            aria-label={`View ${title} component details`}
          >
            View <span aria-hidden="true">→</span>
          </Link>
        )}
      </footer>
    </article>
  );
}

/** Apple's own badge, as its guidelines ask: the previews are Apple Music's, so it links to the artist there. */
function AppleMusicBadge() {
  const badge = (
    <img
      src="/brand/listen-on-apple-music.svg"
      alt="Listen on Apple Music"
      width={110}
      height={32}
      style={{ display: "block" }}
    />
  );
  // In a preview card (itself a link) it's just the badge: a link can't hold another link.
  if (useInPreview()) return badge;
  return (
    <a
      href="https://music.apple.com/gh/artist/kofi-kinaata/744862250"
      target="_blank"
      rel="noreferrer"
      aria-label="Listen to Kofi Kinaata on Apple Music"
    >
      {badge}
    </a>
  );
}
const APPLE_MUSIC_BADGE = <AppleMusicBadge />;

const LOGO = [
  { brand: 0, form: "text" as const },
  { brand: 0, form: "logo" as const },
  { brand: 3, form: "text" as const },
  { brand: 3, form: "logo" as const },
];

type Card = ReactElement<Parameters<typeof PartCard>[0]>;

/** One landing card as data, for the components page: the same component, props and order. */
export interface LandingCard {
  slug: string;
  title: string;
  kicker: string;
  category: Category;
  categoryLabel: string;
  href: string;
  covers?: string;
  states: number;
  every: number;
  wide: boolean;
  bare: boolean;
  bleed: boolean;
  spotlight: boolean;
  render: (step: number, playing: boolean) => ReactNode;
}

/** Every landing card, in the landing page's order. */
export function landingCards(): LandingCard[] {
  return (Children.toArray(allCards().props.children) as Card[]).map(
    ({ props }) => ({
      slug: slugOf(props.title),
      title: props.title,
      kicker: props.kicker,
      category: props.category,
      categoryLabel: CATEGORIES.find((c) => c.id === props.category)!.label,
      href: props.docs ?? `/#${slugOf(props.title)}`,
      covers: props.covers,
      states: props.states.length,
      every: props.every ?? 2400,
      wide: Boolean(props.wide || props.full || props.bleed),
      bare: Boolean(props.bare),
      bleed: Boolean(props.bleed),
      spotlight: Boolean(props.spotlight),
      render: props.children,
    }),
  );
}

export function Parts() {
  // The cards show in the order they're written below: no shuffling.
  const [tab, setTab] = useState<Category | "all">("all");
  const cards = Children.toArray(allCards().props.children) as Card[];
  const shown =
    tab === "all" ? cards : cards.filter((card) => card.props.category === tab);
  const count = (id: Category | "all") =>
    id === "all"
      ? cards.length
      : cards.filter((card) => card.props.category === id).length;
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value) => setTab(value as Category | "all")}
      className="hp-tabs"
    >
      <Tabs.List className="hp-tab-list" aria-label="Kinds of component">
        {CATEGORIES.map((c) => (
          <Tabs.Tab key={c.id} value={c.id} className="hp-tab">
            {c.label}
            <span className="hp-tab-count">{count(c.id)}</span>
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="hp-tab-indicator" />
      </Tabs.List>
      <Tabs.Panel value={tab} className="hp" keepMounted>
        {shown}
      </Tabs.Panel>
    </Tabs.Root>
  );
}

/** Every card on the grid, in the order the page is built with. */
function allCards() {
  return (
    <>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="forms"
        title="Mentions"
        docs="/docs/components/editor-mentions"
        states={["Mention"]}
        minHeight={600}
      >
        {(_, playing) => <EditorMentionsDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Media"
        category="morphing"
        title="Stack to live room"
        docs="/docs/components/live-room"
        states={["Room"]}
      >
        {(_, playing) => <LiveRoomDemo playing={playing} previewOpen />}
      </PartCard>
      <PartCard
        kicker="Layout · Connectors"
        category="morphing"
        title="Post and comments"
        spotlight
        docs="/docs/components/comment-thread"
        states={["Comments"]}
      >
        {(_, playing) => <CommentThread variant="preview" playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Icon · Text"
        category="morphing"
        title="Code to verified"
        docs="/docs/components/otp-input"
        states={["Code"]}
      >
        {(_, playing) => <OtpInputDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Canvas · States"
        category="canvas"
        title="Voice states"
        bare
        docs="/docs/components/voice-orb"
        states={["Idle", "Listening", "Thinking", "Speaking"]}
        every={2200}
      >
        {(i) => <VoiceOrb state={ORB_STATES[i]!} size={240} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · Springs"
        category="payments"
        title="Wallet"
        docs="/docs/components/wallet-stack"
        states={["Wallet"]}
        minHeight={620}
      >
        {(_, playing) => <WalletStackDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · createMorph"
        category="charts"
        title="Revenue"
        docs="/docs/components/revenue-card"
        states={["Revenue"]}
        minHeight={600}
      >
        {(_, playing) => <RevenueCardDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · createMorph"
        category="illustrations"
        title="Streak"
        docs="/docs/components/streak"
        states={["Streak"]}
        minHeight={560}
      >
        {(_, playing) => <StreakDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · createMorph"
        category="forms"
        title="Send a message"
        docs="/docs/components/send-message"
        states={["Send"]}
        minHeight={560}
      >
        {(_, playing) => <SendMessageDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · createMorph"
        category="forms"
        title="Issue status"
        docs="/docs/components/issue-status"
        states={["Status"]}
        minHeight={560}
      >
        {(_, playing) => <IssueStatusDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · createMorph"
        category="payments"
        title="Send money"
        docs="/docs/components/send-money"
        states={["Send"]}
        minHeight={720}
      >
        {(_, playing) => <SendMoneyDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="forms"
        title="API keys"
        docs="/docs/components/api-keys"
        states={["Keys"]}
        minHeight={600}
      >
        {(_, playing) => <ApiKeysDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="payments"
        title="Seat calculator"
        docs="/docs/components/seat-calculator"
        states={["Seats"]}
        minHeight={720}
      >
        {(_, playing) => <SeatCalculatorDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="charts"
        title="Usage meter"
        docs="/docs/components/usage-meter"
        states={["Usage"]}
        minHeight={680}
      >
        {(_, playing) => <UsageMeterDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="forms"
        title="Waitlist"
        docs="/docs/components/waitlist"
        states={["Waitlist"]}
        minHeight={600}
      >
        {(_, playing) => <WaitlistDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Layout · Base UI"
        category="morphing"
        title="Onboarding checklist"
        docs="/docs/components/onboarding-checklist"
        states={["Checklist"]}
        minHeight={600}
      >
        {(_, playing) => <OnboardingChecklistDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="charts"
        title="Bulk selection"
        docs="/docs/components/bulk-select"
        states={["Select"]}
        minHeight={600}
      >
        {(_, playing) => <BulkSelectDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Layout · Base UI"
        category="morphing"
        title="Back online"
        docs="/docs/components/connection-banner"
        states={["Connection"]}
        minHeight={560}
      >
        {(_, playing) => <ConnectionBannerDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="charts"
        title="Filter bar"
        docs="/docs/components/filter-bar"
        states={["Filters"]}
        minHeight={560}
      >
        {(_, playing) => <FilterBarDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="forms"
        title="Label picker"
        docs="/docs/components/label-picker"
        states={["Labels"]}
        minHeight={560}
      >
        {(_, playing) => <LabelPickerDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Matching"
        category="morphing"
        title="One person, four components"
        docs="/docs/primitives/layout"
        states={["Chip"]}
        bleed
        selfPlaying
        minHeight={680}
      >
        {() => <RemoldPerson />}
      </PartCard>
      <PartCard
        kicker="Canvas · Particles"
        category="canvas"
        title="From first look to front door"
        bare
        docs="/docs/components/particles-story"
        states={["Journey"]}
        bleed
      >
        {(_, playing) => <ParticlesStory playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Reveal"
        category="morphing"
        title="Turn on two-factor"
        docs="/docs/components/two-factor"
        states={["Two-factor"]}
      >
        {(_, playing) => <TwoFactorDemo framed={false} playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Shared"
        category="morphing"
        title="Hold to record"
        bare
        docs="/docs/components/hold-to-record"
        states={["Record"]}
      >
        {(_, playing) => <HoldToRecordDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Text"
        category="morphing"
        title="Result to boarding pass"
        docs="/docs/components/flight-booking"
        states={["Booking"]}
      >
        {(_, playing) => <FlightBookingDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Shared"
        category="morphing"
        title="Email to teammate"
        docs="/docs/components/invite-team"
        states={["Invite"]}
      >
        {(_, playing) => <InviteTeamDemo framed={false} playing={playing} />}
      </PartCard>
      <PartCard
        kicker="SVG · Shapes"
        category="illustrations"
        title="Artwork in motion"
        bare
        docs="/docs/primitives/icon"
        covers="home/emblem"
        states={["Listen", "Shop", "Measure", "Talk", "Create"]}
        every={1800}
      >
        {(i) => <EmblemDemo framed={false} index={i} />}
      </PartCard>
      <PartCard
        kicker="Motion · Media"
        category="morphing"
        title="Mini player to full"
        docs="/docs/components/podcast-player"
        states={["Mini", "Player", "Mini", "Player"]}
        every={2600}
        bleed
        minHeight={680}
      >
        {(i) => (
          <PodcastPlayer
            source="/api/music"
            credit={APPLE_MUSIC_BADGE}
            scene={i}
            height={600}
          />
        )}
      </PartCard>
      <PartCard
        kicker="SVG · Branding"
        category="illustrations"
        title="Word into logo"
        bare
        docs="/docs/components/logo-morph"
        states={["Cursor", "Cursor logo", "X", "X logo"]}
        every={2000}
      >
        {(i) => (
          <LogoMorph
            selected={LOGO[i]}
            controls={false}
            autoplay={false}
            height={220}
          />
        )}
      </PartCard>
    </>
  );
}
