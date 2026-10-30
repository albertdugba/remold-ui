import { createElement, forwardRef, isValidElement, useRef, useState, type ElementType, type ForwardedRef, type SVGAttributes } from "react";
import { createMorph, springs, value } from "@remold-ui/core";
import { frames, iconToPath, prefersReducedMotion, type IconPath } from "@remold-ui/dom";
import { useEffectEvent, useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldIconProps, RemoldIconState } from "./types.js";

/**
 * An icon that reshapes into the next one. Pass any icon component or element, or path data as
 * `d`.
 *
 * @example
 * ```tsx
 * <Remold.Icon icon={open ? X : Menu} className="size-5" />
 * ```
 */
export const RemoldIcon = forwardRef(function RemoldIcon(
  componentProps: RemoldIcon.Props,
  forwardedRef: ForwardedRef<SVGSVGElement>,
) {
  const {
    d: dProp,
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

  if (!fromIcon && dProp === undefined) {
    throw new TypeError("Remold.Icon: pass an `icon` (an icon element or component) or path data as `d`.");
  }

  const source = useRef<SVGGElement>(null);
  const warned = useRef(false);
  const [read, setRead] = useState<IconPath | null>(null);

  const d = fromIcon ? (read?.d ?? null) : (dProp ?? null);
  const [initial, setInitial] = useState(d);
  const [animating, setAnimating] = useState(false);

  const path = useRef<SVGPathElement>(null);
  const shown = useRef(d);
  const target = useRef(d);
  const run = useRef(0);
  const stop = useRef<(() => void) | null>(null);

  if (initial === null && d !== null) setInitial(d);

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

  // `spring`, `reducedMotion`, `match` and `loop` are read here so a new path uses the latest
  // options, without restarting the morph when only those options change.
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
      morph = null; // An empty or unparseable path: just show the new one.
    }

    if (!morph) {
      settle();
      return;
    }

    const shape = morph;
    const progress = value(0, { spring, precision: 0.001 });

    progress.to(1);
    setAnimating(true);

    const step = (dt: number) => {
      if (token !== run.current) return false;

      const moving = progress.step(dt);

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
    const element = path.current;

    if (!element || d === null) return;

    if (target.current === null) {
      target.current = d;
      shown.current = d;
      return;
    }

    if (target.current === d) return;

    stop.current?.();
    stop.current = null;
    target.current = d;

    return play(element, d);
  }, [d]);

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
      {initial !== null && <path ref={path} d={initial} />}
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
      dataAttributes: { "data-rm-animating": animating ? "" : undefined },
    },
  );
});

function sameLook(a: IconPath["look"], b: IconPath["look"]): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof IconPath["look"]>;

  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/** An icon's look as SVG props, leaving out the viewBox (handled on its own) and anything unset. */
function paintOf(look: IconPath["look"] | undefined): SVGAttributes<SVGSVGElement> {
  if (!look) return {};

  const { viewBox: _viewBox, ...paint } = look;

  return paint as SVGAttributes<SVGSVGElement>;
}

export namespace RemoldIcon {
  export type State = RemoldIconState;
  export type Props = RemoldIconProps;
}
