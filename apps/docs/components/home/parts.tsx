"use client";
/**
 * "Every part, live": one card per kind of change, each the real thing on a plain stage, with a
 * few chips to change its state. Every card plays by itself while it's on screen and stops for
 * good as soon as someone touches it.
 */
import { ArrowDown01Icon, Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Popover } from "@base-ui/react/popover";
import { Remold, useAutoplay } from "@remold-ui/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useInPreview } from "../demos/portal-container";
import { AppleMusicBadge } from "../demos/apple-music-badge";
import {
  Children,
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
const ExportPreparationDemo = dynamic(() => import("../demos/export-preparation").then(m => m.ExportPreparationDemo), { ssr: false });
const UploadRecoveryDemo = dynamic(() => import("../demos/upload-recovery").then(m => m.UploadRecoveryDemo), { ssr: false });
const TableBookingDemo = dynamic(
  () => import("../demos/table-booking").then((m) => m.TableBookingDemo),
  { ssr: false },
);
const OtpInputDemo = dynamic(
  () => import("../demos/otp-input").then((m) => m.OtpInputDemo),
  { ssr: false },
);
const DonationGoalDemo = dynamic(
  () => import("../demos/donation-goal").then((m) => m.DonationGoalDemo),
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
const CurrencyConverterDemo = dynamic(
  () => import("../demos/currency-converter").then((m) => m.CurrencyConverterDemo),
  { ssr: false },
);
const OrderTrackerDemo = dynamic(
  () => import("../demos/order-tracker").then((m) => m.OrderTrackerDemo),
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
const PriceFilterDemo = dynamic(
  () => import("../demos/price-filter").then((m) => m.PriceFilterDemo),
  { ssr: false },
);
const EventRsvpDemo = dynamic(
  () => import("../demos/event-rsvp").then((m) => m.EventRsvpDemo),
  { ssr: false },
);
const PromoCodeDemo = dynamic(
  () => import("../demos/promo-code").then((m) => m.PromoCodeDemo),
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

/** Labels for the catalogue. The home grid shows every card, in the order below. */
export const CATEGORIES = [
  { id: "morphing", label: "Morphing" },
  { id: "canvas", label: "Canvas & Particles" },
  { id: "illustrations", label: "Illustrations" },
  { id: "payments", label: "Payments" },
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
  "/docs/components/live-room": "Live room",
  "/docs/components/comment-thread": "Comment thread",
  "/docs/components/otp-input": "One-time code",
  "/docs/components/voice-orb": "Voice orb",
  "/docs/primitives/layout": "Layout",
  "/docs/components/particles-story": "Particles story",
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
            path={autoplay.playing ? PAUSE : PLAY}
            viewBox="0 0 24 24"
            fill="currentColor"
          />
        </button>
      )}
      <div className="hp-stage">
        {children(autoplay.step, autoplay.playing)}
      </div>
        {docs && !inPreview && (
          <Link
            href={docs}
            className="hp-play hp-view"
            style={selfPlaying ? { right: 14 } : undefined}
            aria-label={`View ${title} component details`}
            title={`View ${title}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </Link>
        )}
    </article>
  );
}

const APPLE_MUSIC_BADGE = <AppleMusicBadge />;

const LOGO = [0, 1, 2, 3, 4, 5, 6].map((brand) => ({ brand, form: "logo" as const }));

type Card = ReactElement<Parameters<typeof PartCard>[0]>;

type FilterOption = { value: string; label: string };

const FILTER_SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.18 };
const FILTER_MENU_WIDTH = 260;

/**
 * A multi-select filter whose menu grows out from beneath its pill: one shell springs from the
 * pill's width to the menu's size and back, and the options rise into it once there is room. A pill with a selection
 * becomes a chip that says what's picked, with its own button to clear it.
 */
function GalleryFilter({
  label,
  selected,
  options,
  onSelectedChange,
}: {
  label: string;
  selected: ReadonlySet<string>;
  options: FilterOption[];
  onSelectedChange: (selected: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [pill, setPill] = useState({ width: 0, height: 44 });
  // Near the right edge of a small screen the menu opens leftwards, and never wider than the screen.
  const [room, setRoom] = useState({ width: FILTER_MENU_WIDTH, fromRight: false });
  const [menuHeight, setMenuHeight] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const picked = options.filter((option) => selected.has(option.value));
  const value =
    picked.length === 0 ? "All" : picked.length === 1 ? picked[0]!.label : `${picked[0]!.label} +${picked.length - 1}`;

  // Base UI mounts the menu after it opens, so it's measured from the moment it's there.
  const watching = useRef<ResizeObserver | null>(null);
  const menu = (element: HTMLDivElement | null) => {
    watching.current?.disconnect();
    watching.current = null;
    if (!element) return;
    watching.current = new ResizeObserver(() => setMenuHeight(element.offsetHeight));
    watching.current.observe(element);
  };

  const changeOpen = (next: boolean) => {
    if (next && trigger.current) {
      const box = trigger.current.getBoundingClientRect();
      const width = Math.min(FILTER_MENU_WIDTH, window.innerWidth - 24);
      setRoom({ width, fromRight: box.left + width > window.innerWidth - 12 });
      setPill({ width: trigger.current.offsetWidth, height: trigger.current.offsetHeight });
      setShown(true);
    }
    setOpen(next);
  };

  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onSelectedChange(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={changeOpen} modal={false}>
      <span className="hp-filter-slot">
        <Popover.Trigger
          ref={trigger}
          className="hp-filter-select"
          data-picked={picked.length > 0 || undefined}
          aria-label={picked.length > 0 ? `${label}: ${picked.map((option) => option.label).join(", ")}` : label}
        >
          {picked.length === 0 && <span className="hp-filter-label">{label}</span>}
          <span className="hp-filter-value">
            <Remold.Text>{value}</Remold.Text>
          </span>
          {picked.length === 0 && <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />}
        </Popover.Trigger>
        {picked.length > 0 && (
          <button type="button" className="hp-filter-clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onSelectedChange(new Set())}>
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={3} aria-hidden="true" />
          </button>
        )}
        <motion.div
          ref={shell}
          className="hp-filter-shell"
          data-shown={shown || undefined}
          data-from-right={room.fromRight || undefined}
          initial={false}
          animate={
            open
              ? { width: room.width, height: menuHeight, opacity: 1 }
              : { width: pill.width, height: 0, opacity: 0 }
          }
          transition={reduceMotion ? { duration: 0 } : { ...FILTER_SPRING, delay: open ? 0 : 0.08 }}
          onAnimationComplete={() => !open && setShown(false)}
        >
          <Popover.Portal container={shell}>
            <Popover.Positioner className="!absolute !inset-0 !transform-none">
              <Popover.Popup className="hp-filter-menu" aria-label={label} initialFocus={false}>
                <div ref={menu} className="hp-filter-menu-inner">
                  <div className="hp-filter-options">
                    {options.map((option, index) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        className="hp-filter-option"
                        aria-pressed={selected.has(option.value)}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.22, delay: reduceMotion ? 0 : 0.06 + index * 0.025, ease: [0.23, 1, 0.32, 1] }}
                        onClick={() => toggle(option.value)}
                      >
                        <span className="hp-filter-option-mark" aria-hidden="true">
                          {selected.has(option.value) && <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} aria-hidden="true" />}
                        </span>
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </motion.div>
      </span>
    </Popover.Root>
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
  // The cards show in the order they're written below: no shuffling.
  const [categories, setCategories] = useState<Set<Category>>(new Set());
  const [techniquesSelected, setTechniquesSelected] = useState<Set<string>>(
    new Set(),
  );
  const cards = Children.toArray(allCards().props.children) as Card[];
  const catalogueCards = cards;
  const techniques: FilterOption[] = [
    ...Array.from(
      new Set(catalogueCards.flatMap((card) => card.props.kicker.split(" · "))),
    )
      .sort()
      .map((value) => ({ value, label: value })),
  ];
  const shown = catalogueCards.filter((card) => {
    if (categories.size > 0 && !categories.has(card.props.category)) return false;
    return (
      techniquesSelected.size === 0 ||
      [...techniquesSelected].some((technique) => card.props.kicker.split(" · ").includes(technique))
    );
  });
  const hasFilters = categories.size > 0 || techniquesSelected.size > 0;
  const grid = useMasonry(shown.map((card) => card.key).join(","));
  return (
    <>
      <section className="hp-filter" aria-label="Filter live examples">
      <div className="hp-filter-bar">
        <div className="hp-filter-controls">
          <GalleryFilter
            label="Category"
            selected={categories}
            options={FILTER_CATEGORIES}
            onSelectedChange={(next) => setCategories(next as Set<Category>)}
          />
          <GalleryFilter
            label="Built with"
            selected={techniquesSelected}
            options={techniques}
            onSelectedChange={setTechniquesSelected}
          />
        </div>
        <div className="hp-filter-summary" aria-live="polite">
          <span>{`Showing ${shown.length} of ${catalogueCards.length}`}</span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCategories(new Set());
                setTechniquesSelected(new Set());
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div ref={grid} className="hp">
        {shown}
        {shown.length === 0 && (
          <p className="hp-filter-empty">No examples match those filters.</p>
        )}
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
    </>
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
      if (Math.abs((widths.get(item) ?? -1) - width) >= 1) {
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
        kicker="Layout · Icon · Text"
        category="morphing"
        title="Code to verified"
        docs="/docs/components/otp-input"
        states={["Code"]}
      >
        {(_, playing) => <OtpInputDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="SVG · Illustration"
        category="morphing"
        title="Order tracker"
        docs="/docs/components/order-tracker"
        states={["Track"]}
      >
        {(_, playing) => <OrderTrackerDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Motion · Media"
        category="morphing"
        title="Stack to live room"
        docs="/docs/components/live-room"
        states={["Room"]}
      >
        {(_, playing) => <LiveRoomDemo playing={playing} previewOpen />}
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
        kicker="Layout · Connectors"
        category="morphing"
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
        kicker="Layout · Motion"
        category="payments"
        title="Currency converter"
        docs="/docs/components/currency-converter"
        states={["Convert"]}
        minHeight={560}
      >
        {(_, playing) => <CurrencyConverterDemo playing={playing} />}
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
        category="payments"
        title="Send money"
        docs="/docs/components/send-money"
        states={["Send"]}
        minHeight={720}
      >
        {(_, playing) => <SendMoneyDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="forms"
        title="Price filter"
        docs="/docs/components/price-filter"
        states={["Filter"]}
      >
        {(_, playing) => <PriceFilterDemo playing={playing} />}
      </PartCard>
      <PartCard
        kicker="Base UI · Motion"
        category="payments"
        title="Promo code"
        docs="/docs/components/promo-code"
        states={["Apply"]}
      >
        {(_, playing) => <PromoCodeDemo playing={playing} />}
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
      <PartCard kicker="Base UI · Motion" category="morphing" title="Export preparation" docs="/docs/components/export-preparation" states={["Export"]}>
        {(_, playing) => <ExportPreparationDemo playing={playing} />}
      </PartCard>
      <PartCard kicker="Base UI · Motion" category="morphing" title="Upload recovery" docs="/docs/components/upload-recovery" states={["Recovery"]}>
        {(_, playing) => <UploadRecoveryDemo playing={playing} />}
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
        title="One person, three components"
        docs="/docs/primitives/layout"
        states={["Card"]}
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
        kicker="SVG · Branding"
        category="illustrations"
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
    </>
  );
}
