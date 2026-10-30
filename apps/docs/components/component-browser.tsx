"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
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
  "send-money": "Digits, commas and the Send state all move with the amount you enter.",
  "currency-converter": "What they receive rolls with the amount you type, and the two currencies trade places when you swap.",
  "training-plan": "Finish a workout and a pulse runs down the plan to unlock the next, with a session to choose and a finisher medal at the end.",
  "donation-goal": "Every gift streams up as dots and fills the drop, until it bursts into a thank you.",
  "api-keys": "A secret appears once, then folds into a newly masked row.",
  "seat-calculator": "Team size changes the people, plan, price and features together.",
  "usage-meter": "Usage crosses limits, changes tone and rolls into the projected bill.",
  "onboarding-checklist": "Each completed step clears the way for the next, then the whole card tucks away.",
  "bulk-selection": "Selecting a range joins rows into one band and brings up its actions.",
  "back-online": "An offline banner contracts into a small confirmation once syncing resumes.",
  "filter-bar": "Filtering reshapes both the tokens and the transaction list beneath them.",
  "label-picker": "A searchable picker adds a label where it belongs and makes room for it.",
  "one-person-four-components": "The same person stays recognisable while every surrounding layout changes.",
  "from-first-look-to-front-door": "One field of particles tells the journey from product to delivery.",
  "turn-on-two-factor": "A settings row opens into setup, then resolves into its enabled state.",
  "hold-to-record": "Holding one control stretches it into recording, then sends it away.",
  "result-to-boarding-pass": "A changed flight carries the chosen option into an updated boarding pass.",
  "email-to-teammate": "An email becomes an invite, then becomes the teammate it represents.",
  "artwork-in-motion": "The pieces of an illustration flow into new artwork instead of fading away.",
  "mini-player-to-full": "The compact player grows into its full view while artwork and controls stay connected.",
  "word-into-logo": "A word’s glyphs travel into a logo mark and find their way back.",
};

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
  const value = useDeferredValue(query.trim().toLowerCase());
  const shown = useMemo(
    () =>
      items.filter((item) =>
        !value || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(value),
      ),
    [items, value],
  );
  const [playing, setPlaying] = useState<string | null>(null);
  const touchPreview = useRef<string | null>(null);
  return (
    <div className="rm-browser not-prose">
      <div className="rm-browser-tools">
        <div>
          <p className="rm-browser-count">
            <b>{shown.length}</b> live examples. Hover, focus or tap one to see it play.
          </p>
        </div>
        <label className="rm-browser-search">
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
          <input type="search" placeholder="Find an interaction" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search components" />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="rm-browser-empty">Nothing matches “{query}”.</p>
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
