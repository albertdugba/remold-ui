"use client";

import { extrude, server, region, type LayoutBox, type Palette } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { MotionConfig } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FIGURE_CONTROL, FIGURE_SECTION, FigureCallout, FigureRail, MONO, ScrollFigure, type FigureStep, type Follow } from "./scene-figure";

type SceneProps = Remold.Scene.Props;

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.15 };
const CAMERA_SPRING = { duration: 1.1, bounce: 0.08 };

const tone = (top: string, sides: [string, string, string], glow: string, text = "#ffffff"): Palette => ({
  top,
  sides,
  line: "60, 60, 70",
  glow,
  text,
});

const CARD = tone("#5b3df5", ["#2a1694", "#4c2fe0", "#9d86ff"], "124, 92, 255");
const TERMINAL = tone("#1c1c21", ["#0c0c0f", "#2a2a31", "#55555f"], "120, 120, 140", "#a1a1aa");
const SCREEN = tone("#0f172a", ["#0f172a", "#0f172a", "#0f172a"], "80, 140, 255", "#e2e8f0");
const APPROVED = tone("#16a34a", ["#0f6b31", "#16a34a", "#4ade80"], "40, 200, 100");
const PAPER = tone("#ffffff", ["#d4d4d8", "#e4e4e7", "#f4f4f5"], "200, 200, 210", "#71717a");
const COUNTER = tone("#f4efe6", ["#c9bfae", "#ddd4c5", "#ece5d8"], "220, 200, 170");
const BUILDING = tone("#fafafa", ["#a1a1aa", "#d4d4d8", "#f4f4f5"], "150, 150, 170", "#27272a");
const TOKEN = tone("#7c5cff", ["#3b1fb0", "#6a4cf0", "#b3a2ff"], "124, 92, 255");

const ICONS = {
  card: "M3 8.5h5v5H3z M3 11h5 M5.5 8.5v5 M15 7.5a6 6 0 0 1 0 9 M18 5a10 10 0 0 1 0 14",
  keypad: "M5 4h.01 M12 4h.01 M19 4h.01 M5 10h.01 M12 10h.01 M19 10h.01 M5 16h.01 M12 16h.01 M19 16h.01 M12 22h.01",
  lock: "M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4",
  check: "M5 12.5l4.5 4.5L19 7",
  bank: "M3 10l9-6 9 6 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 20h18",
  receipt: "M6 3h12 M6 7h9 M6 11h12 M6 15h7 M6 19h12",
} as const;

const OBJECTS: SceneProps["objects"] = {
  counter: { look: extrude({ shape: "ellipse", height: 8, sides: "sheen", shadow: true, passive: true }), palette: COUNTER },
  terminal: {
    look: extrude({ radius: 0.16, height: 44, sides: "sheen", shadow: true, decal: { icon: ICONS.keypad, at: [0, 0.24], weight: 2.6, color: "#a1a1aa" } }),
    palette: TERMINAL,
  },
  screenIdle: { look: extrude({ radius: 0.12, height: 2, sides: "flat", decal: { text: "$24.00", size: 22, color: "#e2e8f0" } }), palette: SCREEN },
  screenWait: { look: extrude({ radius: 0.12, height: 2, sides: "flat", decal: { text: "Approving…", size: 15, color: "#93c5fd" } }), palette: SCREEN },
  screenOk: { look: extrude({ radius: 0.12, height: 2, sides: "flat", decal: { icon: ICONS.check, text: "Approved", size: 16, color: "#ffffff" } }), palette: APPROVED },
  card: {
    look: extrude({ radius: 0.1, height: 3, sides: "sheen", edge: true, shadow: true, decal: { icon: ICONS.card, text: "•••• 4242", align: "end", size: 13, color: "#ffffff" } }),
    palette: CARD,
  },
  receipt: { look: extrude({ radius: 0.04, height: 1.5, sides: "flat", shadow: true, decal: { icon: ICONS.receipt, fit: "stretch", weight: 1.4, color: "#a1a1aa" } }), palette: PAPER },
  token: { look: extrude({ shape: "ellipse", height: 7, sides: "sheen", edge: true, decal: { icon: ICONS.lock, color: "#ffffff", weight: 2.2 } }), palette: TOKEN },
  approval: { look: extrude({ shape: "ellipse", height: 7, sides: "sheen", edge: true, decal: { icon: ICONS.check, color: "#ffffff", weight: 2.6 } }), palette: APPROVED },
  processor: { look: server, palette: BUILDING },
  network: { look: region, palette: BUILDING },
  bank: { look: extrude({ radius: 0.06, height: 70, sides: "sheen", shadow: true, decal: { icon: ICONS.bank, weight: 1.8, color: "#3f3f46" } }), palette: BUILDING },
};

