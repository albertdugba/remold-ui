"use client";

import { Remold } from "@remold-ui/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
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

  title: ReactNode;

  describe: (
    layout: string,
    focused: string | null,
  ) => { title: string; body: string };
  every?: number;
  height?: number;

  palette?: SceneProps["palette"];
}) {
  const layouts = Object.keys(scene.layouts);
  const [layout, setLayout] = useState(layouts[0]!);
  const [focused, setFocused] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  const info = describe(layout, focused);

  const advance = useEffectEvent(() => {
    setLayout((current) => {
      const next = layouts.indexOf(current) + 1;

      return layouts[next % layouts.length]!;
    });
  });

  useEffect(() => {
    const frameElement = frame.current;

    if (!frameElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry?.isIntersecting ?? false);
      },
      { threshold: 0.3 },
    );

    observer.observe(frameElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible || focused) return;

    const timer = setInterval(advance, every);

    return () => clearInterval(timer);
  }, [playing, visible, focused, every]);

  return (
    <div className="cs not-prose" ref={frame}>
      <div className="cs-top">
        <div className="cs-title">{title}</div>
        <div className="cs-controls">
          <div className="cs-tabs" role="group" aria-label="View">
            {layouts.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={layout === name}
                onClick={() => {
                  setPlaying(false);
                  setFocused(null);
                  setLayout(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cs-play"
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            onClick={() => setPlaying((current) => !current)}
          >
            <Remold.Icon
              icon={<HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />}
              strokeWidth={1.75}
              aria-hidden="true"
            />
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
