import { Remold } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { useMotion } from "../motion";
import { DotField } from "./DotField";

const WORDS = ["rewrite", "reorder", "reshape", "restyle"];
const SOURCES = ["an AI rewrote.", "came from the server.", "nobody gave keys to.", "a designer exported."];

export function Hero() {
  const { loop, reducedMotion, slow } = useMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SOURCES.length), slow ? 8000 : 3200);
    return () => clearInterval(timer);
  }, [slow]);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <p className="hero-eyebrow">Remold</p>
      <h1 id="hero-title">
        Motion that knows
        <br />
        what changed.
      </h1>
      <p className="hero-lead">
        Remold works out what became what when your interface changes, then moves it there with a spring. Even for UI{" "}
        <Remold.Text className="hero-morph" loop={loop} reducedMotion={reducedMotion}>
          {SOURCES[index]!}
        </Remold.Text>
      </p>
      <div className="hero-actions">
        <a className="hero-button" href="#examples">
          See the examples
        </a>
        <code className="install">npm i @remold-ui/react</code>
      </div>
      <DotField words={WORDS} />
      <p className="caption">The same dots, matched to each new word and sprung into place. Move your pointer through them.</p>
    </section>
  );
}
