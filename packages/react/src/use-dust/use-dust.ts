import { dust, type Dust, type DustOptions } from "@remold-ui/canvas";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useLatest } from "../utils/hooks.js";

export type UseDust = Pick<Dust, "away" | "back">;

export function useDust(ref: RefObject<HTMLElement | null>, options?: DustOptions): UseDust {
  const latest = useLatest(options);
  const instance = useRef<Dust | null>(null);

  useEffect(
    () => () => {
      instance.current?.destroy();
      instance.current = null;
    },
    [],
  );

  return useMemo(() => {
    const trail = () => {
      if (!instance.current && ref.current) instance.current = dust(ref.current, latest.current);
      return instance.current;
    };
    return {
      away: async (elements, target) => trail()?.away(elements, target),
      back: async (elements, source) => trail()?.back(elements, source),
    };
  }, [ref, latest]);
}
