"use client";
/**
 * A light stage for a canvas scene: tabs for its layouts, a play button that walks through them
 * while the stage is on screen, and a line underneath that says what you're looking at. Tap a
 * piece to focus it (the rest dim, and so do their lines); tap it again, or the empty floor, to let
 * go. Drag sideways to turn the scene. Any tap or tab stops the autoplay.
 */
import { Remold } from "@remold-ui/react";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./canvas-stage.css";

type SceneProps = Remold.Scene.Props;

export interface StageScene {
  label: string;
  objects: SceneProps["objects"];
  links?: SceneProps["links"];
  layouts: SceneProps["layouts"];
}

export function CanvasStage({
  scene,
  title,
  describe,
  every = 3200,
  height = 520,
  palette = "paper",
}: {
  scene: StageScene;
  /** Shown at the top left: the name of the thing on stage. */
  title: ReactNode;
  /** The line under the stage, for the layout on screen or the piece in focus. */
  describe: (layout: string, focused: string | null) => { title: string; body: string };
  every?: number;
  height?: number;
  /** The scene's colours. Default "paper"; "sketch" for line art. */
  palette?: SceneProps["palette"];
}) {
  const layouts = Object.keys(scene.layouts);
  const [layout, setLayout] = useState(layouts[0]!);
  const [focused, setFocused] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const info = describe(layout, focused);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? false), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible || focused) return;
    const timer = setInterval(() => setLayout((l) => layouts[(layouts.indexOf(l) + 1) % layouts.length]!), every);
    return () => clearInterval(timer);
  }, [playing, visible, focused, every, layouts.join()]);

  return (
    <div className="cs not-prose" ref={frame}>
      <div className="cs-top">
        <div className="cs-title">{title}</div>
        <div className="cs-controls">
          <div className="cs-tabs" role="group" aria-label="View">
            {layouts.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={layout === l}
                onClick={() => {
                  setPlaying(false);
                  setFocused(null);
                  setLayout(l);
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cs-play"
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            onClick={() => setPlaying((p) => !p)}
          >
            <Remold.Icon icon={playing ? Pause : Play} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
      <Remold.Scene
        className="cs-canvas"
        style={{ height }}
        label={scene.label}
        objects={scene.objects}
        layouts={scene.layouts}
        links={scene.links}
        palette={palette}
        layout={layout}
        focused={focused}
        onFocusedChange={(id) => {
          setPlaying(false);
          setFocused(id);
        }}
      />
      <p className="cs-info" aria-live="polite">
        <Remold.Text className="cs-info-title">{info.title}</Remold.Text>
        <Remold.Text className="cs-info-body">{info.body}</Remold.Text>
      </p>
    </div>
  );
}
