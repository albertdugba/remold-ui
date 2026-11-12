import { createContext, useContext } from "react";
import type { TourContextValue } from "./types.js";

export interface TourInternalContextValue extends TourContextValue {
  /** Mark (or, with `null`, unmark) the element for a step. */
  register(name: string, element: Element | null): void;
}

export const TourContext = createContext<TourInternalContextValue | null>(null);

export function useTourContext(part: string): TourInternalContextValue {
  const context = useContext(TourContext);
  if (!context) throw new Error(`Remold.Tour: ${part} must be inside a <Remold.Tour.Root>`);
  return context;
}

/**
 * The tour around this component: the step showing, its target element and the actions that move
 * between steps. Call it inside a `Remold.Tour.Root`.
 *
 * @example
 * ```tsx
 * const tour = useTour();
 * <Popover.Root open={tour.open} onOpenChange={(open) => !open && tour.close()}>
 *   <Popover.Portal>
 *     <Popover.Positioner anchor={tour.target}>…</Popover.Positioner>
 *   </Popover.Portal>
 * </Popover.Root>
 * ```
 */
export function useTour(): TourContextValue {
  const { register: _, ...tour } = useTourContext("useTour()");
  return tour;
}
