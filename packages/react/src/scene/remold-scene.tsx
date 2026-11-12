import { forwardRef, useImperativeHandle, useRef, useState, type ForwardedRef, type MutableRefObject, type Ref } from "react";
import { scene as createScene, type Scene, type SceneOptions } from "@remold-ui/canvas";
import { useControlled, useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldSceneActions, RemoldSceneProps, RemoldSceneState } from "./types.js";

type PointsCall = Parameters<Scene["points"]>;

interface SceneCallbacks {
  onDraw: MutableRefObject<(() => void) | undefined>;
  onFocused: MutableRefObject<((id: string | null) => void) | undefined>;
  setFocused: MutableRefObject<(id: string | null) => void>;
  controlledFocus: MutableRefObject<string | null | undefined>;
}

function useSceneInstance(
  element: HTMLCanvasElement | null,
  mountOptions: MutableRefObject<SceneOptions>,
  callbacks: SceneCallbacks,
  lastPoints: MutableRefObject<PointsCall | null>,
) {
  const [instance, setInstance] = useState<Scene | null>(null);
  const live = useRef<Scene | null>(null);

  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = createScene(element, {
      ...mountOptions.current,
      onDraw: () => callbacks.onDraw.current?.(),
      onFocusChange: (id) => {
        callbacks.setFocused.current(id);
        callbacks.onFocused.current?.(id);

        const controlled = callbacks.controlledFocus.current;

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

  return { instance, live };
}

function useSceneSync(instance: Scene | null, layout: string, focused: string | null) {
  useIsoLayoutEffect(() => {
    if (instance && instance.layout !== layout) instance.to(layout);
  }, [instance, layout]);

  useIsoLayoutEffect(() => {
    if (instance && instance.focused !== focused) instance.focus(focused);
  }, [instance, focused]);
}

function useSceneActions(
  actionsRef: Ref<RemoldSceneActions> | undefined,
  live: MutableRefObject<Scene | null>,
  lastPoints: MutableRefObject<PointsCall | null>,
) {
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
    [live, lastPoints],
  );
}

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
  const lastPoints = useRef<PointsCall | null>(null);
  const callbacks: SceneCallbacks = {
    onFocused: useLatest(onFocusedChange),
    onDraw: useLatest(onDraw),
    setFocused: useLatest(setFocused),
    controlledFocus: useLatest(focusedProp),
  };
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

  const { instance, live } = useSceneInstance(element, mountOptions, callbacks, lastPoints);

  useSceneSync(instance, layout, focused);
  useSceneActions(actionsRef, live, lastPoints);

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
