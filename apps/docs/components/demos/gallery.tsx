"use client";
/** "Not just diagrams": the canvas gallery, with switches for the illustration and its state. */
import { useEffect, useRef, useState } from "react";
import { createGallery } from "./gallery-engine";
import "./gallery.css";

type Gallery = ReturnType<typeof createGallery>;

export function GalleryDemo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gallery = useRef<Gallery | null>(null);
  const [kinds, setKinds] = useState<Gallery["kinds"]>([]);
  const [kind, setKind] = useState("globe");
  const [state, setState] = useState("globe");
  const [caption, setCaption] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const g = createGallery(canvas.current!, { onCaption: setCaption });
    gallery.current = g;
    setKinds(g.kinds);
    return () => g.destroy();
  }, []);

  const current = kinds.find((k) => k.key === kind);
  return (
    <div className="gx not-prose">
      <canvas
        ref={canvas}
        className="gx-canvas"
        role="img"
        aria-label="A live canvas illustration. Use the buttons to choose a kind of illustration and its place."
      />
      <div className="gx-ui">
        <div className="gx-seg" role="group" aria-label="Illustration">
          {kinds.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => {
                setKind(k.key);
                setState(k.states[0]!.key);
                gallery.current?.setKind(k.key);
              }}
            >
              {k.name}
            </button>
          ))}
        </div>
        <div className="gx-seg quiet" role="group" aria-label="Layout">
          {current?.states.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={state === s.key}
              onClick={() => {
                setState(s.key);
                gallery.current?.setState(s.key);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="gx-info" aria-live="polite">
        {caption && (
          <>
            <b>{caption.title}</b> {caption.body}
          </>
        )}
      </p>
    </div>
  );
}
