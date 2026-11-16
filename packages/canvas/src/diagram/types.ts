import type { SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { Camera } from "../camera";
import type { Look, LookName, Palette, PaletteName } from "../object-looks";
import type { Scene, SceneLink } from "../scene";
import type { DiagramSkin } from "./skins";

export type NodeStatus = "ok" | "error" | "pending" | null;

export type LinkState = "active" | "error" | null;

export type LightState = "on" | "error" | null;

export interface DiagramNode {
  /** Default "plate". */
  look?: LookName | Look;
  /** Shown under the node, in screen pixels so it stays readable at any size. */
  label?: string;
  /** Where the node's centre sits, in floor units. */
  at: readonly [number, number];
  /** Footprint in floor units: one number for a square, or `[width, depth]`. Default 120. */
  size?: number | readonly [number, number];
  height?: number;
  /** Height above the floor, in floor units, for stacking nodes. */
  z?: number;
  /** Where the label sits: under the node, or off to its right on a short leader line, as in a stack. */
  labelSide?: "below" | "right";
  palette?: PaletteName | Palette;
  /** Start hidden; `show()` brings it in. */
  hidden?: boolean;
}

export type DiagramLink = readonly [from: string, to: string] | (Omit<SceneLink, "layouts"> & { from: string; to: string });

export interface DiagramColors {
  /** Status and link colours, as "r, g, b". */
  ok: string;
  error: string;
  pending: string;
  /** The packets' fill, as "r, g, b". */
  packet: string;
  /** Packet and badge text. */
  packetText: string;
  /** Node labels. */
  label: string;
  /** Behind node labels and countdowns, as "r, g, b". */
  surface: string;
}

export interface DiagramOptions {
  nodes: Record<string, DiagramNode>;
  links?: readonly DiagramLink[];
  /** "iso" (default), "flat" for a top-down drawing, or your own camera. */
  camera?: "iso" | "flat" | Partial<Camera>;
  palette?: PaletteName | Palette;
  colors?: Partial<DiagramColors>;
  /** Restyles everything, such as `skins.line()`; it wins over `palette`, node palettes and `colors`. */
  skin?: DiagramSkin;
  /** The canvas's accessible name. */
  label?: string;
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
}

export interface SendOptions {
  /** Text on the packet, such as an event name. */
  label?: string;
  /** Seconds the trip takes. Default 0.9. */
  duration?: number;
  /** Packet colour for this trip, as "r, g, b". */
  color?: string;
}

export interface CountdownOptions {
  /** The text for each second left. Default `(seconds) => \`${seconds}s\``. */
  format?: (seconds: number) => string;
}

export interface Diagram {
  /** The scene underneath, for layouts, focus and anything else it offers. */
  readonly scene: Scene;
  readonly paused: boolean;
  /** Send a packet along the link between two nodes; resolves when it arrives. */
  send(from: string, to: string, options?: SendOptions): Promise<void>;
  /** Send a packet that turns back halfway; resolves when it's home. */
  bounce(from: string, to: string, options?: SendOptions): Promise<void>;
  /** Mark a node as ok, failing or waiting, or clear it with null. */
  status(id: string, status: NodeStatus): void;
  /** Colour a link as carrying traffic or broken, or clear it with null. */
  link(from: string, to: string, state: LinkState): void;
  /** Count down above a node; resolves at zero. */
  countdown(id: string, seconds: number, options?: CountdownOptions): Promise<void>;
  relabel(id: string, label: string): void;
  show(id: string): void;
  hide(id: string): void;
  /** Spring a node to a new place, in floor units, on an arc that rises `arc` units at its highest if you like. */
  move(id: string, at: readonly [number, number], options?: { arc?: number }): void;
  /** Spring a node up or down to this height above the floor. */
  lift(id: string, z: number): void;
  /** Outline one node in the accent, or clear it with null. */
  highlight(id: string | null): void;
  /** Fill the tops of one or more nodes with the accent ("on") or the failure colour ("error"), or clear them with null. */
  light(ids: string | readonly string[], state: LightState): void;
  /** Resolves after this many seconds of diagram time, which stops while paused or scrolled out of view. */
  wait(seconds: number): Promise<void>;
  /** Back to how it started: cancels packets, waits and countdowns, whose promises reject with an AbortError. */
  reset(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
