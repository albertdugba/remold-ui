/**
 * `<Remold.Icon icon={liked ? <HeartFilled /> : <Heart />} />`: an SVG icon that morphs into
 * the next one. Pass any icon (a Lucide or Heroicons component, your own SVG component, or plain
 * `<svg>` JSX), or path data with `d`. Each stroke is paired with the nearest stroke of the new
 * icon, so a magnifier becomes a page instead of fading through blank. Changing the icon
 * mid-morph continues from the shape on screen.
 *
 * With `icon`, the icon is rendered as it is, so server rendering and the first paint look right.
 * Before the first paint in the browser, Remold reads its shapes (circles, rectangles, lines
 * and paths) into one path and its look (viewBox, fill, stroke), hides it, and draws the path
 * instead. Every later icon is rendered hidden, read the same way, and morphed to. After the
 * first icon, Remold writes the path itself, and React never touches it again.
 */
import {
  createElement,
  forwardRef,
  isValidElement,
  useRef,
  useState,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type SVGAttributes,
} from "react";
import { createMorph, springs, value, type MorphOptions, type SpringConfig } from "@remold-ui/core";
import { frames, iconToPath, prefersReducedMotion, type FrameLoop, type IconPath, type ReducedMotion } from "@remold-ui/dom";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

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
  if (!fromIcon && dProp === undefined)
    throw new TypeError("Remold.Icon: pass an `icon` (an icon element or component) or path data as `d`.");
  const source = useRef<SVGGElement>(null);
  const warned = useRef(false);
  const [read, setRead] = useState<IconPath | null>(null);
  const d = fromIcon ? read?.d ?? null : dProp ?? null;
  // The path appears once there's something to draw: at once with `d`, after the first read with `icon`.
  const [initial, setInitial] = useState(d);
  if (initial === null && d !== null) setInitial(d);
  const [animating, setAnimating] = useState(false);
  const path = useRef<SVGPathElement>(null);
  const shown = useRef(d);
  const target = useRef(d);
  const run = useRef(0);
  const stop = useRef<(() => void) | null>(null);

  // Read the icon after every render: a new icon is rendered hidden, then read here, before paint.
  useIsoLayoutEffect(() => {
    if (!fromIcon || !source.current) return;
    let next: IconPath | null = null;
    try {
      next = iconToPath(source.current);
    } catch (error) {
      // An icon that can't be read as one path (a transform, say) stays as it is, unmorphed.
      // Say why once, not on every render.
      if (!warned.current) console.warn(error);
      warned.current = true;
    }
    if (next) setRead((previous) => (previous && previous.d === next.d && sameLook(previous.look, next.look) ? previous : next));
  });

  useIsoLayoutEffect(() => {
    const element = path.current;
    if (!element || d === null) return;
    if (target.current === null) {
      // The first icon just arrived: it's drawn as it is, with nothing to morph from.
      target.current = d;
      shown.current = d;
      return;
    }
    if (target.current === d) return;
    // A prop change or unmount must release the previous frame callback immediately. The
    // callback also has a token guard, but stopping it here avoids retaining a detached SVG
    // until the next frame.
    stop.current?.();
    stop.current = null;
    target.current = d;
    const reduced = reducedMotion === "always" || (reducedMotion === "user" && prefersReducedMotion());
    const token = ++run.current;
    const settle = () => {
      element.setAttribute("d", d);
      shown.current = d;
      setAnimating(false);
    };
    let morph;
    try {
      // From what's on screen now, so an interrupted morph carries on without a jump.
      morph = reduced ? null : createMorph(shown.current ?? d, d, { padding: "merge", ...match });
    } catch {
      morph = null; // An empty or unparseable path: just show the new one.
    }
    if (!morph) {
      settle();
      return;
    }
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
      const next = morph.d(progress.current);
      element.setAttribute("d", next);
      shown.current = next;
      return true;
    };
    stop.current = (loop ?? { add: frames }).add(step);
    return () => {
      stop.current?.();
      stop.current = null;
      // Prevent a queued frame from settling a component that has already been replaced.
      run.current++;
    };
  }, [d]);

  const state: RemoldIcon.State = { animating };
  // The icon's own look (viewBox, fill, stroke…), unless the props say otherwise.
  const look = fromIcon ? paintOf(read?.look) : {};
  const element = fromIcon ? (isValidElement(icon) ? icon : createElement(icon as ElementType)) : null;
  const children = (
    <>
      {element && (
        // Shown until it's been read (server rendering and the first paint), then kept hidden as the source.
        <g ref={source} aria-hidden="true" style={initial === null ? undefined : { display: "none" }}>
          {element}
        </g>
      )}
      {initial !== null && <path ref={path} d={initial} />}
    </>
  );
  return useRenderElement<RemoldIcon.State, SVGSVGElement>(
    "svg",
    { render, className },
    {
      state,
      refs: [forwardedRef],
      props: { ...look, viewBox: viewBox ?? read?.look.viewBox ?? "0 0 24 24", ...svgProps, children } as SVGAttributes<SVGSVGElement> &
        Record<string, unknown>,
      dataAttributes: { "data-rm-animating": animating ? "" : undefined },
    },
  );
});

function sameLook(a: IconPath["look"], b: IconPath["look"]): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof IconPath["look"]>;
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

/** An icon's look as SVG props, leaving out the viewBox (handled on its own) and anything unset. */
function paintOf(look: IconPath["look"] | undefined): SVGAttributes<SVGSVGElement> {
  if (!look) return {};
  const { viewBox: _viewBox, ...paint } = look;
  return paint as SVGAttributes<SVGSVGElement>;
}

export namespace RemoldIcon {
  export interface State {
    /** The icon is morphing. Also set as `data-rm-animating`. */
    animating: boolean;
  }

  export interface Props extends BaseProps<State, SVGSVGElement>, Omit<SVGAttributes<SVGSVGElement>, "className" | "d" | "children"> {
    /**
     * The icon to show: an element (`<Heart />`, `<svg>…</svg>`) or a component (`Heart`). From
     * Lucide, Heroicons or your own files: anything that renders an `<svg>` of paths, circles,
     * ellipses, rectangles, lines, polylines and polygons. Its viewBox, fill and stroke are used
     * unless you set them here. Give this or `d`.
     */
    icon?: ReactElement | ElementType;
    /** The icon as path data instead. Several strokes go in one path (`"M4 6h16M4 12h16"`). */
    d?: string;
    /** Default `springs.snappy`. */
    spring?: SpringConfig;
    reducedMotion?: ReducedMotion;
    loop?: FrameLoop;
    /** How strokes are paired. Defaults to `{ padding: "merge" }`, which suits outline icons. */
    match?: MorphOptions;
  }
}
