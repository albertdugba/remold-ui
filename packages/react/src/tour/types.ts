import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, RefObject } from "react";
import type { BaseProps } from "../utils/use-render-element.js";

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
  event?: Event;
}

export interface TourActions {
  readonly step: string | null;
  start(step?: string): void;
  next(): void;
  previous(): void;
  goTo(step: string): void;
  close(): void;
}

export interface TourContextValue extends Omit<TourActions, "step"> {
  step: string | null;
  steps: readonly string[];
  index: number;
  count: number;
  open: boolean;
  first: boolean;
  last: boolean;
  target: Element | null;
}

export interface TourRootProps {
  steps: readonly string[];
  step?: string | null;
  defaultStep?: string | null;
  onStepChange?: (step: string | null, details: TourChangeDetails) => void;
  keyboard?: boolean;
  scrollIntoView?: boolean;
  actionsRef?: RefObject<TourActions | null>;
  children?: ReactNode;
}

export interface TourTargetState {
  active: boolean;
}

export interface TourTargetProps
  extends BaseProps<TourTargetState>,
    Omit<HTMLAttributes<HTMLElement>, "className"> {
  name: string;
}

export interface TourSpotlightState {
  open: boolean;
  step: string | null;
  centered: boolean;
}

export interface TourSpotlightProps
  extends BaseProps<TourSpotlightState, HTMLDivElement>,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  padding?: number;
}

export interface TourButtonState {
  disabled: boolean;
  last: boolean;
}

export interface TourButtonProps
  extends BaseProps<TourButtonState, HTMLButtonElement>,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {}
