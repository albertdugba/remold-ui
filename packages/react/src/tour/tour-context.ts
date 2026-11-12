import { createContext, useContext } from "react";
import type { TourContextValue } from "./types.js";

export interface TourInternalContextValue extends TourContextValue {
  register(name: string, element: Element | null): void;
}

export const TourContext = createContext<TourInternalContextValue | null>(null);

export function useTourContext(part: string): TourInternalContextValue {
  const context = useContext(TourContext);
  if (!context) throw new Error(`Remold.Tour: ${part} must be inside a <Remold.Tour.Root>`);
  return context;
}

/** The tour around this component: the step showing, its target element and the actions that move between steps. */
export function useTour(): TourContextValue {
  const { register: _, ...tour } = useTourContext("useTour()");
  return tour;
}
