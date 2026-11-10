"use client";
/**
 * The hero's install line. The package name morphs through the engine's packages, one per place it
 * runs, and Copy copies whichever is showing. It pauses under the pointer or keyboard focus, and
 * holds still with reduced motion.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useRef, useState } from "react";

const PACKAGES = ["react", "dom", "canvas", "morph"];
const EVERY = 2800;
const COPIED_FOR = 1500;
const SPRING = { duration: 0.6, bounce: 0.1 };

export function InstallCommand() {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const command = `npm i @remold-ui/${PACKAGES[index]}`;

  useEffect(() => {
    if (held || copied || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % PACKAGES.length), EVERY);
    return () => clearInterval(timer);
  }, [held, copied]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FOR);
  };

  return (
    <div
      className="rm-command"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <code aria-label={command}>
        <span aria-hidden="true">$ </span>
        <span aria-hidden="true" className="hm-install-command">
          npm i @remold-ui/<Remold.Text spring={SPRING}>{PACKAGES[index]!}</Remold.Text>
        </span>
      </code>
      <button type="button" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
