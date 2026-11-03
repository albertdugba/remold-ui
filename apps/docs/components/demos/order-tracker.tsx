"use client";
/**
 * A food order told like a short film. Each stage plays live: the lid lifts off the pot and steam
 * puffs out, the sealed bag hops and its handle swings, the scooter bumps along with its wheels
 * spinning and the road rushing past, and the front door opens as the badge pings. Then the
 * drawing reshapes into the next stage and that one comes alive.
 *
 * Built on the shared illustrated story: stacked `Remold.Icon` layers, one per colour, each
 * morphing its own shapes, with the live motion in plain CSS, held still while they morph.
 * Tap a step to see it. The kitchen, rider and times are made up.
 */
import { IllustratedStory, StoryFrame, useStory, type StoryStage } from "./illustrated-story";
import "./order-tracker.css";

/**
 * Every drawing sits on the same 160 × 128 frame, so each layer morphs in place. `top` and
 * `topLight` are the part that moves on its own: the pot's lid, the bag's handle, the scooter's
 * handlebar and hubs, and the front door.
 */
const STAGES: readonly StoryStage[] = [
  {
    id: "preparing",
    label: "Preparing",
    title: "Preparing your order",
    line: "Mama’s Kitchen is cooking it · arrives 12:45",
    art: {
      // Steam escaping from under the lid.
      soft: "M60 18c-5 6 5 10 0 18h5c5-8-5-12 0-18Z M76 10c-5 7 5 12 0 22h5c5-10-5-15 0-22Z M92 18c-5 6 5 10 0 18h5c5-8-5-12 0-18Z",
      // The pot, its two handles and the burner under it.
      ink: "M44 62h72v28a16 16 0 0 1 -16 16H60a16 16 0 0 1 -16 -16Z M30 67h14v9H30Z M116 67h14v9h-14Z M52 108h56v4H52Z",
      sheen: "M50 66h7v24a11 11 0 0 0 5 10h-4a14 14 0 0 1 -8 -12Z",
      brand: "M44 76h72v6H44Z",
      light: "M44 62h72v2.5H44Z",
      // The lid: a shallow dome and its knob.
      top: "M38 59a42 11 0 0 1 84 0v2H38Z M74 44h12a2 2 0 0 1 2 2v4H72v-4a2 2 0 0 1 2 -2Z",
      topLight: "M48 55a34 8 0 0 1 22 -5v2.5a32 7 0 0 0 -20 4.5Z",
    },
  },
  {
    id: "ready",
    label: "Ready",
    title: "Ready for pickup",
    line: "Kojo is collecting it · arrives 12:45",
    art: {
      // The receipt, tucked in behind the bag.
      soft: "M98 24h18v30H98Z",
      // The bag.
      ink: "M46 50h68l4 52a6 6 0 0 1 -6 6H48a6 6 0 0 1 -6 -6Z",
      // Its folded side, catching the light.
      sheen: "M48 54h9l-2 50h-5a4 4 0 0 1 -4 -4Z",
      // The seal on the front.
      brand: "M66 80a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z",
      light: "M72 80l3-3l3 3l7-7l3 3l-10 10Z M48 50h66v2.5H48Z",
      // The handle, and the order tag hanging from it.
      top: "M64 51v-9a16 16 0 0 1 32 0v9h-6v-9a10 10 0 0 0 -20 0v9Z",
      topLight: "M93 34h9v13h-9Z",
    },
  },
  {
    id: "riding",
    label: "On the way",
    title: "On the way",
    line: "Kojo is 6 minutes away · arrives 12:44",
    art: {
      // Speed lines trailing behind.
      soft: "M10 52h20a2 2 0 0 1 0 4H10Z M4 66h24a2 2 0 0 1 0 4H4Z M12 80h16a2 2 0 0 1 0 4H12Z",
      // Both tyres, the deck and steering column, and the seat.
      ink: "M38 98a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z M100 98a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z M44 82h56l14-38h10l-15 44a6 6 0 0 1 -6 4H44Z M48 72h28a4 4 0 0 1 0 8H48Z",
      sheen: "M46 84h50v3H46Z M97 86a15 15 0 0 1 28 2h-4a11 11 0 0 0 -20 -2Z",
      // The delivery box on the back.
      brand: "M42 38h32a3 3 0 0 1 3 3v27H39v-27a3 3 0 0 1 3 -3Z",
      // The box's stripe and the headlight.
      light: "M39 50h38v4H39Z M118 50h6v5h-6Z",
      // The handlebar, and the hubs the spokes turn on.
      top: "M112 40h18a3 3 0 0 1 0 6h-18Z",
      topLight: "M47 98a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z M109 98a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z",
    },
  },
  {
    id: "delivered",
    label: "Delivered",
    title: "Delivered",
    line: "Left at your door at 12:43. Enjoy!",
    art: {
      // Smoke from the chimney.
      soft: "M100 16a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z M106 6a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z",
      // The walls, the roof and the chimney.
      ink: "M44 62h72v40a6 6 0 0 1 -6 6H50a6 6 0 0 1 -6 -6Z M32 64l48-35l48 35Z M100 32h10v20l-10-7Z",
      sheen: "M40 60l40-29v6l-33 23Z",
      // The badge, and the bag waiting on the step.
      brand: "M22 24a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z M96 92h14l2 16H94Z",
      // A window and the check in the badge.
      light: "M52 74h14v12H52Z M29 24l3-3l3 3l7-7l3 3l-10 10Z",
      // The front door and its knob.
      top: "M84 95h2.5v2.5H84Z",
      topLight: "M72 80a8 8 0 0 1 16 0v28H72Z",
    },
  },
];

/** How long each stage plays, its morph in and then its live motion. */
const MS = [4200, 3600, 3800, 4400];

export interface OrderTrackerProps {
  /** The stage shown, 0 to 3: preparing, ready, on the way, delivered. */
  stage: number;
  /** Called when a step is tapped. */
  onStageChange?: (stage: number) => void;
}

/** The order's live illustration, the caption under it and the steps. */
export function OrderTracker({ stage, onStageChange }: OrderTrackerProps) {
  return (
    <IllustratedStory
      className="otr"
      label="Order status"
      stages={STAGES}
      stage={stage}
      onStageChange={onStageChange}
      under={
        <StoryFrame className="otr-road">
          <line x1="0" y1="113" x2="160" y2="113" />
        </StoryFrame>
      }
      extras={
        <StoryFrame className="otr-spokes">
          <g>
            <path d="M50 89v18M41 98h18M43.6 91.6l12.8 12.8M56.4 91.6l-12.8 12.8" />
          </g>
          <g>
            <path d="M112 89v18M103 98h18M105.6 91.6l12.8 12.8M118.4 91.6l-12.8 12.8" />
          </g>
        </StoryFrame>
      }
      over={
        <StoryFrame className="otr-ping">
          <circle cx="36" cy="24" r="14" />
        </StoryFrame>
      }
    />
  );
}

export interface OrderTrackerDemoProps {
  /** On the home page, whether its card is playing. */
  playing?: boolean;
}

export function OrderTrackerDemo({ playing }: OrderTrackerDemoProps = {}) {
  const { ref, state, take } = useStory(MS, playing);
  return (
    <div ref={ref} className="ils-stage not-prose">
      <OrderTracker stage={state} onStageChange={take} />
    </div>
  );
}
