import { forwardRef, useImperativeHandle, useRef, useState, type ForwardedRef } from "react";
import { scene as createScene, type Scene, type SceneOptions } from "@remold-ui/canvas";
import { useControlled, useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldSceneActions, RemoldSceneProps, RemoldSceneState } from "./types.js";

/**
 * A canvas scene of objects that springs between named layouts. Changing `layout` moves every
 * object, link and the camera.
 *
 * @example
 * ```tsx
 * <Remold.Scene label="Our architecture" objects={objects} layouts={layouts} layout={layout} />
 * ```
 */
export const RemoldScene = forwardRef(function RemoldScene(
  componentProps: RemoldScene.Props,
  forwardedRef: ForwardedRef<HTMLCanvasElement>,
) {
  const {
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
    layout: layoutProp,
    defaultLayout,
    focused: focusedProp,
    defaultFocused = null,
    onFocusedChange,
    onDraw,
    actionsRef,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [layout] = useControlled(layoutProp, defaultLayout ?? Object.keys(layouts)[0] ?? "");
  const [focused, setFocused] = useControlled<string | null>(focusedProp, defaultFocused);
  const [element, setElement] = useState<HTMLCanvasElement | null>(null);
  const [instance, setInstance] = useState<Scene | null>(null);
  const live = useRef<Scene | null>(null);
  const lastPoints = useRef<Parameters<Scene["points"]> | null>(null);
  const onFocused = useLatest(onFocusedChange);
  const onDrawn = useLatest(onDraw);
  const setFocusedLatest = useLatest(setFocused);
  const controlledFocus = useLatest(focusedProp);
  const mountOptions = useLatest<SceneOptions>({
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
    initial: layout,
  });

  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = createScene(element, {
      ...mountOptions.current,
      onDraw: () => onDrawn.current?.(),
      onFocusChange: (id) => {
        setFocusedLatest.current(id);
        onFocused.current?.(id);
        const controlled = controlledFocus.current;
        if (controlled !== undefined && controlled !== id) created.focus(controlled);
      },
    });

    live.current = created;
    if (lastPoints.current) created.points(...lastPoints.current);
    setInstance(created);

    return () => {
      created.destroy();
      live.current = null;
      setInstance(null);
    };
  }, [element]);

  useIsoLayoutEffect(() => {
    if (instance && instance.layout !== layout) instance.to(layout);
  }, [instance, layout]);
  useIsoLayoutEffect(() => {
    if (instance && instance.focused !== focused) instance.focus(focused);
  }, [instance, focused]);

  useImperativeHandle(
    actionsRef,
    () => ({
      points: (points, options) => {
        lastPoints.current = [points, options];
        live.current?.points(points, options);
      },
      pick: (x, y) => live.current?.pick(x, y) ?? null,
      anchor: (id, port) => live.current?.anchor(id, port) ?? null,
      box: (id) => live.current?.box(id) ?? null,
      redraw: () => live.current?.render(),
    }),
    [],
  );

  const state: RemoldScene.State = { layout, focused };
  return useRenderElement(
    "canvas",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: { ...elementProps, "aria-label": label },
      dataAttributes: { "data-rm-layout": layout, "data-rm-focused": focused ?? undefined },
    },
  );
});

export namespace RemoldScene {
  export type State = RemoldSceneState;
  export type Actions = RemoldSceneActions;
  export type Props = RemoldSceneProps;
}
