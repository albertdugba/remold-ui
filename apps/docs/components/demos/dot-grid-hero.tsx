"use client";

import { Remold, type DotGridActions } from "@remold-ui/react";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useScene } from "./use-scene";
import "./dot-grid-hero.css";

const PATH = [
  { x: 0.18, y: 0.3 },
  { x: 0.34, y: 0.62 },
  { x: 0.56, y: 0.38 },
  { x: 0.78, y: 0.7 },
  { x: 0.66, y: 0.24 },
  { x: 0.42, y: 0.78 },
];
const BEATS = [...PATH.map(() => ({ ms: 900 })), { ms: 700 }, { ms: 1400 }, { ms: 1200 }];
const CLICK = PATH.length + 1;

export function DotGridHeroDemo({ playing }: { playing?: boolean }) {
  const scene = useScene(BEATS, (step) => step, playing);
  const grid = useRef<DotGridActions>(null);
  const hero = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const ctaCentre = () => {
    const box = hero.current?.getBoundingClientRect();
    const button = cta.current?.getBoundingClientRect();
    if (!box || !button) return null;
    return { x: button.left - box.left + button.width / 2, y: button.top - box.top + button.height / 2 };
  };

  useEffect(() => {
    const box = hero.current?.getBoundingClientRect();
    if (!scene.live || !box) {
      setGhost(null);
      return;
    }
    const step = scene.step;
    const at = step < PATH.length ? { x: PATH[step]!.x * box.width, y: PATH[step]!.y * box.height } : ctaCentre();
    if (step === CLICK && at) grid.current?.ripple(at);
    if (step > CLICK) {
      grid.current?.hover(null);
      setGhost(null);
      return;
    }
    setGhost(at);
    grid.current?.hover(at);
  }, [scene.step, scene.live]);

  const takeOver = () => {
    if (!scene.live) return;
    scene.take(scene.step);
    setGhost(null);
  };

  const start = () => {
    const at = ctaCentre();
    if (at) grid.current?.ripple(at);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="dt" ref={scene.ref}>
        <div className="dt-hero" ref={hero} onPointerEnter={(event) => event.pointerType === "mouse" && takeOver()}>
          <Remold.DotGrid className="dt-grid" actionsRef={grid} gap={20} reach={150} />

          <div className="dt-content">
            <a className="dt-badge" href="#" onClick={(event) => event.preventDefault()}>
              <span className="dt-badge-tag">New</span>
              v2 is live. See what changed
              <span aria-hidden="true">→</span>
            </a>
            <div className="dt-title" role="heading" aria-level={2}>
              Ship your side project this weekend.
            </div>
            <p className="dt-sub">Auth, payments and email, already wired up. You write the part only you can.</p>
            <div className="dt-actions">
              <button ref={cta} type="button" className="dt-primary" onClick={(event) => event.detail === 0 && start()}>
                Get started
              </button>
              <button type="button" className="dt-ghost">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" />
                </svg>
                Star on GitHub
                <span className="dt-count">2.4k</span>
              </button>
            </div>
          </div>

          {ghost && (
            <motion.svg
              className="dt-cursor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              initial={false}
              animate={{ x: ghost.x - 4, y: ghost.y - 3, scale: scene.step === CLICK ? 0.86 : 1 }}
              transition={{ type: "spring", duration: 0.85, bounce: 0.15 }}
            >
              <path d="M4 3l15 7.5-6.5 1.8L10 19z" />
            </motion.svg>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
