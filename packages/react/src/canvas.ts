/**
 * Opt-in React bindings for canvas-powered Remold primitives.
 *
 * Import from `@remold-ui/react/canvas` when a product needs a Scene, Canvas,
 * Particles, Globe, or DotGrid. Keeping these APIs on their own entry point
 * lets an interface-only React bundle avoid canvas rendering code.
 */
export * as Remold from "./canvas.parts.js";
export { useAutoplay } from "./use-autoplay/use-autoplay.js";
export type { Autoplay, AutoplayOptions } from "./use-autoplay/types.js";
export { useDust, type UseDust } from "./use-dust/use-dust.js";
export type { Dust, DustOptions } from "@remold-ui/canvas";
export type { BaseProps, RenderProp } from "./utils/use-render-element.js";
