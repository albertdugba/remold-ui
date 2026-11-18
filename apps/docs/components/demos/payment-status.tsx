"use client";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Remold } from "@remold-ui/react";
import { IllustratedStory, STORY_STAGE, type StoryStage } from "./illustrated-story";
import { useScene } from "./use-scene";

const BACK_CARD = "M44 46h76a8 8 0 0 1 8 8v4H36v-4a8 8 0 0 1 8 -8Z";
const CARD = "M38 54h84a8 8 0 0 1 8 8v38a8 8 0 0 1 -8 8H38a8 8 0 0 1 -8 -8V62a8 8 0 0 1 8 -8Z";
const CARD_SHEEN = "M90 54h18l-25 54H65Z";
const CARD_NUMBER = "M42 88h14v3.5H42Z M60 88h14v3.5H60Z M78 88h14v3.5H78Z M96 88h14v3.5H96Z M42 97h30v2.5H42Z";
const CHIP = "M44 64h16a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3H44a3 3 0 0 1 -3 -3V67a3 3 0 0 1 3 -3Z";

export const PAYMENT_STATUSES = ["card", "processing", "declined", "paid"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

const BRAND: Record<PaymentStatusValue, string> = {
  card: "[--ils-brand:#4f46e5] dark:[--ils-brand:#818cf8]",
  processing: "[--ils-brand:#4f46e5] dark:[--ils-brand:#818cf8]",
  declined: "[--ils-brand:#dc2626] dark:[--ils-brand:#f87171]",
  paid: "[--ils-brand:#15803d] dark:[--ils-brand:#4ade80]",
};

type Point = readonly [x: number, y: number];

const EYES_AT: Record<PaymentStatusValue, readonly [Point, Point]> = {
  card: [[80, 71], [96, 71]],
  processing: [[71, 75], [89, 75]],
  declined: [[80, 72], [96, 72]],
  paid: [[68, 89], [82, 89]],
};

const pill = ([x, y]: Point) => `M${x - 3.5} ${y - 3}a3.5 3.5 0 0 1 7 0v6a3.5 3.5 0 0 1 -7 0Z`;

const squint = ([x, y]: Point, side: 1 | -1) => {
  const tip = x + side * 3.6;
  const back = x - side * 3;
  const inner = x + side * 0.6;
  return `M${back} ${y - 4.2}L${tip} ${y}L${back} ${y + 4.2}L${back} ${y + 1.6}L${inner} ${y}L${back} ${y - 1.6}Z`;
};

const smile = ([x, y]: Point) => `M${x - 4.6} ${y + 2}a4.6 4.6 0 0 1 9.2 0h-3a1.6 1.6 0 0 0 -3.2 0Z`;

const EYE_SHAPES: Record<PaymentStatusValue, (eyes: readonly [Point, Point]) => string> = {
  card: ([left, right]) => `${pill(left)} ${pill(right)}`,
  processing: ([left, right]) => `${pill(left)} ${pill(right)}`,
  declined: ([left, right]) => `${squint(left, 1)} ${squint(right, -1)}`,
  paid: ([left, right]) => `${smile(left)} ${smile(right)}`,
};

const EYE_MOTION: Record<PaymentStatusValue, string> = {
  card: "animate-eye-blink",
  processing: "animate-eye-look",
  declined: "",
  paid: "",
};

function Eyes({ status }: { status: PaymentStatusValue }) {
  const eyes = EYES_AT[status];
  const color = status === "paid" ? "text-(--ils-ink)" : "text-(--ils-light)";

  return (
    <div className={`absolute inset-0 ${EYE_MOTION[status]}`} style={{ transformOrigin: `50% ${(eyes[0][1] / 128) * 100}%` }}>
      <Remold.Icon
        className={`absolute inset-0 size-full transition-[color] duration-300 ease-out ${color}`}
        path={EYE_SHAPES[status](eyes)}
        viewBox="0 0 160 128"
        fill="currentColor"
        aria-hidden="true"
      />
    </div>
  );
}

const GLOW_COLORS =
  "[--ps-glow-processing:rgb(79_70_229/0.3)] [--ps-glow-declined:rgb(220_38_38/0.26)] [--ps-glow-paid:rgb(22_163_74/0.32)] dark:[--ps-glow-processing:rgb(129_140_248/0.4)] dark:[--ps-glow-declined:rgb(248_113_113/0.34)] dark:[--ps-glow-paid:rgb(74_222_128/0.36)]";

const GLOWS: readonly { status: PaymentStatusValue; className: string }[] = [
  { status: "processing", className: "animate-glow-breathe [--ps-glow:var(--ps-glow-processing)]" },
  { status: "declined", className: "[--ps-glow:var(--ps-glow-declined)]" },
  { status: "paid", className: "[--ps-glow:var(--ps-glow-paid)]" },
];

function Glow({ status }: { status: PaymentStatusValue }) {
  return (
    <div className={`pointer-events-none absolute -inset-x-[12%] top-[4%] bottom-[6%] ${GLOW_COLORS}`} aria-hidden="true">
      {GLOWS.map((glow) => (
        <div
          key={glow.status}
          data-on={glow.status === status || undefined}
          className={`absolute inset-0 origin-bottom bg-[radial-gradient(48%_70%_at_50%_100%,var(--ps-glow),transparent_74%)] opacity-0 transition-[opacity] duration-500 ease-out data-on:opacity-100 ${glow.className}`}
        />
      ))}
    </div>
  );
}

function stagesFor(amount: string, card: string, email: string): readonly StoryStage[] {
  return [
    {
      id: "card",
      label: "Ready to pay",
      motion: { body: "animate-card-float" },
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
      motion: { part: "animate-lock-click", soft: "animate-story-pulse" },
      title: "Confirming with your bank",
      line: "This takes a few seconds",
      art: {
        soft: "M66 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z M76 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z M86 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z",
        ink: "M56 62h48a8 8 0 0 1 8 8v30a8 8 0 0 1 -8 8H56a8 8 0 0 1 -8 -8V70a8 8 0 0 1 8 -8Z",
        sheen: "M56 66h5v38h-5a4 4 0 0 1 -4 -4V70a4 4 0 0 1 4 -4Z",
        brand: "M80 87a4.5 4.5 0 0 1 2.6 8.2L83.8 102h-7.6l1.2 -6.8A4.5 4.5 0 0 1 80 87Z",
        top: "M60 63V50a20 20 0 0 1 40 0v13h-8V50a12 12 0 0 0 -24 0v13Z",
      },
    },
    {
      id: "declined",
      label: "Declined",
      motion: { body: "animate-card-shake" },
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
      motion: { body: "animate-story-land", soft: "animate-story-twinkle" },
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
  amount?: string;
  card?: string;
  email?: string;
  live?: boolean;
}

export function PaymentStatus({
  status,
  amount = "£48.00",
  card = "Visa ending 4242",
  email = "ama@remold.app",
  live,
}: PaymentStatusProps) {
  return (
    <IllustratedStory
      artClassName={BRAND[status]}
      label="Payment status"
      stages={stagesFor(amount, card, email)}
      stage={PAYMENT_STATUSES.indexOf(status)}
      under={<Glow status={status} />}
      extras={<Eyes status={status} />}
      steps={false}
      live={live}
    />
  );
}

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
  playing?: boolean;
}

export function PaymentStatusDemo({ playing }: PaymentStatusDemoProps = {}) {
  const { ref, state, takeOver, live } = useScene(BEATS, fromBeat, playing, true);

  return (
    <div ref={ref} className={STORY_STAGE}>
      <PaymentStatus status={state} live={live} />
      <ToggleGroup
        className="mt-[18px] inline-flex max-w-full overflow-x-auto rounded-[10px] border border-solid border-fd-border bg-fd-muted p-[3px]"
        aria-label="Show status"
        value={[state]}
        onValueChange={(values) => values[0] && takeOver(values[0] as PaymentStatusValue)}
      >
        {PAYMENT_STATUSES.map((status) => (
          <Toggle
            key={status}
            value={status}
            className="cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 py-1.5 text-[12.5px] whitespace-nowrap text-fd-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fd-foreground data-pressed:bg-fd-background data-pressed:text-fd-foreground data-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
          >
            {LABELS[status]}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}
