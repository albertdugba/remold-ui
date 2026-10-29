/**
 * The studio's scene document: one illustration as plain data. The studio edits it, the preview
 * plays it, and export turns it into code, so all three always agree.
 *
 * Steps inherit: the first step places everything, and each later step stores only what changed.
 * Position, size, fill and the like carry forward; how a move happens (its arc and delay) belongs
 * to the one step it's set on.
 */
import { extrude, type ExtrudeOptions, type LayoutBox } from "@remold-ui/canvas";
import type { Remold } from "@remold-ui/react";
import { BLOOM, CLAY, LEAF, MINT, ORANGE, PAPER, SKY, STREET, SUN } from "../demos/day-stage";
import { NIGHT } from "../demos/night-stage";

type SceneProps = Remold.Scene.Props;

export const DOCUMENT_VERSION = 1;

/** The colour sets an object can wear, by name, so documents stay plain data. */
export const PALETTES = {
  paper: PAPER,
  street: STREET,
  sky: SKY,
  clay: CLAY,
  orange: ORANGE,
  sun: SUN,
  leaf: LEAF,
  mint: MINT,
  bloom: BLOOM,
  night: NIGHT,
} as const;
export type PaletteName = keyof typeof PALETTES;

export type Stage = "day" | "night";

export interface StudioObject {
  id: string;
  /** What the studio calls it, and what screen readers hear. */
  name: string;
  palette: PaletteName;
  /** The look, as the options `extrude()` takes. */
  look: ExtrudeOptions;
  /** Scenery can't be picked or focused. */
  scenery?: boolean;
}

/** What an object can change from one step to the next. */
export type Pose = Partial<Omit<LayoutBox, "delay" | "arc" | "fadeDelay">>;
/** How it moves into a step. These don't carry forward. */
export type Motion = Pick<LayoutBox, "delay" | "arc" | "fadeDelay">;

export interface StudioStep {
  id: string;
  name: string;
  /** How long the step holds before the next, in milliseconds. */
  ms: number;
  /** Changes from the step before, per object. The first step must place every object. */
  pose: Record<string, Pose>;
  motion?: Record<string, Motion>;
  /** The card over the scene during this step. */
  overlay?: { mark: string; title: string; detail: string; tint?: string };
}

export interface StudioLink {
  from: string;
  to: string;
  dashed?: boolean;
  flow?: boolean;
  route?: "straight" | "orthogonal" | "curve";
  /** Steps it shows in. All, if left out. */
  steps?: string[];
}

export interface SceneDocument {
  version: typeof DOCUMENT_VERSION;
  title: string;
  stage: Stage;
  camera: { zoom: number; centerX: number; centerY: number };
  /** The scene's springs: calm, or snappy and bouncy. */
  feel: { duration: number; bounce: number };
  objects: StudioObject[];
  steps: StudioStep[];
  links: StudioLink[];
  /** The line along the bottom of the stage. */
  footer?: string;
}

/** Every object's full pose at a step: the first step, with each later step's changes laid over it. */
export function resolvePoses(doc: SceneDocument, stepIndex: number): Record<string, Pose> {
  const poses: Record<string, Pose> = {};
  for (const step of doc.steps.slice(0, stepIndex + 1))
    for (const [id, change] of Object.entries(step.pose)) poses[id] = { ...poses[id], ...change };
  return poses;
}

/** A full layout box for an object, filling anything the pose leaves out. */
const box = (pose: Pose | undefined): LayoutBox => ({ x: 0, y: 0, width: 40, depth: 40, ...pose });

/** Every step's layout, as plain data: what the preview plays and export writes out. Named by step id. */
export function resolveLayouts(doc: SceneDocument): SceneProps["layouts"] {
  return Object.fromEntries(
    doc.steps.map((step, i) => {
      const poses = resolvePoses(doc, i);
      return [
        step.id,
        {
          camera: doc.camera,
          caption: step.overlay ? `${step.overlay.title}. ${step.overlay.detail}` : step.name,
          objects: Object.fromEntries(doc.objects.map((o) => [o.id, { ...box(poses[o.id]), ...step.motion?.[o.id] }])),
        },
      ];
    }),
  );
}

/** An object's look options as the scene draws them: scenery is passive, and labels stay off unless set. */
export const lookOptions = (o: StudioObject): ExtrudeOptions => ({ ...o.look, passive: o.scenery || o.look.passive, decal: { text: "", ...o.look.decal } });

export const linksOf = (doc: SceneDocument): NonNullable<SceneProps["links"]> =>
  doc.links.map(({ steps, ...l }) => (steps ? { ...l, layouts: steps } : l));

/** The props `Remold.Scene` takes, for the whole document. */
export function toSceneProps(doc: SceneDocument): Pick<SceneProps, "objects" | "layouts" | "links" | "palette" | "spring"> {
  const objects: SceneProps["objects"] = Object.fromEntries(
    doc.objects.map((o) => [o.id, { look: extrude(lookOptions(o)), label: o.name, palette: PALETTES[o.palette], interactive: !o.scenery }]),
  );
  return { objects, layouts: resolveLayouts(doc), links: linksOf(doc), palette: doc.stage === "night" ? NIGHT : PAPER, spring: doc.feel };
}

/** A key that changes only when the scene itself does, so editing overlay text doesn't rebuild it. */
export function sceneKey(doc: SceneDocument): string {
  const { title: _, footer: __, steps, ...rest } = doc;
  return JSON.stringify({ ...rest, steps: steps.map(({ overlay: ___, name: ____, ...s }) => s) });
}

/** A short id that isn't used yet in `taken`. */
export function freshId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let n = 1; ; n++) if (!used.has(`${prefix}${n}`)) return `${prefix}${n}`;
}

/** Checks a pasted or stored document enough to open it safely; returns a reason if it can't be. */
export function validateDocument(value: unknown): { doc: SceneDocument } | { error: string } {
  if (!value || typeof value !== "object") return { error: "That isn't a scene document." };
  const doc = value as Partial<SceneDocument>;
  if (doc.version !== DOCUMENT_VERSION) return { error: `This document is version ${String(doc.version)}; the studio opens version ${DOCUMENT_VERSION}.` };
  if (!Array.isArray(doc.objects) || !Array.isArray(doc.steps) || doc.steps.length === 0) return { error: "The document needs objects and at least one step." };
  const ids = new Set(doc.objects.map((o) => o.id));
  for (const o of doc.objects) if (!(o.palette in PALETTES)) return { error: `"${o.name}" uses an unknown palette, "${o.palette}".` };
  for (const id of ids) if (!doc.steps[0]!.pose[id]) return { error: `The first step doesn't place "${id}".` };
  return { doc: doc as SceneDocument };
}
