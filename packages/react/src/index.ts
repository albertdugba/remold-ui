// @remold-ui/react: React bindings. The real work lives in @remold-ui/dom, canvas and core.
//
//   <Remold.Layout trigger={view}>…</Remold.Layout>
//   <Remold.Text>{status}</Remold.Text>
//   <Remold.Scene objects={…} layouts={…} layout={view} />
//   <Remold.Story chapters={…} objects={…} layouts={…} />
//   <Remold.Icon d={icons[status]} />
//   <Remold.Ignore>…</Remold.Ignore>
//   <Remold.Connectors>…<Remold.Anchor name="b" linkTo="a" />…</Remold.Connectors>
//   const autoplay = useAutoplay(views.length, { every: 2000 });
//   const drag = useDragToDismiss({ onDismiss: close });
//   const { ref, animate } = useRemold();
export * as Remold from "./index.parts.js";
export { useRemold } from "./use-remold/useRemold.js";
export { useViewTransition } from "./use-view-transition/useViewTransition.js";
export { useAutoplay, type Autoplay, type AutoplayOptions } from "./use-autoplay/useAutoplay.js";
export { useDragToDismiss, type UseDragToDismiss, type UseDragToDismissOptions } from "./use-drag-to-dismiss/useDragToDismiss.js";
export type { BaseProps, RenderProp } from "./utils/useRenderElement.js";
export type { ParticleShape } from "./particles/RemoldParticles.js";
export type { Transition, TransitionOptions, TransitionResult } from "@remold-ui/dom";
export { springs, type SpringConfig } from "@remold-ui/core";
