import { forwardRef, useCallback, useImperativeHandle, useRef, type ForwardedRef } from "react";
import { prefersReducedMotion } from "@remold-ui/dom";
import { RemoldScene } from "../scene/remold-scene.js";
import { useControlled, useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldStoryActions, RemoldStoryAnnotation, RemoldStoryChapter, RemoldStoryProps, RemoldStoryState } from "./types.js";

/**
 * A Scene told in chapters. Each chapter picks a layout, an object to focus and an annotation
 * that follows that object around the canvas.
 *
 * @example
 * ```tsx
 * <Remold.Story
 *   objects={objects}
 *   layouts={layouts}
 *   chapters={[
 *     { id: "overview", layout: "simple", title: "The whole system" },
 *     { id: "api", layout: "scaled", focused: "api", annotation: { object: "api" } },
 *   ]}
 * />
 * ```
 */
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

  const select = useCallback((id: string) => {
    if (!chapters.some((item) => item.id === id)) throw new RangeError(`Remold.Story: unknown chapter "${id}"`);
    if (id === chapterId) return;
    setChapterId(id);
    onChange.current?.(id);
  }, [chapterId, chapters, onChange, setChapterId]);

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
    [chapterId, select],
  );

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

  return useRenderElement(
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
  export type Annotation = RemoldStoryAnnotation;
  export type Chapter = RemoldStoryChapter;
  export type State = RemoldStoryState;
  export type Actions = RemoldStoryActions;
  export type Props = RemoldStoryProps;
}
