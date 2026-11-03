"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { ComponentPreview, type CustomPreview } from "./component-preview";
import { landingCards } from "./home/parts";

export interface BrowserItem {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  isNew?: boolean;
  /** Drawn from the landing page's own card rather than a registered preview. */
  custom?: CustomPreview;
}

/** The landing page's small technical kicker is useful there, but this shelf needs the interaction's payoff. */
const LANDING_COPY: Record<string, string> = {
  mentions: "Type @ and a person leaves the picker to become part of the message.",
  "stack-to-live-room": "A compact stack of faces fans out into a live room, then folds back down.",
  "post-and-comments": "A reply grows from the composer into the conversation it belongs to.",
  "code-to-verified": "Six code cells fold into one verifying state, then resolve as a check.",
  "voice-states": "One orb changes its texture and pace as a voice interaction moves forward.",
  wallet: "Cards fan out of the holder; choosing one brings its activity forward.",
  revenue: "The chart reshapes between ranges while the headline rolls to the new number.",
  streak: "A grey ember grows into a flame as the day count and week fill in.",
  "send-a-message": "The composer becomes the sent message, then makes room for the reply.",
  "kitchen-ticket": "A ticket's ring fills as the order cooks, then closes with a check or a cross.",
  "order-tracker": "The pot becomes the bag, the scooter, then your front door as the order moves along.",
  "send-money": "Digits, commas and the Send state all move with the amount you enter.",
  "currency-converter": "What they receive rolls with the amount you type, and the two currencies trade places when you swap.",
  "visitors-globe": "A glowing planet rises from the card while signups pulse at their cities and invites fly between them.",
  "focus-timer": "A particle hourglass whose sand really falls, freezes on pause, and flips into the break.",
  "dot-grid-hero": "A landing page background that wakes up under the cursor, with a ripple on every click.",
  "donation-goal": "Every gift streams up as dots and fills the drop, until it bursts into a thank you.",
  "api-keys": "A secret appears once, then folds into a newly masked row.",
  "promo-code": "The code field springs down into a ticket chip as the discount opens and the total rolls.",
  "seat-calculator": "Team size changes the people, plan, price and features together.",
  "usage-meter": "Usage crosses limits, changes tone and rolls into the projected bill.",
  "onboarding-checklist": "Each completed step clears the way for the next, then the whole card tucks away.",
  "bulk-selection": "Selecting a range joins rows into one band and brings up its actions.",
  "filter-bar": "Filtering reshapes both the tokens and the transaction list beneath them.",
  "label-picker": "A searchable picker adds a label where it belongs and makes room for it.",
  "one-person-three-components": "The same person stays recognisable while every surrounding layout changes.",
  "from-first-look-to-front-door": "One field of particles tells the journey from product to delivery.",
  "turn-on-two-factor": "A settings row opens into setup, then resolves into its enabled state.",
  "hold-to-record": "Holding one control stretches it into recording, then sends it away.",
  "result-to-boarding-pass": "A changed flight carries the chosen option into an updated boarding pass.",
  "email-to-teammate": "An email becomes an invite, then becomes the teammate it represents.",
  "artwork-in-motion": "The pieces of an illustration flow into new artwork instead of fading away.",
  "mini-player-to-full": "The compact player grows into its full view while artwork and controls stay connected.",
  "word-into-logo": "A word’s glyphs travel into a logo mark and find their way back.",
};

/** The groups the shelf filters by, in the order the chips show them. */
const GROUPS = ["Morphing", "Forms & Inputs", "Payments", "Charts & Data", "Interface", "Canvas & Particles", "Illustrations"] as const;

/** The landing page, the sidebar and the home catalogue each name things their own way: one set of names here. */
const GROUP_OF: Record<string, (typeof GROUPS)[number]> = {
  "Form elements": "Forms & Inputs",
  Particles: "Canvas & Particles",
  Canvas: "Canvas & Particles",
  Motion: "Canvas & Particles",
  Backgrounds: "Canvas & Particles",
  Shapes: "Illustrations",
  Icons: "Illustrations",
  Text: "Morphing",
};
const groupOf = (category: string) => GROUP_OF[category] ?? ((GROUPS as readonly string[]).includes(category) ? (category as (typeof GROUPS)[number]) : "Interface");

type Filter = "all" | "new" | (typeof GROUPS)[number];
type Sort = "featured" | "az";

