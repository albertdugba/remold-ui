"use client";
/**
 * The headline's second line: a word that changes, then "themselves." Every word starts with "re",
 * so those letters stay put while the rest morphs (`Remold.Text`). The word's box glides to
 * the new word's width at the same time, so "themselves." slides along instead of jumping. It
 * changes while the hero is on screen, pauses while the pointer is over it, and holds still with
 * reduced motion. Screen readers hear the headline once, from the heading's label.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Short words only, so the headline never re-wraps.
const WORDS = ["remold", "reshape", "reflow", "regroup", "redraw"];
const SPRING = { duration: 0.7, bounce: 0.1 };

export function HeroWord() {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(true);
  const [width, setWidth] = useState<number | null>(null);
  const line = useRef<HTMLSpanElement>(null);
  const ruler = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = line.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? false));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (held || !visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2800);
    return () => clearInterval(t);
  }, [held, visible]);

  // The new word's width, measured on a hidden copy in the same font, before the letters change.
  useLayoutEffect(() => {
    const measure = () => ruler.current && setWidth(ruler.current.getBoundingClientRect().width);
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [i]);

  return (
    <span ref={line} aria-hidden="true" className="hm-line">
      <span
        className="hm-word"
        style={width ? { width } : undefined}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
      >
        <Remold.Text spring={SPRING}>{WORDS[i]!}</Remold.Text>
        <span ref={ruler} className="hm-ruler">
          {WORDS[i]}
        </span>
      </span>{" "}
      <span>themselves.</span>
    </span>
  );
}
