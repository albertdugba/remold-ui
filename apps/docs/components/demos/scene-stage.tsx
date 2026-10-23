"use client";
/**
 * A dark stage for a set of scenes: pick a scene, then a step. Play walks through the steps by
 * itself (like a short film) until you pick one. Every object, outline, line and the camera
 * springs from one step to the next; hover to light a piece up, drag sideways to turn the scene.
 */
import { Remold } from "@remold-ui/react";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuiltScene } from "./build-anything-scenes";
import "./gallery.css";

export interface StagedScene {
  key: string;
  name: string;
  scene: BuiltScene;
}

export function SceneStage({ scenes, autoplay = false, every = 2600 }: { scenes: StagedScene[]; autoplay?: boolean; every?: number }) {
  const [which, setWhich] = useState(scenes[0]!.key);
  const { scene } = scenes.find((s) => s.key === which)!;
  const layouts = Object.keys(scene.layouts);
  const [layout, setLayout] = useState(layouts[0]!);
  const [focused, setFocused] = useState<string | null>(null);
  const [playing, setPlaying] = useState(autoplay);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const shown = scene.layouts[layout] ? layout : layouts[0]!;
  const object = focused ? scene.objects[focused] : undefined;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? false), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Step through the layouts while playing and on screen.
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(() => setLayout((l) => layouts[(layouts.indexOf(l) + 1) % layouts.length]!), every);
    return () => clearInterval(timer);
  }, [playing, visible, every, layouts.join()]);

  return (
    <div className="gx ink not-prose" ref={frame}>
      <Remold.Scene
        key={which}
        className="gx-canvas"
        label={scene.label}
        objects={scene.objects}
        layouts={scene.layouts}
        links={scene.links}
        palette="ink"
        layout={shown}
        focused={focused}
        onFocusedChange={setFocused}
      />
      <div className="gx-ui">
        <div className="gx-seg" role="group" aria-label="Scene">
          {scenes.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={which === s.key}
              onClick={() => {
                setWhich(s.key);
                setLayout(Object.keys(s.scene.layouts)[0]!);
                setFocused(null);
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="gx-seg quiet" role="group" aria-label="Step">
          <button
            type="button"
            className="gx-play"
            aria-label={playing ? "Pause" : "Play the steps"}
            aria-pressed={playing}
            onClick={() => setPlaying((p) => !p)}
          >
            <Remold.Icon icon={playing ? Pause : Play} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {layouts.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={shown === l}
              onClick={() => {
                setPlaying(false);
                setLayout(l);
                setFocused(null);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="gx-info" aria-live="polite">
        {object ? (
          <>
            <b>{object.label}.</b> {object.description}
          </>
        ) : (
          <>
            <b>{shown}.</b> {scene.layouts[shown]?.caption}
          </>
        )}
      </p>
    </div>
  );
}