/**
 * A flat, visual library shelf. Landing cards come first in their authored order; documented
 * examples the landing page doesn't show follow them, without creating a second inventory.
 */
export function ComponentBrowser({ extras }: { extras: BrowserItem[] }) {
  const items = useMemo(() => {
    const landing = landingCards();
    // Extras a landing card already stands for (its component page, or what it covers) aren't listed twice.
    const covered = new Set(
      landing.flatMap((card) => [card.covers, card.href.startsWith("/docs/components/") ? card.href.split("/").pop() : undefined]),
    );
    const front: BrowserItem[] = landing.map((card) => ({
      id: `landing/${card.slug}`,
      title: card.title,
      description: LANDING_COPY[card.slug] ?? card.kicker,
      href: card.href,
      category: card.categoryLabel,
      custom: {
        render: card.render,
        states: card.states,
        every: card.every,
        width: card.wide ? 760 : 520,
        bare: card.bare,
        cover: card.bleed,
      },
    }));
    const rest = extras.filter((item) => !covered.has(item.id));
    return [...front, ...rest];
  }, [extras]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("featured");
  const value = useDeferredValue(query.trim().toLowerCase());

  const inFilter = (item: BrowserItem, f: Filter) => f === "all" || (f === "new" ? Boolean(item.isNew) : groupOf(item.category) === f);
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: items.length, new: items.filter((i) => i.isNew).length };
    for (const g of GROUPS) out[g] = items.filter((i) => groupOf(i.category) === g).length;
    return out;
  }, [items]);
  const chips: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...(counts.new ? [{ value: "new" as const, label: "New" }] : []),
    ...GROUPS.filter((g) => counts[g]).map((g) => ({ value: g, label: g })),
  ];

  const shown = useMemo(() => {
    const matched = items.filter(
      (item) =>
        inFilter(item, filter) &&
        (!value || `${item.title} ${item.description} ${groupOf(item.category)}`.toLowerCase().includes(value)),
    );
    return sort === "az" ? [...matched].sort((a, b) => a.title.localeCompare(b.title)) : matched;
  }, [items, value, filter, sort]);
  const [playing, setPlaying] = useState<string | null>(null);
  const touchPreview = useRef<string | null>(null);
  return (
    <div className="rm-browser not-prose">
      <div className="rm-browser-tools">
        <label className="rm-browser-search">
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
          <input type="search" placeholder="Search components…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search components" />
        </label>
        <ToggleGroup
          className="rm-browser-sort"
          aria-label="Sort"
          value={[sort]}
          onValueChange={(next) => next[0] && setSort(next[0] as Sort)}
        >
          <Toggle value="featured" className="rm-browser-sort-item">Featured</Toggle>
          <Toggle value="az" className="rm-browser-sort-item">A–Z</Toggle>
        </ToggleGroup>
      </div>
      <div className="rm-browser-filters">
        <ToggleGroup
          className="rm-browser-chips"
          aria-label="Category"
          value={[filter]}
          onValueChange={(next) => setFilter((next[0] as Filter | undefined) ?? "all")}
        >
          {chips.map((chip) => (
            <Toggle key={chip.value} value={chip.value} className="rm-browser-chip">
              {chip.label}
              <span>{counts[chip.value]}</span>
            </Toggle>
          ))}
        </ToggleGroup>
        <p className="rm-browser-count">
          Showing <b>{shown.length}</b> of {items.length}
        </p>
      </div>
      {shown.length === 0 ? (
        <p className="rm-browser-empty">{query ? `Nothing matches “${query}”.` : "Nothing here yet."}</p>
      ) : (
        <div className="rm-browser-grid">
          {shown.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rm-card"
              onPointerEnter={() => setPlaying(item.id)}
              onPointerLeave={() => setPlaying((current) => current === item.id ? null : current)}
              onPointerDown={(event) => {
                if (event.pointerType !== "touch" || playing === item.id) return;
                touchPreview.current = item.id;
                setPlaying(item.id);
              }}
              onClick={(event) => {
                if (touchPreview.current !== item.id) return;
                event.preventDefault();
                touchPreview.current = null;
              }}
              onFocus={() => setPlaying(item.id)}
              onBlur={() => setPlaying((current) => current === item.id ? null : current)}
            >
              <span className="rm-card-stage">
                <ComponentPreview id={item.id} custom={item.custom} playing={playing === item.id} />
                {item.isNew && <span className="rm-card-new">New</span>}
              </span>
              <span className="rm-card-meta">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
