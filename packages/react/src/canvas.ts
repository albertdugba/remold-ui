/**
 * React bindings for Remold with the canvas-powered primitives: everything in `@remold-ui/react`,
 * plus Scene, Story, Particles, Canvas, Globe, DotGrid and `useDust`. Import from here when a screen
 * needs canvas; the main entry stays free of canvas code.
 */
export * from "./index.js";
export * as Remold from "./canvas.parts.js";
export { useDust, type UseDust } from "./use-dust/use-dust.js";
export type { Dust, DustOptions } from "@remold-ui/canvas";
export type { ParticleShape } from "./particles/types.js";
export type { GlobeArcEvent, GlobePulse } from "./globe/types.js";
