/**
 * `<Remold.PathGroup>` keeps a multi-part SVG illustration together while each path morphs.
 * Give paths stable `id`s whenever parts may be inserted or removed; unchanged ids retain their
 * in-flight morph, while new or removed paths enter and leave through React as normal.
 */
import { forwardRef, type ForwardedRef, type SVGAttributes } from "react";
import { type MorphOptions, type SpringConfig } from "@remold-ui/core";
import { type FrameLoop, type ReducedMotion } from "@remold-ui/dom";
import { RemoldIcon } from "../icon/RemoldIcon.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

export interface PathSpec extends Omit<SVGAttributes<SVGPathElement>, "d"> {
  /** Stable identity for an illustrated part or chart series. */
  id: string;
  d: string;
}

export const RemoldPathGroup = forwardRef(function RemoldPathGroup(
  componentProps: RemoldPathGroup.Props,
  forwardedRef: ForwardedRef<SVGSVGElement>,
) {
  const { paths, spring, reducedMotion, loop, match, viewBox = "0 0 24 24", render, className, ...svgProps } = componentProps;
  return useRenderElement<RemoldPathGroup.State, SVGSVGElement>(
    "svg",
    { render, className },
    {
      state: { paths: paths.length },
      refs: [forwardedRef],
      props: {
        viewBox,
        ...svgProps,
        children: paths.map(({ id, d, ...path }) => (
          <RemoldIcon
            key={id}
            d={d}
            spring={spring}
            reducedMotion={reducedMotion}
            loop={loop}
            match={match}
            viewBox={viewBox}
            {...(path as SVGAttributes<SVGSVGElement>)}
          />
        )),
      } as SVGAttributes<SVGSVGElement> & Record<string, unknown>,
      dataAttributes: { "data-rm-paths": String(paths.length) },
    },
  );
});

export namespace RemoldPathGroup {
  export interface State {
    paths: number;
  }
  export interface Props extends BaseProps<State, SVGSVGElement>, Omit<SVGAttributes<SVGSVGElement>, "className" | "children"> {
    paths: readonly PathSpec[];
    spring?: SpringConfig;
    reducedMotion?: ReducedMotion;
    loop?: FrameLoop;
    match?: MorphOptions;
  }
}
