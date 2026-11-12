"use client";
import Link from "next/link";
import { useMemo } from "react";
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
/** Landing cards whose lone control would look oversized at the default enlargement. */
const LANDING_ZOOM: Record<string, number> = {
  "event-rsvp": 1,
  "feedback-prompt": 1,
};

/** Landing cards drawn on their own dark stage, which should fill the card's picture edge to edge. */
const LANDING_COVER = new Set(["particle-shapes"]);

/** Landing cards whose part fills whatever box it's in, so the preview gives it a height to fill. */
const LANDING_HEIGHT: Record<string, number> = {
  "mini-player-to-full": 480,
};

const LANDING_COPY: Record<string, string> = {
  mentions: "Type @ and a person leaves the picker to become part of the message.",
  "button-to-dialog": "The New habit button grows into the dialog, and the dialog shrinks into the habit it added.",
  "post-and-comments": "A reply grows from the composer into the conversation it belongs to.",
  "code-to-verified": "Six code cells fold into one verifying state, then resolve as a check.",
  "voice-states": "One orb changes its texture and pace as a voice interaction moves forward.",
  wallet: "Cards fan out of the holder; choosing one brings its activity forward.",
  revenue: "The chart reshapes between ranges while the headline rolls to the new number.",
  streak: "A grey ember grows into a flame as the day count and week fill in.",
  "send-a-message": "The composer becomes the sent message, then makes room for the reply.",
  "kitchen-ticket": "A ticket's ring fills as the order cooks, then closes with a check or a cross.",
  "order-tracker": "The pot becomes the bag, the scooter, then your front door as the order moves along.",
  "particle-shapes": "A galaxy unwinds into a double helix, traces the Lorenz attractor, then becomes a honeybee, a butterfly and the Grok mark, all in turning 3D dots.",
  "payment-status": "The card becomes a lock while the bank confirms, then a receipt or a warning.",
  "send-money": "Digits, commas and the Send state all move with the amount you enter.",
  "currency-converter": "What they receive rolls with the amount you type, and the two currencies trade places when you swap.",
  "focus-timer": "A particle hourglass whose sand really falls, freezes on pause, and flips into the break.",
  "donation-goal": "Every gift streams up as dots and fills the drop, until it bursts into a thank you.",
  "api-keys": "A secret appears once, then folds into a newly masked row.",
  "stepper-slider": "A stepper for small nudges that stretches into a slider when you drag the number sideways.",
  "event-rsvp": "The RSVP button grows into your answer, then travels down into your spot.",
  "feedback-prompt": "Pick a thumb and the pill grows into a card, sends with a spinner, then folds into a thank-you.",
  "promo-code": "The code field springs down into a ticket chip as the discount opens and the total rolls.",
  "seat-calculator": "Team size changes the people, plan, price and features together.",
  "usage-meter": "Usage crosses limits, changes tone and rolls into the projected bill.",
  "onboarding-checklist": "Each completed step clears the way for the next, then the whole card tucks away.",
  "bulk-selection": "Selecting a range joins rows into one band and brings up its actions.",
  "filter-bar": "Filtering reshapes both the tokens and the transaction list beneath them.",
  "label-picker": "A searchable picker adds a label where it belongs and makes room for it.",
  "one-person-three-components": "The same person stays recognisable while every surrounding layout changes.",
  "turn-on-two-factor": "A settings row opens into setup, then resolves into its enabled state.",
  "option-to-booking": "A table that fell through offers two times; the one you pick carries into the updated booking.",
  "email-to-teammate": "An email becomes an invite, then becomes the teammate it represents.",
  "artwork-in-motion": "The pieces of an illustration flow into new artwork instead of fading away.",
  "mini-player-to-full": "The compact player grows into its full view while artwork and controls stay connected.",
  "logo-into-logo": "One brand mark reshapes into the next, with no text in between.",
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
      isNew: card.isNew,
      custom: {
        render: card.render,
        states: card.states,
        every: card.every,
        width: card.wide ? 760 : 520,
        bare: card.bare,
        cover: card.bleed || LANDING_COVER.has(card.slug),
        maxZoom: LANDING_ZOOM[card.slug],
        height: LANDING_HEIGHT[card.slug],
      },
    }));
    const rest = extras.filter((item) => !covered.has(item.id));
    return [...front, ...rest];
  }, [extras]);

  return (
    <div className="rm-browser not-prose">
      <div className="rm-browser-grid">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="rm-card">
            <span className="rm-card-stage">
              <ComponentPreview id={item.id} custom={item.custom} />
              {item.isNew && <span className="rm-card-new">New</span>}
            </span>
            <span className="rm-card-meta">
              <strong>{item.title}</strong>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
