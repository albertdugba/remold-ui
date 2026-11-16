"use client";

import { diagram, story, type Diagram, type DiagramOptions, type Story } from "@remold-ui/canvas";
import { useEffect, useRef, useState } from "react";

type Script = (diagram: Diagram) => Promise<void>;

/** Mounts a diagram on a canvas and plays a looping story while it's on screen. */
export function useDiagram(options: () => DiagramOptions, script: Script) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storyRef = useRef<Story | null>(null);
  const [paused, setPaused] = useState(false);
  const [instance, setInstance] = useState<Diagram | null>(null);
  const latestScript = useRef(script);

  latestScript.current = script;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const created = diagram(canvas, options());
    const told = story(created, (target) => latestScript.current(target));
    const watcher = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) told.play();
    });

    storyRef.current = told;
    setInstance(created);
    watcher.observe(canvas);

    return () => {
      watcher.disconnect();
      told.stop();
      created.destroy();
      storyRef.current = null;
      setInstance(null);
    };
  }, []);

  const togglePause = () => {
    const told = storyRef.current;

    if (!told) return;

    if (paused) told.resume();
    else told.pause();

    setPaused(!paused);
  };

  const replay = () => {
    storyRef.current?.replay();
    storyRef.current?.resume();
    setPaused(false);
  };

  return { canvasRef, diagram: instance, paused, togglePause, replay };
}
