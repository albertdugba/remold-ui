import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from "react";
import type { Palette, PaletteName, SceneLayout, SceneLink, SceneObject, ScenePort } from "@remold-ui/canvas";
import type { SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldStoryAnnotation {
  /** The object the annotation follows. */
  object: string;
  /** Which semantic port to use. Defaults to `top`. */
  port?: ScenePort;
  /** Which side of the port the annotation opens toward. Defaults to `above`. */
  placement?: "above" | "below" | "left" | "right";
}

export interface RemoldStoryChapter {
  /** Stable id used by the controlled `chapter` prop and `actionsRef.go()`. */
  id: string;
  /** The Scene layout this chapter reveals. */
  layout: string;
  /** The object to lift and place in the screen-reader description. */
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

/** Controls that aren't state: use them from event handlers or effects. */
export interface RemoldStoryActions {
  readonly chapter: string;
  /** Move to a chapter. Throws for an unknown id. */
  go(id: string): void;
  /** Find any object's semantic port for a custom DOM overlay. */
  anchor(id: string, port?: ScenePort): { x: number; y: number } | null;
  redraw(): void;
}

export interface RemoldStoryProps
  extends BaseProps<RemoldStoryState, HTMLDivElement>,
    Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  chapters: readonly RemoldStoryChapter[];
  /** Current chapter id (controlled). */
  chapter?: string;
  /** First chapter id when `chapter` isn't controlled. Defaults to the first chapter. */
  defaultChapter?: string;
  /** Reports requested chapter changes from controls or `actionsRef.go()`. */
  onChapterChange?: (chapter: string) => void;
  actionsRef?: RefObject<RemoldStoryActions | null>;
  /** Render custom annotation markup. The default uses a chapter's title and description. */
  renderAnnotation?: (state: RemoldStoryState) => ReactNode;
  annotationClassName?: string;
  annotationStyle?: CSSProperties;
  /** Class name for the canvas inside the story. */
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
