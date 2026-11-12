"use client";

import { useAnimationFrame } from "motion/react";
import { useCallback, useRef, type RefObject } from "react";
import { CONNECTOR_UPDATE_EVENT } from "../connectors/remold-connectors.js";

const REFRESH_WINDOW = 700;

/** Motion callbacks for anchors inside a `Remold.Connectors` root. */
export function useConnectorMotion(root: RefObject<HTMLElement | null>) {
  const refreshUntil = useRef(0);

  const refresh = useCallback(() => {
    refreshUntil.current = performance.now() + REFRESH_WINDOW;
    root.current?.dispatchEvent(new Event(CONNECTOR_UPDATE_EVENT));
  }, [root]);

  useAnimationFrame((time) => {
    if (time < refreshUntil.current) root.current?.dispatchEvent(new Event(CONNECTOR_UPDATE_EVENT));
  });

  return {
    onLayoutAnimationStart: refresh,
    onLayoutAnimationComplete: refresh,
  };
}
