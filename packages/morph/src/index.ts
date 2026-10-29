/**
 * Geometry only. Bring your own clock: Motion, GSAP, WAAPI or a renderer.
 *
 * ```ts
 * const shape = createMorph(menu, close);
 * path.setAttribute("d", shape.d(progress));
 * ```
 */
export {
  createMorph,
  matchShapes,
  type MatchOptions,
  type Morph,
  type MorphOptions,
  type PathCommand,
  type SubpathLayout,
} from "@remold-ui/core";
