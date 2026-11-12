import { forwardRef, type ForwardedRef, type SVGAttributes } from "react";
import { RemoldIcon } from "../icon/remold-icon.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldPathGroupProps, RemoldPathGroupState } from "./types.js";

export const RemoldPathGroup = forwardRef(function RemoldPathGroup(
  componentProps: RemoldPathGroup.Props,
  forwardedRef: ForwardedRef<SVGSVGElement>,
) {
  const { paths, spring, reducedMotion, loop, match, viewBox = "0 0 24 24", render, className, ...svgProps } = componentProps;

  return useRenderElement(
    "svg",
    { render, className },
    {
      state: { paths: paths.length },
      refs: [forwardedRef],
      props: {
        viewBox,
        ...svgProps,
        children: paths.map(({ id, path, ...look }) => (
          <RemoldIcon
            key={id}
            path={path}
            spring={spring}
            reducedMotion={reducedMotion}
            loop={loop}
            match={match}
            viewBox={viewBox}
            {...(look as SVGAttributes<SVGSVGElement>)}
          />
        )),
      } as SVGAttributes<SVGSVGElement> & Record<string, unknown>,
      dataAttributes: { "data-rm-paths": String(paths.length) },
    },
  );
});

export namespace RemoldPathGroup {
  export type State = RemoldPathGroupState;
  export type Props = RemoldPathGroupProps;
}
