/**
 * A field of dots that rebuilds itself into each new word, built on `particles` and
 * `sampleTextPoints` from @remold-ui/canvas. When the word changes, every dot pairs with a nearby
 * spot in the new word and springs there with its current speed; spare dots shrink away and new
 * ones grow in. Dots near the pointer lean away.
 */
import { particles, sampleTextPoints } from "@remold-ui/canvas";
import { useEffect, useRef } from "react";
import { useMotion } from "../motion";

/** Dots per word. Every word gets the same number, so nothing needs to arrive or leave. */
const DOTS = 420;
const FONT = `700 180px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif`;

export function DotField({ words, interval = 3200 }: { words: string[]; interval?: number }) {
  const { loop, reducedMotion, slow } = useMotion();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current!;
    const shape = (word: string) => sampleTextPoints(word, { font: FONT, count: DOTS });
    let index = 0;
    const dots = particles(element, {
      points: shape(words[0]!),
      label: words[0],
      spring: { duration: 0.9, bounce: 0.2 },
      padding: 16,
      radius: 2.6,
      color: (ctx, size) => {
        const g = ctx.createLinearGradient(0, 0, size.width, 0);
        g.addColorStop(0, "hsl(212 85% 56%)");
        g.addColorStop(1, "hsl(282 85% 56%)");
        return g;
      },
      reducedMotion,
      loop,
    });
    const timer = setInterval(
      () => {
        index = (index + 1) % words.length;
        dots.to(shape(words[index]!), { label: words[index] });
      },
      interval * (slow ? 2.5 : 1),
    );
    return () => {
      clearInterval(timer);
      dots.destroy();
    };
  }, [words, interval, loop, reducedMotion, slow]);

  return <canvas ref={canvas} className="dot-field" />;
}
