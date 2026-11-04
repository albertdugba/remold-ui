"use client";
/**
 * The Remold UI mark: a lowercase r made of a block and an arc. It's a live morph: the r starts
 * square-shouldered and remolds into its arc when it appears, and back and forth on hover, so the
 * logo is a small demo of the library.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useState } from "react";

/** The r with a square shoulder: the shape it remolds from. Same points as ARC, so the morph is clean. */
const BLOCK = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H23.5A1.5 1.5 0 0 1 25 8.5V18H18V14H14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";
const ARC = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";

export function RemoldMark({ size = 28, wordmark = false }: { size?: number; wordmark?: boolean }) {
  const [formed, setFormed] = useState(false);
  const [hover, setHover] = useState(false);
  // Remold once when it first appears.
  useEffect(() => {
    const t = setTimeout(() => setFormed(true), 250);
    return () => clearTimeout(t);
  }, []);
  const round = formed !== hover;

  return (
    <span className="rm-brand" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <Remold.Icon
        path={round ? ARC : BLOCK}
        viewBox="6 6 20 20"
        className="rm-mark"
        style={{ width: size, height: size }}
        aria-hidden="true"
        spring={{ duration: 0.6, bounce: 0.25 }}
      />
      {wordmark && (
        <span className="rm-word">
          remold<span>/ui</span>
        </span>
      )}
    </span>
  );
}
