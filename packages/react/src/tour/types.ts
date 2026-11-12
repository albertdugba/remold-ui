import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, RefObject } from "react";
import type { BaseProps } from "../utils/use-render-element.js";

/** Why the step changed. */
export type TourChangeReason =
  | "start"
  | "next"
  | "previous"
  | "go-to"
  | "close"
  | "finish"
  | "arrow-key"
  | "escape-key";

export interface TourChangeDetails {
  reason: TourChangeReason;
  /** The event that caused it, when there was one. */
  event?: Event;
}

/** Controls that aren't state: use them from event handlers or effects. */
export interface TourActions {
  /** The step showing, or `null` while the tour is closed. */
  readonly step: string | null;
  /** Open the tour at a step, or at the first one. */
  start(step?: string): void;
  next(): void;
  previous(): void;
  /** Move to a step. Throws for a step that isn't in `steps`. */
  goTo(step: string): void;
  close(): void;
}

/** Everything about the tour, from `useTour()` inside a `Tour.Root`. */
export interface TourContextValue extends Omit<TourActions, "step"> {
  step: string | null;
  steps: readonly string[];
  /** The step's position in `steps`, or `-1` while the tour is closed. */
  index: number;
  count: number;
  open: boolean;
  first: boolean;
  last: boolean;
  /** The element marked for this step, to anchor a popover to. */
  target: Element | null;
}

export interface TourRootProps {
  /** The steps, in order. */
  steps: readonly string[];
  /** The step showing, or `null` while closed (controlled). */
  step?: string | null;
  /** The step to open at, or `null` to start closed. */
  defaultStep?: string | null;
  onStepChange?: (step: string | null, details: TourChangeDetails) => void;
  /** Arrow keys move between steps and Escape closes, while the tour is open. */
  keyboard?: boolean;
  /** Scroll a step's target into view when it's off screen. */
  scrollIntoView?: boolean;
  actionsRef?: RefObject<TourActions | null>;
  children?: ReactNode;
}

export interface TourTargetState {
  /** This target's step is showing. */
  active: boolean;
}

export interface TourTargetProps
  extends BaseProps<TourTargetState>,
    Omit<HTMLAttributes<HTMLElement>, "className"> {
  /** The step this element belongs to. */
  name: string;
}

export interface TourSpotlightState {
  open: boolean;
  step: string | null;
  /** The step has no target, so the spotlight closes to a point in the middle. */
  centered: boolean;
}

export interface TourSpotlightProps
  extends BaseProps<TourSpotlightState, HTMLDivElement>,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  /** Room around the target, in pixels. */
  padding?: number;
}

export interface TourButtonState {
  /** The button does nothing at this step: Previous on the first step. */
  disabled: boolean;
  /** The last step is showing. */
  last: boolean;
}

export interface TourButtonProps
  extends BaseProps<TourButtonState, HTMLButtonElement>,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {}