const TERMINAL_BOX = { x: -80, y: -110, width: 160, depth: 220, height: 44 };
const SCREEN_BOX = { x: -60, y: -96, z: 44, width: 120, depth: 82, height: 2 };
const PROCESSOR = { x: 470, y: -230, width: 120, depth: 120 };
const NETWORK = { x: 760, y: -40, width: 120, depth: 120 };
const BANK = { x: 1040, y: -260, width: 150, depth: 150, height: 70 };

const centreOf = (box: { x: number; y: number; width: number; depth: number }) => ({ x: box.x + box.width / 2, y: box.y + box.depth / 2 });

function chipAt(box: { x: number; y: number; width: number; depth: number; height?: number }, extra: Partial<LayoutBox> = {}): LayoutBox {
  const centre = centreOf(box);

  return { x: centre.x - 30, y: centre.y - 30, z: (box.height ?? 34) + 4, width: 60, depth: 60, height: 7, ...extra };
}

type Step = "ready" | "tap" | "encrypt" | "processor" | "network" | "bank" | "approve" | "approved";

interface StepInfo {
  title: string;
  callout: { eyebrow: string; text: string };
  anchor: string;
  ms: number;
}

const STEPS: Record<Step, StepInfo> = {
  ready: { title: "Checkout", callout: { eyebrow: "Coffee & croissant", text: "$24.00" }, anchor: "screenIdle", ms: 1800 },
  tap: { title: "Tap", callout: { eyebrow: "Contactless", text: "Card details read in 0.2s" }, anchor: "card", ms: 1700 },
  encrypt: { title: "Encrypt", callout: { eyebrow: "4242 4242 4242 4242", text: "becomes tok_8f2a…" }, anchor: "token", ms: 1900 },
  processor: { title: "Processor", callout: { eyebrow: "Payment processor", text: "Forwards the token to the card network" }, anchor: "processor", ms: 1800 },
  network: { title: "Network", callout: { eyebrow: "Card network", text: "Routes it to the bank that issued the card" }, anchor: "network", ms: 1800 },
  bank: { title: "Bank", callout: { eyebrow: "Your bank", text: "Funds available · not flagged as fraud" }, anchor: "bank", ms: 2200 },
  approve: { title: "Approve", callout: { eyebrow: "Approval code", text: "A7F2C9 · back to the shop" }, anchor: "approval", ms: 1900 },
  approved: { title: "Receipt", callout: { eyebrow: "Approved in 1.4s", text: "Money settles at the end of the day" }, anchor: "receipt", ms: 3200 },
};

const ORDER = Object.keys(STEPS) as Step[];

const hidden = (box: LayoutBox): LayoutBox => ({ ...box, opacity: 0 });

const CLOSE = { yaw: 34, pitch: 58, zoom: 1.55, centerX: -40, centerY: 30 };
const WIDE = { yaw: 22, pitch: 60, zoom: 0.92, centerX: 470, centerY: -60 };

function sceneFor(step: Step): SceneProps["layouts"][string] {
  const at = ORDER.indexOf(step);
  const past = (other: Step) => at >= ORDER.indexOf(other);
  const close = step === "ready" || step === "tap" || step === "encrypt" || step === "approved";
  const wide = !close;
  const cardHover = { x: -250, y: 120, z: 110, width: 170, depth: 107, height: 3 };
  const cardOnTerminal = { x: -85, y: -95, z: 64, width: 170, depth: 107, height: 3, arc: 60 };
  const token = { processor: PROCESSOR, network: NETWORK, bank: BANK } as const;
  const tokenBox =
    step === "encrypt" ? chipAt({ ...TERMINAL_BOX, height: 60 }) : step in token ? chipAt(token[step as keyof typeof token], { arc: 160 }) : chipAt({ ...TERMINAL_BOX, height: 60 });
  const approvalBox = step === "approve" || step === "approved" ? chipAt({ ...TERMINAL_BOX, height: 60 }, { arc: 260 }) : chipAt(BANK, { z: 74 });

  return {
    camera: close ? CLOSE : step === "bank" ? { ...WIDE, zoom: 1.35, centerX: 900, centerY: -150, yaw: 30 } : WIDE,
    caption: `${STEPS[step].title}: ${STEPS[step].callout.eyebrow}. ${STEPS[step].callout.text}.`,
    objects: {
      counter: { x: -250, y: -230, width: 470, depth: 440, z: -8, height: 8 },
      terminal: TERMINAL_BOX,
      screenIdle: past("tap") ? hidden(SCREEN_BOX) : SCREEN_BOX,
      screenWait: past("tap") && !past("approved") ? SCREEN_BOX : hidden(SCREEN_BOX),
      screenOk: past("approved") ? SCREEN_BOX : hidden(SCREEN_BOX),
      card: step === "tap" ? cardOnTerminal : { ...cardHover, arc: step === "encrypt" ? 40 : 0 },
      receipt: past("approved") ? { x: -55, y: 110, z: 2, width: 110, depth: 170, height: 1.5, delay: 0.5 } : { x: -55, y: 100, z: 2, width: 110, depth: 1, height: 1.5, opacity: 0 },
      token: past("encrypt") && !past("approve") ? tokenBox : hidden(chipAt({ ...TERMINAL_BOX, height: 60 })),
      approval: past("bank") && !past("approved") ? approvalBox : hidden(past("approved") ? chipAt({ ...TERMINAL_BOX, height: 60 }) : chipAt(BANK, { z: 74 })),
      processor: { ...PROCESSOR, height: 34, opacity: wide ? 1 : 0 },
      network: { ...NETWORK, height: 10, opacity: wide ? 1 : 0 },
      bank: { ...BANK, opacity: wide ? 1 : 0 },
    },
  };
}

