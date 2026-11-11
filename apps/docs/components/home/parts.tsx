"use client";
/**
 * "Every part, live": one card per kind of change, shown as a useful still on a plain stage.
 */
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  ArrowUpRight01Icon,
  Cancel01Icon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAutoplay } from "@remold-ui/react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AppleMusicBadge } from "../demos/apple-music-badge";
import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
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
const EmblemDemo = dynamic(
  () => import("../demos/emblem").then((m) => m.EmblemDemo),
  { ssr: false },
);
const TwoFactorDemo = dynamic(
  () => import("../demos/two-factor").then((m) => m.TwoFactorDemo),
  { ssr: false },
);
const TableBookingDemo = dynamic(
  () => import("../demos/table-booking").then((m) => m.TableBookingDemo),
  { ssr: false },
);
const OtpInputDemo = dynamic(
  () => import("../demos/otp-input").then((m) => m.OtpInputDemo),
  { ssr: false },
);
const StorageCleanupDemo = dynamic(
  () => import("../demos/storage-cleanup").then((m) => m.StorageCleanupDemo),
  { ssr: false },
);
const DonationGoalDemo = dynamic(
  () => import("../demos/donation-goal").then((m) => m.DonationGoalDemo),
  { ssr: false },
);
const MorphingDialogDemo = dynamic(
  () => import("../demos/morphing-dialog").then((m) => m.MorphingDialogDemo),
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
const CurrencyConverterDemo = dynamic(
  () => import("../demos/currency-converter").then((m) => m.CurrencyConverterDemo),
  { ssr: false },
);
const OrderTrackerDemo = dynamic(
  () => import("../demos/order-tracker").then((m) => m.OrderTrackerDemo),
  { ssr: false },
);
const ParticleShapesDemo = dynamic(
  () => import("../demos/particle-shapes").then((m) => m.ParticleShapesDemo),
  { ssr: false },
);
const PaymentStatusDemo = dynamic(
  () => import("../demos/payment-status").then((m) => m.PaymentStatusDemo),
  { ssr: false },
);
const KitchenTicketDemo = dynamic(
  () => import("../demos/kitchen-ticket").then((m) => m.KitchenTicketDemo),
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
const StepperSliderDemo = dynamic(
  () => import("../demos/stepper-slider").then((m) => m.StepperSliderDemo),
  { ssr: false },
);
const EventRsvpDemo = dynamic(
  () => import("../demos/event-rsvp").then((m) => m.EventRsvpDemo),
  { ssr: false },
);
const FeedbackPromptDemo = dynamic(
  () => import("../demos/feedback-prompt").then((m) => m.FeedbackPromptDemo),
  { ssr: false },
);
const PromoCodeDemo = dynamic(
  () => import("../demos/promo-code").then((m) => m.PromoCodeDemo),
  { ssr: false },
);
const TagInputDemo = dynamic(
  () => import("../demos/tag-input").then((m) => m.TagInputDemo),
  { ssr: false },
);
const PopoverMenuDemo = dynamic(
  () => import("../demos/popover-menu").then((m) => m.PopoverMenuDemo),
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
const FilterBarDemo = dynamic(
  () => import("../demos/filter-bar").then((m) => m.FilterBarDemo),
  { ssr: false },
);
const LabelPickerDemo = dynamic(
  () => import("../demos/label-picker").then((m) => m.LabelPickerDemo),
  { ssr: false },
);
const PeelRewardDemo = dynamic(
  () => import("../demos/peel-reward").then((m) => m.PeelRewardDemo),
  { ssr: false },
);
const NotificationInboxDemo = dynamic(
  () => import("../demos/notification-inbox").then((m) => m.NotificationInboxDemo),
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

/* A card: the live part on a quiet, static stage. */

/** Labels for the catalogue. The home grid shows every card, in the order below. */
export const CATEGORIES = [
  { id: "morphing", label: "Morphing" },
  { id: "svg", label: "SVG" },
  { id: "illustrations", label: "Illustrations" },
  { id: "connectors", label: "Connectors" },
  { id: "canvas", label: "Canvas & Particles" },
  { id: "charts", label: "Charts & Data" },
  { id: "forms", label: "Forms & Inputs" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

const FILTER_CATEGORIES = CATEGORIES.map(({ id, label }) => ({
  value: id,
  label,
}));

/** The plain names people see in the component catalogue and docs, rather than each card's marketing headline. */
const COMPONENT_NAME_BY_DOC: Record<string, string> = {
  "/docs/components/morphing-dialog": "Morphing dialog",
  "/docs/components/comment-thread": "Comment thread",
  "/docs/components/otp-input": "One-time code",
  "/docs/components/voice-orb": "Voice orb",
  "/docs/primitives/morph": "Morph",
  "/docs/components/two-factor": "Two-factor setup",
  "/docs/components/table-booking": "Table booking",
  "/docs/components/invite-team": "Invite teammates",
  "/docs/primitives/icon": "SVG morph",
  "/docs/components/podcast-player": "Podcast",
  "/docs/components/logo-morph": "Logo morph",
  "/docs/components/popover-menu": "Popover menu",
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
  short = false,
  tall = false,
  dark = false,
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
  /** A deliberately compact gallery card for a complete but small interaction. */
  short?: boolean;
  /** Two rows tall, for parts that need the height. */
  tall?: boolean;
  /** A dark card, for canvas pieces drawn on a dark stage. */
  dark?: boolean;
  /** A fixed minimum height for a spanning feature card that needs a larger canvas. */
  minHeight?: number;
  children: (step: number, playing: boolean) => ReactNode;
}) {
  // Cards play on their own, but only while on screen, so a long page stays cheap. Touching a card
  // pauses it, so its controls hold still under your finger; the button plays or pauses it again.
  const autoplay = useAutoplay(states.length, { every });
  const { setPlaying } = autoplay;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, [setPlaying]);
  const cls = `hp-card${wide ? " wide" : ""}${full ? " full" : ""}${
    bleed ? " bleed" : ""
  }${short ? " short" : ""}${tall ? " tall" : ""}${dark ? " dark" : ""}${bare ? " bare" : ""}`;
  return (
    <article
      ref={autoplay.ref}
      id={slugOf(title)}
      className={cls}
      style={
        minHeight && (wide || full || tall) ? { minHeight } : undefined
      }
      aria-label={`${title}: ${states[autoplay.step]}`}
    >
      <button
        type="button"
        {...autoplay.toggleProps}
        className="hp-card-action hp-play"
        aria-label={autoplay.playing ? `Pause ${title}` : `Play ${title}`}
      >
        <HugeiconsIcon
          icon={autoplay.playing ? PauseIcon : PlayIcon}
          fill="currentColor"
          aria-hidden="true"
        />
      </button>
      {docs && (
        <Link
          href={docs}
          className="hp-card-action hp-open"
          aria-label={`Open ${COMPONENT_NAME_BY_DOC[docs] ?? title}`}
        >
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            strokeWidth={2}
            aria-hidden="true"
          />
        </Link>
      )}
      <div className="hp-stage">
        {children(autoplay.step, autoplay.active)}
      </div>
    </article>
  );
}

const APPLE_MUSIC_BADGE = <AppleMusicBadge />;

const LOGO = [0, 1, 2, 3, 4, 5, 6].map((brand) => ({ brand, form: "logo" as const }));

type Card = ReactElement<Parameters<typeof PartCard>[0]>;

type FilterOption = { value: string; label: string };

const ALL = "all";

/**
 * Categories as a row of pills, led by All, which is on whenever nothing else is. Any number of
 * categories can be on, and each one on shows a cross to turn it off; picking All clears them.
 */
const SLIDE = { type: "spring" as const, duration: 0.45, bounce: 0.18 };

/**
 * The highlight behind a picked category. Each is numbered by when it was picked, so swapping one
 * category for another slides the highlight across, and picking a second fades in a second one.
 */
function Picked({ order }: { order: number }) {
  if (order < 0) return null;
  return (
    <motion.span
      layoutId={`hp-picked-${order}`}
      className="hp-chip-picked"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SLIDE}
    />
  );
}

function CategoryChips({
  selected,
  options,
  onSelectedChange,
}: {
  selected: Set<string>;
  options: FilterOption[];
  onSelectedChange: (next: Set<string>) => void;
}) {
  const value = selected.size === 0 ? [ALL] : [...selected];
  return (
    <ToggleGroup
      multiple
      value={value}
      onValueChange={(next) => {
        const picked = next as string[];
        const pickedAll = picked.includes(ALL) && !value.includes(ALL);
        onSelectedChange(new Set(pickedAll ? [] : picked.filter((entry) => entry !== ALL)));
      }}
      className="hp-chips"
      aria-label="Category"
    >
      <Toggle value={ALL} className="hp-chip">
        <Picked order={value.indexOf(ALL)} />
        <span className="hp-chip-label">All</span>
      </Toggle>
      {options.map((option) => (
        <Toggle key={option.value} value={option.value} className="hp-chip">
          <Picked order={value.indexOf(option.value)} />
          <span className="hp-chip-label">
            {option.label}
            {selected.has(option.value) && (
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2.2} aria-hidden="true" />
            )}
          </span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

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
  const [categories, setCategories] = useState<Set<Category>>(new Set());
  const cards = Children.toArray(allCards().props.children) as Card[];

  const categoryOptions: FilterOption[] = FILTER_CATEGORIES.filter((option) =>
    cards.some((card) => card.props.category === option.value),
  );
  const shown = cards.filter((card) => categories.size === 0 || categories.has(card.props.category));
  const grid = useMasonry(shown.map((card) => card.key).join(","));

  return (
    <section className="hp-filter" aria-label="Filter live examples">
      <div className="hp-filter-bar">
        <CategoryChips
          selected={categories}
          options={categoryOptions}
          onSelectedChange={(next) => setCategories(next as Set<Category>)}
        />
      </div>

      <div ref={grid} className="hp">
        {shown}
      </div>

      {shown.length > 0 && (
        <div className="hp-gallery-end">
          <div className="hp-gallery-fog" aria-hidden="true" />
          <Link href="/docs/components" className="hp-gallery-link">
            View all components
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}
    </section>
  );
}

/**
 * Packs the cards like masonry. The grid runs on tiny rows, and each card is placed in the
 * shortest column (a wide card in the lowest pair, a full one below everything), spanning as many
 * rows as its height needs. A card keeps the tallest height it has reached at its current width,
 * held as a min-height, so a demo that shrinks mid-animation neither shuffles the grid nor leaves
 * a wider gap below it. Cards are measured before any stretch, so nothing can feed back and grow.
 */
function useMasonry(itemsKey: string) {
  const grid = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = grid.current;
    if (!root) return;
    const items = [...root.children] as HTMLElement[];
    const authored = new Map(items.map((item) => [item, item.style.minHeight]));
    const widths = new WeakMap<Element, number>();
    let frame = 0;

    const heightOf = (item: HTMLElement) => {
      const { width } = item.getBoundingClientRect();
      // A compact preview may intentionally get smaller after opening. Unlike the larger cards,
      // it must be measured from its authored size each pass rather than keeping a stale, taller
      // inline minimum from an earlier state.
      const isCompact = item.classList.contains("short");
      if (isCompact || Math.abs((widths.get(item) ?? -1) - width) >= 1) {
        item.style.minHeight = authored.get(item) ?? "";
        widths.set(item, width);
      }
      const height = item.getBoundingClientRect().height;
      item.style.minHeight = `${height}px`;
      return height + (Number.parseFloat(getComputedStyle(item).marginBottom) || 0);
    };

    const columnsOf = (item: HTMLElement, count: number) => {
      if (item.classList.contains("full") || item.classList.contains("hp-pair")) return count;
      return item.classList.contains("wide") ? Math.min(2, count) : 1;
    };

    const layout = () => {
      frame = 0;
      const style = getComputedStyle(root);
      const row = Number.parseFloat(style.gridAutoRows) || 1;
      const count = style.gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const bottoms = Array.from({ length: count }, () => 0);
      const lasts: ({ item: HTMLElement; top: number } | undefined)[] = Array.from({ length: count });

      for (const item of items) {
        // Measured at its own height: a stretch from the last pass would otherwise feed back.
        item.style.alignSelf = "";
        const span = columnsOf(item, count);
        let start = 0;
        let top = Number.POSITIVE_INFINITY;
        for (let column = 0; column + span <= count; column++) {
          const floor = Math.max(...bottoms.slice(column, column + span));
          if (floor < top) {
            top = floor;
            start = column;
          }
        }
        const rows = Math.ceil(heightOf(item) / row);
        item.style.gridColumn = `${start + 1} / span ${span}`;
        item.style.gridRow = `${top + 1} / span ${rows}`;
        // A wide card starts below the taller of its columns; the card above the shorter one
        // stretches down to meet it, so no hole is left between them.
        for (let column = start; column < start + span; column++) {
          const last = lasts[column];
          if (last && bottoms[column] < top && columnsOf(last.item, count) === 1) {
            last.item.style.gridRow = `${last.top + 1} / span ${top - last.top}`;
            last.item.style.alignSelf = "stretch";
          }
          bottoms[column] = top + rows;
          lasts[column] = { item, top };
        }
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(layout);
    };

    root.dataset.masonry = "";
    layout();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    for (const item of items) observer.observe(item);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      delete root.dataset.masonry;
      for (const item of items) {
        item.style.gridColumn = "";
        item.style.gridRow = "";
        item.style.alignSelf = "";
        item.style.minHeight = authored.get(item) ?? "";
      }
    };
  }, [itemsKey]);

  return grid;
}

/** Every card on the grid, in the order the page is built with. */
function allCards() {
  return (
    <>
      <PartCard
        kicker="Canvas · Particles"
        category="canvas"
        title="Particle shapes"
        docs="/docs/components/particle-shapes"
        states={["Shapes"]}
        wide
        dark
      >
        {(_, playing) => <ParticleShapesDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Icon · Text"
        category="svg"
        title="Code to verified"
        docs="/docs/components/otp-input"
        states={["Code"]}
      >
        {(_, playing) => <OtpInputDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="forms"
        title="Promo code"
        docs="/docs/components/promo-code"
        states={["Apply"]}
      >
        {(_, playing) => <PromoCodeDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Particles · Base UI"
        category="canvas"
        title="Free up space"
        docs="/docs/components/storage-cleanup"
        states={["Delete"]}
        minHeight={600}
      >
        {(_, playing) => <StorageCleanupDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · Springs"
        category="morphing"
        title="Wallet"
        docs="/docs/components/wallet-stack"
        states={["Wallet"]}
        minHeight={620}
      >
        {(_, playing) => <WalletStackDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="forms"
        title="Notification inbox"
        docs="/docs/components/notification-inbox"
        states={["Inbox"]}
        minHeight={700}
      >
        {(_, playing) => <NotificationInboxDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Motion · Base UI"
        category="morphing"
        title="Peel-off reward"
        docs="/docs/components/peel-reward"
        states={["Reward"]}
        minHeight={460}
      >
        {(_, playing) => <PeelRewardDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="morphing"
        title="Button to dialog"
        docs="/docs/components/morphing-dialog"
        states={["New trip"]}
        minHeight={560}
      >
        {(_, playing) => <MorphingDialogDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Layout · Text"
        category="morphing"
        title="Option to booking"
        docs="/docs/components/table-booking"
        states={["Booking"]}
      >
        {(_, playing) => <TableBookingDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="forms"
        title="Tag input"
        docs="/docs/components/tag-input"
        states={["Tags"]}
        minHeight={560}
      >
        {(_, playing) => <TagInputDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Base UI · Motion"
        category="forms"
        title="Event RSVP"
        docs="/docs/components/event-rsvp"
        states={["RSVP"]}
        minHeight={600}
      >
        {(_, playing) => <EventRsvpDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="SVG · Branding"
        category="svg"
        title="Logo into logo"
        bare
        docs="/docs/components/logo-morph"
        states={["OpenAI", "Apple", "Cursor", "Mercedes", "X", "Anthropic", "Tesla"]}
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
      <PartCard
        kicker="SVG · Illustration"
        category="illustrations"
        title="Order tracker"
        docs="/docs/components/order-tracker"
        states={["Track"]}
      >
        {(_, playing) => <OrderTrackerDemo playing={playing} />}
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
        kicker="Base UI · Motion"
        category="morphing"
        title="Popover menu"
        docs="/docs/components/popover-menu"
        states={["Menu"]}
      >
        {(_, playing) => <PopoverMenuDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · createMorph"
        category="forms"
        title="Send money"
        docs="/docs/components/send-money"
        states={["Send"]}
        minHeight={720}
      >
        {(_, playing) => <SendMoneyDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Layout · Motion"
        category="forms"
        title="Currency converter"
        docs="/docs/components/currency-converter"
        states={["Convert"]}
        minHeight={560}
      >
        {(_, playing) => <CurrencyConverterDemo playing={playing} />}
      </PartCard>
      <PartCard
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
        kicker="Base UI · Motion"
        category="morphing"
        title="Feedback prompt"
        docs="/docs/components/feedback-prompt"
        states={["Helpful?"]}
        minHeight={560}
      >
        {(_, playing) => <FeedbackPromptDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Particles · Motion"
        category="canvas"
        title="Donation goal"
        docs="/docs/components/donation-goal"
        states={["Give"]}
        minHeight={520}
      >
        {(_, playing) => <DonationGoalDemo playing={playing} />}
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
        kicker="SVG · Base UI"
        category="svg"
        title="Payment status"
        docs="/docs/components/payment-status"
        states={["Pay"]}
      >
        {(_, playing) => <PaymentStatusDemo playing={playing} />}
      </PartCard>
      <PartCard
        featured
        kicker="Motion · createMorph"
        category="morphing"
        title="Kitchen ticket"
        docs="/docs/components/kitchen-ticket"
        states={["Ticket"]}
        minHeight={560}
      >
        {(_, playing) => <KitchenTicketDemo playing={playing} />}
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
        kicker="Motion · Media"
        category="morphing"
        title="Mini player to full"
        docs="/docs/components/podcast-player"
        states={["Mini", "Player", "Mini", "Player"]}
        every={2600}
        bleed
      >
        {(i) => (
          <PodcastPlayer
            source="/api/music"
            credit={APPLE_MUSIC_BADGE}
            scene={i}
            height="100%"
            compact
          />
        )}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="forms"
        title="Stepper slider"
        docs="/docs/components/stepper-slider"
        states={["Months"]}
      >
        {(_, playing) => <StepperSliderDemo playing={playing} />}
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
        category="forms"
        title="Seat calculator"
        docs="/docs/components/seat-calculator"
        states={["Seats"]}
        minHeight={720}
      >
        {(_, playing) => <SeatCalculatorDemo playing={playing} />}
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
        kicker="Layout · Connectors"
        category="connectors"
        title="Post and comments"
        spotlight
        wide
        tall
        docs="/docs/components/comment-thread"
        states={["Comments"]}
      >
        {(_, playing) => <CommentThread variant="preview" playing={playing} />}
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
        kicker="Morph · Matching"
        category="morphing"
        title="One person, three components"
        docs="/docs/primitives/morph"
        states={["Card"]}
        bleed
        minHeight={680}
      >
        {(_, playing) => <RemoldPerson playing={playing} showControls={false} />}
      </PartCard>
      <PartCard
        kicker="SVG · Shapes"
        category="svg"
        title="Artwork in motion"
        bare
        docs="/docs/primitives/icon"
        covers="home/emblem"
        states={["Listen", "Shop", "Measure", "Talk", "Create"]}
        every={1800}
      >
        {(i) => <EmblemDemo framed={false} index={i} />}
      </PartCard>
    </>
  );
}
