import { dust, type Dust, type DustOptions } from "@remold-ui/canvas";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useLatest } from "../utils/hooks.js";

export type UseDust = Pick<Dust, "away" | "back">;

/**
 * Parts of the page that break into dots and pour somewhere else, drawn over `ref`'s element.
 * Each pour samples the elements as they look and resolves once the dots land; hide what's
 * leaving as you call `away`, and show what's arriving once `back` resolves.
 *
 * @example
 * ```tsx
 * const trail = useDust(card, { palette: ["var(--ink)", "var(--muted)", "var(--surface)"] });
 *
 * async function archive(row: HTMLElement) {
 *   setHidden(row.id);
 *   await trail.away(row, archiveTab);
 *   remove(row.id);
 * }
 * ```
 */
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
    // Made on first use, once the container is on the page.
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
