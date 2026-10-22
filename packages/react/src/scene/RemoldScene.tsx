/**
 * `<Remold.Scene>`: a live canvas scene.
 *
 * ```tsx
 * <Remold.Scene
 *   label="How the packages fit together"
 *   objects={objects}
 *   layouts={layouts}
 *   layout={view}
 *   focused={selected}
 *   onFocusedChange={setSelected}
 *   actionsRef={actions}
 * />
 * ```
 *
 * `layout` and `focused` can be controlled or left to the scene (`defaultLayout`,
 * `defaultFocused`). The `ref` is the canvas; `actionsRef` gives the scene's extra controls.
 * Objects, layouts and links are read when the scene mounts: change `key` to rebuild it.
 */
import { forwardRef, useImperativeHandle, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef, type RefObject } from "react";
import { scene as createScene, type AnchorPort, type Scene, type SceneOptions } from "@remold-ui/canvas";
import { useControlled, useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

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
  // Actions read the live scene from here, so they work as soon as it exists, even from a
  // parent's mount effect, before the state above has re-rendered.
  const live = useRef<Scene | null>(null);
  // The last cloud of points sent through actions. A new scene instance on the same component
  // (StrictMode's double mount, a canvas swapped by `render`) starts empty, so it's replayed.
  // A new `key` is a new component and starts fresh, as React state does.
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

  // Create the scene once the canvas exists; destroy it when the canvas goes.
  useIsoLayoutEffect(() => {
    if (!element) return;
    const created = createScene(element, {
      ...mountOptions.current,
      onDraw: () => onDrawn.current?.(),
      onFocusChange: (id) => {
        setFocusedLatest.current(id);
        onFocused.current?.(id);
        // Controlled: show the parent's value until it decides. If it accepts the change, the
        // next render focuses the new object before the browser paints.
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

  // Follow the layout and focus props. For controlled focus, a change the parent didn't accept
  // is put back here.
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
  return useRenderElement<RemoldScene.State, HTMLCanvasElement>(
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
  export interface State {
    /** The layout on screen. Also set as `data-rm-layout`. */
    layout: string;
    /** The focused object, if any. Also set as `data-rm-focused`. */
    focused: string | null;
  }

  /** Controls that aren't state: use them from event handlers or effects. */
  export interface Actions {
    /** Show a cloud of cubes; calling again morphs keylessly. */
    points: Scene["points"];
    /** The frontmost interactive object at a canvas point (CSS pixels). */
    pick(x: number, y: number): string | null;
    /** Where a named object port is on the canvas: for placing tooltips and annotations. */
    anchor(id: string, port?: AnchorPort): { x: number; y: number } | null;
    /** An object's current animated box. */
    box: Scene["box"];
    /** Draw again now (after changing fonts, for example). */
    redraw(): void;
  }

  export interface Props
    extends BaseProps<State, HTMLCanvasElement>,
      Pick<SceneOptions, "objects" | "layouts" | "links" | "palette" | "interact" | "spring" | "reducedMotion" | "loop" | "maxPixelRatio">,
      Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children"> {
    /** The canvas's accessible name. */
    label?: string;
    /** The layout to show (controlled). Changing it springs the scene to the new layout. */
    layout?: string;
    /** The first layout when `layout` isn't controlled. Default: the first one listed. */
    defaultLayout?: string;
    /** The focused object (controlled), or null. */
    focused?: string | null;
    /** The first focused object when `focused` isn't controlled. */
    defaultFocused?: string | null;
    /** Called when the user focuses an object (tap or keyboard), or clears focus. */
    onFocusedChange?: (focused: string | null) => void;
    /**
     * Called after every frame the scene draws. Use it with `actionsRef.current.anchor(id)` to keep
     * HTML laid over the canvas (labels, tooltips) on the objects as they move.
     */
    onDraw?: () => void;
    /** Receives the scene's extra controls. */
    actionsRef?: RefObject<Actions | null>;
  }
}
