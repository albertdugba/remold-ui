"use client";

import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useEffect, type CSSProperties } from "react";
import { NIGHT, PLATFORM_INK, VIOLET, WIRE_INK } from "./night-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
type Level = 0 | 1 | 2 | 3;

const METHODS = [
  { id: "passkey", label: "Passkey", mark: "⌁" },
  { id: "backup", label: "Recovery", mark: "◈" },
  { id: "guardian", label: "Guardian", mark: "✦" },
] as const;

const OBJECTS: SceneProps["objects"] = {
  wallet: {
    look: extrude({ radius: 0.2, edge: true, ink: PLATFORM_INK, shadow: false, decal: { text: "W", size: 34, color: "#f0eeff" } }),
    label: "Wallet",
  },
  ...Object.fromEntries(
    METHODS.map((method) => [
      method.id,
      { look: extrude({ shape: "ellipse", sides: "sheen", edge: true, fillColor: VIOLET, decal: { text: method.mark, size: 20, color: "#f0eeff" } }), label: method.label },
    ]),
  ),
};

const WALLET = { x: -65, y: -65, z: 0, width: 150, depth: 150, height: 28 };
const SATELLITES = [
  { x: -280, y: -170 },
  { x: 155, y: -165 },
  { x: -60, y: 165 },
];

function layoutFor(level: Level): SceneProps["layouts"][string] {
  return {
    camera: { zoom: 1.42, centerX: -10, centerY: -6 },
    caption: level === 0 ? "A wallet with no recovery methods." : `${level} recovery method${level === 1 ? "" : "s"} protecting this wallet.`,
    objects: {
      wallet: { ...WALLET, fill: Math.min(0.2 + level * 0.24, 0.92), color: VIOLET },
      ...Object.fromEntries(
        METHODS.map((method, index) => {
          const on = index < level;
          const point = SATELLITES[index]!;
          return [
            method.id,
            on
              ? { x: point.x, y: point.y, z: 30 + index * 8, width: 76, depth: 76, height: 12, fill: 1, color: VIOLET, arc: 24 }
              : { x: -28, y: -28, z: 12, width: 30, depth: 30, height: 5, ghost: 0.88, opacity: 0.32 },
          ];
        }),
      ),
    },
  };
}

const LEVELS: readonly Level[] = [0, 1, 2, 3];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(LEVELS.map((level) => [`${level}`, layoutFor(level)]));
const LINKS: SceneProps["links"] = METHODS.map((method, index) => ({ from: "wallet", to: method.id, flow: true, layouts: LEVELS.filter((level) => level > index).map(String) }));
const BEATS: readonly ({ level: Level; ms: number })[] = [
  { level: 0, ms: 1300 },
  { level: 1, ms: 1000 },
  { level: 2, ms: 1000 },
  { level: 3, ms: 2800 },
];

export function WalletSecurityMap({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, (step) => ({ level: BEATS[step]!.level }), playing);
  const { state, take } = scene;

  useEffect(() => {
    if (scene.live || state.level === 3) return;
    const timer = setTimeout(() => take({ level: (state.level + 1) as Level }), BEATS[state.level]!.ms);
    return () => clearTimeout(timer);
  }, [scene.live, state.level, take]);

  return (
    <section ref={scene.ref} className="night-stage wsm not-prose" aria-label="Wallet security map">
      <Remold.Scene className="night-scene" label="A wallet becoming protected by recovery methods" objects={OBJECTS} links={LINKS} layouts={LAYOUTS} layout={String(state.level)} palette={NIGHT} interact={{ drag: false }} spring={{ duration: 0.85, bounce: 0.2 }} />
      <div className="night-chip wsm-chip" role="status">
        <span className="size-7 shrink-0 rotate-[calc(var(--strength)*1turn)] rounded-full border-[3px] border-[rgb(124_92_255_/_0.2)] border-t-[#a895ff]" style={{ "--strength": `${state.level / 3}` } as CSSProperties} />
        <span><small className="block text-[10.5px] text-[#9792ad]">Wallet security</small><b className="text-[12.5px] text-[#f3f1ff]">{state.level === 3 ? "Recovery ready" : `${state.level} of 3 methods active`}</b></span>
      </div>
      <div className="night-foot">
        <div className="flex gap-1" aria-label="Recovery methods">
          {METHODS.map((method, index) => <button key={method.id} type="button" className="h-7 rounded-[7px] px-[7px] text-[11px] text-[#8f8ca3] data-[active]:bg-[rgb(124_92_255_/_0.16)] data-[active]:text-[#e6e0ff]" data-active={index < state.level || undefined} onClick={() => take({ level: (index + 1) as Level })}>{method.label}</button>)}
        </div>
        <button type="button" className="night-cta" onClick={() => take({ level: 0 })}>Review</button>
      </div>
    </section>
  );
}
