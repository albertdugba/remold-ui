import { createElement, forwardRef, isValidElement, useId, useRef, useState, type ElementType, type ForwardedRef, type SVGAttributes } from "react";
import { createMorph, springs, value } from "@remold-ui/core";
import { frames, iconToPath, MEDIA_ATTRIBUTE, prefersReducedMotion, type IconPath } from "@remold-ui/dom";
import { useEffectEvent, useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldIconProps, RemoldIconState } from "./types.js";

/** An icon that reshapes into the next one. */
export const RemoldIcon = forwardRef(function RemoldIcon(
  componentProps: RemoldIcon.Props,
  forwardedRef: ForwardedRef<SVGSVGElement>,
) {
  const {
    path: pathProp,
    icon,
    spring = springs.snappy,
    reducedMotion = "user",
    loop,
    match,
    viewBox,
    render,
    className,
    ...svgProps
  } = componentProps;

  const fromIcon = icon !== undefined;

  if (!fromIcon && pathProp === undefined) {
    throw new TypeError("Remold.Icon: pass an `icon` (an icon element or component) or SVG path data as `path`.");
  }

  const source = useRef<SVGGElement>(null);
  const warned = useRef(false);
  const [read, setRead] = useState<IconPath | null>(null);

  const pathData = fromIcon ? (read?.d ?? null) : (pathProp ?? null);
  const [initial, setInitial] = useState(pathData);
  const [animating, setAnimating] = useState(false);

  const pathElement = useRef<SVGPathElement>(null);
  const shown = useRef(pathData);
  const identity = useId();
  const target = useRef(pathData);
  const run = useRef(0);
  const stop = useRef<(() => void) | null>(null);

  if (initial === null && pathData !== null) setInitial(pathData);

  useIsoLayoutEffect(() => {
    if (!fromIcon || !source.current) return;

    let next: IconPath | null = null;

    try {
      next = iconToPath(source.current);
    } catch (error) {
      if (!warned.current) console.warn(error);
      warned.current = true;
    }

    if (!next) return;

    setRead((previous) => {
      if (previous && previous.d === next.d && sameLook(previous.look, next.look)) return previous;
      return next;
    });
  });

  const play = useEffectEvent((element: SVGPathElement, next: string) => {
    const reduced = reducedMotion === "always" || (reducedMotion === "user" && prefersReducedMotion());
    const token = ++run.current;

    const settle = () => {
      element.setAttribute("d", next);
      shown.current = next;
      setAnimating(false);
    };

    let morph: ReturnType<typeof createMorph> | null = null;

    try {
      morph = reduced ? null : createMorph(shown.current ?? next, next, { padding: "merge", ...match });
    } catch {
      morph = null;
    }

    if (!morph) {
      settle();
      return;
    }

    const shape = morph;
    const progress = value(0, { spring, precision: 0.001 });

    progress.to(1);
    setAnimating(true);

    const step = (delta: number) => {
      if (token !== run.current) return false;

      const moving = progress.step(delta);

      if (!moving) {
        settle();
        return false;
      }

      const frame = shape.d(progress.current);

      element.setAttribute("d", frame);
      shown.current = frame;
      return true;
    };

    stop.current = (loop ?? { add: frames }).add(step);

    return () => {
      stop.current?.();
      stop.current = null;
      run.current++;
    };
  });

  useIsoLayoutEffect(() => {
    const element = pathElement.current;

    if (!element || pathData === null) return;

    if (target.current === null) {
      target.current = pathData;
      shown.current = pathData;
      return;
    }

    if (target.current === pathData) return;

    stop.current?.();
    stop.current = null;
    target.current = pathData;

    return play(element, pathData);
  }, [pathData]);

  const state: RemoldIcon.State = { animating };
  const look = fromIcon ? paintOf(read?.look) : {};
  const glyph = fromIcon ? (isValidElement(icon) ? icon : createElement(icon as ElementType)) : null;

  const children = (
    <>
      {glyph && (
        <g ref={source} aria-hidden="true" style={initial === null ? undefined : { display: "none" }}>
          {glyph}
        </g>
      )}
      {initial !== null && <path ref={pathElement} d={initial} />}
    </>
  );

  return useRenderElement(
    "svg",
    { render, className },
    {
      state,
      refs: [forwardedRef],
      props: {
        ...look,
        viewBox: viewBox ?? read?.look.viewBox ?? "0 0 24 24",
        ...svgProps,
        children,
      } as SVGAttributes<SVGSVGElement> & Record<string, unknown>,
      dataAttributes: { "data-rm-animating": animating ? "" : undefined, [MEDIA_ATTRIBUTE]: identity },
    },
  );
});

function sameLook(previous: IconPath["look"], next: IconPath["look"]): boolean {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]) as Set<keyof IconPath["look"]>;

  for (const key of keys) {
    if (previous[key] !== next[key]) return false;
  }

  return true;
}

function paintOf(look: IconPath["look"] | undefined): SVGAttributes<SVGSVGElement> {
  if (!look) return {};

  const { viewBox: _viewBox, ...paint } = look;

  return paint as SVGAttributes<SVGSVGElement>;
}

export namespace RemoldIcon {
  export type State = RemoldIconState;
  export type Props = RemoldIconProps;
}
