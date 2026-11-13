"use client";

import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type Ref } from "react";
import { NIGHT, NIGHT_CHIP, NIGHT_CTA, NIGHT_FOOT, NIGHT_READOUT, NIGHT_SCENE, NIGHT_STAGE, PLATFORM_INK, VIOLET } from "./night-stage";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
export type SwapPhase = "quote" | "sign" | "routing" | "settled";
type Phase = SwapPhase;

const TOKEN = "ETH";

const OBJECTS: SceneProps["objects"] = {
  source: {
    look: extrude({
      radius: 0.16,
      edge: true,
      ink: PLATFORM_INK,
      shadow: false,
      decal: { text: "W", size: 26, color: "#d9d6ea" },
    }),
    label: "Your wallet",
  },
  pool: {
    look: extrude({
      shape: "ellipse",
      glass: true,
      sides: "sheen",
      edge: true,
      decal: { text: "⇄", size: 30, color: "#d9d6ea" },
    }),
    label: "Liquidity route",
  },
  destination: {
    look: extrude({
      radius: 0.16,
      edge: true,
      ink: PLATFORM_INK,
      shadow: false,
      decal: { text: "£", size: 26, color: "#d9d6ea" },
    }),
    label: "USDC balance",
  },
  token: {
    look: extrude({
      shape: "ellipse",
      sides: "sheen",
      edge: true,
      fillColor: VIOLET,
      decal: { text: "◆", size: 22, color: "#fff" },
    }),
    label: `${TOKEN} token`,
  },
};

const SOURCE = { x: -300, y: -55, z: 0, width: 120, depth: 120, height: 18 };
const POOL = { x: -55, y: -30, z: 0, width: 145, depth: 145, height: 58 };
const DESTINATION = { x: 230, y: -55, z: 0, width: 120, depth: 120, height: 18 };

function layoutFor(phase: Phase): SceneProps["layouts"][string] {
  const token =
    phase === "quote" || phase === "sign"
      ? { x: SOURCE.x + 30, y: SOURCE.y + 30, z: SOURCE.height, width: 60, depth: 60, height: 8 }
      : phase === "routing"
        ? { x: POOL.x + 42, y: POOL.y + 42, z: POOL.height + 40, width: 60, depth: 60, height: 8, arc: 72 }
        : {
            x: DESTINATION.x + 30,
            y: DESTINATION.y + 30,
            z: DESTINATION.height,
            width: 60,
            depth: 60,
            height: 8,
            arc: 72,
          };
  return {
    camera: { zoom: 1.26, centerX: -15, centerY: -8 },
    caption: {
      quote: "A quoted route from ETH to USDC.",
      sign: "Your wallet signs the route locally.",
      routing: "The swap is moving through the selected pool.",
      settled: "USDC has settled in your wallet.",
    }[phase],
    objects: {
      source: SOURCE,
      pool: { ...POOL, fill: phase === "routing" ? 0.82 : 0.22, color: VIOLET },
      destination: DESTINATION,
      token: { ...token, opacity: phase === "settled" ? 0 : 1, fadeDelay: phase === "settled" ? 0.45 : 0 },
    },
  };
}

const PHASES: readonly Phase[] = ["quote", "sign", "routing", "settled"];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(PHASES.map((phase) => [phase, layoutFor(phase)]));
const LINKS: SceneProps["links"] = [
  { from: "source", to: "pool", dashed: true, layouts: ["quote", "sign", "settled"] },
  { from: "pool", to: "destination", dashed: true, layouts: ["quote", "sign", "settled"] },
  { from: "source", to: "pool", flow: true, layouts: ["routing"] },
  { from: "pool", to: "destination", flow: true, layouts: ["routing"] },
];

const BEATS: readonly { phase: Phase; ms: number }[] = [
  { phase: "quote", ms: 1600 },
  { phase: "sign", ms: 1100 },
  { phase: "routing", ms: 1500 },
  { phase: "settled", ms: 2600 },
];

export interface TransactionRouteProps {
  value?: SwapPhase;
  defaultValue?: SwapPhase;
  onValueChange?: (phase: SwapPhase) => void;
  ref?: Ref<HTMLElement>;
}

export function TransactionRoute({
  value,
  defaultValue = "quote",
  onValueChange,
  ref,
}: TransactionRouteProps) {
  const [phase, setPhase] = useControllableState({ value, defaultValue, onValueChange });

  const details: Record<Phase, { eyebrow: string; value: string }> = {
    quote: { eyebrow: "Best route · 0.18% price impact", value: "1 ETH → 3,142.80 USDC" },
    sign: { eyebrow: "Signature requested · no gas yet", value: "Confirm in wallet" },
    routing: { eyebrow: "Routing · Ethereum", value: "Swapping 1 ETH" },
    settled: { eyebrow: "Settled · 12 seconds", value: "+3,142.80 USDC" },
  };

  return (
    <section ref={ref} className={`${NIGHT_STAGE} not-prose`} aria-label="Transaction route">
      <Remold.Scene
        className={NIGHT_SCENE}
        label="A token moving from a wallet through a liquidity route into a USDC balance"
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={phase}
        palette={NIGHT}
        interact={{ drag: false }}
        spring={{ duration: 0.86, bounce: 0.18 }}
      />
      <div className={NIGHT_CHIP} role="status">
        <span className="grid size-7 place-items-center rounded-[9px] bg-[rgb(124_92_255_/_0.24)] text-[13px] text-[#b9a9ff]">
          ◆
        </span>
        <span className="grid gap-0.5">
          <small className="text-[10.5px] text-[#9792ad]">{details[phase].eyebrow}</small>
          <b className="text-[12.5px] font-semibold text-[#f3f1ff]">{details[phase].value}</b>
        </span>
      </div>
      <div className={NIGHT_FOOT}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={phase}
            className={NIGHT_READOUT}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            Network fee <b>£2.14</b>
          </motion.span>
        </AnimatePresence>
        <button type="button" className={NIGHT_CTA} onClick={() => setPhase("quote")}>
          {phase === "settled" ? "Swap again" : "View route"}
        </button>
      </div>
    </section>
  );
}

export function TransactionRouteDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, (step) => BEATS[step]!.phase, playing);
  const { state: phase, takeOver } = scene;
  useEffect(() => {
    if (scene.live || phase === "settled") return;
    const index = PHASES.indexOf(phase);
    const timer = setTimeout(() => takeOver(PHASES[index + 1]!), BEATS[index]!.ms);
    return () => clearTimeout(timer);
  }, [scene.live, phase, takeOver]);
  return <TransactionRoute ref={scene.ref} value={phase} onValueChange={takeOver} />;
}