const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(ORDER.map((step) => [step, sceneFor(step)]));

const LINKS: SceneProps["links"] = [
  { from: "terminal", to: "processor", dashed: true, layouts: ["processor", "network", "bank", "approve"] },
  { from: "processor", to: "network", dashed: true, layouts: ["processor", "network", "bank", "approve"] },
  { from: "network", to: "bank", dashed: true, layouts: ["processor", "network", "bank", "approve"] },
];

function useSteps() {
  const [step, setStep] = useState<Step>("ready");
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;

    const timer = setTimeout(() => setStep(ORDER[(ORDER.indexOf(step) + 1) % ORDER.length]!), STEPS[step].ms);

    return () => clearTimeout(timer);
  }, [step, playing]);

  const pick = (next: Step) => {
    setPlaying(false);
    setStep(next);
  };

  return { step, playing, setPlaying, pick };
}

const figureStep = (step: Step): FigureStep => ({
  title: STEPS[step].title,
  eyebrow: STEPS[step].callout.eyebrow,
  text: STEPS[step].callout.text,
  anchor: STEPS[step].anchor,
});

const RAIL = ORDER.map((id) => ({ id, title: STEPS[id].title }));

function PaymentStage({ step, onPick, children }: { step: Step; onPick: (step: Step) => void; children?: ReactNode }) {
  const actions = useRef<Remold.Scene.Actions | null>(null);
  const follow: Follow = useRef(null);

  return (
    <section className={FIGURE_SECTION} aria-label="How a card payment works">
      <span className={`${MONO} absolute top-6 left-6 z-10 text-[11px] tracking-[0.06em] text-[#a1a1aa]`}>FIG 1.1 · HOW A CARD PAYMENT WORKS</span>
      <Remold.Scene
        className="relative block h-[480px] w-full"
        label="A card is tapped on a terminal; an encrypted token travels through the payment processor and card network to the bank, which approves it, and a receipt prints."
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={step}
        interact={{ drag: false, hover: false, tap: false }}
        spring={CAMERA_SPRING}
        actionsRef={actions}
        onDraw={() => follow.current?.()}
        maxPixelRatio={1.5}
      />
      <FigureCallout step={figureStep(step)} actions={actions} follow={follow} />
      <div className="absolute right-6 bottom-5 left-6 flex flex-wrap items-center justify-between gap-3">
        <FigureRail steps={RAIL} current={step} onPick={onPick} />
        {children}
      </div>
    </section>
  );
}

/** Plays through the steps on its own; the step rail jumps and pauses. */
export function CardPayment() {
  const { step, playing, setPlaying, pick } = useSteps();

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div className="col-span-full">
        <PaymentStage step={step} onPick={pick}>
          <button type="button" onClick={() => setPlaying(!playing)} className={FIGURE_CONTROL}>
            {playing ? "Pause" : "Play"}
          </button>
        </PaymentStage>
      </div>
    </MotionConfig>
  );
}

/** Pinned while you scroll past it; each stretch of scroll is one step, and scrolling back reverses it. */
export function CardPaymentScroll() {
  const [step, setStep] = useState<Step>("ready");

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <ScrollFigure count={ORDER.length} accent="#5b3df5" onStep={(index) => setStep(ORDER[index]!)}>
        {(scrollTo) => (
          <PaymentStage step={step} onPick={(next) => scrollTo(ORDER.indexOf(next))}>
            <span className={`${MONO} text-[11.5px] text-[#a1a1aa]`}>Scroll to follow the payment</span>
          </PaymentStage>
        )}
      </ScrollFigure>
    </MotionConfig>
  );
}
