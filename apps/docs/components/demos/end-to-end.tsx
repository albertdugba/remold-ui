"use client";
/**
 * End-to-end encryption, drawn on the night stage: a message sits on Ama's laptop in plain text.
 * It's sealed (the note reshapes into a shield and its words turn to cipher), crosses the server
 * hovering out of reach, lands on Kofi's phone still sealed, and only there opens back into the
 * words. The chip above says what each side can read.
 *
 * Built with `Remold.Scene`: the note's outline morphs from a card to a shield and back, its label
 * changes with the layout, and it travels on arcs; the wires carry dots while it's in flight. It
 * plays while on screen; Send runs it again. The people and message are made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { BROWSER_GLYPH, CHAT_GLYPH, SERVER_GLYPH } from "./demo-glyphs";
import { NIGHT, PLATFORM_INK, VIOLET, WIRE_INK } from "./night-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
type Beat = "write" | "sealed" | "transit" | "arrived" | "opened";

/** Both in the same 100 × 100 box, so the morph changes the outline, not its size. */
const NOTE = "M18 6H82Q96 6 96 20V80Q96 94 82 94H18Q4 94 4 80V20Q4 6 18 6Z";
const SHIELD = "M50 0L94 16V48C94 74 76 92 50 100C24 92 6 74 6 48V16Z";

const PLAIN = "Hi Kofi";
const CIPHER = "a7f3·9c2e";

const OBJECTS: SceneProps["objects"] = {
  laptop: {
    look: extrude({ radius: 0.12, edge: true, ink: PLATFORM_INK, shadow: false, decal: { icon: BROWSER_GLYPH, text: "", size: 30, at: [0, 0.3], color: "#cfc9ee" } }),
    label: "Ama’s laptop",
  },
  server: {
    look: extrude({ radius: 0.14, ink: WIRE_INK, shadow: false, decal: { icon: SERVER_GLYPH, text: "", size: 30, color: "#8f8ca3" } }),
    label: "Server",
  },
  phone: {
    look: extrude({ radius: 0.2, edge: true, ink: PLATFORM_INK, shadow: false, decal: { icon: CHAT_GLYPH, text: "", size: 26, at: [0, 0.3], color: "#cfc9ee" } }),
    label: "Kofi’s phone",
  },
  note: {
    look: extrude({ shape: { path: NOTE }, sides: "sheen", edge: true, fillColor: VIOLET, decal: { size: 13 } }),
    label: PLAIN,
  },
};

const LAPTOP = { x: -330, y: -80, z: 0, width: 150, depth: 120, height: 12 };
const SERVER = { x: -60, y: -60, z: 0, width: 110, depth: 110, height: 44 };
const PHONE = { x: 190, y: -70, z: 0, width: 90, depth: 140, height: 12 };

/** The note resting on a device: centred on it, just above its top. */
const on = (d: typeof LAPTOP) => ({ x: d.x + d.width / 2 - 45, y: d.y + d.depth / 2 - 35, z: d.height });

function layoutFor(beat: Beat): SceneProps["layouts"][string] {
  const sealed = beat !== "write" && beat !== "opened";
  const where =
    beat === "write" || beat === "sealed"
      ? on(LAPTOP)
      : beat === "transit"
        ? { x: SERVER.x + 10, y: SERVER.y + 20, z: SERVER.height + 48 }
        : on(PHONE);
  return {
    camera: { zoom: 1.25, centerX: -30, centerY: 10 },
    caption: {
      write: "A message on Ama's laptop, in plain text.",
      sealed: "Sealed with Kofi's key before it leaves.",
      transit: "Crossing the server, which can't read it.",
      arrived: "On Kofi's phone, still sealed.",
      opened: "Opened on Kofi's phone: only he can read it.",
    }[beat],
    objects: {
      laptop: LAPTOP,
      server: { ...SERVER, ghost: beat === "transit" ? 0.35 : 0.6 },
      phone: PHONE,
      note: {
        ...where,
        width: 90,
        depth: 70,
        height: 8,
        shape: sealed ? SHIELD : NOTE,
        label: sealed ? CIPHER : PLAIN,
        fill: sealed ? 1 : 0,
        color: VIOLET,
        arc: beat === "transit" || beat === "arrived" ? 70 : 0,
      },
    },
  };
}

const BEAT_NAMES: readonly Beat[] = ["write", "sealed", "transit", "arrived", "opened"];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(BEAT_NAMES.map((b) => [b, layoutFor(b)]));

const LINKS: SceneProps["links"] = [
  { from: "laptop", to: "server", dashed: true, layouts: ["write", "sealed", "arrived", "opened"] },
  { from: "server", to: "phone", dashed: true, layouts: ["write", "sealed", "arrived", "opened"] },
  { from: "laptop", to: "server", flow: true, layouts: ["transit"] },
  { from: "server", to: "phone", flow: true, layouts: ["transit"] },
];

interface State {
  beat: Beat;
}

const BEATS: readonly (State & { ms: number })[] = [
  { beat: "write", ms: 1300 },
  { beat: "sealed", ms: 1300 },
  { beat: "transit", ms: 1500 },
  { beat: "arrived", ms: 1200 },
  { beat: "opened", ms: 2600 },
];

const fromBeat = (step: number): State => ({ beat: BEATS[step]!.beat });

/** Who can read the message at each beat. */
const READS: Record<Beat, { who: string; sees: string; sealed: boolean }> = {
  write: { who: "Ama sees", sees: PLAIN, sealed: false },
  sealed: { who: "Sealed for", sees: "Kofi only", sealed: true },
  transit: { who: "Server sees", sees: `${CIPHER}…`, sealed: true },
  arrived: { who: "Kofi’s phone has", sees: `${CIPHER}…`, sealed: true },
  opened: { who: "Kofi sees", sees: PLAIN, sealed: false },
};

interface EndToEndProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function EndToEnd({ playing }: EndToEndProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;

  // Your own message goes the whole way on its own clock.
  useEffect(() => {
    if (scene.live) return;
    const i = BEAT_NAMES.indexOf(state.beat);
    if (i === BEAT_NAMES.length - 1) return;
    const t = setTimeout(() => take({ beat: BEAT_NAMES[i + 1]! }), BEATS[i]!.ms);
    return () => clearTimeout(t);
  }, [scene.live, state.beat, take]);

  const read = READS[state.beat];

  return (
    <section ref={scene.ref} className="night-stage not-prose" aria-label="End-to-end encryption">
      <Remold.Scene
        className="night-scene"
        label="A message encrypted on one device and opened on another"
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={state.beat}
        palette={NIGHT}
        interact={{ drag: false }}
        spring={{ duration: 0.85, bounce: 0.18 }}
      />

      <div className="night-chip" role="status">
        <span className="night-readout">{read.who}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b
            key={read.sees}
            className={`inline-block whitespace-nowrap font-mono text-[13px] font-semibold ${read.sealed ? "text-[#a48bff]" : ""}`}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
          >
            {read.sees}
          </motion.b>
        </AnimatePresence>
      </div>

      <div className="night-foot">
        <span className="night-readout">
          <b>AES-256</b> · keys never leave the device
        </span>
        <button type="button" className="night-cta" onClick={() => take({ beat: "write" })} disabled={!scene.live && state.beat !== "opened"}>
          Send
        </button>
      </div>
    </section>
  );
}
