"use client";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { IllustratedStory, type StoryStage } from "./illustrated-story";
import { useScene } from "./use-scene";
import "./payment-status.css";

const BACK_CARD = "M44 46h76a8 8 0 0 1 8 8v4H36v-4a8 8 0 0 1 8 -8Z";
const CARD = "M38 54h84a8 8 0 0 1 8 8v38a8 8 0 0 1 -8 8H38a8 8 0 0 1 -8 -8V62a8 8 0 0 1 8 -8Z";
const CARD_SHEEN = "M90 54h18l-25 54H65Z";
const CARD_NUMBER = "M42 88h14v3.5H42Z M60 88h14v3.5H60Z M78 88h14v3.5H78Z M96 88h14v3.5H96Z M42 97h30v2.5H42Z";
const CHIP = "M44 64h16a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3H44a3 3 0 0 1 -3 -3V67a3 3 0 0 1 3 -3Z";

export const PAYMENT_STATUSES = ["card", "processing", "declined", "paid"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

function stagesFor(amount: string, card: string, email: string): readonly StoryStage[] {
  return [
    {
      id: "card",
      label: "Ready to pay",
      title: `Pay ${amount}`,
      line: card,
      art: {
        soft: BACK_CARD,
        ink: CARD,
        sheen: CARD_SHEEN,
        brand: "M106 67a6 6 0 1 0 12 0a6 6 0 1 0 -12 0Z",
        light: CARD_NUMBER,
        topSoft: CHIP,
      },
    },
    {
      id: "processing",
      label: "Processing",
      title: "Confirming with your bank",
      line: "This takes a few seconds",
      art: {
        soft: "M66 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z M76 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z M86 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z",
        ink: "M56 62h48a8 8 0 0 1 8 8v30a8 8 0 0 1 -8 8H56a8 8 0 0 1 -8 -8V70a8 8 0 0 1 8 -8Z",
        sheen: "M56 66h5v38h-5a4 4 0 0 1 -4 -4V70a4 4 0 0 1 4 -4Z",
        brand: "M80 76a6 6 0 0 1 3.5 10.9L85 96H75l1.5 -9.1A6 6 0 0 1 80 76Z",
        top: "M60 63V50a20 20 0 0 1 40 0v13h-8V50a12 12 0 0 0 -24 0v13Z",
      },
    },
    {
      id: "declined",
      label: "Declined",
      title: "Card declined",
      line: "Your bank said no. Try another card.",
      art: {
        soft: BACK_CARD,
        ink: CARD,
        sheen: CARD_SHEEN,
        brand: "M104 50a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z",
        light: `${CARD_NUMBER} M116.5 42h3v10h-3Z M116.5 55h3v3h-3Z`,
        topSoft: CHIP,
      },
    },
    {
      id: "paid",
      label: "Paid",
      title: `${amount} paid`,
      line: `Receipt sent to ${email}`,
      art: {
        soft: "M36 36l3 3l-3 3l-3 -3Z M126 52l3 3l-3 3l-3 -3Z M124 24l2 2l-2 2l-2 -2Z",
        ink: "M54 22h52a4 4 0 0 1 4 4v78l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5l-5 5l-5 -5V26a4 4 0 0 1 4 -4Z",
        light:
          "M55 24.5h50a2.5 2.5 0 0 1 2.5 2.5V102.5L105 105.5L100 100.5L95 105.5L90 100.5L85 105.5L80 100.5L75 105.5L70 100.5L65 105.5L60 100.5L55 105.5L52.5 103V27a2.5 2.5 0 0 1 2.5 -2.5Z",
        topSoft: "M60 46h40v3H60Z M60 54h32v3H60Z M60 62h36v3H60Z",
        top: "M60 32h22v5H60Z M60 74h14v4H60Z M86 74h14v4H86Z",
        topBrand: "M91 96a13 13 0 1 0 26 0a13 13 0 1 0 -26 0Z",
        topLight: "M97.5 96.2l4.3 4.3l8.7 -9l2.2 2.1l-10.9 11.3l-6.5 -6.5Z",
      },
    },
  ];
}

export interface PaymentStatusProps {
  status: PaymentStatusValue;
  /** The amount as you'd show it, currency included. */
  amount?: string;
  /** The card, as the person would recognise it. */
  card?: string;
  /** Where the receipt goes. */
  email?: string;
}

/** A payment's status as one drawing: the card, a lock while the bank confirms, then a receipt or a refusal. */
export function PaymentStatus({
  status,
  amount = "€48.00",
  card = "Visa ending 4242",
  email = "ama@northwind.app",
}: PaymentStatusProps) {
  return (
    <IllustratedStory
      className="pst"
      label="Payment status"
      stages={stagesFor(amount, card, email)}
      stage={PAYMENT_STATUSES.indexOf(status)}
      steps={false}
    />
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly { status: PaymentStatusValue; ms: number }[] = [
  { status: "card", ms: 2400 },
  { status: "processing", ms: 2200 },
  { status: "declined", ms: 2800 },
  { status: "processing", ms: 2200 },
  { status: "paid", ms: 3400 },
];

const fromBeat = (step: number) => BEATS[step]!.status;

const LABELS: Record<PaymentStatusValue, string> = {
  card: "Card",
  processing: "Processing",
  declined: "Declined",
  paid: "Paid",
};

export interface PaymentStatusDemoProps {
  /** On the home page, whether its card is playing. */
  playing?: boolean;
}

export function PaymentStatusDemo({ playing }: PaymentStatusDemoProps = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing ?? true);

  return (
    <div ref={ref} className="ils-stage not-prose">
      <PaymentStatus status={state} />
      <ToggleGroup
        className="pst-controls"
        aria-label="Payment status"
        value={[state]}
        onValueChange={(values) => values[0] && takeOver(values[0] as PaymentStatusValue)}
      >
        {PAYMENT_STATUSES.map((status) => (
          <Toggle key={status} value={status} className="pst-control">
            {LABELS[status]}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}
