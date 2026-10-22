/**
 * `<Remold.Story>` turns a canvas scene into a guided explanation. A chapter selects a
 * layout and subject, while an optional annotation stays pinned to a semantic object port as
 * the scene settles. It deliberately owns no controls or visual theme: products can supply
 * their own stepper, narration, and annotation markup.
 */
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { prefersReducedMotion, type FrameLoop, type ReducedMotion } from "@remold-ui/dom";
import { type SpringConfig } from "@remold-ui/core";
import { type Palette, type PaletteName, type SceneLayout, type SceneLink, type SceneObject, type ScenePort } from "@remold-ui/canvas";
import { RemoldScene } from "../scene/RemoldScene.js";
import { useControlled, useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

export const RemoldStory = forwardRef(function RemoldStory(
  componentProps: RemoldStory.Props,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    chapters,
    chapter: chapterProp,
    defaultChapter,
    onChapterChange,
    actionsRef,
    renderAnnotation,
    annotationClassName,
    annotationStyle,
    canvasClassName,
    objects,
    layouts,
    links,
    palette,
    interact,
    spring,
    reducedMotion,
    loop,
    maxPixelRatio,
    label,
    render,
    className,
    ...elementProps
  } = componentProps;

  if (chapters.length === 0) throw new RangeError("Remold.Story: at least one chapter is required");
  const initial = defaultChapter ?? chapters[0]!.id;
  const [chapterId, setChapterId] = useControlled(chapterProp, initial);
  const index = chapters.findIndex((item) => item.id === chapterId);
  if (index < 0) throw new RangeError(`Remold.Story: unknown chapter "${chapterId}"`);
  const chapter = chapters[index]!;
  const sceneActions = useRef<RemoldScene.Actions | null>(null);
  const annotation = useRef<HTMLDivElement | null>(null);
  const onChange = useLatest(onChapterChange);

  const select = (id: string) => {
    if (!chapters.some((item) => item.id === id)) throw new RangeError(`Remold.Story: unknown chapter "${id}"`);
    if (id === chapterId) return;
    setChapterId(id);
    onChange.current?.(id);
  };

  useImperativeHandle(
    actionsRef,
    () => ({
      get chapter() {
        return chapterId;
      },
      go: select,
      anchor: (id, port) => sceneActions.current?.anchor(id, port) ?? null,
      redraw: () => sceneActions.current?.redraw(),
    }),
    [chapterId],
  );

  // Update the DOM annotation directly through the same short period that Scene is springing.
  // This avoids a React render on every animation frame and goes completely still afterwards.
  useIsoLayoutEffect(() => {
    if (!chapter.annotation) return;
    let frame = 0;
    const start = performance.now();
    const place = () => {
      const point = sceneActions.current?.anchor(chapter.annotation!.object, chapter.annotation!.port);
      if (point && annotation.current) {
        annotation.current.style.left = `${point.x}px`;
        annotation.current.style.top = `${point.y}px`;
      }
      const reduced = reducedMotion === "always" || (reducedMotion !== "never" && prefersReducedMotion());
      if (!reduced && performance.now() - start < 1200) frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [chapter, reducedMotion]);

  const annotationContent = chapter.annotation
    ? renderAnnotation?.({ chapter, index, count: chapters.length }) ?? <DefaultAnnotation chapter={chapter} index={index} />
    : null;
  const placement = chapter.annotation?.placement ?? "above";
  const translate =
    placement === "below"
      ? "translate(-50%, 14px)"
      : placement === "left"
      ? "translate(calc(-100% - 14px), -50%)"
      : placement === "right"
      ? "translate(14px, -50%)"
      : "translate(-50%, calc(-100% - 14px))";
  const state: RemoldStory.State = { chapter, index, count: chapters.length };

  return useRenderElement<RemoldStory.State, HTMLDivElement>(
    "div",
    { render, className },
    {
      state,
      refs: [forwardedRef],
      props: {
        ...elementProps,
        children: (
          <>
            <RemoldScene
              className={canvasClassName}
              label={label}
              objects={objects}
              layouts={layouts}
              links={links}
              palette={palette}
              interact={interact}
              spring={spring}
              reducedMotion={reducedMotion}
              loop={loop}
              maxPixelRatio={maxPixelRatio}
              layout={chapter.layout}
              focused={chapter.focused ?? null}
              actionsRef={sceneActions}
            />
            {chapter.annotation && annotationContent && (
              <div
                ref={annotation}
                className={annotationClassName}
                aria-live="polite"
                style={{
                  position: "absolute",
                  zIndex: 1,
                  left: 0,
                  top: 0,
                  pointerEvents: "none",
                  transform: translate,
                  ...annotationStyle,
                }}
                data-rm-story-annotation=""
              >
                {annotationContent}
              </div>
            )}
          </>
        ),
      },
      dataAttributes: { "data-rm-chapter": chapter.id },
    },
  );
});

function DefaultAnnotation({ chapter, index }: { chapter: RemoldStory.Chapter; index: number }) {
  if (!chapter.title && !chapter.description) return null;
  return (
    <>
      <span>Chapter {index + 1}</span>
      {chapter.title && <strong>{chapter.title}</strong>}
      {chapter.description && <p>{chapter.description}</p>}
    </>
  );
}

export namespace RemoldStory {
  export interface Annotation {
    /** The object the annotation follows. */
    object: string;
    /** Which semantic port to use. Defaults to `top`. */
    port?: ScenePort;
    /** Which side of the port the annotation opens toward. Defaults to `above`. */
    placement?: "above" | "below" | "left" | "right";
  }

  export interface Chapter {
    /** Stable id used by the controlled `chapter` prop and `actionsRef.go()`. */
    id: string;
    /** The Scene layout this chapter reveals. */
    layout: string;
    /** The object to lift and place in the screen-reader description. */
    focused?: string | null;
    title?: ReactNode;
    description?: ReactNode;
    annotation?: Annotation;
  }

  export interface State {
    chapter: Chapter;
    index: number;
    count: number;
  }

  export interface Actions {
    readonly chapter: string;
    /** Move to a chapter. Throws for an unknown id. */
    go(id: string): void;
    /** Find any object's semantic port for a custom DOM overlay. */
    anchor(id: string, port?: ScenePort): { x: number; y: number } | null;
    redraw(): void;
  }

  export interface Props extends BaseProps<State, HTMLDivElement>, Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
    chapters: readonly Chapter[];
    /** Current chapter id (controlled). */
    chapter?: string;
    /** First chapter id when `chapter` isn't controlled. Defaults to the first chapter. */
    defaultChapter?: string;
    /** Reports requested chapter changes from controls or `actionsRef.go()`. */
    onChapterChange?: (chapter: string) => void;
    actionsRef?: RefObject<Actions | null>;
    /** Render custom annotation markup. The default uses a chapter's title and description. */
    renderAnnotation?: (state: State) => ReactNode;
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
}
