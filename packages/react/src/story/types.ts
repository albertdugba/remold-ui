import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from "react";
import type { Palette, PaletteName, SceneLayout, SceneLink, SceneObject, ScenePort } from "@remold-ui/canvas";
import type { SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldStoryAnnotation {
  object: string;
  port?: ScenePort;
  placement?: "above" | "below" | "left" | "right";
}

export interface RemoldStoryChapter {
  id: string;
  layout: string;
  focused?: string | null;
  title?: ReactNode;
  description?: ReactNode;
  annotation?: RemoldStoryAnnotation;
}

export interface RemoldStoryState {
  chapter: RemoldStoryChapter;
  index: number;
  count: number;
}

export interface RemoldStoryActions {
  readonly chapter: string;
  go(id: string): void;
  anchor(id: string, port?: ScenePort): { x: number; y: number } | null;
  redraw(): void;
}

export interface RemoldStoryProps
  extends BaseProps<RemoldStoryState, HTMLDivElement>,
    Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  chapters: readonly RemoldStoryChapter[];
  chapter?: string;
  defaultChapter?: string;
  onChapterChange?: (chapter: string) => void;
  actionsRef?: RefObject<RemoldStoryActions | null>;
  renderAnnotation?: (state: RemoldStoryState) => ReactNode;
  annotationClassName?: string;
  annotationStyle?: CSSProperties;
  canvasClassName?: string;
  objects: Record<string, SceneObject>;
  layouts: Record<string, SceneLayout>;
  links?: SceneLink[];
  palette?: PaletteName | Palette;
  interact?: { hover?: boolean; tap?: boolean; drag?: boolean; keyboard?: boolean };
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
  label?: string;
}
